const {
  getOpenRequests,
  acceptFoodRequest,
} = require('../services/dushani-requestBoardService');

// requireAuth (kaveesha-authMiddleware) attaches { id, role } to req.user.

// GET /api/recipient/food-requests/open
async function getOpenRequestsHandler(req, res) {
  try {
    return res.json(await getOpenRequests());
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res
      .status(statusCode)
      .json({ message: error.message || 'Failed to load open requests' });
  }
}

// POST /api/recipient/food-requests/:id/accept
async function acceptFoodRequestHandler(req, res) {
  try {
    const result = await acceptFoodRequest({
      donorId: req.user?.id ?? null,
      role: req.user?.role ?? null,
      requestId: req.params.id,
    });
    return res.json({ success: true, ...result });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res
      .status(statusCode)
      .json({ message: error.message || 'Failed to accept food request' });
  }
}

module.exports = { getOpenRequestsHandler, acceptFoodRequestHandler };
