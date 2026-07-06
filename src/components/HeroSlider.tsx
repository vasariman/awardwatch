"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Competition } from "@/lib/types";
import { daysUntil, formatDate } from "@/lib/competitions";
import { CategoryChip, StatusChip } from "./Chips";

const AUTOPLAY_MS = 6500;

export function HeroSlider({ items }: { items: Competition[] }) {
  const [index, setIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = useCallback(
    (next: number) => {
      setIndex(((next % items.length) + items.length) % items.length);
    },
    [items.length]
  );

  useEffect(() => {
    if (items.length <= 1) return;
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, AUTOPLAY_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [items.length, index]);

  if (items.length === 0) return null;

  return (
    <section
      className="relative h-[78vh] min-h-[480px] w-full overflow-hidden bg-ink sm:h-[92vh] sm:min-h-[560px]"
      aria-label="Featured competitions"
    >
      {items.map((item, i) => (
        <HeroSlide key={item.slug} item={item} active={i === index} />
      ))}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-4 px-6 pb-6 md:px-10 md:pb-10">
        <div className="pointer-events-auto font-mono text-xs text-white/60">
          {String(index + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
        </div>
        <div className="pointer-events-auto flex items-center gap-4">
          <div className="flex gap-2">
            {items.map((item, i) => (
              <button
                key={item.slug}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index}
                className={`h-1.5 w-6 transition-colors ${
                  i === index ? "bg-white" : "bg-white/30"
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            aria-label="Previous slide"
            className="flex h-10 w-10 items-center justify-center border border-white/40 text-white"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            aria-label="Next slide"
            className="flex h-10 w-10 items-center justify-center border border-white/40 text-white"
          >
            →
          </button>
        </div>
      </div>
    </section>
  );
}

function HeroSlide({ item, active }: { item: Competition; active: boolean }) {
  const days = daysUntil(item.deadline);

  return (
    <div
      className={`absolute inset-0 flex flex-col justify-end px-6 pb-24 pt-16 transition-opacity duration-700 sm:pb-24 sm:pt-28 md:px-10 md:pb-28 ${
        active ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      aria-hidden={!active}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-4 top-6 select-none whitespace-nowrap font-sans text-[22vw] font-black leading-none tracking-[-0.03em] text-white/[0.06] md:text-[14vw]"
      >
        {item.category.split("/")[0]}
      </span>

      <div className="relative flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <StatusChip status={item.status} />
          <CategoryChip category={item.category} />
        </div>

        <h1 className="max-w-4xl font-sans text-[11vw] font-black leading-[0.95] tracking-[-0.03em] text-white sm:text-[8vw] md:text-[5.5vw]">
          {item.title}
        </h1>

        <div className="font-sans text-sm font-bold text-white/70 md:text-base">
          {item.organizer} — {item.country}
        </div>

        <div className="flex flex-wrap items-center gap-x-8 gap-y-3 pt-2">
          <div className="font-mono text-xs uppercase tracking-[.08em] text-white/50">
            Deadline&nbsp;
            <span className="font-sans text-sm font-bold normal-case tracking-normal text-white">
              {formatDate(item.deadline)}
            </span>
            {days >= 0 && item.status !== "expired" && (
              <span className="ml-2 text-white/50">
                ({days === 0 ? "today" : `${days}d left`})
              </span>
            )}
          </div>
          <Link
            href={`/competitions/${item.slug}`}
            className="inline-block bg-accent px-7 py-4 font-sans text-sm font-bold uppercase tracking-[.02em] text-white no-underline"
          >
            View competition →
          </Link>
        </div>
      </div>
    </div>
  );
}
