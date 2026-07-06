import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  audienceLabel,
  formatDate,
  getAllCompetitions,
  getCompetitionBySlug,
} from "@/lib/competitions";
import { CategoryChip, StatusChip, StudentChip } from "@/components/Chips";

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
  return {
    title: `${item.title} — AwardWatch`,
    description: item.shortDescription,
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

  const stats = [
    { label: "Deadline", value: formatDate(item.deadline) },
    { label: "Results announced", value: formatDate(item.resultDate) },
    { label: "Entry fee", value: item.entryFee },
    { label: "Award / prize", value: item.prizeMoney },
    { label: "Audience", value: audienceLabel(item.targetAudience) },
    { label: "Submission format", value: item.submissionFormat },
  ];

  return (
    <div className="border-t-2 border-ink bg-white px-6 pb-24 pt-0 md:pb-28">
      <div className="mx-auto max-w-[820px] px-0 md:px-6">
        <Link
          href="/"
          className="mt-10 inline-block border-b-2 border-accent font-sans text-xs font-bold uppercase tracking-[.03em] text-ink no-underline md:mt-14"
        >
          ← Back to competitions
        </Link>

        <div className="mt-8 flex flex-wrap items-center gap-3 md:mt-10">
          <StatusChip status={item.status} />
          <CategoryChip category={item.category} />
          {item.studentTag && <StudentChip />}
        </div>

        <h1 className="mt-6 font-sans text-[13vw] font-black leading-[0.95] tracking-[-0.03em] text-ink sm:text-6xl md:text-[5.5rem]">
          {item.title}
        </h1>

        <div className="mt-4 border-b-2 border-ink pb-7 font-sans text-base font-bold text-black/60">
          {item.organizer} — {item.country}
        </div>

        <div className="mt-0 flex h-[220px] items-center justify-center bg-ink sm:h-[300px] md:h-[380px]">
          <span className="px-6 text-center font-sans text-xs font-bold uppercase leading-relaxed tracking-[.1em] text-white/50">
            [ Competition visual ]
          </span>
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
