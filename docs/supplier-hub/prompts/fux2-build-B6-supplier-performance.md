# Prompt: Forecast UX phase 2 B6 · Supplier performance

**How to use:** Paste into Claude Code opened at the root of `paragon-supplier-portal`, on an up-to-date `main`. Wave 1, runs in parallel with B1. No slots to fill.
**Target:** paragon-supplier-portal · React 19 + TypeScript (forecast pages stay TypeScript) + Tailwind 3, mock data layer · rules from `portal-fit.md`, `fux-build-00-brief.md` and `fux2-build-00-brief.md`
**Assumptions made:**
- FUX-D5: no calculation changes. Only names, headers and explanatory text.
- The scorecard page serves both MP (Review) and BUY (Performance), so its purpose header must read correctly for both.
- Target model: Claude Opus 5 with thinking on.

---

## CONTEXT

Read `docs/supplier-hub/prompts/fux2-build-00-brief.md` first, then `fux-build-00-brief.md`. Follow FUX-R1 to FUX-R10 and FUX2-R1 to FUX2-R4. Then read these:
- Finding F-11 in the evaluation, and the A4 gap noted in the phase 2 brief (scorecard has no purpose header and still shows the old "SAMPLE DATA" label).
- `src/pages-v2/BuyerScorecard.tsx` and its test, `src/lib/i18n/performance.ts` (`perf.cfot` and its definitions near :62-76).
- `src/pages-v2/BuyerReliability.tsx` and its test, `src/lib/i18n/reliability.ts` (`rel.kpi.cfot` near :24, windows near :13-14).
- `forecastPages.ts` (the `performance` link target) and `PurposeHeader.tsx`.

## OBJECTIVE

Make Supplier scorecard read as the one supplier-evaluation page, and rename Supplier reliability's look-alike measure so the 2 numbers are never mistaken for each other.

## STANDARD

Supplier scorecard
- Add `PurposeHeader` (Decision: which suppliers to follow up this month; Uses: Supplier responses; Next: Forecast quality), `SimulatedDataBanner` in place of the old label, and `DataAsOf`.
- Under "Delivered on the confirmed date", 1 line stating the basis: "By quantity, per order, last <30|90> days."
- 1 link "Plan-change measures behind the weekly plan → Supplier reliability".

Supplier reliability
- Rename `rel.kpi.cfot` to "Confirmed-date lines delivered" · "Baris tepat tanggal konfirmasi", with the basis line "By PO line, last <13|26> weeks."
- Its purpose header's Next or Uses points to Supplier scorecard as the evaluation page.

Names
- No other page may show "Delivered on the confirmed date" for the reliability measure. Grep the strings files and the glossary.
- EN and ID for every string.

## CONSTRAINTS

- Touch only `BuyerScorecard.tsx`, `BuyerReliability.tsx`, `performance.ts`, `reliability.ts`, the glossary entry if one exists, and their tests. `forecastPages.ts` only if the `performance` target needs a title key.
- No change to how either measure is calculated.
- Branch `feat/fux2-B6-supplier-performance`, PR title `feat(fux): B6 supplier performance page and reliability measure names`. Do not merge.

## DONE WHEN

- `npm run gates` passes on Node 22, all 5 gates.
- Tests cover:
  - the scorecard renders `PurposeHeader` and `SimulatedDataBanner`, and no "SAMPLE DATA" label
  - the scorecard shows the basis line for the selected period
  - Supplier reliability's measure renders under its new name in EN and ID, and the string "Delivered on the confirmed date" does not appear on that page
- On screen, as a Material Planner and as Procurement: the scorecard shows its header, banner and basis line for both roles; Supplier reliability shows the renamed measure.
- A PR is open per FUX-R9.

## OUTPUT

Report in the phase 2 brief's format, at most 25 lines.

Add the scorecard header and basis line, rename the reliability measure, update the tests, run the gates and open the PR now.
