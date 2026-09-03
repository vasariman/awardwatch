// Shared Brevo helpers for the cron routes under src/app/api/cron/newsletter*.
//
// The signup route (src/app/api/newsletter/route.ts) intentionally keeps its
// own fetch calls inline -- it predates this file and touches a different
// part of the API (contacts, single transactional welcome mail via
// templateId). This file only covers what the monthly digest cron needs:
// creating a campaign draft, checking for open drafts, and sending a plain
// (non-templated) notification mail.

const CAMPAIGNS_ENDPOINT = "https://api.brevo.com/v3/emailCampaigns";
const EMAIL_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

function apiKey(): string {
  const key = process.env.BREVO_API_KEY;
  if (!key) throw new Error("BREVO_API_KEY is not set");
  return key;
}

function headers() {
  return {
    "api-key": apiKey(),
    "content-type": "application/json",
    accept: "application/json",
  };
}

async function asError(response: Response): Promise<string> {
  return `${response.status} ${await response.text().catch(() => "")}`;
}

export type CreateCampaignDraftInput = {
  name: string;
  subject: string;
  htmlContent: string;
  senderEmail: string;
  senderName: string;
  listId: number;
};

/**
 * Creates a campaign in Brevo. No `scheduledAt` is ever sent, which is what
 * keeps it a draft -- Brevo has no separate "send now" field on this
 * endpoint, omitting the schedule is the whole mechanism. Open and click
 * tracking are on by default for every campaign and Brevo does not expose a
 * request field to set them explicitly (checked against the current API
 * reference for POST /v3/emailCampaigns while building this), so there is
 * nothing to toggle here.
 */
export async function createCampaignDraft(
  input: CreateCampaignDraftInput,
): Promise<{ id: number }> {
  const response = await fetch(CAMPAIGNS_ENDPOINT, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      name: input.name,
      subject: input.subject,
      htmlContent: input.htmlContent,
      sender: { email: input.senderEmail, name: input.senderName },
      listIds: [input.listId],
    }),
  });

  if (!response.ok) {
    throw new Error(`Brevo campaign creation failed: ${await asError(response)}`);
  }

  return response.json();
}

/** True if at least one campaign is currently sitting in "draft" status. */
export async function hasDraftCampaign(): Promise<boolean> {
  const url = new URL(CAMPAIGNS_ENDPOINT);
  url.searchParams.set("status", "draft");
  url.searchParams.set("limit", "1");

  const response = await fetch(url, { headers: headers() });

  if (!response.ok) {
    throw new Error(`Brevo campaign lookup failed: ${await asError(response)}`);
  }

  const data = (await response.json()) as { count?: number };
  return (data.count ?? 0) > 0;
}

/** Fire-and-forget style is not used here on purpose: callers need to know
 *  whether the notification actually went out, since it's the only signal
 *  Dennis gets that the monthly draft was created. */
export async function sendNotificationEmail(input: {
  to: string;
  senderEmail: string;
  senderName: string;
  subject: string;
  htmlContent: string;
}): Promise<void> {
  const response = await fetch(EMAIL_ENDPOINT, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      to: [{ email: input.to }],
      sender: { email: input.senderEmail, name: input.senderName },
      subject: input.subject,
      htmlContent: input.htmlContent,
    }),
  });

  if (!response.ok) {
    throw new Error(`Brevo notification mail failed: ${await asError(response)}`);
  }
}
