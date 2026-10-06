# Prompt: Material B4 · Compliance on the award panel, one reason rule

**How to use:** Paste into Claude Code opened at the root of `paragon-supplier-portal`, on an up-to-date `main` with B3 merged. No slots to fill.
**Target:** paragon-supplier-portal · React 18 + TypeScript strict + Tailwind 3, mock data layer · rules from `portal-fit.md` and `mat-build-00-brief.md`
**Assumptions made:**
- MR-2 BR-06 and BR-07 are accepted (owner, 2026-09-29): a red flag needs a reason and never blocks by itself.
- An RFP award already always needs a reason, so on an RFP this task adds only the pill and the snapshot.
- Target model: Claude Opus 5 with thinking on.

---

## CONTEXT

Read `docs/supplier-hub/prompts/mat-build-00-brief.md` first, and follow MAT-R1 to MAT-R15. Then read these:
- In the plan: AR-10.
- In the requirements: MR-2 section d steps 4 and 5, BR-06, BR-07, AC-04 and AC-05.

Then read these files:
- `src/services/sourcing/awardShape.ts` (`AwardRefusalCode` :184, `awardRefusalText` :214, `awardShapeRefusal` :333, `awardItemsDepartingBest` :427)
- `src/pages-v2/rfx/AwardPanel.tsx:200, 302, 429-430, 686-740`
- `MockCommandService.ts:4031-4040` (RFQ reason) and `:4153-4156` (RFP reason)
- the award record writes at `:1537` (RFQ) and `:3203` (RFP), and the `bestScoredByItem` snapshot pattern
- B3's `updateCompliance`

## OBJECTIVE

Show each bidder's update compliance on the award panel, and require a reason when a red-flagged supplier gets any share. The rule is written once and used by the panel and both verbs.

## STANDARD

One rule
- Add `awardReasonOwed(items, lines, bestOf, {always, flagged})` in `awardShape.ts`.
- It returns the items that need a reason, and why: `departsBest`, `always` or `complianceFlag`.
- The panel (`AwardPanel.tsx:429-430`), the RFQ hook and the RFP hook all call it, and the 3 hand-written versions are removed. [AR-10, MAT-R2]

Refusal
- Add `AWARD_REASON_COMPLIANCE_FLAG` to `AwardRefusalCode`, with EN and ID text.
- A flagged supplier = compliance below `compliance.flagPct`. "No history" is never flagged.

Panel
- Each bid row shows a pill:
  - plain at or above `warnPct`
  - amber below `warnPct`
  - red below `flagPct`
  - grey "No history"
- The pill has a tooltip with the percentage and the 13-week definition. [MR-2 section d]

Snapshot
- `RfqAwardRecord` and `RfpAwardRecord` gain `complianceAtAward: {supplierId, pct | null}[]`, written at award time. [MR-2 BR-06, AC-05]

Never block
- A flag adds only the reason requirement. CR-23 is unchanged. [MR-2 BR-07]

## CONSTRAINTS

- Out of scope: qualification refusals (G2).
- No change to scoring weights.

## DONE WHEN

- `npm run gates` passes on Node 22.
- Tests cover:
  - an RFQ award giving a share to a supplier at 59% without a reason is refused by the verb (AC-04)
  - the same award with a reason passes and stores `complianceAtAward` (AC-05)
  - a supplier at 79% needs no reason
  - "No history" needs no reason
  - an RFP award stores the snapshot
  - the panel pre-check and the verb agree on 1 shared fixture
- Existing award tests pass. Any assertion changed because the reason rule moved is listed in the PR.
- A PR is open per MAT-R11.

## OUTPUT

Report in the brief's format, at most 25 lines.

Build the shared rule, refusal, pill, snapshot and tests, run the gates and open the PR now.
