const mongoose = require("mongoose");
const { Schema } = mongoose;
const {
  CATEGORIES,
  PRIORITIES,
  NOTIFICATION_TYPES,
} = require("../constants/amasha-notificationEvents");

const notificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },

    type: { type: String, enum: Object.keys(NOTIFICATION_TYPES), required: true },
    category: { type: String, enum: Object.values(CATEGORIES), required: true },
    priority: { type: String, enum: PRIORITIES, default: "normal" },

    title: { type: String, required: true, trim: true },
    body: { type: String, default: "", trim: true },

    // What tapping the notification opens, e.g. { type: "request", id: "..." }
    target: {
      type: { type: String },
      id: { type: String },
    },

    // Raw values the message was built from (ids, food type, dates)
    data: { type: Schema.Types.Mixed, default: {} },

    readAt: { type: Date, default: null },

    // Stops the same event being created twice for the same user
    dedupeKey: { type: String },
  },
  { timestamps: true }
);

// Notification list, newest first, and the unread badge count
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, readAt: 1 });

// One notification per user per dedupeKey (only when a key is set)
notificationSchema.index(
  { userId: 1, dedupeKey: 1 },
  { unique: true, partialFilterExpression: { dedupeKey: { $type: "string" } } }
);

// Auto-delete notifications after 90 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

module.exports = mongoose.model("Notification", notificationSchema);