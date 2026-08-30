import raw from "@data/competitions.json";
import type { Competition, Status } from "./types";

const RAW_COMPETITIONS = raw as Competition[];

const CLOSING_SOON_WINDOW_DAYS = 45;

export function daysUntil(iso: string, today = new Date()): number {
  const target = new Date(iso + "T00:00:00Z");
  const start = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  );
  return Math.round((target.getTime() - start.getTime()) / 86400000);
}

// The `status` field stored in competitions.json is only corrected when
// someone manually runs `npm run merge` or `npm run audit:data` — it can
// go stale between runs (e.g. a deadline passing without anyone noticing).
// Rather than trust that stored value, every read here recomputes status
// from `deadline`/`opensAt` against the current date, so the site can never
// show a competition as "open"/"closing-soon" after its deadline has
// passed, or as submittable before it has actually opened.
// The stored field still matters for scripts/lib/util.mjs (audit/merge
// tooling operates on the raw file directly), just not for what renders.
//
// Check order matters and is deliberate:
//   1. no deadline at all              -> "pending" (nothing else is known)
//   2. deadline has passed             -> "expired"
//   3. opensAt is set and still future -> "upcoming" (can't submit yet,
//      even if the deadline itself is soon)
//   4. deadline is within the window   -> "closing-soon"
//   5. otherwise                       -> "open"
function computeStatus(deadline: string | null, opensAt: string | null | undefined, today: Date): Status {
  if (deadline === null) return "pending";
  const days = daysUntil(deadline, today);
  if (days < 0) return "expired";
  if (opensAt && daysUntil(opensAt, today) > 0) return "upcoming";
  if (days <= CLOSING_SOON_WINDOW_DAYS) return "closing-soon";
  return "open";
}

function withLiveStatus(competitions: Competition[]): Competition[] {
  const today = new Date();
  return competitions.map((c) => ({
    ...c,
    status: computeStatus(c.deadline, c.opensAt, today),
  }));
}

// Sort key for listing competitions by urgency: competitions with a real
// deadline (open/closing-soon/upcoming) first by deadline ascending, then
// expired ones (also dated, so still comparable), then pending ones last —
// they have no deadline to compare by, so they keep their existing order
// relative to each other.
function urgencyRank(c: Competition): 0 | 1 | 2 {
  if (c.status === "pending") return 2;
  if (c.status === "expired") return 1;
  return 0;
}

export function compareByUrgency(a: Competition, b: Competition): number {
  const ra = urgencyRank(a);
  const rb = urgencyRank(b);
  if (ra !== rb) return ra - rb;
  if (ra === 2) return 0;
  return (a.deadline as string).localeCompare(b.deadline as string);
}

export function getAllCompetitions(): Competition[] {
  return withLiveStatus(RAW_COMPETITIONS);
}

export function getCompetitionBySlug(slug: string): Competition | undefined {
  return getAllCompetitions().find((c) => c.slug === slug);
}

// The hero shows what a visitor can act on right now, so it excludes both
// "expired" (deadline passed) and "pending"/"upcoming" (can't submit yet).
export function getHeroCompetitions(count = 5): Competition[] {
  return getAllCompetitions()
    .filter((c) => c.status === "open" || c.status === "closing-soon")
    .sort(compareByUrgency)
    .slice(0, count);
}

// For an expired competition, finds the next edition of the same series
// (matched purely by `seriesId`, set once during research/migration and
// never re-derived from the title), so an old detail page can point
// readers to where the deadline moved. A missing/empty `seriesId` never
// matches anything — otherwise every edition still missing the field would
// spuriously match every other one.
// Prefers a dated successor (open/closing-soon/upcoming) over a "pending"
// one — an announced-but-undated edition is still useful to link to, but
// only once no dated edition exists.
export function getSuccessorCompetition(item: Competition): Competition | undefined {
  if (!item.seriesId) return undefined;

  const candidates = getAllCompetitions().filter(
    (c) =>
      c.slug !== item.slug &&
      c.seriesId === item.seriesId &&
      (c.status === "open" || c.status === "closing-soon" || c.status === "upcoming" || c.status === "pending")
  );

  const dated = candidates
    .filter((c) => c.deadline !== null)
    .sort((a, b) => (a.deadline as string).localeCompare(b.deadline as string));
  if (dated.length > 0) return dated[0];

  return candidates.find((c) => c.status === "pending");
}

// For a "pending" edition (no confirmed deadline yet), finds the most
// recent past edition of the same series, purely as orientation for the
// reader ("last time it was in November") — never used to compute or
// suggest a date for the pending edition itself.
export function getPriorEdition(item: Competition): Competition | undefined {
  if (!item.seriesId) return undefined;

  const priorEditions = getAllCompetitions().filter(
    (c) => c.slug !== item.slug && c.seriesId === item.seriesId && c.deadline !== null
  );

  return priorEditions.sort((a, b) => (b.deadline as string).localeCompare(a.deadline as string))[0];
}

export function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function statusLabel(status: Competition["status"]): string {
  if (status === "open") return "Open";
  if (status === "closing-soon") return "Closing soon";
  if (status === "upcoming") return "Upcoming";
  if (status === "pending") return "Dates TBA";
  return "Expired";
}

export function audienceLabel(audience: Competition["targetAudience"]): string {
  if (audience === "students") return "Students";
  if (audience === "professionals") return "Professionals";
  return "Open";
}
