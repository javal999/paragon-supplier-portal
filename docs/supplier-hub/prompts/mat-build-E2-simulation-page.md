# Prompt: Material E2 · Stock simulation page

**How to use:** Paste into Claude Code opened at the root of `paragon-supplier-portal`, on an up-to-date `main` with E1 and C4 merged. No slots to fill.
**Target:** paragon-supplier-portal · React 18 + TypeScript strict + Tailwind 3, mock data layer · rules from `portal-fit.md` and `mat-build-00-brief.md`
**Assumptions made:**
- MAT-D2 is accepted (owner, 2026-09-29): a separate page. The stock visibility page keeps "no available figure" (REQ-E08-01 BR-01).
- "Create call-off" opens the existing call-off draft flow pre-filled. It creates nothing by itself.
- Target model: Claude Opus 5 with thinking on.

---

## CONTEXT

Read `docs/supplier-hub/prompts/mat-build-00-brief.md` first, and follow MAT-R1 to MAT-R15. Then read these:
- In the requirements: MR-7 sections e and j.

Then read these files:
- E1's `simulateSupplierStock` and override verb
- `src/router/AppRouter.tsx` and the buyer navigation (Inventory group)
- the call-off draft entry point (`BuyerCallOffs.tsx`, `t_calloff_draft`)
- C3's `MaterialSearch`, and C4's PIC filter
- `allRoutes.smoke`, which derives routes from the router

## OBJECTIVE

Give planners a page to check any supplier's estimated stock on any day, fill in missing figures, and act on it.

## STANDARD

Route
- `/buyer/stock-simulation` → `BuyerStockSimulation.tsx` inside `AppShellV2`, under Inventory in the menu. [MR-7 section e step 1]

Filters
- Check date (default today, no date before the latest update).
- Supplier, material (`MaterialSearch`), planning group, and PIC.
- Filters are kept in the page address. [step 2]

Table
- One row per supplier × material.
- Columns: Supplier available, Already called off, **Free to call off**, PTI inbound, Last update, Basis, and flags ("Capped by capacity", "Missing ETA", and so on).
- The figures use `<Data>`. The 2 main figures are visibly separate, never summed. [step 3]

Row detail
- 13 weekly buckets with the figures at week end and the events inside each week. [step 4]

Planner input
- Each "Missing" or editable input opens an inline form that dispatches the override verb.
- The value shows as "Planner input · <who> · <when>". [step 5]

Actions
- "Create call-off" and "Create PO request", pre-filled. [step 6]

Other
- EN and ID for every string. Keyboard-operable rows, as the accessibility pass requires (BL-31).
- Record the page's load time in the fixture as a measurement, for the open latency input (plan section 1.1 input 2).

## CONSTRAINTS

- `BuyerInventory` gets no available figure (AC-06).

## DONE WHEN

- `npm run gates` passes on Node 22.
- Page tests cover:
  - the worked-example row renders 8,300, 3,000, 5,300 and 1,200 in separate cells
  - a planner input shows its label and who
  - the filters survive a reload
  - "Create call-off" opens the draft pre-filled
  - `BuyerInventory` still has no available column
- `allRoutes.smoke` passes with the new route.
- A PR is open per MAT-R11, with the load-time measurement in the description.

## OUTPUT

Report in the brief's format, at most 25 lines.

Build the page, route, filters, input and tests, run the gates and open the PR now.
