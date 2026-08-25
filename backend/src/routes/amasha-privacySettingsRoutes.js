const express = require("express");
const router = express.Router();

const {
  getPrivacySettings,
  updatePrivacySettings,
} = require("../controllers/amasha-privacySettingsController");

const { requireAuth } = require("../middleware/kaveesha-authMiddleware");

router.get("/privacy/me", requireAuth, getPrivacySettings);
router.put("/privacy/me", requireAuth, updatePrivacySettings);

module.exports = router;