const express = require('express');
const router = express.Router();
const SqlController = require('../controllers/SqlController');

// Route: GET /api/wip
router.get('/wip', SqlController.getWip);

module.exports = router;
