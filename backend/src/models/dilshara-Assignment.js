// Represents one delivery job: links a Donation to the Volunteer
// carrying it, and tracks its status through the delivery lifecycle.
// Owner: Dilshara

const mongoose = require("mongoose");
const { Schema } = mongoose;

const ASSIGNMENT_STATUS = [
  "ASSIGNED",     // system created it, volunteer hasn't acted yet
  "ACCEPTED",     // volunteer accepted the job
  "PICKING_UP",   // volunteer is at/heading to the donor
  "IN_TRANSIT",   // food collected, heading to recipient
  "DELIVERED",    // completed
  "CANCELLED",    // volunteer or system cancelled it
];

const assignmentSchema = new Schema(
  {
    donationId: {
      type: Schema.Types.ObjectId,
      ref: "Donation",
      required: true,
      index: true,
    },

    volunteerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ASSIGNMENT_STATUS,
      default: "ASSIGNED",
      index: true,
    },

    // Timestamps for each transition — useful for "Hours Contributed"
    // stats later, and for the donor/recipient progress view (RESQ-203).
    assignedAt: { type: Date, default: Date.now },
    acceptedAt: { type: Date, default: null },
    pickedUpAt: { type: Date, default: null },
    inTransitAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// A volunteer only ever has one active job at a time — this index
// makes "find my current assignment" fast.
assignmentSchema.index({ volunteerId: 1, status: 1 });

module.exports = mongoose.model("Assignment", assignmentSchema);
module.exports.ASSIGNMENT_STATUS = ASSIGNMENT_STATUS;