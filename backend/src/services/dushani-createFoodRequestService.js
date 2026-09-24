const FoodRequest = require('../models/dushani-foodRequestModel');

const URGENCY_LEVELS = ['URGENT', 'NORMAL'];

// The request form only offers the next two days, so anything further out is
// rejected rather than silently accepted.
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
// Anything needed sooner than this is an emergency, not a scheduled request.
const MIN_LEAD_MS = 5 * 60 * 60 * 1000;

function validateUrgency(urgency) {
  if (urgency !== undefined && !URGENCY_LEVELS.includes(urgency)) {
    const error = new Error('urgency must be either URGENT or NORMAL');
    error.statusCode = 400;
    throw error;
  }
}

// Same rule the recipient registration form uses: 10 digits, local prefix.
const LOCAL_PREFIXES = [
  '070', '071', '072', '074', '075', '076', '077', '078', '079',
  '011', '021', '023', '024', '025', '026', '027', '031', '032', '033', '034',
  '035', '036', '037', '038', '041', '045', '047', '052', '054', '055', '057',
  '058', '061', '062', '063', '064', '065', '066', '067', '068', '069',
];

function normalizeContactNumber(contactNumber) {
  const digits = String(contactNumber ?? '').replace(/\D/g, '');

  if (!digits) {
    const error = new Error('contactNumber is required');
    error.statusCode = 400;
    throw error;
  }

  if (!/^\d{10}$/.test(digits) || !LOCAL_PREFIXES.includes(digits.slice(0, 3))) {
    const error = new Error('contactNumber must be a valid 10-digit local phone number');
    error.statusCode = 400;
    throw error;
  }

  return digits;
}

/**
 * A standard request is asked for a slot within the next two days, and the
 * recipient's chosen moment doubles as the expiry time. Emergency requests are
 * needed straight away, so they never carry one.
 *
 * Anything needed inside five hours belongs on the emergency track, so a
 * standard slot has to clear that lead time.
 */
function normalizePreferredAt(preferredAt) {
  if (!preferredAt) {
    const error = new Error('preferredAt is required — choose when you need the food');
    error.statusCode = 400;
    throw error;
  }

  const when = new Date(preferredAt);
  if (Number.isNaN(when.getTime())) {
    const error = new Error('preferredAt must be a valid date and time');
    error.statusCode = 400;
    throw error;
  }

  const now = Date.now();
  if (when.getTime() <= now) {
    const error = new Error('Choose a time in the future');
    error.statusCode = 400;
    throw error;
  }
  if (when.getTime() < now + MIN_LEAD_MS) {
    const error = new Error(
      'A standard request is for food needed at least 5 hours ahead — post an emergency request for anything sooner',
    );
    error.statusCode = 400;
    throw error;
  }
  if (when.getTime() > now + TWO_DAYS_MS) {
    const error = new Error('You can only ask for food within the next two days');
    error.statusCode = 400;
    throw error;
  }

  return when;
}

async function createFoodRequest({
  recipientId,
  foodType,
  quantity,
  location,
  details,
  contactNumber,
  urgency,
  preferredAt,
}) {
  if (!foodType || !quantity || !location) {
    const error = new Error('foodType, quantity and location are required');
    error.statusCode = 400;
    throw error;
  }

  validateUrgency(urgency);

  const level = urgency || 'NORMAL';
  const wantedFor = level === 'URGENT' ? null : normalizePreferredAt(preferredAt);

  const foodRequest = await FoodRequest.create({
    recipient: recipientId,
    foodType,
    quantity,
    location,
    details,
    contactNumber: normalizeContactNumber(contactNumber),
    urgency: level,
    ...(wantedFor ? { preferredAt: wantedFor, expiresAt: wantedFor } : {}),
  });

  return foodRequest;
}

// Sprint task — Emergency Food Requests: the server forces URGENT/HIGH so an
// emergency request can never be downgraded by the client, and it expires
// sooner (5h) via the model default so donors must act quickly.
async function createEmergencyFoodRequest({ recipientId, foodType, quantity, location, details, contactNumber }) {
  if (!foodType || !quantity || !location) {
    const error = new Error('foodType, quantity and location are required');
    error.statusCode = 400;
    throw error;
  }

  const foodRequest = await FoodRequest.create({
    recipient: recipientId,
    foodType,
    quantity,
    location,
    details,
    contactNumber: normalizeContactNumber(contactNumber),
    urgency: 'URGENT',
    priority: 'HIGH',
  });

  return foodRequest;
}

module.exports = { createFoodRequest, createEmergencyFoodRequest, URGENCY_LEVELS };
