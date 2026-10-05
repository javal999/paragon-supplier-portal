# Prompt: Forecast UX A1 · Menu and labels

**How to use:** Paste into Claude Code opened at the root of `paragon-supplier-portal`, on an up-to-date `main`. Wave 1, runs in parallel with A2 and A3. No slots to fill.
**Target:** paragon-supplier-portal · React 18 + TypeScript strict + Tailwind 3, mock data layer · rules from `portal-fit.md` and `fux-build-00-brief.md`
**Assumptions made:**
- FUX-D2 (owner, 2026-10-05): Supplier scorecard is the planner's supplier-evaluation page.
- Procurement (BUY) keeps its existing Performance section; only Material Planning (MP) gets the new Review section.
- Target model: Claude Opus 5 with thinking on.

---

## CONTEXT

Read `docs/supplier-hub/prompts/fux-build-00-brief.md` first, and follow FUX-R1 to FUX-R10. Then read these:
- In `docs/supplier-hub/research/FORECAST-UX-EVALUATION-2026-10.md`: section 3, and findings F-03, F-04, F-11, F-19, F-25.
- `src/components/layout-v2/navConfig.ts` in full, including `navFor` and `sectionForPath`.
- `src/lib/i18n/hub.ts`, the `hub.nav.*` keys in both exports.
- The tests that cover the menu (find them with grep for `PTI_NAV`, `navFor`, `sectionForPath` and `UTILITY_NAV`).

## OBJECTIVE

Replace the 13-item Forecast section with the Weekly plan and Review sections, and move the engine pages into the user menu, exactly as "The menu after phase 1" in the brief lists them.

## STANDARD

Menu
- `PTI_NAV`: remove the `forecast` section. Add `weeklyPlan` (4 items) and `review` (3 items), both `roles: ['MP']`, in the brief's order and with its labels.
- Keep the existing icon of each moved item. Pick a lucide icon for any item that lacks one.
- The `performance` section becomes `roles: ['BUY']`, so a Material Planner sees the scorecard once, under Review.
- `UTILITY_NAV.buyer`: add the 7 engine pages from the brief's table, after the existing entries, each label starting with the "Planning engine" prefix (for example "Planning engine · Data health").

Section lookup (NV-05)
- A page header must name the section the viewer's own menu shows. `/buyer/scorecard` now sits in 2 sections, so make `sectionForPath` choose by role. Pass the role in from its callers. A route in no section returns `null`, as today.
- Confirm on screen that the scorecard header reads "Review" for a Material Planner and "Performance" for Procurement.

Labels
- Add `hub.nav.section.weeklyPlan`, `hub.nav.section.review` and `hub.nav.section.planningEngine`, plus one `hub.nav.pti.*` key per new item label, in EN and ID.
- Keep `hub.nav.section.forecast` and every old `hub.nav.pti.*` key the pages still read. The pages switch to the new keys in task A4.
- Safety stock: menu label and page title must match (F-25). Change the title key in `src/lib/i18n/safetyStock.ts` to "Safety stock targets · Target stok pengaman".

## CONSTRAINTS

- Touch only `navConfig.ts`, its callers for the role parameter, `hub.ts`, `safetyStock.ts`'s title key, and their tests. No page body changes.
- Routes stay as they are.

## DONE WHEN

- `npm run gates` passes on Node 22.
- Tests cover:
  - a Material Planner's menu shows exactly the 7 items in the brief's order, under 2 sections
  - Procurement's menu still shows Performance → Supplier scorecard
  - each of the 7 engine pages appears in the buyer user menu
  - `sectionForPath('/buyer/scorecard', 'MP')` returns Review and `('/buyer/scorecard', 'BUY')` returns Performance
  - every new key exists in both EN and ID
- On screen, as a Material Planner: the sidebar shows the 2 sections, and each of the 14 routes still opens.
- A PR is open per FUX-R9.

## OUTPUT

Report in the brief's format, at most 25 lines.

Build the menu, the role-aware section lookup, the labels and the tests, run the gates and open the PR now.
