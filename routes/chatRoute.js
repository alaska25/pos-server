// chatRoute.js — Add this to your Express server (server.js / index.js)
// 
// Required setup:
//   npm install groq-sdk
//   Add GROQ_API_KEY=your_key_here to your .env file
//
// Then in your server.js:
//   const chatRoute = require('./chatRoute');
//   app.use('/api', chatRoute);

const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are a friendly and knowledgeable support assistant for FlowPOS, a professional multi-service platform in the Philippines that connects homeowners and businesses with certified technicians.

Services offered: Electrical Repairs (from ₱800), Plumbing Services (from ₱600), HVAC & Aircon (from ₱1,200), Appliance Repair (from ₱500), Home Renovation (from ₱2,000), Security Systems (from ₱3,500).

Pricing plans:
- Basic: ₱499/visit — 1 technician visit, diagnostic included, 7-day warranty, email support
- Standard: ₱1,299/month — 3 visits, priority scheduling, 30-day warranty, phone & email support, free follow-up
- Premium: ₱2,999/month — unlimited visits, 24/7 emergency support, 90-day warranty, dedicated technician, monthly report, free parts on minor repairs

Key facts: 5,000+ jobs completed, 98% satisfaction rate, 150+ technicians, 24/7 support, licensed & insured, transparent pricing, on-time guarantee, serves the Philippines.

Keep answers concise, warm, and helpful. If someone wants to book, direct them to fill out the contact form on the page. If asked something outside FlowPOS scope, politely say you can only help with FlowPOS-related questions.`;

router.post('/chat', async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    const completion = await groq.chat.completions.create({
      model: 'llama3-8b-8192',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages,
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    const reply = completion.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';
    res.json({ reply });

  } catch (err) {
    console.error('Groq chat error:', err.message);
    res.status(500).json({ error: 'Failed to get response from AI' });
  }
});

module.exports = router;