# Prompt: Material D1 · One ASN line rule, and batch from declared stock

**How to use:** Paste into Claude Code opened at the root of `paragon-supplier-portal`, on an up-to-date `main`. No slots to fill.
**Target:** paragon-supplier-portal · React 18 + TypeScript strict + Tailwind 3, mock data layer · rules from `portal-fit.md` and `mat-build-00-brief.md`
**Assumptions made:**
- MAT-D5 is accepted (owner, 2026-09-29): free text when the supplier declared no batches, marked "not in declared stock".
- A batch above its available quantity is a warning, not a block (MR-6 BR-03).
- Target model: Claude Opus 5 with thinking on.

---

## CONTEXT

Read `docs/supplier-hub/prompts/mat-build-00-brief.md` first, and follow MAT-R1 to MAT-R15. Then read these:
- In the plan: AR-11.
- In the requirements: MR-6 section d steps 2 and 3, BR-01 to BR-04, edge cases 2 and 4, AC-01 and AC-02.

Then read these files:
- `fulfilmentRules.ts:29-118` (`asnLineRefusal`, `asnSubmitRefusal`, `openQtyForLine`)
- `MockCommandService.ts:625-685` (`ASN_LINES_WITHIN_OPEN`, `ASN_SUBMIT_COMPLETE`)
- `SupplierShipments.tsx:99-271, 175-197, 1027-1034` (`LineEntry`, `readLines`, `step2Valid`)
- `services/sdc/types.ts:470-517` (`InventoryBatch`, `InventoryDeclaration`) and `inventoryDeclarationStore.ts:64`

## OBJECTIVE

Make the ASN line rule one function that the wizard and the submit hook both call, carrying batch, expiry and ETA. Let suppliers pick the batch from their declared stock.

## STANDARD

One rule
- `asnLineRefusal` takes `{materialCode, shippedQty, lotNumber, expiryDate, eta}` plus options.
- `ASN_LINES_WITHIN_OPEN` and `ASN_SUBMIT_COMPLETE` pass the full line and call it (`requireBatch: true` at submit). The hand-written batch check at `:681` goes.
- The wizard's `readLines` and `step2Valid` call it instead of re-deriving. Behaviour is unchanged in this task. [AR-11, MAT-R2]

Available batches
- Pure `availableBatches(supplierId, materialCode, asns, declaration)` → `{batchNumber, available, expiryDate?}[]`.
- available = declared quantity − quantity on this supplier's ASNs for that batch in Submitted, In Transit or Delivered, shipped on or after `declaredAt`. D2 adds Awaiting exception to that list.
- Batches with available ≤ 0 are left out. [MR-6 BR-01, BR-02]

Wizard
- With declared batches: a dropdown showing batch, available quantity and expiry. Picking one fills the expiry.
- Without declared batches: free text with the note "This batch is not in your declared stock".
- `AsnLineItem.batchSource: 'declared' | 'typed'` is stored. [MR-6 BR-04]

Warning
- A line quantity above available shows a warning on the confirm step, and does not block. [BR-03]

Planner
- The ASN detail shows "not in declared stock" on typed batches.

Strings
- EN and ID for every string.

## CONSTRAINTS

- Out of scope: the shelf-life rule (D2) and call-off comparison (D3).
- The existing ASN refusal codes keep their names.

## DONE WHEN

- `npm run gates` passes on Node 22.
- Tests cover:
  - the submit hook refuses a missing batch through `asnLineRefusal`
  - the wizard and the hook agree on 1 fixture
  - declared batches minus earlier ASNs give the dropdown (AC-01)
  - a batch used up by another ASN is left out (edge case 4)
  - a supplier without batches can type one, stored `typed` (AC-02)
  - a line above available shows the warning and still submits
- A PR is open per MAT-R11.

## OUTPUT

Report in the brief's format, at most 25 lines.

Build the shared rule, available batches, wizard change and tests, run the gates and open the PR now.
