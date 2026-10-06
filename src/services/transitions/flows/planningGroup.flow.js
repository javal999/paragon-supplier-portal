// ────────────────────────────────────────────────────────────────────────────
// Planning group flow — Material C5 (MR-8 BR-01 to BR-05; plan AR-15, MAT-D12).
//
// A planning group is a set of materials sharing capacity at a supplier, under
// exactly 1 SAP material group. Material Planning creates, renames, moves
// materials into, and retires them. Each act is governed (`planninggroup:manage`,
// a `planning` atom) and logged in the append-only planning group store.
//
//   · `Active` → `Retired`. A default group (`pg-<materialGroup>`) is `Active`
//     without a creation: it is derived from its SAP group (MR-8 BR-02).
//   · `t_planninggroup_move_materials` — `entityId` is the DESTINATION group;
//     the move writes each material's `planningGroupId` in the material overlay,
//     so a material cannot be in 2 groups (AC-04). Capacity weeks of the groups
//     it touched read "Needs re-entry" (BR-05).
//   · A group with materials cannot be retired (RETIRE_NOT_EMPTY, BR-03), and
//     `Retired` is terminal: nothing is deleted.
//
// The one hook, `PLANNING_GROUP_VALID`, calls `planningGroupRefusal`, the rule
// the admin page's pre-check calls (MAT-R2).
// ────────────────────────────────────────────────────────────────────────────

/** @import { FlowDefinition } from '../schema' */
import { POLICY_HOOKS } from '../policyHooks';

/** @type {FlowDefinition} */
export const planningGroupFlow = {
  entity: 'planningGroup',
  version: 1,
  states: ['Active', 'Retired'],
  initial: 'Active',
  /** A retired group stays on record; nothing leaves `Retired`. */
  terminals: ['Retired'],
  transitions: [
    {
      // Material Planning splits an SAP group: a new, empty group under it.
      id: 't_planninggroup_create',
      from: [],
      to: 'Active',
      trigger: 'creation',
      requiredRole: 'planninggroup:manage',
      requiredFields: ['name', 'sapMaterialGroup'],
      policyHooks: [POLICY_HOOKS.PLANNING_GROUP_VALID],
      surfaceable: { surfaced: true },
      version: 1
    },
    {
      id: 't_planninggroup_rename',
      from: ['Active'],
      to: 'Active',
      statePreserving: true,
      trigger: 'user',
      requiredRole: 'planninggroup:manage',
      requiredFields: ['name'],
      policyHooks: [POLICY_HOOKS.PLANNING_GROUP_VALID],
      surfaceable: { surfaced: true },
      version: 1
    },
    {
      id: 't_planninggroup_move_materials',
      from: ['Active'],
      to: 'Active',
      statePreserving: true,
      trigger: 'user',
      requiredRole: 'planninggroup:manage',
      requiredFields: ['materialCodes'],
      policyHooks: [POLICY_HOOKS.PLANNING_GROUP_VALID],
      surfaceable: { surfaced: true },
      version: 1
    },
    {
      id: 't_planninggroup_retire',
      from: ['Active'],
      to: 'Retired',
      trigger: 'user',
      requiredRole: 'planninggroup:manage',
      requiredFields: [],
      policyHooks: [POLICY_HOOKS.PLANNING_GROUP_VALID],
      surfaceable: { surfaced: true },
      version: 1
    }
  ]
};
