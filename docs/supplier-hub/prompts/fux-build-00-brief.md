# Forecast UX build brief (read by every fux-build task prompt)

This file is source material for the task prompts `fux-build-A1` to `fux-build-A4`. It is not a prompt to run on its own. Each task prompt tells the agent to read it first. Its rules are cited as FUX-R1 to FUX-R10. Company rules (FE-*) come from `portal-fit.md` at `/Users/achmadfahlevi/Documents/Build AI Product Sense/projects/sc-hub-vision/paragon-supplier-portal/.claude/skills/prompt-builder/references/portal-fit.md` (untracked, so read it at that path from any worktree).

## What is being built

- **Source:** `docs/supplier-hub/research/FORECAST-UX-EVALUATION-2026-10.md`. Its findings are cited as F-01 to F-27, its target structure as section 3, and its comprehension aids as section 5.
- **Phase 1 only: the quick wins.** Labels, menu order, one publish path, decision-first page layout, purpose headers, one simulated-data banner, and the Data health flag on the result pages. No page merges and no new pages. Those are phase 2 (listed at the end of this file) and are not built here.
- **Owner decisions, 2026-10-05:**
  - **FUX-D1 · One publish path.** Remove the SAP-plan publish from Forecasts: the "Re-publish" and "Emergency re-publication" buttons. Stabilise and publish becomes the only place a plan is published. While data is simulated, that publish stays refused, so nothing reaches a supplier from the demo. That is intended.
  - **FUX-D2 · Supplier scorecard is the supplier-evaluation home.** The planner's "Supplier performance" menu item opens `/buyer/scorecard`. Supplier reliability (`/buyer/reliability`) leaves the planner menu and becomes an engine page, because its plan-change measure feeds Stabilise and Reschedule.

## The menu after phase 1

The buyer "Forecast" section is replaced by 2 sections, both `roles: ['MP']`:

- **Weekly plan · Rencana mingguan**
  1. What to order · Apa yang dipesan → `/buyer/order-plan`
  2. Make warehouse room · Kosongkan ruang gudang → `/buyer/reschedule`
  3. Publish to suppliers · Terbitkan ke pemasok → `/buyer/stabilise`
  4. Supplier responses · Tanggapan pemasok → `/buyer/collaboration`
- **Review · Evaluasi**
  5. Supplier performance · Kinerja pemasok → `/buyer/scorecard`
  6. Forecast quality · Kualitas prakiraan → `/buyer/demand-forecast`
  7. End-of-cycle stock check · Cek stok akhir siklus → `/buyer/fs-reconcile`

These pages leave the main menu and move into the user menu (`UTILITY_NAV.buyer`) under a "Planning engine · Mesin perencanaan" label prefix, so none is orphaned:

| Page | Route | New label (EN · ID) | Reached from |
|---|---|---|---|
| Material requirement | `/buyer/material-requirement` | Material requirement · Kebutuhan material | What to order |
| Safety stock | `/buyer/safety-stock` | Safety stock targets · Target stok pengaman | What to order |
| Forecasts | `/buyer/forecasts` | Published versions · Versi terbit | Publish to suppliers |
| Forecast bias | `/buyer/forecast-bias` | Forecast bias · Bias prakiraan | Forecast quality (link exists) |
| Data health | `/buyer/data-health` | Data health · Kesehatan data | The Data health chip on result pages |
| Model backtest | `/buyer/model-backtest` | Model backtest · Uji model | Forecast quality (link exists) |
| Supplier reliability | `/buyer/reliability` | Supplier reliability · Keandalan pemasok | Supplier performance |

The "Start here" page ("This week") is phase 2. Until it exists, the Weekly plan order is the guidance.

## The code the tasks touch

| Area | Where |
|---|---|
| Menu, section lookup for page headers (NV-05) | `src/components/layout-v2/navConfig.ts` (`PTI_NAV`, `UTILITY_NAV`) |
| Menu labels | `src/lib/i18n/hub.ts` (`hub.nav.*`, EN and ID exports) |
| Routes | `src/router/AppRouter.tsx` (unchanged in phase 1) |
| Breadcrumbs | Each forecast page builds its own crumb from `t('hub.nav.section.forecast')`. A1 adds the new section keys; A4 switches every page's crumb to them |
| Pages | `src/pages-v2/Buyer{Forecasts,Commitments,DataHealth,DemandForecast,ForecastBias,ModelBacktest,Reliability,MaterialRequirement,SafetyStock,OrderPlan,Reschedule,Stabilise}.tsx` and `src/pages-v2/FixedStockReconcile.tsx` |
| Page strings | `src/lib/i18n/<area>.ts`, one file per page (for example `orderPlan.ts`, `stabilise.ts`, `dataHealth.ts`, `forecastCollaboration.ts`) |
| Data health read | `useDataHealth` (find it with grep; today only `BuyerDataHealth` imports it) |
| Handoff notice | `HandoffNotice`, `useVerbAvailability` |
| Glossary | `src/pages-v2/Glossary.tsx` |

## Rules for every task

- **FUX-R1 · Change only presentation.** No change to engine logic in `src/services/engine/`, to any flow, verb, policy hook or `CommandTarget`, or to `docs/contracts/`. FUX-D1 removes UI entrances only; the `forecast:publish` verb and its flow stay as they are. When a change seems to need one of these, stop and report.
- **FUX-R2 · Strings.** Every user-visible string goes through `t()`. Add each key to both the `En` and `Id` exports of the matching `src/lib/i18n/<area>.ts`. Use "Terbitkan" for every Indonesian publish verb (F-20). Remove requirement codes (E14-xx, ENG-xx, BR-xx, C8 §8) from text a user reads (F-18); keep them in code comments.
- **FUX-R3 · Keep the honesty markers.** Every value that is simulated keeps its liveness marker. Phase 1 replaces the 2 banner wordings with 1 component (task A4); it never removes the fact that data is simulated.
- **FUX-R4 · UI.** Follow DP-1 to DP-3 in `CLAUDE.md`. `Button` has no solid variant. Codes, dates and quantities use the `<Data>` primitive. Use a ternary or `!!x &&` for conditional render, keep JSX nesting at 6 levels or fewer, and use stable keys.
- **FUX-R5 · Forecast stays TypeScript.** Do not convert any forecast page to JavaScript (`CLAUDE.md`, Language section). Lint reports on the forecast module but does not block it.
- **FUX-R6 · Tests.** Update every test the change breaks, by asserting the new behavior, never by deleting the assertion without a replacement unless the behavior itself is removed (FUX-D1). Page tests render through `renderWithProviders` (`src/test/test-utils.tsx`). Each task names its required tests.
- **FUX-R7 · Scope.** Build only what the task names, in the files it names. Leave other tasks' pages alone, because tasks in the same wave run in parallel.
- **FUX-R8 · Read before asserting.** Open a file before changing or describing it. Line numbers in the evaluation were read at `b4fab78`, so confirm them on `main`. When the code contradicts this brief, stop and report the contradiction instead of choosing.
- **FUX-R9 · Git.** Obey `CLAUDE.md`. Branch `feat/fux-<task id>-<slug>` off an up-to-date `main`. Commit, push, and open 1 PR titled `feat(fux): <task id> <deliverable>`. Do not merge.
- **FUX-R10 · Finish line.** `npm run gates` passes on Node 22 (`PATH=/opt/homebrew/opt/node@22/bin:$PATH`). If it prints the floor note, bump `scripts/floor.json`. Open each changed page in the running app as a Material Planner and confirm the change on screen. Do not use subagents to verify or double-check your own work.

## Waves

| Wave | Tasks | Why this order |
|---|---|---|
| 1 | A1 menu and labels · A2 publish and responses side · A3 ordering side | Each owns different files, so they run in parallel |
| 2 | A4 purpose headers, banner and copy | Touches every forecast page, so it waits until wave 1 is merged |

## Phase 2 (not briefed yet)

"This week" start page with cycle stepper and input check · merge Published versions into Publish as a tab · Material requirement and Safety stock as a per-material panel in What to order · move the overflow card into Make warehouse room and save the choice · Forecast quality as 2 tabs · align the scorecard and reliability data · End-of-cycle stock check for Procurement (open question 3 in the evaluation).

## Report format for every task

At most 25 lines:
1. The branch and PR URL.
2. The changed files, 1 line each.
3. The `npm run gates` summary: the gates and the test count.
4. Each finding the task covered, as "F-id: where".
5. What you checked on screen, 1 line per page.
6. Anything the task could not do, and why, plus any contradiction found under FUX-R8.
