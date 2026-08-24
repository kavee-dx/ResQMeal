const mongoose = require("mongoose");
const { Schema } = mongoose;

const notificationSettingsSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    nearbyFoodAlerts: {
      type: Boolean,
      default: true,
    },
    requestUpdates: {
      type: Boolean,
      default: true,
    },
    deliveryUpdates: {
      type: Boolean,
      default: true,
    },
    expiryReminders: {
      type: Boolean,
      default: true,
    },
    emailNotifications: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("NotificationSettings", notificationSettingsSchema);