const FoodRequest = require('../models/dushani-foodRequestModel');

const URGENCY_LEVELS = ['URGENT', 'NORMAL'];

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

async function createFoodRequest({ recipientId, foodType, quantity, location, details, contactNumber, urgency }) {
  if (!foodType || !quantity || !location) {
    const error = new Error('foodType, quantity and location are required');
    error.statusCode = 400;
    throw error;
  }

  validateUrgency(urgency);

  const foodRequest = await FoodRequest.create({
    recipient: recipientId,
    foodType,
    quantity,
    location,
    details,
    contactNumber: normalizeContactNumber(contactNumber),
    urgency: urgency || 'NORMAL',
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
