import type { Metadata } from "next";
import Link from "next/link";
import { getHeroCompetitions } from "@/lib/competitions";
import { CompetitionGrid } from "@/components/CompetitionGrid";

// Landing page for the Brevo double opt-in redirect. Not a search result:
// it only makes sense arriving from a confirmation email.
export const metadata: Metadata = {
  title: "Subscription confirmed — AwardWatch",
  robots: { index: false, follow: true },
};

export default function NewsletterConfirmedPage() {
  const upcoming = getHeroCompetitions(3);

  return (
    <div className="border-t-2 border-ink px-6 pb-24 md:px-10">
      <div className="mx-auto max-w-[1400px]">
        <p className="mt-14 font-mono text-[11px] uppercase tracking-[.06em] text-black/45 md:mt-16">
          Newsletter
        </p>

        <h1 className="mt-4 max-w-3xl font-sans text-[12vw] font-black leading-[0.95] tracking-[-0.03em] text-ink sm:text-5xl md:text-6xl">
          You&apos;re on the list.
        </h1>

        <p className="mt-6 max-w-xl font-sans text-base leading-relaxed text-black/70 md:text-lg">
          Once a month you&apos;ll get the competitions closing soon, plus
          what&apos;s coming up after that. Every email has an unsubscribe
          link at the bottom — one click, no questions.
        </p>

        <div className="mt-16 border-t-2 border-ink pt-10">
          <h2 className="font-sans text-2xl font-black tracking-[-0.02em] text-ink md:text-3xl">
            Closing soonest
          </h2>
          <p className="mt-2 font-sans text-sm text-black/60">
            A head start while you wait for the first issue.
          </p>

          <div className="mt-8">
            <CompetitionGrid items={upcoming} />
          </div>

          <Link
            href="/"
            className="mt-10 inline-block border-2 border-ink px-6 py-3 font-sans text-sm font-bold text-ink no-underline transition-colors hover:bg-ink hover:text-white"
          >
            View all competitions →
          </Link>
        </div>
      </div>
    </div>
  );
}
