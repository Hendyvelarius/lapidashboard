const express = require('express');
const router = express.Router();
const SqlController = require('../controllers/SqlController');
const SnapshotController = require('../controllers/SnapshotController');
const { verifyToken } = require('../middleware/auth');

// Authentication endpoint to verify and decode JWT token
router.get('/auth/verify', verifyToken, (req, res) => {
  res.json({
    message: 'Authentication successful',
    user: req.user,
    delegatedTo: req.delegatedTo,
    tokenData: req.tokenData
  });
});

// Routing Dashboard Snapshots
router.post('/snapshots', SnapshotController.saveSnapshot);                    // Save new snapshot
router.get('/snapshots/available', SnapshotController.getAvailableSnapshots);  // List all available periods
router.get('/snapshots/history/:periode', SnapshotController.getSnapshotHistory); // Get all snapshots for a periode
router.get('/snapshots/:periode', SnapshotController.getSnapshot);              // Get snapshot by periode
router.delete('/snapshots/:id', SnapshotController.deleteSnapshot);            // Delete snapshot

// Routing WIP 
router.get('/wip', SqlController.getWip);
router.get('/wipDept', SqlController.getWipProdByDept)
router.get('/wipGroup', SqlController.getWipByGroup);
router.get('/wipData', SqlController.getWIPData);
router.get('/alur', SqlController.getAlur);
router.get('/batch', SqlController.getBatchAlur);

// Routing Order Fulfillment
router.get('/fulfillment', SqlController.getFulfillment);
router.get('/fulfillmentKelompok', SqlController.getFulfillmentPerKelompok);
router.get('/fulfillmentDept', SqlController.getFulfillmentPerDept);
router.get('/of', SqlController.getOrderFulfillment);
router.get('/ofsummary', SqlController.getofsummary);

// Routing Product Cycle Time
router.get('/pct', SqlController.getProductCycleTime);
router.get('/pctYearly', SqlController.getProductCycleTimeYearly);
router.get('/pctAverage', SqlController.getProductCycleTimeAverage);
router.get('/pctSummary', SqlController.getPCTSummary);
router.get('/pctBreakdown', SqlController.getPCTBreakdown);
router.get('/pctRawData', SqlController.getPCTRawData);

// Routing Lead Time
router.get('/leadTime', SqlController.getLeadTime);

// Routing Stock Related
router.get('/stockReport', SqlController.getStockReport);
router.get('/monthlyForecast', SqlController.getMonthlyForecast);
router.get('/forecast', SqlController.getForecast);
router.get('/bbbk', SqlController.getbbbk);
router.get('/dailySales', SqlController.getDailySales);
router.get('/dailyProduction', SqlController.getDailyProduction);
router.get('/lostSales', SqlController.getLostSales);
router.get('/ota', SqlController.getOTA);
router.get('/material', SqlController.getMaterial);

// Routing Product Categories
router.get('/productList', SqlController.getProductList);
router.get('/otcProducts', SqlController.getOTCProducts);
router.get('/productGroupDept', SqlController.getProductGroupDept);
router.get('/releasedBatches', SqlController.getReleasedBatches);
router.get('/releasedBatchesYTD', SqlController.getReleasedBatchesYTD);

// Routing OF1 Target
router.get('/of1Target', SqlController.getOF1Target);

// Routing Batch Expiry
router.get('/batchExpiry', SqlController.getBatchExpiry);

// Routing Holidays for working days calculation
router.get('/holidays', SqlController.getHolidays);

// Cache management endpoints
const { cache } = require('../utils/cache');

// Get cache statistics
router.get('/cache/stats', (req, res) => {
  res.json(cache.getStats());
});

// Clear cache (for admin/debugging purposes)
router.post('/cache/clear', (req, res) => {
  cache.clear();
  res.json({ success: true, message: 'Cache cleared successfully' });
});

module.exports = router;