const express = require('express');
const Incident = require('../models/Incident');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

// Middleware to check if user is ADMIN
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ message: 'Admin access denied' });
  next();
};

// POST /api/admin/auth — Local role upgrade for demo/hackathon
router.post('/auth', auth, async (req, res) => {
  try {
    const { email, password } = req.body;
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    console.log(`[ADMIN AUTH] Attempt for: ${cleanEmail}`);

    // Flexible check for hackathon convenience
    if (cleanEmail === "admin@smartrelief.com" && (cleanPassword === "admin_password_123" || cleanPassword === "admin123")) {
      const user = await User.findByIdAndUpdate(req.user._id, { role: 'ADMIN' }, { new: true });
      console.log(`[ADMIN AUTH] SUCCESS: ${user.name} is now an ADMIN`);
      return res.json({ success: true, message: 'Role upgraded to ADMIN', user });
    }
    
    console.warn(`[ADMIN AUTH] Failed: Invalid credentials for ${email}`);
    res.status(401).json({ message: 'Invalid Admin Credentials. Check AdminCredentials.js' });
  } catch (error) { 
    console.error(`[ADMIN AUTH] Error:`, error.message);
    res.status(500).json({ message: error.message }); 
  }
});

// GET /api/admin/stats — Analytics for God Mode
router.get('/stats', auth, isAdmin, async (req, res) => {
  try {
    const totalIncidents = await Incident.countDocuments();
    const activeIncidents = await Incident.countDocuments({ status: { $ne: 'RESOLVED' } });
    const totalVolunteers = await User.countDocuments({ role: 'VOLUNTEER' });
    const activeVolunteers = await User.countDocuments({ role: 'VOLUNTEER', isAvailable: true });
    
    res.json({ success: true, stats: { totalIncidents, activeIncidents, totalVolunteers, activeVolunteers } });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// PUT /api/admin/incidents/:id/verify
router.put('/incidents/:id/verify', auth, isAdmin, async (req, res) => {
  try {
    const incident = await Incident.findByIdAndUpdate(req.params.id, { isVerified: true }, { new: true });
    if (req.app.get('io')) req.app.get('io').emit('incident:updated', incident);
    res.json({ success: true, incident });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// POST /api/admin/incidents/merge
router.post('/incidents/merge', auth, isAdmin, async (req, res) => {
  try {
    const { sourceIds, targetId } = req.body;
    await Incident.updateMany({ _id: { $in: sourceIds } }, { mergedInto: targetId, status: 'RESOLVED' });
    const target = await Incident.findById(targetId);
    // Notify clients about the merge (effectively removing old markers)
    if (req.app.get('io')) {
      sourceIds.forEach(id => req.app.get('io').emit('incident:removed', id));
      req.app.get('io').emit('incident:updated', target);
    }
    res.json({ success: true });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// PUT /api/admin/users/:id/role
router.put('/users/:id/role', auth, isAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
    res.json({ success: true, user });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// PUT /api/admin/users/:id/ban
router.put('/users/:id/ban', auth, isAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isBanned: true }, { new: true });
    // Also remove their incidents
    await Incident.updateMany({ requesterId: user._id }, { status: 'RESOLVED' });
    res.json({ success: true, user });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// POST /api/admin/broadcast
router.post('/broadcast', auth, isAdmin, async (req, res) => {
  try {
    const { message, type } = req.body;
    if (req.app.get('io')) {
      req.app.get('io').emit('broadcast', { message, type, timestamp: new Date() });
    }
    res.json({ success: true });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

module.exports = router;
