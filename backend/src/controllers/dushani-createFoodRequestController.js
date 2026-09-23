const {
  createFoodRequest,
  createEmergencyFoodRequest,
} = require('../services/dushani-createFoodRequestService');

// requireAuth (kaveesha-authMiddleware) attaches the decoded JWT payload to
// req.user as { id, role, iat, exp } — note `id`, not `_id`.
function getRecipientId(req) {
  return req.user?.id ?? null;
}

async function createFoodRequestHandler(req, res) {
  try {
    const { foodType, quantity, location, details, contactNumber, urgency } = req.body;

    const foodRequest = await createFoodRequest({
      recipientId: getRecipientId(req),
      foodType,
      quantity,
      location,
      details,
      contactNumber,
      urgency,
    });

    return res.status(201).json(foodRequest);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ message: error.message || 'Failed to create food request' });
  }
}

// Sprint task — Emergency Food Requests: dedicated endpoint for urgent
// requests. Urgency/priority are forced server-side (URGENT/HIGH).
async function createEmergencyFoodRequestHandler(req, res) {
  try {
    const { foodType, quantity, location, details, contactNumber } = req.body;

    const foodRequest = await createEmergencyFoodRequest({
      recipientId: getRecipientId(req),
      foodType,
      quantity,
      location,
      details,
      contactNumber,
    });

    return res.status(201).json(foodRequest);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ message: error.message || 'Failed to create emergency food request' });
  }
}

module.exports = { createFoodRequestHandler, createEmergencyFoodRequestHandler };
