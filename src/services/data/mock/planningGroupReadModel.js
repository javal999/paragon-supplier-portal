// ────────────────────────────────────────────────────────────────────────────
// Material C5 · the planning group read model (MR-8; plan AR-15, AD-4).
//
// ONE place hands the planning group log and the material master (read through
// `materialEntry`, MAT-R15) to the pure resolver, so the read service, the
// `planningGroup` target, its policy hook and capacity all see the same groups.
// Nothing computed here is stored.
// ────────────────────────────────────────────────────────────────────────────

/** @import { PlanningGroupEvent, PlanningGroupView } from '../types' */
import { defaultPlanningGroupId, knownMaterialCodes, materialEntry } from '../../sdc';
/** @import { PlanningGroupMaterial, PlanningGroupWorld } from '../../transitions/planningGroupRules' */
import { movesOf, resolvePlanningGroups } from '../../transitions/planningGroupRules';
import { planningGroupStore } from './stores/planningGroupStore';

/**
 * A material's SAP group and planning group now, or null when the master does not hold it.
 * @param {string} materialCode
 * @returns {PlanningGroupMaterial | null}
 */
export function planningGroupMaterial(materialCode) {
  const e = materialEntry(materialCode);
  if (!e) return null;
  return {
    materialCode,
    sapMaterialGroup: e.materialGroup,
    planningGroupId: e.planningGroupId ?? defaultPlanningGroupId(e.materialGroup)
  };
}

/** @returns {PlanningGroupMaterial[]} */
const allMaterials = () =>
  knownMaterialCodes()
    .map(planningGroupMaterial)
    .filter(/** @returns {m is PlanningGroupMaterial} */ (m) => m !== null);

/**
 * Every planning group, PTI's view.
 * @returns {PlanningGroupView[]}
 */
export function allPlanningGroups() {
  return resolvePlanningGroups(planningGroupStore.all(), allMaterials(), defaultPlanningGroupId);
}

/**
 * One planning group by id, or null.
 * @param {string} id
 * @returns {PlanningGroupView | null}
 */
export const planningGroupById = (id) => allPlanningGroups().find((g) => g.id === id) ?? null;

/**
 * The moves in the log, oldest first — what "Needs re-entry" is derived from.
 * @returns {Extract<PlanningGroupEvent, { kind: 'moved' }>[]}
 */
export const planningGroupMoves = () => movesOf(planningGroupStore.all());

/**
 * What the refusal rule reads: the SAP groups with materials, and each material.
 * @returns {PlanningGroupWorld}
 */
export function planningGroupWorld() {
  const materials = allMaterials();
  return {
    sapGroups: [...new Set(materials.map((m) => m.sapMaterialGroup))].sort(),
    material: planningGroupMaterial
  };
}
