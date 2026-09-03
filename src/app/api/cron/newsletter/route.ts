import { NextResponse } from "next/server";
import { createCampaignDraft, sendNotificationEmail } from "@/lib/brevo";
import { buildDigestHtml, buildDigestSelection } from "@/lib/newsletter-digest";

// Runs on the 1st of every month, 07:00 UTC (schedule in vercel.json --
// Vercel crons always run in UTC, this is 08:00/09:00 CET/CEST). Builds the
// monthly digest and creates it as a DRAFT campaign in Brevo -- never scheduled,
// never sent automatically. Dennis reviews it (send a test from Brevo's own
// UI, or just read the notification mail below) and sends it by hand
// whenever he decides is the right day.
//
// Vercel invokes cron routes with GET, not POST -- see
// https://vercel.com/docs/cron-jobs/manage-cron-jobs

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = new Date();
  const utmCampaign = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

  const selection = buildDigestSelection(now);
  const html = buildDigestHtml(selection, utmCampaign);
  const entryCount = selection.lastChance.length + selection.saveTheDate.length;
  const titles = [...selection.lastChance, ...selection.saveTheDate].map((c) => c.title);

  const { searchParams } = new URL(request.url);
  if (searchParams.get("dryRun") === "1") {
    return NextResponse.json({
      dryRun: true,
      windowDays: selection.windowDays,
      entryCount,
      subject: selection.subject,
      titles,
      html,
    });
  }

  const listId = Number(process.env.BREVO_LIST_ID);
  const senderEmail = process.env.NEWSLETTER_SENDER_EMAIL;
  const senderName = process.env.NEWSLETTER_SENDER_NAME;
  const notifyEmail = process.env.NEWSLETTER_NOTIFY_EMAIL;

  if (!Number.isFinite(listId) || !senderEmail || !senderName || !notifyEmail) {
    console.error("[newsletter-cron] missing env vars", {
      BREVO_LIST_ID: process.env.BREVO_LIST_ID ? "present" : "MISSING",
      NEWSLETTER_SENDER_EMAIL: senderEmail ? "present" : "MISSING",
      NEWSLETTER_SENDER_NAME: senderName ? "present" : "MISSING",
      NEWSLETTER_NOTIFY_EMAIL: notifyEmail ? "present" : "MISSING",
    });
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  let campaign: { id: number };
  try {
    campaign = await createCampaignDraft({
      name: `AwardWatch Newsletter ${utmCampaign}`,
      subject: selection.subject,
      htmlContent: html,
      senderEmail,
      senderName,
      listId,
    });
  } catch (error) {
    console.error("[newsletter-cron] campaign creation failed", error);
    return NextResponse.json({ error: "server_error" }, { status: 502 });
  }

  try {
    await sendNotificationEmail({
      to: notifyEmail,
      senderEmail,
      senderName,
      subject: `Newsletter draft ready: ${selection.subject}`,
      htmlContent: `
        <p>The ${utmCampaign} newsletter draft was created in Brevo (campaign id ${campaign.id}, name "AwardWatch Newsletter ${utmCampaign}"). It has not been sent -- open Brevo &gt; Campaigns &gt; Email to review, send a test, and send it when you're ready.</p>
        <p><strong>Window:</strong> ${selection.windowDays} days &middot; <strong>Entries:</strong> ${entryCount}</p>
        <p><strong>Subject:</strong> ${selection.subject}</p>
        <p><strong>Included:</strong></p>
        <ul>${titles.map((t) => `<li>${t}</li>`).join("")}</ul>
      `,
    });
  } catch (error) {
    // The draft already exists in Brevo at this point -- a failed
    // notification is annoying but not worth failing the whole run for.
    console.error("[newsletter-cron] notification mail failed", error);
  }

  return NextResponse.json({ ok: true, campaignId: campaign.id, entryCount });
}
