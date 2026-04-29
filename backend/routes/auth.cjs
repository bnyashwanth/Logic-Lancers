'use strict';
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User.cjs');
const AuditLog = require('../models/AuditLog.cjs');

const JWT_SECRET  = process.env.JWT_SECRET  || 'rescue_sync_super_secret_key_change_me';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL  || 'admin@rescuesync.local';
const ADMIN_PASS  = process.env.ADMIN_PASSWORD || 'rootpassword123';

// ─── Helper ────────────────────────────────────────────────────────────────
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
}

function isValidDataUrl(value) {
  return typeof value === 'string' && value.startsWith('data:image/');
}

async function writeAuditLog(req, { action, category, actorId, actorRole, actorLabel, metadata }) {
  try {
    await AuditLog.create({
      action,
      category,
      actorId,
      actorRole,
      actorLabel,
      metadata,
      sourceIp: req.ip || '',
      userAgent: req.get('user-agent') || '',
    });
  } catch (err) {
    console.warn('[audit log failed]', err?.message || err);
  }
}

// ─── POST /api/auth/register ────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ msg: 'All fields are required' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ msg: 'Operator already exists with this email' });
    }

    const user = new User({ firstName, lastName, email, password, role: 'USER', status: 'ONLINE' });
    await user.save();

    // Emit real-time update to admin dashboard
    req.io.emit('operator_updated');

    const token = signToken({ id: user._id, role: user.role });
    await writeAuditLog(req, {
      action: 'USER_REGISTERED',
      category: 'AUTH',
      actorId: user._id,
      actorRole: user.role,
      actorLabel: `${user.firstName} ${user.lastName}`,
      metadata: { email: user.email },
    });
    return res.status(201).json({
      token,
      user: { id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('[/register]', err);
    return res.status(500).json({ msg: 'Server error during registration' });
  }
});

// ─── POST /api/auth/login ───────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ msg: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ msg: 'Invalid credentials' });
    }

    const isMatch = user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ msg: 'Invalid credentials' });
    }

    // Update presence
    user.status = 'ONLINE';
    user.lastPing = new Date();
    await user.save();
    req.io.emit('operator_updated');

    const token = signToken({ id: user._id, role: user.role });
    await writeAuditLog(req, {
      action: 'USER_LOGGED_IN',
      category: 'AUTH',
      actorId: user._id,
      actorRole: user.role,
      actorLabel: `${user.firstName} ${user.lastName}`,
      metadata: { email: user.email },
    });
    return res.json({
      token,
      user: { id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('[/login]', err);
    return res.status(500).json({ msg: 'Server error during login' });
  }
});

// ─── POST /api/auth/admin-login ─────────────────────────────────────────────
router.post('/admin-login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ msg: 'Email and password are required' });
    }

    // Check master credentials from env
    if (email === ADMIN_EMAIL && password === ADMIN_PASS) {
      const token = signToken({ id: 'master-admin', role: 'ADMIN' });
      await writeAuditLog(req, {
        action: 'ADMIN_MASTER_LOGIN',
        category: 'ADMIN',
        actorRole: 'ADMIN',
        actorLabel: email,
        metadata: { email },
      });
      return res.json({ token, user: { id: 'master-admin', email, role: 'ADMIN' } });
    }

    // Check DB for ADMIN-role user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ msg: 'AUTHORIZATION DENIED: Invalid credentials' });
    }
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ msg: 'AUTHORIZATION DENIED: Insufficient clearance' });
    }

    const isMatch = user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ msg: 'AUTHORIZATION DENIED: Invalid credentials' });
    }

    user.status = 'ONLINE';
    user.lastPing = new Date();
    await user.save();
    req.io.emit('operator_updated');

    const token = signToken({ id: user._id, role: user.role });
    await writeAuditLog(req, {
      action: 'ADMIN_LOGIN',
      category: 'ADMIN',
      actorId: user._id,
      actorRole: user.role,
      actorLabel: `${user.firstName} ${user.lastName}`,
      metadata: { email: user.email },
    });
    return res.json({
      token,
      user: { id: user._id, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('[/admin-login]', err);
    return res.status(500).json({ msg: 'Server error during admin login' });
  }
});

// ─── PUT /api/auth/avatar ─────────────────────────────────────────────────
router.put('/avatar', async (req, res) => {
  try {
    const { email, avatar } = req.body;

    if (!email || !avatar) {
      return res.status(400).json({ msg: 'email and avatar are required' });
    }

    if (!isValidDataUrl(avatar)) {
      return res.status(400).json({ msg: 'avatar must be a base64 image data URL' });
    }

    // Guard against oversized payloads stored in DB.
    if (avatar.length > 2_000_000) {
      return res.status(413).json({ msg: 'avatar payload too large' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    user.avatar = avatar;
    await user.save();

    await writeAuditLog(req, {
      action: 'AVATAR_UPDATED',
      category: 'AUTH',
      actorId: user._id,
      actorRole: user.role,
      actorLabel: `${user.firstName} ${user.lastName}`,
      metadata: { email: user.email },
    });

    return res.json({
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    console.error('[/avatar]', err);
    return res.status(500).json({ msg: 'Server error updating avatar' });
  }
});

module.exports = router;
