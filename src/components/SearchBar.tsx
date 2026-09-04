"use client";

import { useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const DEBOUNCE_MS = 200;

// Filters live as-you-type: every keystroke updates the URL's `q` param
// (debounced, `scroll: false` so the page never jumps to top), which the
// server component re-renders against. Other active filters (category/
// status/student) are read straight off the current URL and carried along
// untouched.
export function SearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlValue = searchParams.get("q") ?? "";
  const [value, setValue] = useState(urlValue);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keeps the input in sync when `q` changes from outside this component
  // (back/forward navigation, or another control clearing filters) without
  // an effect: React's documented pattern for resetting state on a prop
  // change is to compare and setState during render, not in useEffect.
  const [trackedUrlValue, setTrackedUrlValue] = useState(urlValue);
  if (urlValue !== trackedUrlValue) {
    setTrackedUrlValue(urlValue);
    setValue(urlValue);
  }

  function handleChange(next: string) {
    setValue(next);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.trim()) params.set("q", next);
      else params.delete("q");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, DEBOUNCE_MS);
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(event) => handleChange(event.target.value)}
      placeholder="Search competitions…"
      aria-label="Search competitions"
      className="w-full border-2 border-ink bg-white px-4 py-3 font-sans text-sm text-ink outline-none placeholder:text-black/35 focus:border-accent md:max-w-md"
    />
  );
}
