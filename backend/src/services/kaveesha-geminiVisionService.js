// backend/src/services/kaveesha-geminiVisionService.js
// Calls Google's Gemini API (free tier — no credit card required) to run
// the AI visual screening on a donated food photo.
//
// Get a free API key: https://aistudio.google.com -> "Get API key"
// Add it to backend/.env as GEMINI_API_KEY=your_key_here
//
// This intentionally never asks the model to confirm the food "is safe" —
// only to report visible indicators. See kaveesha-README-createDonationFlow.md
// for why that distinction matters.
// Owner: Kaveesha

const axios = require("axios");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Google retires model names without much warning: "gemini-2.0-flash" now
// answers 404 "no longer available", and several others return 503 whenever
// the free tier is busy. Rather than hard-coding one name and breaking on a
// Tuesday, walk a short list of vision-capable models until one answers, and
// remember which one worked so the next request starts there.
const FALLBACK_MODELS = (
  process.env.GEMINI_VISION_MODELS ||
  "gemini-3.7-flash,gemini-3.5-flash-lite,gemini-flash-lite-latest"
)
  .split(",")
  .map((name) => name.trim())
  .filter(Boolean);

// GEMINI_MODEL (if set) is tried first, then the fallbacks above.
const CANDIDATE_MODELS = Array.from(
  new Set([process.env.GEMINI_MODEL, ...FALLBACK_MODELS]
    .map((name) => (name || "").trim())
    .filter(Boolean)),
);

const REQUEST_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS || 12000);
const PRIMARY_MODEL_ATTEMPTS = 2; // only the first model gets a quick retry

// Index of the model that succeeded last time, so a temporarily overloaded
// model does not slow down every single request.
let healthyIndex = 0;

function orderedModels() {
  const start = healthyIndex % CANDIDATE_MODELS.length;
  return [
    ...CANDIDATE_MODELS.slice(start),
    ...CANDIDATE_MODELS.slice(0, start),
  ];
}

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

const ANALYSIS_PROMPT = `
You are a visual screening assistant for a food donation app.

Look ONLY at what is visibly present in this photo of food being donated.
Check for:
- Mold-like growth or unusual discoloration
- Visible spoilage indicators
- Damaged or leaking packaging
- Open or uncovered food that looks contaminated
- Burnt or heavily degraded appearance
- Foreign objects or unusual visible contamination

IMPORTANT RULES:
- You can NEVER determine whether food is actually safe to eat from a photo
  alone (a photo cannot show bacteria, storage temperature, or how the food
  was prepared).
- Do NOT say the food "is safe" or "is unsafe" — only describe what is
  visibly present.
- Classify the photo into exactly one of: "GOOD", "REVIEW", "CONCERN".
  - GOOD: no obvious visible quality concern.
  - REVIEW: a possible but not certain visible concern (e.g. slight
    discoloration, an unclear or dark photo) that a human should double
    check.
  - CONCERN: a clear visible concern (e.g. mold-like growth, badly damaged
    packaging).

Respond with ONLY this JSON object, no other text, no markdown fences:
{"result": "GOOD" | "REVIEW" | "CONCERN", "reason": "one short plain-language sentence describing what is visible"}
`.trim();

/**
 * @param {string} base64Image - raw base64 image data (no "data:" prefix)
 * @param {string} mimeType - e.g. "image/jpeg"
 * @returns {Promise<{ result: 'GOOD'|'REVIEW'|'CONCERN', reason: string, model: string }>}
 */
async function analyzeFoodPhoto(base64Image, mimeType) {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY_MISSING");
  }

  const models = orderedModels();
  let lastError;

  for (let position = 0; position < models.length; position += 1) {
    const model = models[position];
    const attempts = position === 0 ? PRIMARY_MODEL_ATTEMPTS : 1;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const response = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
          {
            contents: [
              {
                parts: [
                  { text: ANALYSIS_PROMPT },
                  {
                    inline_data: {
                      mime_type: mimeType,
                      data: base64Image,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: "application/json",
            },
          },
          {
            headers: { "Content-Type": "application/json" },
            timeout: REQUEST_TIMEOUT_MS,
          },
        );

        const rawText =
          response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!rawText) {
          throw new Error("GEMINI_EMPTY_RESPONSE");
        }

        let parsed;
        try {
          parsed = JSON.parse(rawText);
        } catch (err) {
          throw new Error("GEMINI_UNPARSEABLE_RESPONSE");
        }

        const result = ["GOOD", "REVIEW", "CONCERN"].includes(parsed.result)
          ? parsed.result
          : "REVIEW";

        const reason =
          typeof parsed.reason === "string" && parsed.reason.trim()
            ? parsed.reason.trim()
            : "Unable to determine a specific visible detail.";

        // Remember the winner so the next photo skips straight to it.
        healthyIndex = CANDIDATE_MODELS.indexOf(model);
        if (healthyIndex < 0) healthyIndex = 0;

        if (position > 0) {
          console.log(`✅ Photo screened with fallback model: ${model}`);
        }

        return { result, reason, model };
      } catch (error) {
        lastError = error;
        const status = error?.response?.status;
        const code = error?.code;

        // 404 means Google retired this name — no point retrying it, move on.
        if (status === 404) {
          console.warn(`⚠️ Gemini model "${model}" unavailable, trying next.`);
          break;
        }

        if (isTransient(status, code) && attempt < attempts) {
          await wait(attempt * 800);
          continue;
        }

        // Transient on the primary model: give the next one a chance instead
        // of failing the donor's whole check because Google is busy.
        if (isTransient(status, code) && position < models.length - 1) {
          console.warn(
            `⚠️ Gemini "${model}" busy (${status || code}), falling back…`,
          );
          break;
        }

        throw error;
      }
    }
  }

  throw lastError || new Error("GEMINI_NO_MODEL_AVAILABLE");
}

module.exports = { analyzeFoodPhoto, CANDIDATE_MODELS };
