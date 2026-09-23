const { getRequestsByRecipient } = require('../services/dushani-requestStatusService');

async function getMyRequestsHandler(req, res) {
  try {
    // requireAuth attaches the decoded JWT payload to req.user as { id, role }
    const requests = await getRequestsByRecipient(req.user?.id);
    return res.json(requests);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch food requests', error: error.message });
  }
}

module.exports = { getMyRequestsHandler };
