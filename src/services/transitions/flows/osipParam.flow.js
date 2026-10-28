// ────────────────────────────────────────────────────────────────────────────
// OSIP values per material and per supplier — the Material Planning team's
// answers of 2026-10-28 (B3, B6, B7, B10, E2), owner ruling 2026-10-28.
//
// THE PRECEDENT IS `t_osiplevel_set`, FOLLOWED:
//   · A DEGENERATE SINGLE-STATE MACHINE. A value has no lifecycle; it has a
//     LEDGER of changes. The latest row is in force; with none, the default.
//   · THE ENTITY IS THE LEDGER KEY (`osipParamKey`): `z|<material>`,
//     `g|<material>`, `f|<supplier>`, `pullAgreement|<supplier>`,
//     `bottleneckLeadTimeDays|<supplier>|<material>`. Only a key whose
//     material and supplier the masters resolve is addressable — any other is
//     NOT_FOUND.
//   · `previous`, `setAt` and `setBy` are target-assigned. A value of null
//     resets the key to its default, as a row of its own.
//
// ── `osipparam:set` IS A `planning` ATOM ──────────────────────────────────
// The team named owners per value (g: Logistics Operations for ROP Fisik,
// Supply Sustainability for ROP Order; DA cadence: Supply Sustainability), but
// the hub has no role for either team. Until it does, the Material Planner
// holds the verb, as it holds the level (reported as a build decision). No
// supplier lane holds it, and the target denies every supplier at SCOPE.
// ────────────────────────────────────────────────────────────────────────────

/** @import { FlowDefinition } from '../schema' */
import { POLICY_HOOKS } from '../policyHooks';

/** @type {FlowDefinition} */
export const osipParamFlow = {
  entity: 'osipParam',
  version: 1,
  states: ['Maintained'],
  initial: 'Maintained',
  /** `t_osipparam_set` is statePreserving, so nothing ever leaves it. */
  terminals: ['Maintained'],
  transitions: [
    {
      // WIRED (team answers 2026-10-28). The Material Planner sets or resets
      // one OSIP value of a material, a supplier or a supplier × material.
      id: 't_osipparam_set',
      from: ['Maintained'],
      to: 'Maintained',
      statePreserving: true,
      trigger: 'user',
      requiredRole: 'osipparam:set',
      // `osipParamValue` is required, but null (reset) is a value: the
      // dispatcher's required-field check reads null as empty, so the policy
      // hook checks presence instead.
      requiredFields: [],
      policyHooks: [POLICY_HOOKS.OSIP_PARAM_VALID],
      surfaceable: { surfaced: true },
      version: 1
    }
  ]
};
