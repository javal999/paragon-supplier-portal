// ────────────────────────────────────────────────────────────────────────────
// PTI's capacity gap decision — INV-D8 (Inventory UX P-07; REQ-E08-04 BR-05,
// BR-10).
//
// On a gap week PTI's planner accepts the additional capacity the supplier
// offered. The decision is recorded on the supplier × planning group × week.
// The policy hook admits it only on an amber week (LTP above capacity, within
// BE): a red week's additional capacity cannot cover the LTP.
//
// ⚠️ ITS OWN FLOW, NOT A VERB ON `capacitySubmission`. A capacity submission
// is the SUPPLIER's snapshot of a whole planning group (one state,
// `Submitted`, replaced by the next submission). PTI's decision is on one
// WEEK, is PTI's act, and must survive the supplier submitting again. Putting
// it on the submission would give `Submitted` a second meaning and lose the
// decision on every resubmission, so it lives here.
//
// A DEGENERATE SINGLE-STATE machine, the same shape as `feedstockConfirmation`:
// a decision is a record, and the one state exists so the act rides the
// governed dispatch spine (role + fields + scope + policy + DR-10 audit).
// "Move demand" is not built here (INV-D8); the ask half of INV-D8 is the
// `supplierAsk` flow.
// ────────────────────────────────────────────────────────────────────────────

/** @import { FlowDefinition } from '../schema' */
import { POLICY_HOOKS } from '../policyHooks';

/** @type {FlowDefinition} */
export const capacityDecisionFlow = {
  entity: 'capacityDecision',
  version: 1,
  states: ['Accepted'],
  initial: 'Accepted',
  /** An acceptance is a record; it is never changed. */
  terminals: ['Accepted'],
  transitions: [
    {
      // PTI accepts the additional capacity on one amber week.
      id: 't_capacitydecision_accept',
      from: [],
      to: 'Accepted',
      trigger: 'creation',
      requiredRole: 'capacitydecision:accept',
      requiredFields: ['supplierId', 'planningGroupId', 'week'],
      policyHooks: [POLICY_HOOKS.CAPACITY_DECISION_ACCEPTABLE],
      surfaceable: { surfaced: true },
      version: 1
    }
  ]
};
