# Prompt: Forecast UX phase 2 B4 · Warehouse room decision

**How to use:** Paste into Claude Code opened at the root of `paragon-supplier-portal`, on an up-to-date `main` (waves 1 and 2 merged, B3 included). Wave 3. No slots to fill.
**Target:** paragon-supplier-portal · React 19 + TypeScript (forecast pages stay TypeScript) + Tailwind 3, mock data layer · rules from `portal-fit.md`, `fux-build-00-brief.md` and `fux2-build-00-brief.md`
**Assumptions made:**
- FUX-D3: this task may add 1 flow, 1 append-only store, 1 `CommandTarget` and 1 policy hook. It follows MAT-R1 to MAT-R5 and MAT-R13 from the material build brief.
- The saved choice is a planner's record of intent. It changes no order and is never sent to SAP or a supplier; the page says so.
- Target model: Claude Opus 5 with thinking on.

---

## CONTEXT

Read `docs/supplier-hub/prompts/fux2-build-00-brief.md` first, then `fux-build-00-brief.md`. Follow FUX-R1 to FUX-R10 and FUX2-R1 to FUX2-R4, and for this task only, the verb rules MAT-R1 to MAT-R5 and MAT-R13 in `docs/supplier-hub/prompts/mat-build-00-brief.md` in place of FUX-R1. Then read these:
- Findings F-10 and F-22 in the evaluation, and FUX-D3 in the phase 2 brief.
- `src/pages-v2/BuyerOrderPlan.tsx` (the "Weeks that do not fit" card near the `op.short.*` strings, around :215-240) and `src/lib/i18n/orderPlan.ts` (`op.short.*`, including the sentence near :137 that says the choice is not saved).
- `src/pages-v2/BuyerReschedule.tsx`, its strings and tests.
- The forecast override verb as the pattern to copy: `t_forecastoverride_record`, its target module `src/services/data/mock/targets/forecastOverride.ts`, its flow, policy hook, command hook and tests. It is an append-only, planner-recorded verb in the same forecast area.

## OBJECTIVE

Make a planner's choice for a week that does not fit the warehouse a recorded decision on Make warehouse room, instead of an unsaved choice on What to order.

## STANDARD

Verb
- New flow for a warehouse-week decision, `statePreserving`, with an append-only ledger: each record holds stream, week, choice (rent space, push out orders, reduce orders, accept the overflow), an optional note (required for "accept"), the plan version it was made against, and the time. The latest record for a week is the one in force; earlier ones stay.
- Atom in the Material Planning bundle. Policy hook refuses an unknown choice and a missing note for "accept", each with a named refusal code. Pay every item of the MAT-R5 invariant bill.
- Target in its own module under `src/services/data/mock/targets/` (MAT-R13). Pages dispatch through a command hook.

Make warehouse room
- The "Weeks that do not fit" card moves here, above the proposals, with the choice control and the saved choice per week ("Decided: rent space, 5 Oct, against version 3").
- A decision made against an older plan version shows as "made on an older plan: review".
- `useVerbAvailability` gates the control; a seat without the atom sees `HandoffNotice`.

What to order
- Remove the card and the sentence that says the choice is not saved. Leave 1 line: "<n> weeks do not fit. Decide on Make warehouse room." with a link.
- EN and ID for every string.

## CONSTRAINTS

- Touch only the new flow, target module, hook, the files the MAT-R5 bill names, `BuyerReschedule.tsx`, `BuyerOrderPlan.tsx` (card removal only), their strings and tests.
- The decision changes no order, no call-off and no engine result.
- Branch `feat/fux2-B4-warehouse-decision`, PR title `feat(fux): B4 warehouse room decision saved`. Do not merge.

## DONE WHEN

- `npm run gates` passes on Node 22, all 5 gates.
- Tests cover:
  - recording each choice appends a record and the page shows it as in force; an earlier record stays in the ledger
  - an unknown choice and an "accept" without a note are refused by the verb with their codes (1 firing and 1 passing test each)
  - a seat without the atom sees the handoff notice, not the control
  - a decision made against an older plan version shows the review marker
  - What to order shows the count line and no choice control
- On screen, as a Material Planner: a decision can be recorded on Make warehouse room and survives a reload of the page within the session; What to order shows only the count line.
- A PR is open per FUX-R9.

## OUTPUT

Report in the phase 2 brief's format, at most 25 lines.

Build the verb, move the card, record and show decisions, update the tests, run the gates and open the PR now.
