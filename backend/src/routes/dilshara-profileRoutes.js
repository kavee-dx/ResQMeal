const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/kaveesha-authMiddleware");
const { getProfile, updateProfile } = require("../controllers/dilshara-profileController");

router.get("/", requireAuth, getProfile);
router.patch("/", requireAuth, updateProfile);

module.exports = router;