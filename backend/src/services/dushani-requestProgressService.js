const FoodRequest = require('../models/dushani-foodRequestModel');

// Sprint task — Food Request Progress Tracking: posting a request already puts
// it in front of donors, so the track is "Request posted" followed by the three
// things that can happen after it. EXPIRED / CANCELLED end the track early
// (see buildTimeline).
const STAGES = [
  {
    key: 'MATCHED',
    label: 'Accepted by a donor',
    description: 'A donor claimed your request and is preparing the food.',
  },
  {
    key: 'DISPATCHED',
    label: 'Delivery on the way',
    description: 'The food has left the donor and is coming to you.',
  },
  {
    key: 'FULFILLED',
    label: 'Food delivered',
    description: 'The donation reached you.',
  },
];

const WAITING_LABEL = 'Waiting for a donor';

const TERMINAL_LABELS = {
  EXPIRED: { label: 'Request expired', description: 'No donor claimed it in time.' },
  CANCELLED: { label: 'Request cancelled', description: 'You withdrew this request.' },
};

// The expiry job has not always run yet, so a past expiry date on a still
// pending request already means expired to the recipient.
function effectiveStatus(request, now) {
  if (request.status !== 'PENDING') return request.status;
  const expiresAt = request.expiresAt ? new Date(request.expiresAt).getTime() : null;
  return expiresAt && expiresAt <= now ? 'EXPIRED' : 'PENDING';
}

function buildTimeline(request, status) {
  const stopped = status === 'EXPIRED' || status === 'CANCELLED';
  // A waiting, expired or cancelled request never reached a donor stage.
  const stageIndex = stopped ? -1 : STAGES.findIndex((stage) => stage.key === status);

  const timeline = [
    {
      key: 'POSTED',
      label: 'Request posted',
      description: 'Your request was sent to ResQMeal.',
      at: request.createdAt,
      state: 'done',
    },
    ...STAGES.map((stage, index) => {
      let state = 'upcoming';
      if (index < stageIndex) state = 'done';
      else if (index === stageIndex) state = status === 'FULFILLED' ? 'done' : 'current';

      return {
        ...stage,
        // updatedAt is the only timestamp the document carries, so it is
        // reported for the stage the request actually reached.
        at: index === stageIndex ? request.updatedAt : null,
        state,
      };
    }),
  ];

  if (stopped) {
    timeline.push({
      key: status,
      ...TERMINAL_LABELS[status],
      at: request.updatedAt,
      state: 'stopped',
    });
  }

  return timeline;
}

function buildProgress(status, now, request) {
  const stageIndex = STAGES.findIndex((stage) => stage.key === status);
  const stopped = status === 'EXPIRED' || status === 'CANCELLED';
  // "Request posted" counts as the first step, so a fresh request is already
  // a quarter of the way through the track.
  const stepsTotal = STAGES.length + 1;
  const stepsCompleted = Math.max(stageIndex, -1) + 2;

  return {
    status,
    stage: stageIndex < 0 ? status : STAGES[stageIndex].key,
    stageLabel: stopped
      ? TERMINAL_LABELS[status].label
      : stageIndex < 0
        ? WAITING_LABEL
        : STAGES[stageIndex].label,
    stageTotal: stepsTotal,
    stepsCompleted,
    stepsTotal,
    percent: Math.round((stepsCompleted / stepsTotal) * 100),
    outcome: status === 'FULFILLED' ? 'complete' : stopped ? 'stopped' : 'active',
    expiresAt: request.expiresAt ?? null,
    // A delivered request no longer races the clock.
    expiresInMs:
      request.expiresAt && !stopped && status !== 'FULFILLED'
        ? new Date(request.expiresAt).getTime() - now
        : null,
  };
}

async function getRequestProgress(recipientId, requestId) {
  if (!recipientId || !requestId) {
    const error = new Error('recipientId and requestId are required');
    error.statusCode = 400;
    throw error;
  }

  const request = await FoodRequest.findOne({ _id: requestId, recipient: recipientId });

  if (!request) {
    const error = new Error('Food request not found');
    error.statusCode = 404;
    throw error;
  }

  const now = Date.now();
  const status = effectiveStatus(request, now);

  return {
    request: {
      id: request._id.toString(),
      foodType: request.foodType,
      quantity: request.quantity,
      location: request.location,
      details: request.details,
      contactNumber: request.contactNumber,
      urgency: request.urgency,
      priority: request.priority,
      status,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      expiresAt: request.expiresAt,
      preferredAt: request.preferredAt ?? null,
    },
    progress: buildProgress(status, now, request),
    timeline: buildTimeline(request, status),
  };
}

module.exports = { getRequestProgress, effectiveStatus, STAGES };
