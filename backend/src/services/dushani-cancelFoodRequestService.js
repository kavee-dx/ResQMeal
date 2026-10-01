const FoodRequest = require('../models/dushani-foodRequestModel');
const { effectiveStatus } = require('./dushani-requestProgressService');

// Sprint item 09 — cancelling closes a request the recipient no longer needs.
// Deleting (see dushani-deleteFoodRequestService) is only for a request nobody
// has claimed, so cancel covers the stages where a donor may already be
// involved: a plain waiting request, one a donor accepted, and one already on
// the way. Once the food is delivered, or the request expired or was already
// called off, there is nothing left to cancel.
const CANCELABLE_STATUSES = ['PENDING', 'MATCHED', 'DISPATCHED'];

function fail(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}

async function cancelFoodRequest(recipientId, requestId) {
  if (!recipientId || !requestId) {
    fail('recipientId and requestId are required', 400);
  }

  // Scoped to the owner: someone else's request reads as missing rather than
  // telling an attacker it exists.
  const request = await FoodRequest.findOne({ _id: requestId, recipient: recipientId });
  if (!request) fail('Food request not found', 404);

  if (request.status === 'CANCELLED') fail('This request is already cancelled', 409);
  if (request.status === 'FULFILLED') {
    fail('The food has already been delivered — there is nothing to cancel', 409);
  }
  // A past expiry date is already expired, even if the expiry job has not run.
  if (effectiveStatus(request, Date.now()) === 'EXPIRED') {
    fail('This request has already expired', 409);
  }

  // The status filter makes the write atomic, so a donor claiming the request
  // in the same moment cannot be overwritten by the cancellation.
  const updated = await FoodRequest.findOneAndUpdate(
    { _id: requestId, recipient: recipientId, status: { $in: CANCELABLE_STATUSES } },
    { $set: { status: 'CANCELLED', cancelledAt: new Date() } },
    { new: true },
  );

  if (!updated) fail('This request has moved on — refresh to see its latest status', 409);

  return { id: updated._id.toString(), status: updated.status };
}

module.exports = { cancelFoodRequest, CANCELABLE_STATUSES };
