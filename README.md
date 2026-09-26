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
    update.mjs
scripts/
  validate.mjs
.github/
  dependabot.yml
  workflows/
    ci.yml
    update.yml
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

`update:gfn` launches Playwright against NVIDIA's live games page, captures the catalog responses used by that page, and writes the normalized provider file. `validate` checks every provider file against `catalog/schema.json`, checks the manifest/provider relationship, and requires each provider file to be `providers/<provider-id>.json`. It never contacts a provider. CI runs it on every push and pull request.

## Adding a provider

Create `providers/<provider-id>/` with:

1. A provider-specific discovery script.
2. An updater that writes `catalog/providers/<provider-id>.json`.
3. A provider README documenting source assumptions and validation thresholds.

Then add the generated file to `catalog/manifest.json`. Keep provider-specific scraping and API knowledge out of the shared schema and out of the browser extension.

## GeForce NOW

The initial provider is `geforce-now`. Its updater uses Playwright to load NVIDIA's live games page and capture the catalog responses used by that page. The source is not an official API contract, so the updater records source and update metadata and fails closed if the response shape changes or the catalog is unexpectedly small.

The GitHub Actions workflow runs daily at 5:00 AM America/New_York and can also be started manually. It runs in two jobs:

1. `discover-geforce-now` has read-only repository access. It installs Chromium, runs the updater, validates the result, and uploads the catalog files as a build artifact.
2. `publish` has write access but never runs the browser. It downloads the artifact, validates it again, and commits only if the catalog changed.

The updater sorts games so that a day with no real change produces an identical file and no commit. When the catalog does change, it also updates `updatedAt` and `catalogVersion` in `catalog/manifest.json`.

A suspiciously small or incomplete result fails before publication. That includes a catalog that lost more than 20% of its games since the last published version. If a drop that large is real, start the workflow manually with **allow_shrink** checked.

Actions are pinned to commit SHAs; Dependabot proposes updates weekly.
