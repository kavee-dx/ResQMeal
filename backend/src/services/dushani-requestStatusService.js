const FoodRequest = require('../models/dushani-foodRequestModel');
const { effectiveStatus } = require('./dushani-requestProgressService');

// A past expiry date already means "expired" to the recipient, even before the
// expiry job rewrites the document, so the list never shows a dead request as
// still waiting.
async function getRequestsByRecipient(recipientId) {
  const requests = await FoodRequest.find({ recipient: recipientId })
    .sort({ createdAt: -1 })
    .lean();

  const now = Date.now();
  return requests.map((request) => ({
    ...request,
    status: effectiveStatus(request, now),
  }));
}

module.exports = { getRequestsByRecipient };
