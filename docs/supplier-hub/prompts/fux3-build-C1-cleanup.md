# Prompt: Forecast UX phase 3 C1 · Clean-up

**How to use:** Paste into Claude Code opened at the root of `paragon-supplier-portal`, on an up-to-date `main`. Runs in parallel with C2. No slots to fill.
**Target:** paragon-supplier-portal · React 19 + TypeScript (forecast pages stay TypeScript) + Tailwind 3, mock data layer · rules from `portal-fit.md` and the 3 forecast UX briefs
**Assumptions made:**
- The leftovers listed below are the starting point, not the full set (FUX3-R1).
- Target model: Claude Opus 5 with thinking on.

---

## CONTEXT

Read `docs/supplier-hub/prompts/fux3-build-00-brief.md` first, then `fux2-build-00-brief.md` and `fux-build-00-brief.md`. Follow FUX-R1 to FUX-R10, FUX2-R1 to FUX2-R4 and FUX3-R1 to FUX3-R3. Then read these:
- The "Phase 2 status" section of `fux2-build-00-brief.md` and section 10 of `docs/supplier-hub/research/FORECAST-UX-EVALUATION-2026-10.md`.
- `src/lib/i18n/forecastUx.ts`, `src/lib/i18n/hub.ts`, `src/components/forecast/` and `src/components/layout-v2/navConfig.ts`.
- `src/components/forecast/WhyQuantityPanel.tsx` and `src/pages-v2/BuyerOrderPlan.tsx`.

## OBJECTIVE

Remove what phases 1 and 2 left unused, and make the Why this quantity panel readable at narrow widths.

## STANDARD

Unused strings and keys
- Known leftovers: `fux.purpose.forecastBias` (Forecast bias became a tab), `hub.nav.pti.engine.publishedVersions` and `hub.nav.pti.engine.forecastBias` (both left the user menu). Two tests assert these menu keys are absent from the menu; keep those assertions working by checking against the literal key, not by importing it.
- Derive the full set: every key in `forecastUx.ts`, `hub.ts` and the strings files of the 13 forecast pages that no source file reads. Include keys read through template literals (for example `` t(`fux.thisWeek.card.${id}`) ``) as read. Report the derived list before deleting, then remove each key from both the `En` and `Id` exports.
- Prove the derivation both ways: a key you know is read must be found, and a key you know is unused must be reported.

Why this quantity panel
- At 1024 px and below, the panel's 3 blocks must all be visible without scrolling the order table sideways. Stack the blocks vertically below a width that fits, and keep the panel inside the visible width of the table's scroll area.
- Keyboard behaviour stays as built: focus moves into the panel on open and back to the row's button on close.

B4 follow-ups
- Read the B4 notes in the phase 2 status. If any of them names something left undone that sits inside this task's files, do it; otherwise list it in the report without changing it.

## CONSTRAINTS

- Touch only the strings files, the forecast components, `navConfig.ts` if a key reference must change, and their tests.
- Branch `feat/fux3-C1-cleanup`, PR title `feat(fux): C1 clean-up after phases 1 and 2`. Do not merge.

## DONE WHEN

- `npm run gates` passes on Node 22, all 5 gates.
- Tests cover:
  - the derived unused keys are gone from both locales, and a known-used key is still present
  - the panel's 3 blocks render inside the table's visible width at 1024 and 768 px
- On screen, as a Material Planner: What to order at 1440, 1024 and 768 px with the panel open; the user menu; Forecast quality.
- A PR is open per FUX-R9.

## OUTPUT

Report in the phase 3 brief's format, at most 25 lines, including the derived key list.

Derive and remove the unused keys, fix the panel layout, update the tests, run the gates and open the PR now.
