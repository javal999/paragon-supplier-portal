# Prompt: Material C2 · Supplier trade names and approval

**How to use:** Paste into Claude Code opened at the root of `paragon-supplier-portal`, on an up-to-date `main`. No slots to fill.
**Target:** paragon-supplier-portal · React 18 + TypeScript strict + Tailwind 3, mock data layer · rules from `portal-fit.md` and `mat-build-00-brief.md`
**Assumptions made:**
- MR-3 is accepted (owner, 2026-09-29): the supplier enters the trade name, Material Planning approves, and each supplier has at most 1 approved name per material.
- Search is C3. This task shows names beside the PTI description only.
- Target model: Claude Opus 5 with thinking on.

---

## CONTEXT

Read `docs/supplier-hub/prompts/mat-build-00-brief.md` first, and follow MAT-R1 to MAT-R15. Then read these:
- In the plan: AR-20.
- In the requirements: MR-3 sections d and f, BR-01 to BR-03, BR-05 and BR-06, edge cases 1 to 3, AC-01, AC-03 and AC-05.

Then read these files:
- a recent small governed entity for the full bill (`flows/supplierDocument.flow.ts` and its target), and `ownerlessScope.test.ts:261, 378, 446`
- `businessRoles.ts`: the supplier lane that holds `declare` stock, and `planning` (:298)
- `src/pages-v2/SupplierInventory.tsx`
- the material assignment source (`SupplierMaterialRelationship`, `sdc/types.ts:597-616`)

## OBJECTIVE

Let suppliers record their trade name for each PTI material they supply, and let Material Planning approve it, so approved names show beside PTI's description.

## STANDARD

Entity
- `SupplierMaterialName {id, supplierId, materialCode, tradeName, supplierMaterialNo?, state, submittedBy, submittedAt, decidedBy?, decidedAt?, rejectionReason?, loadedByPti?}`.
- States: `Awaiting approval`, `Approved`, `Rejected`, `Replaced`.

Verbs
- `t_materialname_submit`: supplier, atom `materialname:submit`.
- `t_materialname_approve`: approving a new name moves the previous approved one to `Replaced`.
- `t_materialname_reject`: requires `rejectionReason`.
- `t_materialname_load`: bulk, approved on load, `loadedByPti`, upserts by (supplier, material).
- The approve, reject and load verbs use atom `materialname:review` in `planning`.

Hook
- `MATERIAL_NAME_VALID` refuses:
  - `NOT_ASSIGNED`: the material is not assigned to the supplier
  - `NAME_LENGTH`: the name is not 2 to 80 characters
  - `SUPPLIER_NO_LENGTH`: the supplier material number is over 40 characters
  - `REASON_REQUIRED`: a reject without a reason

The target goes in `targets/materialName.ts` (MAT-R13). Pay the bill (MAT-R5). `t_materialname_load` is creation-only, so it goes in `unprobeable` (AR-20).

Reads
- `materialNamesFor(scope)`: a supplier gets its own names only (MAT-R4, AC-03), PTI gets all.
- `approvedNameFor(supplierId, materialCode)`.
- Names of an unassigned material are hidden (edge case 2).

Screens
- Supplier: a "My materials" tab on the stock page, listing the assigned materials with PTI code and description, its trade name and state, and a submit or edit form. A rejection shows the reason.
- Planner: Materials → Trade names, filtered to "Awaiting approval" by default, with approve, reject (reason) and a bulk CSV load (PTI code, supplier ID, trade name, supplier material number).
- Wherever the supplier's stock rows show the PTI description, the approved name shows beside it.
- EN and ID for every string.

## CONSTRAINTS

- Out of scope: search (C3), and the template.

## DONE WHEN

- `npm run gates` passes on Node 22.
- `materialNameCommand.test.ts` covers:
  - submit for an unassigned material is refused (AC-01)
  - approve replaces the earlier approved name
  - reject without a reason is refused (AC-05)
  - loading the same CSV twice changes nothing
  - supplier A's read never contains supplier B's name (AC-03)
- A PR is open per MAT-R11.

## OUTPUT

Report in the brief's format, at most 25 lines.

Build the entity, verbs, reads, screens and tests, run the gates and open the PR now.
