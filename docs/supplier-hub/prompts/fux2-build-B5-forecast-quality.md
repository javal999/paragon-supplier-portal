# Prompt: Forecast UX phase 2 B5 · Forecast quality tabs

**How to use:** Paste into Claude Code opened at the root of `paragon-supplier-portal`, on an up-to-date `main` (wave 1 merged). Wave 2, runs in parallel with B2 and B3. No slots to fill.
**Target:** paragon-supplier-portal · React 19 + TypeScript (forecast pages stay TypeScript) + Tailwind 3, mock data layer · rules from `portal-fit.md`, `fux-build-00-brief.md` and `fux2-build-00-brief.md`
**Assumptions made:**
- Model backtest stays its own Planning engine page; only Forecast bias becomes a tab.
- Target model: Claude Opus 5 with thinking on.

---

## CONTEXT

Read `docs/supplier-hub/prompts/fux2-build-00-brief.md` first, then `fux-build-00-brief.md`. Follow FUX-R1 to FUX-R10 and FUX2-R1 to FUX2-R4. Then read these:
- Findings F-06 and F-12, and the section 3 rationale "Demand forecast and Forecast bias move to Review" in the evaluation.
- `src/pages-v2/BuyerDemandForecast.tsx`, `BuyerForecastBias.tsx`, `demandForecast/DemandRangeSection.tsx`, their strings and tests.
- `navConfig.ts` (the Forecast bias user-menu entry), `AppRouter.tsx`, `forecastPages.ts`.

## OBJECTIVE

Make Forecast quality one page with 2 tabs, so "how did the forecast do" has one home.

## STANDARD

Tabs
- Forecast quality gets 2 tabs: "Forecast vs plan" (today's Demand forecast content) and "Bias and overrides" (today's Forecast bias content). The tab is kept in the address (`?tab=bias`).
- `/buyer/forecast-bias` redirects to `/buyer/demand-forecast?tab=bias` (FUX2-R1). Remove Forecast bias from the user menu and repoint `forecastPages.ts` links that targeted it.
- Keep the override form's note that overrides do not change orders until the engine forecast is switched on (F-12), next to the form.
- At the top of both tabs, 1 line stating the plan source: material planning uses SAP's finished-goods plan, and this page measures the engine's forecast against it (F-06).
- EN and ID for every string.

## CONSTRAINTS

- Touch only `BuyerDemandForecast.tsx`, `BuyerForecastBias.tsx` (fold its content into a component the tab renders), `AppRouter.tsx`, `navConfig.ts`, `forecastPages.ts`, their strings and tests.
- No change to `t_forecastoverride_record` or any engine logic.
- Branch `feat/fux2-B5-forecast-quality`, PR title `feat(fux): B5 forecast quality as two tabs`. Do not merge.

## DONE WHEN

- `npm run gates` passes on Node 22, all 5 gates.
- Tests cover:
  - `/buyer/forecast-bias` lands on Forecast quality with the bias tab selected, and the tab survives a reload
  - the override form and its note render on the bias tab
  - both tabs show the plan-source line in EN and ID
  - the user menu no longer lists Forecast bias
- On screen, as a Material Planner: both tabs work, the old route redirects, and an override can still be recorded from the bias tab.
- A PR is open per FUX-R9.

## OUTPUT

Report in the phase 2 brief's format, at most 25 lines.

Build the tabs and the redirect, update the tests, run the gates and open the PR now.
