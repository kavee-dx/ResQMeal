const fs = require("fs");
const Campaign = require("../models/amasha-Campaign");
const { CAMPAIGN_CATEGORIES } = require("../models/amasha-Campaign");

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PHONE_RE = /^\+?\d[\d\s-]{6,14}$/;

const removeUpload = (file) => {
  if (file && file.path) fs.unlink(file.path, () => {});
};

// POST /api/campaigns   (NGO only — see amasha-campaignRoutes.js)
async function createCampaign(req, res) {
  const b = req.body;
  const title = (b.title || "").trim();
  const description = (b.description || "").trim();
  const location = (b.location || "").trim();
  const contactPhone = (b.contactPhone || "").trim();

  // Same rules as the app form, checked again on the server
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

  if (Object.keys(errors).length) {
    removeUpload(req.file);
    return res.status(400).json({
      success: false,
      message: Object.values(errors)[0],
      errors,
    });
  }

  try {
    const campaign = await Campaign.create({
      ngoId: req.user.id, // from the verified token, never from the request body
      title,
      description,
      category: b.category,
      location,
      startDate: b.startDate,
      endDate: b.endDate,
      targetMeals: b.targetMeals ? Number(b.targetMeals) : undefined,
      contactPhone,
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

module.exports = { createCampaign };