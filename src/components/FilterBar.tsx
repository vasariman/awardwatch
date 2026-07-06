import Link from "next/link";
import { CATEGORIES } from "@/lib/types";

function pillClass(active: boolean) {
  return `inline-block whitespace-nowrap border-2 border-ink px-4 py-2 font-sans text-xs font-bold uppercase tracking-[.03em] no-underline ${
    active ? "bg-ink text-white" : "bg-white text-ink"
  }`;
}

export function FilterBar({
  activeCategory,
  activeStatus,
  activeStudent,
}: {
  activeCategory?: string;
  activeStatus?: string;
  activeStudent?: boolean;
}) {
  const noFilters = !activeCategory && !activeStatus && !activeStudent;

  return (
    <div className="flex flex-wrap gap-2.5">
      <Link href="/" scroll={false} className={pillClass(noFilters)}>
        All
      </Link>
      {CATEGORIES.map((cat) => (
        <Link
          key={cat}
          href={`/?category=${encodeURIComponent(cat)}`}
          scroll={false}
          className={pillClass(activeCategory === cat)}
        >
          {cat}
        </Link>
      ))}
      <Link
        href="/?status=closing-soon"
        scroll={false}
        className={pillClass(activeStatus === "closing-soon")}
      >
        Closing soon
      </Link>
      <Link href="/?student=true" scroll={false} className={pillClass(!!activeStudent)}>
        Student
      </Link>
    </div>
  );
}
