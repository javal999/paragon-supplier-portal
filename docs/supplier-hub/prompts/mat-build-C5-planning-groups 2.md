# Prompt: Material C5 · Planning groups for capacity

**How to use:** Paste into Claude Code opened at the root of `paragon-supplier-portal`, on an up-to-date `main` with A2 merged. No slots to fill.
**Target:** paragon-supplier-portal · React 18 + TypeScript strict + Tailwind 3, mock data layer · rules from `portal-fit.md` and `mat-build-00-brief.md`
**Assumptions made:**
- MAT-D12 is accepted: planning groups are hub master data for now.
- With no split made, each SAP material group has 1 default planning group, `pg-<materialGroup>`, with the same materials. Today's figures do not move.
- Target model: Claude Opus 5 with thinking on.

---

## CONTEXT

Read `docs/supplier-hub/prompts/mat-build-00-brief.md` first, and follow MAT-R1 to MAT-R15. Then read these:
- In the plan: AR-15.
- In the requirements: MR-8 BR-01 to BR-07 and AC-01 to AC-04.

Then read these files:
- every site listed in AR-15 (`capacityRules.ts:43-46, 73-74, 131-137`, `types.ts:556, 633, 642`, `capacitySubmission.flow.ts:32`, `MockCommandService.ts:2657-2684`, `commandHooks.ts:2042, 2101`, `CAPACITY_SEED`, `capacityFilters.ts:27-84`, `inventoryAlertRules.ts:134`)
- `BuyerCapacity.tsx:258` and `SupplierCapacity.tsx:171` (group names from i18n)
- A2's material overlay and `planningGroupId` default

## OBJECTIVE

Let Material Planning split SAP material groups into planning groups, and key capacity on planning groups with names from data. With no split made, the result is identical to today.

## STANDARD

Entity
- `PlanningGroup {id, name, sapMaterialGroup, state: 'active' | 'retired', createdBy, createdAt}`.
- Default groups are derived for every SAP group that has materials.

Verbs
- `t_planninggroup_create`, `t_planninggroup_rename`, `t_planninggroup_move_materials` and `t_planninggroup_retire`.
- Atom `planninggroup:manage` in `planning`.

Hook
- `PLANNING_GROUP_VALID` refuses:
  - `MIXED_SAP_GROUP`: a group mixing 2 SAP groups
  - `RETIRE_NOT_EMPTY`: retiring a group with materials
  - `NAME_REQUIRED`: a blank name

  A material in 2 groups cannot happen, because a move writes the material overlay (A2).
- Target in `targets/planningGroup.ts`. Pay the bill (MAT-R5). [MR-8 BR-01 to BR-03]

Capacity
- `CapacitySubmission` and `CapacityPlan` carry `planningGroupId`.
- `buildCapacityPlans` groups by `materialEntry(code).planningGroupId`. Demand per group is the sum of its materials.
- Migrate `CAPACITY_SEED` to the default groups.
- Names come from the store, not `t('inv.group.*')` (AR-15, MAT-R6). Keep the i18n keys only as the default group's name.
- Leave the forecast, engine and procurement uses of `materialGroup` alone. [MR-8 BR-04]

Re-entry
- A move marks future weeks of the affected groups "Needs re-entry" for that supplier, derived from the move time. Past weeks keep their group. [MR-8 BR-05]

Screens
- Administration → Planning groups (list, create, rename, move materials, retire).
- Planning group is a filter on capacity and alerts. [MR-8 BR-07]

## CONSTRAINTS

- Out of scope: the simulation cap (E1).

## DONE WHEN

- `npm run gates` passes on Node 22.
- Tests cover:
  - with no split, the capacity plans deep-equal today's (AC-01)
  - splitting MG-03 into 2 groups yields 2 plans with summed demand (AC-02)
  - a move marks future weeks "Needs re-entry" (AC-03)
  - a group mixing SAP groups is refused (AC-04)
  - retiring a non-empty group is refused
- A PR is open per MAT-R11.

## OUTPUT

Report in the brief's format, at most 25 lines.

Build the entity, verbs, capacity migration, screens and tests, run the gates and open the PR now.
