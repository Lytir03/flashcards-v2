import "server-only";

export type SendResult = { ok: true; id: string } | { ok: false; error: string };

/**
 * Sends one transactional email through Resend.
 *
 * Kept as a thin function over the HTTP API rather than the SDK: the payload is
 * four fields, and swapping provider (Brevo's free tier is more generous per
 * day, if the 100/day cap ever bites) means rewriting this one function.
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    return { ok: false, error: "RESEND_API_KEY or EMAIL_FROM is not set." };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ from, to, subject, html, text }),
  });

  if (!response.ok) {
    const body = await response.text();
    return { ok: false, error: `Resend returned ${response.status}: ${body.slice(0, 200)}` };
  }

  const data = await response.json();
  return { ok: true, id: data?.id ?? "" };
}
