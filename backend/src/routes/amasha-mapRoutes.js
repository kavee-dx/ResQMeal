const express = require('express');
const { requireAuth } = require('../middleware/kaveesha-authMiddleware');
const {
  getDonationMapPointsHandler,
  getRequestMapPointsHandler,
  getDonorMapPointsHandler,
  getNgoMapPointsHandler,
} = require('../controllers/amasha-mapController');

const router = express.Router();

// Anonymous points (donation/food-request data, no account info attached).
router.get('/donations', getDonationMapPointsHandler);
router.get('/requests', getRequestMapPointsHandler);

// Donor/NGO points carry account-level information, so they require a
// logged-in user — consistent with the app's "location shared only when
// needed" privacy rule.
router.get('/donors', requireAuth, getDonorMapPointsHandler);
router.get('/ngos', requireAuth, getNgoMapPointsHandler);

module.exports = router;