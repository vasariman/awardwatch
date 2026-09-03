import { NextResponse } from "next/server";
import { hasDraftCampaign, sendNotificationEmail } from "@/lib/brevo";

// Runs on the 4th of every month, 07:00 UTC (schedule in vercel.json --
// Vercel crons always run in UTC, this is 08:00/09:00 CET/CEST). Only ever checks --
// never creates or sends anything itself. If the draft from the 1st is
// still sitting there, this is the second (and last) nudge.

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const dryRun = searchParams.get("dryRun") === "1";

  let draftOpen: boolean;
  try {
    draftOpen = await hasDraftCampaign();
  } catch (error) {
    console.error("[newsletter-reminder-cron] campaign lookup failed", error);
    return NextResponse.json({ error: "server_error" }, { status: 502 });
  }

  if (dryRun) {
    return NextResponse.json({ dryRun: true, draftOpen });
  }

  if (!draftOpen) {
    return NextResponse.json({ ok: true, draftOpen: false });
  }

  const senderEmail = process.env.NEWSLETTER_SENDER_EMAIL;
  const senderName = process.env.NEWSLETTER_SENDER_NAME;
  const notifyEmail = process.env.NEWSLETTER_NOTIFY_EMAIL;

  if (!senderEmail || !senderName || !notifyEmail) {
    console.error("[newsletter-reminder-cron] missing env vars");
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  try {
    await sendNotificationEmail({
      to: notifyEmail,
      senderEmail,
      senderName,
      subject: "Reminder: this month's newsletter draft is still unsent",
      htmlContent:
        "<p>The newsletter draft created on the 1st is still sitting in Brevo &gt; Campaigns &gt; Email as a draft. This is the second and last reminder for this month.</p>",
    });
  } catch (error) {
    console.error("[newsletter-reminder-cron] reminder mail failed", error);
    return NextResponse.json({ error: "server_error" }, { status: 502 });
  }

  return NextResponse.json({ ok: true, draftOpen: true });
}
