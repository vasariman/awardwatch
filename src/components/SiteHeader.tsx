import Link from "next/link";
import { FEATURES } from "@/lib/features";

export function SiteHeader() {
  return (
    <header className="flex items-center justify-between border-b-2 border-ink px-6 py-5 md:px-10">
      <Link
        href="/"
        className="font-sans text-lg font-black tracking-[-0.02em] text-ink no-underline"
      >
        AwardWatch
      </Link>
      <nav className="flex items-center gap-4 md:gap-7">
        <Link
          href="/"
          className="hidden font-sans text-xs font-bold uppercase tracking-[.03em] text-ink no-underline sm:inline"
        >
          Competitions
        </Link>
        <Link
          href="/about"
          className="hidden font-sans text-xs font-bold uppercase tracking-[.03em] text-black/45 no-underline sm:inline"
        >
          About
        </Link>
        {FEATURES.submitListing && (
          <Link
            href="#"
            className="bg-accent px-4 py-2.5 font-sans text-[11px] font-bold uppercase tracking-[.03em] text-white no-underline"
          >
            Submit a listing
          </Link>
        )}
      </nav>
    </header>
  );
}
