const Notification = require("../models/amasha-Notification");

exports.list = async (req, res) => {
  const { limit = 20, before, unread } = req.query;
  const q = { userId: req.user._id };
  if (before) q.createdAt = { $lt: new Date(before) };
  if (unread === "true") q.readAt = null;

  const items = await Notification.find(q)
    .sort({ createdAt: -1 })
    .limit(Math.min(+limit, 50))
    .lean();
  res.json({ items });
};

exports.unreadCount = async (req, res) => {
  const count = await Notification.countDocuments({ userId: req.user._id, readAt: null });
  res.json({ count });
};

exports.markRead = async (req, res) => {
  const n = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id, readAt: null },
    { readAt: new Date() },
    { new: true }
  );
  res.json({ notification: n });
};

exports.markAllRead = async (req, res) => {
  const r = await Notification.updateMany(
    { userId: req.user._id, readAt: null },
    { readAt: new Date() }
  );
  res.json({ updated: r.modifiedCount });
};