// Receives Netlify Forms' outgoing webhook when a new contact-form
// submission arrives, and forwards it to a Telegram chat.
//
// One-time setup:
//   1. Message @BotFather on Telegram, run /newbot, follow the prompts —
//      you'll get a bot token.
//   2. Message your new bot anything once (so it can message you back),
//      then open https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates in a
//      browser — find "chat":{"id": ...} in the response, that's your chat ID.
//   3. In Netlify: Project configuration → Environment variables, add
//      TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.
//   4. In Netlify: Forms → contact → Settings and usage → Form notifications
//      → Add notification → Outgoing webhook → URL:
//      https://ekometchem.com/.netlify/functions/telegram-notify
//      Event: "New form submission", Form: contact.

export default async (req) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return new Response("Telegram env vars not set — skipping.", { status: 200 });
  }

  try {
    const body = await req.json();
    const fields = body?.payload?.data || body?.data || {};

    const text = [
      "📩 *New website inquiry*",
      fields.name ? `*Name:* ${fields.name}` : null,
      fields.email ? `*Email:* ${fields.email}` : null,
      fields.company ? `*Company:* ${fields.company}` : null,
      fields.message ? `*Message:* ${fields.message}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
    });

    return new Response("Sent.", { status: 200 });
  } catch (err) {
    return new Response("Failed: " + err.message, { status: 200 });
  }
};
