const FoodRequest = require('../models/dushani-foodRequestModel');
const { effectiveStatus } = require('./dushani-requestProgressService');

// A request belongs to the history once it can no longer be answered: the food
// arrived, no donor claimed it in time, or the recipient called it off.
const CLOSED_STATUSES = ['FULFILLED', 'EXPIRED', 'CANCELLED'];

// Each outcome stamps the moment it happened. An expiry writes no field of its
// own, so the need-by date it missed is when that request closed.
function closingMoment(request, status) {
  if (status === 'FULFILLED') {
    return request.fulfilledAt ?? request.updatedAt ?? request.createdAt;
  }
  if (status === 'CANCELLED') {
    return request.cancelledAt ?? request.updatedAt ?? request.createdAt;
  }
  return request.expiresAt ?? request.updatedAt ?? request.createdAt;
}

async function getRequestHistory(recipientId) {
  if (!recipientId) {
    const error = new Error('recipientId is required');
    error.statusCode = 400;
    throw error;
  }

  const requests = await FoodRequest.find({ recipient: recipientId })
    .sort({ createdAt: -1 })
    .lean();

  const now = Date.now();
  const closed = requests
    .map((request) => {
      // A past expiry date reads as expired even before the expiry job rewrites
      // the document, so the history is never a step behind the list.
      const status = effectiveStatus(request, now);
      if (!CLOSED_STATUSES.includes(status)) return null;
      return { ...request, status, closedAt: closingMoment(request, status) };
    })
    .filter(Boolean);

  // The documents arrive ordered by when they were posted; the history reads
  // newest-first by when each one ended.
  return closed.sort(
    (left, right) =>
      new Date(right.closedAt ?? 0).getTime() - new Date(left.closedAt ?? 0).getTime(),
  );
}

module.exports = { getRequestHistory, CLOSED_STATUSES };
