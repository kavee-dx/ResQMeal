// backend/src/controllers/kaveesha-voiceAssistantController.js
// Task — Voice Assistant transcription endpoint
// Owner: Kaveesha

const {
  transcribeVoiceAnswer,
} = require("../services/kaveesha-geminiAudioService");

const MAX_BASE64_LENGTH = 12 * 1024 * 1024;

// POST /api/voice/transcribe
async function transcribeAnswer(req, res) {
  try {
    const {
      audioBase64,
      mimeType,
      question,
      fieldLabel,
      formatHint,
    } = req.body || {};

    if (!audioBase64 || typeof audioBase64 !== "string") {
      return res.status(400).json({
        success: false,
        message: "audioBase64 is required.",
      });
    }

    if (audioBase64.length > MAX_BASE64_LENGTH) {
      return res.status(413).json({
        success: false,
        message:
          "That answer was too long to process. Please answer more briefly.",
      });
    }

    const safeMimeType =
      typeof mimeType === "string" &&
      mimeType.startsWith("audio/")
        ? mimeType
        : "audio/mp4";

    const answer = await transcribeVoiceAnswer(
      audioBase64,
      safeMimeType,
      typeof question === "string" ? question : "",
      typeof fieldLabel === "string" ? fieldLabel : "answer",
      typeof formatHint === "string" ? formatHint : undefined
    );

    return res.status(200).json({
      success: true,
      answer,
    });
  } catch (error) {
    console.error(
      "❌ Voice transcription failed:",
      error?.response?.data || error?.message || error
    );

    return res.status(502).json({
      success: false,
      message:
        error?.response?.data?.error?.message ||
        error?.message ||
        "Could not understand that. Please try again.",
    });
  }
}

module.exports = {
  transcribeAnswer,
};