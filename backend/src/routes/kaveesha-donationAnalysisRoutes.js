// backend/src/routes/kaveesha-donationAnalysisRoutes.js
// Owner: Kaveesha

const express = require("express");
const router = express.Router();

const {
  analyzePhoto,
} = require("../controllers/kaveesha-donationAnalysisController");

router.post("/analyze-photo", analyzePhoto);

module.exports = router;