const express = require("express");
const router = express.Router();

const { getAvailability, updateAvailability } = require("../controllers/dilshara-volunteerAvailability.controller");
const { requireAuth } = require("../middleware/kaveesha-authMiddleware");

router.get("/availability", requireAuth, getAvailability);
router.patch("/availability", requireAuth, updateAvailability);

module.exports = router;