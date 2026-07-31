// Serves the news cache written by update-news.js.

export default async () => {
  const { getStore } = await import("@netlify/blobs");
  const store = getStore("market-data");

  const data = await store.get("news", { type: "json" });

  return new Response(JSON.stringify(data || { items: [], updatedAt: null }), {
    headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=300" },
  });
};
