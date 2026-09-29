# Prompt: Material G2 · Sourcing type and bidding eligibility

**How to use:** Paste into Claude Code opened at the root of `paragon-supplier-portal`, on an up-to-date `main` with G1 merged. No slots to fill.
**Target:** paragon-supplier-portal · React 18 + TypeScript strict + Tailwind 3, mock data layer · rules from `portal-fit.md` and `mat-build-00-brief.md`
**Assumptions made:**
- MAT-D13 and MAT-D14 are accepted (owner, 2026-09-29):
  - the sourcing type is derived from the category, and never typed per event
  - a vendor that drops a level mid-event can respond, but cannot be awarded
- Every current purchasing group (101 to 104) and `RFQCategory` value maps to Direct until Procurement adds Indirect categories.
- Target model: Claude Opus 5 with thinking on.

---

## CONTEXT

Read `docs/supplier-hub/prompts/mat-build-00-brief.md` first, and follow MAT-R1 to MAT-R15. Then read these:
- In the plan: AR-16 and AR-17.
- In the requirements: MR-10 section d (buyer steps), BR-05 to BR-07, edge cases 1 and 4, AC-03 to AC-05.

Then read these files:
- `rfxRules.ts:56-60, 107-117` and `rfxReadModel.ts:128`
- `rfq.flow.ts:124` (publish has no hooks), `rfiEvent.flow.ts:78`, `rfpEvent.flow.ts:73`
- `MockCommandService.ts:3535-3551` (`RFX_PUBLISH_HAS_INVITEES` reads `invitees`; RFQ uses `invitedSupplierIds`)
- `BuyerSourcing.tsx:236` (`CATEGORY_TO_SUPPLIER_CATEGORY`), `data/mockRfqs.ts:34`, `sourcing/types.ts:258, 431`, `rfxConfig.ts:71`
- the CR-23 loops at award (`MockCommandService.ts:4024-4027` RFQ, `:4149-4152` RFP)
- `complianceGate.ts:44`, which must not change

## OBJECTIVE

Let only qualified vendors be invited to and awarded on each event: Preferred for direct, Approved or Preferred for indirect. The event's type comes from its category.

## STANDARD

Map (AR-17)
- Move `CATEGORY_TO_SUPPLIER_CATEGORY` to `src/services/sourcing/`.
- Add `SourcingTypeMap`, keyed by `RFQCategory` value and by purchasing group, → `'direct' | 'indirect'`.
- Verb `t_sourcingtype_set`, atom `sourcingtype:manage` in `procurement`, governed. Target in `targets/sourcingType.ts`.
- `sourcingTypeOf(event)` resolves the type per event type. It is stored on the event at publish and fixed after that. [MR-10 BR-06]

Eligibility (BR-05)
- Pure `qualifiedFor(level, sourcingType)`: direct needs Preferred; indirect needs Approved or Preferred.

Invite
- `filterInvitees` keeps Active and qualified vendors.
- The invitee step lists the others greyed out, with their missing documents from G1.

Publish (AR-16)
- New hook `RFX_INVITEES_QUALIFIED` on RFI, RFP and RFQ publish. It reads `invitees` or `invitedSupplierIds` by event type.
- It refuses `SUPPLIER_NOT_QUALIFIED` and names the vendor.
- Leave `RFX_PUBLISH_HAS_INVITEES` as it is.

Award (BR-07)
- After the CR-23 loops, refuse `AWARD_SUPPLIER_NOT_QUALIFIED` for any line whose supplier is below the level on the award date, with the reason.
- The award panel shows the reason on that row (edge case 1).
- A below-level vendor can still submit a response.

Older events (edge case 4)
- An event published before this change reads as Direct. Its invitees are not removed.

Other
- Show the sourcing type on the event header.
- EN and ID for every string. Pay the bill (MAT-R5).

## Owner ruling 2026-09-29: warn-only while lists are placeholders

- While the qualification list for the level an event needs has `placeholder: true` (G1), eligibility does NOT refuse. Instead:
  - the invitee step still offers the vendor, marked "Not qualified (placeholder rules): <missing documents>"
  - publish passes but records `qualificationWarnings` on the event
  - award of a share to such a vendor needs a reason (reuse B4's shared `awardReasonOwed` if merged; otherwise add the reason rule in the same shared function), and the award record keeps the warning
- Once Procurement and Quality save a real list (`placeholder: false`), the same checks refuse as specified above (fail-closed, plan AD-8). Test both modes.

## CONSTRAINTS

- Do not change `GATE_CRITERIA` or CR-23.

## DONE WHEN

- `npm run gates` passes on Node 22.
- Tests cover:
  - a direct RFQ's candidates exclude an Approved-only vendor, and publishing with one is refused by the hook (AC-03)
  - an indirect RFP offers Approved and Preferred vendors (AC-04)
  - awarding a vendor that dropped to Approved on a direct RFQ is refused with the reason (AC-05)
  - the same vendor can still submit its quote
  - an RFQ publish with qualified invitees passes; this is the first RFQ publish hook, so prove it does not refuse the existing sample RFQs
  - the sourcing type is fixed after publish
- A PR is open per MAT-R11.

## OUTPUT

Report in the brief's format, at most 25 lines.

Build the map, eligibility, invite filter, publish hook, award refusal and tests, run the gates and open the PR now.
