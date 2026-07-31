// Returns all stored inquiries for the /admin/inbox.html mini-CRM.
// Uses the classic Netlify Functions handler style because that's the
// well-documented way to access the logged-in Identity user
// (context.clientContext.user) — only logged-in staff can call this.

exports.handler = async (event, context) => {
  const user = context.clientContext && context.clientContext.user;
  if (!user) {
    return { statusCode: 401, body: "Please log in." };
  }

  const { getStore } = await import("@netlify/blobs");
  const store = getStore("crm-inbox");

  const { blobs } = await store.list();
  const records = await Promise.all(
    blobs.map((b) => store.get(b.key, { type: "json" }))
  );

  records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(records),
  };
};
