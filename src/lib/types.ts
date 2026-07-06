export type Category =
  | "Product/Industrial Design"
  | "Graphic Design"
  | "UX/UI Design"
  | "Architecture"
  | "Interior/Furniture Design"
  | "Sustainable Design";

export type TargetAudience = "students" | "professionals" | "open";

export type Status = "open" | "closing-soon" | "expired";

export interface Competition {
  slug: string;
  title: string;
  organizer: string;
  deadline: string;
  category: Category;
  targetAudience: TargetAudience;
  studentTag: boolean;
  country: string;
  entryFee: string;
  registrationUrl: string;
  prizeMoney: string;
  resultDate: string;
  shortDescription: string;
  longDescription: string;
  submissionFormat: string;
  status: Status;
}

export const CATEGORIES: Category[] = [
  "Product/Industrial Design",
  "Graphic Design",
  "UX/UI Design",
  "Architecture",
  "Interior/Furniture Design",
  "Sustainable Design",
];
