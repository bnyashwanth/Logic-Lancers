'use strict';
const express = require('express');
const router = express.Router();
const User = require('../models/User.cjs');
const Incident = require('../models/Incident.cjs');
const AuditLog = require('../models/AuditLog.cjs');

// ─── GET /api/admin/operators ────────────────────────────────────────────────
router.get('/operators', async (_req, res) => {
  try {
    const operators = await User.find().select('-password').sort({ lastPing: -1 }).lean();
    return res.json(operators);
  } catch (err) {
    console.error('[/admin/operators]', err);
    return res.status(500).json({ msg: 'Server error fetching operators' });
  }
});

// ─── GET /api/admin/stats ────────────────────────────────────────────────────
router.get('/stats', async (_req, res) => {
  try {
    const [totalOperators, onlineOperators, openIncidents, criticalIncidents, recentLogs] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ status: 'ONLINE' }),
      Incident.countDocuments({ status: { $ne: 'RESOLVED' } }),
      Incident.countDocuments({ priorityScore: 'CRITICAL' }),
      AuditLog.countDocuments({ createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
    ]);

    const systemLoad = Math.min(99, 35 + openIncidents * 7 + criticalIncidents * 10 + Math.max(0, recentLogs / 4)).toFixed(1) + '%';

    return res.json({
      activeOperators: totalOperators,
      onlineOperators,
      openIncidents,
      criticalIncidents,
      systemLoad,
      databaseOps: totalOperators * 12 + openIncidents * 7 + recentLogs,
      securityAlerts: criticalIncidents + Math.max(0, recentLogs - 10),
    });
  } catch (err) {
    console.error('[/admin/stats]', err);
    return res.status(500).json({ msg: 'Server error fetching stats' });
  }
});

router.get('/logs', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 25, 100);
    const category = typeof req.query.category === 'string' ? req.query.category : '';

    const filter = category ? { category } : {};

    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.json({ logs });
  } catch (err) {
    console.error('[/admin/logs]', err);
    return res.status(500).json({ msg: 'Server error fetching audit logs' });
  }
});

module.exports = router;
