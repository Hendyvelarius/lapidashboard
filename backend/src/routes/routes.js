const express = require('express');
const router = express.Router();
const SqlController = require('../controllers/SqlController');


router.get('/wip', SqlController.getWip);
router.get('/alur', SqlController.getAlur);
router.get('/batch', SqlController.getBatchAlur);

module.exports = router;
