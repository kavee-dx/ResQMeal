const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/kaveesha-authMiddleware');
const {
  createFoodRequestHandler,
  createEmergencyFoodRequestHandler,
} = require('../controllers/dushani-createFoodRequestController');
const { getMyRequestsHandler } = require('../controllers/dushani-requestStatusController');
const { getRequestProgressHandler } = require('../controllers/dushani-requestProgressController');
const { deleteFoodRequestHandler } = require('../controllers/dushani-deleteFoodRequestController');
const { updateFoodRequestStatusHandler } = require('../controllers/dushani-updateRequestStatusController');
const {
  getRequestMatchesHandler,
  getRecipientSuggestionsHandler,
} = require('../controllers/dushani-matchRequestController');
const {
  getOpenRequestsHandler,
  acceptFoodRequestHandler,
} = require('../controllers/dushani-requestBoardController');

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

// GET /api/recipient/food-requests/open
// Sprint item 4 — the request board: every logged-in role can see what
// recipients still need. Contact details are withheld until a donor commits.
router.get('/open', getOpenRequestsHandler);

// GET /api/recipient/food-requests/matches
// Sprint item 4 — Donation–Request Matching: every request the caller still has
// waiting, ranked against the live donations by food type, quantity, proximity
// and urgency. An emergency request's suggestions come out on top.
router.get('/matches', getRecipientSuggestionsHandler);

// POST /api/recipient/food-requests/:id/accept
// Only a donor can claim a request; the recipient's progress then reads
// "Accepted by a donor".
router.post('/:id/accept', acceptFoodRequestHandler);

// PATCH /api/recipient/food-requests/:id/status
// Sprint item 4 — the rest of the track: the claiming donor or a volunteer
// marks the delivery on the way, and donor, volunteer or recipient marks it
// delivered. Forward-only.
router.patch('/:id/status', updateFoodRequestStatusHandler);

// GET /api/recipient/food-requests/:id/matches
// One of the caller's own requests with the donations scored against it.
router.get('/:id/matches', getRequestMatchesHandler);

// GET /api/recipient/food-requests/:id/progress
// Sprint task — Food Request Progress Tracking: one request plus its stage
// timeline, scoped to the logged-in recipient.
router.get('/:id/progress', getRequestProgressHandler);

// DELETE /api/recipient/food-requests/:id
// Sprint task — Food Request Progress Tracking: a recipient can withdraw a
// request only while it is still waiting for a donor.
router.delete('/:id', deleteFoodRequestHandler);

module.exports = router;
