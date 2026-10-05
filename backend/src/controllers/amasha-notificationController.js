const Notification = require("../models/amasha-Notification");

// GET /api/notifications?limit=20&before=<ISO date>&unread=true&category=REQUEST,DELIVERY&targetId=<id>
exports.list = async (req, res) => {
  try {
    const { limit = 20, before, unread, category, targetId } = req.query;
    const q = { userId: req.user._id };

    if (before) q.createdAt = { $lt: new Date(before) };
    if (unread === "true") q.readAt = null;
    if (category) q.category = { $in: String(category).split(",") };
    if (targetId) q["target.id"] = String(targetId);

    const items = await Notification.find(q)
      .sort({ createdAt: -1 })
      .limit(Math.min(parseInt(limit, 10) || 20, 50))
      .lean();

    res.json({ items });
  } catch (err) {
    console.error("list notifications failed:", err);
    res.status(500).json({ message: "Failed to load notifications" });
  }
};

// GET /api/notifications/unread-count
exports.unreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      userId: req.user._id,
      readAt: null,
    });
    res.json({ count });
  } catch (err) {
    console.error("unread count failed:", err);
    res.status(500).json({ message: "Failed to load unread count" });
  }
};

// PATCH /api/notifications/:id/read
exports.markRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id, readAt: null },
      { readAt: new Date() },
      { new: true }
    );
    res.json({ notification });
  } catch (err) {
    console.error("mark read failed:", err);
    res.status(500).json({ message: "Failed to update notification" });
  }
};

// PATCH /api/notifications/read-all
exports.markAllRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { userId: req.user._id, readAt: null },
      { readAt: new Date() }
    );
    res.json({ updated: result.modifiedCount });
  } catch (err) {
    console.error("mark all read failed:", err);
    res.status(500).json({ message: "Failed to update notifications" });
  }
};