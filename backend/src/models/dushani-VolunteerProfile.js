// backend/src/models/dushani-VolunteerProfile.js
// Role-specific fields for VOLUNTEER accounts.
// Owner: Dushani

const mongoose = require("mongoose");
const { Schema } = mongoose;

const VEHICLE_TYPES = [
  "WALKING",
  "BICYCLE",
  "MOTORBIKE",
  "THREE_WHEELER",
  "CAR",
  "VAN",
  "OTHER",
];

// Vehicle types that require a vehicle number — walking/bicycle don't.
const VEHICLE_TYPES_REQUIRING_NUMBER = [
  "MOTORBIKE",
  "THREE_WHEELER",
  "CAR",
  "VAN",
  "OTHER",
];

const volunteerProfileSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    vehicleType: {
      type: String,
      enum: VEHICLE_TYPES,
      required: true,
    },

    vehicleNumber: {
      type: String,
      trim: true,
    },

    preferredDeliveryArea: {
      type: String,
      required: true,
      trim: true,
    },

    // Availability was removed from the registration form.
    // It is no longer stored as part of the volunteer profile.

    preferredDeliveryTime: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "VolunteerProfile",
  volunteerProfileSchema
);

module.exports.VEHICLE_TYPES = VEHICLE_TYPES;

module.exports.VEHICLE_TYPES_REQUIRING_NUMBER =
  VEHICLE_TYPES_REQUIRING_NUMBER;