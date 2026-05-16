const Service = require('../models/Service');

exports.getServices = async (req, res) => {
  try {
    const { category, search } = req.query;
    const query = { isActive: true };
    if (category) query.category = category;
    if (search) query.name = new RegExp(search, 'i');
    const services = await Service.find(query).sort({ category: 1, name: 1 });
    res.json({ success: true, data: services });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ success: false, message: 'Service not found' });
    res.json({ success: true, data: service });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.createService = async (req, res) => {
  try {
    console.log('BODY:', JSON.stringify(req.body, null, 2)); // ← add this
    const service = await Service.create(req.body);
    res.status(201).json({ success: true, data: service });
  } catch (err) {
    console.error('CREATE ERROR:', err.message); // ← add this
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.updateService = async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!service) return res.status(404).json({ success: false, message: 'Service not found' });
    res.json({ success: true, data: service });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

exports.deleteService = async (req, res) => {
  try {
    await Service.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Service deactivated' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};