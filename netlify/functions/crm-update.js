// Updates the status of one inquiry. Called from /admin/inbox.html.

exports.handler = async (event, context) => {
  const user = context.clientContext && context.clientContext.user;
  if (!user) {
    return { statusCode: 401, body: "Please log in." };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed." };
  }

  const { getStore } = await import("@netlify/blobs");
  const store = getStore("crm-inbox");

  try {
    const { id, status } = JSON.parse(event.body);
    if (!id || !status) {
      return { statusCode: 400, body: "Missing id or status." };
    }

    const record = await store.get(id, { type: "json" });
    if (!record) {
      return { statusCode: 404, body: "Not found." };
    }

    record.status = status;
    await store.setJSON(id, record);

    return { statusCode: 200, body: "OK" };
  } catch (err) {
    return { statusCode: 500, body: "Failed: " + err.message };
  }
};
