import { existsSync, readFileSync } from "node:fs";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  loadCompetitions,
  INCOMING_COMPETITIONS_PATH,
  REQUIRED_FIELDS,
  DATE_FIELDS,
} from "../../../scripts/lib/util.mjs";
import {
  findSeriesWithoutCurrentEdition,
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

function Section({
  title,
  subtitle,
  count,
  children,
}: {
  title: string;
  subtitle?: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <div className="mt-12 border-t-2 border-ink pt-8">
      <div className="flex items-baseline gap-3">
        <h2 className="font-sans text-xl font-black tracking-[-0.02em] text-ink">{title}</h2>
        <span
          className={`inline-block px-2 py-0.5 font-mono text-xs font-bold ${
            count === 0 ? "bg-black/10 text-black/40" : "bg-accent text-white"
          }`}
        >
          {count}
        </span>
      </div>
      {subtitle && <p className="mt-1.5 font-sans text-sm text-black/50">{subtitle}</p>}
      <div className="mt-4">
        {count === 0 ? (
          <p className="font-mono text-sm text-black/40">None — all clear.</p>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

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

export default function AdminPage() {
  if (process.env.NODE_ENV !== "development") notFound();

  const entries = loadCompetitions();
  const today = new Date();

  const incoming = loadIncomingCandidates();
  const seriesGaps = findSeriesWithoutCurrentEdition(entries, today);
  const missingFields = findMissingFields(entries, REQUIRED_FIELDS.concat(DATE_FIELDS));
  const implausibleSeriesIds = findImplausibleSeriesIds(entries);
  const pendingEntries = findPendingEntries(entries);
  const statusMismatches = findStatusMismatches(entries, today);
  const opensAtContradictions = findOpensAtContradictions(entries);
  const opensAtInvalidFormat = findOpensAtInvalidFormat(entries);
  const exactUrlDupes = findExactUrlDuplicates(entries);
  const fuzzyDupes = findFuzzyDuplicates(entries);
  const farOutWithoutOpensAt = findFarOutWithoutOpensAt(entries, today);
  const unconfirmedPublished = findUnconfirmedPublishedFields(entries);

  const bySlug = new Map(entries.map((e: Record<string, unknown>) => [e.slug, e]));

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
          {entries.length} published entries · {incoming.length} awaiting review · generated{" "}
          {today.toISOString()}
        </p>

        <Section
          title="Zur Freigabe"
          subtitle="Candidates in data/incoming-competitions.json — not yet run through npm run merge."
          count={incoming.length}
        >
          {incoming.map((c, i) => (
            <Row
              key={c.slug ?? i}
              slug={typeof c.slug === "string" ? c.slug : undefined}
              title={typeof c.title === "string" ? c.title : undefined}
              registrationUrl={typeof c.registrationUrl === "string" ? c.registrationUrl : undefined}
              linkToDetail={false}
              detail={
                <>
                  {String(c.organizer ?? "")} · deadline {String(c.deadline ?? "null")} · status{" "}
                  {String(c.status ?? "")}
                  {c.sourcingNotes && typeof c.sourcingNotes === "object" && (
                    <div className="mt-1 text-accent">
                      unconfirmed: {Object.keys(c.sourcingNotes as object).join(", ")}
                    </div>
                  )}
                </>
              }
            />
          ))}
        </Section>

        <Section
          title="Published with unconfirmed fields"
          subtitle="sourcingNotes survived the merge — these fields were still a placeholder when this went live."
          count={unconfirmedPublished.length}
        >
          {unconfirmedPublished.map((r: { slug: string; title: string; notes: Record<string, string> }) => (
            <Row
              key={r.slug}
              slug={r.slug}
              title={r.title}
              registrationUrl={String((bySlug.get(r.slug) as Record<string, unknown> | undefined)?.registrationUrl ?? "")}
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
          ))}
        </Section>

        <Section
          title="Series without a current edition"
          subtitle="No open/closing-soon/upcoming/pending edition for this series — the research worklist."
          count={seriesGaps.length}
        >
          {seriesGaps.map((g: { seriesId: string; slug: string; title: string; deadline: string; days: number }) => (
            <Row
              key={g.slug}
              slug={g.slug}
              title={g.title}
              registrationUrl={String((bySlug.get(g.slug) as Record<string, unknown> | undefined)?.registrationUrl ?? "")}
              detail={
                <>
                  [{g.seriesId}] deadline {g.deadline} ·{" "}
                  {g.days < 0 ? `expired ${-g.days}d ago` : `closes in ${g.days}d`}
                </>
              }
            />
          ))}
        </Section>

        <Section
          title="Stored vs. live status mismatch"
          subtitle="Stored status in competitions.json no longer matches what deadline/opensAt compute to today."
          count={statusMismatches.length}
        >
          {statusMismatches.map((r: { slug: string; title: string; deadline: string | null; storedStatus: string; liveStatus: string }) => (
            <Row
              key={r.slug}
              slug={r.slug}
              title={r.title}
              detail={
                <>
                  deadline {r.deadline ?? "null"} · stored &quot;{r.storedStatus}&quot; → live &quot;
                  {r.liveStatus}&quot;
                </>
              }
            />
          ))}
        </Section>

        <Section
          title="Missing required fields"
          count={missingFields.length}
        >
          {missingFields.map((r: { slug: string; title: string; missing: string[] }) => (
            <Row key={r.slug} slug={r.slug} title={r.title} detail={<>missing: {r.missing.join(", ")}</>} />
          ))}
        </Section>

        <Section
          title="Missing/implausible seriesId"
          count={implausibleSeriesIds.length}
        >
          {implausibleSeriesIds.map((r: { slug: string; title: string; seriesId: string; reason: string }) => (
            <Row key={r.slug} slug={r.slug} title={r.title} detail={<>seriesId &quot;{r.seriesId}&quot; — {r.reason}</>} />
          ))}
        </Section>

        <Section
          title="Pending entries"
          subtitle="No confirmed deadline — worth a periodic real-world recheck."
          count={pendingEntries.length}
        >
          {pendingEntries.map((r: { slug: string; title: string; expectedPeriod: string | null }) => (
            <Row key={r.slug} slug={r.slug} title={r.title} detail={r.expectedPeriod ?? "no expected period sourced"} />
          ))}
        </Section>

        <Section title="Exact duplicate registrationUrl" count={exactUrlDupes.length}>
          {exactUrlDupes.map((d: { a: string; b: string; url: string }) => (
            <Row key={`${d.a}-${d.b}`} title={`${d.a}  ↔  ${d.b}`} detail={d.url} />
          ))}
        </Section>

        <Section
          title="Possible fuzzy duplicates"
          subtitle="Same normalized title+organizer, different seriesId — same-series editions are excluded."
          count={fuzzyDupes.length}
        >
          {fuzzyDupes.map((d: { a: string; b: string }) => (
            <Row key={`${d.a}-${d.b}`} title={`${d.a}  ↔  ${d.b}`} detail="fuzzy title+organizer match" />
          ))}
        </Section>

        <Section title="opensAt after deadline (contradictory)" count={opensAtContradictions.length}>
          {opensAtContradictions.map((r: { slug: string; title: string; opensAt: string; deadline: string }) => (
            <Row key={r.slug} slug={r.slug} title={r.title} detail={<>opensAt {r.opensAt} is after deadline {r.deadline}</>} />
          ))}
        </Section>

        <Section title="opensAt not a valid date" count={opensAtInvalidFormat.length}>
          {opensAtInvalidFormat.map((r: { slug: string; title: string; opensAt: string }) => (
            <Row key={r.slug} slug={r.slug} title={r.title} detail={<>opensAt &quot;{r.opensAt}&quot;</>} />
          ))}
        </Section>

        <Section
          title="Deadline >6 months out, no opensAt"
          subtitle="Informational, not an error — the worklist for a targeted opensAt research pass."
          count={farOutWithoutOpensAt.length}
        >
          {farOutWithoutOpensAt.map((r: { slug: string; title: string; deadline: string; days: number }) => (
            <Row key={r.slug} slug={r.slug} title={r.title} detail={<>deadline {r.deadline} (in {r.days}d)</>} />
          ))}
        </Section>
      </div>
    </div>
  );
}
