// backend/src/models/dushani-NGOProfile.js
// Role-specific fields for NGO accounts. NGO is always organization-style.
// Owner: Dushani

const mongoose = require("mongoose");
const { Schema } = mongoose;

const NGO_TYPES = [
  "NON_PROFIT_ORGANIZATION",
  "CHARITY",
  "COMMUNITY_ORGANIZATION",
  "RELIEF_ORGANIZATION",
  "SOCIAL_SERVICE_ORGANIZATION",
  "OTHER",
];

const ngoProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },

    organizationName: { type: String, required: true, trim: true },
    ngoRegistrationNumber: { type: String, required: true, trim: true },
    organizationType: { type: String, enum: NGO_TYPES, required: true },
    specifiedOrganizationType: { type: String, trim: true }, // required when organizationType === "OTHER"
    authorizedPerson: { type: String, required: true, trim: true },
    position: { type: String, required: true, trim: true },
    website: { type: String, trim: true }, // optional
    description: { type: String, trim: true }, // optional
  },
  { timestamps: true }
);

module.exports = mongoose.model("NGOProfile", ngoProfileSchema);
module.exports.NGO_TYPES = NGO_TYPES;
