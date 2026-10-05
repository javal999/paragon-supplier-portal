// ────────────────────────────────────────────────────────────────────────────
// Stock simulation planner input — Material E1 (MR-7 BR-06, BR-08; plan AD-1,
// AR-20).
//
// Where the supplier has not given a figure the simulation needs (SOH, the
// in-production quantity and completion date, a to-distributor quantity and
// ETA), the planner enters one for the simulation only. Creation-only, one
// state — an input has no lifecycle; a changed figure is a new input, and the
// latest per field is the one in force (the `sapChangeMark` shape). It applies
// until the supplier's next stock record, and never touches that record or
// update compliance (MR-2). Who and when come from the session and the hub
// clock, never the form.
//
// `inventory:simulate` sits in `planning`: the planner simulates and fills the
// gaps. No supplier lane — it would be writing PTI's estimate of its own stock.
// ────────────────────────────────────────────────────────────────────────────

/** @import { FlowDefinition } from '../schema' */
import { POLICY_HOOKS } from '../policyHooks';

/** @type {FlowDefinition} */
export const simulationOverrideFlow = {
  entity: 'simulationOverride',
  version: 1,
  states: ['Recorded'],
  initial: 'Recorded',
  terminals: ['Recorded'],
  transitions: [
    {
      id: 't_simulation_override_set',
      from: [],
      to: 'Recorded',
      trigger: 'creation',
      requiredRole: 'inventory:simulate',
      requiredFields: ['supplierId', 'materialCode', 'field', 'value'],
      policyHooks: [POLICY_HOOKS.SIMULATION_OVERRIDE_VALID],
      surfaceable: { surfaced: true },
      version: 1
    }
  ]
};
