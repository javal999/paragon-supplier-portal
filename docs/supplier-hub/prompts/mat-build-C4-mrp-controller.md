# Prompt: Material C4 · MRP controller (PIC) on material surfaces

**How to use:** Paste into Claude Code opened at the root of `paragon-supplier-portal`, on an up-to-date `main` with A2 merged. No slots to fill.
**Target:** paragon-supplier-portal · React 18 + TypeScript strict + Tailwind 3, mock data layer · rules from `portal-fit.md` and `mat-build-00-brief.md`
**Assumptions made:**
- The MRP controller code comes from the A2 fixture, labelled simulated until the SAP feed (epic H).
- Mapping codes to hub users uses the identity list that exists today. The actor is `UNATTRIBUTED`, so "My materials" works from a chosen code in the seat's settings, not a login.
- Target model: Claude Opus 5 with thinking on.

---

## CONTEXT

Read `docs/supplier-hub/prompts/mat-build-00-brief.md` first, and follow MAT-R1 to MAT-R15. Then read these:
- In the plan: AR-19.
- In the requirements: MR-5 BR-01 to BR-05 and AC-01 to AC-03.

Then read these files:
- A2's `materialEntry` and the `materialMasterSap` capability
- `threePlStore.ts`, the model for an admin-governed list
- the inventory list and detail, `BuyerAlerts.tsx`, the call-off pages, the ASN line in `SupplierShipments.tsx`
- `src/components/layout-v2/IdentityPanel` or the seat settings, for where a planner's own code can be kept

## OBJECTIVE

Show on each material who handles it, and let a planner filter to their own materials.

## STANDARD

Admin mapping
- `MrpController {code, name, userLabels[]}`, governed.
- Verb `t_mrpcontroller_set`, atom `mrpcontroller:manage` in `compliance`.
- An unmapped code shows the code only. [MR-5 BR-02]
- The target goes in `targets/mrpController.ts`. Pay the bill (MAT-R5).

Surfaces
- A "PIC" column or field, with a `<LivenessPill capability="materialMasterSap">` beside the header (AR-19), on:
  - the inventory list and detail
  - alerts
  - call-offs
  - the ASN line
- The stock simulation (E2) adds it too. [MR-5 BR-03]

Filter
- A "PIC" filter on each list.
- "My materials", for a planner whose seat has a chosen controller code. The filter is kept in the page address.

Supplier view
- The name only, never the code. [MR-5 BR-04, AC-03]

Strings
- EN and ID for every string.

## CONSTRAINTS

- Out of scope: the SAP feed, and routing alerts to people.

## DONE WHEN

- `npm run gates` passes on Node 22.
- Tests cover:
  - every surface shows the controller (AC-01)
  - "My materials" for P12 shows only P12's materials (AC-02)
  - a supplier's read has the name and not the code (AC-03)
  - an unmapped code shows the code
- A PR is open per MAT-R11.

## OUTPUT

Report in the brief's format, at most 25 lines.

Build the mapping, columns, filters and tests, run the gates and open the PR now.
