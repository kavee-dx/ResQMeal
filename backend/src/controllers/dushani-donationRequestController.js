const {
  askForDonation,
  getDonationAsks,
} = require('../services/dushani-donationRequestService');

// requireAuth (kaveesha-authMiddleware) attaches { id, role } to req.user.

// POST /api/recipient/food-requests/donation-requests
async function askForDonationHandler(req, res) {
  try {
    const result = await askForDonation({
      recipientId: req.user?.id ?? null,
      donationId: req.body?.donationId ?? null,
      requestId: req.body?.requestId ?? null,
      note: req.body?.note ?? '',
    });
    return res.json({ success: true, ...result });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res
      .status(statusCode)
      .json({ success: false, message: error.message || 'Failed to ask for this donation' });
  }
}

// GET /api/recipient/food-requests/donation-requests?donationId=
async function getDonationAsksHandler(req, res) {
  try {
    const result = await getDonationAsks({
      donorId: req.user?.id ?? null,
      role: req.user?.role ?? null,
      donationId: req.query.donationId,
    });
    return res.json({ success: true, ...result });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res
      .status(statusCode)
      .json({ success: false, message: error.message || 'Failed to load donation asks' });
  }
}

module.exports = { askForDonationHandler, getDonationAsksHandler };
