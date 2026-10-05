# Prompt: Forecast UX A3 · Ordering decision first, and the Data health flag

**How to use:** Paste into Claude Code opened at the root of `paragon-supplier-portal`, on an up-to-date `main`. Wave 1, runs in parallel with A1 and A2. No slots to fill.
**Target:** paragon-supplier-portal · React 18 + TypeScript strict + Tailwind 3, mock data layer · rules from `portal-fit.md` and `fux-build-00-brief.md`
**Assumptions made:**
- The Data health chip is built here as a shared component and placed on the 3 ordering pages. Task A4 places it on Publish to suppliers.
- Reordering sections and sorting rows in the page changes no engine output (FUX-R1).
- Target model: Claude Opus 5 with thinking on.

---

## CONTEXT

Read `docs/supplier-hub/prompts/fux-build-00-brief.md` first, and follow FUX-R1 to FUX-R10. Then read these:
- In `docs/supplier-hub/research/FORECAST-UX-EVALUATION-2026-10.md`: findings F-02, F-06, F-07, F-17, F-22.
- `src/pages-v2/BuyerOrderPlan.tsx` (section order near :303, :422, :503, :510; the link to Reschedule near :293).
- `src/pages-v2/BuyerReschedule.tsx`.
- `src/pages-v2/BuyerMaterialRequirement.tsx` (row render near :336; link to Order plan near :281).
- `src/pages-v2/BuyerDataHealth.tsx`, `useDataHealth`, and `src/lib/i18n/dataHealth.ts` (the `dh.notBuilt` text near :18 that says result pages do not carry the flag).
- `src/lib/i18n/orderPlan.ts`, the Reschedule and Material requirement strings files.

## OBJECTIVE

Put the decision a planner makes at the top of What to order and Make warehouse room, sort Material requirement by need, and show Data health failures on the 3 ordering pages.

## STANDARD

Data health chip (F-02)
- New component `src/components/forecast/DataHealthChip.tsx` (or the nearest existing folder for shared forecast UI). It reads `useDataHealth` and shows the checks that affect the given page: "Inputs: <n> checks failing" with a link to `/buyer/data-health`, or "Inputs: all checks pass".
- Decide which checks affect a page from the mapping Data health already uses to say which engine steps a failure affects. Do not write a second mapping. If no such mapping is reachable, stop and report.
- Place it under the title of Order plan, Reschedule and Material requirement.
- Update `dh.notBuilt` so it no longer says result pages lack the flag. Keep its other half (refused records are not yet left out of the calculation) if that is still true.

What to order (`BuyerOrderPlan`, F-06, F-07)
- Order: title, Data health chip, summary KPIs, then Recommended orders. Move cost rates, the warehouse chart, the 26-row weekly table and "How it works" below, collapsed by default.
- Add 1 line stating the plan source and its date, for example "Plan source: SAP finished-goods plan, <date>", read from the data the page already has.
- Add links to Material requirement and Safety stock targets, labelled "Why these quantities".

Make warehouse room (`BuyerReschedule`, F-07, F-22)
- Order: title, Data health chip, summary, then the proposals table. Context sections below, collapsed.
- Where both pages show "Projected warehouse fill by week", label which one includes recommended orders, so the 127% and 128% for the same week are explained (F-22).

Material requirement (F-17)
- Sort rows by need: late to release first, then net requirement descending, then review flag. Add a "Needs order" filter, off by default, kept in the page address.

## CONSTRAINTS

- Touch only the 3 pages, the new chip component, their strings files and their tests. Breadcrumbs, purpose headers and banners are task A4's.
- Collapse sections; do not delete content.

## DONE WHEN

- `npm run gates` passes on Node 22.
- Tests cover:
  - the chip shows a failing count and a link when a check affecting the page fails, and "all checks pass" when none does (both directions)
  - Recommended orders renders before the weekly table on What to order
  - the proposals table renders before the context sections on Make warehouse room
  - Material requirement lists a material with a net requirement above one with zero, and the filter hides zero rows
- On screen, as a Material Planner: the recommended orders are visible without scrolling at 1440×900, and the chip shows on the 3 pages.
- A PR is open per FUX-R9.

## OUTPUT

Report in the brief's format, at most 25 lines.

Build the chip, reorder the 2 pages, sort Material requirement, update the tests, run the gates and open the PR now.
