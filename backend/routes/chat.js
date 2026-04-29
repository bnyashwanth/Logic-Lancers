const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const auth = require('../middleware/auth');
const router = express.Router();

router.post('/', auth, async (req, res) => {
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ message: 'Gemini API Key not configured' });
  }

  try {
    const { message, history = [] } = req.body;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

    // System instruction injected as part of the prompt
    const systemContext = `You are RESPONDER AI, a disaster coordination assistant embedded in an emergency response app. 
Your job is to help volunteers and victims with situational awareness, first-aid tips, resource coordination, and calm guidance during disasters. 
Keep responses concise, professional, and actionable. The user's name is ${req.user.name}.`;

    // Build strictly-alternating history (Gemini requirement)
    // Each item must strictly alternate: user, model, user, model...
    const cleanHistory = [];
    for (let i = 0; i < history.length - 1; i++) {
      const curr = history[i];
      const next = history[i + 1];
      // Only add pairs where roles strictly alternate
      if (curr.role !== next.role) {
        cleanHistory.push({
          role: curr.role,
          parts: [{ text: curr.text || '' }]
        });
      }
    }

    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: systemContext }] },
        { role: 'model', parts: [{ text: 'Understood. I am RESPONDER AI, ready to assist with emergency coordination. How can I help?' }] },
        ...cleanHistory,
      ],
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();

    res.json({ success: true, response: text });
  } catch (error) {
    console.error('[GEMINI ERROR]', error.message);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
