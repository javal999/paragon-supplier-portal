# Prompt: Forecast UX phase 3 C2 · Accessibility and narrow screens

**How to use:** Paste into Claude Code opened at the root of `paragon-supplier-portal`, on an up-to-date `main`. Runs in parallel with C1. No slots to fill.
**Target:** paragon-supplier-portal · React 19 + TypeScript (forecast pages stay TypeScript) + Tailwind 3, mock data layer · rules from `portal-fit.md` and the 3 forecast UX briefs
**Assumptions made:**
- The standard is WCAG 2.1 AA.
- Narrow screens means a tablet at 768 px and a phone at 390 px. Planners work on laptops, so the phone pass makes pages readable, not redesigned.
- Target model: Claude Opus 5 with thinking on.

---

## CONTEXT

Read `docs/supplier-hub/prompts/fux3-build-00-brief.md` first, then `fux2-build-00-brief.md` and `fux-build-00-brief.md`. Follow FUX-R1 to FUX-R10, FUX2-R1 to FUX2-R4 and FUX3-R1 to FUX3-R3. Then read these:
- `src/components/forecast/forecastPages.ts` for the 13 pages, and `src/components/forecast/` for the shared parts every page uses (`PurposeHeader`, `SimulatedDataBanner`, `CycleSteps`, `DataHealthChip`, `TermTip`, `AboutThisPage`, `WhyQuantityPanel`).
- The DP-1 to DP-3 design principles in `CLAUDE.md`, including the warning-colour rule (`text-warning-hover` for text, never `text-warning`).

## OBJECTIVE

Make the 13 forecast pages usable by keyboard and screen reader, and readable at 768 and 390 px, and record what was found and fixed.

## STANDARD

Audit first, then fix. Cover all 13 pages and the shared parts.

Check
- Keyboard: every control reachable by Tab in reading order, a visible focus ring, no trap. Tabs (Publish, Forecast quality) work with arrow keys. The step bar, tooltips (`TermTip`), "About this page" and the Why this quantity panel open and close by keyboard.
- Screen reader: page has one `h1`; headings in order; the step bar marks the current step with `aria-current="step"`; disabled acts say why (for example the disabled Mark as taken to SAP); status chips are not colour-only; tables have header cells; form fields have labels.
- Contrast: text at least 4.5:1, large text and non-text indicators at least 3:1, using the design tokens.
- Narrow screens: at 768 and 390 px no page scrolls sideways except inside a table's own scroll area; the step bar, purpose header and banner wrap; buttons stay at least 44 by 44 px on touch.

Fix
- Fix every issue you find in the shared parts first, then per page.
- Record each finding in a new file `docs/supplier-hub/research/FORECAST-UX-ACCESSIBILITY-2026-10.md`: page, issue, WCAG criterion, severity (Blocker: a task cannot be done by keyboard or screen reader; Major: it can, with difficulty; Minor: friction), fixed or not, and why not. At most 40 words per finding.

## CONSTRAINTS

- Touch only the forecast components, the 13 pages, their strings files, their tests and the new findings file.
- No figure, verb, flow or engine change (FUX3-R3).
- Branch `feat/fux3-C2-accessibility`, PR title `feat(fux): C2 accessibility and narrow screens`. Do not merge.

## DONE WHEN

- `npm run gates` passes on Node 22, all 5 gates.
- Tests cover:
  - the step bar's `aria-current`, the tabs' arrow-key behaviour, and the panel's focus handling
  - each disabled act exposes its reason to a screen reader
  - at least one page renders without horizontal page overflow at 390 px
- On screen: each of the 13 pages walked by keyboard at 1440 px, and checked at 768 and 390 px.
- The findings file lists every issue found, each marked fixed or not.
- A PR is open per FUX-R9.

## OUTPUT

Report in the phase 3 brief's format, at most 25 lines, with the count of findings by severity and how many were fixed.

Audit the 13 pages, fix what you find, write the findings file, update the tests, run the gates and open the PR now.
