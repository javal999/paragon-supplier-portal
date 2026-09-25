# Prompt: RFx D1 · Firm-offer round on an RFP (model, verbs, reads)

**How to use:** Paste into Claude Code opened at the root of `paragon-supplier-portal`, on an up-to-date `main` with task A1 merged. No slots to fill.
**Target:** paragon-supplier-portal · React 18 + TypeScript strict + Tailwind 3, mock data layer · rules from `portal-fit.md` and `rfx-build-00-brief.md`
**Assumptions made:**
- Decision D-1 option A is accepted (owner, 2026-09-25). An RFP award rests on firm prices from a firm-offer round inside the RFP. This amends RFX-D4 and CE-10 for those prices only.
- The round and the offer are 2 new entities with their own flows, next to the RFQ negotiation round rather than generalising it. The RFQ round keeps working untouched.
- Screens are D3.
- Target model: Claude Opus 5 with thinking on.

---

## CONTEXT

Read `docs/supplier-hub/prompts/rfx-build-00-brief.md` first, and follow RFX-R1 to RFX-R12. Then read, in `docs/supplier-hub/RFX-IMPROVEMENT-REQUIREMENTS-2026-09.md`, section 5 (NR-2) part a (the options table), buyer steps 2 to 4, supplier steps 2 and 3, BR-01 to BR-04, edge cases 1 to 3 and 5, and AC-01 and AC-02.

Then read these files:
- `src/services/sourcing/types.ts` (`RfpPricingRequest` and `RfpPricingOption` :272-309, `NegotiationRound` :375-387)
- `src/services/transitions/flows/negotiationRound.flow.ts` and its target (`MockCommandService.ts:3132-3170`), the model to follow
- `src/services/transitions/flows/rfpEvent.flow.ts`
- The RFP read in `rfxReadModel.ts:244-268`
- The compliance gate helpers (`rfxReadModel.ts:143`, `src/services/sourcing/complianceGate.ts`)
- `businessRoles.ts` (`procurement` :143-160, supplier `commercial` :335-348)

## OBJECTIVE

Let the buyer open a firm-offer round on a closed RFP for chosen options, quantity points and qualifying suppliers, and let those suppliers submit and revise firm offers with a validity date until the round closes.

## STANDARD

Model
- Add `RfpOfferRound {id, rfpId, roundNumber, optionIds, quantityPoints, invitedSupplierIds, deadline, message?, openedAt}` and `RfpFirmOffer {id, roundId, rfpId, supplierId, prices: {optionId, qty, unitPrice}[], validUntil, documents?, versions, submittedAt}`, each in its own store. Rounds are append-only. Offer versions are appended. [RFX-R3, NR-2 BR-04]

Round verbs
- `rfpOfferRound` flow with states Open and Closed:
  - `t_rfp_round_open` is the creation verb, role `rfp:negotiate` (new atom in `procurement`). Its policy refuses unless the RFP is Closed, the options exist (including supplier-proposed ones), the quantity points are positive, and every invitee submitted a response and passes CR-23.
  - `t_rfp_round_close` has the same role.

  [NR-2 BR-02]

Offer verbs
- `rfpFirmOffer` flow with state Submitted:
  - `t_rfpfirmoffer_submit` is the creation verb, owned by the supplier, atom `rfpfirmoffer:submit` in the supplier `commercial` bundle.
  - `t_rfpfirmoffer_revise` is state-preserving.

  Their policy refuses `ROUND_CLOSED` (closed, or past the deadline), `ROUND_NOT_INVITED`, `OFFER_OUTSIDE_ROUND` (a price for an option or point not in the round), `OFFER_PRICE_INVALID` (not above 0), and `OFFER_VALIDITY_MISSING` (no `validUntil`, or `validUntil` before the round deadline). [NR-2 BR-01, BR-03]

Reads
- Add `getRfpOfferRounds` to `IProcurementService`, with the mock read and a query hook. The buyer reads every round and the last offer per supplier and option. A supplier reads only rounds it is invited to, and only its own offers. Document the method in `docs/contracts/C1-methods.md`. [RFX-R4, RFX-R5]
- Add `openRfpRound`, `closeRfpRound`, `submitFirmOffer` and `reviseFirmOffer` to `useRfxCommand`. [RFX-R1]

Invariants
- Pay the invariant bill for the 2 flows, 4 verbs, 2 atoms and 2 targets, including `WIRED_COMMAND_TARGETS` in `docs/contracts/C1-methods.md`. [RFX-R5]

## CONSTRAINTS

- Out of scope: award (D2), screens and the Firm label rendering (D3), and changes to the RFQ negotiation round.

## DONE WHEN

- `npm run gates` passes on Node 22.
- `src/services/data/mock/rfpOfferRoundCommand.test.ts` covers these cases:
  - opening a round on an Open RFP is refused
  - a round inviting a supplier that failed CR-23 is refused
  - an invited supplier submits and revises a firm offer, and both versions are kept
  - an offer after the deadline is refused `ROUND_CLOSED`
  - an offer for an option outside the round is refused `OFFER_OUTSIDE_ROUND`
  - a missing validity is refused
  - supplier A cannot read supplier B's offer (AC-01)
- A PR is open per RFX-R11.

## OUTPUT

Report in the brief's format, at most 25 lines. Be concise.

Build the round and the firm offer, run the gates and open the PR now.

---

## Notes on design decisions

- The round is new rather than a generalised `NegotiationRound`. That round is keyed by `rfqId` and re-prices quotes per item and break, while an RFP round prices options at quantity points. Generalising it would touch the whole RFQ negotiation path for no RFQ benefit.
- `validUntil` must reach past the round deadline, so an offer cannot expire before the buyer can award it (edge case 2).
- D1 needs only A1, so it can run beside C1 and C2. D2 joins them.
