"use client";

import { useEffect } from "react";
import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

// Lets you exclude your own visits from Vercel Analytics.
// Visit the site once with ?va=off to opt out on this device/browser
// (stored in localStorage, persists across future visits without the
// param). Visit with ?va=on to opt back in.
const OPT_OUT_KEY = "va-opt-out";
const PARAM = "va";

function isOptedOut(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(OPT_OUT_KEY) === "1";
  } catch {
    return false;
  }
}

export function VercelAnalytics() {
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get(PARAM);
    try {
      if (value === "off") {
        window.localStorage.setItem(OPT_OUT_KEY, "1");
      } else if (value === "on") {
        window.localStorage.removeItem(OPT_OUT_KEY);
      }
    } catch {
      // localStorage unavailable (e.g. private browsing) — nothing to do.
    }
  }, []);

  return (
    <Analytics beforeSend={(event: BeforeSendEvent) => (isOptedOut() ? null : event)} />
  );
}
