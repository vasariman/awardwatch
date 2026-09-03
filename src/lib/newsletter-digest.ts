import { daysUntil, getAllCompetitions, statusLabel } from "./competitions";
import { SITE_URL } from "./site";
import type { Competition, Status } from "./types";

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

// Brand values, kept in sync by hand with src/app/globals.css -- email
// clients can't read CSS custom properties, so these have to be inlined
// literals rather than actually shared with the site's --color-* tokens.
const COLOR_INK = "#141414";
const COLOR_ACCENT = "#e6392a";
const COLOR_CREAM = "#efece6";
// The site's actual fonts (checked against src/app/layout.tsx) are Archivo
// (--font-sans, used at weight 900 for every heading) and IBM Plex Mono
// (--font-mono, used for the small uppercase "eyebrow" labels). Neither is
// available in email clients without a webfont, which the newsletter spec
// deliberately rules out -- these stacks are the closest widely-supported
// system approximation: a black/heavy grotesque for headings, Courier for
// mono.
const FONT_SANS = "Arial, Helvetica, sans-serif";
const FONT_SANS_BLACK = "'Arial Black', Arial, Helvetica, sans-serif";
const FONT_MONO = "'Courier New', Courier, monospace";

// The header label next to the logo -- deliberately set in the same heading
// font as sectionHeading()/entry titles, not the small mono eyebrow, per
// explicit direction.
function headingLabel(text: string): string {
  return `<span style="font-family:${FONT_SANS_BLACK};font-size:14px;font-weight:900;text-transform:uppercase;letter-spacing:0.06em;color:${COLOR_INK};">${text}</span>`;
}

// Matches the site's h2 heading style exactly (src/app/page.tsx, "All
// competitions": font-sans text-3xl font-black tracking-[-0.02em] text-ink)
// -- normal case, not the small uppercase mono eyebrow treatment.
function sectionHeading(text: string, color: string): string {
  return `<span style="font-family:${FONT_SANS_BLACK};font-size:28px;font-weight:900;letter-spacing:-0.02em;color:${color};">${text}</span>`;
}

// Mirrors src/components/Chips.tsx exactly (colors from src/app/globals.css,
// same padding/size/tracking/square corners) -- only "open"/"closing-soon"/
// "upcoming" ever reach this, pending/expired are filtered out before a
// competition is selected for the digest.
const STATUS_CHIP_STYLE: Record<Status, string> = {
  open: `background-color:${COLOR_INK};color:#ffffff;`,
  "closing-soon": `background-color:${COLOR_ACCENT};color:#ffffff;`,
  upcoming: `background-color:#ffffff;color:${COLOR_INK};border:1px solid ${COLOR_INK};`,
  pending: `background-color:${COLOR_CREAM};color:rgba(0,0,0,0.6);border:1px dashed rgba(0,0,0,0.4);`,
  expired: `background-color:#e6e6e6;color:rgba(0,0,0,0.4);`,
};

function chip(text: string, style: string, fontSize: number): string {
  return `<span style="display:inline-block;margin:0 6px 6px 0;padding:8px 12px;font-family:${FONT_SANS};font-size:${fontSize}px;font-weight:bold;text-transform:uppercase;letter-spacing:0.04em;line-height:1;${style}">${escapeHtml(text)}</span>`;
}

function statusChip(status: Status): string {
  return chip(statusLabel(status), STATUS_CHIP_STYLE[status], 11);
}

function categoryChip(category: string): string {
  return chip(category, `background-color:${COLOR_INK};color:#ffffff;`, 10);
}

function studentChip(): string {
  return chip("Student", `background-color:#ffffff;color:${COLOR_INK};border:1px solid ${COLOR_INK};`, 10);
}

function entryRow(competition: Competition, utmCampaign: string): string {
  const link = detailUrl(competition, utmCampaign);
  const badges = [
    statusChip(competition.status),
    ...competition.categories.map(categoryChip),
    ...(competition.studentTag ? [studentChip()] : []),
  ].join("");

  // Label word kept small/muted/uppercase like the site, but in the same
  // font family as everything else -- no second typeface in the tile.
  const deadlineLine = `<span style="font-family:${FONT_SANS};font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:0.06em;color:rgba(0,0,0,0.45);">Deadline</span> <span style="font-family:${FONT_SANS};font-size:14px;font-weight:bold;color:${COLOR_INK};">${formatDeadline(competition.deadline as string)}</span>`;

  // A bordered tile per entry (border-2 border-ink bg-white p-6 on the
  // site's own card), not a plain list separated by a rule. The whole tile
  // is one link (an <a> wrapping a <table> is non-standard HTML but is
  // exactly the technique email clients rely on for block-level clickable
  // areas; Outlook drops the wrapper but still shows the underlying content).
  return `
    <tr>
      <td style="padding-bottom:16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:2px solid ${COLOR_INK};background-color:#ffffff;">
          <tr>
            <td style="padding:0;">
              <a href="${link}" style="display:block;padding:20px;color:inherit;text-decoration:none;">
                <div>${badges}</div>
                <span style="display:inline-block;margin-top:12px;font-family:${FONT_SANS_BLACK};font-size:19px;font-weight:900;letter-spacing:-0.02em;line-height:1.15;color:${COLOR_INK};">${escapeHtml(competition.title)}</span><br/>
                <span style="display:inline-block;margin-top:6px;font-family:${FONT_SANS};font-size:14px;font-weight:bold;color:rgba(0,0,0,0.6);">${escapeHtml(competition.organizer)}</span>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px;">
                  <tr>
                    <td style="padding-top:12px;border-top:1px solid rgba(0,0,0,0.15);">
                      ${deadlineLine}
                    </td>
                  </tr>
                </table>
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function section(title: string, entries: Competition[], utmCampaign: string, accentColor: string): string {
  if (entries.length === 0) return "";
  return `
    <tr>
      <td style="padding:28px 0 14px 0;border-top:4px solid ${COLOR_INK};">
        ${sectionHeading(title, accentColor)}
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
      <td style="padding:0 0 24px 0;font-family:${FONT_SANS};font-size:13px;color:${COLOR_INK};background-color:${COLOR_CREAM};border:2px solid ${COLOR_INK};">
        <div style="padding:14px 16px;">
          From this issue on, we measure opens and clicks to improve the newsletter. Details are in our
          <a href="${SITE_URL}/datenschutz" style="color:${COLOR_INK};font-weight:bold;">privacy policy</a>. You can unsubscribe at any time using the link below.
        </div>
      </td>
    </tr>`;

export function buildDigestHtml(selection: DigestSelection, utmCampaign: string): string {
  const showTrackingNotice = process.env.NEWSLETTER_SHOW_TRACKING_NOTICE === "true";

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:${COLOR_CREAM};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COLOR_CREAM};">
      <tr>
        <td align="center" style="padding:32px 12px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border:2px solid ${COLOR_INK};font-family:${FONT_SANS};">
            <tr>
              <td style="padding:24px;border-bottom:2px solid ${COLOR_INK};">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td valign="middle" style="width:86px;">
                      <img src="${SITE_URL}/logo.png" width="72" height="81" alt="AwardWatch" style="display:block;border:0;" />
                    </td>
                    <td valign="middle" align="right">
                      ${headingLabel("Newsletter")}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 24px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  ${showTrackingNotice ? TRACKING_NOTICE : ""}
                  ${section("Closing soon", selection.lastChance, utmCampaign, COLOR_ACCENT)}
                  ${section("Save the date", selection.saveTheDate, utmCampaign, COLOR_INK)}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 24px 28px 24px;border-top:1px solid rgba(0,0,0,0.15);">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="padding-top:16px;font-family:${FONT_MONO};font-size:11px;color:rgba(0,0,0,0.45);">
                      &copy; ${new Date().getUTCFullYear()} AwardWatch. All rights reserved.
                    </td>
                    <td align="right" style="padding-top:16px;font-family:${FONT_MONO};font-size:11px;">
                      <a href="${SITE_URL}/impressum" style="color:rgba(0,0,0,0.45);">Imprint</a>
                      &middot;
                      <a href="${SITE_URL}/datenschutz" style="color:rgba(0,0,0,0.45);">Privacy</a>
                      &middot;
                      <a href="{{ unsubscribe }}" style="color:rgba(0,0,0,0.45);">Unsubscribe</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
