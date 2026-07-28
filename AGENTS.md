# AGENTS.md

## What this is

Single-file static web app (`index.html`) — a Kumiko Color Mapper that maps images onto equilateral-triangle lattice patterns for paper craft. No build system, no package manager, no bundler.

## Architecture

- **`index.html`** — the entire app (HTML + inline CSS + inline JS, ~1600 lines). No external dependencies.
- **`verify_kumiko.py`** — Playwright smoke test. Opens `index.html` as a `file://` URL, waits 5s for the embedded default image to load and process, takes a screenshot. Requires Playwright + Chromium installed. Hardcoded paths (`/app/index.html`, `/home/jules/verification/`) are CI-specific — adjust for local runs.
- **`.github/workflows/deploy.yml`** — copies `index.html` into `dist/` and deploys to Cloudflare Pages on push to main/master. The "build" step is just `mkdir dist && cp index.html dist/`.

## Development

There is no dev server or hot reload. Open `index.html` directly in a browser. All code is inline — edit the file and refresh.

## Verification

```bash
pip install playwright && playwright install chromium
python verify_kumiko.py
```

Note: `verify_kumiko.py` writes to `/home/jules/verification/` — change those paths before running locally.

## Deployment

Automatic on push to `main` or `master` via GitHub Actions → Cloudflare Pages. No manual build step needed.

## Key conventions

- All JS is vanilla (no frameworks, no modules). The global scope contains the full app state.
- The 46 Kumiko patterns are defined as SVG-path data in the `REAL_PATTERNS` array (line ~400).
- An embedded base64 JPEG (`DEFAULT_IMAGE_B64`, line ~382) provides a default sample image on load.
- Color clustering uses a custom deterministic K-means implementation (no external lib).
- Triangle geometry is built by `buildTriangles()` which creates a rotated asanoha-style lattice.
