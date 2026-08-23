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
      enum: ['PENDING', 'MATCHED', 'FULFILLED', 'EXPIRED', 'CANCELLED'],
      default: 'PENDING',
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
