# Cloud Gaming Finder Catalog

Provider catalogs for the Cloud Gaming Finder browser extension.

This repository contains data only. Provider-specific source code and update jobs live under `providers/`, while published catalog files are grouped under `catalog/`.

The extension consumes only the published files under `catalog/`. It does not run the provider discovery code and does not contact NVIDIA directly.

## Layout

```text
catalog/
  schema.json
  manifest.json
  providers/
    geforce-now.json
providers/
  geforce-now/
    README.md
    discover.mjs
    normalize.mjs
    update.mjs
scripts/
  validate.mjs
.github/workflows/update.yml
```

The extension consumes `catalog/manifest.json` first, then each available provider file named by its `providers` entries. A provider can be added without changing the shared schema or the extension's store adapters.

## Data policy

- Catalog entries are availability assertions, not ownership or subscription claims.
- Provider-specific fields stay inside each provider record.
- The extension uses the provider ID, canonical title, aliases, optional store IDs, platforms, stores, and status for matching.
- Provider-specific discovery metadata belongs in `metadata`; examples include play type, subscription tier, region, and observation time.
- Update jobs must validate generated JSON before publishing it.

## Commands

```bash
npm ci
npm run update:gfn
npm run validate
```

`update:gfn` launches Playwright against NVIDIA's live games page, captures the catalog responses used by that page, and writes the normalized provider file. `validate` checks the manifest/provider relationship and required fields without contacting a provider.

## Adding a provider

Create `providers/<provider-id>/` with:

1. A provider-specific discovery script.
2. A normalizer that emits the shared game shape.
3. An updater that writes `catalog/providers/<provider-id>.json`.
4. A provider README documenting source assumptions and validation thresholds.

Then add the generated file to `catalog/manifest.json`. Keep provider-specific scraping and API knowledge out of the shared schema and out of the browser extension.

## GeForce NOW

The initial provider is `geforce-now`. Its updater uses Playwright to load NVIDIA's live games page and capture the catalog responses used by that page. The source is not an official API contract, so the updater records source and update metadata and fails closed if the response shape changes or the catalog is unexpectedly small.

The GitHub Actions workflow runs daily at 5:00 AM America/New_York and can also be started manually. It installs Chromium, runs the updater, validates the result, and commits only generated catalog changes. A suspiciously small or incomplete result fails before publication.
