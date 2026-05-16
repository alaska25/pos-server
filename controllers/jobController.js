const Job      = require('../models/Job');
const Customer = require('../models/Customer');

exports.getJobs = async (req, res) => {
  try {
    const { status, customer, priority, page = 1, limit = 20, search } = req.query;
    const query = {};
    if (status)   query.status   = status;
    if (customer) query.customer = customer;
    if (priority) query.priority = priority;
    if (search)   query.$or = [
      { jobNumber:   new RegExp(search, 'i') },
      { description: new RegExp(search, 'i') },
    ];
    const total = await Job.countDocuments(query);
    const jobs  = await Job.find(query)
      .populate('customer',   'name company customerCode customerType serviceArea')
      .populate('assignedTo', 'name')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));
    res.json({ success: true, data: jobs, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('customer',      'name company customerCode customerType serviceArea phone mobile')
      .populate('assignedTo',    'name email')
      .populate('lines.service', 'name category unitPrice unit')
      .populate('invoice',       '_id invoiceNumber');
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    res.json({ success: true, data: job });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.createJob = async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.startDate === '') delete data.startDate;
    if (data.dueDate   === '') delete data.dueDate;

    // ✅ Only fall back to the creator if no assignedTo was provided
    if (!data.assignedTo) data.assignedTo = req.user._id;

    const job = await Job.create(data);
    res.status(201).json({ success: true, data: job });
  } catch (err) {
    console.error('Job Creation Error:', err.message);
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.updateJob = async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.status    === 'completed') data.completedAt = new Date();
    if (data.startDate === '') delete data.startDate;
    if (data.dueDate   === '') delete data.dueDate;

    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    Object.assign(job, data);
    await job.save();
    res.json({ success: true, data: job });
  } catch (err) {
    console.error('Job Update Error:', err.message);
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.deleteJob = async (req, res) => {
  try {
    await Job.findByIdAndUpdate(req.params.id, { status: 'cancelled' });
    res.json({ success: true, message: 'Job cancelled' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getMyJobs = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const customerDoc = await Customer.findOne({ userId: req.user._id });
    if (!customerDoc) {
      return res.json({ success: true, data: [], total: 0, pages: 1, page: 1 });
    }

    const query = { customer: customerDoc._id };
    if (status) query.status = status;

    const total = await Job.countDocuments(query);
    const jobs  = await Job.find(query)
      .populate('assignedTo',    'name')
      .populate('lines.service', 'name category unitPrice unit')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({
      success: true,
      data:    jobs,
      total,
      page:    Number(page),
      pages:   Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};