#!/usr/bin/env node
// PAUSED (see scripts/merge-competitions.mjs for the active workflow).
//
// This automated Gemini + BauNetz research pipeline is kept around in case
// full automation is revisited later, but the active process for now is
// manual: research is done by hand in a Claude.ai chat, and the resulting
// JSON is fed into `npm run merge` (scripts/merge-competitions.mjs) instead.
//
// Run with: npm run research
//
// What it does:
//   1. Fetches + parses the BauNetz Wettbewerbe RSS feed (architecture).
//   2. Calls the Gemini API (with Google Search grounding, falling back to
//      non-grounded generation if grounding isn't available) to find other
//      currently open design competitions.
//   3. Cross-checks every candidate against the live competitions.json
//      (exact registrationUrl match, then fuzzy title+organizer match) and
//      against other candidates found in the same run.
//   4. Writes everything to /data/research-output-preview.json for manual
//      review. Nothing is ever written to competitions.json by this script.
//
// This script never modifies competitions.json and is safe to re-run.
import { writeFileSync } from "node:fs";
import {
  RESEARCH_OUTPUT_PATH,
  DATA_PATH,
  loadCompetitions,
  loadEnvLocal,
  normalizeTitleOrganizer,
  normalizeUrl,
  daysUntil,
  isEmpty,
} from "./lib/util.mjs";
import { fetchBaunetzCompetitions, BAUNETZ_RSS_URL } from "./lib/baunetz.mjs";
import { researchViaGemini, MODEL as GEMINI_MODEL } from "./lib/gemini.mjs";

function ensureUniqueSlug(candidateSlug, takenSlugs) {
  let slug = candidateSlug || "untitled-competition";
  let n = 2;
  while (takenSlugs.has(slug)) {
    slug = `${candidateSlug}-${n}`;
    n += 1;
  }
  takenSlugs.add(slug);
  return slug;
}

function dedupeCandidates(candidates, existing) {
  const takenSlugs = new Set(existing.map((e) => e.slug).filter(Boolean));
  const byUrl = new Map();
  const byTitleOrg = new Map();

  for (const e of existing) {
    if (!isEmpty(e.registrationUrl)) byUrl.set(normalizeUrl(e.registrationUrl), e.slug);
    const key = normalizeTitleOrganizer(e.title, e.organizer);
    if (key !== "|") byTitleOrg.set(key, e.slug);
  }

  const reviewed = [];

  for (const c of candidates) {
    let isDuplicate = false;
    let duplicateReason = null;
    let duplicateOf = null;

    const url = isEmpty(c.registrationUrl) ? null : normalizeUrl(c.registrationUrl);
    const titleOrgKey = normalizeTitleOrganizer(c.title, c.organizer);

    if (url && byUrl.has(url)) {
      isDuplicate = true;
      duplicateOf = byUrl.get(url);
      duplicateReason = `Exact registrationUrl match with existing/candidate "${duplicateOf}"`;
    } else if (titleOrgKey !== "|" && byTitleOrg.has(titleOrgKey)) {
      isDuplicate = true;
      duplicateOf = byTitleOrg.get(titleOrgKey);
      duplicateReason = `Title+organizer fuzzy match with existing/candidate "${duplicateOf}" — please review manually`;
    }

    const slug = isDuplicate ? c.slug || "duplicate" : ensureUniqueSlug(c.slug, takenSlugs);

    // Register this candidate so later candidates in the same run can be
    // flagged as duplicates of it too, even if it isn't itself a dup.
    if (url && !byUrl.has(url)) byUrl.set(url, slug);
    if (titleOrgKey !== "|" && !byTitleOrg.has(titleOrgKey)) byTitleOrg.set(titleOrgKey, slug);

    reviewed.push({
      ...c,
      slug,
      _review: {
        source: c._source,
        isDuplicate,
        duplicateReason,
      },
    });
  }

  return reviewed;
}

function findExpiredCandidates(existing, today) {
  const out = [];
  for (const e of existing) {
    if (isEmpty(e.deadline) || isEmpty(e.status)) continue;
    const days = daysUntil(e.deadline, today);
    if (days < 0 && e.status !== "expired") {
      out.push({ slug: e.slug, title: e.title, deadline: e.deadline, currentStatus: e.status, daysPast: -days });
    }
  }
  return out;
}

async function main() {
  loadEnvLocal();
  const today = new Date();

  console.log("=".repeat(60));
  console.log("AwardWatch — research pipeline (manual run)");
  console.log(`Run at: ${today.toISOString()}`);
  console.log("=".repeat(60));

  let existing;
  try {
    existing = loadCompetitions();
  } catch (err) {
    console.error(`ERROR: could not load ${DATA_PATH}: ${err.message}`);
    process.exit(1);
  }
  console.log(`\nLoaded ${existing.length} existing competitions from competitions.json.`);

  // --- Source 1: BauNetz RSS -------------------------------------------
  console.log(`\n--- Fetching BauNetz RSS (${BAUNETZ_RSS_URL}) ---`);
  const rssResult = await fetchBaunetzCompetitions(today);
  if (!rssResult.ok) {
    console.error(`ERROR: BauNetz RSS feed unreachable: ${rssResult.error}`);
  } else {
    console.log(`OK: parsed ${rssResult.items.length} item(s) from the RSS feed.`);
  }
  const rssCandidates = rssResult.items.map((it) => ({ ...it, _source: "rss" }));

  // --- Source 2: Gemini API --------------------------------------------
  console.log(`\n--- Calling Gemini API (${GEMINI_MODEL}) ---`);
  const geminiResult = await researchViaGemini({
    apiKey: process.env.GEMINI_API_KEY,
    existingTitles: existing.map((e) => e.title).filter(Boolean),
    today,
  });
  if (!geminiResult.ok) {
    console.error(`ERROR: Gemini research failed: ${geminiResult.error}`);
  } else {
    console.log(
      `OK: Gemini returned ${geminiResult.items.length} candidate(s). Grounding (Google Search) used: ${geminiResult.groundingUsed}.`
    );
    if (geminiResult.error) {
      console.warn(`  Note: ${geminiResult.error}`);
    }
  }
  const geminiCandidates = geminiResult.items.map((it) => ({ ...it, _source: "gemini" }));

  // --- Merge + dedupe ----------------------------------------------------
  const allCandidates = [...rssCandidates, ...geminiCandidates];
  const reviewed = dedupeCandidates(allCandidates, existing);
  const newOnes = reviewed.filter((c) => !c._review.isDuplicate);
  const dupes = reviewed.filter((c) => c._review.isDuplicate);
  const expiredCandidates = findExpiredCandidates(existing, today);

  // --- Write preview file --------------------------------------------
  const output = {
    generatedAt: today.toISOString(),
    sources: {
      rss: { url: BAUNETZ_RSS_URL, ok: rssResult.ok, error: rssResult.error, itemCount: rssResult.items.length },
      gemini: {
        model: GEMINI_MODEL,
        ok: geminiResult.ok,
        groundingUsed: geminiResult.groundingUsed,
        error: geminiResult.error,
        itemCount: geminiResult.items.length,
      },
    },
    existingDeadlinePassedCandidates: expiredCandidates,
    candidates: reviewed,
  };

  try {
    writeFileSync(RESEARCH_OUTPUT_PATH, JSON.stringify(output, null, 2) + "\n", "utf-8");
  } catch (err) {
    console.error(`ERROR: could not write ${RESEARCH_OUTPUT_PATH}: ${err.message}`);
    process.exit(1);
  }

  // --- Summary ----------------------------------------------------------
  console.log("\n" + "=".repeat(60));
  console.log("SUMMARY");
  console.log("=".repeat(60));
  console.log(`${newOnes.length} new competitions found (not matched to anything existing).`);
  console.log(`${dupes.length} possible duplicates flagged:`);
  for (const d of dupes) {
    console.log(`  - "${d.title}" [${d._review.source}]: ${d._review.duplicateReason}`);
  }
  console.log(
    `${expiredCandidates.length} existing competitions whose deadline has passed (status not yet "expired"):`
  );
  for (const e of expiredCandidates) {
    console.log(`  - "${e.title}" (${e.slug}): deadline ${e.deadline}, ${e.daysPast}d past, status is "${e.currentStatus}"`);
  }

  console.log(`\nFull results written to: ${RESEARCH_OUTPUT_PATH}`);
  console.log("Nothing was written to competitions.json. Review the preview file before merging.");
}

main().catch((err) => {
  console.error("\nFATAL: research script crashed unexpectedly.");
  console.error(err.stack || err.message || err);
  process.exit(1);
});
