import { describe, expect, it } from "vitest";
import { addDaysToDate, escapeText, foldLine, formatDate, formatDateTimeUTC } from "./ical";

describe("escapeText", () => {
  it("escapes commas", () => {
    expect(escapeText("A' Sustainable Products, Projects and Green Design Award")).toBe(
      "A' Sustainable Products\\, Projects and Green Design Award"
    );
  });

  it("escapes semicolons and newlines", () => {
    expect(escapeText("line one; line two\nline three")).toBe(
      "line one\\; line two\\nline three"
    );
  });

  it("escapes backslashes before other characters, so nothing is double-escaped", () => {
    // A literal backslash followed by a comma must become \\\, not \\\\,
    expect(escapeText("a\\,b")).toBe("a\\\\\\,b");
  });

  it("normalizes CRLF and CR newlines to the same \\n escape as LF", () => {
    expect(escapeText("a\r\nb")).toBe("a\\nb");
    expect(escapeText("a\rb")).toBe("a\\nb");
  });
});

describe("foldLine", () => {
  it("leaves short lines untouched", () => {
    const line = "SUMMARY:⏳ James Dyson Award 2026 — Deadline";
    expect(foldLine(line)).toBe(line);
  });

  it("folds a line over 75 bytes, with continuation lines starting with one space", () => {
    const line =
      "SUMMARY:⏳ 25th Andreu World International Design Contest 2026 — Manufacturing the Future";
    const folded = foldLine(line);
    const segments = folded.split("\r\n");

    expect(segments.length).toBeGreaterThan(1);
    for (const segment of segments.slice(1)) {
      expect(segment.startsWith(" ")).toBe(true);
    }
    for (const segment of segments) {
      expect(new TextEncoder().encode(segment).length).toBeLessThanOrEqual(75);
    }

    // Folding must be losslessly reversible: strip "\r\n " and get the
    // original line back exactly.
    expect(folded.replace(/\r\n /g, "")).toBe(line);
  });

  it("never splits a multi-byte UTF-8 character across a fold boundary", () => {
    // Umlauts are 2 bytes each in UTF-8; padding pushes the boundary to
    // land mid-character unless foldLine backs off correctly.
    const line = "DESCRIPTION:" + "ä".repeat(40); // well over 75 bytes
    const folded = foldLine(line);

    for (const segment of folded.split("\r\n")) {
      const bytes = new TextEncoder().encode(segment);
      // A valid UTF-8 segment round-trips through decode/encode without
      // producing the replacement character (U+FFFD).
      expect(new TextDecoder().decode(bytes)).not.toContain("�");
      expect(bytes.length).toBeLessThanOrEqual(75);
    }
    expect(folded.replace(/\r\n /g, "")).toBe(line);
  });
});

describe("formatDate", () => {
  it("converts ISO YYYY-MM-DD to YYYYMMDD", () => {
    expect(formatDate("2026-09-15")).toBe("20260915");
  });
});

describe("addDaysToDate (used for the exclusive DTEND)", () => {
  it("rolls over a 30-day month", () => {
    expect(addDaysToDate("2026-09-30", 1)).toBe("2026-10-01");
  });

  it("rolls over a 31-day month", () => {
    expect(addDaysToDate("2027-01-31", 1)).toBe("2027-02-01");
  });

  it("handles February 28 -> March 1 in a non-leap year", () => {
    expect(addDaysToDate("2026-02-28", 1)).toBe("2026-03-01");
  });

  it("handles the leap day itself (2028 is a leap year)", () => {
    expect(addDaysToDate("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDaysToDate("2028-02-29", 1)).toBe("2028-03-01");
  });

  it("rolls over a year boundary", () => {
    expect(addDaysToDate("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("formatDateTimeUTC", () => {
  it("formats a UTC Date as YYYYMMDDTHHMMSSZ", () => {
    const date = new Date(Date.UTC(2026, 8, 2, 13, 24, 43));
    expect(formatDateTimeUTC(date)).toBe("20260902T132443Z");
  });
});
