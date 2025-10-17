const SqlModel = require('../models/sqlModel');
const converterModel = require('../models/converterModel');

// Controller for /fulfillment
async function getFulfillment(req, res) {
  try {
    const data = await SqlModel.getFulfillment();
    res.json({ data });
  } catch (err) {
    console.error('Error in fetching Fulfillment:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// Controller buat ambil data WIP
async function getWip(req, res) {
  try {
    const data = await SqlModel.WorkInProgress();
    const converted = converterModel.WipConverter(data);
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


// Controller for /fulfillmentKelompok
async function getFulfillmentPerKelompok(req, res) {
  try {
    const data = await SqlModel.getFulfillmentPerKelompok();
    res.json({ data });
  } catch (err) {
    console.error('Error in fetching FulfillmentPerKelompok:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// Controller for /fulfillmentPerDept
async function getFulfillmentPerDept(req, res) {
  try {
    const data = await SqlModel.getFulfillmentPerDept();
    res.json({ data });
  } catch (err) {
    console.error('Error in fetching FulfillmentPerDept:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

async function getWipProdByDept (req, res) {
  try {
    const data = await SqlModel.getWipProdByDept();
    res.json({ data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function getWipByGroup(req, res) {
  try {
    const data = await SqlModel.getWipByGroup();
    res.json({ data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function getProductCycleTime(req, res) {
  try {
    const data = await SqlModel.getProductCycleTime();
    res.json({ data });
  } catch (err) {
    console.error('Error in fetching Product Cycle Time:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

async function getProductCycleTimeYearly(req, res) {
  try {
    const data = await SqlModel.getProductCycleTimeYearly();
    res.json({ data });
  } catch (err) {
    console.error('Error in fetching Product Cycle Time:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

async function getProductCycleTimeAverage(req, res) {
  try {
    const raw = await SqlModel.getProductCycleTime();
    const data = converterModel.getProductCycleTimeAverage(raw);
    res.json({ data });
  } catch (err) {
    console.error('Error in fetching Product Cycle Time Average:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

async function getOrderFulfillment(req, res) {
  try {
    const data = await SqlModel.getOrderFulfillment();
    res.json(data);
  } catch (err) {
    console.error('Error in fetching Order Fulfillment:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

async function getStockReport(req, res) {
  try {
    const data = await SqlModel.getStockReport();
    res.json(data);
  } catch (err) {
    console.error('Error in fetching Stock Report:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

async function getMonthlyForecast(req, res) {
  try {
    const { month, year } = req.query;
    if (!month || !year) {
      return res.status(400).json({ error: 'month and year query parameters are required' });
    }
    const data = await SqlModel.getMonthlyForecast(month, year);
    res.json({ data });
  } catch (err) {
    console.error('Error in fetching Monthly Forecast:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

async function getForecast(req, res) {
  try {
    const data = await SqlModel.getForecast();
    res.json( data );
  } catch (err) {
    console.error('Error in fetching Forecast:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

async function getofsummary(req, res) {
  try {
    const data = await SqlModel.getofsummary();
    res.json( data );
  } catch (err) {
    console.error('Error in fetching Order Fulfillment Summary:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

async function getbbbk(req, res) {
  try {
    const data = await SqlModel.getbbbk();
    res.json( data );
  } catch (err) {
    console.error('Error in fetching BBBK:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

async function getDailySales(req, res) {
  try {
    const data = await SqlModel.getDailySales();
    res.json( data );
  } catch (err) {
    console.error('Error in fetching Daily Sales:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

async function getLostSales(req, res) {
  try {
    const data = await SqlModel.getLostSales();
    res.json( data );
  } catch (err) {
    console.error('Error in fetching Lost Sales:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

async function getOTA(req, res) {
  try {
    const data = await SqlModel.getOTA();
    res.json( data );
  } catch (err) {
    console.error('Error in fetching OTA:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

async function getMaterial(req, res) {
  try {
    const data = await SqlModel.getMaterial();
    res.json( data );
  } catch (err) {
    console.error('Error in fetching Material:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

async function getPCTBreakdown(req, res) {
  try {
    const data = await SqlModel.getPCTBreakdown();
    res.json({ data });
  } catch (err) {
    console.error('Error in fetching PCT Breakdown:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

module.exports = { getLostSales, getOTA, getMaterial, getWip, getDailySales, getbbbk, getAlur, getForecast, getMonthlyForecast, getBatchAlur, getFulfillmentPerKelompok, getFulfillment, getFulfillmentPerDept, getWipProdByDept, getWipByGroup, getProductCycleTime, getProductCycleTimeYearly ,getProductCycleTimeAverage, getOrderFulfillment, getStockReport, getofsummary, getPCTBreakdown };