# User-guide deck generator

Builds both user-guide decks from data, so a label fix or a retaken screenshot is a rebuild, not a hand edit.

| File | What it holds |
|---|---|
| `content-complete.cjs` | Version A, complete (PTI and supplier): `../Paragon-Supplier-Portal-User-Guide.pptx` |
| `content-supplier.cjs` | Version B, supplier only and test script: `../Paragon-Supplier-Portal-User-Guide-Supplier.pptx` |
| `engine.cjs` | Slide layouts: title, cards, step (screenshot + numbered steps + status, optional test task), table, swimlane overview, list, section |
| `assets/` | Paragon logos (dark for the footer, white for navy slides) |

Content comes from `../SCENARIOS.md` and `../SCENARIOS-SUPPLIER.md`; each slide's evidence (file:line) is in its speaker notes.

## Build

```bash
npm i --prefix /tmp/ugdeps pptxgenjs@3.12.0
NODE_PATH=/tmp/ugdeps/node_modules node docs/supplier-hub/user-guide/build/build-user-guides.cjs
```

`pptxgenjs` is not a portal dependency on purpose: the decks are docs, not app code.

## Screenshots

Every step slide names its file in `../screens/` (plan: `../SCENARIOS.md` section 5). While `screenshots` is not set on a deck's exports, the engine draws a labelled placeholder with the route, seat and demo record, even if an older file with that name exists. Both content files now set `screenshots: true` (retaken 2026-11-02 from a local build of `aeabdc83` at 2160 × 1350 px; how and why in `../SCENARIOS.md` section 5).

## Check

Render to images and look at every slide: LibreOffice (`soffice --headless --convert-to pdf`), or on macOS Keynote via `osascript` export to PDF; then `pdftoppm -jpeg -r 80`.
