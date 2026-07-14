#!/usr/bin/env node
// Manual research → validate → merge workflow for AwardWatch.
//
// Research is done by hand (e.g. in a Claude.ai chat); paste the resulting
// JSON array of candidate competitions into data/incoming-competitions.json
// (see data/incoming-competitions.example.json for the expected shape),
// then run:
//
//   npm run merge
//
// Every candidate is validated (required fields, valid category/audience/
// status enums, a real future deadline, a well-formed URL, and duplicate
// checks against both competitions.json and the rest of the batch). Only
// candidates with zero issues are appended to competitions.json — anything
// flagged is left out and printed with its reasons so it can be fixed and
// resubmitted. Existing entries are never deleted; entries whose deadline
// has passed have their status corrected to "expired" in the same run.
//
// Add --dry-run to see the full report without writing competitions.json.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import {
  DATA_PATH,
  INCOMING_COMPETITIONS_PATH,
  FULL_REQUIRED_FIELDS,
  CATEGORIES,
  TARGET_AUDIENCES,
  STATUSES,
  isEmpty,
  daysUntil,
  computeStatus,
  normalizeTitleOrganizer,
  normalizeUrl,
  loadCompetitions,
} from "./lib/util.mjs";

const DRY_RUN = process.argv.includes("--dry-run");
const inputPathArg = process.argv.slice(2).find((a) => !a.startsWith("--"));
const inputPath = inputPathArg || INCOMING_COMPETITIONS_PATH;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function isValidDate(iso) {
  if (!DATE_RE.test(iso)) return false;
  const d = new Date(iso + "T00:00:00Z");
  return !Number.isNaN(d.getTime());
}

function loadIncoming(p) {
  if (!existsSync(p)) {
    throw new Error(
      `No input file found at ${p}. Paste your candidate JSON array there first (see data/incoming-competitions.example.json), or pass a path: node scripts/merge-competitions.mjs path/to/file.json`
    );
  }
  let raw;
  try {
    raw = readFileSync(p, "utf-8");
  } catch (err) {
    throw new Error(`Could not read ${p}: ${err.message}`);
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`${p} is not valid JSON: ${err.message}`);
  }
  if (!Array.isArray(parsed)) {
    throw new Error(`${p} must contain a top-level JSON array of competition objects.`);
  }
  return parsed;
}

function validateCandidate(candidate, today) {
  const issues = [];

  if (!candidate || typeof candidate !== "object") {
    return ["Entry is not a JSON object."];
  }

  for (const field of FULL_REQUIRED_FIELDS) {
    if (isEmpty(candidate[field])) {
      issues.push(`Missing/empty field: "${field}"`);
    }
  }

  if (!isEmpty(candidate.category) && !CATEGORIES.includes(candidate.category)) {
    issues.push(`Invalid category: "${candidate.category}" (must be one of: ${CATEGORIES.join(", ")})`);
  }
  if (!isEmpty(candidate.targetAudience) && !TARGET_AUDIENCES.includes(candidate.targetAudience)) {
    issues.push(`Invalid targetAudience: "${candidate.targetAudience}" (must be one of: ${TARGET_AUDIENCES.join(", ")})`);
  }
  if (!isEmpty(candidate.status) && !STATUSES.includes(candidate.status)) {
    issues.push(`Invalid status: "${candidate.status}" (must be one of: ${STATUSES.join(", ")})`);
  }
  if (typeof candidate.studentTag !== "undefined" && typeof candidate.studentTag !== "boolean") {
    issues.push(`"studentTag" must be true/false, got: ${JSON.stringify(candidate.studentTag)}`);
  }

  if (!isEmpty(candidate.deadline)) {
    if (!isValidDate(candidate.deadline)) {
      issues.push(`Invalid deadline format: "${candidate.deadline}" (expected YYYY-MM-DD)`);
    } else {
      const days = daysUntil(candidate.deadline, today);
      if (days < 0) {
        issues.push(`Deadline ${candidate.deadline} has already passed (${-days}d ago)`);
      }
    }
  }

  if (!isEmpty(candidate.resultDate) && !isValidDate(candidate.resultDate)) {
    issues.push(`Invalid resultDate format: "${candidate.resultDate}" (expected YYYY-MM-DD)`);
  }
  if (
    !isEmpty(candidate.resultDate) &&
    !isEmpty(candidate.deadline) &&
    isValidDate(candidate.resultDate) &&
    isValidDate(candidate.deadline) &&
    candidate.resultDate < candidate.deadline
  ) {
    issues.push(`resultDate (${candidate.resultDate}) is before deadline (${candidate.deadline})`);
  }

  if (!isEmpty(candidate.registrationUrl) && !/^https?:\/\//i.test(candidate.registrationUrl)) {
    issues.push(`registrationUrl doesn't look like a valid URL: "${candidate.registrationUrl}"`);
  }

  if (!isEmpty(candidate.slug) && !SLUG_RE.test(candidate.slug)) {
    issues.push(`"slug" must be lowercase kebab-case (letters, digits, hyphens only): "${candidate.slug}"`);
  }

  return issues;
}

function buildExistingIndex(existing) {
  const byUrl = new Map();
  const byTitleOrg = new Map();
  const bySlug = new Set();
  for (const e of existing) {
    if (!isEmpty(e.registrationUrl)) byUrl.set(normalizeUrl(e.registrationUrl), e.slug);
    const key = normalizeTitleOrganizer(e.title, e.organizer);
    if (key !== "|") byTitleOrg.set(key, e.slug);
    if (e.slug) bySlug.add(e.slug);
  }
  return { byUrl, byTitleOrg, bySlug };
}

function findDuplicateIssue(candidate, index) {
  const url = isEmpty(candidate.registrationUrl) ? null : normalizeUrl(candidate.registrationUrl);
  const titleOrgKey = normalizeTitleOrganizer(candidate.title, candidate.organizer);

  if (!isEmpty(candidate.slug) && index.bySlug.has(candidate.slug)) {
    return `Duplicate slug: "${candidate.slug}" already exists in competitions.json`;
  }
  if (url && index.byUrl.has(url)) {
    return `Duplicate: registrationUrl matches existing entry "${index.byUrl.get(url)}"`;
  }
  if (titleOrgKey !== "|" && index.byTitleOrg.has(titleOrgKey)) {
    return `Possible duplicate: title+organizer closely matches existing entry "${index.byTitleOrg.get(titleOrgKey)}" — review manually`;
  }
  return null;
}

function registerInIndex(candidate, index) {
  const url = isEmpty(candidate.registrationUrl) ? null : normalizeUrl(candidate.registrationUrl);
  const titleOrgKey = normalizeTitleOrganizer(candidate.title, candidate.organizer);
  if (url && !index.byUrl.has(url)) index.byUrl.set(url, candidate.slug);
  if (titleOrgKey !== "|" && !index.byTitleOrg.has(titleOrgKey)) index.byTitleOrg.set(titleOrgKey, candidate.slug);
  if (candidate.slug) index.bySlug.add(candidate.slug);
}

function correctExpiredStatuses(existing, today) {
  const corrected = [];
  const updated = existing.map((e) => {
    if (isEmpty(e.deadline) || isEmpty(e.status)) return e;
    const days = daysUntil(e.deadline, today);
    if (days < 0 && e.status !== "expired") {
      corrected.push({ slug: e.slug, title: e.title, deadline: e.deadline, previousStatus: e.status });
      return { ...e, status: "expired" };
    }
    return e;
  });
  return { updated, corrected };
}

function main() {
  const today = new Date();

  console.log("=".repeat(60));
  console.log("AwardWatch — validate & merge candidate competitions");
  console.log(`Run at: ${today.toISOString()}`);
  console.log(`Input: ${inputPath}${DRY_RUN ? "  (--dry-run: no files will be written)" : ""}`);
  console.log("=".repeat(60));

  let candidates;
  try {
    candidates = loadIncoming(inputPath);
  } catch (err) {
    console.error(`\nERROR: ${err.message}`);
    process.exit(1);
  }

  let existing;
  try {
    existing = loadCompetitions();
  } catch (err) {
    console.error(`\nERROR: could not load ${DATA_PATH}: ${err.message}`);
    process.exit(1);
  }

  console.log(`\nLoaded ${candidates.length} candidate(s) and ${existing.length} existing competition(s).`);

  // --- Step 1: existing entries whose deadline has passed -------------
  const { updated: existingWithCorrectedStatus, corrected: statusCorrections } = correctExpiredStatuses(
    existing,
    today
  );

  // --- Step 2: validate + dedupe each candidate ------------------------
  const index = buildExistingIndex(existingWithCorrectedStatus);
  const results = [];

  candidates.forEach((candidate, i) => {
    const issues = validateCandidate(candidate, today);
    if (issues.length === 0) {
      const dupIssue = findDuplicateIssue(candidate, index);
      if (dupIssue) issues.push(dupIssue);
    }

    const label = `[${i}] "${candidate?.title || "(no title)"}"${candidate?.organizer ? ` (${candidate.organizer})` : ""}`;

    if (issues.length === 0) {
      const normalized = { ...candidate, status: computeStatus(candidate.deadline, today) };
      registerInIndex(normalized, index);
      results.push({ label, candidate: normalized, issues: [] });
    } else {
      // Still register slug/url/title so later duplicate candidates in the
      // same batch are caught, even though this one won't be merged.
      if (candidate && typeof candidate === "object") registerInIndex(candidate, index);
      results.push({ label, candidate, issues });
    }
  });

  const toMerge = results.filter((r) => r.issues.length === 0).map((r) => r.candidate);
  const flagged = results.filter((r) => r.issues.length > 0);

  // --- Report -----------------------------------------------------------
  console.log(`\n--- Validation issues (${flagged.length}) ---`);
  if (flagged.length === 0) {
    console.log("None.");
  } else {
    for (const r of flagged) {
      console.log(`  ${r.label}`);
      for (const issue of r.issues) console.log(`      - ${issue}`);
    }
  }

  console.log(`\n--- Valid new entries (${toMerge.length}) ---`);
  if (toMerge.length === 0) {
    console.log("None.");
  } else {
    for (const c of toMerge) {
      console.log(`  - "${c.title}" (${c.slug}) — ${c.category}, deadline ${c.deadline}, status ${c.status}`);
    }
  }

  console.log(`\n--- Existing entries corrected to "expired" (${statusCorrections.length}) ---`);
  if (statusCorrections.length === 0) {
    console.log("None.");
  } else {
    for (const c of statusCorrections) {
      console.log(`  - "${c.title}" (${c.slug}): deadline was ${c.deadline}, status was "${c.previousStatus}"`);
    }
  }

  const finalData = [...existingWithCorrectedStatus, ...toMerge];
  const hasChanges = toMerge.length > 0 || statusCorrections.length > 0;

  if (hasChanges && !DRY_RUN) {
    try {
      writeFileSync(DATA_PATH, JSON.stringify(finalData, null, 2) + "\n", "utf-8");
    } catch (err) {
      console.error(`\nERROR: could not write ${DATA_PATH}: ${err.message}`);
      process.exit(1);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("SUMMARY");
  console.log("=".repeat(60));
  console.log(`${toMerge.length} valid new entries ${DRY_RUN ? "would be merged" : "merged"} into competitions.json`);
  console.log(`${flagged.length} candidates flagged and NOT merged (fix and resubmit)`);
  console.log(`${statusCorrections.length} existing entries updated to "expired"`);

  if (!hasChanges) {
    console.log("\nNo changes to make — competitions.json left untouched.");
  } else if (DRY_RUN) {
    console.log("\nDRY RUN — no files were written. Re-run without --dry-run to apply.");
  } else {
    console.log(`\ncompetitions.json has been updated (${finalData.length} total entries).`);
    console.log("Review with `git diff data/competitions.json`, then commit + push to publish.");
  }
}

main();
