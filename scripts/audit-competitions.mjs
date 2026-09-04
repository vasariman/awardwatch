#!/usr/bin/env node
// Read-only audit of /data/competitions.json. Never writes/modifies the file.
// All the actual detection logic lives in scripts/lib/audit-checks.mjs —
// this file only loads data and formats the findings for the terminal. The
// local admin page (src/app/admin/page.tsx) imports the same functions, so
// the two views can never disagree with each other.
import { DATA_PATH, REQUIRED_FIELDS, DATE_FIELDS, loadCompetitions } from "./lib/util.mjs";
import {
  findSeriesWithNoCoverage,
  findSeriesClosingSoonWithoutSuccessor,
  findImplausibleSeriesIds,
  findMissingFields,
  findPendingEntries,
  findStatusMismatches,
  findOpensAtContradictions,
  findOpensAtInvalidFormat,
  findExactUrlDuplicates,
  findFuzzyDuplicates,
  findFarOutWithoutOpensAt,
  findUnconfirmedPublishedFields,
} from "./lib/audit-checks.mjs";

function main() {
  const today = new Date();

  let entries;
  try {
    entries = loadCompetitions();
  } catch (err) {
    console.error(`ERROR: ${err.message}`);
    process.exit(1);
  }

  const seriesNoCoverage = findSeriesWithNoCoverage(entries, today);
  const seriesClosingSoonNoSuccessor = findSeriesClosingSoonWithoutSuccessor(entries, today);
  const missingFieldsReport = findMissingFields(entries, REQUIRED_FIELDS.concat(DATE_FIELDS));
  const implausibleSeriesIds = findImplausibleSeriesIds(entries);
  const pendingEntries = findPendingEntries(entries);
  const statusMismatchReport = findStatusMismatches(entries, today);
  const opensAtContradictions = findOpensAtContradictions(entries);
  const opensAtInvalidFormat = findOpensAtInvalidFormat(entries);
  const exactUrlDupes = findExactUrlDuplicates(entries);
  const fuzzyDupes = findFuzzyDuplicates(entries);
  const farOutWithoutOpensAt = findFarOutWithoutOpensAt(entries, today);
  const unconfirmedPublished = findUnconfirmedPublishedFields(entries);

  console.log("=".repeat(60));
  console.log("AwardWatch — competitions.json audit");
  console.log(`Run at: ${today.toISOString()}`);
  console.log(`File: ${DATA_PATH}`);
  console.log("=".repeat(60));
  console.log(`\nTotal entries: ${entries.length}\n`);

  console.log(`--- Series with no current edition (${seriesNoCoverage.length}) ---`);
  console.log("Newest edition has expired and nothing (open/closing-soon/upcoming/pending) covers it. A genuine dead end.");
  if (seriesNoCoverage.length === 0) {
    console.log("None.");
  } else {
    for (const g of seriesNoCoverage) {
      console.log(`  - [${g.seriesId}] "${g.title}" (${g.slug}): deadline ${g.deadline}, expired ${-g.days}d ago`);
    }
  }

  console.log(`\n--- Series closing soon, no successor queued (${seriesClosingSoonNoSuccessor.length}) ---`);
  console.log("Newest edition is still live (closing-soon) but nothing is queued to follow it. Proactive heads-up, not a dead end yet.");
  if (seriesClosingSoonNoSuccessor.length === 0) {
    console.log("None.");
  } else {
    for (const g of seriesClosingSoonNoSuccessor) {
      console.log(`  - [${g.seriesId}] "${g.title}" (${g.slug}): deadline ${g.deadline}, closes in ${g.days}d`);
    }
  }

  console.log(`\n--- Missing/empty required fields (${missingFieldsReport.length}) ---`);
  if (missingFieldsReport.length === 0) {
    console.log("None. All entries have every required field filled in.");
  } else {
    for (const r of missingFieldsReport) {
      console.log(`  - ${r.slug}: missing [${r.missing.join(", ")}]`);
    }
  }

  console.log(`\n--- Missing/implausible seriesId (${implausibleSeriesIds.length}) ---`);
  if (implausibleSeriesIds.length === 0) {
    console.log("None.");
  } else {
    for (const r of implausibleSeriesIds) {
      console.log(`  - ${r.slug}: seriesId "${r.seriesId}" — ${r.reason}`);
    }
  }

  console.log(`\n--- Pending entries (no confirmed deadline) (${pendingEntries.length}) ---`);
  console.log("Worth a periodic real-world check so none of these sit stale indefinitely.");
  if (pendingEntries.length === 0) {
    console.log("None.");
  } else {
    for (const r of pendingEntries) {
      console.log(`  - ${r.slug}: "${r.title}"`);
    }
  }

  console.log(`\n--- Live entries with unconfirmed (sourcingNotes) fields (${unconfirmedPublished.length}) ---`);
  console.log("Worklist for a research pass: these fields were still an honest placeholder at merge time.");
  if (unconfirmedPublished.length === 0) {
    console.log("None.");
  } else {
    for (const r of unconfirmedPublished) {
      console.log(`  - [${r.slug}] "${r.title}": ${Object.keys(r.notes).join(", ")}`);
    }
  }

  console.log(`\n--- Stored status vs. live-computed status (${statusMismatchReport.length}) ---`);
  if (statusMismatchReport.length === 0) {
    console.log("None. Every stored status matches what deadline/opensAt compute to today.");
  } else {
    for (const r of statusMismatchReport) {
      console.log(`  - ${r.slug}: deadline ${r.deadline ?? "null"}, stored "${r.storedStatus}" -> live "${r.liveStatus}"`);
    }
  }

  console.log(`\n--- opensAt after deadline — contradictory (${opensAtContradictions.length}) ---`);
  if (opensAtContradictions.length === 0) {
    console.log("None.");
  } else {
    for (const r of opensAtContradictions) {
      console.log(`  - ${r.slug}: opensAt ${r.opensAt} is after deadline ${r.deadline}`);
    }
  }

  console.log(`\n--- opensAt set but not a valid YYYY-MM-DD date (${opensAtInvalidFormat.length}) ---`);
  if (opensAtInvalidFormat.length === 0) {
    console.log("None.");
  } else {
    for (const r of opensAtInvalidFormat) {
      console.log(`  - ${r.slug}: opensAt "${r.opensAt}"`);
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
      console.log(`  - ${r.slug}: deadline ${r.deadline} (in ${r.days}d)`);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total entries:                        ${entries.length}`);
  console.log(`Series with no current edition:       ${seriesNoCoverage.length}`);
  console.log(`Series closing soon, no successor:    ${seriesClosingSoonNoSuccessor.length}`);
  console.log(`Entries with missing fields:          ${missingFieldsReport.length}`);
  console.log(`Missing/implausible seriesId:         ${implausibleSeriesIds.length}`);
  console.log(`Pending entries:                      ${pendingEntries.length}`);
  console.log(`Live entries with unconfirmed fields: ${unconfirmedPublished.length}`);
  console.log(`Stored/live status mismatches:        ${statusMismatchReport.length}`);
  console.log(`opensAt contradictions:               ${opensAtContradictions.length}`);
  console.log(`opensAt invalid format:               ${opensAtInvalidFormat.length}`);
  console.log(`Exact URL duplicates:                 ${exactUrlDupes.length}`);
  console.log(`Possible fuzzy duplicates:             ${fuzzyDupes.length}`);
  console.log(`Far-out deadlines missing opensAt:    ${farOutWithoutOpensAt.length}`);
  console.log("\nThis is a read-only report. No files were modified.");
}

main();
