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
// from `deadline` against the current date, so the site can never show a
// competition as "open"/"closing-soon" after its deadline has passed.
// The stored field still matters for scripts/lib/util.mjs (audit/merge
// tooling operates on the raw file directly), just not for what renders.
function computeStatus(deadline: string, today: Date): Status {
  const days = daysUntil(deadline, today);
  if (days < 0) return "expired";
  if (days <= CLOSING_SOON_WINDOW_DAYS) return "closing-soon";
  return "open";
}

function withLiveStatus(competitions: Competition[]): Competition[] {
  const today = new Date();
  return competitions.map((c) => ({ ...c, status: computeStatus(c.deadline, today) }));
}

export function getAllCompetitions(): Competition[] {
  return withLiveStatus(RAW_COMPETITIONS);
}

export function getCompetitionBySlug(slug: string): Competition | undefined {
  return getAllCompetitions().find((c) => c.slug === slug);
}

export function getHeroCompetitions(count = 5): Competition[] {
  return getAllCompetitions()
    .filter((c) => c.status !== "expired")
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .slice(0, count);
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
  return "Expired";
}

export function audienceLabel(audience: Competition["targetAudience"]): string {
  if (audience === "students") return "Students";
  if (audience === "professionals") return "Professionals";
  return "Open";
}
