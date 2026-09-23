// ────────────────────────────────────────────────────────────────────────────
// Call-off flow — REQ-E09-01 (release), REQ-E09-03 (confirmation), REQ-E09-04
// (dispatch heads-up).
//
// A call-off manages one delivery under an umbrella PO line. The hub is its
// record (PQ-01): nothing here crosses the SAP boundary.
//
//   Planner (planning lane):
//     · releases a call-off (`creation` → Awaiting Confirmation), or drafts one
//       (a generated series), edits or dismisses a draft with a reason, and
//       releases a draft. Release is refused beyond what remains on the
//       umbrella PO (CR-04, policy), and refused for a draft the Order plan
//       made from an engine recommendation while the engine dataset is
//       simulated (X-03, policy).
//     · changes a released call-off with a reason — it returns to Awaiting
//       Confirmation (edge case of REQ-E09-03).
//     · approves or rejects a confirmation outside tolerance. Approval is the
//       second axis of BR-04 and is carried on the confirmation record, so
//       approving preserves the confirmation state; rejecting returns the
//       call-off to Awaiting Confirmation.
//   Supplier (fulfilment lane):
//     · confirms, confirms with a new date, with changes, partially (2
//       deliveries), or rejects with a reason. Within tolerance the answer is
//       accepted automatically; outside it waits for the planner (the target
//       computes which from `callOffRules.checkTolerance`).
//     · sends dispatch heads-ups on an accepted confirmation.
//
// Escalated, Dispatched, At Risk and on time / late / missed are READ-TIME
// projections (`callOffRules.ts`), never states here (law 0.5).
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';
import { POLICY_HOOKS } from '../policyHooks';

const CONFIRMED = [
  'Confirmed',
  'Confirmed with New Date',
  'Confirmed with Changes',
  'Partially Confirmed',
];
const NEEDS_APPROVAL = ['Confirmed with New Date', 'Confirmed with Changes', 'Partially Confirmed'];

export const callOffFlow: FlowDefinition = {
  entity: 'callOff',
  version: 1,
  states: [
    'Draft',
    'Awaiting Confirmation',
    'Confirmed',
    'Confirmed with New Date',
    'Confirmed with Changes',
    'Partially Confirmed',
    'Rejected',
    'Dismissed',
  ],
  initial: 'Draft',
  /** A dismissed draft never becomes a call-off. A rejected call-off can still
   *  be changed and re-released by the planner, so it is not an ending. */
  terminals: ['Dismissed'],
  transitions: [
    {
      id: 't_calloff_release',
      from: [],
      to: 'Awaiting Confirmation',
      trigger: 'creation',
      requiredRole: 'calloff:plan',
      requiredFields: ['poId', 'poLineId', 'quantity', 'needDate', 'type'],
      // X-03: a call-off that names the engine as its origin is refused here
      // too, so the rule cannot be stepped around by releasing without a draft.
      policyHooks: [
        POLICY_HOOKS.CALLOFF_LINE_VALID,
        POLICY_HOOKS.CALLOFF_WITHIN_REMAINING,
        POLICY_HOOKS.CALLOFF_ENGINE_DATA_LIVE,
      ],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      id: 't_calloff_draft',
      from: [],
      to: 'Draft',
      trigger: 'creation',
      requiredRole: 'calloff:plan',
      requiredFields: ['poId', 'poLineId', 'quantity', 'needDate', 'type'],
      policyHooks: [POLICY_HOOKS.CALLOFF_LINE_VALID],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      id: 't_calloff_edit_draft',
      from: ['Draft'],
      to: 'Draft',
      statePreserving: true,
      trigger: 'user',
      requiredRole: 'calloff:plan',
      requiredFields: ['reason'],
      policyHooks: [POLICY_HOOKS.CALLOFF_EDIT_VALID],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      id: 't_calloff_release_draft',
      from: ['Draft'],
      to: 'Awaiting Confirmation',
      trigger: 'user',
      requiredRole: 'calloff:plan',
      requiredFields: [],
      // X-03 (owner decision 2026-09-23): an engine-origin draft stays a draft
      // while the engine dataset is simulated.
      policyHooks: [POLICY_HOOKS.CALLOFF_WITHIN_REMAINING, POLICY_HOOKS.CALLOFF_ENGINE_DATA_LIVE],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      id: 't_calloff_dismiss',
      from: ['Draft'],
      to: 'Dismissed',
      trigger: 'user',
      requiredRole: 'calloff:plan',
      requiredFields: ['reason'],
      policyHooks: [POLICY_HOOKS.CALLOFF_REASON_AUTHORED],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      id: 't_calloff_change',
      // Changing what the supplier already answered (edge case of REQ-E09-03).
      // A call-off still awaiting its answer is not changed in place: a verb that
      // left it in the same state would be blind to a concurrent confirmation.
      from: [...CONFIRMED, 'Rejected'],
      to: 'Awaiting Confirmation',
      trigger: 'user',
      requiredRole: 'calloff:plan',
      requiredFields: ['reason'],
      policyHooks: [POLICY_HOOKS.CALLOFF_EDIT_VALID, POLICY_HOOKS.CALLOFF_CHANGEABLE, POLICY_HOOKS.CALLOFF_WITHIN_REMAINING],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      id: 't_calloff_confirm',
      from: ['Awaiting Confirmation'],
      to: 'Confirmed',
      trigger: 'user',
      requiredRole: 'calloff:confirm',
      requiredFields: [],
      policyHooks: [POLICY_HOOKS.CALLOFF_CONFIRMATION_VALID],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      id: 't_calloff_confirm_new_date',
      from: ['Awaiting Confirmation'],
      to: 'Confirmed with New Date',
      trigger: 'user',
      requiredRole: 'calloff:confirm',
      requiredFields: ['confirmedDate'],
      policyHooks: [POLICY_HOOKS.CALLOFF_CONFIRMATION_VALID],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      id: 't_calloff_confirm_changes',
      from: ['Awaiting Confirmation'],
      to: 'Confirmed with Changes',
      trigger: 'user',
      requiredRole: 'calloff:confirm',
      requiredFields: ['confirmedQty'],
      policyHooks: [POLICY_HOOKS.CALLOFF_CONFIRMATION_VALID],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      id: 't_calloff_confirm_partial',
      from: ['Awaiting Confirmation'],
      to: 'Partially Confirmed',
      trigger: 'user',
      requiredRole: 'calloff:confirm',
      requiredFields: ['deliveries'],
      policyHooks: [POLICY_HOOKS.CALLOFF_CONFIRMATION_VALID],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      id: 't_calloff_reject',
      from: ['Awaiting Confirmation'],
      to: 'Rejected',
      trigger: 'user',
      requiredRole: 'calloff:confirm',
      requiredFields: ['reason'],
      policyHooks: [POLICY_HOOKS.CALLOFF_REASON_AUTHORED],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      id: 't_calloff_approve',
      from: NEEDS_APPROVAL,
      to: 'Confirmed with New Date',
      statePreserving: true,
      trigger: 'user',
      requiredRole: 'calloff:review',
      requiredFields: [],
      policyHooks: [POLICY_HOOKS.CALLOFF_AWAITING_APPROVAL],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      id: 't_calloff_reject_confirmation',
      from: NEEDS_APPROVAL,
      to: 'Awaiting Confirmation',
      trigger: 'user',
      requiredRole: 'calloff:review',
      requiredFields: ['reviewComment'],
      policyHooks: [POLICY_HOOKS.CALLOFF_AWAITING_APPROVAL, POLICY_HOOKS.CALLOFF_REVIEW_COMMENT_AUTHORED],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      id: 't_calloff_dispatch',
      from: CONFIRMED,
      to: 'Confirmed',
      statePreserving: true,
      trigger: 'user',
      requiredRole: 'calloff:dispatch',
      requiredFields: ['shippedDate', 'expectedArrival', 'quantity'],
      policyHooks: [POLICY_HOOKS.CALLOFF_DISPATCH_VALID],
      surfaceable: { surfaced: true },
      version: 1,
    },
  ],
};
