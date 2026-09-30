// backend/src/models/kaveesha-Donation.js
// Donation model.
// Owner: Kaveesha

const mongoose = require('mongoose');

const { Schema } = mongoose;

const DONATION_STATUS = [
  'pending',
  'active',
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

/*
 * Safety assessment
 *
 * These values represent what the donor reported
 * during the safety checklist.
 *
 * The safety assessment is intentionally stored as
 * a separate subdocument so it can be treated as a
 * completed assessment after the donation is posted.
 */
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
    /*
     * Donor who created the donation.
     */
    donor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    /*
     * Donation priority/type.
     */
    donationType: {
      type: String,
      enum: DONATION_TYPE,
      default: 'NORMAL',
    },

    /*
     * Food information.
     */
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
      validate: {
        validator: Number.isInteger,
        message: 'Number of portions must be a whole number',
      },
    },

    /*
     * Food timing.
     *
     * These represent when the food was prepared
     * and when it expires.
     */
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

    /*
     * Donation availability.
     *
     * These fields represent the period during which
     * the donation is available for rescue/claiming.
     */
    availabilityStart: {
      type: Date,
      required: [
        true,
        'Availability start is required',
      ],
    },

    availabilityEnd: {
      type: Date,
      required: [
        true,
        'Availability end is required',
      ],
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

    /*
     * Storage information.
     */
    storageCondition: {
      type: String,
      enum: STORAGE_CONDITIONS,
      default: 'Room Temperature',
    },

    /*
     * Food safety information displayed on the
     * donation and detail pages.
     */
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

    /*
     * Optional donor notes.
     */
    additionalDetails: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },

    /*
     * Cloudinary image URL.
     */
    photoUrl: {
      type: String,
      trim: true,
      default: null,
    },

    /*
     * Pickup location.
     */
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

    /*
     * Actual pickup time window.
     *
     * This is intentionally separate from the food's
     * preparation/expiry timing.
     */
    pickupWindowStart: {
      type: Date,
      default: null,
    },

    pickupWindowEnd: {
      type: Date,
      default: null,
      validate: {
        validator: function (value) {
          if (!value || !this.pickupWindowStart) {
            return true;
          }

          return value > this.pickupWindowStart;
        },
        message:
          'Pickup window end must be after pickup window start',
      },
    },

    /*
     * AI visual screening.
     *
     * AI is decision support only. It does not represent
     * a guaranteed food-safety determination.
     */
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

    /*
     * Donor safety checklist result.
     *
     * This is recorded when the donation is created.
     * The update route should not allow these values to
     * be changed after posting.
     */
    safety: {
      type: safetySchema,
      default: () => ({}),
    },

    /*
     * Donation lifecycle status.
     *
     * Expiring soon is a UI condition based on the
     * remaining availability time. It is NOT a database
     * lifecycle status.
     */
    status: {
      type: String,
      enum: DONATION_STATUS,
      default: 'pending',
      index: true,
    },

    /*
     * Calculated donation priority.
     */
    priority: {
      type: String,
      enum: DONATION_PRIORITY,
      default: 'medium',
    },

    /*
     * Human-readable donation reference.
     *
     * Example:
     * RM-2026-123456
     */
    donationCode: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

/*
 * Useful indexes for donor donation queries.
 *
 * My Donations frequently searches by:
 * donor + status + newest first.
 */
donationSchema.index({
  donor: 1,
  status: 1,
  createdAt: -1,
});

/*
 * Index for expiry/availability processing.
 */
donationSchema.index({
  availabilityEnd: 1,
  status: 1,
});

module.exports = mongoose.model(
  'Donation',
  donationSchema,
);