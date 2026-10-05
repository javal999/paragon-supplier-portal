# Prompt: Forecast UX phase 2 B1 · This week start page

**How to use:** Paste into Claude Code opened at the root of `paragon-supplier-portal`, on an up-to-date `main`. Wave 1, runs in parallel with B6. No slots to fill.
**Target:** paragon-supplier-portal · React 19 + TypeScript (forecast pages stay TypeScript) + Tailwind 3, mock data layer · rules from `portal-fit.md`, `fux-build-00-brief.md` and `fux2-build-00-brief.md`
**Assumptions made:**
- The start page is the first item of Weekly plan, not the persona home. `/buyer/home` (My tasks) stays the landing page and gains 1 link to This week.
- FUX-D6 (Procurement menu path to the stock check) is a `navConfig.ts` change, so it sits in this task, which owns `navConfig.ts` in wave 1.
- Target model: Claude Opus 5 with thinking on.

---

## CONTEXT

Read `docs/supplier-hub/prompts/fux2-build-00-brief.md` first, then `fux-build-00-brief.md`. Follow FUX-R1 to FUX-R10 and FUX2-R1 to FUX2-R4. Then read these:
- In the evaluation: section 4 (first-run path), section 5 (cycle stepper, start page), findings F-02, F-03, F-05, F-15.
- `src/components/forecast/forecastPages.ts`, `PurposeHeader.tsx`, `DataHealthChip.tsx`.
- `src/components/layout-v2/navConfig.ts`, `src/router/AppRouter.tsx`, `src/pages-v2/BuyerHome.tsx`.
- The hooks `useOrderPlan`, `useReschedule`, `useStabilisedPlan`, `useForecastVersions`, `useForecastCommitments`, `useDataHealth`, and what each page currently shows as its headline number.
- `src/pages-v2/FixedStockReconcile.tsx` around the `maxstock:set` `HandoffNotice`.

## OBJECTIVE

Give the weekly cycle a visible starting point: a This week page that shows each step's state and one number, and a step bar on the 4 Weekly plan pages that shows where the planner is.

## STANDARD

This week page (new route `/buyer/this-week`, page `BuyerThisWeek.tsx`)
- Title "This week · Minggu ini", `PurposeHeader` (Decision: what to work on first this week; Uses: Data health; Next: What to order), `SimulatedDataBanner`, `DataAsOf`.
- Input check card: the Data health verdict ("All checks pass" or "<n> checks failing"), with a link to Data health. Reuse `DataHealthChip`'s counting; do not write a second count.
- 4 step cards in cycle order, each with its menu label, 1 number and a link:
  - What to order: materials needing an order this week.
  - Make warehouse room: weeks over owned capacity.
  - Publish to suppliers: last published version and date per stream, and whether publishing is withheld.
  - Supplier responses: open exceptions.
- Read each number from the hook its page already uses, with the same rule the page uses. If a page's headline number cannot be reached through its hook, stop and report (FUX-R8).

Cycle step bar (new component `CycleSteps.tsx` in `src/components/forecast/`)
- 5 steps: This week, What to order, Make warehouse room, Publish to suppliers, Supplier responses. The current page is marked; each step links to its page.
- A step shows "blocked" only when derivable (FUX2-R3): Publish is blocked while publishing is withheld; any step whose page carries a failing Data health check shows the check count. Otherwise show the number, not a status.
- Place it under the title of the 4 Weekly plan pages and on This week.

Menu and links
- `navConfig.ts`: This week becomes the first Weekly plan item. The BUY `performance` section gains End-of-cycle stock check (`/buyer/fs-reconcile`), so Procurement can reach the page where max stock is set (FUX-D6). Confirm the `maxstock:set` notice still gates the action for a seat without the atom, and that `sectionForPath` names the section from the viewer's own menu.
- `forecastPages.ts`: add `thisWeek`; What to order's Uses becomes This week.
- `BuyerHome.tsx`: 1 link to This week for the MP role.
- EN and ID for every string.

## CONSTRAINTS

- Touch only the new page and component, the 4 Weekly plan pages (step bar placement only), `navConfig.ts`, `AppRouter.tsx`, `forecastPages.ts`, `hub.ts`, `BuyerHome.tsx`, their strings files and tests.
- No new hook, store or verb.
- Branch `feat/fux2-B1-this-week`, PR title `feat(fux): B1 "This week" start page and cycle step bar`. Do not merge.

## DONE WHEN

- `npm run gates` passes on Node 22, all 5 gates.
- Tests cover:
  - This week renders the input check and 4 step cards, each linking to its page, with numbers equal to what each page shows for the same data
  - the step bar marks the current page on each of the 4 Weekly plan pages, and shows Publish as blocked while publishing is withheld
  - an MP menu starts with This week; a BUY menu shows End-of-cycle stock check under Performance
  - a seat without `maxstock:set` sees the handoff notice instead of the Set max stock control
- On screen, as a Material Planner, then as Procurement: This week shows the 4 cards and the input check; the step bar shows on the 4 Weekly plan pages; Procurement reaches End-of-cycle stock check from its menu.
- A PR is open per FUX-R9.

## OUTPUT

Report in the phase 2 brief's format, at most 25 lines.

Build the This week page, the step bar, the menu changes and the tests, run the gates and open the PR now.
