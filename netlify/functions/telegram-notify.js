// Receives Netlify Forms' outgoing webhook when a new contact-form
// submission arrives, and forwards it to a Telegram chat as PLAIN TEXT
// (no Markdown, so visitor text can never break the message).
//
// One-time setup (already done on the live site):
//   Environment variables: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
//   Netlify: Forms → contact → Form notifications → Outgoing webhook →
//   https://ekometchem.com/.netlify/functions/telegram-notify  (event: New form submission)
//
// OPTIONAL extra protection against strangers calling this URL:
//   1. Add environment variable TELEGRAM_WEBHOOK_SECRET with any long random string.
//   2. Change the webhook URL to
//      https://ekometchem.com/.netlify/functions/telegram-notify?key=<that same string>
//   If the variable is not set, behaviour is the same as before.

const clip = (value, max) => String(value ?? "").slice(0, max);

export default async (req) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return new Response("Telegram env vars not set — skipping.", { status: 200 });
  }

  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) {
    const key = new URL(req.url).searchParams.get("key");
    if (key !== secret) return new Response("Forbidden", { status: 403 });
  }

  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  let fields;
  try {
    const body = await req.json();
    const formName = body?.payload?.form_name || body?.form_name;
    if (formName && formName !== "contact") return new Response("Ignored.", { status: 200 });
    fields = body?.payload?.data || body?.data;
    if (!fields || typeof fields !== "object") return new Response("No form data.", { status: 400 });
  } catch {
    return new Response("Bad request.", { status: 400 });
  }

  const text = [
    "📩 New website inquiry",
    fields.name ? `Name: ${clip(fields.name, 200)}` : null,
    fields.email ? `Email: ${clip(fields.email, 200)}` : null,
    fields.company ? `Company: ${clip(fields.company, 200)}` : null,
    fields.message ? `Message: ${clip(fields.message, 3000)}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    });
    const result = await res.json().catch(() => null);
    if (!res.ok || !result?.ok) {
      // Log only the status/reason, never the visitor's text or the token.
      console.error("telegram-notify: Telegram refused the message", res.status, result?.description || "");
      return new Response("Telegram error", { status: 502 });
    }
    return new Response("Sent.", { status: 200 });
  } catch (err) {
    console.error("telegram-notify: request failed", err?.name || "error");
    return new Response("Telegram unreachable", { status: 502 });
  }
};
