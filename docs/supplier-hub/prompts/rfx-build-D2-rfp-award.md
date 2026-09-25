# Prompt: RFx D2 · Award an RFP on firm offers, with cancel and SAP marking

**How to use:** Paste into Claude Code opened at the root of `paragon-supplier-portal`, on an up-to-date `main` with tasks C2 and D1 merged. No slots to fill.
**Target:** paragon-supplier-portal · React 18 + TypeScript strict + Tailwind 3, mock data layer · rules from `portal-fit.md` and `rfx-build-00-brief.md`
**Assumptions made:**
- Decisions D-1 option A, D-2, D-4 and D-7 are accepted (owner, 2026-09-25).
- An RFP award reuses the C1 award record, the C1 shape rule and the C2 cancel and SAP records. Only the item list and the offer lookup differ.
- On an RFP, "item" means an option chosen in a firm-offer round, and "break" means one of that round's quantity points.
- Screens are D3.
- Target model: Claude Opus 5 with thinking on.

---

## CONTEXT

Read `docs/supplier-hub/prompts/rfx-build-00-brief.md` first, and follow RFX-R1 to RFX-R12. Then read, in `docs/supplier-hub/RFX-IMPROVEMENT-REQUIREMENTS-2026-09.md`, NR-2 BR-05 to BR-10, edge cases 2, 4 and 6, and AC-03 to AC-07, and NR-3 BR-01 to BR-12.

Then read these files:
- The C1 award record, `awardShapeRefusal` and `awardItemsOf`; the C2 cancellation, SAP mark and cancel verbs; the D1 round and offer
- `src/services/transitions/flows/rfpEvent.flow.ts`
- The RFP target (`MockCommandService.ts:3010-3062`)
- `src/services/sourcing/rfxPrefill.ts:170-208` (`prefillRfqItemsFromRfp`)
- The RFQ create policy
- `rfxReadModel.ts:426-447`

## OBJECTIVE

Let the buyer award an RFP per option to 1 or more suppliers on their firm offers, partly or fully, with a reason. Let the buyer cancel or mark the award "Raised in SAP" as on an RFQ. Stop an option from being awarded twice through an RFP and an RFQ.

## STANDARD

Record
- Extend the award record's `eventType` with `'rfp'`. An RFP award line names `optionId` and `firmOfferId` in place of an RFQ item and quotation, as a discriminated union on the record's event type. Do not reuse `quotationId` for an offer. [AR-02, NR-2 BR-05]

Items
- Add `awardItemsOfRfp(rfp, rounds, offers)`, which produces items for the options in closed rounds, with the round's quantity points as breaks. Feed it to the existing `awardShapeRefusal`. An offer counts when it is the supplier's latest in a closed round and its `validUntil` has not passed; otherwise the rule refuses `AWARD_OFFER_EXPIRED` or `AWARD_ITEM_NOT_QUOTED`. [RFX-R2, NR-2 BR-01, edge case 2]

Verbs and state
- Add Awarded and Partly awarded to the RFP flow, with `t_rfp_award`, `t_rfp_award_partial`, `t_rfp_award_cancel`, `t_rfp_award_cancel_partial` and `t_rfp_award_sap_raised`. They mirror the C1 and C2 RFQ verbs, their policies and their records. Use new atoms `rfp:award`, `rfp:award-cancel` and `rfp:award-sap` in `procurement`, and pay the invariant bill for the 2 states, 5 verbs and 3 atoms. [NR-3 BR-06, BR-09, BR-10, RFX-R5]
- Every RFP award needs a reason (`AWARD_REASON_REQUIRED`), and CR-23 is checked at award. [NR-2 BR-06, BR-07]

No double award
- The RFP award refuses `AWARD_OPTION_SOURCED_ELSEWHERE` for an option already used by an RFQ created from this RFP. `prefillRfqItemsFromRfp` leaves out options with an active RFP award, and the RFQ create policy refuses such an option by the same function. [NR-2 BR-08, RFX-R2]

Reads
- A supplier sees only its own award lines, and "withdrawn" after a cancel. Add `awardRfp`, `awardRfpPartial`, `cancelRfpAward`, `cancelRfpAwardPartial` and `markRfpAwardSap` to `useRfxCommand`. [RFX-R1, RFX-R4, NR-2 BR-09]

## CONSTRAINTS

- Out of scope: screens (D3), RFI award (RFX-D1 keeps the RFI non-awarding), and email.
- RFQ award behaviour stays unchanged. The C1 and C2 tests pass unchanged.

## DONE WHEN

- `npm run gates` passes on Node 22.
- `src/services/data/mock/rfpAwardCommand.test.ts` covers these cases:
  - awarding option "Set" 60/40 at the 50,000 point on 2 firm offers moves the RFP to Awarded and records option, offers, shares, quantities, point and reason (AC-05)
  - an award without a firm offer on the option is refused naming it (AC-03)
  - an award without a reason is refused (AC-04)
  - an expired offer is refused `AWARD_OFFER_EXPIRED`
  - a partial award, then cancel, returns the RFP to Closed
  - pre-fill leaves out an awarded option, and the RFQ create policy refuses it, while the other options still pass (AC-06)
  - an RFP award is refused for an option already sourced by an RFQ
  - each supplier reads only its own outcome (AC-07)
- A PR is open per RFX-R11.

## OUTPUT

Report in the brief's format, at most 25 lines. Be concise.

Build the RFP award on the shared award model, run the gates and open the PR now.

---

## Notes on design decisions

- The RFP award reuses C1's rule and C2's records through an item adapter. That is the payoff of doing AR-02 and AR-04 first, and 1 rule cannot drift between RFQ and RFP.
- The double-award guard runs in both directions. BR-08 only named RFP → RFQ, but an RFQ already created for an option makes an RFP award of that option the same double placement.
- The offer and quotation ids stay separate in the line type, because reusing `quotationId` for an offer would make every RFQ-side reader believe an RFP line is a quote.
