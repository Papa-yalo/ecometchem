// Serves the metal-price cache written by update-metals.js. The frontend
// ticker calls this instead of Metals.Dev directly.

export default async () => {
  const { getStore } = await import("@netlify/blobs");
  const store = getStore("market-data");

  const data = await store.get("metals", { type: "json" });

  return new Response(JSON.stringify(data || { prices: {}, updatedAt: null }), {
    headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=300" },
  });
};
