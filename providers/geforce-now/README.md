# GeForce NOW provider

This provider publishes the normalized GeForce NOW catalog discovered from NVIDIA's live games page.

## Pipeline

1. `discover.mjs` launches Chromium with Playwright and captures the catalog responses made by the NVIDIA page, including pagination triggered by scrolling.
2. The discovery script rejects suspiciously small results and requires current known-good coverage before emitting JSON.
3. `update.mjs` turns the discovery result into `catalog/providers/geforce-now.json`.
4. The shared validator checks the generated provider file before GitHub Actions commits it.

The generated file is data, not source code. Keep NVIDIA-specific URL, response-shape, and pagination assumptions in this directory; do not put them into the shared catalog schema or browser extension.
