// backend/src/services/kaveesha-geminiAudioService.js
// Transcribes one spoken answer from the voice assistant using the same
// free Gemini API key already set up for photo screening. Gemini's audio
// understanding does transcription + cleanup in a single call, so no
// separate speech-to-text service is needed.
// Owner: Kaveesha

const axios = require("axios");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Same reasoning as kaveesha-geminiVisionService: model names get retired and
// the free tier throws transient 503s, so try a short chain instead of one
// hard-coded name.
const FALLBACK_MODELS = (process.env.GEMINI_AUDIO_MODELS ||
  "gemini-3.7-flash,gemini-3.5-flash-lite,gemini-flash-lite-latest")
  .split(",")
  .map((name) => name.trim())
  .filter(Boolean);

const CANDIDATE_MODELS = Array.from(
  new Set(
    [process.env.GEMINI_MODEL, ...FALLBACK_MODELS]
      .map((name) => (name || "").trim())
      .filter(Boolean),
  ),
);

const REQUEST_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS || 15000);

// Remember which model last succeeded so a busy model is not retried every turn.
let healthyIndex = 0;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransient(status, code) {
  return (
    [429, 500, 502, 503, 504].includes(status) ||
    code === "ECONNABORTED" ||
    code === "ETIMEDOUT" ||
    code === "ECONNREFUSED"
  );
}

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

  const start = healthyIndex % CANDIDATE_MODELS.length;
  const models = [
    ...CANDIDATE_MODELS.slice(start),
    ...CANDIDATE_MODELS.slice(0, start),
  ];

  let lastError;

  for (let position = 0; position < models.length; position += 1) {
    const model = models[position];

    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
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
          timeout: REQUEST_TIMEOUT_MS,
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

      healthyIndex = CANDIDATE_MODELS.indexOf(model);
      if (healthyIndex < 0) healthyIndex = 0;

      return typeof parsed.answer === "string" ? parsed.answer.trim() : "";
    } catch (error) {
      lastError = error;
      const status = error?.response?.status;

      // A retired name or a busy free tier should not end the conversation —
      // move to the next model in the chain.
      if (status === 404 || (isTransient(status, error?.code) && position < models.length - 1)) {
        console.warn(`⚠️ Gemini audio "${model}" failed (${status || error?.code}), trying next model…`);
        await wait(400);
        continue;
      }

      throw error;
    }
  }

  throw lastError || new Error("GEMINI_NO_MODEL_AVAILABLE");
}

module.exports = { transcribeVoiceAnswer };