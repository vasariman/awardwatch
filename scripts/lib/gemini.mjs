// Calls the Gemini API to research currently-open design competitions.
// Tries Google Search grounding first (needed to find competitions beyond
// the model's training cutoff); if the API rejects the grounding tool
// (e.g. not available on this key/tier) it logs why and retries once
// without grounding, relying on the model's own knowledge instead.
import { CATEGORIES, computeStatus, slugify } from "./util.mjs";

// "gemini-2.5-flash" is blocked for new API keys/accounts ("no longer
// available to new users" — confirmed via a live 404 on a fresh key even
// though it still appears in ListModels). "gemini-flash-latest" is an
// alias Google keeps pointed at its current recommended flash model, so
// this avoids re-breaking every time a dated model gets deprecated.
export const MODEL = "gemini-flash-latest";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export const SYSTEM_PROMPT = `You are a research assistant for AwardWatch, a directory of international design competitions. Search for currently open design competitions (Product/Industrial Design, Graphic Design, UX/UI, Architecture, Interior/Furniture Design, Sustainable Design) with submission deadlines in the future. Prioritize established, well-known competitions first (iF Design Award, Red Dot Award, A' Design Award, Bundespreis Ecodesign, and similar). For each competition found, return ONLY a JSON array matching this schema: [schema from above]. Do not include competitions that require payment beyond a reasonable entry fee to a legitimate organizer, and do not include anything that looks like a scam or pay-to-win award. If you are not confident about a specific field, use null rather than guessing.`;

const SCHEMA_TEXT = `[
  {
    "slug": "unique-kebab-case-slug",
    "title": "",
    "organizer": "",
    "deadline": "YYYY-MM-DD",
    "category": "one of: ${CATEGORIES.join(" | ")}",
    "targetAudience": "students | professionals | open",
    "studentTag": true | false,
    "country": "",
    "entryFee": "",
    "registrationUrl": "",
    "prizeMoney": "",
    "resultDate": "YYYY-MM-DD",
    "shortDescription": "",
    "longDescription": "",
    "submissionFormat": "",
    "status": "open | closing-soon | expired"
  }
]`;

function buildUserPrompt({ todayIso, existingTitles }) {
  const knownList =
    existingTitles.length > 0
      ? `Competitions already listed on AwardWatch (avoid re-suggesting these unless you have materially different/updated info): ${existingTitles.join(
          "; "
        )}.`
      : "AwardWatch currently has no listings yet.";

  return `Today's date is ${todayIso}.

${knownList}

Find 5-10 currently open design competitions with future submission deadlines. Return ONLY a raw JSON array (no markdown code fences, no commentary before or after) matching this exact schema:

${SCHEMA_TEXT}

Use "slug" as a URL-safe kebab-case identifier derived from the title and edition year. If you are not confident about a field's exact value, use null for that field rather than guessing.`;
}

function extractText(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts
    .map((p) => p.text || "")
    .join("")
    .trim();
}

function parseJsonArrayFromText(text) {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`No JSON array found in Gemini response. Raw text: ${cleaned.slice(0, 300)}`);
  }
  const jsonSlice = cleaned.slice(start, end + 1);
  return JSON.parse(jsonSlice);
}

async function callGeminiOnce({ apiKey, todayIso, existingTitles, withGrounding }) {
  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts: [{ text: buildUserPrompt({ todayIso, existingTitles }) }] }],
  };

  if (withGrounding) {
    body.tools = [{ google_search: {} }];
  } else {
    // responseMimeType + tools are not reliably compatible in v1beta, so
    // only force strict JSON mode on the non-grounded fallback call.
    body.generationConfig = { responseMimeType: "application/json" };
  }

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  const rawText = await res.text();

  if (!res.ok) {
    const err = new Error(`Gemini API error (HTTP ${res.status}): ${rawText.slice(0, 500)}`);
    err.status = res.status;
    err.body = rawText;
    throw err;
  }

  let data;
  try {
    data = JSON.parse(rawText);
  } catch (err) {
    throw new Error(`Gemini response was not valid JSON envelope: ${err.message}`);
  }

  const text = extractText(data);
  if (!text) {
    throw new Error("Gemini response had no text content to parse.");
  }

  const arr = parseJsonArrayFromText(text);
  if (!Array.isArray(arr)) {
    throw new Error("Gemini response JSON was not an array.");
  }
  return arr;
}

function looksLikeGroundingIssue(err) {
  const msg = `${err.message || ""} ${err.body || ""}`.toLowerCase();
  return (
    msg.includes("google_search") ||
    msg.includes("grounding") ||
    msg.includes("search tool") ||
    msg.includes("billing") ||
    msg.includes("not supported") ||
    msg.includes("permission")
  );
}

function sanitizeCandidate(raw, today) {
  if (!raw || typeof raw !== "object" || !raw.title) return null;

  const deadline = typeof raw.deadline === "string" ? raw.deadline : null;
  const targetAudience = ["students", "professionals", "open"].includes(raw.targetAudience)
    ? raw.targetAudience
    : "open";
  const category = CATEGORIES.includes(raw.category) ? raw.category : raw.category || null;

  return {
    slug: raw.slug ? slugify(raw.slug) : slugify(raw.title),
    title: raw.title,
    organizer: raw.organizer ?? null,
    deadline,
    category,
    targetAudience,
    studentTag: typeof raw.studentTag === "boolean" ? raw.studentTag : targetAudience === "students",
    country: raw.country ?? null,
    entryFee: raw.entryFee ?? null,
    registrationUrl: raw.registrationUrl ?? null,
    prizeMoney: raw.prizeMoney ?? null,
    resultDate: raw.resultDate ?? null,
    shortDescription: raw.shortDescription ?? null,
    longDescription: raw.longDescription ?? null,
    submissionFormat: raw.submissionFormat ?? null,
    status:
      ["open", "closing-soon", "expired"].includes(raw.status)
        ? raw.status
        : deadline
        ? computeStatus(deadline, today)
        : null,
  };
}

// Returns { ok, items, groundingUsed, error }. Never throws — all failures
// are captured and reported so the calling script can log them clearly
// and continue with whatever other sources succeeded.
export async function researchViaGemini({ apiKey, existingTitles, today = new Date() }) {
  if (!apiKey || apiKey.startsWith("REPLACE_WITH")) {
    return {
      ok: false,
      items: [],
      groundingUsed: null,
      error: "GEMINI_API_KEY is not set (still a placeholder) in .env.local.",
    };
  }

  const todayIso = today.toISOString().slice(0, 10);

  try {
    const arr = await callGeminiOnce({ apiKey, todayIso, existingTitles, withGrounding: true });
    return {
      ok: true,
      items: arr.map((r) => sanitizeCandidate(r, today)).filter(Boolean),
      groundingUsed: true,
      error: null,
    };
  } catch (groundedErr) {
    const reason = looksLikeGroundingIssue(groundedErr)
      ? `Google Search grounding appears unavailable on this API key/tier (${groundedErr.message}).`
      : `Grounded Gemini call failed (${groundedErr.message}).`;
    console.warn(`⚠ ${reason} Retrying once without grounding...`);

    try {
      const arr = await callGeminiOnce({ apiKey, todayIso, existingTitles, withGrounding: false });
      return {
        ok: true,
        items: arr.map((r) => sanitizeCandidate(r, today)).filter(Boolean),
        groundingUsed: false,
        error: `Grounding fallback used. Original grounded-call error: ${groundedErr.message}`,
      };
    } catch (fallbackErr) {
      return {
        ok: false,
        items: [],
        groundingUsed: false,
        error: `Both grounded and non-grounded Gemini calls failed. Grounded: ${groundedErr.message} | Fallback: ${fallbackErr.message}`,
      };
    }
  }
}
