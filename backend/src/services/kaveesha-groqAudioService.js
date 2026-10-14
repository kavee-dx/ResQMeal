// backend/src/services/kaveesha-groqAudioService.js
// Transcribes one spoken answer from the voice assistant using Groq's Whisper
// model. Groq's free tier is generally faster and steadier than Gemini's free
// tier for speech-to-text. Whisper only transcribes (no LLM cleanup), so the
// raw transcript is lightly tidied here before it is returned.
//
// Cost: FREE tier — subject to Groq rate/daily limits (see console.groq.com).
// Requires: GROQ_API_KEY in backend/.env
//
// If GROQ_API_KEY is missing, the controller falls back to the free Gemini
// service so the assistant keeps working instead of failing outright.
// Owner: Kaveesha

const GROQ_URL = "https://api.groq.com/openai/audio/transcriptions";
const GROQ_MODEL = process.env.GROQ_WHISPER_MODEL || "whisper-large-v3-turbo";

const MAX_ATTEMPTS = 3;
const REQUEST_TIMEOUT_MS = 15000;

// Map a MIME type to a file extension Groq/Whisper recognises.
function extForMime(mimeType) {
  if (!mimeType) return "m4a";
  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) return "mp3";
  if (mimeType.includes("wav")) return "wav";
  if (mimeType.includes("ogg") || mimeType.includes("opus")) return "ogg";
  if (mimeType.includes("flac")) return "flac";
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("aac")) return "aac";
  return "m4a"; // audio/mp4 and anything else
}

// Remove common spoken fillers without touching meaningful content.
function tidyTranscript(text) {
  return text
    .replace(/\s+/g, " ")
    .replace(/^(um+|uh+|ah+|so|well)[,\s]+/i, "")
    .trim();
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Is this a transient failure worth retrying? (rate limit / overload / network)
function isRetryable(status) {
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

/**
 * @param {string} base64Audio - raw base64 audio (no "data:" prefix)
 * @param {string} mimeType - e.g. "audio/mp4"
 * @returns {Promise<string>} transcribed answer text (may be empty)
 */
async function transcribeVoiceAnswer(base64Audio, mimeType) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    const err = new Error("GROQ_API_KEY_MISSING");
    err.code = "GROQ_API_KEY_MISSING";
    throw err;
  }

  const buffer = Buffer.from(base64Audio, "base64");
  const ext = extForMime(mimeType);

  let lastError;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      // Rebuild FormData on every attempt — a FormData/Blob body cannot be
      // reused across fetch calls once the stream has been consumed.
      const form = new FormData();
      form.append("file", new Blob([buffer], { type: mimeType || "audio/mp4" }), `answer.${ext}`);
      form.append("model", GROQ_MODEL);
      form.append("response_format", "json");
      form.append("temperature", "0");

      const response = await fetch(GROQ_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        const err = new Error(`GROQ_${response.status}: ${body.slice(0, 200)}`);
        err.status = response.status;

        if (isRetryable(response.status) && attempt < MAX_ATTEMPTS) {
          lastError = err;
          await wait(attempt * 800); // 800ms, then 1600ms backoff
          continue;
        }
        throw err;
      }

      const data = await response.json();
      const text = typeof data?.text === "string" ? data.text : "";

      return tidyTranscript(text);
    } catch (error) {
      const aborted = error?.name === "AbortError";
      lastError = aborted ? new Error("GROQ_TIMEOUT") : error;

      const retryable =
        aborted ||
        isRetryable(error?.status) ||
        // Node fetch rejects with a TypeError ("fetch failed") on network drops.
        error?.name === "TypeError";

      if (retryable && attempt < MAX_ATTEMPTS) {
        await wait(attempt * 800);
        continue;
      }
      throw lastError;
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError || new Error("GROQ_TRANSCRIPTION_FAILED");
}

module.exports = { transcribeVoiceAnswer };
