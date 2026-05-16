const Invoice                = require('../models/Invoice');
const Job                    = require('../models/Job');
const Payment                = require('../models/Payment');
const Customer               = require('../models/Customer');
const { generateInvoicePdf } = require('../services/pdfService');
const { sendInvoiceEmail }   = require('../services/emailService');

// ── helpers ──────────────────────────────────────────────────────────────────
const JOB_POPULATE = {
  path:     'job',
  select:   'jobNumber description location assignedTo priority',
  populate: { path: 'assignedTo', select: 'name' },
};

// GET /api/invoices
exports.getInvoices = async (req, res) => {
  try {
    const {
      status, customer,
      search,
      dateFrom, dateTo,
      page  = 1,
      limit = 20,
    } = req.query;

    const query = {};

    if (status)   query.status   = status;
    if (customer) query.customer = customer;

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo)   query.createdAt.$lte = new Date(new Date(dateTo).setHours(23, 59, 59, 999));
    }

    if (search) {
      const matchedCustomers = await Customer.find({
        $or: [
          { name:    { $regex: search, $options: 'i' } },
          { company: { $regex: search, $options: 'i' } },
        ],
      }).select('_id');

      const customerIds = matchedCustomers.map(c => c._id);
      const searchCondition = {
        $or: [
          { invoiceNumber: { $regex: search, $options: 'i' } },
          ...(customerIds.length ? [{ customer: { $in: customerIds } }] : []),
        ],
      };

      if (query.$and) {
        query.$and.push(searchCondition);
      } else {
        Object.assign(query, searchCondition);
      }
    }

    const total    = await Invoice.countDocuments(query);
    const invoices = await Invoice.find(query)
      .populate('customer', 'name company customerCode customerType serviceArea rating plan')
      .populate(JOB_POPULATE)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({
      success: true,
      data:    invoices,
      total,
      page:    Number(page),
      pages:   Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/invoices/my  — customer portal
exports.getMyInvoices = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const customerDoc = await Customer.findOne({ userId: req.user._id });
    if (!customerDoc) {
      return res.json({ success: true, data: [], total: 0, pages: 1, page: 1 });
    }

    const query = { customer: customerDoc._id };
    if (status) query.status = status;

    const total    = await Invoice.countDocuments(query);
    const invoices = await Invoice.find(query)
      .populate(JOB_POPULATE)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({
      success: true,
      data:    invoices,
      total,
      page:    Number(page),
      pages:   Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/invoices/:id
exports.getInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('customer',  'name company customerCode customerType serviceArea phone mobile email paymentTerms rating plan')
      .populate('createdBy', 'name email')
      .populate({
        path:     'job',
        populate: [
          { path: 'assignedTo',    select: 'name' },
          { path: 'lines.service', select: 'name category unitPrice unit' },
        ],
      });

    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const payments = await Payment.find({ invoice: invoice._id });
    res.json({ success: true, data: invoice, payments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/invoices
exports.createInvoice = async (req, res) => {
  try {
    const job = await Job.findById(req.body.job).populate('customer');
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    const invoice = await Invoice.create({
      job:                job._id,
      customer:           job.customer._id,
      subtotal:           job.subtotal,
      taxTotal:           job.taxTotal,
      grandTotal:         job.grandTotal,
      dueDate:            req.body.dueDate,
      notes:              req.body.notes,
      termsAndConditions: req.body.termsAndConditions,
      paymentTerms:       req.body.paymentTerms || job.customer.paymentTerms || '',
      createdBy:          req.user._id,
    });

    await Job.findByIdAndUpdate(job._id, { invoice: invoice._id });
    res.status(201).json({ success: true, data: invoice });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PUT /api/invoices/:id
exports.updateInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, data: invoice });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE /api/invoices/:id
exports.deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    if (invoice.status === 'paid')
      return res.status(400).json({ success: false, message: 'Cannot delete a paid invoice' });
    await invoice.deleteOne();
    await Job.findByIdAndUpdate(invoice.job, { invoice: null });
    res.json({ success: true, message: 'Invoice deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/invoices/:id/pdf
exports.downloadPdf = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('customer',  'name company customerCode customerType serviceArea phone mobile email paymentTerms')
      .populate('createdBy', 'name email')
      .populate({
        path:     'job',
        populate: [
          { path: 'assignedTo',    select: 'name' },
          { path: 'lines.service', select: 'name category unitPrice unit' },
        ],
      });

    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const pdfBuffer = await generateInvoicePdf(invoice);
    res.set({
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${invoice.invoiceNumber}.pdf"`,
      'Content-Length':      pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (err) {
    console.error('PDF Error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to generate PDF' });
  }
};

// POST /api/invoices/:id/send
exports.sendInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('customer',  'name company email phone')
      .populate('createdBy', 'name email')
      .populate({
        path:     'job',
        populate: [
          { path: 'assignedTo',    select: 'name' },
          { path: 'lines.service', select: 'name category unitPrice unit' },
        ],
      });

    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const customerEmail = invoice.customer?.email;
    if (!customerEmail)
      return res.status(400).json({ success: false, message: 'Customer has no email address on file' });

    const pdfBuffer  = await generateInvoicePdf(invoice);
    const formatDate = (d) => d
      ? new Date(d).toLocaleDateString('en-PH', { day: '2-digit', month: 'short', year: 'numeric' })
      : '—';

    await sendInvoiceEmail({
      to:            customerEmail,
      customerName:  invoice.customer.company || invoice.customer.name,
      invoiceNumber: invoice.invoiceNumber,
      grandTotal:    invoice.grandTotal,
      dueDate:       formatDate(invoice.dueDate),
      companyName:   process.env.COMPANY_NAME || 'FlowPOS',
      pdfBuffer,
    });

    invoice.status = 'sent';
    await invoice.save();

    res.json({ success: true, message: `Invoice sent to ${customerEmail}` });
  } catch (err) {
    console.error('Send Invoice Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/invoices/export?format=csv
exports.exportInvoices = async (req, res) => {
  try {
    const { status, search, dateFrom, dateTo } = req.query;
    const query = {};

    if (status) query.status = status;

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo)   query.createdAt.$lte = new Date(new Date(dateTo).setHours(23, 59, 59, 999));
    }

    if (search) {
      const matchedCustomers = await Customer.find({
        $or: [
          { name:    { $regex: search, $options: 'i' } },
          { company: { $regex: search, $options: 'i' } },
        ],
      }).select('_id');

      const customerIds = matchedCustomers.map(c => c._id);
      query.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        ...(customerIds.length ? [{ customer: { $in: customerIds } }] : []),
      ];
    }

    const invoices = await Invoice.find(query)
      .populate('customer', 'name company customerCode serviceArea')
      .populate(JOB_POPULATE)
      .sort({ createdAt: -1 });

    const rows = [
      ['Invoice #', 'Customer', 'Service Area', 'Job #', 'Assigned To', 'Priority', 'Status', 'Total', 'Balance', 'Due Date'],
      ...invoices.map(inv => [
        inv.invoiceNumber,
        inv.customer?.company || inv.customer?.name || '',
        inv.customer?.serviceArea || '',
        inv.job?.jobNumber || '',
        inv.job?.assignedTo?.name || '',
        inv.job?.priority || '',
        inv.status,
        inv.grandTotal,
        inv.balance,
        inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-PH') : '',
      ]),
    ];

    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');

    res.set({
      'Content-Type':        'text/csv',
      'Content-Disposition': 'attachment; filename="invoices.csv"',
    });
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};