export type DeckDue = { name: string; count: number };

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * The reminder email.
 *
 * Deliberately plain: no images, no tracking pixel, no marketing voice. It has
 * one job — tell you the number and give you a link — and a study reminder
 * that reads like a newsletter gets unsubscribed from. Deck names come from
 * user input, so they are escaped.
 */
export function reminderEmail({
  name,
  total,
  decks,
  streak,
  siteUrl,
}: {
  name: string;
  total: number;
  decks: DeckDue[];
  streak: number;
  siteUrl: string;
}) {
  const subject =
    total === 1 ? "1 card due today" : `${total} cards due today`;

  const lines = decks.map((d) => `${d.name}: ${d.count}`);

  const text = [
    `Hi ${name},`,
    "",
    `${subject}.`,
    "",
    ...lines,
    "",
    streak > 1 ? `You are on a ${streak}-day streak.` : "",
    "",
    `Review: ${siteUrl}/dashboard`,
    "",
    `Turn these off: ${siteUrl}/settings`,
  ]
    .filter((line, index, all) => !(line === "" && all[index - 1] === ""))
    .join("\n");

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f8fafc;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;color:#0f172a">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;padding:24px">
      <p style="margin:0 0 16px">Hi ${escapeHtml(name)},</p>

      <p style="margin:0 0 16px;font-size:20px;font-weight:600">${escapeHtml(subject)}</p>

      <table style="width:100%;border-collapse:collapse;margin:0 0 20px">
        ${decks
          .map(
            (deck) => `<tr>
          <td style="padding:6px 0;border-bottom:1px solid #e2e8f0">${escapeHtml(deck.name)}</td>
          <td style="padding:6px 0;border-bottom:1px solid #e2e8f0;text-align:right;color:#64748b">${deck.count}</td>
        </tr>`,
          )
          .join("")}
      </table>

      ${
        streak > 1
          ? `<p style="margin:0 0 20px;color:#64748b;font-size:14px">You are on a ${streak}-day streak.</p>`
          : ""
      }

      <a href="${siteUrl}/dashboard"
         style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;font-weight:500">
        Start reviewing
      </a>

      <p style="margin:24px 0 0;color:#94a3b8;font-size:12px">
        <a href="${siteUrl}/settings" style="color:#94a3b8">Turn these emails off</a>
      </p>
    </div>
  </body>
</html>`;

  return { subject, text, html };
}
