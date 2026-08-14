import { Fragment } from "react";
import type { ReactNode } from "react";
import type { Competition } from "@/lib/types";
import { CompetitionCard } from "./CompetitionCard";

export function CompetitionGrid({
  items,
  insert,
  insertAfter = 6,
}: {
  items: Competition[];
  /** Optional full-width block woven into the grid (e.g. newsletter signup). */
  insert?: ReactNode;
  /** Number of cards shown before `insert`. Clamped to the list length. */
  insertAfter?: number;
}) {
  if (items.length === 0) {
    return (
      <p className="border-2 border-dashed border-black/20 p-10 text-center font-sans text-sm font-bold text-black/50">
        No competitions match these filters.
      </p>
    );
  }

  const insertIndex = insert ? Math.min(insertAfter, items.length) : -1;

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item, index) => (
        <Fragment key={item.slug}>
          <CompetitionCard item={item} />
          {index + 1 === insertIndex && insert}
        </Fragment>
      ))}
    </div>
  );
}
