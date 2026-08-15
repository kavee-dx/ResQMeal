// backend/src/models/dushani-DonorProfile.js
// Role-specific fields for DONOR accounts.
// Individual donors only set donorType = "INDIVIDUAL" and rely on User.fullName.
// Business donors (Hotel/Restaurant/Bakery/Supermarket/Catering/Event Organizer/Other)
// fill in the business fields below.
// Owner: Dushani

const mongoose = require("mongoose");
const { Schema } = mongoose;

const DONOR_TYPES = [
  "INDIVIDUAL",
  "HOTEL",
  "RESTAURANT",
  "BAKERY",
  "SUPERMARKET",
  "CATERING",
  "EVENT_ORGANIZER",
  "OTHER",
];

const donorProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },

    donorType: { type: String, enum: DONOR_TYPES, required: true },
    specifiedDonorType: { type: String, trim: true }, // required when donorType === "OTHER"

    // --- Business-only fields (donorType !== "INDIVIDUAL") ---
    businessName: { type: String, trim: true },
    businessType: { type: String, trim: true }, // auto-filled from donorType, or specifiedDonorType if OTHER
    authorizedPerson: { type: String, trim: true },
    position: { type: String, trim: true },
    businessRegistrationNumber: { type: String, trim: true },
    businessContactNumber: { type: String, trim: true },
    businessEmail: { type: String, trim: true, lowercase: true }, // optional
    website: { type: String, trim: true }, // optional
    description: { type: String, trim: true }, // optional
  },
  { timestamps: true }
);

module.exports = mongoose.model("DonorProfile", donorProfileSchema);
module.exports.DONOR_TYPES = DONOR_TYPES;
