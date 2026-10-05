// backend/src/models/kaveesha-ExpiryAlert.js
// Stores automatic rescue-window expiry alerts.
// Owner: Kaveesha

const mongoose = require("mongoose");

const { Schema } = mongoose;

const ALERT_TYPES = [
  "EXPIRING_6_HOURS",
  "EXPIRING_2_HOURS",
  "EXPIRING_30_MINUTES",
];

const expiryAlertSchema = new Schema(
  {
    /*
     * Donation that triggered this alert.
     */
    donation: {
      type: Schema.Types.ObjectId,
      ref: "Donation",
      required: true,
      index: true,
    },

    /*
     * Donor who should receive the alert.
     */
    donor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    /*
     * Which expiry threshold triggered the alert.
     */
    type: {
      type: String,
      enum: ALERT_TYPES,
      required: true,
    },

    /*
     * Notification title.
     */
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    /*
     * Notification message.
     */
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    /*
     * Whether the donor has viewed the alert.
     */
    read: {
      type: Boolean,
      default: false,
      index: true,
    },

    /*
     * Whether the push notification has been successfully
     * submitted to Expo Push Service.
     */
    pushNotificationSent: {
      type: Boolean,
      default: false,
    },

    /*
     * When the alert was generated.
     */
    triggeredAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

/*
 * IMPORTANT:
 *
 * A particular donation can have only ONE alert
 * for each threshold.
 *
 * Example:
 *
 * Donation A + EXPIRING_6_HOURS
 *
 * can exist only once.
 *
 * This protects against duplicate alerts when the
 * cron job runs every minute.
 */
expiryAlertSchema.index(
  {
    donation: 1,
    type: 1,
  },
  {
    unique: true,
  },
);

/*
 * Fast lookup for a donor's unread notifications.
 */
expiryAlertSchema.index({
  donor: 1,
  read: 1,
  createdAt: -1,
});

module.exports = mongoose.model(
  "ExpiryAlert",
  expiryAlertSchema,
);

module.exports.ALERT_TYPES = ALERT_TYPES;