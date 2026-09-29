# Prompt: Material B3 · Update compliance and the performance score

**How to use:** Paste into Claude Code opened at the root of `paragon-supplier-portal`, on an up-to-date `main` with B1 merged. No slots to fill.
**Target:** paragon-supplier-portal · React 18 + TypeScript strict + Tailwind 3, mock data layer · rules from `portal-fit.md` and `mat-build-00-brief.md`
**Assumptions made:**
- MAT-D7 and MAT-D9 are accepted (owner, 2026-09-29): all materials or the week fails; weight 0.10, fixed at release.
- Compliance always uses a rolling 13 weeks, whatever the page's period (30d, 90d, ytd).
- Target model: Claude Opus 5 with thinking on.

---

## CONTEXT

Read `docs/supplier-hub/prompts/mat-build-00-brief.md` first, and follow MAT-R1 to MAT-R15. Then read these:
- In the plan: AR-09.
- In the requirements: MR-2 BR-01 to BR-05, sections d and f, edge cases 1 to 5, and AC-01 to AC-03.

Then read these files:
- `src/services/data/performanceRules.ts:83, 300-385`
- `src/services/data/mock/supplierMeasureReadModel.ts` (`:15`, `:18`, `:60-70`, `supplierMeasure` `:329`)
- `src/pages-v2/performance/performanceDisplay.ts:60-80`
- `rfxReadModel.ts:97, 105` (`masterMeasure` feeds CR-23 and CR-15)
- `src/pages-v2/SupplierPerformance.tsx` and `src/pages-v2/BuyerScorecard.tsx`
- B1's `cycleStatus`

## OBJECTIVE

Measure each supplier's weekly update discipline over 13 weeks and blend it into the performance score, on one calculation path.

## STANDARD

Compliance
- Pure `updateCompliance(supplierId, asOf, weeks = 13)` → `{pct: number | null, weeks: {cycle, state: 'compliant' | 'missed' | 'notCounted'}[]}`.
- Manual week: compliant when every counted material is `updated`.
- API week: compliant when there is at least 1 successful pull on every working day of the cycle.
- The first 4 weeks after the first material assignment are `notCounted`. With fewer than 4 weeks counted, `pct` is null ("No history").
- A mode change is judged per week, by the mode at that week's cutoff. [MR-2 BR-01 to BR-03]

Score
- `assessmentScore(otif, cfot, rejections, compliancePct)` = (1 − w) × today's score + w × compliancePct, with w = `compliance.scoreWeight`. With null compliance, w = 0.
- Compute compliance once in `supplierMeasure`, and pass it on both paths: the mock read model and `performanceDisplay.ts`. [AR-09, MR-2 BR-05]

Screens
- Supplier performance and the buyer scorecard show "Update compliance <pct>%" and a 13-week strip (green, red, grey), with a one-line definition.
- The supplier sees only its own figure (MAT-R4).
- EN and ID for every string.

Grade movement
- The PR description lists every fixture supplier whose grade or CR-23 gate result changes, with before and after. [MR-2 edge case 5]

## FLIPS

- A3 left a placeholder `FLIPS` row in `hubSettings.bl32.test.ts` for each setting key this task reads: it checks only the value in force. Replace each of your keys' rows with a real rule outcome that flips when the setting changes.

## CONSTRAINTS

- Out of scope: award panel changes (B4).
- `GRADE_BANDS` are unchanged.

## DONE WHEN

- `npm run gates` passes on Node 22.
- `updateCompliance.test.ts` covers:
  - 1 missing material makes the week red (AC-01)
  - a supplier onboarded 3 weeks ago reads "No history" (AC-02)
  - an API week with 1 working day without a successful pull is missed
- A test covers weight 0.10, score 90 and compliance 50% giving 86 (AC-03).
- A test proves both calculation paths give the same score for 1 supplier.
- A PR is open per MAT-R11.

## OUTPUT

Report in the brief's format, at most 25 lines, plus the grade-movement list.

Build the compliance rule, the score change on both paths, the screens and tests, run the gates and open the PR now.
