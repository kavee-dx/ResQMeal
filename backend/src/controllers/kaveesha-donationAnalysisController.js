// backend/src/controllers/kaveesha-donationAnalysisController.js
// Task — AI Visual Screening endpoint (Create Donation flow, step 3)
// Owner: Kaveesha

const {
  analyzeFoodPhoto,
} = require("../services/kaveesha-geminiVisionService");

// ~6MB image once base64-encoded — generous for a compressed phone photo,
// small enough to fail fast instead of hanging on a huge upload.
const MAX_BASE64_LENGTH = 8 * 1024 * 1024;

// POST /api/donations/analyze-photo
async function analyzePhoto(req, res) {
  try {
    const { imageBase64, mimeType } = req.body || {};

    if (!imageBase64 || typeof imageBase64 !== "string") {
      return res.status(400).json({
        success: false,
        message: "imageBase64 is required.",
      });
    }

    if (imageBase64.length > MAX_BASE64_LENGTH) {
      return res.status(413).json({
        success: false,
        message: "Image is too large. Please use a smaller photo.",
      });
    }

    const safeMimeType =
      typeof mimeType === "string" && mimeType.startsWith("image/")
        ? mimeType
        : "image/jpeg";

    const { result, reason } = await analyzeFoodPhoto(
      imageBase64,
      safeMimeType,
    );

    return res.status(200).json({
      success: true,
      result,
      reason,
    });
  } catch (error) {
    if (error.message === "GEMINI_API_KEY_MISSING") {
      console.error(
        "GEMINI_API_KEY is not set. Add it to backend/.env — see kaveesha-README-createDonationFlow.md.",
      );
      return res.status(500).json({
        success: false,
        message: "AI screening is not configured on the server yet.",
      });
    }

    console.error(
      "Photo analysis failed:",
      error?.response?.data || error.message,
    );

    return res.status(502).json({
      success: false,
      message: "Could not analyze the photo right now. Please try again.",
    });
  }
}

module.exports = { analyzePhoto };