# Cloud Gaming Finder Catalog

Provider catalogs for the Cloud Gaming Finder browser extension.

This repository contains data only. Provider-specific source code and update jobs live under `providers/`, while published catalog files are grouped under `catalog/`.

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
    normalize.mjs
    update.mjs
.github/workflows/update.yml
```

The extension should consume `catalog/manifest.json` first, then the provider file named by its `providers` entries. A provider can be added without changing the shared schema or the extension's store adapters.

## Data policy

- Catalog entries are availability assertions, not ownership or subscription claims.
- Provider-specific fields stay inside each provider record.
- The extension only needs the provider ID, canonical title, aliases, platform, stores, and status for the initial badge.
- Update jobs must validate generated JSON before publishing it.

## GeForce NOW

The initial provider is `geforce-now`. Its updater uses Playwright to load NVIDIA's live games page and capture the catalog responses used by that page. The source is not an official API contract, so the updater records source and update metadata and fails closed if the response shape changes or the catalog is unexpectedly small.
