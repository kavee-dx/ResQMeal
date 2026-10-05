const {
  getRequestHistory,
} = require('../services/dushani-requestHistoryService');

// requireAuth attaches the decoded JWT payload to req.user as { id, role }.
function getRecipientId(req) {
  return req.user?.id ?? null;
}

async function getMyRequestHistoryHandler(req, res) {
  try {
    const requests = await getRequestHistory(getRecipientId(req));
    return res.json(requests);
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json({
        message: error.message || 'Failed to fetch your request history',
        error: error.message,
      });
  }
}

module.exports = { getMyRequestHistoryHandler };
