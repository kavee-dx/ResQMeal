const FoodRequest = require('../models/dushani-foodRequestModel');

// Sprint task — Food Request Progress Tracking: the three stages a request
// moves through. EXPIRED / CANCELLED end the track early (see buildTimeline).
const STAGES = [
  {
    key: 'PENDING',
    label: 'Looking for a donor',
    description: 'Nearby donors can see your request.',
  },
  {
    key: 'MATCHED',
    label: 'Matched with a donor',
    description: 'A donor claimed your request and is preparing the food.',
  },
  {
    key: 'FULFILLED',
    label: 'Food delivered',
    description: 'The donation reached you.',
  },
];

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
  // A stopped request did reach the "looking for a donor" stage, it just
  // never got past it.
  const stageIndex = stopped ? 0 : STAGES.findIndex((stage) => stage.key === status);

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
      if (stageIndex >= 0) {
        if (index < stageIndex) state = 'done';
        else if (index === stageIndex)
          state = stopped || status === 'FULFILLED' ? 'done' : 'current';
      }
      return { ...stage, at: null, state };
    }),
  ];

  // updatedAt is the only timestamp the document carries for a later stage, so
  // it is reported for the stage the request actually reached.
  if (stageIndex > 0) timeline[1 + stageIndex].at = request.updatedAt;
  if (stageIndex === 0) timeline[1].at = request.createdAt;

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
  const stopped = stageIndex < 0;
  // A request that expired or was cancelled never moved past "looking for a
  // donor", so it counts as one step of three.
  const steps = stopped ? 1 : stageIndex + 1;

  return {
    status,
    stage: stopped ? status : STAGES[stageIndex].key,
    stageLabel: stopped ? TERMINAL_LABELS[status].label : STAGES[stageIndex].label,
    stageTotal: STAGES.length,
    stepsCompleted: stopped ? 0 : stageIndex,
    stepsTotal: STAGES.length,
    percent: Math.round((steps / STAGES.length) * 100),
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
    },
    progress: buildProgress(status, now, request),
    timeline: buildTimeline(request, status),
  };
}

module.exports = { getRequestProgress, STAGES };
