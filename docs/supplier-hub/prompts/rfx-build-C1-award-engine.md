# Prompt: RFx C1 · One item-based award rule, partial award, and a general award record

**How to use:** Paste into Claude Code opened at the root of `paragon-supplier-portal`, on an up-to-date `main` with task A1 merged. No slots to fill.
**Target:** paragon-supplier-portal · React 18 + TypeScript strict + Tailwind 3, mock data layer · rules from `portal-fit.md` and `rfx-build-00-brief.md`
**Assumptions made:**
- Decisions D-2 (split by % or quantity) and D-4 (partial award, a break per item) are accepted (owner, 2026-09-25).
- A legacy (untiered) RFQ is modelled as its line items, each with 1 break equal to the line's quantity (or the RFQ's total quantity when it has no lines).
- Screens change only as far as they must to keep working. The new award panel is C3.
- Cancel and "Raised in SAP" are C2. Awarded stays final in this task.
- Target model: Claude Opus 5 with thinking on.

---

## CONTEXT

Read `docs/supplier-hub/prompts/rfx-build-00-brief.md` first, and follow RFX-R1 to RFX-R12. Then read findings AR-02 and AR-04 in `docs/supplier-hub/RFX-BUILD-PLAN-2026-09.md`, and, in `docs/supplier-hub/RFX-IMPROVEMENT-REQUIREMENTS-2026-09.md`, section 6 (NR-3) BR-01 to BR-08, edge cases 1 to 3 and 6, and AC-01 to AC-04.

Then read these files:
- `src/services/sourcing/types.ts:391-433` (`AwardLine`, `AwardRecord`)
- `src/services/sourcing/rfqComparison.ts:300-460` (`tieredAwardShapeRefusal`, `buildTieredAwardLines`, `awardQuantity`, `itemsDepartingBestScore`)
- `src/services/transitions/rfxRules.ts:620-680` (`awardSplitRefusal`, `awardFollowsBestScore`)
- The award policy and award apply in `MockCommandService.ts` (:3490-3559, :1453-1502)
- The award cascade (:4451-4479, `cascades.ts:72-75`)
- `src/services/transitions/flows/rfq.flow.ts`
- `rfxReadModel.ts:426-447` (`awardViews`)
- The award seeds (`AWARD_SEED` in `fixtures/rfxHub.ts`, `RFQ_SAMPLE_AWARD_SEED` in `fixtures/rfqSamples.ts`)
- The legacy award form's line builder (`BuyerSourcingEvent.tsx:231-245`)

## OBJECTIVE

Replace the 2 award rules with 1 item-based rule that supports percentage or quantity splits, a break per item and partial award. Add the Partly awarded state, and generalise the award record to name its event type and id.

## STANDARD

Record
- Generalise `AwardRecord`: replace `rfqId` with `eventType: 'rfq'` and `eventId`, with the RFP arm left for D2. Migrate the 2 seeds, `awardViews` and every reader. On `AwardLine`, add `splitBasis: 'pct' | 'qty'` and make `awardTierQty` per line. [AR-02, NR-3 BR-02, BR-04]

Rule
- Write 1 pure `awardShapeRefusal(items, lines, quotes)` over an item list that both RFQ kinds produce (`awardItemsOf(rfq)`), and delete `awardSplitRefusal` and `tieredAwardShapeRefusal` once nothing calls them. [AR-04, RFX-R2]
- Its refusals: `AWARD_EMPTY`, `AWARD_ITEM_UNKNOWN`, `AWARD_TIER_UNKNOWN` (a line's break is not one of its item's breaks, or 1 item's lines use different breaks), `AWARD_SHARE_INVALID`, `AWARD_QTY_INVALID`, `AWARD_SPLIT_INCOMPLETE` (an awarded item's quantities differ from its break quantity by more than 1 unit, or its shares from 100% by more than 0.01), `AWARD_ITEM_NOT_QUOTED`, `AWARD_QTY_NOT_DERIVED` (the derived side does not match the typed side), and `AWARD_ITEM_ALREADY_AWARDED`. An item with no lines is "not awarded now". [NR-3 BR-02 to BR-05]

Verbs and state
- Add the Partly awarded state to the RFQ flow. `t_rfq_award` (to Awarded) must leave every item either awarded (in this or an earlier award) or listed in the payload's `notAwardedItems` ("Will not award"); otherwise it refuses `AWARD_ITEMS_OPEN`. Add `t_rfq_award_partial` (Open, Closed or Partly awarded, to Partly awarded), which refuses `AWARD_NOTHING_OPEN` when it would settle every item. Allow `t_rfq_award` from Partly awarded too. Both verbs use the `rfq:award` role and 1 policy. Add `awardPartial` beside `award` in `useRfxCommand`, and pay the invariant bill for the new state and verb. [NR-3 BR-06, RFX-R1, RFX-R5]
- Keep the CR-23 gate, the "quote on this event" check, and the reason rule, applied per awarded item at that item's break. [NR-3 BR-08]

Cascade
- A partial award marks only its named quotes Awarded and rejects none, skipping quotes that are already Awarded. The final award rejects every quote not named in any award of the event. [AR-06 groundwork]

Keeping the screens working
- The legacy event-page form applies each supplier's share to every line item, which is today's event-level meaning. `useRfqAward`'s single-winner payload becomes 1 line per item at 100% on the server. [RFX-R9]

## CONSTRAINTS

- Out of scope: the new award panel and the removal of `useRfqAward` (C3), cancel and SAP marking (C2), RFP award (D2), and optimisation (BL-90).
- Existing award behaviour on the 5 sample RFQs must be unchanged. `sup007OsloAward.test.ts` and `rfqCompareAward.test.ts` pass unchanged.

## DONE WHEN

- `npm run gates` passes on Node 22.
- `src/services/sourcing/awardShape.test.ts` fires and passes each refusal code above, including the 60,000 + 45,000 on 100,000 case (edge case 1) and 33.33% × 3 within tolerance (edge case 2).
- `src/services/data/mock/rfqPartialAwardCommand.test.ts` covers these cases:
  - item 1 at the 10K break and item 2 at the 50K break in 1 award (AC-01 with 1 item by quantity)
  - a partial award to Partly awarded, then a final award to Awarded (AC-03), with quotes rejected only at the final award
  - a legacy RFQ with 2 line items split 60/40 across both lines
  - `t_rfq_award` refused `AWARD_ITEMS_OPEN` while an item is open
- A PR is open per RFX-R11.

## OUTPUT

Report in the brief's format, at most 25 lines. Be concise.

Build the rule, the state, the verbs and the migration, run the gates and open the PR now.

---

## Notes on design decisions

- Partial and final award are 2 verbs because a transition has 1 target state in this schema. 1 policy serves both, so the rule cannot drift between them.
- "Will not award" rides on the final award's payload rather than a third verb, because it only matters at the moment the event is settled.
- Rejecting losers only at the final award keeps a supplier's quote alive for items still open. Otherwise a partial award would reject a supplier who might still win item 3.
- The record is generalised here rather than in D2, so the RFP award in D2 reuses it instead of adding a parallel one (AR-02).
- The legacy form keeps today's event-level meaning through a small line-builder change. The real per-line panel is C3, which keeps this PR reviewable.
- STANDARD holds 7 instructions. With the brief's 12, that is 19, under the 20-rule cap. The instructions are grouped by layer so none is buried.
