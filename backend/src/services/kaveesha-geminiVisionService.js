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
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

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
 * @returns {Promise<{ result: 'GOOD'|'REVIEW'|'CONCERN', reason: string }>}
 */
async function analyzeFoodPhoto(base64Image, mimeType) {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY_MISSING");
  }

  const response = await axios.post(
    `${GEMINI_URL}?key=${GEMINI_API_KEY}`,
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

  const result = ["GOOD", "REVIEW", "CONCERN"].includes(parsed.result)
    ? parsed.result
    : "REVIEW";

  const reason =
    typeof parsed.reason === "string" && parsed.reason.trim()
      ? parsed.reason.trim()
      : "Unable to determine a specific visible detail.";

  return { result, reason };
}

module.exports = { analyzeFoodPhoto };