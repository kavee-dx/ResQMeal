const mongoose = require("mongoose");
const { Schema } = mongoose;

const privacySettingsSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, 
      index: true,
    },
    profileVisible: {
      type: Boolean,
      default: true,
    },
    showLocation: {
      type: Boolean,
      default: true,
    },
    showDonationHistory: {
      type: Boolean,
      default: false,
    },
    showContactInfo: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PrivacySettings", privacySettingsSchema);