const { deleteFoodRequest } = require('../services/dushani-deleteFoodRequestService');

// requireAuth attaches the decoded JWT payload to req.user as { id, role }.
function getRecipientId(req) {
  return req.user?.id ?? null;
}

async function deleteFoodRequestHandler(req, res) {
  try {
    const result = await deleteFoodRequest(getRecipientId(req), req.params.id);
    return res.json({ success: true, ...result });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res
      .status(statusCode)
      .json({ message: error.message || 'Failed to delete food request' });
  }
}

module.exports = { deleteFoodRequestHandler };
