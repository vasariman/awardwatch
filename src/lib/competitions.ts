import raw from "@data/competitions.json";
import type { Competition } from "./types";

const COMPETITIONS = raw as Competition[];

export function getAllCompetitions(): Competition[] {
  return COMPETITIONS;
}

export function getCompetitionBySlug(slug: string): Competition | undefined {
  return COMPETITIONS.find((c) => c.slug === slug);
}

export function getHeroCompetitions(count = 5): Competition[] {
  return [...COMPETITIONS]
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

export function daysUntil(iso: string, today = new Date()): number {
  const target = new Date(iso + "T00:00:00Z");
  const start = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  );
  return Math.round((target.getTime() - start.getTime()) / 86400000);
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
