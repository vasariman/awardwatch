import { daysUntil, getAllCompetitions } from "./competitions";
import { SITE_URL } from "./site";
import type { Competition } from "./types";

const BASE_WINDOW_DAYS = 60;
const WINDOW_STEP_DAYS = 15;
const MAX_WINDOW_DAYS = 120;
const MIN_ENTRIES = 5;
const LAST_CHANCE_CUTOFF_DAYS = 30;

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export type DigestSelection = {
  windowDays: number;
  lastChance: Competition[];
  saveTheDate: Competition[];
  subject: string;
};

/** Deadlines from today up to `windowDays` out, excluding anything without
 *  a confirmed date ("pending"/"upcoming") or already past -- the live
 *  status from getAllCompetitions() already accounts for stale stored
 *  status, the explicit deadline check is just belt-and-suspenders. */
function eligibleWithinWindow(competitions: Competition[], today: Date, windowDays: number): Competition[] {
  return competitions.filter((c) => {
    if (c.deadline === null) return false;
    if (c.status === "pending" || c.status === "upcoming") return false;
    const days = daysUntil(c.deadline, today);
    return days >= 0 && days <= windowDays;
  });
}

function byDeadlineAscending(a: Competition, b: Competition): number {
  return (a.deadline as string).localeCompare(b.deadline as string);
}

export function buildDigestSelection(today = new Date()): DigestSelection {
  const competitions = getAllCompetitions();

  let windowDays = BASE_WINDOW_DAYS;
  let matches = eligibleWithinWindow(competitions, today, windowDays);

  while (matches.length < MIN_ENTRIES && windowDays < MAX_WINDOW_DAYS) {
    windowDays = Math.min(windowDays + WINDOW_STEP_DAYS, MAX_WINDOW_DAYS);
    matches = eligibleWithinWindow(competitions, today, windowDays);
  }

  const lastChance = matches
    .filter((c) => daysUntil(c.deadline as string, today) <= LAST_CHANCE_CUTOFF_DAYS)
    .sort(byDeadlineAscending);
  const saveTheDate = matches
    .filter((c) => daysUntil(c.deadline as string, today) > LAST_CHANCE_CUTOFF_DAYS)
    .sort(byDeadlineAscending);

  const windowEnd = new Date(today);
  windowEnd.setUTCDate(windowEnd.getUTCDate() + windowDays);
  const monthName = MONTH_NAMES[windowEnd.getUTCMonth()];

  return {
    windowDays,
    lastChance,
    saveTheDate,
    subject: `${matches.length} design competitions with deadlines until end of ${monthName}`,
  };
}

function formatDeadline(iso: string): string {
  const date = new Date(iso + "T00:00:00Z");
  const day = date.getUTCDate();
  const month = MONTH_NAMES[date.getUTCMonth()];
  return `${day} ${month} ${date.getUTCFullYear()}`;
}

function detailUrl(competition: Competition, utmCampaign: string): string {
  const url = new URL(`${SITE_URL}/competitions/${competition.slug}`);
  url.searchParams.set("utm_source", "newsletter");
  url.searchParams.set("utm_medium", "email");
  url.searchParams.set("utm_campaign", utmCampaign);
  return url.toString();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function entryRow(competition: Competition, utmCampaign: string): string {
  const link = detailUrl(competition, utmCampaign);
  return `
    <tr>
      <td style="padding:14px 0;border-bottom:1px solid #dddddd;">
        <a href="${link}" style="font-size:16px;font-weight:bold;color:#111111;text-decoration:underline;">${escapeHtml(competition.title)}</a><br/>
        <span style="font-size:13px;color:#555555;">${escapeHtml(competition.organizer)}</span><br/>
        <span style="font-size:13px;color:#555555;">Deadline: ${formatDeadline(competition.deadline as string)} &middot; ${escapeHtml(competition.categories.join(", "))}</span>
      </td>
    </tr>`;
}

function section(title: string, entries: Competition[], utmCampaign: string): string {
  if (entries.length === 0) return "";
  return `
    <tr>
      <td style="padding:24px 0 4px 0;">
        <span style="font-size:14px;font-weight:bold;text-transform:uppercase;letter-spacing:0.04em;color:#111111;">${title}</span>
      </td>
    </tr>
    <tr>
      <td>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${entries.map((c) => entryRow(c, utmCampaign)).join("")}
        </table>
      </td>
    </tr>`;
}

const TRACKING_NOTICE = `
    <tr>
      <td style="padding:0 0 20px 0;font-size:13px;color:#555555;">
        From this issue on, we measure opens and clicks to improve the newsletter. Details are in our
        <a href="${SITE_URL}/datenschutz" style="color:#111111;">privacy policy</a>. You can unsubscribe at any time using the link below.
      </td>
    </tr>`;

export function buildDigestHtml(selection: DigestSelection, utmCampaign: string): string {
  const showTrackingNotice = process.env.NEWSLETTER_SHOW_TRACKING_NOTICE === "true";

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#f4f4f4;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f4;">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;font-family:Arial,Helvetica,sans-serif;">
            <tr>
              <td style="padding:24px 24px 0 24px;">
                <span style="font-size:20px;font-weight:bold;color:#111111;">AwardWatch</span>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  ${showTrackingNotice ? TRACKING_NOTICE : ""}
                  ${section("Last chance", selection.lastChance, utmCampaign)}
                  ${section("Save the date", selection.saveTheDate, utmCampaign)}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 24px;border-top:1px solid #dddddd;font-size:12px;color:#888888;">
                AwardWatch &middot; Dennis He&szlig; &middot; Horber Str. 35 &middot; 71083 Herrenberg &middot; Germany<br/>
                <a href="{{ unsubscribe }}" style="color:#888888;">Unsubscribe</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
