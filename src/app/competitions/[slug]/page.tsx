import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  audienceLabel,
  formatDate,
  getAllCompetitions,
  getCompetitionBySlug,
  getPriorEdition,
  getSuccessorCompetition,
} from "@/lib/competitions";
import { CategoryChip, StatusChip, StudentChip } from "@/components/Chips";
import { getCategoryImage } from "@/lib/categoryImages";
import { SITE_URL } from "@/lib/site";

// Statically generated pages otherwise only refresh on a new deploy —
// this lets Next.js regenerate each page in the background at most once
// a day, so a competition's status (open/closing-soon/expired) stays
// correct as time passes even without a redeploy.
export const revalidate = 86400;

export function generateStaticParams() {
  return getAllCompetitions().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = getCompetitionBySlug(slug);
  if (!item) return {};

  const title =
    item.status === "pending"
      ? `${item.title} — dates not yet announced | AwardWatch`
      : `${item.title} — Deadline ${formatDate(item.deadline as string)} | AwardWatch`;
  const path = `/competitions/${item.slug}`;

  return {
    title,
    description: item.shortDescription,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      url: path,
      title,
      description: item.shortDescription,
      images: ["/opengraph-image"],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: item.shortDescription,
      images: ["/opengraph-image"],
    },
  };
}

export default async function CompetitionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = getCompetitionBySlug(slug);
  if (!item) notFound();

  const successor = item.status === "expired" ? getSuccessorCompetition(item) : undefined;
  const priorEdition = item.status === "pending" ? getPriorEdition(item) : undefined;
  const categoryImage = getCategoryImage(item.categories);

  // Only ever built from fields that are actually known — never a
  // placeholder, never a value carried over from another edition.
  const stats = [
    ...(item.opensAt ? [{ label: "Submissions open", value: formatDate(item.opensAt) }] : []),
    ...(item.deadline !== null ? [{ label: "Deadline", value: formatDate(item.deadline) }] : []),
    ...(item.resultDate !== null ? [{ label: "Results announced", value: formatDate(item.resultDate) }] : []),
    { label: "Entry fee", value: item.entryFee },
    { label: "Award / prize", value: item.prizeMoney },
    { label: "Audience", value: audienceLabel(item.targetAudience) },
    { label: "Submission format", value: item.submissionFormat },
  ];

  // No deadline confirmed -> no Event markup at all, rather than an Event
  // with an invented or reused date. When a deadline is known, startDate
  // is only included if opensAt is actually confirmed — never backfilled
  // from the deadline, which would misstate the deadline as a start date.
  const jsonLd =
    item.deadline === null
      ? null
      : {
          "@context": "https://schema.org",
          "@type": "Event",
          name: item.title,
          description: item.shortDescription,
          ...(item.opensAt ? { startDate: item.opensAt } : {}),
          endDate: item.deadline,
          eventStatus: "https://schema.org/EventScheduled",
          eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
          location: {
            "@type": "VirtualLocation",
            url: item.registrationUrl,
          },
          organizer: {
            "@type": "Organization",
            name: item.organizer,
            url: item.registrationUrl,
          },
          url: `${SITE_URL}/competitions/${item.slug}`,
        };

  return (
    <div className="border-t-2 border-ink bg-white px-6 pb-24 pt-0 md:pb-28">
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        />
      )}
      <div className="mx-auto max-w-[820px] px-0 md:px-6">
        <Link
          href="/"
          className="mt-10 inline-block border-b-2 border-accent font-sans text-xs font-bold uppercase tracking-[.03em] text-ink no-underline md:mt-14"
        >
          ← Back to competitions
        </Link>

        <div className="mt-8 flex flex-wrap items-center gap-3 md:mt-10">
          <StatusChip status={item.status} />
          {item.categories.map((category) => (
            <CategoryChip key={category} category={category} />
          ))}
          {item.studentTag && <StudentChip />}
        </div>

        <h1 className="mt-6 font-sans text-[13vw] font-black leading-[0.95] tracking-[-0.03em] text-ink sm:text-6xl md:text-[5.5rem]">
          {item.title}
        </h1>

        <div className="mt-4 border-b-2 border-ink pb-7 font-sans text-base font-bold text-black/60">
          {item.organizer} — {item.country}
        </div>

        {successor && (
          <div className="mt-8 flex flex-col gap-4 border-2 border-accent bg-accent/5 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-sans text-[10px] font-bold uppercase tracking-[.06em] text-accent">
                This edition has closed
              </div>
              {successor.status === "pending" ? (
                <>
                  <div className="mt-1.5 font-sans text-xl font-black leading-snug text-ink">
                    The next edition hasn&apos;t been announced yet
                  </div>
                  <div className="mt-1 font-sans text-sm font-bold text-black/60">
                    We&apos;re tracking it here — check back for dates
                  </div>
                </>
              ) : successor.status === "upcoming" ? (
                <>
                  <div className="mt-1.5 font-sans text-xl font-black leading-snug text-ink">
                    {successor.title} is announced
                  </div>
                  <div className="mt-1 font-sans text-sm font-bold text-black/60">
                    {successor.opensAt && `Opens ${formatDate(successor.opensAt)} — `}
                    Deadline {formatDate(successor.deadline as string)}
                  </div>
                </>
              ) : (
                <>
                  <div className="mt-1.5 font-sans text-xl font-black leading-snug text-ink">
                    {successor.title} is now open
                  </div>
                  <div className="mt-1 font-sans text-sm font-bold text-black/60">
                    Deadline {formatDate(successor.deadline as string)}
                  </div>
                </>
              )}
            </div>
            <Link
              href={`/competitions/${successor.slug}`}
              className="inline-block shrink-0 bg-accent px-6 py-4 text-center font-sans text-sm font-bold uppercase tracking-[.02em] text-white no-underline"
            >
              {successor.status === "pending" ? "View tracking page" : "View current edition"} →
            </Link>
          </div>
        )}

        {item.status === "pending" && (
          <div className="mt-8 border-2 border-dashed border-black/30 bg-cream p-6">
            <div className="font-sans text-[10px] font-bold uppercase tracking-[.06em] text-black/45">
              Dates not yet announced
            </div>
            <p className="mt-2 font-sans text-base font-semibold leading-relaxed text-ink">
              {item.expectedPeriod ||
                "The organizer hasn't published official dates for this edition yet."}
            </p>
            {priorEdition && (
              <p className="mt-2 font-sans text-sm leading-relaxed text-black/60">
                For orientation only — the previous edition ({priorEdition.title}) had a
                deadline of {formatDate(priorEdition.deadline as string)}. This is not a
                prediction for this edition.
              </p>
            )}
            <p className="mt-2 font-sans text-sm leading-relaxed text-black/60">
              This page will update as soon as official dates are confirmed.
            </p>
          </div>
        )}

        <div className="relative mt-0 flex h-[220px] items-center justify-center overflow-hidden bg-ink sm:h-[300px] md:h-[380px]">
          {categoryImage ? (
            <Image
              src={categoryImage}
              alt={`${item.categories.join(" / ")} competition visual`}
              fill
              sizes="(min-width: 820px) 820px, 100vw"
              className="object-cover"
              priority
            />
          ) : (
            <span className="px-6 text-center font-sans text-xs font-bold uppercase leading-relaxed tracking-[.1em] text-white/50">
              [ Competition visual ]
            </span>
          )}
        </div>

        <p className="mt-10 font-sans text-lg font-semibold leading-relaxed text-ink md:mt-11 md:text-xl">
          {item.longDescription}
        </p>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 md:mt-14 md:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.label} className="border border-ink p-5">
              <div className="font-sans text-[10px] font-bold uppercase tracking-[.06em] text-black/45">
                {stat.label}
              </div>
              <div className="mt-2.5 font-sans text-lg font-black leading-snug text-ink">
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        <a
          href={item.registrationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-12 inline-block bg-accent px-8 py-5 font-sans text-sm font-bold uppercase tracking-[.02em] text-white no-underline md:mt-12"
        >
          Go to entry page →
        </a>
      </div>
    </div>
  );
}
