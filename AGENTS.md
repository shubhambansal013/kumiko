# AGENTS.md

## What this is

Kumiko Color Mapper — a single-page front-end app that maps images onto equilateral-triangle lattice patterns for paper craft. Built with Vite, no backend.

## Project structure

```
index.html          Vite entry point (root-level, references src/)
src/
  main.js           App logic (~1300 lines, vanilla JS, ES module)
  style.css         All styles
package.json        npm project, Vite dev dependency
vite.config.js      Build config (outputs to dist/)
verify_kumiko.py    Playwright smoke test
.github/workflows/deploy.yml  CI → Cloudflare Pages
```

## Development

```bash
npm install
npm run dev         # starts Vite dev server on localhost:5173
```

Open `http://localhost:5173` in a browser. Edit files in `src/` — Vite hot-reloads automatically.

## Build

```bash
npm run build       # outputs to dist/
npm run preview     # preview the production build locally
```

## Verification

```bash
pip install playwright && playwright install chromium
python verify_kumiko.py
```

The script starts the Vite dev server, waits for the default image to process, takes a screenshot to `verification/screenshots/`, then shuts down the server.

## Deployment

Automatic on push to `main`/`master` via GitHub Actions → Cloudflare Pages. The CI workflow runs `npm ci && npm run build`, then deploys `dist/`.

## Key conventions

- All JS is vanilla (no frameworks, no modules beyond ES module syntax). Global scope in `src/main.js` contains the full app state.
- The 46 Kumiko patterns are defined as SVG-path data in the `REAL_PATTERNS` array (~line 400 of `src/main.js`).
- An embedded base64 JPEG (`DEFAULT_IMAGE_B64`) provides a default sample image on load.
- Color clustering uses a custom deterministic K-means implementation (no external lib).
- Triangle geometry is built by `buildTriangles()` which creates a rotated asanoha-style lattice.
