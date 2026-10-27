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
// TWO STATES (BL-227): `Accepted`, and `Withdrawn` when the planner undoes
// the acceptance. A withdrawn decision stays on record (RFX-R3); the week
// counts toward the capacity alert again (INV-D12) and Accept is offered
// again, which records a NEW decision.
// "Move demand" is not built here (INV-D8); the ask half of INV-D8 is the
// `supplierAsk` flow.
// ────────────────────────────────────────────────────────────────────────────

/** @import { FlowDefinition } from '../schema' */
import { POLICY_HOOKS } from '../policyHooks';

/** @type {FlowDefinition} */
export const capacityDecisionFlow = {
  entity: 'capacityDecision',
  version: 1,
  states: ['Accepted', 'Withdrawn'],
  initial: 'Accepted',
  /** A withdrawn acceptance stays on record; a new acceptance is a new decision. */
  terminals: ['Withdrawn'],
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
    },
    {
      // BL-227 — the planner undoes an acceptance. Same atom as accept: the
      // seat that may accept may take it back.
      id: 't_capacitydecision_withdraw',
      from: ['Accepted'],
      to: 'Withdrawn',
      trigger: 'user',
      requiredRole: 'capacitydecision:accept',
      requiredFields: [],
      policyHooks: [],
      surfaceable: { surfaced: true },
      version: 1
    }
  ]
};
