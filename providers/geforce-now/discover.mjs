import { chromium } from "playwright";

// This runs in CI, not in the extension. We observe the same catalog network
// responses used by NVIDIA's public games page so the extension can consume a
// stable, provider-neutral JSON snapshot.
const PAGE_URL = "https://www.nvidia.com/en-us/geforce-now/games/";

function collectLiveItems(value, output = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectLiveItems(item, output);
    return output;
  }
  if (!value || typeof value !== "object") return output;

  const title = value.title || value.sortName || value.name;
  const variants = Array.isArray(value.variants) ? value.variants : [];
  if (typeof title === "string" && title.length >= 2 && variants.length) {
    output.push({
      id: value.id || value.gameId || undefined,
      title,
      aliases: [],
      platforms: ["pc"],
      stores: variants.map((variant) => variant.appStore || variant.store).filter(Boolean),
      status: "available",
      metadata: {
        gfnGameId: value.id || value.gameId || undefined,
        playType: value.gfn?.playType || undefined,
        minimumMembershipTier: value.gfn?.minimumMembershipTierLabel || undefined
      }
    });
  }
  for (const child of Object.values(value)) collectLiveItems(child, output);
  return output;
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  locale: "en-US",
  viewport: { width: 1440, height: 1000 }
});
const payloads = [];

page.on("response", async (response) => {
  if (!response.url().includes("/services/gfngames/")) return;
  try {
    const data = await response.json();
    payloads.push(data);
  } catch {
    // Ignore non-JSON responses from the same service.
  }
});

try {
  await page.goto(PAGE_URL, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(10000);

  // The catalog is paginated/infinite-scrolling on the NVIDIA page. Scrolling
  // gives the page a chance to request additional result pages; all matching
  // responses are collected above.
  let previousHeight = 0;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const height = await page.evaluate(() => document.body?.scrollHeight || 0);
    await page.evaluate(() => window.scrollTo(0, document.body?.scrollHeight || 0));
    await page.waitForTimeout(1500);
    if (height === previousHeight && attempt > 4) break;
    previousHeight = height;
  }

  const games = collectLiveItems(payloads);
  const uniqueGames = [...new Map(games.map((game) => [
    `${game.title.toLowerCase()}:${game.stores.join(",")}`,
    game
  ])).values()];
  if (uniqueGames.length < 1500) {
    throw new Error(`Live NVIDIA catalog is suspiciously small: ${uniqueGames.length}`);
  }
  if (!uniqueGames.some((game) => game.title.toLowerCase() === "alan wake 2")) {
    throw new Error("Live NVIDIA catalog did not contain Alan Wake 2");
  }

  process.stdout.write(JSON.stringify({
    source: PAGE_URL,
    updatedAt: new Date().toISOString(),
    games: uniqueGames
  }));
} finally {
  await browser.close();
}
