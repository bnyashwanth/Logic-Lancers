const express = require('express');
const Incident = require('../models/Incident');
const auth = require('../middleware/auth');
const router = express.Router();

// GET /api/incidents — List all with optional filters
router.get('/', async (req, res) => {
  try {
    const { urgency, type, status, lat, lng, radius } = req.query;
    const filter = {};
    if (urgency) filter.urgency = urgency;
    if (type) filter.type = type;
    if (status) filter.status = status;
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
    // Emit via socket.io if available
    if (req.app.get('io')) {
      req.app.get('io').emit('incident:new', incident);
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
    res.json({ success: true, incident: updatedIncident });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

module.exports = router;
