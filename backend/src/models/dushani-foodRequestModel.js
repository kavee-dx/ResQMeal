const mongoose = require('mongoose');

const FoodRequestSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    foodType: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    details: {
      type: String,
      trim: true,
      default: '',
    },
    // Sri Lankan phone number (10 digits) so the donor/volunteer can call the
    // recipient about the delivery.
    contactNumber: {
      type: String,
      trim: true,
      default: '',
    },
    urgency: {
      type: String,
      enum: ['URGENT', 'NORMAL'],
      default: 'NORMAL',
    },
    priority: {
      type: String,
      enum: ['HIGH', 'NORMAL'],
      default: function () {
        return this.urgency === 'URGENT' ? 'HIGH' : 'NORMAL';
      },
    },
    status: {
      type: String,
      enum: ['PENDING', 'MATCHED', 'DISPATCHED', 'FULFILLED', 'EXPIRED', 'CANCELLED'],
      default: 'PENDING',
    },
    // The donor who claimed the request. Empty while it is still open, so the
    // contact number stays private until someone commits to delivering.
    acceptedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
    // When the recipient actually wants the food, chosen in the request form.
    // A standard request stays open until this moment (see expiresAt); emergency
    // requests are needed straight away so this stays null.
    preferredAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: function () {
        // Urgent requests auto-expire after 5 hours, matching the flow chart's
        // "Post expires automatically after 5 hours (for Urgent)" note.
        const hours = this.urgency === 'URGENT' ? 5 : 24;
        return new Date(Date.now() + hours * 60 * 60 * 1000);
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FoodRequest', FoodRequestSchema);
