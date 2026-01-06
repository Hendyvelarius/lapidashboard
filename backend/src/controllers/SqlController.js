const SqlModel = require('../models/sqlModel');
const converterModel = require('../models/converterModel');
const { cache, CACHE_TTL } = require('../utils/cache');

// Helper function to get data with caching
// If skipCache is true (from ?refresh=true query param), bypass cache and fetch fresh data
async function getCachedData(cacheKey, fetchFn, ttl = CACHE_TTL.MEDIUM, skipCache = false) {
  // Skip cache if requested (manual refresh)
  if (!skipCache) {
    // Try to get from cache first
    const cachedData = cache.get(cacheKey);
    if (cachedData !== null) {
      return cachedData;
    }
  }
  
  // Fetch fresh data
  const data = await fetchFn();
  
  // Store in cache (even if we skipped reading from it)
  cache.set(cacheKey, data, ttl);
  
  return data;
}

// Helper to check if request wants fresh data
function shouldSkipCache(req) {
  return req.query.refresh === 'true';
}

// Controller for /fulfillment
async function getFulfillment(req, res) {
  try {
    const data = await getCachedData('fulfillment', () => SqlModel.getFulfillment(), CACHE_TTL.MEDIUM, shouldSkipCache(req));
    res.json({ data });
  } catch (err) {
    console.error('Error in fetching Fulfillment:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// Controller buat ambil data WIP
async function getWip(req, res) {
  try {
    const data = await getCachedData('wip', () => SqlModel.WorkInProgress(), CACHE_TTL.MEDIUM, shouldSkipCache(req));
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
    const data = await getCachedData('alur', () => SqlModel.WorkInProgressAlur(), CACHE_TTL.MEDIUM, shouldSkipCache(req));
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
    const data = await getCachedData('fulfillmentPerKelompok', () => SqlModel.getFulfillmentPerKelompok(), CACHE_TTL.MEDIUM, shouldSkipCache(req));
    res.json({ data });
  } catch (err) {
    console.error('Error in fetching FulfillmentPerKelompok:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// Controller for /fulfillmentPerDept
async function getFulfillmentPerDept(req, res) {
  try {
    const data = await getCachedData('fulfillmentPerDept', () => SqlModel.getFulfillmentPerDept(), CACHE_TTL.MEDIUM, shouldSkipCache(req));
    res.json({ data });
  } catch (err) {
    console.error('Error in fetching FulfillmentPerDept:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

async function getWipProdByDept (req, res) {
  try {
    const data = await getCachedData('wipProdByDept', () => SqlModel.getWipProdByDept(), CACHE_TTL.MEDIUM, shouldSkipCache(req));
    res.json({ data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function getWipByGroup(req, res) {
  try {
    const data = await getCachedData('wipByGroup', () => SqlModel.getWipByGroup(), CACHE_TTL.MEDIUM, shouldSkipCache(req));
    res.json({ data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function getProductCycleTime(req, res) {
  try {
    const data = await getCachedData('productCycleTime', () => SqlModel.getProductCycleTime(), CACHE_TTL.LONG, shouldSkipCache(req));
    res.json({ data });
  } catch (err) {
    console.error('Error in fetching Product Cycle Time:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

async function getProductCycleTimeYearly(req, res) {
  try {
    const data = await getCachedData('productCycleTimeYearly', () => SqlModel.getProductCycleTimeYearly(), CACHE_TTL.LONG, shouldSkipCache(req));
    res.json({ data });
  } catch (err) {
    console.error('Error in fetching Product Cycle Time:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

async function getProductCycleTimeAverage(req, res) {
  try {
    // Use getPCTSummary which groups by product and calculates averages
    // Same data source as Production Dashboard but grouped for Summary view
    const data = await getCachedData('pctSummary', () => SqlModel.getPCTSummary(), CACHE_TTL.LONG, shouldSkipCache(req));
    res.json({ data });
  } catch (err) {
    console.error('Error in fetching Product Cycle Time Average:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

async function getPCTSummary(req, res) {
  try {
    const data = await getCachedData('pctSummary', () => SqlModel.getPCTSummary(), CACHE_TTL.LONG, shouldSkipCache(req));
    res.json({ data });
  } catch (err) {
    console.error('Error in fetching PCT Summary:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

async function getOrderFulfillment(req, res) {
  try {
    const data = await getCachedData('orderFulfillment', () => SqlModel.getOrderFulfillment(), CACHE_TTL.MEDIUM, shouldSkipCache(req));
    res.json(data);
  } catch (err) {
    console.error('Error in fetching Order Fulfillment:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

async function getStockReport(req, res) {
  try {
    const data = await getCachedData('stockReport', () => SqlModel.getStockReport(), CACHE_TTL.MEDIUM, shouldSkipCache(req));
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
    const data = await getCachedData('forecast', () => SqlModel.getForecast(), CACHE_TTL.MEDIUM, shouldSkipCache(req));
    res.json( data );
  } catch (err) {
    console.error('Error in fetching Forecast:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

async function getofsummary(req, res) {
  try {
    const data = await getCachedData('ofSummary', () => SqlModel.getofsummary(), CACHE_TTL.MEDIUM, shouldSkipCache(req));
    res.json( data );
  } catch (err) {
    console.error('Error in fetching Order Fulfillment Summary:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

async function getbbbk(req, res) {
  try {
    const data = await getCachedData('bbbk', () => SqlModel.getbbbk(), CACHE_TTL.MEDIUM, shouldSkipCache(req));
    res.json( data );
  } catch (err) {
    console.error('Error in fetching BBBK:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

async function getDailySales(req, res) {
  try {
    const data = await getCachedData('dailySales', () => SqlModel.getDailySales(), CACHE_TTL.MEDIUM, shouldSkipCache(req));
    res.json( data );
  } catch (err) {
    console.error('Error in fetching Daily Sales:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

async function getLostSales(req, res) {
  try {
    const data = await getCachedData('lostSales', () => SqlModel.getLostSales(), CACHE_TTL.MEDIUM, shouldSkipCache(req));
    res.json( data );
  } catch (err) {
    console.error('Error in fetching Lost Sales:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

async function getOTA(req, res) {
  try {
    const data = await getCachedData('ota', () => SqlModel.getOTA(), CACHE_TTL.MEDIUM, shouldSkipCache(req));
    res.json( data );
  } catch (err) {
    console.error('Error in fetching OTA:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

async function getMaterial(req, res) {
  try {
    const data = await getCachedData('material', () => SqlModel.getMaterial(), CACHE_TTL.MEDIUM, shouldSkipCache(req));
    res.json( data );
  } catch (err) {
    console.error('Error in fetching Material:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

async function getPCTBreakdown(req, res) {
  try {
    const period = req.query.period || 'MTD'; // Default to MTD if not specified
    const cacheKey = `pctBreakdown_${period}`;
    const data = await getCachedData(cacheKey, () => SqlModel.getPCTBreakdown(period), CACHE_TTL.LONG, shouldSkipCache(req));
    res.json({ data });
  } catch (err) {
    console.error('Error in fetching PCT Breakdown:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

async function getWIPData(req, res) {
  try {
    const data = await getCachedData('wipData', () => SqlModel.getWIPData(), CACHE_TTL.MEDIUM, shouldSkipCache(req));
    res.json({ data });
  } catch (err) {
    console.error('Error in fetching WIP Data:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

async function getProductList(req, res) {
  try {
    const data = await getCachedData('productList', () => SqlModel.getProductList(), CACHE_TTL.VERY_LONG, shouldSkipCache(req));
    res.json({ data });
  } catch (err) {
    console.error('Error in fetching Product List:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

async function getOTCProducts(req, res) {
  try {
    const data = await getCachedData('otcProducts', () => SqlModel.getOTCProducts(), CACHE_TTL.VERY_LONG, shouldSkipCache(req));
    res.json({ data });
  } catch (err) {
    console.error('Error in fetching OTC Products:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

async function getProductGroupDept(req, res) {
  try {
    const data = await getCachedData('productGroupDept', () => SqlModel.getProductGroupDept(), CACHE_TTL.LONG, shouldSkipCache(req));
    res.json({ data });
  } catch (err) {
    console.error('Error in fetching Product Group Dept:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

async function getReleasedBatches(req, res) {
  try {
    const data = await getCachedData('releasedBatches', () => SqlModel.getReleasedBatches(), CACHE_TTL.MEDIUM, shouldSkipCache(req));
    res.json({ data });
  } catch (err) {
    console.error('Error in fetching Released Batches:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

async function getReleasedBatchesYTD(req, res) {
  try {
    const data = await getCachedData('releasedBatchesYTD', () => SqlModel.getReleasedBatchesYTD(), CACHE_TTL.MEDIUM, shouldSkipCache(req));
    res.json({ data });
  } catch (err) {
    console.error('Error in fetching Released Batches YTD:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

async function getDailyProduction(req, res) {
  try {
    const data = await getCachedData('dailyProduction', () => SqlModel.getDailyProduction(), CACHE_TTL.MEDIUM, shouldSkipCache(req));
    res.json({ data });
  } catch (err) {
    console.error('Error in fetching Daily Production:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

async function getLeadTime(req, res) {
  try {
    const period = req.query.period || 'MTD'; // Default to MTD if not specified
    const cacheKey = `leadTime_${period}`;
    const data = await getCachedData(cacheKey, () => SqlModel.getLeadTime(period), CACHE_TTL.LONG, shouldSkipCache(req));
    res.json({ data });
  } catch (err) {
    console.error('Error in fetching Lead Time:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

async function getOF1Target(req, res) {
  try {
    const data = await getCachedData('of1Target', () => SqlModel.getOF1Target(), CACHE_TTL.MEDIUM, shouldSkipCache(req));
    res.json({ data });
  } catch (err) {
    console.error('Error in fetching OF1 Target:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

async function getBatchExpiry(req, res) {
  try {
    const data = await getCachedData('batchExpiry', () => SqlModel.getBatchExpiry(), CACHE_TTL.MEDIUM, shouldSkipCache(req));
    res.json({ data });
  } catch (err) {
    console.error('Error in fetching Batch Expiry:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

async function getHolidays(req, res) {
  try {
    // Holidays rarely change, use very long TTL
    const data = await getCachedData('holidays', () => SqlModel.getHolidays(), CACHE_TTL.VERY_LONG, shouldSkipCache(req));
    res.json({ data });
  } catch (err) {
    console.error('Error in fetching Holidays:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// Controller for /pctRawData - Raw t_alur_proses data for PCT batches
async function getPCTRawData(req, res) {
  try {
    const period = req.query.period || 'MTD';
    const cacheKey = `pctRawData_${period}`;
    const data = await getCachedData(cacheKey, () => SqlModel.getPCTRawData(period), CACHE_TTL.LONG, shouldSkipCache(req));
    res.json({ data });
  } catch (err) {
    console.error('Error in fetching PCT Raw Data:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

module.exports = { getLostSales, getOTA, getMaterial, getWip, getDailySales, getbbbk, getAlur, getForecast, getMonthlyForecast, getBatchAlur, getFulfillmentPerKelompok, getFulfillment, getFulfillmentPerDept, getWipProdByDept, getWipByGroup, getProductCycleTime, getProductCycleTimeYearly ,getProductCycleTimeAverage, getPCTSummary, getOrderFulfillment, getStockReport, getofsummary, getPCTBreakdown, getPCTRawData, getWIPData, getProductList, getOTCProducts, getProductGroupDept, getReleasedBatches, getReleasedBatchesYTD, getDailyProduction, getLeadTime, getOF1Target, getBatchExpiry, getHolidays };