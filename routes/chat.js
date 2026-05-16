const express = require('express');
const router  = express.Router();
const Groq    = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

router.post('/', async (req, res) => {
  try {
    const { messages } = req.body;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1024,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant for FlowPOS, a point-of-sale system. Help users with jobs, invoices, customers, services, and reports.',
        },
        ...messages,
      ],
    });

    res.json({ reply: completion.choices[0].message.content });

  } catch (err) {
    console.error('Groq error:', err.message);
    res.status(500).json({ error: 'AI error', detail: err.message });
  }
});

module.exports = router; 