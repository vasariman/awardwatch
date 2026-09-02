// RFC 5545 (iCalendar) formatting primitives, plus a thin builder on top.
// Kept dependency-free and framework-agnostic so it's trivially unit
// testable — the route handlers only wire these to real competition data.

// Escapes a TEXT-valued property per RFC 5545 §3.3.11. Order matters:
// backslashes must be escaped first, or the backslashes introduced below
// for ; , and \n would themselves get escaped a second time.
export function escapeText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

// Folds a single unfolded content line to RFC 5545 §3.1's 75-octet limit.
// Counts UTF-8 bytes, not characters — an emoji or umlaut is multiple
// bytes but must never be split mid-sequence. Continuation lines are
// joined with CRLF + a single leading space, which itself counts toward
// that line's 75-octet budget (so continuation lines carry 74 content
// bytes each).
export function foldLine(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;

  const decoder = new TextDecoder();
  const parts: string[] = [];
  let start = 0;
  let budget = 75;

  while (start < bytes.length) {
    let end = Math.min(start + budget, bytes.length);
    // Back off until `end` sits on a UTF-8 character boundary (a
    // continuation byte matches the bit pattern 10xxxxxx).
    while (end > start && (bytes[end] & 0xc0) === 0x80) end--;
    parts.push(decoder.decode(bytes.slice(start, end)));
    start = end;
    budget = 74; // next line reserves 1 byte for its leading space
  }

  return parts.join("\r\n ");
}

// "YYYY-MM-DD" -> "YYYYMMDD", for DATE-valued properties (DTSTART/DTEND).
export function formatDate(iso: string): string {
  return iso.replace(/-/g, "");
}

// Adds `days` to an ISO date, returning "YYYY-MM-DD". Uses UTC throughout
// so month/year rollovers and leap years fall out of Date's own
// arithmetic rather than being handled by hand.
export function addDaysToDate(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// A Date -> "YYYYMMDDTHHMMSSZ", for DATE-TIME-valued properties (DTSTAMP).
export function formatDateTimeUTC(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

// Builds one property line (already escaped and folded), e.g.
// `buildProperty("SUMMARY", "a, b")` -> `SUMMARY:a\, b` (folded if long).
function buildProperty(name: string, value: string, escape = true): string {
  return foldLine(`${name}:${escape ? escapeText(value) : value}`);
}

export interface IcsEventInput {
  slug: string;
  title: string;
  /** ISO "YYYY-MM-DD". Callers are responsible for only calling this with
   *  a real, confirmed deadline — never null, never estimated. */
  deadline: string;
  /** Absolute URL to the competition's detail page. */
  detailUrl: string;
}

// One VEVENT block. `dtstamp` is passed in (rather than computed here) so
// every event in a single response run shares one build timestamp.
export function buildEvent(input: IcsEventInput, dtstamp: string, withAlarm = false): string {
  const lines = [
    "BEGIN:VEVENT",
    buildProperty("UID", `${input.slug}@awardwatch.net`, false),
    buildProperty("DTSTAMP", dtstamp, false),
    foldLine(`DTSTART;VALUE=DATE:${formatDate(input.deadline)}`),
    foldLine(`DTEND;VALUE=DATE:${formatDate(addDaysToDate(input.deadline, 1))}`),
    buildProperty("SUMMARY", `⏳ ${input.title} — Deadline`),
    buildProperty("URL", input.detailUrl, false),
    buildProperty("DESCRIPTION", input.detailUrl),
  ];

  if (withAlarm) {
    lines.push(
      "BEGIN:VALARM",
      "TRIGGER:-P7D",
      "ACTION:DISPLAY",
      buildProperty("DESCRIPTION", "Deadline in 7 days"),
      "END:VALARM"
    );
  }

  lines.push("END:VEVENT");
  return lines.join("\r\n");
}

// Wraps one or more pre-built VEVENT blocks in a VCALENDAR. `events` are
// already-joined multi-line strings (as returned by buildEvent).
export function buildCalendar(events: string[], calName: string): string {
  const header = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AwardWatch//Design Competition Deadlines//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    buildProperty("X-WR-CALNAME", calName),
    "REFRESH-INTERVAL;VALUE=DURATION:P1D",
    "X-PUBLISHED-TTL:P1D",
  ];
  return [...header, ...events, "END:VCALENDAR"].join("\r\n") + "\r\n";
}
