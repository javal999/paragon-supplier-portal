// ────────────────────────────────────────────────────────────────────────────
// PO CANCELLATION REQUEST — PEX-12 (the cancellation flow half), [Proposed],
// owner away 2026-11-12; Mba Septi has not given the cancellation flow
// (prompts/pex-not-started-suggestions.md row 8).
//
// MODELLED ON `poOnHoldDecision` / `supplierAsk` (the planner raises, the
// supplier the row names answers). Two states: `Requested` (the planner asked
// to cancel a PO) and `Acknowledged` (the supplier has seen the request).
//
// A REQUEST ONLY. The hub does NOT cancel the PO and does NOT write anything
// to SAP: the SAP identifier for a cancellation is unknown, and there is no
// "Cancelled" PO status (PEX requirements, section on PO status). The PO is
// untouched. Both steps are appended with time and actor to the ledger.
// ────────────────────────────────────────────────────────────────────────────

/** @import { FlowDefinition } from '../schema' */
import { POLICY_HOOKS } from '../policyHooks';

/** @type {FlowDefinition} */
export const poCancellationFlow = {
  entity: 'poCancellation',
  version: 1,
  states: ['Requested', 'Acknowledged'],
  initial: 'Requested',
  /** The supplier's acknowledgement ends the hub's part; SAP is not written. */
  terminals: ['Acknowledged'],
  transitions: [
    {
      // The planner asks to cancel one PO, with a reason.
      id: 't_pocancel_request',
      from: [],
      to: 'Requested',
      trigger: 'creation',
      requiredRole: 'pocancel:request',
      requiredFields: ['supplierId', 'poId'],
      policyHooks: [POLICY_HOOKS.PO_CANCEL_REQUESTABLE],
      surfaceable: { surfaced: true },
      version: 1
    },
    {
      // The supplier the PO names acknowledges the request.
      id: 't_pocancel_acknowledge',
      from: ['Requested'],
      to: 'Acknowledged',
      trigger: 'user',
      requiredRole: 'pocancel:acknowledge',
      requiredFields: [],
      policyHooks: [],
      surfaceable: { surfaced: true },
      version: 1
    }
  ]
};
