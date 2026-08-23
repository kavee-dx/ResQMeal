// Availability settings for VOLUNTEER accounts.
// Owner: Dilshara

const mongoose = require("mongoose");
const { Schema } = mongoose;

const AVAILABLE_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

const TIME_FORMAT_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

const volunteerAvailabilitySchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    availabilityStatus: {
      type: String,
      enum: ["AVAILABLE", "UNAVAILABLE"],
      default: "UNAVAILABLE",
    },

    availableDays: {
      type: [String],
      enum: AVAILABLE_DAYS,
      default: [],
    },

    availableFrom: {
      type: String,
      default: "16:00",
      validate: {
        validator: (v) => !v || TIME_FORMAT_REGEX.test(v),
        message: (props) => `${props.value} is not a valid HH:mm time.`,
      },
    },

    availableTo: {
      type: String,
      default: "22:00",
      validate: {
        validator: (v) => !v || TIME_FORMAT_REGEX.test(v),
        message: (props) => `${props.value} is not a valid HH:mm time.`,
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("VolunteerAvailability", volunteerAvailabilitySchema);
module.exports.AVAILABLE_DAYS = AVAILABLE_DAYS;