import { NextResponse } from "next/server";

// Brevo newsletter signup (single opt-in).
//
// The contact is created immediately on submit. The consent checkbox in the
// form is the record that consent was given; there is no confirmation click.
// A welcome email is sent afterwards as a transactional message -- purely
// informational, it carries no action for the recipient.
//
// Because there is no confirmation click, the proof of consent required by
// Art. 7(1) GDPR has to be captured here. Every new contact gets three
// attributes written alongside the address; these must exist in Brevo under
// Contacts -> Settings -> Contact attributes (all of type "Text") or the API
// rejects the request:
//   OPT_IN_AT      ISO timestamp of the submit
//   OPT_IN_IP      IP the submit came from
//   OPT_IN_SOURCE  which form and which wording was agreed to
//
// Required env vars (.env.local locally, Vercel project settings in prod):
//   BREVO_API_KEY              v3 API key from Brevo -> SMTP & API
//   BREVO_LIST_ID              numeric id of the target list
// Optional:
//   BREVO_WELCOME_TEMPLATE_ID  numeric id of a transactional template. If unset,
//                              signup still works and no welcome mail is sent.

const CONTACTS_ENDPOINT = "https://api.brevo.com/v3/contacts";
const EMAIL_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

// Intentionally permissive: exotic but valid addresses shouldn't be rejected.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Bump this whenever the consent wording in NewsletterSignup.tsx changes, so
// an old record still says which sentence that person actually agreed to.
const CONSENT_VERSION = "2026-09-03";

/**
 * Best-effort client IP. Vercel sets x-forwarded-for; the left-most entry is
 * the original client. "unknown" is stored rather than nothing, so the absence
 * is itself visible in the record.
 */
function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

type Payload = {
  email?: unknown;
  consent?: unknown;
  // Honeypot. Real users never fill this in; bots usually do.
  company?: unknown;
};

/**
 * Fire-and-forget welcome mail. A failure here must never surface to the user:
 * they are subscribed either way, and a missing welcome mail is cosmetic.
 */
async function sendWelcomeEmail(apiKey: string, email: string) {
  const templateId = Number(process.env.BREVO_WELCOME_TEMPLATE_ID);
  if (!Number.isFinite(templateId)) return;

  try {
    const response = await fetch(EMAIL_ENDPOINT, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({ to: [{ email }], templateId }),
    });

    if (!response.ok) {
      console.error(
        "[newsletter] welcome mail failed",
        response.status,
        await response.text().catch(() => ""),
      );
    }
  } catch (error) {
    console.error("[newsletter] welcome mail request failed", error);
  }
}

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

  if (!apiKey || !Number.isFinite(listId)) {
    // Names and shapes only -- never the values themselves.
    console.error("[newsletter] Brevo env vars missing or malformed", {
      BREVO_API_KEY: apiKey
        ? `present (${apiKey.length} chars, starts "${apiKey.slice(0, 8)}")`
        : "MISSING",
      BREVO_LIST_ID: process.env.BREVO_LIST_ID
        ? `raw ${JSON.stringify(process.env.BREVO_LIST_ID)} -> ${listId}`
        : "MISSING",
    });
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  let response: Response;

  try {
    response = await fetch(CONTACTS_ENDPOINT, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        email,
        listIds: [listId],
        // Deliberately false. With updateEnabled a repeat submit would
        // overwrite OPT_IN_AT on an existing contact -- i.e. anyone could
        // reset someone else's proof of consent by retyping their address.
        // The duplicate case is handled below instead.
        updateEnabled: false,
        attributes: {
          OPT_IN_AT: new Date().toISOString(),
          OPT_IN_IP: clientIp(request),
          OPT_IN_SOURCE: `signup-form@${CONSENT_VERSION}`,
        },
      }),
    });
  } catch (error) {
    console.error("[newsletter] Brevo request failed", error);
    return NextResponse.json({ error: "server_error" }, { status: 502 });
  }

  if (response.ok) {
    await sendWelcomeEmail(apiKey, email);
    return NextResponse.json({ ok: true });
  }

  // Already on the list. We answer exactly as on success so the endpoint can't
  // be used to probe who is subscribed -- and we send no second welcome mail.
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
