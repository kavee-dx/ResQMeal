const FoodRequest = require('../models/dushani-foodRequestModel');
const { effectiveStatus } = require('./dushani-requestProgressService');

// Sprint item 4 — a request moves forward through the donor stages as the
// donation actually happens. Claiming is its own endpoint (/accept); this one
// covers what comes after, and it only ever steps forwards, so a stale client
// cannot rewind a request that has already been delivered.
const ADVANCE_STAGES = {
  DISPATCHED: {
    from: ['MATCHED'],
    timeField: 'dispatchedAt',
    label: 'on the way',
  },
  FULFILLED: {
    from: ['MATCHED', 'DISPATCHED'],
    timeField: 'fulfilledAt',
    label: 'delivered',
  },
};

function fail(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}

function toId(value) {
  if (!value) return null;
  return typeof value === 'string' ? value : value.toString();
}

/**
 * Who is allowed to push a request along: the donor who claimed it, a
 * volunteer handling the drop-off, and the recipient themselves — but the
 * recipient only to confirm the food arrived in their hands.
 */
function mayAdvance({ stage, role, isClaimingDonor, isRecipient }) {
  if (role === 'DONOR') return isClaimingDonor;
  if (role === 'VOLUNTEER') return true;
  if (role === 'RECIPIENT') return isRecipient && stage === 'FULFILLED';
  return false;
}

function toView(request) {
  return {
    id: request._id.toString(),
    status: request.status,
    stageLabel: ADVANCE_STAGES[request.status]?.label ?? request.status,
    foodType: request.foodType,
    quantity: request.quantity,
    location: request.location,
    details: request.details,
    contactNumber: request.contactNumber,
    urgency: request.urgency,
    preferredAt: request.preferredAt ?? null,
    acceptedAt: request.acceptedAt ?? null,
    dispatchedAt: request.dispatchedAt ?? null,
    fulfilledAt: request.fulfilledAt ?? null,
  };
}

async function updateFoodRequestStatus({ actorId, role, requestId, status }) {
  if (!actorId || !requestId || !status) {
    fail('actorId, requestId and status are required', 400);
  }

  const stage = ADVANCE_STAGES[status];
  if (!stage) {
    fail('status must be DISPATCHED or FULFILLED — a donor claims a request with accept', 400);
  }

  const request = await FoodRequest.findById(requestId);
  if (!request) fail('Food request not found', 404);

  const isClaimingDonor = toId(request.acceptedBy) === toId(actorId);
  const isRecipient = toId(request.recipient) === toId(actorId);

  if (!mayAdvance({ stage: status, role, isClaimingDonor, isRecipient })) {
    fail('You cannot update this request', 403);
  }

  // An expired request is closed even if the expiry job has not run yet.
  if (effectiveStatus(request, Date.now()) === 'EXPIRED') {
    fail('This request has expired', 409);
  }

  // The status filter makes the write atomic: two people acting at the same
  // time cannot both move the same request on.
  const updated = await FoodRequest.findOneAndUpdate(
    { _id: requestId, status: { $in: stage.from } },
    { $set: { status, [stage.timeField]: new Date() } },
    { new: true },
  );

  if (updated) return toView(updated);

  const fresh = await FoodRequest.findById(requestId);
  if (!fresh) fail('Food request not found', 404);
  if (fresh.status === status) {
    fail(`This request is already marked as ${stage.label}`, 409);
  }
  fail('This request has moved on — refresh to see its latest status', 409);
}

module.exports = { updateFoodRequestStatus, ADVANCE_STAGES };
