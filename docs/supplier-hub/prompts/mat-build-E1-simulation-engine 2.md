# Prompt: Material E1 · Supplier stock simulation, calculation and planner input

**How to use:** Paste into Claude Code opened at the root of `paragon-supplier-portal`, on an up-to-date `main` with A2 and C5 merged. No slots to fill.
**Target:** paragon-supplier-portal · React 18 + TypeScript strict + Tailwind 3, mock data layer · rules from `portal-fit.md` and `mat-build-00-brief.md`
**Assumptions made:**
- MAT-D10 and MAT-D11 are accepted (owner, 2026-09-29): "Free to call off" subtracts confirmed call-offs not yet shipped, and the cap uses allocated capacity only.
- Supplier available stock and PTI inbound are never summed (MR-7 BR-02).
- Target model: Claude Opus 5 with thinking on.

---

## CONTEXT

Read `docs/supplier-hub/prompts/mat-build-00-brief.md` first, and follow MAT-R1 to MAT-R15. Then read these:
- In the plan: AD-1 and AR-20.
- In the requirements: MR-7 in full, especially the section g worked example.

Then read these files:
- `InventoryDeclaration` (`sdc/types.ts:480-517`) and `inventoryDeclarationStore.ts:64`
- `IncomingShipment` (`sdc/types.ts:543`) and `SupplierMaterialRelationship.principals[].principalLeadTimeDays` (`:597-616`)
- `inTransitItems` (`inventoryRules.ts:216-245`)
- `CapacityPlan` after C5, and `materialEntry` after A2
- `callOffRules.ts` for confirmed and dispatched call-offs
- `ownerlessScope.test.ts:446`

## OBJECTIVE

Calculate, for any supplier, material and check date, what the supplier can still send, what is free to call off, and what is already on its way to PTI, from the last update plus what has happened since.

## STANDARD

Function
- Pure `simulateSupplierStock({supplierId, materialCode, checkDate, overrides})` → `{available, calledOffNotShipped, freeToCallOff, ptiInbound, components[], cappedByCapacity, basis: 'supplier' | 'plannerInput', flags[], weekly[13]}`.

Formula (MR-7 BR-01, BR-03, BR-07, BR-09)
- t0 = the `declaredAt` of the latest stock record.
- available = SOH(t0) − ASNs shipped in (t0, d] + to-distributor with ETA in (t0, d] + in production completing in (t0, d], capped.
- The ASNs counted are those in Submitted, In Transit, Delivered or Awaiting exception.
- The to-distributor legs counted are `principal-to-distributor` shipments in Booked or Shipped.
- calledOffNotShipped = confirmed call-offs not yet covered by an ASN.
- freeToCallOff = available − calledOffNotShipped.
- ptiInbound = `inTransitItems` for the supplier and material with ETA ≥ d.
- A manufacturer has no to-distributor term.

Cap (BR-04)
- Per supplier × planning group × week, in-production completions across the group's materials are capped at allocated capacity, scaled pro rata, and flagged.
- With no capacity confirmed for a week, there is no cap and the flag "No capacity confirmed" is set (edge case 5).

ETA fallback (BR-05)
- Use `eta`. Otherwise use `etd + principalLeadTimeDays`. Otherwise mark the ETA "Missing".

Flags
- Edge cases 1 to 4 (missing ship date, past completion, completion before t0, cancelled legs) and BR-06 (no stock record) each produce a named flag.
- A check date before t0 is refused (edge case 6).

Overrides
- `SimulationOverride {id, supplierId, materialCode, field, value, date?, enteredBy, enteredAt}`, appended.
- Verb `t_simulation_override_set`, atom `inventory:simulate` in `planning`. Creation-only, so it goes in `unprobeable` (AR-20).
- An override applies until the supplier's next stock record, and never touches the stock record or MR-2. [BR-08]
- Target in `targets/simulationOverride.ts`. Pay the bill (MAT-R5).

## CONSTRAINTS

- No page (E2).
- Nothing about the simulation is stored except overrides (AD-1).

## DONE WHEN

- `npm run gates` passes on Node 22.
- `simulateSupplierStock.test.ts` covers:
  - the worked example in requirements section 9g, reproduced exactly: available 8,300, free to call off 5,300, PTI inbound 1,200 (AC-01)
  - available and PTI inbound are separate fields, never summed (AC-02)
  - an override applies, then disappears after the next stock record (AC-03)
  - the pro-rata cap (AC-04)
  - the ETA fallback (AC-05)
  - each edge-case flag
- A PR is open per MAT-R11.

## OUTPUT

Report in the brief's format, at most 25 lines.

Build the calculation, override entity and tests, run the gates and open the PR now.
