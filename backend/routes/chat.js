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

    const systemContext = `You are SMART RELIEF AI, a disaster coordination assistant embedded in an emergency response app called Smart Relief. 
Your job is to help volunteers and victims with situational awareness, first-aid tips, resource coordination, and calm guidance during disasters. 
Keep responses concise, professional, and actionable. The user's name is ${req.user.name}.`;

    // Build strictly-alternating history (Gemini requirement)
    const cleanHistory = [];
    for (let i = 0; i < history.length; i++) {
      const curr = history[i];
      // Skip if same role as previous
      if (cleanHistory.length > 0 && cleanHistory[cleanHistory.length - 1].role === curr.role) continue;
      cleanHistory.push({
        role: curr.role,
        parts: [{ text: curr.text || '' }]
      });
    }

    // Ensure history alternates properly: must start with 'user' after system prompt
    const validHistory = [];
    for (let i = 0; i < cleanHistory.length; i++) {
      const expectedRole = i % 2 === 0 ? 'user' : 'model';
      if (cleanHistory[i].role === expectedRole) {
        validHistory.push(cleanHistory[i]);
      }
    }

    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: systemContext }] },
        { role: 'model', parts: [{ text: 'Understood. I am Smart Relief AI, ready to assist with emergency coordination.' }] },
        ...validHistory,
      ],
    });

    // Try streaming first
    try {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Transfer-Encoding', 'chunked');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering (Render uses Nginx)

      const result = await chat.sendMessageStream(message);
      
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        if (chunkText) {
          res.write(chunkText);
        }
      }
      res.end();
    } catch (streamError) {
      console.error('[GEMINI STREAM ERROR]', streamError.message);
      
      // Fallback to non-streaming if streaming fails
      if (!res.headersSent) {
        const result = await chat.sendMessage(message);
        const response = await result.response;
        const text = response.text();
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.send(text);
      } else {
        res.end();
      }
    }
  } catch (error) {
    console.error('[GEMINI ERROR]', error.message, error.stack);
    if (!res.headersSent) {
      res.status(500).json({ message: error.message });
    } else {
      res.end();
    }
  }
});

module.exports = router;
