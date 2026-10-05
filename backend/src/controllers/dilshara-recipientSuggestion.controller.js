// backend/src/controllers/dilshara-recipientSuggestion.controller.js
// Owner: Dilshara

const mongoose = require("mongoose");
const Donation = require("../models/kaveesha-Donation");
const {
  getRecipientSuggestions,
  CRITERIA,
} = require("../services/dilshara-recipientMatching.service");

const SUGGESTIBLE_STATUSES = ["pending", "active"];

async function getSuggestions(req, res) {
  try {
    const donorId = req.user?.id;
    const { donationId } = req.query;
    const criteria = typeof req.query.criteria === "string" ? req.query.criteria : "smart";

    if (!donorId || !mongoose.Types.ObjectId.isValid(donorId)) {
      return res.status(401).json({ success: false, message: "Invalid authenticated user." });
    }
    if (!donationId || !mongoose.Types.ObjectId.isValid(donationId)) {
      return res.status(400).json({ success: false, message: "A valid donationId is required." });
    }
    if (!CRITERIA.includes(criteria)) {
      return res.status(400).json({
        success: false,
        message: `Invalid criteria. Allowed values: ${CRITERIA.join(", ")}.`,
      });
    }

    // Ownership check: the donation must belong to the logged-in donor.
    const donation = await Donation.findOne({ _id: donationId, donor: donorId }).lean();
    if (!donation) {
      return res.status(404).json({ success: false, message: "Donation not found." });
    }

    if (!SUGGESTIBLE_STATUSES.includes(donation.status)) {
      return res.status(400).json({
        success: false,
        message: `Recipients can only be suggested for pending or active donations (this one is ${donation.status}).`,
      });
    }

    const suggestions = await getRecipientSuggestions(donation, criteria);

    return res.status(200).json({
      success: true,
      criteria,
      count: suggestions.length,
      data: suggestions,
    });
  } catch (error) {
    console.error("Recipient suggestions error:", error);
    return res.status(500).json({ success: false, message: "Failed to load recipient suggestions." });
  }
}

module.exports = { getSuggestions };