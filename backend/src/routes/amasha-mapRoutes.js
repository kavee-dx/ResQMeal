const express = require('express');
const { getDonationMapPointsHandler } = require('../controllers/amasha-mapController');

const router = express.Router();

router.get('/donations', getDonationMapPointsHandler);

module.exports = router;