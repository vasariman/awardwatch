"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";

type State = "idle" | "loading" | "done" | "error";

const MESSAGES: Record<string, string> = {
  invalid_email: "That doesn't look like a valid email address.",
  consent_required: "Please confirm the checkbox to continue.",
  server_error: "Something went wrong on our side. Please try again later.",
};

export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [company, setCompany] = useState(""); // honeypot
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (state === "loading") return;

    setState("loading");
    setMessage("");

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, consent, company }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setState("done");
        return;
      }

      setState("error");
      setMessage(MESSAGES[data.error] ?? MESSAGES.server_error);
    } catch {
      setState("error");
      setMessage(MESSAGES.server_error);
    }
  }

  return (
    <div className="col-span-full border-2 border-ink bg-cream p-6 md:p-10">
      {state === "done" ? (
        <div className="flex flex-col gap-3">
          <p className="font-mono text-[11px] uppercase tracking-[.06em] text-black/45">
            Almost there
          </p>
          <h3 className="max-w-2xl font-sans text-2xl font-black leading-[1.02] tracking-[-0.02em] text-ink md:text-3xl">
            Check your inbox and confirm your address.
          </h3>
          <p className="max-w-xl font-sans text-sm leading-relaxed text-black/70">
            We&apos;ve sent you a confirmation link. Until you click it, you
            are not subscribed and we store nothing.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between md:gap-12">
          <div className="md:max-w-md">
            <p className="font-mono text-[11px] uppercase tracking-[.06em] text-black/45">
              Newsletter
            </p>
            <h3 className="mt-3 font-sans text-2xl font-black leading-[1.02] tracking-[-0.02em] text-ink md:text-3xl">
              Never miss a deadline.
            </h3>
            <p className="mt-3 font-sans text-sm leading-relaxed text-black/70">
              Every two weeks: the design competitions closing in the next 30
              days, with fees and eligibility. No spam, unsubscribe in one
              click.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4 md:max-w-sm">
            {/* Honeypot: visually hidden, not display:none, so bots still fill it. */}
            <div aria-hidden="true" className="h-0 w-0 overflow-hidden opacity-0">
              <label htmlFor="nl-company">Company</label>
              <input
                id="nl-company"
                name="company"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={company}
                onChange={(event) => setCompany(event.target.value)}
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <label htmlFor="nl-email" className="sr-only">
                Email address
              </label>
              <input
                id="nl-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@studio.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full border-2 border-ink bg-white px-4 py-3 font-sans text-sm text-ink outline-none placeholder:text-black/35 focus:border-accent"
              />
              <button
                type="submit"
                disabled={state === "loading"}
                className="border-2 border-ink bg-ink px-6 py-3 font-sans text-sm font-bold text-white transition-colors hover:bg-accent hover:border-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                {state === "loading" ? "…" : "Subscribe"}
              </button>
            </div>

            <label
              htmlFor="nl-consent"
              className="flex cursor-pointer items-start gap-3 font-sans text-xs leading-relaxed text-black/60"
            >
              <input
                id="nl-consent"
                name="consent"
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-ink)]"
              />
              <span>
                I agree to receive the AwardWatch newsletter by email and have
                read the{" "}
                <Link href="/datenschutz" className="text-ink underline">
                  privacy policy
                </Link>
                . I can withdraw my consent at any time.
              </span>
            </label>

            {state === "error" && message && (
              <p role="alert" className="font-sans text-xs font-bold text-accent">
                {message}
              </p>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
