const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

// GET /api/volunteers/nearby
router.get('/nearby', auth, async (req, res) => {
  try {
    const volunteers = await User.find({ isAvailable: true, role: 'VOLUNTEER' }).select('-password');
    res.json({ success: true, volunteers });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// PUT /api/volunteers/availability
router.put('/availability', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.isAvailable = !user.isAvailable;
    await user.save();
    if (req.app.get('io')) {
      req.app.get('io').emit('volunteer:status', { userId: user._id, isAvailable: user.isAvailable });
    }
    res.json({ success: true, isAvailable: user.isAvailable });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// PUT /api/volunteers/location
router.put('/location', auth, async (req, res) => {
  try {
    const { lat, lng } = req.body;
    await User.findByIdAndUpdate(req.user._id, { location: { lat, lng } });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

module.exports = router;
