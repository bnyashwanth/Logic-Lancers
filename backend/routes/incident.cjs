'use strict';

const express = require('express');
const mongoose = require('mongoose');
const Incident = require('../models/Incident.cjs');
const AuditLog = require('../models/AuditLog.cjs');

const router = express.Router();

function emitIncident(req, event, payload) {
  if (!req?.io) return;
  req.io.emit(event, payload);
}

function emitIncidentUpdated(req, incidentDoc) {
  // Back-compat event name used by existing frontend.
  emitIncident(req, 'incident_updated', incidentDoc);
  // New event name per spec.
  emitIncident(req, 'incident:updated', incidentDoc);
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

function computeStatus({ volunteersEnRoute, requiredVolunteers }) {
  const count = Array.isArray(volunteersEnRoute) ? volunteersEnRoute.length : 0;
  const required = Number.isFinite(Number(requiredVolunteers)) ? Number(requiredVolunteers) : 0;
  if (required > 0 && count >= required) return 'FULL';
  return 'OPEN';
}

function toObjectId(value) {
  if (!value || !mongoose.Types.ObjectId.isValid(value)) {
    return null;
  }

  return new mongoose.Types.ObjectId(value);
}

function getHeuristicDispatch({ type, description }) {
  const d = String(description || '').toLowerCase();

  const criticalKeywords = [
    'bleeding',
    'heavy bleeding',
    'unconscious',
    'passed out',
    'unresponsive',
    'seizure',
    'cardiac',
    'chest pain',
    'severe',
    'critical',
  ];

  const highKeywords = [
    'fracture',
    'injury',
    'wound',
    'cut',
    'bleed',
    'medicine',
    'medic',
    'medical',
    'hurt',
    'pain',
  ];

  const isCritical = criticalKeywords.some((k) => d.includes(k));
  if (isCritical) {
    return {
      priorityScore: 'CRITICAL',
      recommendedAction: 'Call emergency responders immediately, apply direct pressure to bleeding, and keep the victim stable and warm until help arrives.',
    };
  }

  const isHigh = highKeywords.some((k) => d.includes(k));
  if (isHigh || type === 'MEDICINE') {
    return {
      priorityScore: 'HIGH',
      recommendedAction: 'Assess injuries, provide basic first aid, and coordinate the fastest volunteer arrival with clear location guidance.',
    };
  }

  return {
    priorityScore: 'LOW',
    recommendedAction: "Monitor the victim's condition, prepare to share exact location with volunteers, and wait for instructions from on-the-ground responders.",
  };
}

function extractJsonObject(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;

  // Remove common markdown code fences like ```json ... ```
  const noFences = raw.replace(/```[a-zA-Z]*\s*/g, '').replace(/```/g, '').trim();
  const match = noFences.match(/\{[\s\S]*\}/);
  const candidate = match ? match[0] : noFences;

  try {
    return JSON.parse(candidate);
  } catch (_e) {
    return null;
  }
}

async function getGeminiDispatch({ type, description, lat, lng }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return getHeuristicDispatch({ type, description });

  try {
    // Lazy-load so the server can boot even if deps aren't installed.
    // (In hackathon env this should be installed.)
    // eslint-disable-next-line global-require
    const { GoogleGenerativeAI } = require('@google/generative-ai');

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = [
      'You are the autonomous dispatcher for RescueSync, an offline-first disaster response platform.',
      'Given an incident, decide a Priority Score and a one-sentence recommended action for volunteers.',
      '',
      'Rules:',
      '- Return ONLY valid JSON with keys: priorityScore, recommendedAction',
      '- priorityScore must be exactly one of: CRITICAL, HIGH, LOW',
      '- recommendedAction must be exactly ONE sentence (no bullet points)',
      '- Be actionable and safety-focused',
      '',
      'Incident:',
      `- type: ${type}`,
      `- description: ${description}`,
      `- location: lat=${lat}, lng=${lng}`,
    ].join('\n');

    const result = await model.generateContent(prompt);
    const text = result?.response?.text ? result.response.text() : '';
    const parsed = extractJsonObject(text);

    const fallback = getHeuristicDispatch({ type, description });
    if (!parsed || !['CRITICAL', 'HIGH', 'LOW'].includes(parsed.priorityScore)) return fallback;

    const oneSentence = String(parsed.recommendedAction || fallback.recommendedAction)
      .replace(/\s+/g, ' ')
      .trim()
      .split(/(?<=[.!?])\s+/)[0];

    return {
      priorityScore: parsed.priorityScore,
      recommendedAction: oneSentence,
    };
  } catch (err) {
    console.warn('[Gemini dispatch failed, falling back]:', err?.message || err);
    return getHeuristicDispatch({ type, description });
  }
}

router.get('/', async (_req, res) => {
  try {
    const incidents = await Incident.find({ status: { $ne: 'RESOLVED' } })
      .populate('requesterId', 'firstName lastName email avatar role')
      .populate('volunteersEnRoute', 'firstName lastName email avatar role')
      .sort({ createdAt: -1 });

    return res.json({ incidents });
  } catch (error) {
    console.error('Failed to fetch incidents:', error);
    return res.status(500).json({ msg: 'Failed to fetch incidents' });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      deviceId,
      requesterId,
      type,
      description,
      location,
      requiredVolunteers,
      bloodGroup,
      images,
    } = req.body || {};

    if (!deviceId || !type || !description || !location) {
      return res.status(400).json({ msg: 'Missing required fields' });
    }

    if (type === 'BLOOD') {
      const allowedBloodGroups = new Set(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']);
      if (!bloodGroup || !allowedBloodGroups.has(String(bloodGroup))) {
        return res.status(400).json({ msg: 'Blood group is required for BLOOD incidents' });
      }
    }

    if (images !== undefined) {
      if (!Array.isArray(images) || images.length < 5 || images.length > 10) {
        return res.status(400).json({ msg: 'Please upload between 5 and 10 images' });
      }

      const invalidImage = images.find((value) => typeof value !== 'string' || !value.startsWith('data:image/'));
      if (invalidImage) {
        return res.status(400).json({ msg: 'Images must be provided as base64 data URLs' });
      }

      // Guard against oversized payloads (each image is a base64 string).
      const tooLarge = images.some((value) => value.length > 1_500_000);
      if (tooLarge) {
        return res.status(413).json({ msg: 'One or more images are too large' });
      }
    }

    let requesterObjectId = null;
    if (requesterId) {
      requesterObjectId = toObjectId(requesterId);
      if (!requesterObjectId) {
        return res.status(400).json({ msg: 'Invalid requesterId' });
      }
    }

    const lat = Number(location.lat);
    const lng = Number(location.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ msg: 'Invalid location coordinates' });
    }

    const incomingRequiredVolunteers = Number.isFinite(Number(requiredVolunteers))
      ? Number(requiredVolunteers)
      : null;

    // Duplicate prevention:
    // If there's an OPEN/IN_PROGRESS incident of the same type within 50 meters,
    // merge into it instead of creating a new document.
    const duplicateIncident = await Incident.findOne({
      type,
      status: { $in: ['OPEN', 'FULL'] },
      locationGeo: {
        $nearSphere: {
          $geometry: { type: 'Point', coordinates: [lng, lat] }, // [lng, lat]
          $maxDistance: 50,
        },
      },
    });

    const incidentPayload = {
      deviceId: String(deviceId).trim(),
      type,
      description,
      bloodGroup: type === 'BLOOD' ? String(bloodGroup) : undefined,
      images: Array.isArray(images) ? images : undefined,
      location: { lat, lng },
      locationGeo: { type: 'Point', coordinates: [lng, lat] }, // [lng, lat]
      requiredVolunteers: incomingRequiredVolunteers ?? undefined,
    };

    if (requesterObjectId) {
      incidentPayload.requesterId = requesterObjectId;
    }

    if (duplicateIncident) {
      // Merge behavior:
      // - update the latest victim description / coords
      // - widen the volunteer requirement if the new request asks for more
      // - preserve any existing volunteer assignments
      duplicateIncident.deviceId = incidentPayload.deviceId;
      duplicateIncident.description = incidentPayload.description;
      duplicateIncident.location = incidentPayload.location;
      duplicateIncident.locationGeo = incidentPayload.locationGeo;

      if (incomingRequiredVolunteers !== null) {
        duplicateIncident.requiredVolunteers = Math.max(
          duplicateIncident.requiredVolunteers,
          incomingRequiredVolunteers,
        );
      }

      // Ensure capacity status stays correct after any merge changes.
      duplicateIncident.status = computeStatus({
        volunteersEnRoute: duplicateIncident.volunteersEnRoute,
        requiredVolunteers: duplicateIncident.requiredVolunteers,
      });

      if (requesterObjectId && !duplicateIncident.requesterId) {
        duplicateIncident.requesterId = requesterObjectId;
      }

      await duplicateIncident.save();

      const updatedIncident = await Incident.findById(duplicateIncident._id)
        .populate('requesterId', 'firstName lastName email avatar role')
        .populate('volunteersEnRoute', 'firstName lastName email avatar role');

      emitIncidentUpdated(req, updatedIncident);
      await writeAuditLog(req, {
        action: 'INCIDENT_MERGED',
        category: 'INCIDENT',
        actorId: requesterObjectId || undefined,
        actorRole: requesterObjectId ? 'USER' : 'GUEST',
        actorLabel: requesterObjectId ? String(requesterObjectId) : String(deviceId),
        metadata: { incidentId: String(updatedIncident._id), type, merged: true },
      });
      return res.json({ incident: updatedIncident, merged: true });
    }

    const incident = await Incident.create(incidentPayload);

    // Gemini dispatcher: evaluate + persist priority before broadcasting.
    const dispatch = await getGeminiDispatch({ type, description, lat, lng });
    incident.priorityScore = dispatch.priorityScore;
    incident.recommendedAction = dispatch.recommendedAction;
    await incident.save();

    const newIncident = await Incident.findById(incident._id)
      .populate('requesterId', 'firstName lastName email avatar role')
      .populate('volunteersEnRoute', 'firstName lastName email avatar role');

    emitIncident(req, 'incident:new', newIncident);
    emitIncidentUpdated(req, newIncident);

    await writeAuditLog(req, {
      action: 'INCIDENT_CREATED',
      category: 'INCIDENT',
      actorId: requesterObjectId || undefined,
      actorRole: requesterObjectId ? 'USER' : 'GUEST',
      actorLabel: requesterObjectId ? String(requesterObjectId) : String(deviceId),
      metadata: { incidentId: String(newIncident._id), type, bloodGroup: type === 'BLOOD' ? bloodGroup : undefined },
    });

    return res.status(201).json({ incident: newIncident });
  } catch (error) {
    console.error('Failed to create incident:', error);
    return res.status(500).json({ msg: 'Failed to create incident' });
  }
});

router.post('/:id/join', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body || {};

    const incident = await Incident.findById(id);

    if (!incident) {
      return res.status(404).json({ msg: 'Incident not found' });
    }

    const volunteerObjectId = toObjectId(userId);

    if (!volunteerObjectId) {
      return res.status(400).json({ msg: 'Invalid userId' });
    }

    if (incident.status === 'FULL' || incident.volunteersEnRoute.length >= incident.requiredVolunteers) {
      incident.status = 'FULL';
      await incident.save();
      return res.status(409).json({ msg: 'Max volunteers reached' });
    }

    if (!incident.volunteersEnRoute.some((volunteer) => volunteer.toString() === volunteerObjectId.toString())) {
      incident.volunteersEnRoute.push(volunteerObjectId);
    }

    incident.status = computeStatus({
      volunteersEnRoute: incident.volunteersEnRoute,
      requiredVolunteers: incident.requiredVolunteers,
    });

    await incident.save();

    const updatedIncident = await Incident.findById(incident._id)
      .populate('requesterId', 'firstName lastName email avatar role')
      .populate('volunteersEnRoute', 'firstName lastName email avatar role');

    emitIncident(req, 'volunteer:joined', { incidentId: incident._id, userId: volunteerObjectId });
    emitIncidentUpdated(req, updatedIncident);

    await writeAuditLog(req, {
      action: 'INCIDENT_JOINED',
      category: 'INCIDENT',
      actorId: volunteerObjectId,
      actorRole: 'USER',
      actorLabel: String(volunteerObjectId),
      metadata: { incidentId: String(updatedIncident._id), volunteersEnRoute: updatedIncident.volunteersEnRoute.length },
    });

    return res.json({ incident: updatedIncident });
  } catch (error) {
    console.error('Failed to join incident:', error);
    return res.status(500).json({ msg: 'Failed to join incident' });
  }
});

// Resolve an incident (admin/operator).
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const status = typeof req.body?.status === 'string' ? req.body.status : '';

    if (status !== 'RESOLVED') {
      return res.status(400).json({ msg: 'Only status=RESOLVED is supported' });
    }

    const incident = await Incident.findById(id);
    if (!incident) {
      return res.status(404).json({ msg: 'Incident not found' });
    }

    incident.status = 'RESOLVED';
    await incident.save();

    const resolvedIncident = await Incident.findById(incident._id)
      .populate('requesterId', 'firstName lastName email avatar role')
      .populate('volunteersEnRoute', 'firstName lastName email avatar role');

    emitIncident(req, 'incident:resolved', resolvedIncident);
    emitIncidentUpdated(req, resolvedIncident);

    await writeAuditLog(req, {
      action: 'INCIDENT_RESOLVED',
      category: 'INCIDENT',
      actorRole: 'ADMIN',
      actorLabel: 'SYSTEM',
      metadata: { incidentId: String(resolvedIncident._id) },
    });

    return res.json({ incident: resolvedIncident });
  } catch (error) {
    console.error('Failed to resolve incident:', error);
    return res.status(500).json({ msg: 'Failed to resolve incident' });
  }
});

module.exports = router;