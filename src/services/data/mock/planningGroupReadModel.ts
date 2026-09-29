// ────────────────────────────────────────────────────────────────────────────
// Material C5 · the planning group read model (MR-8; plan AR-15, AD-4).
//
// ONE place hands the planning group log and the material master (read through
// `materialEntry`, MAT-R15) to the pure resolver, so the read service, the
// `planningGroup` target, its policy hook and capacity all see the same groups.
// Nothing computed here is stored.
// ────────────────────────────────────────────────────────────────────────────

import type { PlanningGroupEvent, PlanningGroupView } from '../types';
import { defaultPlanningGroupId, knownMaterialCodes, materialEntry } from '../../sdc';
import {
  movesOf,
  resolvePlanningGroups,
  type PlanningGroupMaterial,
  type PlanningGroupWorld,
} from '../../transitions/planningGroupRules';
import { planningGroupStore } from './stores/planningGroupStore';

/** A material's SAP group and planning group now, or null when the master does not hold it. */
export function planningGroupMaterial(materialCode: string): PlanningGroupMaterial | null {
  const e = materialEntry(materialCode);
  if (!e) return null;
  return {
    materialCode,
    sapMaterialGroup: e.materialGroup,
    planningGroupId: e.planningGroupId ?? defaultPlanningGroupId(e.materialGroup),
  };
}

const allMaterials = (): PlanningGroupMaterial[] =>
  knownMaterialCodes()
    .map(planningGroupMaterial)
    .filter((m): m is PlanningGroupMaterial => m !== null);

/** Every planning group, PTI's view. */
export function allPlanningGroups(): PlanningGroupView[] {
  return resolvePlanningGroups(planningGroupStore.all(), allMaterials(), defaultPlanningGroupId);
}

/** One planning group by id, or null. */
export const planningGroupById = (id: string): PlanningGroupView | null =>
  allPlanningGroups().find((g) => g.id === id) ?? null;

/** The moves in the log, oldest first — what "Needs re-entry" is derived from. */
export const planningGroupMoves = (): Extract<PlanningGroupEvent, { kind: 'moved' }>[] =>
  movesOf(planningGroupStore.all());

/** What the refusal rule reads: the SAP groups with materials, and each material. */
export function planningGroupWorld(): PlanningGroupWorld {
  const materials = allMaterials();
  return {
    sapGroups: [...new Set(materials.map((m) => m.sapMaterialGroup))].sort(),
    material: planningGroupMaterial,
  };
}
