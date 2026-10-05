# Forecast UX phase 2 build brief (read by every fux2-build task prompt)

This file is source material for the task prompts `fux2-build-B1` to `fux2-build-B6`. It is not a prompt to run on its own. Each task prompt tells the agent to read it first. Phase 1's rules still apply: read `docs/supplier-hub/prompts/fux-build-00-brief.md` and follow FUX-R1 to FUX-R10, except where FUX-D3 below lifts FUX-R1 for task B4. Phase 2 adds FUX2-R1 to FUX2-R4.

## What is being built

- **Source:** `docs/supplier-hub/research/FORECAST-UX-EVALUATION-2026-10.md` (findings F-01 to F-27, target structure in section 3, comprehension aids in section 5) and the "Wave 1 status" section of the phase 1 brief.
- **Phase 1 is merged** (#125, #126, #127, #131; main `ba0f550`). The menu, purpose headers (`PurposeHeader`), the banner (`SimulatedDataBanner`), "About this page" (`AboutThisPage`), `DataAsOf`, `TermTip`, `DataHealthChip` and the page map `src/components/forecast/forecastPages.ts` exist. Reuse them; do not build second versions.
- **Phase 2 builds the larger changes:** a start page, page merges, an in-page panel, and one saved planner decision.

## Owner decisions, 2026-10-05

- **FUX-D3 · The warehouse choice is saved.** The "Weeks that do not fit" choice moves to Make warehouse room and is recorded through a new verb, because a choice that is not saved is the defect itself (F-10). This is the only phase 2 task allowed a verb, a store and a `CommandTarget`. It follows the material build's verb rules (see B4).
- **FUX-D4 · No Source field or next-due date yet.** Both need a change to the forecast read model and possibly to the C8 forecast-publication contract, and today every version comes from SAP's plan. They wait until the engine publishes on real data and SOMO ratifies C8 §8. Not in phase 2.
- **FUX-D5 · Two supplier measures, two names.** Supplier scorecard stays the evaluation home (FUX-D2). Its "Delivered on the confirmed date" (by quantity, per order, 30 or 90 days) keeps its name. Supplier reliability's measure with the same name (by PO line, 13 or 26 weeks) is renamed so the two can never be read as one number. No calculation changes.
- **FUX-D6 · Procurement sees the end-of-cycle stock check.** Procurement sets max stock on that page (`maxstock:set`), so the page gets a menu path for the BUY role. The action stays gated by the existing `HandoffNotice` on `FixedStockReconcile.tsx`.

## The tasks

| Task | Builds | Size | Findings | Wave |
|---|---|---|---|---|
| B1 | "This week" start page, cycle step bar, menu changes for wave 1 (including FUX-D6) | M | F-02, F-03, F-05, F-15 | 1 |
| B6 | Supplier performance: scorecard purpose header and banner, reliability measure renamed (FUX-D5) | S | F-11 | 1 |
| B2 | Published versions becomes a tab of Publish to suppliers, plus the publish checklist | M | F-01, F-13 | 2 |
| B3 | "Why this quantity" panel per material inside What to order | L | F-07, F-17 | 2 |
| B5 | Forecast quality: Demand forecast and Forecast bias as 2 tabs | M | F-06, F-12 | 2 |
| B4 | Warehouse room decision: the overflow card moves to Make warehouse room and the choice is saved (FUX-D3) | L | F-10, F-22 | 3 |

Waves run in order. Tasks inside a wave run in parallel. B4 waits for B3 because both touch `BuyerOrderPlan.tsx`.

## The menu after phase 2

- **Weekly plan · Rencana mingguan** (MP): This week (new, first) · What to order · Make warehouse room · Publish to suppliers · Supplier responses
- **Review · Evaluasi** (MP): Supplier performance · Forecast quality · End-of-cycle stock check
- **Performance** (BUY): Supplier performance · End-of-cycle stock check (FUX-D6)
- **User menu, Planning engine:** Material requirement · Safety stock targets · Data health · Model backtest · Supplier reliability. "Published versions" and "Forecast bias" leave the user menu when B2 and B5 turn them into tabs.

## Rules added for phase 2

- **FUX2-R1 · Old routes keep working.** When a page becomes a tab, its old route redirects to the new page with the tab selected (for example `/buyer/forecasts` → `/buyer/stabilise?tab=versions`). The tab is kept in the page address. Never leave a route that 404s or renders a blank page; `allRoutes.smoke` derives routes from the router and must stay green.
- **FUX2-R2 · Shared registration files.** `AppRouter.tsx`, `navConfig.ts`, `forecastPages.ts` and `src/lib/i18n/hub.ts` are touched by several tasks. Change only the lines your task needs, add new entries rather than reordering existing ones, and say in the report which lines you changed. The operator resolves conflicts at merge.
- **FUX2-R3 · No invented state.** A status shown on the start page or the step bar is derived from data the hooks already return. Do not store "done" flags. Where a status cannot be derived, show the number instead of a status.
- **FUX2-R4 · Keep phase 1's guarantees.** Every forecast page keeps its `PurposeHeader`, `SimulatedDataBanner` and title matching its menu label. Update `forecastPages.ts` Uses and Next links whenever a page is added, merged or becomes a tab, and keep its test green.

## The code the tasks touch

| Area | Where |
|---|---|
| Page map, Uses/Next links | `src/components/forecast/forecastPages.ts` |
| Shared forecast UI | `src/components/forecast/` (`PurposeHeader`, `SimulatedDataBanner`, `AboutThisPage`, `DataAsOf`, `TermTip`, `DataHealthChip`) |
| Menu | `src/components/layout-v2/navConfig.ts`, labels in `src/lib/i18n/hub.ts` |
| Routes | `src/router/AppRouter.tsx` |
| Read hooks | `src/services/query/hooks.ts`: `useOrderPlan`, `useReschedule`, `useStabilisedPlan`, `useForecastVersions`, `useForecastCommitments`, `useDataHealth`, `useMaterialRequirement`, `useSafetyStock`, `useDemandForecast`, `useForecastBias`, `useSupplierReliability`, `useSupplierScorecards`, `useFixedStockReconcile` |
| Pages | `src/pages-v2/Buyer{OrderPlan,Reschedule,Stabilise,Forecasts,Commitments,DemandForecast,ForecastBias,MaterialRequirement,SafetyStock,Reliability,Scorecard}.tsx`, `src/pages-v2/FixedStockReconcile.tsx` |
| Verb rules (B4 only) | `docs/supplier-hub/prompts/mat-build-00-brief.md`, MAT-R1 to MAT-R5 and MAT-R13 |

## Phase 2 status (2026-10-05)

Merged: B6 #134, B1 #135, B5 #137, B3 #138, B2 #139, step-bar fix #140, B4 #142. Findings from building it:
- B1: the This week "What to order" card first counted only orders releasing this week, which read 0 while the page showed 65 recommended orders. It now shows the page's own count and the first release week.
- B3: net requirement is worked out week by week (`netMaterial`, `src/services/engine/requirement.ts`: gross + safety stock − (stock at start of week + that week's receipts), never below zero), so the 26-week total is not gross − stock − deliveries. The panel shows the order's own week, whose figures add up, plus 1 line explaining the total.
- B6: the scorecard title now matches the menu ("Supplier performance"). The supplier's own "Your reliability" panel shares the renamed measure.
- B5 and B2: old routes redirect with a plain `Navigate`, because `LegacyRedirect` drops the `?tab=` query.
- #140: the step bar and the This week cards state the failing input check once. It removed `STEP_HEALTH` while `BuyerStabilise.tsx` (B2) still read it, which broke main at `4adf175`; B4 restored the export. Check for readers on current main, not on the branch base, before deleting an export.
- B4: verb `t_warehousedecision_record` (atom `warehousedecision:record`, planning bundle; refusals `WAREHOUSE_DECISION_CHOICE_UNKNOWN`, `WAREHOUSE_DECISION_NOTE_REQUIRED`). Its ledger is mirrored to `sessionStorage` so a decision survives a reload, and `getReschedule` returns the decisions and plan versions.

## Report format for every task

At most 25 lines:
1. The branch and PR URL, and the head SHA from `git rev-parse HEAD` and `git ls-remote`.
2. The changed files, 1 line each, and the lines changed in the shared registration files (FUX2-R2).
3. All 5 `npm run gates` results by name, and the test count.
4. Each finding and decision covered, as "F-id or FUX-D id: where".
5. What you checked on screen, 1 line per page.
6. Anything not done, and why, plus any contradiction found under FUX-R8.
