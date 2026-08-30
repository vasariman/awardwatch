#!/usr/bin/env node
// Read-only audit of /data/competitions.json. Never writes/modifies the file.
import {
  DATA_PATH,
  REQUIRED_FIELDS,
  DATE_FIELDS,
  isEmpty,
  missingRequiredFields,
  daysUntil,
  computeStatus,
  normalizeTitleOrganizer,
  loadCompetitions,
} from "./lib/util.mjs";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const FAR_OUT_DAYS = 182; // ~6 months

function seriesWithoutCurrentEdition(entries, today) {
  const bySeriesId = new Map();
  for (const e of entries) {
    if (isEmpty(e.seriesId)) continue;
    if (!bySeriesId.has(e.seriesId)) bySeriesId.set(e.seriesId, []);
    bySeriesId.get(e.seriesId).push(e);
  }

  const report = [];
  for (const [seriesId, group] of bySeriesId) {
    const dated = group.filter((e) => !isEmpty(e.deadline));
    if (dated.length === 0) continue; // all-pending series: nothing has run out yet

    const newest = dated.reduce((a, b) => (a.deadline > b.deadline ? a : b));
    const newestStatus = computeStatus(newest.deadline, newest.opensAt, today);
    if (newestStatus !== "expired" && newestStatus !== "closing-soon") continue;

    // Is there already another edition of this series covering the gap
    // (open/closing-soon/upcoming/pending)? If so, nothing to chase.
    const hasCoverage = group
      .filter((e) => e.slug !== newest.slug)
      .some((e) => {
        const s = isEmpty(e.deadline) ? "pending" : computeStatus(e.deadline, e.opensAt, today);
        return s !== "expired";
      });
    if (hasCoverage) continue;

    const days = daysUntil(newest.deadline, today);
    report.push({
      seriesId,
      slug: newest.slug,
      title: newest.title,
      deadline: newest.deadline,
      days,
      sortKey: newestStatus === "expired" ? days : 1000 + days,
    });
  }

  return report.sort((a, b) => a.sortKey - b.sortKey);
}

function implausibleSeriesIdReason(id) {
  if (isEmpty(id)) return "empty";
  if (/\b(19|20)\d{2}\b/.test(id)) return "contains a year";
  if (/[A-Z]/.test(id)) return "contains uppercase letters";
  if (/\s/.test(id)) return "contains whitespace";
  return null;
}

function main() {
  const today = new Date();

  let entries;
  try {
    entries = loadCompetitions();
  } catch (err) {
    console.error(`ERROR: ${err.message}`);
    process.exit(1);
  }

  const missingFieldsReport = [];
  const statusMismatchReport = [];
  const urlSeen = new Map();
  const exactUrlDupes = [];
  const titleOrgSeen = new Map();
  const fuzzyDupes = [];
  const implausibleSeriesIds = [];
  const pendingEntries = [];
  const opensAtContradictions = [];
  const opensAtInvalidFormat = [];
  const farOutWithoutOpensAt = [];

  entries.forEach((entry, i) => {
    const key = entry.slug || entry.id || `#${i}`;

    // 1. Missing/empty required fields (deadline/resultDate excused on "pending")
    const missing = missingRequiredFields(entry, REQUIRED_FIELDS.concat(DATE_FIELDS));
    if (missing.length > 0) {
      missingFieldsReport.push({ key, missing });
    }

    // 2. Stored status vs. live-computed status (deadline/opensAt vs. today)
    if (!isEmpty(entry.status)) {
      const live = isEmpty(entry.deadline) ? "pending" : computeStatus(entry.deadline, entry.opensAt, today);
      if (live !== entry.status) {
        statusMismatchReport.push({ key, deadline: entry.deadline, storedStatus: entry.status, liveStatus: live });
      }
    }

    // 3a. Exact duplicate registrationUrl
    if (!isEmpty(entry.registrationUrl)) {
      const url = entry.registrationUrl.trim().replace(/\/+$/, "");
      if (urlSeen.has(url)) {
        exactUrlDupes.push({ a: urlSeen.get(url), b: key, url });
      } else {
        urlSeen.set(url, key);
      }
    }

    // 3b. Fuzzy duplicate on normalized title+organizer — different editions
    // of the same series (same seriesId) are never dupes, no matter how
    // close their normalized title+organizer key is.
    const norm = normalizeTitleOrganizer(entry.title, entry.organizer);
    if (norm !== "|") {
      const prior = titleOrgSeen.get(norm);
      if (prior && (isEmpty(entry.seriesId) || prior.seriesId !== entry.seriesId)) {
        fuzzyDupes.push({ a: prior.key, b: key });
      }
      if (!prior) titleOrgSeen.set(norm, { key, seriesId: entry.seriesId });
    }

    // 4b. Missing/implausible seriesId
    const reason = implausibleSeriesIdReason(entry.seriesId);
    if (reason) implausibleSeriesIds.push({ key, seriesId: entry.seriesId, reason });

    // 4c. Pending entries (simple list — see project notes on why not
    // git-blame-based staleness detection for now)
    if (isEmpty(entry.deadline)) pendingEntries.push({ key, title: entry.title });

    // Addendum: opensAt sanity checks
    if (!isEmpty(entry.opensAt)) {
      if (!DATE_RE.test(entry.opensAt)) {
        opensAtInvalidFormat.push({ key, opensAt: entry.opensAt });
      } else if (!isEmpty(entry.deadline) && entry.opensAt > entry.deadline) {
        opensAtContradictions.push({ key, opensAt: entry.opensAt, deadline: entry.deadline });
      }
    }

    // Addendum: informational — deadline far out and opensAt not researched
    // yet. Not an error, just the worklist for the next research pass.
    if (!isEmpty(entry.deadline) && isEmpty(entry.opensAt)) {
      const days = daysUntil(entry.deadline, today);
      if (days > FAR_OUT_DAYS) farOutWithoutOpensAt.push({ key, deadline: entry.deadline, days });
    }
  });

  const seriesGaps = seriesWithoutCurrentEdition(entries, today);

  console.log("=".repeat(60));
  console.log("AwardWatch — competitions.json audit");
  console.log(`Run at: ${today.toISOString()}`);
  console.log(`File: ${DATA_PATH}`);
  console.log("=".repeat(60));
  console.log(`\nTotal entries: ${entries.length}\n`);

  console.log(`--- Series without a current edition (${seriesGaps.length}) ---`);
  console.log("This is the research worklist: each series below has no open/closing-soon/upcoming/pending edition.");
  if (seriesGaps.length === 0) {
    console.log("None. Every series has a live or pending edition.");
  } else {
    for (const g of seriesGaps) {
      const status = g.days < 0 ? `expired ${-g.days}d ago` : `closes in ${g.days}d`;
      console.log(`  - [${g.seriesId}] "${g.title}" (${g.slug}): deadline ${g.deadline}, ${status}`);
    }
  }

  console.log(`\n--- Missing/empty required fields (${missingFieldsReport.length}) ---`);
  if (missingFieldsReport.length === 0) {
    console.log("None. All entries have every required field filled in.");
  } else {
    for (const r of missingFieldsReport) {
      console.log(`  - ${r.key}: missing [${r.missing.join(", ")}]`);
    }
  }

  console.log(`\n--- Missing/implausible seriesId (${implausibleSeriesIds.length}) ---`);
  if (implausibleSeriesIds.length === 0) {
    console.log("None.");
  } else {
    for (const r of implausibleSeriesIds) {
      console.log(`  - ${r.key}: seriesId "${r.seriesId ?? ""}" — ${r.reason}`);
    }
  }

  console.log(`\n--- Pending entries (no confirmed deadline) (${pendingEntries.length}) ---`);
  console.log("Worth a periodic real-world check so none of these sit stale indefinitely.");
  if (pendingEntries.length === 0) {
    console.log("None.");
  } else {
    for (const r of pendingEntries) {
      console.log(`  - ${r.key}: "${r.title}"`);
    }
  }

  console.log(`\n--- Stored status vs. live-computed status (${statusMismatchReport.length}) ---`);
  if (statusMismatchReport.length === 0) {
    console.log("None. Every stored status matches what deadline/opensAt compute to today.");
  } else {
    for (const r of statusMismatchReport) {
      console.log(`  - ${r.key}: deadline ${r.deadline ?? "null"}, stored "${r.storedStatus}" -> live "${r.liveStatus}"`);
    }
  }

  console.log(`\n--- opensAt after deadline — contradictory (${opensAtContradictions.length}) ---`);
  if (opensAtContradictions.length === 0) {
    console.log("None.");
  } else {
    for (const r of opensAtContradictions) {
      console.log(`  - ${r.key}: opensAt ${r.opensAt} is after deadline ${r.deadline}`);
    }
  }

  console.log(`\n--- opensAt set but not a valid YYYY-MM-DD date (${opensAtInvalidFormat.length}) ---`);
  if (opensAtInvalidFormat.length === 0) {
    console.log("None.");
  } else {
    for (const r of opensAtInvalidFormat) {
      console.log(`  - ${r.key}: opensAt "${r.opensAt}"`);
    }
  }

  console.log(`\n--- Exact duplicate registrationUrl (${exactUrlDupes.length}) ---`);
  if (exactUrlDupes.length === 0) {
    console.log("None found.");
  } else {
    for (const d of exactUrlDupes) {
      console.log(`  - "${d.a}" and "${d.b}" share URL: ${d.url}`);
    }
  }

  console.log(`\n--- Possible duplicates by title+organizer (${fuzzyDupes.length}) ---`);
  console.log("Entries sharing a seriesId are excluded — they're editions of the same series, not dupes.");
  if (fuzzyDupes.length === 0) {
    console.log("None found.");
  } else {
    for (const d of fuzzyDupes) {
      console.log(`  - "${d.a}" and "${d.b}" look like the same competition (fuzzy match)`);
    }
  }

  console.log(`\n--- Informational: deadline >6 months out, opensAt not yet researched (${farOutWithoutOpensAt.length}) ---`);
  console.log("Not an error — the worklist for a targeted opensAt research pass.");
  if (farOutWithoutOpensAt.length === 0) {
    console.log("None.");
  } else {
    for (const r of farOutWithoutOpensAt) {
      console.log(`  - ${r.key}: deadline ${r.deadline} (in ${r.days}d)`);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total entries:                        ${entries.length}`);
  console.log(`Series without a current edition:     ${seriesGaps.length}`);
  console.log(`Entries with missing fields:          ${missingFieldsReport.length}`);
  console.log(`Missing/implausible seriesId:         ${implausibleSeriesIds.length}`);
  console.log(`Pending entries:                      ${pendingEntries.length}`);
  console.log(`Stored/live status mismatches:        ${statusMismatchReport.length}`);
  console.log(`opensAt contradictions:               ${opensAtContradictions.length}`);
  console.log(`opensAt invalid format:               ${opensAtInvalidFormat.length}`);
  console.log(`Exact URL duplicates:                 ${exactUrlDupes.length}`);
  console.log(`Possible fuzzy duplicates:             ${fuzzyDupes.length}`);
  console.log(`Far-out deadlines missing opensAt:    ${farOutWithoutOpensAt.length}`);
  console.log("\nThis is a read-only report. No files were modified.");
}

main();
