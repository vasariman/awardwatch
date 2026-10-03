"use client";

import { useLayoutEffect, useRef, useState } from "react";

/** One dated, non-expired tile of the grid, in display order. `month` is
 *  "YYYY-MM" taken from the same date the list is sorted by (deadline). */
export type RailMonth = { slug: string; month: string };

type Marker = {
  key: string;
  y: number;
  kind: "today" | "month";
  label: string;
  year?: string;
};

type RailLayout = {
  markers: Marker[];
  line: { top: number; height: number } | null;
};

const EMPTY: RailLayout = { markers: [], line: null };

const MONTH_LABELS = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

// Fixed by the explicit line-heights in the markup below, so marker
// collision math doesn't need to measure the markers themselves.
const TODAY_HEIGHT = 15;
const MONTH_HEIGHT = 15 + 4 + 13;
// Two markers inside the same grid row are stacked this far apart; a marker
// pushed down by one from an earlier row keeps at least MIN_GAP below it.
const STACK_GAP = 18;
const MIN_GAP = 10;

// Reads the real tile positions out of the DOM (rows depend on the current
// column count, content lengths and filters, none of which React knows at
// render time) and turns them into marker positions in the rail's own
// coordinate space.
function measureRail(aside: HTMLElement, gridEl: HTMLElement, months: RailMonth[]): RailLayout {
  // Below the breakpoint the rail is display:none -- nothing to place.
  if (aside.offsetParent === null || months.length === 0) return EMPTY;

  const asideTop = aside.getBoundingClientRect().top;
  const tiles = new Map<string, HTMLElement>();
  for (const el of gridEl.querySelectorAll<HTMLElement>('a[href^="/competitions/"]')) {
    tiles.set(el.getAttribute("href") as string, el);
  }

  type Row = { top: number; bottom: number; months: string[] };
  const rows: Row[] = [];
  for (const { slug, month } of months) {
    const el = tiles.get(`/competitions/${slug}`);
    if (!el) continue;
    const rect = el.getBoundingClientRect();
    const top = Math.round(rect.top - asideTop);
    const bottom = Math.round(rect.bottom - asideTop);
    const last = rows[rows.length - 1];
    if (last && last.top === top) {
      last.months.push(month);
      last.bottom = Math.max(last.bottom, bottom);
    } else {
      rows.push({ top, bottom, months: [month] });
    }
  }
  if (rows.length === 0) return EMPTY;

  const markers: Marker[] = [];
  let prev: { rowIndex: number; y: number; height: number } | null = null;
  const place = (rowIndex: number, rowTop: number, height: number): number => {
    const gap = prev && prev.rowIndex === rowIndex ? STACK_GAP : MIN_GAP;
    const y = prev ? Math.max(rowTop, prev.y + prev.height + gap) : rowTop;
    prev = { rowIndex, y, height };
    return y;
  };

  markers.push({ key: "today", y: place(0, rows[0].top, TODAY_HEIGHT), kind: "today", label: "TODAY" });

  const seen = new Set<string>();
  rows.forEach((row, rowIndex) => {
    for (const month of row.months) {
      if (seen.has(month)) continue;
      seen.add(month);
      const [year, monthNumber] = month.split("-");
      markers.push({
        key: month,
        y: place(rowIndex, row.top, MONTH_HEIGHT),
        kind: "month",
        label: MONTH_LABELS[Number(monthNumber) - 1],
        year,
      });
    }
  });

  return {
    markers,
    line: { top: rows[0].top, height: rows[rows.length - 1].bottom - rows[0].top },
  };
}

// Decorative orientation aid next to the homepage grid: shows which month a
// stretch of tiles belongs to while scrolling. Not sticky, not interactive.
// Expects to be a sibling of an element carrying `data-timeline-grid`.
export function TimelineRail({ months }: { months: RailMonth[] }) {
  const asideRef = useRef<HTMLElement>(null);
  const [layout, setLayout] = useState<RailLayout>(EMPTY);

  useLayoutEffect(() => {
    const aside = asideRef.current;
    const gridEl = aside?.parentElement?.querySelector<HTMLElement>("[data-timeline-grid]");
    if (!aside || !gridEl) return;

    const update = () => {
      const next = measureRail(aside, gridEl, months);
      setLayout((current) => (JSON.stringify(current) === JSON.stringify(next) ? current : next));
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(gridEl);

    let cancelled = false;
    document.fonts.ready.then(() => {
      if (!cancelled) update();
    });

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [months]);

  return (
    <aside ref={asideRef} aria-hidden="true" className="relative hidden md:block">
      {layout.line && (
        <div
          className="absolute left-[11px] w-px bg-black/15"
          style={{ top: layout.line.top, height: layout.line.height }}
        />
      )}
      {layout.markers.map((marker) => {
        const isToday = marker.kind === "today";
        return (
          <div
            key={marker.key}
            className="absolute left-0 flex items-start gap-[10px]"
            style={{ top: marker.y }}
          >
            <span className={`mt-[6px] block h-1 w-[22px] shrink-0 ${isToday ? "bg-ink" : "bg-black/30"}`} />
            <span className="flex flex-col font-sans font-bold uppercase tracking-[.06em]">
              <span className={`text-[15px] leading-[15px] ${isToday ? "text-ink" : "text-black/60"}`}>
                {marker.label}
              </span>
              {marker.year && (
                <span className="mt-1 text-[13px] leading-[13px] text-black/45">{marker.year}</span>
              )}
            </span>
          </div>
        );
      })}
    </aside>
  );
}
