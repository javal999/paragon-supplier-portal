# Prompt: Forecast UX A4 · Purpose headers, one banner, plain copy

**How to use:** Paste into Claude Code opened at the root of `paragon-supplier-portal`, on an up-to-date `main` (A1, A2 and A3 are merged: #125, #126, #127). Wave 2. No slots to fill.
**Target:** paragon-supplier-portal · React 18 + TypeScript strict + Tailwind 3, mock data layer · rules from `portal-fit.md` and `fux-build-00-brief.md`
**Assumptions made:**
- The Uses and Next links follow the phase 1 menu order in the brief. Engine pages point back to the Weekly plan or Review page that links to them.
- The banner wording below replaces both existing simulated-data labels on the 13 buyer forecast pages only.
- Target model: Claude Opus 5 with thinking on.

---

## CONTEXT

Read `docs/supplier-hub/prompts/fux-build-00-brief.md` first, and follow FUX-R1 to FUX-R10. Then read these:
- In `docs/supplier-hub/research/FORECAST-UX-EVALUATION-2026-10.md`: section 5, and findings F-05, F-08, F-09, F-12, F-14, F-16, F-18, F-21, F-26.
- The 13 buyer forecast pages listed in the brief, as merged after wave 1, and their strings files.
- The 2 existing simulated-data labels ("SAMPLE DATA" and "SYNTHETIC DATA · AWAITING THE MDM SAP FEED"): find their components with grep.
- `DataHealthChip` from task A3, and `src/pages-v2/Glossary.tsx` (KPI terms are excluded near :52).

## OBJECTIVE

Give every buyer forecast page a header that states its decision and its place in the cycle, replace the simulated-data labels with 1 banner, and strip internal jargon from what a planner reads.

## STANDARD

Purpose header (F-05)
- New component `PurposeHeader` beside `DataHealthChip`. Under the page title it shows 3 lines: "Decision here" (1 sentence), "Uses" (the previous page, linked), "Next" (the following page, linked). Write each page's 3 lines in EN and ID.
- Place it on all 13 pages. Each page's existing descriptive paragraphs move into a collapsed "About this page" section below the main content (F-08).
- Place `DataHealthChip` on Publish to suppliers.

Breadcrumbs and titles
- Each page's title matches its menu label from task A1 (for example "What to order" on `/buyer/order-plan`, "Publish to suppliers" on `/buyer/stabilise`, "Supplier responses" on `/buyer/collaboration`), in EN and ID. Engine pages keep their own names.
- Each page's crumb uses its new section key from task A1 (`weeklyPlan`, `review` or `planningEngine`) and its new item label, instead of `hub.nav.section.forecast`. The "Prakiraan · Prakiraan" repetition must be gone (F-19).

One banner (F-14)
- New component `SimulatedDataBanner` with 1 wording: "Sample data. Nothing here reaches suppliers or SAP." · "Data contoh. Tidak ada yang sampai ke pemasok atau SAP." Use it on all 13 pages in place of both existing labels. Keep each value's liveness marker (FUX-R3).

Plain copy
- Remove requirement codes from text a planner reads (F-18). Fix the Demand forecast sentence that says the backtest is not built (F-16).
- Next to the Forecast bias override form, state "Overrides do not change orders until the engine forecast is switched on." (F-12)
- Add a scale hint to unitless measures, for example "1.0 = usual week-to-week movement", and round quantities to their unit (F-21).
- Use 1 date line on every page: "Data as of <date>", plus a second line only where a page needs one (F-26).
- Add tooltips at the point of use for Firm, Trade-off, MASC, tracking signal, reorder point and P50/P90, in EN and ID, and add these terms to the glossary (F-09).

## CONSTRAINTS

- Touch only the 13 pages, the new components, their strings files, `Glossary.tsx` and the glossary's terms source, and their tests.
- Move text into "About this page"; do not delete explanations a planner may need.

## DONE WHEN

- `npm run gates` passes on Node 22.
- Tests cover:
  - every one of the 13 pages renders `PurposeHeader` with working Uses and Next links
  - no page renders "SAMPLE DATA" or "SYNTHETIC DATA" labels; each renders `SimulatedDataBanner`
  - no rendered page text matches a requirement code pattern such as `E14-\d+` or `ENG-[A-Z]\d+` (a known-bad string must fail the check before you trust it)
  - each new glossary term resolves in EN and ID
- On screen, as a Material Planner, at 1440×900: on each page, the first screen shows title, purpose header, banner and the main table or form, with no caveat paragraph above it.
- A PR is open per FUX-R9.

## OUTPUT

Report in the brief's format, at most 25 lines.

Build the purpose header, the banner, the breadcrumb switch and the copy changes, update the tests, run the gates and open the PR now.
