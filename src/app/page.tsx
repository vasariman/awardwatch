import type { Metadata } from "next";
import { Suspense } from "react";
import type { Category } from "@/lib/types";
import { compareByUrgency, getAllCompetitions, getHeroCompetitions } from "@/lib/competitions";
import { HeroSlider } from "@/components/HeroSlider";
import { FilterBar } from "@/components/FilterBar";
import { SearchBar } from "@/components/SearchBar";
import { ScrollPositionMemory } from "@/components/ScrollPositionMemory";
import { TimelineRail } from "@/components/TimelineRail";
import { CompetitionGrid } from "@/components/CompetitionGrid";
import { NewsletterSignup } from "@/components/NewsletterSignup";

// Filter query params (?category=, ?status=, ?student=, ?q=) always
// canonicalize to the bare homepage so search engines don't index them as
// duplicates.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; status?: string; student?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const hero = getHeroCompetitions();

  // category is a comma-joined list so more than one can be active at once
  // (e.g. "Student" + "Graphic Design" together) -- see FilterBar.
  const activeCategories = sp.category
    ? (sp.category.split(",").filter(Boolean) as Category[])
    : [];

  let items = getAllCompetitions();
  if (activeCategories.length > 0) {
    items = items.filter((c) => c.categories.some((cat) => activeCategories.includes(cat)));
  }
  if (sp.status) items = items.filter((c) => c.status === sp.status);
  if (sp.student === "true") items = items.filter((c) => c.studentTag);
  if (sp.student === "only") items = items.filter((c) => c.targetAudience === "students");
  const q = sp.q?.trim().toLowerCase();
  if (q) {
    items = items.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.organizer.toLowerCase().includes(q) ||
        c.country.toLowerCase().includes(q)
    );
  }

  items = [...items].sort(compareByUrgency);

  // Dated, non-expired tiles in display order, keyed by the date the list is
  // sorted by (deadline). TBA/expired tiles get no marker.
  const railMonths = items
    .filter((c) => c.deadline !== null && c.status !== "expired" && c.status !== "pending")
    .map((c) => ({ slug: c.slug, month: (c.deadline as string).slice(0, 7) }));

  return (
    <>
      <Suspense fallback={null}>
        <ScrollPositionMemory />
      </Suspense>
      <HeroSlider items={hero} />

      <section className="px-6 py-14 md:px-10 md:py-20">
        <div className="mb-10 flex flex-col gap-6">
          <div>
            <h2 className="font-sans text-3xl font-black tracking-[-0.02em] text-ink md:text-4xl">
              All competitions
            </h2>
            <p className="mt-2 font-sans text-sm text-black/60">
              {items.length} competition{items.length === 1 ? "" : "s"} tracked
            </p>
          </div>
          <Suspense
            fallback={
              <div
                aria-hidden
                className="w-full border-2 border-ink bg-white px-4 py-3 font-sans text-sm text-black/35 md:max-w-md"
              >
                Search competitions…
              </div>
            }
          >
            <SearchBar />
          </Suspense>
          <FilterBar sp={sp} />
        </div>

        {/* From md up a fixed 84px column is reserved for the timeline rail
            (no layout shift when it mounts); below md this is a plain block
            and the grid lays out exactly as before. */}
        <div className="md:grid md:grid-cols-[minmax(0,1fr)_84px] md:gap-6">
          <div data-timeline-grid>
            <CompetitionGrid items={items} insert={<NewsletterSignup />} insertAfter={6} />
          </div>
          <TimelineRail months={railMonths} />
        </div>
      </section>
    </>
  );
}
