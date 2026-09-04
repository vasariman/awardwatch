import Link from "next/link";
import { CATEGORIES } from "@/lib/types";

export type FilterParams = {
  category?: string;
  status?: string;
  student?: string;
  q?: string;
};

function pillClass(active: boolean) {
  return `inline-block whitespace-nowrap border-2 border-ink px-4 py-2 font-sans text-xs font-bold uppercase tracking-[.03em] no-underline ${
    active ? "bg-ink text-white" : "bg-white text-ink"
  }`;
}

// Builds the homepage URL for a filter change, keeping every other active
// filter intact -- clicking one pill must never reset the others, which is
// what makes multiple filters (e.g. "Student" + "Graphic Design") combine
// instead of replace each other.
function buildHref(sp: FilterParams, overrides: Partial<FilterParams>): string {
  const merged = { ...sp, ...overrides };
  const params = new URLSearchParams();
  if (merged.q) params.set("q", merged.q);
  if (merged.category) params.set("category", merged.category);
  if (merged.status) params.set("status", merged.status);
  if (merged.student) params.set("student", merged.student);
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

export function FilterBar({ sp }: { sp: FilterParams }) {
  const activeCategories = sp.category ? sp.category.split(",").filter(Boolean) : [];
  const noFilters = activeCategories.length === 0 && !sp.status && !sp.student;

  function categoryHref(cat: string): string {
    const next = activeCategories.includes(cat)
      ? activeCategories.filter((c) => c !== cat)
      : [...activeCategories, cat];
    return buildHref(sp, { category: next.length ? next.join(",") : undefined });
  }

  return (
    <div className="flex flex-wrap gap-2.5">
      <Link
        href={buildHref(sp, { category: undefined, status: undefined, student: undefined })}
        scroll={false}
        className={pillClass(noFilters)}
      >
        All
      </Link>
      {CATEGORIES.map((cat) => (
        <Link key={cat} href={categoryHref(cat)} scroll={false} className={pillClass(activeCategories.includes(cat))}>
          {cat}
        </Link>
      ))}
      <Link
        href={buildHref(sp, { status: sp.status === "closing-soon" ? undefined : "closing-soon" })}
        scroll={false}
        className={pillClass(sp.status === "closing-soon")}
      >
        Closing soon
      </Link>
      <Link
        href={buildHref(sp, { student: sp.student === "true" ? undefined : "true" })}
        scroll={false}
        className={pillClass(sp.student === "true")}
      >
        Open to students
      </Link>
      <Link
        href={buildHref(sp, { student: sp.student === "only" ? undefined : "only" })}
        scroll={false}
        className={pillClass(sp.student === "only")}
      >
        Students only
      </Link>
    </div>
  );
}
