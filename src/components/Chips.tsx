import type { Status } from "@/lib/types";
import { statusLabel } from "@/lib/competitions";

const STATUS_STYLES: Record<Status, string> = {
  open: "bg-ink text-white",
  "closing-soon": "bg-accent text-white",
  expired: "bg-black/10 text-black/40",
};

export function StatusChip({ status }: { status: Status }) {
  return (
    <span
      className={`inline-block px-3 py-2 font-sans text-[11px] font-bold uppercase leading-none tracking-[.04em] ${STATUS_STYLES[status]}`}
    >
      {statusLabel(status)}
    </span>
  );
}

export function CategoryChip({ category }: { category: string }) {
  return (
    <span className="inline-block bg-ink px-3 py-2 font-sans text-[10px] font-bold uppercase leading-none tracking-[.04em] text-white">
      {category}
    </span>
  );
}

export function StudentChip() {
  return (
    <span className="inline-block border border-ink px-3 py-2 font-sans text-[10px] font-bold uppercase leading-none tracking-[.04em] text-ink">
      Student
    </span>
  );
}
