const { createFoodRequest } = require('../services/dushani-createFoodRequestService');

async function createFoodRequestHandler(req, res) {
  try {
    const { foodType, quantity, location, details, urgency } = req.body;

    const foodRequest = await createFoodRequest({
      recipientId: req.user?._id, // assumes Sprint 1 auth middleware attaches req.user
      foodType,
      quantity,
      location,
      details,
      urgency,
    });

    return res.status(201).json(foodRequest);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ message: error.message || 'Failed to create food request' });
  }
}

module.exports = { createFoodRequestHandler };
