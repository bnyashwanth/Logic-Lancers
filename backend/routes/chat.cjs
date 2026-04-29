'use strict';

const express = require('express');
const router = express.Router();
const Incident = require('../models/Incident.cjs');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'phi3:latest';
const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS || 60000);
const OLLAMA_DEMO_MODE = process.env.OLLAMA_DEMO_MODE || 'fraud-analyst';

// Gemini / Google Generative AI settings (optional)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'chat-bison-001';
const GEMINI_BASE = process.env.GEMINI_BASE || 'https://generativelanguage.googleapis.com';

function asShortText(value, maxLen = 240) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().slice(0, maxLen);
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      role: item.role === 'assistant' ? 'assistant' : 'user',
      content: typeof item.content === 'string' ? item.content : '',
    }))
    .filter((item) => item.content.trim().length > 0);
}

function normalizeContext(rawContext) {
  if (!rawContext || typeof rawContext !== 'object') {
    return {};
  }

  const user = rawContext.user && typeof rawContext.user === 'object' ? rawContext.user : {};
  const ml = rawContext.ml && typeof rawContext.ml === 'object' ? rawContext.ml : {};

  return {
    appName: asShortText(rawContext.appName, 80),
    demoMode: asShortText(rawContext.demoMode, 60) || OLLAMA_DEMO_MODE,
    currentPage: asShortText(rawContext.currentPage, 120),
    userRole: asShortText(user.role, 40),
    username: asShortText(user.username, 80),
    userEmail: asShortText(user.email, 120),
    mlSummary:
      asShortText(ml.summary, 180) ||
      asShortText(ml.reason, 180) ||
      asShortText(ml.label, 80) ||
      '',
  };
}

function buildSystemPrompt(context) {
  const defaultPrompt =
    'You are Blackfyre hackathon assistant. Be concise, practical, and technically accurate.';
  const basePrompt = process.env.OLLAMA_SYSTEM_PROMPT || defaultPrompt;
  const demoMode = context.demoMode || OLLAMA_DEMO_MODE;

  const formatRules =
    demoMode === 'fraud-analyst'
      ? [
          'Respond with these headings: Summary, Severity, Why it matters, Next actions (3), Confidence.',
          'Use one-word severity values: Low, Medium, High, or Critical.',
          'Keep default answers under 120 words unless the user asks for detail.',
        ]
      : [
          'Be action-oriented and specific to the hackathon use case.',
          'Prefer concise bullet points when recommending steps.',
        ];

  const contextLines = [
    context.appName ? `App: ${context.appName}` : '',
    context.currentPage ? `Current page: ${context.currentPage}` : '',
    context.userRole ? `User role: ${context.userRole}` : '',
    context.username ? `Username: ${context.username}` : '',
    context.userEmail ? `Email: ${context.userEmail}` : '',
    context.mlSummary ? `Latest ML signal: ${context.mlSummary}` : '',
  ].filter(Boolean);

  const contextBlock = contextLines.length
    ? `Runtime context:\n${contextLines.join('\n')}`
    : 'Runtime context: none provided.';

  return [
    basePrompt,
    `Demo mode: ${demoMode}.`,
    ...formatRules,
    contextBlock,
  ].join('\n\n');
}

function formatIncidentList(incidents) {
  if (!Array.isArray(incidents) || incidents.length === 0) {
    return 'Active incidents: none.'
  }

  const lines = incidents.slice(0, 12).map((i) => {
    const type = i?.type || 'INCIDENT'
    const status = i?.status || 'OPEN'
    const volunteers = Array.isArray(i?.volunteersEnRoute) ? i.volunteersEnRoute.length : 0
    const required = Number.isFinite(Number(i?.requiredVolunteers)) ? Number(i.requiredVolunteers) : 0
    const desc = asShortText(i?.description, 120)
    return `- ${type} (${status}) ${volunteers}/${required}: ${desc}`
  })
  return `Active incidents:\n${lines.join('\n')}`
}

router.post('/', async (req, res) => {
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  const history = normalizeHistory(req.body?.history);
  const context = normalizeContext(req.body?.context);

  if (!message) {
    return res.status(400).json({ msg: 'message is required' });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);

  try {
    const activeIncidents = await Incident.find({ status: { $ne: 'RESOLVED' } })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const incidentContext = formatIncidentList(activeIncidents);
    const coordinatorPrompt =
      'You are a disaster relief coordinator. Give volunteers clear, calm, and actionable guidance. ' +
      'Prioritize life safety, triage, and coordination.';

    const systemPrompt = [
      coordinatorPrompt,
      incidentContext,
      buildSystemPrompt(context),
    ].join('\n\n');

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: message },
    ];

    // If a Gemini API key is provided, prefer calling Gemini (Google Generative AI)
    if (GEMINI_API_KEY) {
      try {
        // Build a simple prompt by concatenating messages. This keeps compatibility
        // with the existing messages/history structure while using the REST API.
        const prompt = messages
          .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
          .join('\n\n');

        const url = `${GEMINI_BASE}/v1beta2/models/${GEMINI_MODEL}:generateMessage?key=${GEMINI_API_KEY}`;

        const geminiResp = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            // The REST surface for Gemini may accept a "messages" or "prompt" field.
            // We provide a conservative payload that works with the REST API shape.
            messages: [
              { role: 'system', content: systemPrompt },
              ...history,
              { role: 'user', content: message },
            ],
            temperature: 0.2,
            maxOutputTokens: 512,
          }),
          signal: controller.signal,
        });

        const gemData = await geminiResp.json();

        if (!geminiResp.ok) {
          // Fall back to Ollama if Gemini returns an error
          console.warn('Gemini request failed, falling back to Ollama:', gemData?.error || gemData);
        } else {
          // Try to extract the assistant reply from common response shapes
          const reply =
            gemData?.candidates?.[0]?.content?.mimeType === 'text/plain'
              ? gemData.candidates[0].content?.text || ''
              : gemData?.candidates?.[0]?.content || gemData?.output?.[0]?.content || '';

          return res.json({ reply: String(reply || ''), model: GEMINI_MODEL });
        }
      } catch (gemErr) {
        if (gemErr.name === 'AbortError') {
          return res.status(504).json({ msg: 'Gemini request timed out' });
        }
        console.error('Gemini error, falling back to Ollama:', gemErr.message || gemErr);
        // continue to Ollama fallback
      }
    }

    // Default: call Ollama
    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        stream: false,
      }),
      signal: controller.signal,
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(502).json({
        msg: data?.error || 'Failed to get response from Ollama',
      });
    }

    return res.json({
      reply: data?.message?.content || '',
      model: OLLAMA_MODEL,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ msg: 'Ollama request timed out' });
    }

    return res.status(500).json({
      msg: 'Chat service unavailable. Ensure Ollama is running.',
    });
  } finally {
    clearTimeout(timeoutId);
  }
});

module.exports = router;
