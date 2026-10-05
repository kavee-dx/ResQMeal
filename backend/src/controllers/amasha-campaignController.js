const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Campaign = require("../models/amasha-Campaign");
const { CAMPAIGN_CATEGORIES } = require("../models/amasha-Campaign");

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PHONE_RE = /^\+?\d[\d\s-]{6,14}$/;

// Same folder the upload middleware writes to
const uploadDir = path.join(__dirname, "..", "..", "uploads", "campaigns");

const removeUpload = (file) => {
  if (file && file.path) fs.unlink(file.path, () => {});
};

// Deletes a stored image from its saved relative path (/uploads/campaigns/<file>).
// basename() keeps the lookup inside the campaigns folder.
const removeStoredImage = (imageUrl) => {
  if (!imageUrl) return;
  fs.unlink(path.join(uploadDir, path.basename(imageUrl)), () => {});
};

// Same rules as the app form, shared by create and update.
// Returns the cleaned values plus any field errors.
function validateCampaignBody(b) {
  const values = {
    title: (b.title || "").trim(),
    description: (b.description || "").trim(),
    location: (b.location || "").trim(),
    contactPhone: (b.contactPhone || "").trim(),
  };
  const { title, description, location, contactPhone } = values;

  const errors = {};
  if (!title) errors.title = "Title is required.";
  else if (title.length > 100) errors.title = "Title must be 100 characters or fewer.";

  if (!description) errors.description = "Description is required.";
  else if (description.length > 1000)
    errors.description = "Description must be 1000 characters or fewer.";

  if (!CAMPAIGN_CATEGORIES.includes(b.category))
    errors.category = "Choose a valid campaign type.";

  if (!location) errors.location = "Location is required.";

  if (!DATE_RE.test(b.startDate || "") || isNaN(Date.parse(b.startDate)))
    errors.startDate = "Start date must be in the format YYYY-MM-DD.";
  if (!DATE_RE.test(b.endDate || "") || isNaN(Date.parse(b.endDate)))
    errors.endDate = "End date must be in the format YYYY-MM-DD.";
  if (!errors.startDate && !errors.endDate && b.endDate < b.startDate)
    errors.endDate = "End date must be on or after the start date.";

  if (b.targetMeals && !/^[1-9]\d*$/.test(b.targetMeals))
    errors.targetMeals = "Target meals must be a whole number above 0.";

  if (!PHONE_RE.test(contactPhone)) errors.contactPhone = "Enter a valid phone number.";

  return { values, errors };
}

function sendValidationError(res, errors) {
  return res.status(400).json({
    success: false,
    message: Object.values(errors)[0],
    errors,
  });
}

// POST /api/campaigns   (NGO only — see amasha-campaignRoutes.js)
async function createCampaign(req, res) {
  const b = req.body;
  const { values, errors } = validateCampaignBody(b);

  if (Object.keys(errors).length) {
    removeUpload(req.file);
    return sendValidationError(res, errors);
  }

  try {
    const campaign = await Campaign.create({
      ngoId: req.user.id, // from the verified token, never from the request body
      ...values,
      category: b.category,
      startDate: b.startDate,
      endDate: b.endDate,
      targetMeals: b.targetMeals ? Number(b.targetMeals) : undefined,
      imageUrl: req.file ? `/uploads/campaigns/${req.file.filename}` : undefined,
    });

    return res
      .status(201)
      .json({ success: true, message: "Campaign posted.", campaign });
  } catch (error) {
    removeUpload(req.file);
    console.error("createCampaign failed:", error);
    return res
      .status(500)
      .json({ success: false, message: "Could not save the campaign. Please try again." });
  }
}

// GET /api/campaigns/me   (NGO only) — this NGO's published (active) campaigns, newest first
async function getMyCampaigns(req, res) {
  try {
    const campaigns = await Campaign.find({ ngoId: req.user.id, status: "active" })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    return res.json({ success: true, campaigns });
  } catch (error) {
    console.error("getMyCampaigns failed:", error);
    return res
      .status(500)
      .json({ success: false, message: "Could not load campaigns. Please try again." });
  }
}

// PUT /api/campaigns/:id   (NGO only) — edit one of this NGO's own campaigns
//
// Sends the full form each time. Optional fields left out are cleared:
//   targetMeals missing   -> removed
//   image file attached   -> replaces the old image
//   removeImage = "true"  -> deletes the image
//   neither               -> the existing image is kept
async function updateCampaign(req, res) {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    removeUpload(req.file);
    return res.status(404).json({ success: false, message: "Campaign not found." });
  }

  const b = req.body;
  const { values, errors } = validateCampaignBody(b);
  if (Object.keys(errors).length) {
    removeUpload(req.file);
    return sendValidationError(res, errors);
  }

  try {
    // Matching on ngoId means an NGO can never touch another NGO's campaign;
    // a campaign that isn't theirs looks the same as one that doesn't exist.
    const campaign = await Campaign.findOne({ _id: id, ngoId: req.user.id });
    if (!campaign) {
      removeUpload(req.file);
      return res.status(404).json({ success: false, message: "Campaign not found." });
    }

    const oldImageUrl = campaign.imageUrl;

    campaign.title = values.title;
    campaign.description = values.description;
    campaign.location = values.location;
    campaign.contactPhone = values.contactPhone;
    campaign.category = b.category;
    campaign.startDate = b.startDate;
    campaign.endDate = b.endDate;
    campaign.targetMeals = b.targetMeals ? Number(b.targetMeals) : undefined;

    let replacedImage = false;
    if (req.file) {
      campaign.imageUrl = `/uploads/campaigns/${req.file.filename}`;
      replacedImage = true;
    } else if (b.removeImage === "true") {
      campaign.imageUrl = undefined;
      replacedImage = true;
    }

    await campaign.save();

    // Only delete the old file once the new data is safely saved
    if (replacedImage) removeStoredImage(oldImageUrl);

    return res.json({ success: true, message: "Campaign updated.", campaign });
  } catch (error) {
    removeUpload(req.file);
    console.error("updateCampaign failed:", error);
    return res
      .status(500)
      .json({ success: false, message: "Could not update the campaign. Please try again." });
  }
}

// DELETE /api/campaigns/:id   (NGO only) — remove one of this NGO's own campaigns
async function deleteCampaign(req, res) {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    return res.status(404).json({ success: false, message: "Campaign not found." });
  }

  try {
    const campaign = await Campaign.findOneAndDelete({ _id: id, ngoId: req.user.id });
    if (!campaign) {
      return res.status(404).json({ success: false, message: "Campaign not found." });
    }

    removeStoredImage(campaign.imageUrl);

    return res.json({ success: true, message: "Campaign deleted." });
  } catch (error) {
    console.error("deleteCampaign failed:", error);
    return res
      .status(500)
      .json({ success: false, message: "Could not delete the campaign. Please try again." });
  }
}

module.exports = { createCampaign, getMyCampaigns, updateCampaign, deleteCampaign };