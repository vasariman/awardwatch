export type Category =
  | "Product/Industrial Design"
  | "Graphic Design"
  | "UX/UI Design"
  | "Architecture"
  | "Interior/Furniture Design"
  | "Sustainable Design";

export type TargetAudience = "students" | "professionals" | "open";

export type Status = "upcoming" | "open" | "closing-soon" | "expired" | "pending";

export interface Competition {
  slug: string;
  title: string;
  organizer: string;
  /** Stable id shared by every edition of the same award series (lowercase,
   *  hyphenated, no edition year — e.g. "german-design-award"). */
  seriesId: string;
  /** ISO date, or null when the edition is announced/expected but no
   *  official deadline has been published yet. Never estimated, never
   *  carried over from a prior edition. */
  deadline: string | null;
  categories: Category[];
  targetAudience: TargetAudience;
  studentTag: boolean;
  country: string;
  entryFee: string;
  registrationUrl: string;
  prizeMoney: string;
  /** ISO date, or null when not yet published — same rule as deadline. */
  resultDate: string | null;
  shortDescription: string;
  longDescription: string;
  submissionFormat: string;
  status: Status;
  /** Only meaningful when deadline is null. Free-text, sourced expected
   *  window (e.g. "Registration usually opens in early summer") — never
   *  interpreted as a date. */
  expectedPeriod?: string;
  /** ISO date submissions open, or null/absent when not published. Optional:
   *  most editions won't have this researched. Never estimated, never
   *  carried over from a prior edition. */
  opensAt?: string | null;
  /** Fields that were an honest placeholder/estimate at research time,
   *  keyed by field name, valued by why + when to recheck. Kept through
   *  merge (unlike the old behavior of stripping it) so the admin-only
   *  audit view can surface entries that were published with unconfirmed
   *  data — never rendered anywhere on the public site. */
  sourcingNotes?: Record<string, string>;
}

export const CATEGORIES: Category[] = [
  "Product/Industrial Design",
  "Graphic Design",
  "UX/UI Design",
  "Architecture",
  "Interior/Furniture Design",
  "Sustainable Design",
];
