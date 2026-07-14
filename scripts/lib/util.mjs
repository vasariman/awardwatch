// Shared helpers for scripts/audit-competitions.mjs and scripts/research.mjs.
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.join(__dirname, "..", "..");
export const DATA_PATH = path.join(REPO_ROOT, "data", "competitions.json");
export const RESEARCH_OUTPUT_PATH = path.join(
  REPO_ROOT,
  "data",
  "research-output-preview.json"
);
export const INCOMING_COMPETITIONS_PATH = path.join(
  REPO_ROOT,
  "data",
  "incoming-competitions.json"
);

export const REQUIRED_FIELDS = [
  "title",
  "organizer",
  "deadline",
  "category",
  "targetAudience",
  "country",
  "entryFee",
  "registrationUrl",
  "prizeMoney",
  "resultDate",
  "shortDescription",
  "submissionFormat",
  "status",
];

// Full schema, including the fields the live site uses beyond the minimal
// set above (slug is the routing key; studentTag/longDescription back the
// detail page and the Student cross-cutting tag).
export const FULL_REQUIRED_FIELDS = [...REQUIRED_FIELDS, "slug", "studentTag", "longDescription"];

export const CATEGORIES = [
  "Product/Industrial Design",
  "Graphic Design",
  "UX/UI Design",
  "Architecture",
  "Interior/Furniture Design",
  "Sustainable Design",
];

export const TARGET_AUDIENCES = ["students", "professionals", "open"];
export const STATUSES = ["open", "closing-soon", "expired"];

const CLOSING_SOON_WINDOW_DAYS = 45;

export function isEmpty(value) {
  return value === undefined || value === null || value === "";
}

export function daysUntil(iso, today = new Date()) {
  const target = new Date(iso + "T00:00:00Z");
  const start = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  );
  return Math.round((target.getTime() - start.getTime()) / 86400000);
}

export function computeStatus(deadlineIso, today = new Date()) {
  const days = daysUntil(deadlineIso, today);
  if (days < 0) return "expired";
  if (days <= CLOSING_SOON_WINDOW_DAYS) return "closing-soon";
  return "open";
}

export function normalizeUrl(u) {
  return (u || "").trim().replace(/\/+$/, "").toLowerCase();
}

export function normalizeTitleOrganizer(title, organizer) {
  const norm = (s) =>
    (s || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\b(20\d\d)(–20\d\d|-20\d\d)?\b/g, "") // strip year/edition
      .replace(/\s+/g, " ")
      .trim();
  return `${norm(title)}|${norm(organizer)}`;
}

export function slugify(title) {
  return (title || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function loadCompetitions() {
  let raw;
  try {
    raw = readFileSync(DATA_PATH, "utf-8");
  } catch (err) {
    throw new Error(`Could not read ${DATA_PATH}: ${err.message}`);
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`${DATA_PATH} is not valid JSON: ${err.message}`);
  }
  if (!Array.isArray(parsed)) {
    throw new Error("competitions.json does not contain a top-level array.");
  }
  return parsed;
}

// Minimal .env.local loader (no dependency on the `dotenv` package).
// Only sets a variable if it isn't already present in process.env.
export function loadEnvLocal() {
  const envPath = path.join(REPO_ROOT, ".env.local");
  if (!existsSync(envPath)) return;
  const raw = readFileSync(envPath, "utf-8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
