import { readFile } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

// This validator intentionally checks structure and safety invariants only.
// It must be deterministic and must not contact external providers.
const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

const ajv = new Ajv2020({ allErrors: true });
addFormats(ajv);
const validateCatalog = ajv.compile(await readJson("catalog/schema.json"));

const manifest = await readJson("catalog/manifest.json");
if (manifest.schemaVersion !== "1") throw new Error("Unsupported manifest schema");
if (!Array.isArray(manifest.providers) || !manifest.providers.length) throw new Error("No providers configured");
if (Number.isNaN(Date.parse(manifest.updatedAt))) throw new Error("Manifest updatedAt is not a date");

for (const provider of manifest.providers) {
  if (!/^[a-z0-9-]+$/.test(provider.id)) throw new Error(`Invalid provider ID: ${provider.id}`);
  // The extension resolves this path against the manifest URL, so it must stay
  // a plain relative path inside catalog/providers/.
  if (provider.file !== `providers/${provider.id}.json`) {
    throw new Error(`Provider file for ${provider.id} must be providers/${provider.id}.json, got ${provider.file}`);
  }
  const catalog = await readJson(`catalog/${provider.file}`);
  if (!validateCatalog(catalog)) {
    const errors = validateCatalog.errors.slice(0, 10)
      .map((error) => `  ${error.instancePath || "/"} ${error.message}`).join("\n");
    throw new Error(`Schema validation failed for ${provider.id}:\n${errors}`);
  }
  if (catalog.provider !== provider.id) throw new Error(`Manifest/catalog mismatch for ${provider.id}`);
  if (!catalog.games.length) throw new Error(`Empty catalog: ${provider.id}`);
  console.log(`${provider.id}: ${catalog.games.length} games`);
}
