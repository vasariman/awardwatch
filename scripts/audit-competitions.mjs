#!/usr/bin/env node
// Read-only audit of /data/competitions.json. Never writes/modifies the file.
import {
  DATA_PATH,
  REQUIRED_FIELDS,
  isEmpty,
  daysUntil,
  normalizeTitleOrganizer,
  loadCompetitions,
} from "./lib/util.mjs";

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

  entries.forEach((entry, i) => {
    const key = entry.slug || entry.id || `#${i}`;

    // 1. Missing/empty required fields
    const missing = REQUIRED_FIELDS.filter((f) => isEmpty(entry[f]));
    if (missing.length > 0) {
      missingFieldsReport.push({ key, missing });
    }

    // 2. Deadline passed but status still "open"/"closing-soon"
    if (!isEmpty(entry.deadline) && !isEmpty(entry.status)) {
      const days = daysUntil(entry.deadline, today);
      if (days < 0 && entry.status !== "expired") {
        statusMismatchReport.push({
          key,
          deadline: entry.deadline,
          currentStatus: entry.status,
          daysPast: -days,
        });
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

    // 3b. Fuzzy duplicate on normalized title+organizer
    const norm = normalizeTitleOrganizer(entry.title, entry.organizer);
    if (norm !== "|") {
      if (titleOrgSeen.has(norm)) {
        fuzzyDupes.push({ a: titleOrgSeen.get(norm), b: key });
      } else {
        titleOrgSeen.set(norm, key);
      }
    }
  });

  console.log("=".repeat(60));
  console.log("AwardWatch — competitions.json audit");
  console.log(`Run at: ${today.toISOString()}`);
  console.log(`File: ${DATA_PATH}`);
  console.log("=".repeat(60));
  console.log(`\nTotal entries: ${entries.length}\n`);

  console.log(`--- Missing/empty required fields (${missingFieldsReport.length}) ---`);
  if (missingFieldsReport.length === 0) {
    console.log("None. All entries have every required field filled in.");
  } else {
    for (const r of missingFieldsReport) {
      console.log(`  - ${r.key}: missing [${r.missing.join(", ")}]`);
    }
  }

  console.log(`\n--- Status/deadline mismatches (${statusMismatchReport.length}) ---`);
  if (statusMismatchReport.length === 0) {
    console.log("None. No entry has a past deadline while still marked open/closing-soon.");
  } else {
    for (const r of statusMismatchReport) {
      console.log(
        `  - ${r.key}: deadline ${r.deadline} (${r.daysPast}d past), status is "${r.currentStatus}" -> should likely be "expired"`
      );
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
  if (fuzzyDupes.length === 0) {
    console.log("None found.");
  } else {
    for (const d of fuzzyDupes) {
      console.log(`  - "${d.a}" and "${d.b}" look like the same competition (fuzzy match)`);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total entries:                     ${entries.length}`);
  console.log(`Entries with missing fields:       ${missingFieldsReport.length}`);
  console.log(`Entries needing status correction: ${statusMismatchReport.length}`);
  console.log(`Exact URL duplicates:               ${exactUrlDupes.length}`);
  console.log(`Possible fuzzy duplicates:          ${fuzzyDupes.length}`);
  console.log("\nThis is a read-only report. No files were modified.");
}

main();
