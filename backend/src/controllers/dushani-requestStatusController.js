const { getRequestsByRecipient } = require('../services/dushani-requestStatusService');

async function getMyRequestsHandler(req, res) {
  try {
    const requests = await getRequestsByRecipient(req.user?._id);
    return res.json(requests);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch food requests', error: error.message });
  }
}

module.exports = { getMyRequestsHandler };
