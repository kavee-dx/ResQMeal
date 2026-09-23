const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/kaveesha-authMiddleware');
const {
  createFoodRequestHandler,
  createEmergencyFoodRequestHandler,
} = require('../controllers/dushani-createFoodRequestController');
const { getMyRequestsHandler } = require('../controllers/dushani-requestStatusController');

// All recipient food-request endpoints require a logged-in user; requireAuth
// attaches the decoded JWT payload ({ id, role }) to req.user.
router.use(requireAuth);

// POST /api/recipient/food-requests
router.post('/', createFoodRequestHandler);

// POST /api/recipient/food-requests/emergency
// Sprint task — Emergency Food Requests: urgency is forced to URGENT and
// priority to HIGH on the server, and the request expires in 5 hours.
router.post('/emergency', createEmergencyFoodRequestHandler);

// GET /api/recipient/food-requests/mine
router.get('/mine', getMyRequestsHandler);

module.exports = router;
