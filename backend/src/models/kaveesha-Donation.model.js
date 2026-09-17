const mongoose = require('mongoose');
const { Schema } = mongoose;

const DONATION_STATUS = ['pending', 'active', 'expiring', 'completed', 'cancelled'];
const DONATION_PRIORITY = ['low', 'medium', 'high'];

const donationSchema = new Schema(
  {
    // Reference to the donor who created this donation
    donor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // --- Food information ---
    foodType: {
      type: String,
      required: [true, 'Food type is required'],
      trim: true,
      maxlength: 120,
    },
    foodCategory: {
      type: String,
      trim: true,
      default: 'Uncategorized',
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be a positive number'],
    },
    numberOfPortions: {
      type: Number,
      required: [true, 'Number of portions is required'],
      min: [1, 'Number of portions must be a positive number'],
    },

    // --- Timing ---
    preparationTime: {
      type: Date,
      required: [true, 'Preparation time is required'],
    },
    expiryTime: {
      type: Date,
      required: [true, 'Expiry time is required'],
      validate: {
        validator: function (value) {
          // expiry must be after preparation time
          return !this.preparationTime || value > this.preparationTime;
        },
        message: 'Expiry time must be after preparation time',
      },
    },

    // --- Food safety ---
    storageCondition: {
      type: String,
      enum: ['Refrigerated', 'Frozen', 'Room Temperature', 'Other'],
      default: 'Room Temperature',
    },
    allergenInfo: {
      type: String,
      trim: true,
      maxlength: 300,
      default: '',
    },
    packagingCondition: {
      type: String,
      trim: true,
      maxlength: 200,
      default: '',
    },

    // --- Media ---
    photoUrl: {
      type: String,
      default: null,
    },

    // --- Pickup information ---
    pickupAddress: {
      type: String,
      trim: true,
      default: '',
    },
    pickupDistrict: {
      type: String,
      trim: true,
      default: '',
    },
    pickupWindowStart: {
      type: Date,
      default: null,
    },
    pickupWindowEnd: {
      type: Date,
      default: null,
    },

    // --- System-managed fields ---
    status: {
      type: String,
      enum: DONATION_STATUS,
      default: 'pending',
      index: true,
    },
    priority: {
      type: String,
      enum: DONATION_PRIORITY,
      default: 'medium',
    },
    donationCode: {
      type: String,
      unique: true,
      sparse: true, // generated after creation, so allow null until set
    },
  },
  {
    timestamps: true, // adds createdAt, updatedAt
  }
);

// Helpful compound index for "My Donations" filtered queries
donationSchema.index({ donor: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Donation', donationSchema);
module.exports.DONATION_STATUS = DONATION_STATUS;
module.exports.DONATION_PRIORITY = DONATION_PRIORITY;