const mongoose = require('mongoose');

// Sprint item 39 — a recipient reads the live donation pool and asks the donor
// of a specific donation for it. This document is that ask: it is the only
// place the recipient→donation link is written, so the donor's own donation is
// never touched. The donor sees it on the donation's detail page and can then
// accept the recipient's request with the flow that already exists.
const DonationRequestSchema = new mongoose.Schema(
  {
    donation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Donation',
      required: true,
      index: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Which of the recipient's own open requests this ask is about, so the
    // donor can read the need behind it. Optional — a recipient can ask for a
    // donation that does not exactly match one of their requests.
    request: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodRequest',
      default: null,
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

// One recipient asks once per donation; asking again edits the same note
// instead of stacking duplicates in front of the donor.
DonationRequestSchema.index({ donation: 1, recipient: 1 }, { unique: true });
DonationRequestSchema.index({ donation: 1, createdAt: -1 });

module.exports = mongoose.model('DonationRequest', DonationRequestSchema);
