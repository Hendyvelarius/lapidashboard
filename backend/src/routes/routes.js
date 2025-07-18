const express = require('express');
const router = express.Router();
const SqlController = require('../controllers/SqlController');
const { verifyToken } = require('../middleware/auth');

const openaiRoutes = require('./openai');

// Authentication endpoint to verify and decode JWT token (optional)
router.get('/auth/verify', verifyToken, (req, res) => {
  res.json({
    message: 'Authentication successful',
    user: req.user,
    delegatedTo: req.delegatedTo,
    tokenData: req.tokenData
  });
});

// Remove global auth middleware - make routes accessible without auth for now


// Routing WIP 
router.get('/wip', SqlController.getWip);
router.get('/wipDept', SqlController.getWipProdByDept)
router.get('/wipGroup', SqlController.getWipByGroup);
router.get('/alur', SqlController.getAlur);
router.get('/batch', SqlController.getBatchAlur);

// Routing Order Fulfillment
router.get('/fulfillment', SqlController.getFulfillment);
router.get('/fulfillmentKelompok', SqlController.getFulfillmentPerKelompok);
router.get('/fulfillmentDept', SqlController.getFulfillmentPerDept);
router.get('/of', SqlController.getOrderFulfillment);

// Routing Product Cycle Time
router.get('/pct', SqlController.getProductCycleTime);
router.get('/pctYearly', SqlController.getProductCycleTimeYearly);
router.get('/pctAverage', SqlController.getProductCycleTimeAverage);

// Routing Stock Related
router.get('/stockReport', SqlController.getStockReport);
router.get('/monthlyForecast', SqlController.getMonthlyForecast);
router.get('/forecast', SqlController.getForecast);

// OpenAI chat endpoint
router.use('/ai', openaiRoutes);


module.exports = router;