const express = require('express');
const router = express.Router();
const SqlController = require('../controllers/SqlController');


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

module.exports = router;