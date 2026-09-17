// backend/src/routes/kaveesha-voiceAssistantRoutes.js
// Owner: Kaveesha

const express = require("express");
const router = express.Router();

const {
  transcribeAnswer,
} = require("../controllers/kaveesha-voiceAssistantController");

router.post("/transcribe", transcribeAnswer);

module.exports = router;