# Prompt: Forecast UX phase 2 B3 · Why this quantity panel

**How to use:** Paste into Claude Code opened at the root of `paragon-supplier-portal`, on an up-to-date `main` (wave 1 merged). Wave 2, runs in parallel with B2 and B5. No slots to fill.
**Target:** paragon-supplier-portal · React 19 + TypeScript (forecast pages stay TypeScript) + Tailwind 3, mock data layer · rules from `portal-fit.md`, `fux-build-00-brief.md` and `fux2-build-00-brief.md`
**Assumptions made:**
- Material requirement and Safety stock targets stay as full pages in the Planning engine menu; the panel is a per-material view of the same numbers, not a replacement.
- The panel opens per recommended order row, in a side panel or an expanding row, whichever the page's table pattern already uses.
- Target model: Claude Opus 5 with thinking on.

---

## CONTEXT

Read `docs/supplier-hub/prompts/fux2-build-00-brief.md` first, then `fux-build-00-brief.md`. Follow FUX-R1 to FUX-R10 and FUX2-R1 to FUX2-R4. Then read these:
- Findings F-07 and F-17, and the section 3 rationale "Merge Material requirement into What to order" in the evaluation.
- `src/pages-v2/BuyerOrderPlan.tsx`, `BuyerMaterialRequirement.tsx`, `BuyerSafetyStock.tsx`, their strings and tests.
- `useOrderPlan`, `useMaterialRequirement`, `useSafetyStock`, and how a material is keyed in each.

## OBJECTIVE

Let a planner see why a recommended order has its quantity without leaving What to order.

## STANDARD

Panel
- On each Recommended orders row, a "Why this quantity" control opens a panel for that material showing, from the existing hooks:
  - gross requirement, stock on hand, confirmed deliveries, and net requirement (the Material requirement numbers)
  - safety stock, safety lead time and reorder point (the Safety stock numbers)
  - the order sizing that turned the net requirement into the recommended quantity (MOQ, order multiple, space)
- Each block links to its full page, filtered to that material if the page supports a filter in its address.
- Use `TermTip` for safety stock and reorder point.

Page
- Rename the "Why these quantities" links from phase 1 to point to the panel's full pages, and keep them.
- `forecastPages.ts`: What to order's Uses stays This week (from B1).
- EN and ID for every string.

## CONSTRAINTS

- Touch only `BuyerOrderPlan.tsx`, a new panel component in `src/components/forecast/`, their strings and tests. Read-only use of the Material requirement and Safety stock hooks.
- Do not touch the "Weeks that do not fit" card; B4 moves it.
- If a material key differs between the 3 hooks, stop and report (FUX-R8); do not write a mapping.
- Branch `feat/fux2-B3-why-quantity`, PR title `feat(fux): B3 "why this quantity" panel in What to order`. Do not merge.

## DONE WHEN

- `npm run gates` passes on Node 22, all 5 gates.
- Tests cover:
  - opening the panel for a material shows the same net requirement as Material requirement and the same safety stock as Safety stock targets for that material
  - the panel's links reach the full pages
  - the panel opens and closes by keyboard
- On screen, as a Material Planner: the panel opens on a recommended order and its numbers match the 2 full pages for the same material.
- A PR is open per FUX-R9.

## OUTPUT

Report in the phase 2 brief's format, at most 25 lines.

Build the panel, wire it into What to order, update the tests, run the gates and open the PR now.
