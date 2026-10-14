// Represents one delivery job: links a Donation (and its FoodRequest) to the


const mongoose = require("mongoose");
const { Schema } = mongoose;
const { ACTIVE_ASSIGNMENT_STATUSES } = require("../config/dilshara-matching.config");

const ASSIGNMENT_STATUS = [
  "ASSIGNED",     // system created it, volunteer hasn't acted yet
  "ACCEPTED",     // volunteer accepted the job
  "PICKING_UP",   // volunteer is at/heading to the donor
  "IN_TRANSIT",   // food collected, heading to recipient
  "DELIVERED",    // completed
  "CANCELLED",    // declined / cancelled
];

const CANCELLED_BY = ["VOLUNTEER", "SYSTEM"];
const LOCATION_PRECISION = ["EXACT", "APPROXIMATE"];

// One factor of the match: its 0-100 score and its weighted points.
const factorSchema = new Schema(
  {
    score: { type: Number, min: 0, max: 100 },
    points: { type: Number, min: 0, max: 100 },
  },
  { _id: false }
);

const assignmentSchema = new Schema(
  {
    donationId: { type: Schema.Types.ObjectId, ref: "Donation", required: true, index: true },
    volunteerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    // The FoodRequest this delivery fulfils (null for old test assignments).
    requestId: { type: Schema.Types.ObjectId, ref: "FoodRequest", default: null, index: true },

    status: { type: String, enum: ASSIGNMENT_STATUS, default: "ASSIGNED", index: true },

    // true while status is ASSIGNED / ACCEPTED / PICKING_UP / IN_TRANSIT.
    // The unique indexes below only cover active rows.
    isActive: { type: Boolean, default: true },

    // Why the matching engine chose this volunteer (a record at selection time).
    matchScore: { type: Number, min: 0, max: 100, default: null },
    matchBreakdown: {
      distance: { type: factorSchema, default: undefined },
      area: { type: factorSchema, default: undefined },
      time: { type: factorSchema, default: undefined },
      urgency: { type: factorSchema, default: undefined },
    },
    matchReasons: { type: [String], default: [] },
    routeDistanceKm: { type: Number, min: 0, default: null },
    locationPrecision: { type: String, enum: LOCATION_PRECISION, default: null },

    // Who cancelled it. A VOLUNTEER cancel excludes that volunteer from the next
    // match for this donation; a SYSTEM cancel (e.g. recipient cancelled) does not.
    cancelledBy: { type: String, enum: CANCELLED_BY, default: null },

    // Timestamps for each transition.
    assignedAt: { type: Date, default: Date.now },
    acceptedAt: { type: Date, default: null },
    pickedUpAt: { type: Date, default: null },
    inTransitAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Keep isActive in step with status whenever a document is saved.
// (Mongoose 9 removed next-callback middleware; a synchronous hook is enough.)
assignmentSchema.pre("save", function () {
  this.isActive = ACTIVE_ASSIGNMENT_STATUSES.includes(this.status);
});

// Speeds up "find my assignments by status". It does NOT enforce anything.
assignmentSchema.index({ volunteerId: 1, status: 1 });

// ENFORCED by the database: at most one active assignment per volunteer, and at
// most one active assignment per donation. Two simultaneous matches cannot both
// succeed; the loser gets a duplicate-key error.
assignmentSchema.index(
  { volunteerId: 1, isActive: 1 },
  {
    unique: true,
    partialFilterExpression: { isActive: true },
    name: "one_active_assignment_per_volunteer",
  }
);
assignmentSchema.index(
  { donationId: 1, isActive: 1 },
  {
    unique: true,
    partialFilterExpression: { isActive: true },
    name: "one_active_assignment_per_donation",
  }
);

module.exports = mongoose.model("Assignment", assignmentSchema);
module.exports.ASSIGNMENT_STATUS = ASSIGNMENT_STATUS;