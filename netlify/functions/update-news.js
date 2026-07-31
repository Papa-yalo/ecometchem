// Runs every 4 hours. Pulls headlines from a small set of industry sources
// and caches the merged, sorted result in Netlify Blobs. Public visitors
// read the cache via get-news.js — the sources are only ever fetched once
// per 4-hour window, not on every page view.
//
// Sources can be edited below without touching anything else. Each entry
// needs a working RSS feed URL and a display name.

const FEEDS = [
  { url: "https://www.mining.com/feed", name: "Mining.com" },
  { url: "https://www.kitco.com/news/category/mining/rss", name: "Kitco News" },
  {
    url: "https://news.google.com/rss/search?q=metal+recycling+OR+non-ferrous+Europe&hl=en-GB&gl=GB&ceid=GB:en",
    name: "Google News",
  },
];

function parseRSS(xml, sourceName) {
  const items = [];
  const blocks = xml.match(/<item[\s\S]*?<\/item>/g) || [];

  for (const block of blocks) {
    const pick = (tag) => {
      const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
      if (!m) return "";
      return m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, "$1").trim();
    };

    const title = pick("title");
    const link = pick("link");
    const pubDate = pick("pubDate");
    if (title && link) {
      items.push({ title, link, pubDate, source: sourceName });
    }
  }
  return items;
}

export default async () => {
  const { getStore } = await import("@netlify/blobs");
  const store = getStore("market-data");

  try {
    const results = await Promise.all(
      FEEDS.map(async (feed) => {
        try {
          const res = await fetch(feed.url, {
            headers: { "User-Agent": "Mozilla/5.0 (compatible; EkoMetChemBot/1.0)" },
          });
          if (!res.ok) return [];
          const xml = await res.text();
          return parseRSS(xml, feed.name);
        } catch {
          return [];
        }
      })
    );

    let items = results.flat();
    items.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    items = items.slice(0, 12);

    if (items.length > 0) {
      await store.setJSON("news", {
        items,
        updatedAt: new Date().toISOString(),
      });
    }

    return new Response(`News cache updated with ${items.length} items.`);
  } catch (err) {
    return new Response("News update failed, cache untouched: " + err.message);
  }
};

export const config = { schedule: "0 */4 * * *" };
