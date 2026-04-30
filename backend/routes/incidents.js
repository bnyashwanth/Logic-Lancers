const express = require('express');
const Incident = require('../models/Incident');
const auth = require('../middleware/auth');
const User = require('../models/User');
const { sendPushNotification } = require('../utils/notifications');
const router = express.Router();

// GET /api/incidents — List all with optional filters
router.get('/', async (req, res) => {
  try {
    const { urgency, type, status, requesterId, lat, lng, radius } = req.query;
    const filter = {};
    if (urgency) filter.urgency = urgency;
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (requesterId) filter.requesterId = requesterId;

    const incidents = await Incident.find(filter).populate('requesterId', 'name').populate('volunteers', 'name').sort({ createdAt: -1 });
    res.json({ success: true, incidents });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// GET /api/incidents/:id
router.get('/:id', async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id).populate('requesterId', 'name email').populate('volunteers', 'name email');
    if (!incident) return res.status(404).json({ message: 'Incident not found' });
    res.json({ success: true, incident });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// POST /api/incidents — Create new
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, type, urgency, location, requiredVolunteers, contactPerson, specificItems, tags, image } = req.body;
    const incident = await Incident.create({
      title, description, type, urgency, location, requiredVolunteers,
      contactPerson, specificItems, tags, image, requesterId: req.user._id,
    });

    // Real-time broadcast
    if (req.app.get('io')) {
      req.app.get('io').emit('incident:new', incident);
    }

    // Determine sound type for push
    const isBlood = title.toLowerCase().includes('blood') || (tags && tags.some(t => t.toLowerCase().includes('blood')));
    let soundType = 'default';
    if (isBlood) soundType = 'blood';
    else if (urgency === 'CRITICAL') soundType = 'critical';
    else if (urgency === 'HIGH') soundType = 'emergency';

    // Push-notify available volunteers for HIGH, CRITICAL, or blood emergencies
    if (urgency === 'CRITICAL' || urgency === 'HIGH' || isBlood) {
      const subscribers = await User.find({
        _id: { $ne: req.user._id },
        isAvailable: true,
        pushSubscription: { $ne: null }
      });
      subscribers.forEach(u => {
        sendPushNotification(u, {
          title: isBlood ? `🩸 BLOOD EMERGENCY: ${type}` : `🚨 ${urgency}: ${type} Emergency`,
          body: title,
          data: { sound: soundType, url: '/feed' }
        });
      });
    }

    res.status(201).json({ success: true, incident });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// PUT /api/incidents/:id/volunteer — Join as volunteer
router.put('/:id/volunteer', auth, async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) return res.status(404).json({ message: 'Incident not found' });
    if (incident.volunteers.includes(req.user._id)) return res.status(400).json({ message: 'Already volunteered' });
    if (incident.isFull) return res.status(400).json({ message: 'Volunteer capacity reached' });

    const updatedVolunteers = [...incident.volunteers, req.user._id];
    const newStatus = (updatedVolunteers.length >= incident.requiredVolunteers && incident.status === 'OPEN') ? 'FULL' : incident.status;

    const updatedIncident = await Incident.findByIdAndUpdate(
      req.params.id,
      { volunteers: updatedVolunteers, status: newStatus },
      { new: true, runValidators: false }
    ).populate('volunteers', 'name email');

    if (req.app.get('io')) {
      req.app.get('io').emit('incident:updated', updatedIncident);

      // Targeted event: only the requester should play the volunteer sound
      req.app.get('io').emit('notification:volunteer-joined', {
        incidentId: String(incident._id),
        requesterId: String(incident.requesterId),
        volunteerName: req.user.name,
        incidentTitle: incident.title,
      });
    }

    // Push-notify the requester
    const requester = await User.findById(incident.requesterId);
    if (requester && requester.pushSubscription) {
      sendPushNotification(requester, {
        title: '🙋 New Volunteer!',
        body: `${req.user.name} is coming to help with: ${incident.title}`,
        data: { sound: 'volunteer', url: '/my-requests' }
      });
    }

    // Push-notify the volunteer (confirmation)
    const volunteer = await User.findById(req.user._id);
    if (volunteer && volunteer.pushSubscription) {
      sendPushNotification(volunteer, {
        title: '✅ You volunteered!',
        body: `You joined: ${incident.title}. Head to the location now!`,
        data: { sound: 'resolved', url: '/feed' }
      });
    }

    res.json({ success: true, incident: updatedIncident });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// PUT /api/incidents/:id/resolve
router.put('/:id/resolve', auth, async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) return res.status(404).json({ message: 'Incident not found' });
    const updatedIncident = await Incident.findByIdAndUpdate(
      req.params.id,
      { status: 'RESOLVED' },
      { new: true, runValidators: false }
    );

    if (req.app.get('io')) {
      req.app.get('io').emit('incident:updated', updatedIncident);
    }

    // Notify all volunteers + the requester
    const usersToNotify = await User.find({
      _id: { $in: [...incident.volunteers, incident.requesterId] },
      pushSubscription: { $ne: null }
    });
    usersToNotify.forEach(u => {
      sendPushNotification(u, {
        title: '✅ Incident Resolved',
        body: `"${incident.title}" has been resolved. Thank you for your help!`,
        data: { sound: 'resolved', url: '/feed' }
      });
    });

    res.json({ success: true, incident: updatedIncident });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

module.exports = router;
