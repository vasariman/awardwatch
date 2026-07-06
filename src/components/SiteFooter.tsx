import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t-2 border-ink px-6 py-12 md:px-10 md:py-14">
      <div className="flex flex-wrap justify-between gap-10">
        <div className="font-sans text-lg font-black tracking-[-0.02em] text-ink">
          AwardWatch
        </div>
        <div className="flex flex-wrap gap-10 md:gap-12">
          <div className="flex flex-col gap-2.5">
            <div className="mb-1 font-sans text-[10px] font-bold uppercase tracking-[.08em] text-black/40">
              Explore
            </div>
            <Link href="/" className="font-sans text-[13px] font-semibold text-ink no-underline">
              All competitions
            </Link>
            <Link
              href="/?status=closing-soon"
              className="font-sans text-[13px] font-semibold text-ink no-underline"
            >
              Closing soon
            </Link>
            <Link
              href="/?student=true"
              className="font-sans text-[13px] font-semibold text-ink no-underline"
            >
              Student awards
            </Link>
          </div>
          <div className="flex flex-col gap-2.5">
            <div className="mb-1 font-sans text-[10px] font-bold uppercase tracking-[.08em] text-black/40">
              AwardWatch
            </div>
            <Link href="#" className="font-sans text-[13px] font-semibold text-ink no-underline">
              About
            </Link>
            <Link href="#" className="font-sans text-[13px] font-semibold text-ink no-underline">
              Submit a listing
            </Link>
            <Link href="#" className="font-sans text-[13px] font-semibold text-ink no-underline">
              Contact
            </Link>
          </div>
        </div>
      </div>
      <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-black/15 pt-6">
        <div className="font-mono text-xs text-black/45">
          © 2026 AwardWatch. All rights reserved.
        </div>
        <div className="font-mono text-xs text-black/45">awardwatch.net</div>
      </div>
    </footer>
  );
}
