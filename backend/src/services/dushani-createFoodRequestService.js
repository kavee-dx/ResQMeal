const FoodRequest = require('../models/dushani-foodRequestModel');

const URGENCY_LEVELS = ['URGENT', 'NORMAL'];

function validateUrgency(urgency) {
  if (urgency !== undefined && !URGENCY_LEVELS.includes(urgency)) {
    const error = new Error('urgency must be either URGENT or NORMAL');
    error.statusCode = 400;
    throw error;
  }
}

async function createFoodRequest({ recipientId, foodType, quantity, location, details, urgency }) {
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
    urgency: urgency || 'NORMAL',
  });

  return foodRequest;
}

// Sprint task — Emergency Food Requests: the server forces URGENT/HIGH so an
// emergency request can never be downgraded by the client, and it expires
// sooner (5h) via the model default so donors must act quickly.
async function createEmergencyFoodRequest({ recipientId, foodType, quantity, location, details }) {
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
    urgency: 'URGENT',
    priority: 'HIGH',
  });

  return foodRequest;
}

module.exports = { createFoodRequest, createEmergencyFoodRequest, URGENCY_LEVELS };
