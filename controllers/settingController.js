const Setting = require('../models/Setting');

// GET /api/settings
exports.getSettings = async (req, res) => {
  try {
    const settings = await Setting.find();
    // Convert array to key-value object: { defaultCurrency: 'PHP', ... }
    const map = {};
    settings.forEach(s => { map[s.key] = s.value; });
    res.json({ success: true, data: map });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// PUT /api/settings  — body: { key, value }
exports.updateSetting = async (req, res) => {
  try {
    const { key, value } = req.body;
    const setting = await Setting.findOneAndUpdate(
      { key },
      { value },
      { upsert: true, new: true, runValidators: true }
    );
    res.json({ success: true, data: setting });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

// POST /api/settings/seed — run once to insert defaults
exports.seedSettings = async (req, res) => {
  try {
    const defaults = [
      { key: 'defaultCurrency', value: 'PHP' },
      { key: 'companyName',     value: 'FlowPOS' },
      { key: 'taxRate',         value: 12 },
    ];
    for (const s of defaults) {
      await Setting.findOneAndUpdate({ key: s.key }, { value: s.value }, { upsert: true });
    }
    res.json({ success: true, message: 'Settings seeded' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};