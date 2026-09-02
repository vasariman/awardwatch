"use client";

import { useState } from "react";

export function CopyCalendarUrl({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — the URL is
      // still selectable text right next to the button, nothing more to
      // do here.
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 border-2 border-ink bg-cream p-4">
      <code className="flex-1 break-all font-mono text-xs text-ink">{url}</code>
      <button
        type="button"
        onClick={handleCopy}
        className="shrink-0 border-2 border-ink bg-ink px-4 py-2 font-sans text-xs font-bold uppercase tracking-[.03em] text-white transition-colors hover:bg-accent hover:border-accent"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
