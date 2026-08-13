import Link from "next/link";
import type { Metadata } from "next";
import { getHeroCompetitions } from "@/lib/competitions";
import { CompetitionGrid } from "@/components/CompetitionGrid";

export const metadata: Metadata = {
  title: "Competition not found | AwardWatch",
};

export default function NotFound() {
  const upcoming = getHeroCompetitions(6);

  return (
    <div className="border-t-2 border-ink bg-white px-6 pb-24 pt-14 md:px-10 md:pb-28 md:pt-20">
      <div className="mx-auto max-w-[1100px]">
        <h1 className="max-w-3xl font-sans text-4xl font-black leading-[0.98] tracking-[-0.02em] text-ink md:text-6xl">
          This competition isn&apos;t here (anymore).
        </h1>
        <p className="mt-5 max-w-xl font-sans text-base font-semibold leading-relaxed text-black/60 md:text-lg">
          The link might be outdated, or the award has since closed and moved on.
          Here are the deadlines actually open right now:
        </p>

        <div className="mt-12 md:mt-14">
          <CompetitionGrid items={upcoming} />
        </div>

        <Link
          href="/"
          className="mt-12 inline-block bg-accent px-8 py-5 font-sans text-sm font-bold uppercase tracking-[.02em] text-white no-underline md:mt-14"
        >
          View all competitions →
        </Link>
      </div>
    </div>
  );
}
