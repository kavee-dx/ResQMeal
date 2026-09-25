const { getDonationMapPoints } = require('../services/amasha-mapDonationsService');
const { getRequestMapPoints } = require('../services/amasha-mapRequestsService');

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

module.exports = { getDonationMapPointsHandler, getRequestMapPointsHandler };