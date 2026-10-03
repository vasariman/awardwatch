"use client";

import { useLayoutEffect, useRef, useState } from "react";

// The homepage list is three consecutive blocks: dated tiles that are still
// running, "Dates TBA", and expired. Each gets its own beam on the rail.
export type RailBlock = "active" | "tba" | "expired";

/** One visible tile of the grid, in display order. `month` is "YYYY-MM" from
 *  the deadline (the date the list is sorted by); TBA tiles have none. */
export type RailItem = { slug: string; block: RailBlock; month?: string };

type Marker = {
  key: string;
  y: number;
  block: RailBlock;
  kind: "today" | "past" | "month" | "tba";
  label: string;
  /** Second line: the year for months, "TBA" for the Dates TBA marker. */
  sub?: string;
  /** Sticky markers (months, Dates TBA) only: height of the span they stick
   *  within -- down to MIN_GAP before the next marker of the same block, or
   *  the end of that block's beam. */
  sectionHeight?: number;
};

type Segment = { block: RailBlock; top: number; height: number };

type RailLayout = { markers: Marker[]; segments: Segment[] };

const EMPTY: RailLayout = { markers: [], segments: [] };

const MONTH_LABELS = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

// Fixed by the explicit line-heights in the markup below, so collision math
// doesn't need to measure the markers themselves.
const ONE_LINE_HEIGHT = 15;
const TWO_LINE_HEIGHT = 15 + 4 + 13;
// Two markers inside the same grid row are stacked this far apart; a marker
// pushed down by one from an earlier row keeps at least MIN_GAP below it.
const STACK_GAP = 18;
const MIN_GAP = 10;

const BLOCK_ORDER: RailBlock[] = ["active", "tba", "expired"];

// Reads the real tile positions out of the DOM (rows depend on the current
// column count, content lengths and filters, none of which React knows at
// render time) and turns them into markers and beams in the rail's own
// coordinate space.
function measureRail(aside: HTMLElement, gridEl: HTMLElement, items: RailItem[]): RailLayout {
  // Below the breakpoint the rail is display:none -- nothing to place.
  if (aside.offsetParent === null || items.length === 0) return EMPTY;

  const asideTop = aside.getBoundingClientRect().top;
  const tiles = new Map<string, HTMLElement>();
  for (const el of gridEl.querySelectorAll<HTMLElement>('a[href^="/competitions/"]')) {
    tiles.set(el.getAttribute("href") as string, el);
  }

  type Row = { top: number; bottom: number; items: RailItem[] };
  const rows: Row[] = [];
  for (const item of items) {
    const el = tiles.get(`/competitions/${item.slug}`);
    if (!el) continue;
    const rect = el.getBoundingClientRect();
    const top = Math.round(rect.top - asideTop);
    const bottom = Math.round(rect.bottom - asideTop);
    const last = rows[rows.length - 1];
    if (last && last.top === top) {
      last.items.push(item);
      last.bottom = Math.max(last.bottom, bottom);
    } else {
      rows.push({ top, bottom, items: [item] });
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

  // Per block: its start marker and the last row it reaches.
  const blocks = new Map<RailBlock, { startMarker: number; endRow: number }>();
  const seen = new Set<string>();
  let currentBlock: RailBlock | null = null;

  rows.forEach((row, rowIndex) => {
    for (const item of row.items) {
      if (item.block !== currentBlock) {
        currentBlock = item.block;
        const start: Omit<Marker, "y"> =
          item.block === "active"
            ? { key: "today", block: "active", kind: "today", label: "TODAY" }
            : item.block === "tba"
              ? { key: "tba", block: "tba", kind: "tba", label: "DATES", sub: "TBA" }
              : { key: "past", block: "expired", kind: "past", label: "PAST" };
        const height = start.kind === "tba" ? TWO_LINE_HEIGHT : ONE_LINE_HEIGHT;
        blocks.set(item.block, { startMarker: markers.length, endRow: rowIndex });
        markers.push({ ...start, y: place(rowIndex, row.top, height) });
      }
      (blocks.get(item.block) as { endRow: number }).endRow = rowIndex;

      if (item.month && !seen.has(`${item.block}:${item.month}`)) {
        seen.add(`${item.block}:${item.month}`);
        const [year, monthNumber] = item.month.split("-");
        markers.push({
          key: `${item.block}:${item.month}`,
          block: item.block,
          kind: "month",
          label: MONTH_LABELS[Number(monthNumber) - 1],
          sub: year,
          y: place(rowIndex, row.top, TWO_LINE_HEIGHT),
        });
      }
    }
  });

  // One beam per block, clearly cut off from the next: it ends at the bottom
  // of its last row, or STACK_GAP above the next block's start marker when
  // that marker shares the row.
  const present = BLOCK_ORDER.filter((block) => blocks.has(block));
  const segments: Segment[] = present.map((block, index) => {
    const info = blocks.get(block) as { startMarker: number; endRow: number };
    const top = markers[info.startMarker].y;
    const nextBlock = present[index + 1];
    const rowBottom = rows[info.endRow].bottom;
    const bottom = nextBlock
      ? Math.min(rowBottom, markers[(blocks.get(nextBlock) as { startMarker: number }).startMarker].y - STACK_GAP)
      : rowBottom;
    return { block, top, height: Math.max(bottom - top, 0) };
  });

  markers.forEach((marker, index) => {
    if (marker.kind !== "month" && marker.kind !== "tba") return;
    const next = markers[index + 1];
    const segment = segments.find((s) => s.block === marker.block) as Segment;
    const end =
      next && next.block === marker.block ? next.y - MIN_GAP : segment.top + segment.height;
    marker.sectionHeight = Math.max(end - marker.y, TWO_LINE_HEIGHT);
  });

  return { markers, segments };
}

// Decorative orientation aid next to the homepage grid: shows which month a
// stretch of tiles belongs to while scrolling. Not interactive. The current
// month's marker (and "Dates TBA") follows along at the top of the viewport
// and is pushed out by the next one -- plain CSS `position: sticky` inside a
// per-marker span, no scroll listener. TODAY and PAST only label where their
// beam starts and scroll away like the list.
// Expects to be a sibling of an element carrying `data-timeline-grid`.
export function TimelineRail({ items }: { items: RailItem[] }) {
  const asideRef = useRef<HTMLElement>(null);
  const [layout, setLayout] = useState<RailLayout>(EMPTY);

  useLayoutEffect(() => {
    const aside = asideRef.current;
    const gridEl = aside?.parentElement?.querySelector<HTMLElement>("[data-timeline-grid]");
    if (!aside || !gridEl) return;

    const update = () => {
      const next = measureRail(aside, gridEl, items);
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
  }, [items]);

  return (
    <aside ref={asideRef} aria-hidden="true" className="relative hidden md:block">
      {layout.segments.map((segment) => (
        <div
          key={segment.block}
          className={`absolute left-[11px] w-px ${
            segment.block === "active" ? "bg-black/15" : segment.block === "expired" ? "bg-black/10" : ""
          }`}
          style={{
            top: segment.top,
            height: segment.height,
            ...(segment.block === "tba" && {
              backgroundImage: "repeating-linear-gradient(to bottom, rgba(0,0,0,.15) 0 4px, transparent 4px 8px)",
            }),
          }}
        />
      ))}
      {layout.markers.map((marker) =>
        marker.sectionHeight === undefined ? (
          <div key={marker.key} className="absolute left-0" style={{ top: marker.y }}>
            <MarkerContent marker={marker} />
          </div>
        ) : (
          // The span is as tall as this marker's stretch of the list; the
          // marker inside sticks at top-6 until the span ends and the next
          // marker's span pushes it up and out.
          <div
            key={marker.key}
            className="absolute inset-x-0"
            style={{ top: marker.y, height: marker.sectionHeight }}
          >
            <div className="sticky top-6">
              <MarkerContent marker={marker} />
            </div>
          </div>
        ),
      )}
    </aside>
  );
}

// Expired markers are a step lighter than active ones, echoing the greyed
// expired tiles; TODAY is the one near-black accent.
const TONE = {
  today: { dash: "bg-ink", label: "text-ink", sub: "text-black/45" },
  active: { dash: "bg-black/30", label: "text-black/60", sub: "text-black/45" },
  expired: { dash: "bg-black/20", label: "text-black/40", sub: "text-black/30" },
};

function MarkerContent({ marker }: { marker: Marker }) {
  const tone = marker.kind === "today" ? TONE.today : marker.block === "expired" ? TONE.expired : TONE.active;
  return (
    <div className="flex items-start gap-[10px]">
      <span
        className={`mt-[6px] block h-1 w-[22px] shrink-0 ${marker.kind === "tba" ? "" : tone.dash}`}
        style={
          marker.kind === "tba"
            ? { backgroundImage: "repeating-linear-gradient(to right, rgba(0,0,0,.3) 0 5px, transparent 5px 8px)" }
            : undefined
        }
      />
      <span className="flex flex-col font-sans font-bold uppercase tracking-[.06em]">
        <span className={`text-[15px] leading-[15px] ${tone.label}`}>{marker.label}</span>
        {marker.sub && <span className={`mt-1 text-[13px] leading-[13px] ${tone.sub}`}>{marker.sub}</span>}
      </span>
    </div>
  );
}
