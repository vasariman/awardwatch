import type { Metadata } from "next";
import { CopyCalendarUrl } from "@/components/CopyCalendarUrl";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Subscribe to calendar — AwardWatch",
  description:
    "Subscribe to AwardWatch deadlines in Apple Calendar, Outlook, or Google Calendar.",
  alternates: { canonical: "/calendar-feed" },
};

const HTTPS_URL = `${SITE_URL}/calendar.ics`;
const WEBCAL_URL = HTTPS_URL.replace(/^https?:\/\//, "webcal://");

export default function CalendarFeedPage() {
  return (
    <div className="border-t-2 border-ink px-6 pb-24 md:px-10">
      <div className="mx-auto max-w-[820px]">
        <h1 className="mt-14 max-w-3xl font-sans text-[13vw] font-black leading-[0.95] tracking-[-0.03em] text-ink sm:text-6xl md:mt-16 md:text-7xl">
          Subscribe to calendar
        </h1>

        <p className="mt-8 font-sans text-lg font-semibold leading-relaxed text-ink md:text-xl">
          Every tracked deadline, as a calendar you subscribe to once —
          no more checking the site to see what changed.
        </p>

        <div className="mt-14 border-t-2 border-ink pt-10">
          <h2 className="font-sans text-2xl font-black tracking-[-0.02em] text-ink md:text-3xl">
            Apple Calendar &amp; Outlook
          </h2>
          <p className="mt-5 font-sans text-base leading-relaxed text-black/70 md:text-lg">
            Open the link below and your calendar app will offer to
            subscribe.
          </p>
          <a
            href={WEBCAL_URL}
            className="mt-6 inline-block bg-accent px-7 py-4 font-sans text-sm font-bold uppercase tracking-[.02em] text-white no-underline"
          >
            Subscribe →
          </a>
        </div>

        <div className="mt-14 border-t-2 border-ink pt-10">
          <h2 className="font-sans text-2xl font-black tracking-[-0.02em] text-ink md:text-3xl">
            Google Calendar
          </h2>
          <p className="mt-5 font-sans text-base leading-relaxed text-black/70 md:text-lg">
            Google Calendar doesn&rsquo;t follow calendar links directly —
            copy the URL below, then in Google Calendar go to{" "}
            <span className="font-bold text-ink">Other calendars → From URL</span>{" "}
            and paste it in.
          </p>
          <div className="mt-6">
            <CopyCalendarUrl url={HTTPS_URL} />
          </div>
        </div>

        <div className="mt-14 border-t-2 border-ink pt-10">
          <h2 className="font-sans text-2xl font-black tracking-[-0.02em] text-ink md:text-3xl">
            Good to know
          </h2>
          <ul className="mt-5 flex flex-col gap-3 font-sans text-base leading-relaxed text-black/70 md:text-lg">
            <li>
              Competitions without a confirmed deadline aren&rsquo;t in the
              feed — they only show up on the website once official dates
              are announced.
            </li>
            <li>
              Google Calendar checks subscribed calendars for updates on
              its own schedule, often once every 12–24 hours — a change on
              the site may take a while to show up there.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
