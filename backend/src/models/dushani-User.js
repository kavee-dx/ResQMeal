// backend/src/models/dushani-User.js
// Common account fields shared by every role.
// Role-specific fields live in the profile models below (DonorProfile,
// RecipientProfile, NGOProfile, VolunteerProfile).
// Owner: Dushani

const mongoose = require("mongoose");
const { Schema } = mongoose;

const ROLES = ["DONOR", "RECIPIENT", "NGO", "VOLUNTEER"];

const userSchema = new Schema(
  {
    // fullName is used by individual donors/recipients and volunteers.
    // Business/organization accounts use businessName/organizationName
    // (stored on the role profile) instead, so this is optional here.
    fullName: { type: String, trim: true },

    // Organization-type accounts (business donor, org recipient, NGO) may
    // register without a personal email, so this is only required for
    // individual-style accounts — enforced in the validation middleware.
    email: { type: String, trim: true, lowercase: true, unique: true, sparse: true },

    phoneNumber: { type: String, required: true, trim: true, unique: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true },

    address: { type: String, required: true, trim: true },
    district: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },

    // --- Account verification (Task 04) ---
    isVerified: { type: Boolean, default: false },
    verificationCode: { type: String, select: false },
    verificationCodeExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
module.exports.ROLES = ROLES;
