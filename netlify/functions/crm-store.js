// Receives Netlify Forms' outgoing webhook and stores each submission in
// Netlify Blobs with a status field, so staff can track it in the
// lightweight CRM inbox at /admin/inbox.html.
// Set this up as a second "Outgoing webhook" notification on the "contact"
// form, alongside (or instead of) telegram-notify.js — same webhook event,
// pointing here: https://ekometchem.com/.netlify/functions/crm-store

export default async (req) => {
  const { getStore } = await import("@netlify/blobs");
  const store = getStore("crm-inbox");

  try {
    const body = await req.json();
    const fields = body?.payload?.data || body?.data || {};
    const submissionId = body?.payload?.id || body?.id || `${Date.now()}`;

    const record = {
      id: submissionId,
      name: fields.name || "",
      email: fields.email || "",
      company: fields.company || "",
      message: fields.message || "",
      status: "new", // new -> in_progress -> done -> rejected
      createdAt: new Date().toISOString(),
    };

    await store.setJSON(submissionId, record);

    return new Response("Stored.", { status: 200 });
  } catch (err) {
    return new Response("Failed: " + err.message, { status: 200 });
  }
};
