// Returns all stored inquiries for the /admin/inbox.html mini-CRM.
// Uses the classic Netlify Functions handler style because that's the
// well-documented way to access the logged-in Identity user
// (context.clientContext.user) — only logged-in staff can call this.
// Always returns valid JSON (an array on success, an object with
// "error" on failure) so the client never has to guess the shape.

exports.handler = async (event, context) => {
  const user = context.clientContext && context.clientContext.user;
  if (!user) {
    return {
      statusCode: 401,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Please log in." }),
    };
  }

  try {
    const { getStore } = await import("@netlify/blobs");
    const store = getStore("crm-inbox");

    const { blobs } = await store.list();
    const records = await Promise.all(
      (blobs || []).map((b) => store.get(b.key, { type: "json" }))
    );

    const clean = records.filter(Boolean);
    clean.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(clean),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: String(err) }),
    };
  }
};
