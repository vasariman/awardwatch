import Link from "next/link";
import type { Metadata } from "next";
import { CATEGORIES } from "@/lib/types";
import { getAllCompetitions } from "@/lib/competitions";

export const metadata: Metadata = {
  title: "About — AwardWatch",
  description:
    "AwardWatch is a directory of design competition deadlines across product, graphic, UX/UI, architecture, interior, and sustainable design.",
};

export default function AboutPage() {
  const total = getAllCompetitions().length;

  return (
    <div className="border-t-2 border-ink px-6 pb-24 md:px-10">
      <div className="mx-auto max-w-[820px]">
        <h1 className="mt-14 max-w-3xl font-sans text-[13vw] font-black leading-[0.95] tracking-[-0.03em] text-ink sm:text-6xl md:mt-16 md:text-7xl">
          About AwardWatch
        </h1>

        <p className="mt-8 font-sans text-lg font-semibold leading-relaxed text-ink md:text-xl">
          AwardWatch is a running directory of open design competitions and
          award deadlines — built so designers don&rsquo;t have to keep a
          dozen browser tabs open just to track when entries close.
        </p>

        <p className="mt-6 font-sans text-base leading-relaxed text-black/70 md:text-lg">
          We currently track {total} competitions spanning product and
          industrial design, graphic design, UX/UI, architecture,
          interior and furniture design, and sustainable design, plus a
          cross-cutting Student tag for awards aimed at students and recent
          graduates. Every listing includes the deadline, entry fee, prize,
          submission format, and a direct link to apply.
        </p>

        <div className="mt-14 border-t-2 border-ink pt-10">
          <h2 className="font-sans text-2xl font-black tracking-[-0.02em] text-ink md:text-3xl">
            What we track
          </h2>
          <div className="mt-6 flex flex-wrap gap-2.5">
            {CATEGORIES.map((cat) => (
              <span
                key={cat}
                className="inline-block bg-ink px-3 py-2 font-sans text-[11px] font-bold uppercase tracking-[.04em] text-white"
              >
                {cat}
              </span>
            ))}
            <span className="inline-block border border-ink px-3 py-2 font-sans text-[11px] font-bold uppercase tracking-[.04em] text-ink">
              Student
            </span>
          </div>
        </div>

        <div className="mt-14 border-t-2 border-ink pt-10">
          <h2 className="font-sans text-2xl font-black tracking-[-0.02em] text-ink md:text-3xl">
            How listings work
          </h2>
          <p className="mt-5 font-sans text-base leading-relaxed text-black/70 md:text-lg">
            Competitions are added manually as flat entries — no automated
            scraping. When a deadline passes, we mark the listing as{" "}
            <span className="font-bold text-ink">Expired</span> rather than
            removing it, so past competitions stay archived and searchable
            rather than disappearing.
          </p>
        </div>

        <div className="mt-14 border-t-2 border-ink pt-10">
          <h2 className="font-sans text-2xl font-black tracking-[-0.02em] text-ink md:text-3xl">
            Submit a listing
          </h2>
          <p className="mt-5 font-sans text-base leading-relaxed text-black/70 md:text-lg">
            Running a design competition and want it listed? Get in touch
            and we&rsquo;ll add it.
          </p>
          <Link
            href="#"
            className="mt-8 inline-block bg-accent px-7 py-4 font-sans text-sm font-bold uppercase tracking-[.02em] text-white no-underline"
          >
            Submit a listing →
          </Link>
        </div>
      </div>
    </div>
  );
}
