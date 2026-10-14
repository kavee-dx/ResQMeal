// Matching-related delivery preferences for VOLUNTEER accounts:
// maximum delivery distance + the volunteer's base location.
// Preferred area/time stay on VolunteerProfile (Owner: Dushani) — not duplicated here.
// Owner: Dilshara

const mongoose = require("mongoose");

const { Schema } = mongoose;

const MAX_DELIVERY_DISTANCE_KM = 100;
const MIN_DELIVERY_DISTANCE_KM = 0.1;
const DEFAULT_MAX_DELIVERY_DISTANCE_KM = 10;

const volunteerDeliveryPreferencesSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    maxDeliveryDistance: {
      type: Number,
      min: [
        MIN_DELIVERY_DISTANCE_KM,
        `Maximum delivery distance must be at least ${MIN_DELIVERY_DISTANCE_KM} km.`,
      ],
      max: [MAX_DELIVERY_DISTANCE_KM, `Maximum delivery distance cannot exceed ${MAX_DELIVERY_DISTANCE_KM} km.`],
      default: DEFAULT_MAX_DELIVERY_DISTANCE_KM,
      set: (value) => {
        const numeric = Number(value);
        if (!Number.isFinite(numeric) || numeric <= 0) {
          return DEFAULT_MAX_DELIVERY_DISTANCE_KM;
        }
        return Math.min(numeric, MAX_DELIVERY_DISTANCE_KM);
      },
    },

    // Base location used ONLY for matching. Live GPS during a delivery
    // is a separate concept and must never be stored here.
    location: {
      latitude: { type: Number, min: -90, max: 90, default: null },
      longitude: { type: Number, min: -180, max: 180, default: null },
      updatedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("VolunteerDeliveryPreferences", volunteerDeliveryPreferencesSchema);

module.exports.MAX_DELIVERY_DISTANCE_KM = MAX_DELIVERY_DISTANCE_KM;
module.exports.MIN_DELIVERY_DISTANCE_KM = MIN_DELIVERY_DISTANCE_KM;
module.exports.DEFAULT_MAX_DELIVERY_DISTANCE_KM = DEFAULT_MAX_DELIVERY_DISTANCE_KM;