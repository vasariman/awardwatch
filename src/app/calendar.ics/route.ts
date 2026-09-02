import type { NextRequest } from "next/server";
import { getAllCompetitions } from "@/lib/competitions";
import { CATEGORIES, type Category } from "@/lib/types";
import { SITE_URL } from "@/lib/site";
import { buildCalendar, buildEvent, formatDateTimeUTC } from "@/lib/ical";

function isKnownCategory(value: string | null): value is Category {
  return value !== null && (CATEGORIES as readonly string[]).includes(value);
}

export async function GET(request: NextRequest) {
  const categoryParam = request.nextUrl.searchParams.get("category");
  // Unknown values are ignored (fall back to the unfiltered feed) rather
  // than echoed back — never mirror unvalidated query input into output.
  const category = isKnownCategory(categoryParam) ? categoryParam : null;

  let items = getAllCompetitions().filter((c) => c.deadline !== null && c.status !== "expired");
  if (category) {
    items = items.filter((c) => c.categories.includes(category));
  }

  const dtstamp = formatDateTimeUTC(new Date());
  const events = items.map((c) =>
    buildEvent(
      {
        slug: c.slug,
        title: c.title,
        deadline: c.deadline as string,
        detailUrl: `${SITE_URL}/competitions/${c.slug}`,
      },
      dtstamp
    )
  );

  const calName = category ? `AwardWatch — ${category}` : "AwardWatch — Design Deadlines";
  const body = buildCalendar(events, calName);

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
