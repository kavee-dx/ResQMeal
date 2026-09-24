const { updateFoodRequestStatus } = require('../services/dushani-updateRequestStatusService');

// requireAuth attaches the decoded JWT payload to req.user as { id, role }.
async function updateFoodRequestStatusHandler(req, res) {
  try {
    const result = await updateFoodRequestStatus({
      actorId: req.user?.id ?? null,
      role: req.user?.role ?? null,
      requestId: req.params.id,
      status: req.body?.status,
    });
    return res.json({ success: true, ...result });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res
      .status(statusCode)
      .json({ message: error.message || 'Failed to update request status' });
  }
}

module.exports = { updateFoodRequestStatusHandler };
