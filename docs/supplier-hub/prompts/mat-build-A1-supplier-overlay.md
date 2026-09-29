# Prompt: Material A1 · Supplier overlay, stock update mode, one API-connected resolver

**How to use:** Paste into Claude Code opened at the root of `paragon-supplier-portal`, on an up-to-date `main`. No slots to fill.
**Target:** paragon-supplier-portal · React 18 + TypeScript strict + Tailwind 3, mock data layer · rules from `portal-fit.md` and `mat-build-00-brief.md`
**Assumptions made:**
- MR-1 BR-02 is accepted (owner, 2026-09-29). "Hub administrator only" is expressed as a `compliance` atom (plan AR-04).
- A supplier with no overlay row keeps its current behaviour: API if it is in `API_CONNECTIONS`, manual otherwise.
- Target model: Claude Opus 5 with thinking on.

---

## CONTEXT

Read `docs/supplier-hub/prompts/mat-build-00-brief.md` first, and follow MAT-R1 to MAT-R15. Then read these:
- In `docs/supplier-hub/SC-HUB-MATERIAL-BUILD-PLAN-2026-09.md`: AD-4, AR-03, AR-04 and AR-06.
- In `docs/supplier-hub/SC-HUB-MATERIAL-REQUIREMENTS-2026-09.md`: MR-1 BR-02, edge case 1, AC-06.

Then read these files:
- `src/data/mockSuppliers.ts:63` and `src/types/supplier.types.ts:37`
- `src/services/data/mock/MockSupplierService.ts:15-33`
- `inventoryReadModel.ts:58` (`isApiConnected`) and `fixtures/inventoryHub.ts:167` (`API_CONNECTIONS`)
- every reader listed in AR-06, including `MockCommandService.ts:2555` and the `STOCK_SYNC_CONNECTED` hook at `:2590-2594`
- `src/services/data/mock/stores/threePlStore.ts`, the model for a small governed store with an admin verb
- `businessRoles.ts:237-297` (`compliance`)

## OBJECTIVE

Give each supplier a governed stock update mode, API or manual. Make every "is this supplier API-connected?" question read it through one resolver.

## STANDARD

Store and resolver
- `supplierOverlayStore`: append-only rows `{supplierId, stockUpdateMode: 'api' | 'manual', setAt, setBy, reason?}`. The latest row per supplier wins.
- `supplierEntry(supplierId)` merges the fixture supplier with its latest overlay row.
- `stockUpdateModeOf(supplierId)` returns the overlay value. Without an overlay row, it returns `'api'` when the supplier is in `API_CONNECTIONS` and `'manual'` otherwise. [MAT-R3, MAT-R15, AD-4]

Verb
- Flow `supplierOverlay.flow.ts`, single state `Defined`, state-preserving verb `t_supplier_set_update_mode`.
- Required field `stockUpdateMode`. Atom `supplier:set-update-mode` in `compliance`.
- Hook `SUPPLIER_UPDATE_MODE_VALID`. It refuses an unknown supplier (`UNKNOWN_SUPPLIER`) and a value that is neither `api` nor `manual` (`UPDATE_MODE_INVALID`).
- The target lives in `src/services/data/mock/targets/supplierOverlay.ts`. [MAT-R13, AR-03, AR-04]

One resolver
- `isApiConnected` becomes `stockUpdateModeOf(id) === 'api'`.
- Replace every direct read of `API_CONNECTIONS[...]` for the connected question with it, including `MockCommandService.ts:2555`.
- `API_CONNECTIONS` stays the fixture of simulated pull outcomes (`ok` or `timeout`). An API supplier with no fixture entry records a failed pull with reason `NO_ENDPOINT`, not `timeout`. [AR-06]

Screen
- Administration → Suppliers: a small table of suppliers with their mode and a change control that dispatches the verb, with an optional reason. Put it on the existing admin screen as a new section, matching the other sections.
- The supplier row history shows who changed it and when.

Invariants
- Pay the bill for the flow, the verb, the store, the new C1 read method and the new stored fields. [MAT-R5]

## CONSTRAINTS

- Out of scope: the update cycle and staleness (B1), and any qualification field (G1).
- Do not edit `mockSuppliers.ts` rows.

## DONE WHEN

- `npm run gates` passes on Node 22.
- `supplierOverlayCommand.test.ts` covers:
  - setting the mode to manual makes `isApiConnected` false for a supplier that is in `API_CONNECTIONS`
  - setting the mode to API for a supplier not in the fixture makes a sync record `NO_ENDPOINT`
  - an invalid value is refused, and so is an unknown supplier
  - a seat without `supplier:set-update-mode` is refused
  - the history keeps both rows
- A grep for `API_CONNECTIONS[` outside the fixture and the sync outcome read returns nothing.
- A PR is open per MAT-R11.

## OUTPUT

Report in the brief's format, at most 25 lines.

Build the store, resolver, verb, admin section and tests, run the gates and open the PR now.

---

## Notes on design decisions

- An overlay leaves the fixture as the stand-in for SAP's vendor master, and makes the hub-mastered field visible and governed (AD-4).
- The default without an overlay row reproduces today's behaviour exactly, so no page changes before B1.
- `NO_ENDPOINT` separates "we have no connection details" from "the supplier's system did not answer". The planner acts differently on each.
