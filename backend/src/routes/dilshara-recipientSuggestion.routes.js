// backend/src/routes/dilshara-recipientSuggestion.routes.js
// Owner: Dilshara

const express = require("express");
const { requireAuth } = require("../middleware/kaveesha-authMiddleware");
const { getSuggestions } = require("../controllers/dilshara-recipientSuggestion.controller");

const router = express.Router();

// GET /api/recipient-suggestions?donationId=...&criteria=smart|location|urgency|food|quantity|people
router.get("/", requireAuth, getSuggestions);

module.exports = router;