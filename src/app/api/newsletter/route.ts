import { NextResponse } from "next/server";

// Brevo double opt-in signup.
//
// We deliberately use /contacts/doubleOptinConfirmation rather than the plain
// /contacts endpoint: the contact is created only *after* the recipient clicks
// the confirmation link, which is what German practice expects as proof of
// consent. Brevo records the confirmation with timestamp on its side.
//
// Required env vars (.env.local locally, Vercel project settings in prod):
//   BREVO_API_KEY          v3 API key from Brevo -> SMTP & API
//   BREVO_LIST_ID          numeric id of the target list
//   BREVO_DOI_TEMPLATE_ID  numeric id of the DOI template
//
// NOTE on the DOI template: the confirmation button must link to
// {{ doubleoptin }} -- NOT {{ params.DOUBLE_OPT_IN }}, which the API reference
// still shows but which silently renders an empty href.

const BREVO_ENDPOINT = "https://api.brevo.com/v3/contacts/doubleOptinConfirmation";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://awardwatch.net";

// Intentionally permissive: the real validation is the confirmation email.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Payload = {
  email?: unknown;
  consent?: unknown;
  // Honeypot. Real users never fill this in; bots usually do.
  company?: unknown;
};

export async function POST(request: Request) {
  let body: Payload;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  // Honeypot tripped -- pretend everything is fine, do nothing.
  if (typeof body.company === "string" && body.company.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  if (body.consent !== true) {
    return NextResponse.json({ error: "consent_required" }, { status: 400 });
  }

  const apiKey = process.env.BREVO_API_KEY;
  const listId = Number(process.env.BREVO_LIST_ID);
  const templateId = Number(process.env.BREVO_DOI_TEMPLATE_ID);

  if (!apiKey || !Number.isFinite(listId) || !Number.isFinite(templateId)) {
    console.error("[newsletter] Brevo env vars missing or malformed");
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  let response: Response;

  try {
    response = await fetch(BREVO_ENDPOINT, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        email,
        includeListIds: [listId],
        templateId,
        redirectionUrl: `${SITE_URL}/newsletter/confirmed`,
      }),
    });
  } catch (error) {
    console.error("[newsletter] Brevo request failed", error);
    return NextResponse.json({ error: "server_error" }, { status: 502 });
  }

  if (response.ok) {
    return NextResponse.json({ ok: true });
  }

  // Already a confirmed subscriber. We answer exactly as on success so the
  // endpoint can't be used to probe whether an address is on the list.
  if (response.status === 400) {
    const detail = await response.text().catch(() => "");
    if (
      detail.includes("duplicate_parameter") ||
      detail.includes("Contact already exist")
    ) {
      return NextResponse.json({ ok: true });
    }
    console.error("[newsletter] Brevo rejected request", response.status, detail);
    return NextResponse.json({ error: "server_error" }, { status: 502 });
  }

  console.error(
    "[newsletter] Brevo error",
    response.status,
    await response.text().catch(() => ""),
  );

  return NextResponse.json({ error: "server_error" }, { status: 502 });
}
