// backend/src/services/kaveesha-geminiAudioService.js
// Transcribes one spoken answer from the voice assistant using the same
// free Gemini API key already set up for photo screening. Gemini's audio
// understanding does transcription + cleanup in a single call, so no
// separate speech-to-text service is needed.
// Owner: Kaveesha

const axios = require("axios");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

function buildPrompt(question, fieldLabel, formatHint) {
  return `
The user is filling out a food donation form by voice. They were just asked:
"${question}"

Their answer is meant for the "${fieldLabel}" field${formatHint ? ` (expected format: ${formatHint})` : ""}.

Transcribe what they said in the attached audio clip, then clean it up so
it's ready to drop straight into that form field: remove filler words like
"um", and leading phrases like "it's" or "I would say". Convert spoken
numbers to digits where the field expects a number.

If the audio is silent, unclear, or they said something like "skip" or
"nothing", return an empty string.

Respond with ONLY this JSON object, no other text, no markdown fences:
{"answer": "the cleaned answer text, or an empty string"}
`.trim();
}

/**
 * @param {string} base64Audio - raw base64 audio data (no "data:" prefix)
 * @param {string} mimeType - e.g. "audio/mp4"
 * @param {string} question - the question that was spoken to the user
 * @param {string} fieldLabel - the form field this answer belongs to
 * @param {string} [formatHint] - optional hint on expected format
 * @returns {Promise<string>} the cleaned answer text (may be empty)
 */
async function transcribeVoiceAnswer(
  base64Audio,
  mimeType,
  question,
  fieldLabel,
  formatHint,
) {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY_MISSING");
  }

  const response = await axios.post(
    `${GEMINI_URL}?key=${GEMINI_API_KEY}`,
    {
      contents: [
        {
          parts: [
            { text: buildPrompt(question, fieldLabel, formatHint) },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Audio,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    },
    {
      headers: { "Content-Type": "application/json" },
      timeout: 20000,
    },
  );

  const rawText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) {
    throw new Error("GEMINI_EMPTY_RESPONSE");
  }

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (err) {
    throw new Error("GEMINI_UNPARSEABLE_RESPONSE");
  }

  return typeof parsed.answer === "string" ? parsed.answer.trim() : "";
}

module.exports = { transcribeVoiceAnswer };