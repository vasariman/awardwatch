import type { Competition } from "@/lib/types";
import { CompetitionCard } from "./CompetitionCard";

export function CompetitionGrid({ items }: { items: Competition[] }) {
  if (items.length === 0) {
    return (
      <p className="border-2 border-dashed border-black/20 p-10 text-center font-sans text-sm font-bold text-black/50">
        No competitions match these filters.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <CompetitionCard key={item.slug} item={item} />
      ))}
    </div>
  );
}
