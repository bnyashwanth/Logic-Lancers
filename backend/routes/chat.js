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
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }); // Use flash for speed

    const systemContext = `You are RESPONDER AI, a disaster coordination assistant. 
Keep responses concise and actionable. User name: ${req.user.name}.`;

    const cleanHistory = [];
    for (let i = 0; i < history.length - 1; i++) {
      const curr = history[i];
      const next = history[i + 1];
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
        { role: 'model', parts: [{ text: 'Understood.' }] },
        ...cleanHistory,
      ],
    });

    // Set headers for streaming
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    const result = await chat.sendMessageStream(message);
    
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      res.write(chunkText);
    }

    res.end();
  } catch (error) {
    console.error('[GEMINI ERROR]', error.message);
    if (!res.headersSent) {
      res.status(500).json({ message: error.message });
    } else {
      res.end();
    }
  }
});

module.exports = router;
