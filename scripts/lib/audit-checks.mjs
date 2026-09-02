// Pure data-quality checks over a competitions array. Each function takes
// `entries` (+ `today` where date-relative) and returns plain finding
// objects — no console output, no file I/O. This is the single source of
// truth for what "wrong" looks like: scripts/audit-competitions.mjs (the
// CLI) and the local-only admin page both import from here, so the two
// views can never drift apart.
import {
  DATE_RE,
  isEmpty,
  daysUntil,
  computeStatus,
  normalizeTitleOrganizer,
  missingRequiredFields,
} from "./util.mjs";

const FAR_OUT_DAYS = 182; // ~6 months

// Every series' newest edition is expired or closing-soon, with no other
// edition (open/closing-soon/upcoming/pending) covering the gap.
export function findSeriesWithoutCurrentEdition(entries, today) {
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

export function findImplausibleSeriesIds(entries) {
  const report = [];
  for (const e of entries) {
    const reason = implausibleSeriesIdReason(e.seriesId);
    if (reason) report.push({ slug: e.slug, title: e.title, seriesId: e.seriesId ?? "", reason });
  }
  return report;
}

export function findMissingFields(entries, requiredFields) {
  const report = [];
  for (const entry of entries) {
    const missing = missingRequiredFields(entry, requiredFields);
    if (missing.length > 0) {
      report.push({ slug: entry.slug || "(no slug)", title: entry.title, missing });
    }
  }
  return report;
}

export function findPendingEntries(entries) {
  return entries
    .filter((e) => isEmpty(e.deadline))
    .map((e) => ({ slug: e.slug, title: e.title, expectedPeriod: e.expectedPeriod ?? null }));
}

// Stored `status` vs. what deadline/opensAt actually compute to today.
export function findStatusMismatches(entries, today) {
  const report = [];
  for (const entry of entries) {
    if (isEmpty(entry.status)) continue;
    const live = isEmpty(entry.deadline) ? "pending" : computeStatus(entry.deadline, entry.opensAt, today);
    if (live !== entry.status) {
      report.push({ slug: entry.slug, title: entry.title, deadline: entry.deadline, storedStatus: entry.status, liveStatus: live });
    }
  }
  return report;
}

export function findOpensAtContradictions(entries) {
  const report = [];
  for (const entry of entries) {
    if (isEmpty(entry.opensAt) || !DATE_RE.test(entry.opensAt)) continue;
    if (!isEmpty(entry.deadline) && entry.opensAt > entry.deadline) {
      report.push({ slug: entry.slug, title: entry.title, opensAt: entry.opensAt, deadline: entry.deadline });
    }
  }
  return report;
}

export function findOpensAtInvalidFormat(entries) {
  const report = [];
  for (const entry of entries) {
    if (!isEmpty(entry.opensAt) && !DATE_RE.test(entry.opensAt)) {
      report.push({ slug: entry.slug, title: entry.title, opensAt: entry.opensAt });
    }
  }
  return report;
}

export function findExactUrlDuplicates(entries) {
  const seen = new Map();
  const dupes = [];
  for (const entry of entries) {
    if (isEmpty(entry.registrationUrl)) continue;
    const url = entry.registrationUrl.trim().replace(/\/+$/, "");
    if (seen.has(url)) {
      dupes.push({ a: seen.get(url), b: entry.slug, url });
    } else {
      seen.set(url, entry.slug);
    }
  }
  return dupes;
}

// Entries sharing a seriesId are different editions of the same series,
// never dupes, no matter how close their normalized title+organizer is.
export function findFuzzyDuplicates(entries) {
  const seen = new Map();
  const dupes = [];
  for (const entry of entries) {
    const norm = normalizeTitleOrganizer(entry.title, entry.organizer);
    if (norm === "|") continue;
    const prior = seen.get(norm);
    if (prior && (isEmpty(entry.seriesId) || prior.seriesId !== entry.seriesId)) {
      dupes.push({ a: prior.slug, b: entry.slug });
    }
    if (!prior) seen.set(norm, { slug: entry.slug, seriesId: entry.seriesId });
  }
  return dupes;
}

// Informational, not an error: the worklist for a targeted opensAt pass.
export function findFarOutWithoutOpensAt(entries, today) {
  const report = [];
  for (const entry of entries) {
    if (isEmpty(entry.deadline) || !isEmpty(entry.opensAt)) continue;
    const days = daysUntil(entry.deadline, today);
    if (days > FAR_OUT_DAYS) {
      report.push({ slug: entry.slug, title: entry.title, deadline: entry.deadline, days });
    }
  }
  return report;
}

// Entries published with fields that were still an honest placeholder at
// merge time (see sourcingNotes' doc comment in src/lib/types.ts).
export function findUnconfirmedPublishedFields(entries) {
  const report = [];
  for (const entry of entries) {
    if (isEmpty(entry.sourcingNotes)) continue;
    report.push({ slug: entry.slug, title: entry.title, notes: entry.sourcingNotes });
  }
  return report;
}
