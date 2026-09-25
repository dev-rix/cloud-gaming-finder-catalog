import { readFile } from "node:fs/promises";

const manifest = JSON.parse(await readFile("catalog/manifest.json", "utf8"));
if (manifest.schemaVersion !== "1") throw new Error("Unsupported manifest schema");
if (!Array.isArray(manifest.providers) || !manifest.providers.length) throw new Error("No providers configured");

for (const provider of manifest.providers) {
  if (!/^[a-z0-9-]+$/.test(provider.id)) throw new Error(`Invalid provider ID: ${provider.id}`);
  const catalog = JSON.parse(await readFile(`catalog/${provider.file}`, "utf8"));
  if (catalog.schemaVersion !== "1" || catalog.provider !== provider.id) {
    throw new Error(`Manifest/catalog mismatch for ${provider.id}`);
  }
  if (!Array.isArray(catalog.games) || !catalog.games.length) throw new Error(`Empty catalog: ${provider.id}`);
  for (const game of catalog.games) {
    if (!game.title || !Array.isArray(game.aliases) || !Array.isArray(game.platforms) ||
        !Array.isArray(game.stores) || !["available", "unavailable", "unknown"].includes(game.status)) {
      throw new Error(`Invalid game record in ${provider.id}: ${game.title || "untitled"}`);
    }
  }
  console.log(`${provider.id}: ${catalog.games.length} games`);
}
