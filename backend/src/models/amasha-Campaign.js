const mongoose = require("mongoose");
const { Schema } = mongoose;

const CAMPAIGN_CATEGORIES = [
  "surplus_pickup",
  "food_drive",
  "volunteer_call",
  "awareness",
];

const campaignSchema = new Schema(
  {
    ngoId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    title: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, required: true, trim: true, maxlength: 1000 },
    category: { type: String, enum: CAMPAIGN_CATEGORIES, required: true },
    location: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    targetMeals: { type: Number, min: 1 }, // optional
    contactPhone: { type: String, required: true, trim: true },
    imageUrl: { type: String, trim: true }, // optional

    status: { type: String, enum: ["active", "closed"], default: "active" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Campaign", campaignSchema);
module.exports.CAMPAIGN_CATEGORIES = CAMPAIGN_CATEGORIES;