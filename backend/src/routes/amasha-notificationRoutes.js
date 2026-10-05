const router = require("express").Router();

const { requireAuth } = require("../middleware/kaveesha-authMiddleware");

const ctrl = require("../controllers/amasha-notificationController");

router.get("/", requireAuth, ctrl.list);

router.get("/unread-count", requireAuth, ctrl.unreadCount);

router.patch("/read-all", requireAuth, ctrl.markAllRead);

router.patch("/:id/read", requireAuth, ctrl.markRead);

module.exports = router;