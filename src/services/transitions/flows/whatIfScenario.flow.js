// ────────────────────────────────────────────────────────────────────────────
// What-if scenario — BL-202 (DRC-17 BR-05), SC-HUB-DA-ROP-CALLOFF-
// REQUIREMENTS-2026-10.
//
// A planner saves a what-if scenario of one supplier × material under a name:
// its inputs, its rule switches and the rules version in force. THE PRECEDENT
// IS `t_simulation_override_set`, FOLLOWED:
//   · CREATION-ONLY, ONE STATE. A scenario has no lifecycle: saving it again
//     with other numbers is a new scenario. Nothing is edited or deleted
//     (append-only, BR-05).
//   · Who saved it and when are target-assigned (the session's actor, the hub
//     clock), never read from the payload; `RULES_VERSION` is stamped by the
//     target (DRC-D16), so a later rules change is flagged on the scenario.
//   · BR-06 — ANALYSIS ONLY. The verb writes the scenario store and nothing
//     else: no DA, PO, call-off, level, setting or SAP record moves.
//
// ── `whatifscenario:save` IS A `planning` ATOM ────────────────────────────
// The sandbox is the Material Planner's (DRC-17 "PTI planners"). No supplier
// lane holds it, and the target denies every supplier at SCOPE (§86).
// ────────────────────────────────────────────────────────────────────────────

/** @import { FlowDefinition } from '../schema' */
import { POLICY_HOOKS } from '../policyHooks';

/** @type {FlowDefinition} */
export const whatIfScenarioFlow = {
  entity: 'whatIfScenario',
  version: 1,
  states: ['Saved'],
  initial: 'Saved',
  terminals: ['Saved'],
  transitions: [
    {
      // WIRED (DRC-17 BR-05). The Material Planner saves a named scenario.
      id: 't_whatifscenario_save',
      from: [],
      to: 'Saved',
      trigger: 'creation',
      requiredRole: 'whatifscenario:save',
      requiredFields: ['name', 'supplierId', 'materialCode', 'inputs', 'switches'],
      policyHooks: [POLICY_HOOKS.WHAT_IF_SCENARIO_VALID],
      surfaceable: { surfaced: true },
      version: 1
    }
  ]
};
