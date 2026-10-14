const express = require("express");
const router = express.Router();

const { requireAuth } = require("../middleware/kaveesha-authMiddleware");
const {
  getMessages,
  sendMessage,
  listConversations,
} = require("../controllers/amasha-chatController");

// In-app chat history + sending. Realtime delivery runs on Socket.IO
// (amasha-chatSocket.js); these routes are the persisted source of truth.

// The signed-in user's chat list. Registered before the parameterised routes
// so it is never mistaken for a contextType value.
router.get("/conversations", requireAuth, listConversations);

router.get(
  "/:contextType/:contextId/messages",
  requireAuth,
  getMessages
);

router.post(
  "/:contextType/:contextId/messages",
  requireAuth,
  sendMessage
);

module.exports = router;
