// volunteerProfile.model.js
const mongoose = require('mongoose');

const AVAILABLE_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const TIME_FORMAT_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/; // HH:mm, 24-hour

const volunteerProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },

  // --- existing fields ---
  vehicleType: { type: String },
  vehicleNumber: { type: String },
  preferredDeliveryArea: { type: String },
  preferredDeliveryTime: { type: String },

  // --- RESQ-132: Volunteer Availability ---
  availabilityStatus: {
    type: String,
    enum: ['AVAILABLE', 'UNAVAILABLE'],
    default: 'UNAVAILABLE',
  },
  availableDays: {
    type: [String],
    enum: AVAILABLE_DAYS,
    default: [],
  },
  availableFrom: {
    type: String,
    validate: {
      validator: (v) => !v || TIME_FORMAT_REGEX.test(v),
      message: (props) => `${props.value} is not a valid HH:mm time.`,
    },
    default: '16:00',
  },
  availableTo: {
    type: String,
    validate: {
      validator: (v) => !v || TIME_FORMAT_REGEX.test(v),
      message: (props) => `${props.value} is not a valid HH:mm time.`,
    },
    default: '22:00',
  },

  // --- system-controlled, not written by the Availability API ---
  currentDeliveryStatus: {
    type: String,
    enum: ['IDLE', 'DELIVERY_ASSIGNED', 'PICKING_UP', 'IN_TRANSIT'],
    default: 'IDLE',
  },
  currentDeliveryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Delivery',
    default: null,
  },
}, { timestamps: true });

// Speeds up the matching system's core query: find volunteers who are
// both manually available AND not already mid-delivery.
volunteerProfileSchema.index({ availabilityStatus: 1, currentDeliveryStatus: 1 });

module.exports = mongoose.model('VolunteerProfile', volunteerProfileSchema);