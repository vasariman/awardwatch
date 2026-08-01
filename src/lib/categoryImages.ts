import type { Category } from "./types";

// Editorial hero visuals per category, used as a fallback wherever a
// competition doesn't have its own image yet (hero slides, detail page).
// Add more entries here as new category images become available — the
// UI already falls back gracefully for categories without one.
// Always .webp — smaller file size than the source .png/.af exports
// that also live in public/categories/.
export const CATEGORY_IMAGES: Partial<Record<Category, string>> = {
  "Product/Industrial Design": "/categories/product-industrial-design.webp",
  Architecture: "/categories/architecture.webp",
  "Interior/Furniture Design": "/categories/interior-furniture-design.webp",
  "UX/UI Design": "/categories/uiux-design.webp",
  "Graphic Design": "/categories/graphic-design.webp",
  "Sustainable Design": "/categories/sustainable-design.webp",
};

// Competitions can span multiple categories; use the first one (in the
// order the competition lists them) that has an image, so entries with
// a mix of covered/uncovered categories still show something relevant.
export function getCategoryImage(categories: Category[]): string | null {
  for (const category of categories) {
    const image = CATEGORY_IMAGES[category];
    if (image) return image;
  }
  return null;
}
