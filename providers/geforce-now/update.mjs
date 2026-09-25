import { readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";

const CATALOG_FILE = "catalog/providers/geforce-now.json";
const MANIFEST_FILE = "catalog/manifest.json";

// A healthy weekly update adds or removes a handful of games. A large drop
// almost always means NVIDIA changed its page and discovery only saw part of
// the catalog, so refuse to publish unless a human explicitly allows it.
const MIN_RETAINED_RATIO = 0.8;

// NVIDIA uses these as placeholders rather than real store names.
const PLACEHOLDER_STORES = new Set(["UNKNOWN", "NONE"]);

// Keep discovery separate from writing. If Playwright or the provider page
// changes shape, this process fails and the last published catalog remains
// untouched.
function runDiscovery() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["providers/geforce-now/discover.mjs"], { stdio: ["ignore", "pipe", "inherit"] });
    let output = "";
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) return reject(new Error(`Live discovery exited with code ${code}`));
      try { resolve(JSON.parse(output)); } catch (error) { reject(error); }
    });
  });
}

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function compareGames(a, b) {
  return a.title.localeCompare(b.title, "en") || a.stores.join(",").localeCompare(b.stores.join(","), "en");
}

// Returns YYYY.MM.DD.N, incrementing N when the catalog changes more than
// once on the same UTC day.
function nextCatalogVersion(previous, updatedAt) {
  const day = updatedAt.slice(0, 10).replaceAll("-", ".");
  const match = String(previous || "").match(/^(\d{4}\.\d{2}\.\d{2})\.(\d+)$/);
  return match && match[1] === day ? `${day}.${Number(match[2]) + 1}` : `${day}.1`;
}

const discovered = await runDiscovery();
// Sort so that unchanged data produces an identical file and daily runs
// without a real catalog change do not create a commit.
const games = discovered.games
  .map((game) => ({ ...game, stores: game.stores.filter((store) => !PLACEHOLDER_STORES.has(store)) }))
  .sort(compareGames);

const previous = await readJson(CATALOG_FILE);
const previousCount = Array.isArray(previous?.games) ? previous.games.length : 0;
if (previousCount && games.length < previousCount * MIN_RETAINED_RATIO) {
  if (process.env.ALLOW_CATALOG_SHRINK === "true") {
    console.warn(`Catalog shrank from ${previousCount} to ${games.length}; publishing because ALLOW_CATALOG_SHRINK is set`);
  } else {
    throw new Error(`Catalog shrank from ${previousCount} to ${games.length} games (more than ${Math.round((1 - MIN_RETAINED_RATIO) * 100)}%); refusing to publish`);
  }
}

if (previous && JSON.stringify(previous.games) === JSON.stringify(games)) {
  console.log(`No catalog changes (${games.length} games)`);
  process.exit(0);
}

const output = {
  schemaVersion: "1",
  provider: "geforce-now",
  updatedAt: discovered.updatedAt,
  source: discovered.source,
  games
};
await writeFile(CATALOG_FILE, `${JSON.stringify(output, null, 2)}\n`);

const manifest = await readJson(MANIFEST_FILE);
manifest.updatedAt = discovered.updatedAt;
manifest.catalogVersion = nextCatalogVersion(manifest.catalogVersion, discovered.updatedAt);
await writeFile(MANIFEST_FILE, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Wrote ${games.length} games (was ${previousCount}); catalog version ${manifest.catalogVersion}`);
