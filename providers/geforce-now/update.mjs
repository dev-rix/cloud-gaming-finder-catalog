import { writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";

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

const discovered = await runDiscovery();
const games = discovered.games;

const output = {
  schemaVersion: "1",
  provider: "geforce-now",
  updatedAt: discovered.updatedAt,
  source: discovered.source,
  games
};
await writeFile("catalog/providers/geforce-now.json", `${JSON.stringify(output, null, 2)}\n`);
console.log(`Wrote ${games.length} games`);
