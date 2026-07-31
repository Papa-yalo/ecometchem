// Runs every 4 hours (see config.schedule below). Fetches base-metal prices
// from Metals.Dev (free tier, no card required — https://metals.dev) and
// caches the result in Netlify Blobs. The public-facing ticker reads the
// cached value via get-metals.js instead of calling Metals.Dev directly,
// so a) the API key never reaches the browser and b) visitor traffic never
// drives up API usage.
//
// One-time setup: create a free account at https://metals.dev, copy your
// API key, and add it as an environment variable named METALS_DEV_API_KEY
// in Netlify (Project configuration → Environment variables).

const TOZ_PER_TONNE = 32150.7; // troy ounces per metric tonne — Metals.Dev returns $/troy oz

export default async () => {
  const apiKey = process.env.METALS_DEV_API_KEY;
  const { getStore } = await import("@netlify/blobs");
  const store = getStore("market-data");

  if (!apiKey) {
    return new Response("METALS_DEV_API_KEY is not set — skipping update.");
  }

  try {
    const res = await fetch(`https://api.metals.dev/v1/latest?api_key=${apiKey}&currency=USD`);
    const data = await res.json();

    if (data.status !== "success" || !data.metals) {
      throw new Error("Unexpected response from Metals.Dev");
    }

    const raw = data.metals;
    const map = {
      aluminium: raw.lme_aluminum,
      copper: raw.lme_copper,
      zinc: raw.lme_zinc,
      lead: raw.lme_lead,
      nickel: raw.lme_nickel,
      tin: raw.tin, // no dedicated LME variant on the free plan — closest available
    };

    const prices = {};
    for (const [metal, pricePerToz] of Object.entries(map)) {
      if (typeof pricePerToz === "number") {
        prices[metal] = Math.round(pricePerToz * TOZ_PER_TONNE);
      }
    }

    if (Object.keys(prices).length === 0) {
      throw new Error("No metal prices in response");
    }

    await store.setJSON("metals", {
      prices, // USD per tonne
      updatedAt: new Date().toISOString(),
    });

    return new Response("Metals cache updated.");
  } catch (err) {
    // Leave the previous cache untouched on failure — visitors should always
    // see the last good value with its timestamp, never an empty block.
    return new Response("Metals update failed, cache untouched: " + err.message);
  }
};

// Runs every 8 hours (3x/day = ~90 calls/month, within Metals.Dev's free
// 100 requests/month cap — the free plan doesn't leave room for 4-hour
// updates). Bump to every 4h ("0 */4 * * *") if you upgrade the plan.
export const config = { schedule: "0 */8 * * *" };
