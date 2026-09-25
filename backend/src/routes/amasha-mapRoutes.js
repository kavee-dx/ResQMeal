const express = require('express');
const { getDonationMapPointsHandler, getRequestMapPointsHandler } = require('../controllers/amasha-mapController');

const router = express.Router();

router.get('/donations', getDonationMapPointsHandler);
router.get('/requests', getRequestMapPointsHandler);

module.exports = router;