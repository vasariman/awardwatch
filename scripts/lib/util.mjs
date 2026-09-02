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

// Always required, regardless of status.
export const REQUIRED_FIELDS = [
  "title",
  "organizer",
  "seriesId",
  "categories",
  "targetAudience",
  "country",
  "entryFee",
  "registrationUrl",
  "prizeMoney",
  "shortDescription",
  "submissionFormat",
  "status",
];

// deadline is required for every status except "pending" — a pending
// edition is pending precisely because it isn't known yet. resultDate is
// never required to be non-null, for any status: an "open" edition can
// have a confirmed deadline and still not have an announced result date.
// One rule, not two — whatever isn't confirmed stays null, whether or not
// deadline itself is known. Never treat either null as "fill this in"; a
// null here is the honest, correct value.
export const DATE_FIELDS = ["deadline", "resultDate"];

// Full schema, including the fields the live site uses beyond the minimal
// set above (slug is the routing key; studentTag/longDescription back the
// detail page and the Student cross-cutting tag).
export const FULL_REQUIRED_FIELDS = [
  ...REQUIRED_FIELDS,
  ...DATE_FIELDS,
  "slug",
  "studentTag",
  "longDescription",
];

// Optional fields: only meaningful in specific situations (expectedPeriod
// for a pending edition, opensAt when actually researched), never required,
// but still real schema fields that must survive a merge when present.
export const OPTIONAL_FIELDS = ["expectedPeriod", "opensAt"];

export const CATEGORIES = [
  "Product/Industrial Design",
  "Graphic Design",
  "UX/UI Design",
  "Architecture",
  "Interior/Furniture Design",
  "Sustainable Design",
];

export const TARGET_AUDIENCES = ["students", "professionals", "open"];
export const STATUSES = ["upcoming", "open", "closing-soon", "expired", "pending"];

const CLOSING_SOON_WINDOW_DAYS = 30;

export function isEmpty(value) {
  if (Array.isArray(value)) return value.length === 0;
  return value === undefined || value === null || value === "";
}

// Same idea as isEmpty, but aware that deadline/resultDate can honestly be
// null: resultDate is never flagged as missing (null is always a valid,
// final answer for it), and deadline is only excused on a "pending" entry
// (that's what makes it pending).
export function missingRequiredFields(entry, fields) {
  return fields.filter((f) => {
    if (f === "resultDate") return false;
    if (f === "deadline" && entry?.status === "pending") return false;
    return isEmpty(entry?.[f]);
  });
}

export function daysUntil(iso, today = new Date()) {
  const target = new Date(iso + "T00:00:00Z");
  const start = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  );
  return Math.round((target.getTime() - start.getTime()) / 86400000);
}

// Mirrors the live status computation in src/lib/competitions.ts — kept in
// sync by hand since this file is plain JS run by scripts, not imported by
// the Next.js app. Check order matters (see the comment there for why):
// no deadline -> pending; deadline passed -> expired; opensAt still in the
// future -> upcoming; deadline within the window -> closing-soon; else open.
export function computeStatus(deadlineIso, opensAtIso, today = new Date()) {
  if (deadlineIso == null) return "pending";
  const days = daysUntil(deadlineIso, today);
  if (days < 0) return "expired";
  if (opensAtIso && daysUntil(opensAtIso, today) > 0) return "upcoming";
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
