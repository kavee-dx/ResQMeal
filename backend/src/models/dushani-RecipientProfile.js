// backend/src/models/dushani-RecipientProfile.js
// Role-specific fields for RECIPIENT accounts.
// Individual/Family recipients rely on User.fullName.
// Organization recipients (Charity/Community Center/School/Disaster Relief/Other)
// fill in the organization fields below.
// Owner: Dushani

const mongoose = require("mongoose");
const { Schema } = mongoose;

const RECIPIENT_TYPES = [
  "INDIVIDUAL",
  "FAMILY",
  "CHARITY",
  "COMMUNITY_CENTER",
  "SCHOOL",
  "DISASTER_RELIEF_ORGANIZATION",
  "OTHER",
];

const recipientProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },

    recipientType: { type: String, enum: RECIPIENT_TYPES, required: true },
    specifiedRecipientType: { type: String, trim: true }, // required when recipientType === "OTHER"

    // --- Organization-only fields (not INDIVIDUAL / FAMILY) ---
    organizationName: { type: String, trim: true },
    organizationRegistrationNumber: { type: String, trim: true },
    authorizedPerson: { type: String, trim: true },
    position: { type: String, trim: true },
    website: { type: String, trim: true }, // optional
    description: { type: String, trim: true }, // optional

    // --- Shared by both individual and organization recipients ---
    peopleNeedingFood: { type: Number, required: true, min: 1 },
    // What food is needed, e.g. ["RICE", "VEGETABLES", "BREAD"] or free text entries
    foodRequirements: { type: [String], required: true, validate: (v) => v.length > 0 },
    // Extra conditions about that food (dietary, allergies, packaging, etc.) — optional
    specialRequirements: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("RecipientProfile", recipientProfileSchema);
module.exports.RECIPIENT_TYPES = RECIPIENT_TYPES;
