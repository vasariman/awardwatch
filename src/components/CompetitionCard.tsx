import Link from "next/link";
import type { Competition } from "@/lib/types";
import { daysUntil, formatDate } from "@/lib/competitions";
import { CategoryChip, StatusChip, StudentChip } from "./Chips";

export function CompetitionCard({ item }: { item: Competition }) {
  const days = daysUntil(item.deadline);

  return (
    <Link
      href={`/competitions/${item.slug}`}
      className={`group flex flex-col gap-5 border-2 bg-white p-6 no-underline transition-all ${
        item.status === "expired"
          ? "border-black/25 opacity-35 grayscale hover:bg-neutral-500 hover:opacity-70"
          : "border-ink hover:bg-ink"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <StatusChip status={item.status} />
        <CategoryChip category={item.category} />
        {item.studentTag && <StudentChip />}
      </div>

      <h3 className="font-sans text-2xl font-black leading-[1.02] tracking-[-0.02em] text-ink group-hover:text-white">
        {item.title}
      </h3>

      <div className="font-sans text-sm font-bold text-black/60 group-hover:text-white/70">
        {item.organizer} — {item.country}
      </div>

      <p className="font-sans text-sm leading-relaxed text-black/70 group-hover:text-white/80">
        {item.shortDescription}
      </p>

      <div className="mt-auto flex items-center justify-between border-t border-black/15 pt-4 group-hover:border-white/20">
        <div className="font-mono text-[11px] uppercase tracking-[.06em] text-black/45 group-hover:text-white/50">
          Deadline{" "}
          <span className="font-sans text-sm font-bold normal-case tracking-normal text-ink group-hover:text-white">
            {formatDate(item.deadline)}
          </span>
          {days >= 0 && item.status !== "expired" && (
            <span className="ml-1">({days === 0 ? "today" : `${days}d`})</span>
          )}
        </div>
        <span className="font-sans text-sm font-bold text-ink group-hover:text-white">
          →
        </span>
      </div>
    </Link>
  );
}
