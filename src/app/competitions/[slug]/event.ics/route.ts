import { getCompetitionBySlug } from "@/lib/competitions";
import { SITE_URL } from "@/lib/site";
import { buildCalendar, buildEvent, formatDateTimeUTC } from "@/lib/ical";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const item = getCompetitionBySlug(slug);

  // No listing, or a pending listing with no confirmed date yet — either
  // way there's no real deadline to hand out an .ics for.
  if (!item || item.deadline === null) {
    return new Response("Not found", { status: 404 });
  }

  const dtstamp = formatDateTimeUTC(new Date());
  const event = buildEvent(
    {
      slug: item.slug,
      title: item.title,
      deadline: item.deadline,
      detailUrl: `${SITE_URL}/competitions/${item.slug}`,
    },
    dtstamp,
    true // withAlarm — the 7-day reminder only makes sense on a direct download
  );
  const body = buildCalendar([event], item.title);

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${item.slug}.ics"`,
    },
  });
}
