const express = require('express');
const router = express.Router();
const { createFoodRequestHandler } = require('../controllers/dushani-createFoodRequestController');
const { getMyRequestsHandler } = require('../controllers/dushani-requestStatusController');

/**
 * NOTE: A dedicated API wasn't one of the 6 listed Recipient Management
 * tasks (08–13) — the backlog only lists a data model for Story 04, not an
 * API task. This route file is included so the request/status screens have
 * a real endpoint to call; confirm with your PO whether it's in scope.
 */

// POST /api/recipient/food-requests
router.post('/', createFoodRequestHandler);

// GET /api/recipient/food-requests/mine
router.get('/mine', getMyRequestsHandler);

module.exports = router;
