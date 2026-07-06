import { getAllCompetitions, getHeroCompetitions } from "@/lib/competitions";
import { HeroSlider } from "@/components/HeroSlider";
import { FilterBar } from "@/components/FilterBar";
import { CompetitionGrid } from "@/components/CompetitionGrid";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; status?: string; student?: string }>;
}) {
  const sp = await searchParams;
  const hero = getHeroCompetitions();

  let items = getAllCompetitions();
  if (sp.category) items = items.filter((c) => c.category === sp.category);
  if (sp.status) items = items.filter((c) => c.status === sp.status);
  if (sp.student === "true") items = items.filter((c) => c.studentTag);

  items = [...items].sort((a, b) => {
    if (a.status === "expired" && b.status !== "expired") return 1;
    if (b.status === "expired" && a.status !== "expired") return -1;
    return a.deadline.localeCompare(b.deadline);
  });

  return (
    <>
      <HeroSlider items={hero} />

      <section className="px-6 py-14 md:px-10 md:py-20">
        <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="font-sans text-3xl font-black tracking-[-0.02em] text-ink md:text-4xl">
              All competitions
            </h2>
            <p className="mt-2 font-sans text-sm text-black/60">
              {items.length} competition{items.length === 1 ? "" : "s"} tracked
            </p>
          </div>
          <FilterBar
            activeCategory={sp.category}
            activeStatus={sp.status}
            activeStudent={sp.student === "true"}
          />
        </div>

        <CompetitionGrid items={items} />
      </section>
    </>
  );
}
