// ────────────────────────────────────────────────────────────────────────────
// BL-269 (PEX-4 BR-01) — the supplier states its capacity by month for the
// months beyond the 13 weekly buckets [Proposed].
//
// THE PRECEDENT IS `t_capacity_submit`, FOLLOWED: a creation verb onto one
// terminal state on the same `capacity:confirm` atom (the supplier lane that
// confirms weekly capacity confirms monthly capacity), scoped to the supplier
// named in the payload. A submission is replaced by a newer one, never changed.
// Nothing is sent to SAP or PTI's planners on it: the heads-up reads it.
// ────────────────────────────────────────────────────────────────────────────

/** @import { FlowDefinition } from '../schema' */
import { POLICY_HOOKS } from '../policyHooks';

/** @type {FlowDefinition} */
export const capacityMonthFlow = {
  entity: 'capacityMonth',
  version: 1,
  states: ['Submitted'],
  initial: 'Submitted',
  /** A submission is replaced by a newer one, never changed. */
  terminals: ['Submitted'],
  transitions: [
    {
      id: 't_capacitymonth_submit',
      from: [],
      to: 'Submitted',
      trigger: 'creation',
      requiredRole: 'capacity:confirm',
      requiredFields: ['supplierId', 'planningGroupId', 'months'],
      policyHooks: [POLICY_HOOKS.CAPACITY_MONTH_VALID],
      surfaceable: { surfaced: true },
      version: 1
    }
  ]
};
