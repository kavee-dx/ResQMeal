const { browseDonations } = require('../services/dushani-browseDonationsService');

// GET /api/recipient/food-requests/donations
// The browse page: the live donation pool, filtered by what the recipient typed
// and by food type, portion count and how far the pickup is.
async function browseDonationsHandler(req, res) {
  try {
    const result = await browseDonations({
      recipientId: req.user?.id ?? null,
      search: req.query.search,
      group: req.query.group,
      minPortions: req.query.minPortions,
      distance: req.query.distance,
      sort: req.query.sort,
    });
    return res.json({ success: true, ...result });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res
      .status(statusCode)
      .json({ success: false, message: error.message || 'Failed to load donations' });
  }
}

module.exports = { browseDonationsHandler };
