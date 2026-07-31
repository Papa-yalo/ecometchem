// Runs every 4 hours. Pulls headlines from the sources configured in
// content/settings/feeds.json (editable through /admin without touching
// code) and caches the merged, sorted result in Netlify Blobs. Public
// visitors read the cache via get-news.js.

const SETTINGS_URL =
  "https://raw.githubusercontent.com/Papa-yalo/ecometchem/main/content/settings/feeds.json";

const FALLBACK_FEEDS = [
  { url: "https://www.mining.com/feed", name: "Mining.com" },
  { url: "https://www.kitco.com/news/category/mining/rss", name: "Kitco News" },
  {
    url: "https://news.google.com/rss/search?q=metal+recycling+OR+non-ferrous+Europe&hl=en-GB&gl=GB&ceid=GB:en",
    name: "Google News",
  },
];

async function loadFeedList() {
  try {
    const res = await fetch(SETTINGS_URL);
    if (!res.ok) return FALLBACK_FEEDS;
    const data = await res.json();
    if (!Array.isArray(data.sources) || data.sources.length === 0) return FALLBACK_FEEDS;
    return data.sources;
  } catch {
    return FALLBACK_FEEDS;
  }
}

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
    const feedList = await loadFeedList();
    const results = await Promise.all(
      feedList.map(async (feed) => {
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
