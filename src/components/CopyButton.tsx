"use client";

import { useState } from "react";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable — nothing more to do, the block's text
      // is still plain, selectable text on the page.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Copy this section as text"
      aria-label="Copy this section as text"
      className="shrink-0 border border-ink p-1.5 text-ink transition-colors hover:bg-ink hover:text-white"
    >
      {copied ? (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 8.5L6 12.5L14 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="5.5" y="5.5" width="9" height="9" stroke="currentColor" strokeWidth="1.4" />
          <path d="M3 10.5V2.5C3 2.22386 3.22386 2 3.5 2H10.5" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      )}
    </button>
  );
}
