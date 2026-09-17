const FoodRequest = require('../models/dushani-foodRequestModel');

async function getRequestsByRecipient(recipientId) {
  return FoodRequest.find({ recipient: recipientId }).sort({ createdAt: -1 });
}

module.exports = { getRequestsByRecipient };
