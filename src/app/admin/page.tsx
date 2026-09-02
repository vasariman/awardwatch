import { existsSync, readFileSync } from "node:fs";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { CopyButton } from "@/components/CopyButton";
import {
  loadCompetitions,
  INCOMING_COMPETITIONS_PATH,
  REQUIRED_FIELDS,
  DATE_FIELDS,
} from "../../../scripts/lib/util.mjs";
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
} from "../../../scripts/lib/audit-checks.mjs";

// Never exists outside `npm run dev` — a production build always sets
// NODE_ENV=production, so this 404s in every real deployment even if the
// branch ever gets merged. No auth needed: it simply isn't reachable.
export const dynamic = "force-dynamic";

type Candidate = Record<string, unknown> & { slug?: string; title?: string };
type Entry = Record<string, unknown>;

function loadIncomingCandidates(): Candidate[] {
  if (!existsSync(INCOMING_COMPETITIONS_PATH)) return [];
  try {
    const raw = readFileSync(INCOMING_COMPETITIONS_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

type CheckSection = {
  key: string;
  title: string;
  subtitle?: string;
  count: number;
  rows: ReactNode;
  copyText: string;
};

function Row({
  slug,
  title,
  registrationUrl,
  detail,
  linkToDetail = true,
}: {
  slug?: string;
  title?: string;
  registrationUrl?: string;
  detail: ReactNode;
  /** false for entries that aren't published yet (no detail page to link to). */
  linkToDetail?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-black/10 py-2.5 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          {slug && linkToDetail ? (
            <Link
              href={`/competitions/${slug}`}
              className="font-sans text-sm font-bold text-ink no-underline hover:underline"
            >
              {title || slug}
            </Link>
          ) : (
            <span className="font-sans text-sm font-bold text-ink">{title || slug || "(untitled)"}</span>
          )}
          <span className="font-mono text-xs text-black/40">{slug}</span>
        </div>
        <div className="mt-0.5 font-mono text-xs text-black/60">{detail}</div>
      </div>
      {registrationUrl && (
        <a
          href={registrationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 font-mono text-xs font-bold text-accent no-underline hover:underline"
        >
          Source →
        </a>
      )}
    </div>
  );
}

function SectionBlock({ section }: { section: CheckSection }) {
  return (
    <div className="mt-8 border-t-2 border-ink pt-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h2 className="font-sans text-xl font-black tracking-[-0.02em] text-ink">{section.title}</h2>
          <span className="inline-block bg-accent px-2 py-0.5 font-mono text-xs font-bold text-white">
            {section.count}
          </span>
        </div>
        <CopyButton text={section.copyText} />
      </div>
      {section.subtitle && <p className="mt-1.5 font-sans text-sm text-black/50">{section.subtitle}</p>}
      <div className="mt-4">{section.rows}</div>
    </div>
  );
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();

  const sp = await searchParams;
  const entries: Entry[] = loadCompetitions();
  const today = new Date();
  const bySlug = new Map(entries.map((e) => [e.slug, e]));
  const publishedSlugs = new Set(entries.map((e) => e.slug));

  const registrationUrlOf = (slug: string) => {
    const e = bySlug.get(slug);
    return e && typeof e.registrationUrl === "string" ? e.registrationUrl : undefined;
  };

  // Mirrors Step 1a of the weekly research routine: a candidate whose
  // slug is already published was already reviewed and merged for real —
  // the incoming file just hasn't been cleared since (it isn't
  // automatically).
  const incoming = loadIncomingCandidates().filter(
    (c) => typeof c.slug !== "string" || !publishedSlugs.has(c.slug)
  );
  const seriesNoCoverage = findSeriesWithNoCoverage(entries, today) as Array<{
    seriesId: string; slug: string; title: string; deadline: string; days: number;
  }>;
  const seriesClosingSoon = findSeriesClosingSoonWithoutSuccessor(entries, today) as typeof seriesNoCoverage;
  const missingFields = findMissingFields(entries, REQUIRED_FIELDS.concat(DATE_FIELDS)) as Array<{
    slug: string; title: string; missing: string[];
  }>;
  const implausibleSeriesIds = findImplausibleSeriesIds(entries) as Array<{
    slug: string; title: string; seriesId: string; reason: string;
  }>;
  const pendingEntries = findPendingEntries(entries) as Array<{
    slug: string; title: string; expectedPeriod: string | null;
  }>;
  const statusMismatches = findStatusMismatches(entries, today) as Array<{
    slug: string; title: string; deadline: string | null; storedStatus: string; liveStatus: string;
  }>;
  const opensAtContradictions = findOpensAtContradictions(entries) as Array<{
    slug: string; title: string; opensAt: string; deadline: string;
  }>;
  const opensAtInvalidFormat = findOpensAtInvalidFormat(entries) as Array<{
    slug: string; title: string; opensAt: string;
  }>;
  const exactUrlDupes = findExactUrlDuplicates(entries) as Array<{ a: string; b: string; url: string }>;
  const fuzzyDupes = findFuzzyDuplicates(entries) as Array<{ a: string; b: string }>;
  const farOutWithoutOpensAt = findFarOutWithoutOpensAt(entries, today) as Array<{
    slug: string; title: string; deadline: string; days: number;
  }>;
  const unconfirmedPublished = findUnconfirmedPublishedFields(entries) as Array<{
    slug: string; title: string; notes: Record<string, string>;
  }>;

  const sections: CheckSection[] = [
    {
      key: "incoming",
      title: "Zur Freigabe",
      subtitle: "Candidates in data/incoming-competitions.json — not yet run through npm run merge.",
      count: incoming.length,
      copyText: incoming
        .map((c) => `- ${c.title ?? c.slug} (${c.slug}): ${c.organizer ?? ""}, deadline ${c.deadline ?? "null"}`)
        .join("\n"),
      rows: incoming.map((c, i) => (
        <Row
          key={c.slug ?? i}
          slug={typeof c.slug === "string" ? c.slug : undefined}
          title={typeof c.title === "string" ? c.title : undefined}
          registrationUrl={typeof c.registrationUrl === "string" ? c.registrationUrl : undefined}
          linkToDetail={false}
          detail={
            <>
              {String(c.organizer ?? "")} · deadline {String(c.deadline ?? "null")} · status {String(c.status ?? "")}
              {c.sourcingNotes && typeof c.sourcingNotes === "object" && (
                <div className="mt-1 text-accent">
                  unconfirmed: {Object.keys(c.sourcingNotes as object).join(", ")}
                </div>
              )}
            </>
          }
        />
      )),
    },
    {
      key: "unconfirmed-published",
      title: "Published with unconfirmed fields",
      subtitle: "sourcingNotes survived the merge — still a placeholder when this went live.",
      count: unconfirmedPublished.length,
      copyText: unconfirmedPublished
        .map((r) => `- ${r.title} (${r.slug}): ${Object.entries(r.notes).map(([f, n]) => `${f} — ${n}`).join("; ")}`)
        .join("\n"),
      rows: unconfirmedPublished.map((r) => (
        <Row
          key={r.slug}
          slug={r.slug}
          title={r.title}
          registrationUrl={registrationUrlOf(r.slug)}
          detail={
            <div className="flex flex-col gap-0.5">
              {Object.entries(r.notes).map(([field, note]) => (
                <div key={field}>
                  <span className="font-bold text-ink">{field}:</span> {note}
                </div>
              ))}
            </div>
          }
        />
      )),
    },
    {
      key: "series-no-coverage",
      title: "Series with no current edition",
      subtitle: "Newest edition has expired and nothing covers it — a genuine dead end.",
      count: seriesNoCoverage.length,
      copyText: seriesNoCoverage
        .map((g) => `- [${g.seriesId}] ${g.title} (${g.slug}): deadline ${g.deadline}, expired ${-g.days}d ago`)
        .join("\n"),
      rows: seriesNoCoverage.map((g) => (
        <Row
          key={g.slug}
          slug={g.slug}
          title={g.title}
          registrationUrl={registrationUrlOf(g.slug)}
          detail={<>[{g.seriesId}] deadline {g.deadline} · expired {-g.days}d ago</>}
        />
      )),
    },
    {
      key: "series-closing-soon",
      title: "Series closing soon, no successor queued",
      subtitle: "Still live (closing-soon) but nothing lined up to follow it — proactive, not a dead end yet.",
      count: seriesClosingSoon.length,
      copyText: seriesClosingSoon
        .map((g) => `- [${g.seriesId}] ${g.title} (${g.slug}): deadline ${g.deadline}, closes in ${g.days}d`)
        .join("\n"),
      rows: seriesClosingSoon.map((g) => (
        <Row
          key={g.slug}
          slug={g.slug}
          title={g.title}
          registrationUrl={registrationUrlOf(g.slug)}
          detail={<>[{g.seriesId}] deadline {g.deadline} · closes in {g.days}d</>}
        />
      )),
    },
    {
      key: "status-mismatch",
      title: "Stored vs. live status mismatch",
      subtitle: "Stored status in competitions.json no longer matches what deadline/opensAt compute to today.",
      count: statusMismatches.length,
      copyText: statusMismatches
        .map((r) => `- ${r.title} (${r.slug}): deadline ${r.deadline ?? "null"}, stored "${r.storedStatus}" -> live "${r.liveStatus}"`)
        .join("\n"),
      rows: statusMismatches.map((r) => (
        <Row
          key={r.slug}
          slug={r.slug}
          title={r.title}
          registrationUrl={registrationUrlOf(r.slug)}
          detail={<>deadline {r.deadline ?? "null"} · stored &quot;{r.storedStatus}&quot; → live &quot;{r.liveStatus}&quot;</>}
        />
      )),
    },
    {
      key: "missing-fields",
      title: "Missing required fields",
      count: missingFields.length,
      copyText: missingFields.map((r) => `- ${r.title} (${r.slug}): missing ${r.missing.join(", ")}`).join("\n"),
      rows: missingFields.map((r) => (
        <Row key={r.slug} slug={r.slug} title={r.title} registrationUrl={registrationUrlOf(r.slug)} detail={<>missing: {r.missing.join(", ")}</>} />
      )),
    },
    {
      key: "implausible-series-id",
      title: "Missing/implausible seriesId",
      count: implausibleSeriesIds.length,
      copyText: implausibleSeriesIds.map((r) => `- ${r.title} (${r.slug}): seriesId "${r.seriesId}" — ${r.reason}`).join("\n"),
      rows: implausibleSeriesIds.map((r) => (
        <Row key={r.slug} slug={r.slug} title={r.title} registrationUrl={registrationUrlOf(r.slug)} detail={<>seriesId &quot;{r.seriesId}&quot; — {r.reason}</>} />
      )),
    },
    {
      key: "pending",
      title: "Pending entries",
      subtitle: "No confirmed deadline — worth a periodic real-world recheck.",
      count: pendingEntries.length,
      copyText: pendingEntries.map((r) => `- ${r.title} (${r.slug}): ${r.expectedPeriod ?? "no expected period sourced"}`).join("\n"),
      rows: pendingEntries.map((r) => (
        <Row key={r.slug} slug={r.slug} title={r.title} registrationUrl={registrationUrlOf(r.slug)} detail={r.expectedPeriod ?? "no expected period sourced"} />
      )),
    },
    {
      key: "exact-url-dupes",
      title: "Exact duplicate registrationUrl",
      count: exactUrlDupes.length,
      copyText: exactUrlDupes.map((d) => `- ${d.a} <-> ${d.b}: ${d.url}`).join("\n"),
      rows: exactUrlDupes.map((d) => <Row key={`${d.a}-${d.b}`} title={`${d.a}  ↔  ${d.b}`} detail={d.url} />),
    },
    {
      key: "fuzzy-dupes",
      title: "Possible fuzzy duplicates",
      subtitle: "Same normalized title+organizer, different seriesId — same-series editions are excluded.",
      count: fuzzyDupes.length,
      copyText: fuzzyDupes.map((d) => `- ${d.a} <-> ${d.b}`).join("\n"),
      rows: fuzzyDupes.map((d) => <Row key={`${d.a}-${d.b}`} title={`${d.a}  ↔  ${d.b}`} detail="fuzzy title+organizer match" />),
    },
    {
      key: "opensat-contradictions",
      title: "opensAt after deadline (contradictory)",
      count: opensAtContradictions.length,
      copyText: opensAtContradictions.map((r) => `- ${r.title} (${r.slug}): opensAt ${r.opensAt} is after deadline ${r.deadline}`).join("\n"),
      rows: opensAtContradictions.map((r) => (
        <Row key={r.slug} slug={r.slug} title={r.title} registrationUrl={registrationUrlOf(r.slug)} detail={<>opensAt {r.opensAt} is after deadline {r.deadline}</>} />
      )),
    },
    {
      key: "opensat-invalid",
      title: "opensAt not a valid date",
      count: opensAtInvalidFormat.length,
      copyText: opensAtInvalidFormat.map((r) => `- ${r.title} (${r.slug}): opensAt "${r.opensAt}"`).join("\n"),
      rows: opensAtInvalidFormat.map((r) => (
        <Row key={r.slug} slug={r.slug} title={r.title} registrationUrl={registrationUrlOf(r.slug)} detail={<>opensAt &quot;{r.opensAt}&quot;</>} />
      )),
    },
    {
      key: "far-out",
      title: "Deadline >6 months out, no opensAt",
      subtitle: "Informational, not an error — the worklist for a targeted opensAt research pass.",
      count: farOutWithoutOpensAt.length,
      copyText: farOutWithoutOpensAt.map((r) => `- ${r.title} (${r.slug}): deadline ${r.deadline} (in ${r.days}d)`).join("\n"),
      rows: farOutWithoutOpensAt.map((r) => (
        <Row key={r.slug} slug={r.slug} title={r.title} registrationUrl={registrationUrlOf(r.slug)} detail={<>deadline {r.deadline} (in {r.days}d)</>} />
      )),
    },
  ];

  const clear = sections.filter((s) => s.count === 0);
  const flagged = sections.filter((s) => s.count > 0);

  const sortMode = sp.sort === "deadline" ? "deadline" : "title";
  const allPublished = [...entries].sort((a, b) => {
    if (sortMode === "deadline") {
      if (a.deadline === null && b.deadline === null) return 0;
      if (a.deadline === null) return 1;
      if (b.deadline === null) return -1;
      return String(a.deadline).localeCompare(String(b.deadline));
    }
    return String(a.title ?? "").localeCompare(String(b.title ?? ""));
  });

  return (
    <div className="border-t-2 border-ink px-6 pb-24 md:px-10">
      <div className="mx-auto max-w-[900px]">
        <p className="mt-14 font-mono text-[11px] uppercase tracking-[.06em] text-black/45 md:mt-16">
          Local only — dev server
        </p>
        <h1 className="mt-3 font-sans text-4xl font-black tracking-[-0.02em] text-ink md:text-5xl">
          Data audit
        </h1>
        <p className="mt-4 font-sans text-sm text-black/60">
          {entries.length} published entries · generated {today.toISOString()}
        </p>

        <p className="mt-8 border-t-2 border-ink pt-4 font-mono text-sm text-black/50">
          {clear.length} checks clear: {clear.length > 0 ? clear.map((s) => s.title).join(", ") : "—"}
        </p>

        {flagged.length === 0 ? (
          <p className="mt-6 font-sans text-lg font-bold text-ink">
            Nothing flagged. Everything else below is just the full roster.
          </p>
        ) : (
          flagged.map((s) => <SectionBlock key={s.key} section={s} />)
        )}

        <details className="mt-12 border-t-2 border-ink pt-6">
          <summary className="cursor-pointer font-sans text-xl font-black tracking-[-0.02em] text-ink">
            All published entries ({allPublished.length})
          </summary>
          <p className="mt-1.5 font-sans text-sm text-black/50">
            Everything above only lists problems — this is the full roster, clean entries included.
          </p>
          <div className="mt-4 flex gap-2">
            <Link
              href="/admin?sort=title"
              className={`border-2 border-ink px-3 py-1 font-mono text-xs font-bold uppercase ${
                sortMode === "title" ? "bg-ink text-white" : "bg-white text-ink"
              }`}
            >
              A–Z
            </Link>
            <Link
              href="/admin?sort=deadline"
              className={`border-2 border-ink px-3 py-1 font-mono text-xs font-bold uppercase ${
                sortMode === "deadline" ? "bg-ink text-white" : "bg-white text-ink"
              }`}
            >
              Deadline
            </Link>
          </div>
          <div className="mt-4">
            {allPublished.map((e) => (
              <Row
                key={String(e.slug)}
                slug={String(e.slug)}
                title={String(e.title)}
                registrationUrl={typeof e.registrationUrl === "string" ? e.registrationUrl : undefined}
                detail={
                  <>
                    {String(e.status ?? "")} · deadline {e.deadline ? String(e.deadline) : "null (pending)"}
                  </>
                }
              />
            ))}
          </div>
        </details>
      </div>
    </div>
  );
}
