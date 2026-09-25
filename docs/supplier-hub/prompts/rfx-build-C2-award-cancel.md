# Prompt: RFx C2 · Cancel an award, "Raised in SAP", and quote reinstatement

**How to use:** Paste into Claude Code opened at the root of `paragon-supplier-portal`, on an up-to-date `main` with task C1 merged. No slots to fill.
**Target:** paragon-supplier-portal · React 18 + TypeScript strict + Tailwind 3, mock data layer · rules from `portal-fit.md` and `rfx-build-00-brief.md`
**Assumptions made:**
- Decision D-7 is accepted (owner, 2026-09-25): an award can be cancelled with a reason until it is marked "Raised in SAP".
- Cancel acts on 1 award record. An event with more than 1 active award (after partial awards) keeps the others.
- Screens are C3. This task shows the supplier's "Award withdrawn" only through the read model.
- Target model: Claude Opus 5 with thinking on.

---

## CONTEXT

Read `docs/supplier-hub/prompts/rfx-build-00-brief.md` first, and follow RFX-R1 to RFX-R12. Then read findings AR-06 and AR-08 in `docs/supplier-hub/RFX-BUILD-PLAN-2026-09.md`, and, in `docs/supplier-hub/RFX-IMPROVEMENT-REQUIREMENTS-2026-09.md`, NR-3 BR-09 to BR-12, edge case 4, AC-05 to AC-07, and finding F-04.

Then read these files:
- The C1 award record and verbs, `rfq.flow.ts`, and `quotation.flow.ts` (Awarded and Rejected are final, :25)
- `cascades.ts:72-75` and the cascade resolver (`MockCommandService.ts:4328-4482`)
- `AUTOMATION_ATOMS` in `businessRoles.ts:557`
- `rfxStores.ts` (`awardStore` :72)
- `rfxReadModel.ts:426-447`
- `docs/contracts/C3-events.md:120-133`, for how the award cascade is recorded

## OBJECTIVE

Let the buyer cancel an award with a reason until it is marked "Raised in SAP" with the SAP document number, return the affected quotes to Under Review, and show the supplier that its award was withdrawn.

## STANDARD

Records
- Record a cancellation as a new appended `AwardCancellation {id, awardId, cancelledAt, reason, by}`, and a SAP marking as a new appended `AwardSapMark {id, awardId, sapDocumentNo, markedAt, by}`, each in its own append-only store. Never edit an `AwardRecord`. The read model derives each award's status (Active, Cancelled, Raised in SAP). [RFX-R3, AR-08, NR-3 BR-11]

Verbs
- `t_rfq_award_cancel` goes Awarded or Partly awarded → Closed, when no other active award remains.
- `t_rfq_award_cancel_partial` goes Awarded or Partly awarded → Partly awarded, when another active award remains.
- `t_rfq_award_sap_raised` is state-preserving and requires `sapDocumentNo`.
- 1 policy per verb pair refuses:
  - `AWARD_NOT_ACTIVE`
  - `AWARD_RAISED_IN_SAP`, which blocks cancelling after the SAP marking
  - `AWARD_REASON_REQUIRED` for a blank reason
  - `AWARD_CANCEL_TARGET_WRONG`, for the wrong one of the pair

  The RFQ is no longer final at Awarded. [NR-3 BR-09, BR-10]

Roles
- Add the `rfq:award-cancel` and `rfq:award-sap` atoms to the `procurement` bundle. [RFX-R5]

Cascade
- Add `t_quotation_reinstate` (Awarded or Rejected → Under Review, trigger cascade, atom in `AUTOMATION_ATOMS`). Link it from both cancel verbs to the quotes named in the cancelled award. When the cancelled award was the final one, also link it to the quotes that award rejected. [AR-06]

Supplier read
- In `awardViews`, a supplier sees a cancelled award as "withdrawn" with its date, only for itself, and never another supplier's lines. [RFX-R4, NR-3 BR-12]

Invariants
- Pay the invariant bill for the 4 verbs, the 2 stores and the new C1 read methods, if any. [RFX-R5]

## CONSTRAINTS

- Out of scope: screens (C3), RFP awards (D2), and any SAP interface. The SAP document number is typed by the buyer.

## DONE WHEN

- `npm run gates` passes on Node 22.
- `src/services/data/mock/rfqAwardCancelCommand.test.ts` covers these cases:
  - cancelling the only award returns the RFQ to Closed, keeps the award record, and returns the named and rejected quotes to Under Review (AC-05)
  - cancelling 1 of 2 partial awards leaves the RFQ Partly awarded
  - cancel after "Raised in SAP" is refused `AWARD_RAISED_IN_SAP` (AC-06)
  - a blank reason is refused
  - the supplier read shows "withdrawn" for its own cancelled award and nothing of the other supplier's (AC-07)
  - a new award after a cancel succeeds
- `cascadeIntegrity.test.ts` and `businessRoles.test.ts` pass with the new links and atoms.
- A PR is open per RFX-R11.

## OUTPUT

Report in the brief's format, at most 25 lines. Be concise.

Build the verbs, records, cascade and tests, run the gates and open the PR now.

---

## Notes on design decisions

- Cancellations and SAP marks are appended records, so the trail keeps what was awarded and why it was withdrawn. Editing the award would erase the thing the charter's audit-trail target asks for.
- Cancel is a verb pair for the same reason C1's award is: 1 target state per transition.
- Reinstatement is a cascade under the automation grant, the mirror of the award cascade (`C3-events.md`), so no person holds a quote-reinstating atom.
- The atoms for cancel and SAP marking are separate from `rfq:award`. Procurement can then split who awards from who corrects without a new role (D-5).
