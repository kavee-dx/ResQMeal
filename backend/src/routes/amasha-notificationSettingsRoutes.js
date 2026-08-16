const express = require("express");
const router = express.Router();

const {
  getNotificationSettings,
  updateNotificationSettings,
} = require("../controllers/amasha-notificationSettingsController");

const { requireAuth } = require("../middleware/kaveesha-authMiddleware");

router.get("/notifications/me", requireAuth, getNotificationSettings);
router.put("/notifications/me", requireAuth, updateNotificationSettings);

module.exports = router;