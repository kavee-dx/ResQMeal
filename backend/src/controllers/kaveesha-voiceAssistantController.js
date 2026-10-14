// backend/src/controllers/kaveesha-voiceAssistantController.js
// Task — Voice Assistant transcription endpoint
// Owner: Kaveesha

const {
  transcribeVoiceAnswer: transcribeWithGroq,
} = require("../services/kaveesha-groqAudioService");

const {
  transcribeVoiceAnswer: transcribeWithGemini,
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

    const cleanQuestion = typeof question === "string" ? question : "";
    const cleanFieldLabel =
      typeof fieldLabel === "string" ? fieldLabel : "answer";
    const cleanFormatHint =
      typeof formatHint === "string" ? formatHint : undefined;

    // Prefer Groq Whisper (free, faster/steadier). If it is not configured or
    // fails, transparently fall back to the free Gemini service so the voice
    // assistant keeps working rather than erroring out.
    let answer;
    const groqConfigured = Boolean(process.env.GROQ_API_KEY);

    if (groqConfigured) {
      try {
        answer = await transcribeWithGroq(audioBase64, safeMimeType);
      } catch (groqError) {
        console.warn(
          "⚠️ Groq transcription failed, falling back to Gemini:",
          groqError?.message || groqError
        );
        answer = await transcribeWithGemini(
          audioBase64,
          safeMimeType,
          cleanQuestion,
          cleanFieldLabel,
          cleanFormatHint
        );
      }
    } else {
      answer = await transcribeWithGemini(
        audioBase64,
        safeMimeType,
        cleanQuestion,
        cleanFieldLabel,
        cleanFormatHint
      );
    }

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
      // "retryable" tells the frontend it's safe to offer Try again / typing.
      retryable: true,
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