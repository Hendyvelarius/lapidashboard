const { WorkInProgress } = require('../models/sqlModel');
const { WipConverter } = require('../models/converterModel');

// Controller buat ambil data WIP
async function getWip(req, res) {
  try {
    const data = await WorkInProgress();
    const converted = WipConverter(data);
    res.json({ data: converted });
  } catch (err) {
    console.error('Error in fetching WIP:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

module.exports = { getWip };
