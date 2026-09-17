const FoodRequest = require('../models/dushani-foodRequestModel');

async function createFoodRequest({ recipientId, foodType, quantity, location, details, urgency }) {
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
    urgency,
  });

  return foodRequest;
}

module.exports = { createFoodRequest };
