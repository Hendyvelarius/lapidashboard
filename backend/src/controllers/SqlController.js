const SqlModel = require('../models/sqlModel');
const { WipConverter } = require('../models/converterModel');

// Controller buat ambil data WIP
async function getWip(req, res) {
  try {
    const data = await SqlModel.WorkInProgress();
    const converted = WipConverter(data);
    res.json({ data: converted });
  } catch (err) {
    console.error('Error in fetching WIP:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// Controller for /api/alur
async function getAlur(req, res) {
  try {
    const data = await SqlModel.WorkInProgressAlur();
    res.json({ data });
  } catch (err) {
    console.error('Error in fetching Alur:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}


// Controller for /batch?batchNo=...
async function getBatchAlur(req, res) {
  try {
    const batchNo = req.query.batchNo;
    if (!batchNo) {
      return res.status(400).json({ error: 'batchNo query parameter is required' });
    }
    const data = await SqlModel.AlurProsesBatch(batchNo);
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getWip, getAlur, getBatchAlur };
