"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function scrollKey(pathname: string, qs: string): string {
  return `scrollpos:${pathname}${qs ? `?${qs}` : ""}`;
}

// The homepage is fully dynamic (it reads searchParams for the filters),
// which makes Next's own back/forward scroll restoration unreliable --
// clicking into a competition and going back was landing at the top
// instead of where the user was scrolled to. This restores it manually:
// scroll position is saved continuously, keyed by the exact URL (path +
// query, so each filter/search combination has its own remembered spot),
// and restored once when this component (re)mounts -- which happens
// exactly when navigating back here from elsewhere, not on every filter
// change (those update the URL in place without unmounting the page).
export function ScrollPositionMemory() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qs = searchParams.toString();
  const keyRef = useRef(scrollKey(pathname, qs));

  useEffect(() => {
    keyRef.current = scrollKey(pathname, qs);
  }, [pathname, qs]);

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    const saved = sessionStorage.getItem(keyRef.current);
    if (saved) window.scrollTo(0, Number(saved));

    function handleScroll() {
      sessionStorage.setItem(keyRef.current, String(window.scrollY));
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
    // Mount-only: restoring should happen once per real page load (a fresh
    // mount, i.e. navigating back here from elsewhere), not on every
    // filter-driven URL change. The listener always reads the live URL via
    // keyRef, kept current by the effect above.
  }, []);

  return null;
}
