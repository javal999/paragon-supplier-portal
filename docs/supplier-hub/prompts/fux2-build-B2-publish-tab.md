# Prompt: Forecast UX phase 2 B2 · Publish with versions tab

**How to use:** Paste into Claude Code opened at the root of `paragon-supplier-portal`, on an up-to-date `main` (wave 1, B1 and B6, merged). Wave 2, runs in parallel with B3 and B5. No slots to fill.
**Target:** paragon-supplier-portal · React 19 + TypeScript (forecast pages stay TypeScript) + Tailwind 3, mock data layer · rules from `portal-fit.md`, `fux-build-00-brief.md` and `fux2-build-00-brief.md`
**Assumptions made:**
- FUX-D4: no Source column and no next-due date.
- The checklist reads states that already exist; it adds no gate to the verb (FUX-R1).
- Target model: Claude Opus 5 with thinking on.

---

## CONTEXT

Read `docs/supplier-hub/prompts/fux2-build-00-brief.md` first, then `fux-build-00-brief.md`. Follow FUX-R1 to FUX-R10 and FUX2-R1 to FUX2-R4. Then read these:
- Findings F-01 and F-13, and section 5 "Publish gate checklist" in the evaluation.
- `src/pages-v2/BuyerStabilise.tsx`, `src/pages-v2/BuyerForecasts.tsx`, their strings and tests.
- `useStabilisedPlan`, `useForecastVersions`, `useDataHealth`, `useReschedule`, `useOrderPlan`.
- `navConfig.ts` (the Published versions user-menu entry), `AppRouter.tsx`, `forecastPages.ts`.

## OBJECTIVE

Leave one page for publishing: Publish to suppliers gains a Published versions tab and a checklist that shows, before the button, whether the week is ready to publish.

## STANDARD

Tabs
- Publish to suppliers gets 2 tabs: "Version to publish" (today's content) and "Published versions" (today's Forecasts page content). The tab is kept in the address (`?tab=versions`).
- `/buyer/forecasts` redirects to `/buyer/stabilise?tab=versions` (FUX2-R1). Remove "Published versions" from the user menu and point `forecastPages.ts` links that targeted it to the tab.

Checklist, above the publish button
- 4 items, each with a state and a link to the page that resolves it:
  - Inputs pass: from Data health (reuse `DataHealthChip`'s count).
  - Orders reviewed: shows the number of recommended orders this week, with a link to What to order. Do not store a "reviewed" flag (FUX2-R3).
  - Warehouse weeks resolved: the number of weeks over owned capacity, linking to Make warehouse room.
  - Held weeks have reasons: from the stabilised plan's held Trade-off weeks.
- While data is simulated, the publish refusal stays exactly as phase 1 left it.
- EN and ID for every string.

## CONSTRAINTS

- Touch only `BuyerStabilise.tsx`, `BuyerForecasts.tsx` (fold its content into a component the tab renders), `AppRouter.tsx`, `navConfig.ts`, `forecastPages.ts`, their strings and tests.
- No change to `forecast:publish`, its flow or policy hooks.
- Branch `feat/fux2-B2-publish-tab`, PR title `feat(fux): B2 published versions as a tab of Publish to suppliers`. Do not merge.

## DONE WHEN

- `npm run gates` passes on Node 22, all 5 gates.
- Tests cover:
  - `/buyer/forecasts` lands on Publish to suppliers with the Published versions tab selected
  - the tab survives a reload through the address
  - the checklist shows each item's state and link, and a failing Data health check shows on it
  - the user menu no longer lists Published versions, and no `forecastPages.ts` link points to a removed route
- On screen, as a Material Planner: both tabs work, the old route redirects, and the checklist shows above the refused publish button.
- A PR is open per FUX-R9.

## OUTPUT

Report in the phase 2 brief's format, at most 25 lines.

Build the tabs, the redirect and the checklist, update the tests, run the gates and open the PR now.
