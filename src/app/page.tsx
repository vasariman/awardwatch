import type { Metadata } from "next";
import { Suspense } from "react";
import type { Category } from "@/lib/types";
import { compareByUrgency, getAllCompetitions, getHeroCompetitions } from "@/lib/competitions";
import { HeroSlider } from "@/components/HeroSlider";
import { FilterBar } from "@/components/FilterBar";
import { SearchBar } from "@/components/SearchBar";
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
      (c) => c.title.toLowerCase().includes(q) || c.organizer.toLowerCase().includes(q)
    );
  }

  items = [...items].sort(compareByUrgency);

  return (
    <>
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

        <CompetitionGrid items={items} insert={<NewsletterSignup />} insertAfter={6} />
      </section>
    </>
  );
}
