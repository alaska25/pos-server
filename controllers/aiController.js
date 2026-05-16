const Groq = require('groq-sdk');
const Job = require('../models/Job');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Customer = require('../models/Customer');
const Service = require('../models/Service');
const AiChat = require('../models/AiChat');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = 'llama-3.3-70b-versatile';

// ── Helper: fetch business context from MongoDB ────────────────────────────────
async function fetchBusinessContext() {
  const [jobs, invoices, payments, customers, services] = await Promise.all([
    Job.find().populate('customer', 'name company').sort({ createdAt: -1 }).limit(20).lean(),
    Invoice.find().populate('customer', 'name company').sort({ createdAt: -1 }).limit(20).lean(),
    Payment.find().populate('customer', 'name company').sort({ paidAt: -1 }).limit(20).lean(),
    Customer.find({ isActive: true }).limit(20).lean(),
    Service.find({ isActive: true }).lean(),
  ]);

  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
  const overdueInvoices = invoices.filter(i => i.status === 'overdue');

  return {
    summary: {
      totalCustomers: customers.length,
      totalRevenue,
      overdueInvoices: overdueInvoices.length,
      activeJobs: jobs.filter(j => j.status === 'in_progress').length,
      completedJobs: jobs.filter(j => j.status === 'completed').length,
    },
    recentJobs: jobs.slice(0, 10),
    recentInvoices: invoices.slice(0, 10),
    recentPayments: payments.slice(0, 10),
    customers: customers.slice(0, 15),
    services,
    overdueInvoices,
  };
}

// ── POST /api/ai/chat ──────────────────────────────────────────────────────────
exports.chat = async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'Message is required' });

    // ── Load or create session ──────────────────────────────────────────────
    let session;
    if (sessionId) {
      session = await AiChat.findOne({ _id: sessionId, user: req.user._id });
    }
    if (!session) {
      session = await AiChat.create({
        user: req.user._id,
        title: message.slice(0, 50), // first message as title
        messages: [],
      });
    }

    // ── Build history from saved messages ──────────────────────────────────
    const history = session.messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    // ── Fetch live business context ────────────────────────────────────────
    const context = await fetchBusinessContext();

    const systemPrompt = `
You are an AI assistant for FlowPOS, a marine vessel service management system.
You have access to real-time business data. Answer questions about jobs, invoices, payments, customers, and services.
Be concise and professional. Format currency as PHP with 2 decimal places.

Business Snapshot:
- Total Customers: ${context.summary.totalCustomers}
- Total Revenue: PHP ${context.summary.totalRevenue.toFixed(2)}
- Overdue Invoices: ${context.summary.overdueInvoices}
- Active Jobs: ${context.summary.activeJobs}
- Completed Jobs: ${context.summary.completedJobs}

Recent Jobs: ${JSON.stringify(context.recentJobs)}
Recent Invoices: ${JSON.stringify(context.recentInvoices)}
Recent Payments: ${JSON.stringify(context.recentPayments)}
Customers: ${JSON.stringify(context.customers)}
Services: ${JSON.stringify(context.services)}
Overdue Invoices: ${JSON.stringify(context.overdueInvoices)}
    `.trim();

    // ── Call Groq ──────────────────────────────────────────────────────────
    const response = await groq.chat.completions.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: message },
      ],
    });

    const reply = response.choices[0].message.content;

    // ── Save both messages to session ──────────────────────────────────────
    session.messages.push({ role: 'user',      content: message });
    session.messages.push({ role: 'assistant', content: reply   });
    await session.save();

    res.json({
      success: true,
      reply,
      sessionId: session._id,
      title: session.title,
    });

  } catch (err) {
    console.error('AI chat error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/ai/sessions ───────────────────────────────────────────────────────
exports.getSessions = async (req, res) => {
  try {
    const sessions = await AiChat.find({ user: req.user._id, isActive: true })
      .select('title createdAt updatedAt messages')
      .sort({ updatedAt: -1 });

    res.json({ success: true, sessions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/ai/sessions/:id ───────────────────────────────────────────────────
exports.getSession = async (req, res) => {
  try {
    const session = await AiChat.findOne({ _id: req.params.id, user: req.user._id });
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

    res.json({ success: true, session });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE /api/ai/sessions/:id ────────────────────────────────────────────────
exports.deleteSession = async (req, res) => {
  try {
    await AiChat.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isActive: false }
    );
    res.json({ success: true, message: 'Session deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/ai/insights ──────────────────────────────────────────────────────
exports.insights = async (req, res) => {
  try {
    const context = await fetchBusinessContext();

    const response = await groq.chat.completions.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: 'system',
          content: 'You are a business analyst. Respond ONLY with a valid JSON array. No explanation, no markdown, no backticks.',
        },
        {
          role: 'user',
          content: `
Analyze this FlowPOS data and return 5 actionable insights as a JSON array.
Each object must have: title (string), description (string), type (info|warning|success|danger), priority (1-5).

Data: ${JSON.stringify(context)}
          `.trim(),
        },
      ],
    });

    const raw = response.choices[0].message.content.replace(/```json|```/g, '').trim();
    const insights = JSON.parse(raw);

    res.json({ success: true, insights });

  } catch (err) {
    console.error('AI insights error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/ai/search ────────────────────────────────────────────────────────
exports.smartSearch = async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ success: false, message: 'Query is required' });

    const [customers, services, jobs] = await Promise.all([
      Customer.find({ isActive: true }).lean(),
      Service.find({ isActive: true }).lean(),
      Job.find().populate('customer', 'name company').lean(),
    ]);

    const response = await groq.chat.completions.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: 'system',
          content: 'You are a search engine. Respond ONLY with a valid JSON object. No explanation, no markdown, no backticks.',
        },
        {
          role: 'user',
          content: `
User searched for: "${query}"
Return the most relevant results as: { "customers": [], "services": [], "jobs": [] }

Customers: ${JSON.stringify(customers)}
Services: ${JSON.stringify(services)}
Jobs: ${JSON.stringify(jobs)}
          `.trim(),
        },
      ],
    });

    const raw = response.choices[0].message.content.replace(/```json|```/g, '').trim();
    const results = JSON.parse(raw);

    res.json({ success: true, results });

  } catch (err) {
    console.error('AI search error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/ai/summary ────────────────────────────────────────────────────────
exports.summary = async (req, res) => {
  try {
    const { period = 'today' } = req.query;

    const now = new Date();
    let startDate;
    if (period === 'today') startDate = new Date(new Date().setHours(0, 0, 0, 0));
    else if (period === 'week') startDate = new Date(now.setDate(now.getDate() - 7));
    else if (period === 'month') startDate = new Date(now.setMonth(now.getMonth() - 1));

    const [jobs, invoices, payments] = await Promise.all([
      Job.find({ createdAt: { $gte: startDate } }).populate('customer', 'name').lean(),
      Invoice.find({ createdAt: { $gte: startDate } }).populate('customer', 'name').lean(),
      Payment.find({ paidAt: { $gte: startDate } }).populate('customer', 'name').lean(),
    ]);

    const response = await groq.chat.completions.create({
      model: MODEL,
      max_tokens: 512,
      messages: [
        {
          role: 'system',
          content: 'You are a business report writer. Write concise plain text summaries only, no markdown.',
        },
        {
          role: 'user',
          content: `
Write a concise ${period} summary for FlowPOS (marine vessel services).
Include: total revenue, jobs created/completed, invoices issued, and 1-2 highlights.
Keep it under 120 words.

Payments: ${JSON.stringify(payments)}
Jobs: ${JSON.stringify(jobs)}
Invoices: ${JSON.stringify(invoices)}
          `.trim(),
        },
      ],
    });

    res.json({ success: true, summary: response.choices[0].message.content });

  } catch (err) {
    console.error('AI summary error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};