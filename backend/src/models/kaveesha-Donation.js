// backend/src/models/kaveesha-Donation.js
// Donation model.
// Owner: Kaveesha

const mongoose = require('mongoose');

const { Schema } = mongoose;

const DONATION_STATUS = [
  'pending',
  'active',
  'expiring',
  'completed',
  'cancelled',
  'expired',
];

const DONATION_PRIORITY = [
  'low',
  'medium',
  'high',
];

const DONATION_TYPE = [
  'NORMAL',
  'URGENT',
];

const QUANTITY_UNITS = [
  'kg',
  'g',
  'L',
  'mL',
  'items',
  'boxes',
  'trays',
  'packs',
  'other',
];

const STORAGE_CONDITIONS = [
  'Refrigerated',
  'Frozen',
  'Room Temperature',
  'Other',
];

const AI_RESULTS = [
  'PENDING',
  'GOOD',
  'REVIEW',
  'CONCERN',
];

const YES_NO = [
  'YES',
  'NO',
];

const YES_NO_UNSURE = [
  'YES',
  'NO',
  'NOT_SURE',
];

const safetySchema = new Schema(
  {
    storage: {
      type: String,
      enum: YES_NO,
      default: null,
    },

    temperature: {
      type: String,
      enum: YES_NO_UNSURE,
      default: null,
    },

    handling: {
      type: String,
      enum: YES_NO,
      default: null,
    },

    packaging: {
      type: String,
      enum: YES_NO,
      default: null,
    },

    allergens: {
      type: String,
      enum: YES_NO_UNSURE,
      default: null,
    },
  },
  {
    _id: false,
  },
);

const donationSchema = new Schema(
  {
    donor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    donationType: {
      type: String,
      enum: DONATION_TYPE,
      default: 'NORMAL',
    },

    foodType: {
      type: String,
      required: [
        true,
        'Food type is required',
      ],
      trim: true,
      maxlength: 120,
    },

    foodCategory: {
      type: String,
      trim: true,
      default: 'Uncategorized',
      maxlength: 100,
    },

    quantity: {
      type: Number,
      required: [
        true,
        'Quantity is required',
      ],
      min: [
        0.01,
        'Quantity must be a positive number',
      ],
    },

    quantityUnit: {
      type: String,
      enum: QUANTITY_UNITS,
      default: 'kg',
    },

    numberOfPortions: {
      type: Number,
      required: [
        true,
        'Number of portions is required',
      ],
      min: [
        1,
        'Number of portions must be a positive number',
      ],
    },

    preparationTime: {
      type: Date,
      required: [
        true,
        'Preparation time is required',
      ],
    },

    expiryTime: {
      type: Date,
      required: [
        true,
        'Expiry time is required',
      ],
      validate: {
        validator: function (value) {
          return (
            !this.preparationTime ||
            value > this.preparationTime
          );
        },
        message:
          'Expiry time must be after preparation time',
      },
    },

    availabilityStart: {
      type: Date,
      required: true,
      default: Date.now,
    },

    availabilityEnd: {
      type: Date,
      required: true,
      validate: {
        validator: function (value) {
          return (
            !this.availabilityStart ||
            value > this.availabilityStart
          );
        },
        message:
          'Availability end must be after availability start',
      },
    },

    storageCondition: {
      type: String,
      enum: STORAGE_CONDITIONS,
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

    additionalDetails: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },

    photoUrl: {
      type: String,
      default: null,
    },

    pickupAddress: {
      type: String,
      trim: true,
      maxlength: 300,
      default: '',
    },

    pickupDistrict: {
      type: String,
      trim: true,
      maxlength: 100,
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

    aiResult: {
      type: String,
      enum: AI_RESULTS,
      default: 'PENDING',
    },

    aiReason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },

    safety: {
      type: safetySchema,
      default: () => ({}),
    },

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
      sparse: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model(
  'Donation',
  donationSchema,
);