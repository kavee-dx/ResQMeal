const { getDonationMapPoints } = require('../services/amasha-mapDonationsService');
const { getRequestMapPoints } = require('../services/amasha-mapRequestsService');
const { getDonorMapPoints } = require('../services/amasha-mapDonorsService');
const { getNgoMapPoints } = require('../services/amasha-mapNgosService');

// GET /api/monitoring/map/donations
// Returns live donations as map-ready points for the monitoring module.
async function getDonationMapPointsHandler(req, res) {
  try {
    const result = await getDonationMapPoints();
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to load map data' });
  }
}

// GET /api/monitoring/map/requests
// Returns open food requests as map-ready points, placed at the recipient's district.
async function getRequestMapPointsHandler(req, res) {
  try {
    const result = await getRequestMapPoints();
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to load map data' });
  }
}

// GET /api/monitoring/map/donors
// Returns approved donors as district-level map points (auth required —
// these points carry account-level info, unlike anonymous donation points).
async function getDonorMapPointsHandler(req, res) {
  try {
    const result = await getDonorMapPoints();
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to load map data' });
  }
}

// GET /api/monitoring/map/ngos
// Returns approved NGO partners as district-level map points (auth required).
async function getNgoMapPointsHandler(req, res) {
  try {
    const result = await getNgoMapPoints();
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to load map data' });
  }
}

module.exports = {
  getDonationMapPointsHandler,
  getRequestMapPointsHandler,
  getDonorMapPointsHandler,
  getNgoMapPointsHandler,
};