// ────────────────────────────────────────────────────────────────────────────
// OSIP level per material — DRC-D11 (BL-196, DRC-10), SC-HUB-DA-ROP-CALLOFF-
// REQUIREMENTS-2026-10.
//
// THE PRECEDENT IS `t_maxstock_set` / `t_warehousedecision_record`, FOLLOWED:
//   · A DEGENERATE SINGLE-STATE MACHINE. A level has no lifecycle; it has a
//     LEDGER of changes. The latest row is in force; with none, the material is
//     at [Default C2] level 4.
//   · THE ENTITY IS THE MATERIAL CODE, and only a code the material master
//     resolves is addressable — a level for an unknown code is NOT_FOUND.
//   · `previous`, `setAt` and `setBy` are target-assigned, never read from the
//     payload. Every row records its `source`: `planner` for the planner's own
//     pick, `classification` when the planner confirms the suggested level
//     (optional payload `levelSource`, BL-208 / DRC-19 [Proposed]). The system
//     never fires this verb on its own.
//   · Setting the level in force again is accepted: it records the planner's
//     confirmation, which is how the NPD review task closes (DRC-12a, BL-198).
//
// ── `osiplevel:set` IS A `planning` ATOM ──────────────────────────────────
// The level is the Material Planner's (DRC-D11: "editable by the planner"). No
// supplier lane holds it, and the target denies every supplier at SCOPE.
// ────────────────────────────────────────────────────────────────────────────

/** @import { FlowDefinition } from '../schema' */
import { POLICY_HOOKS } from '../policyHooks';

/** @type {FlowDefinition} */
export const osipLevelFlow = {
  entity: 'osipLevel',
  version: 1,
  states: ['Maintained'],
  initial: 'Maintained',
  /** `t_osiplevel_set` is statePreserving, so nothing ever leaves it. */
  terminals: ['Maintained'],
  transitions: [
    {
      // WIRED (DRC-D11). The Material Planner sets or confirms one material's
      // OSIP level.
      id: 't_osiplevel_set',
      from: ['Maintained'],
      to: 'Maintained',
      statePreserving: true,
      trigger: 'user',
      requiredRole: 'osiplevel:set',
      requiredFields: ['osipLevel'],
      policyHooks: [POLICY_HOOKS.OSIP_LEVEL_VALID],
      surfaceable: { surfaced: true },
      version: 1
    }
  ]
};
