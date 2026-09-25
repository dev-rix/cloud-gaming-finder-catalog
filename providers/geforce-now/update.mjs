import { readFile, writeFile } from "node:fs/promises";
import { collectGames, dedupeGames } from "./normalize.mjs";

const source = "https://static.nvidiagrid.net/supported-public-game-list/locales/gfnpc-en-US.json";
const response = await fetch(source, { headers: { "user-agent": "cloud-gaming-finder-catalog/1.0" } });
if (!response.ok) throw new Error(`Catalog request failed: ${response.status}`);

const raw = await response.json();
const overrides = JSON.parse(await readFile(new URL("./overrides.json", import.meta.url), "utf8"));
const games = dedupeGames([...collectGames(raw), ...(overrides.games || [])]);
if (games.length < 1000) throw new Error(`Refusing to publish suspiciously small catalog: ${games.length}`);

const output = {
  schemaVersion: "1",
  provider: "geforce-now",
  updatedAt: new Date().toISOString(),
  source,
  games
};
await writeFile("catalog/providers/geforce-now.json", `${JSON.stringify(output, null, 2)}\n`);
console.log(`Wrote ${games.length} games`);
