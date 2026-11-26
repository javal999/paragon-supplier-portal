// ────────────────────────────────────────────────────────────────────────────
// Receipt discrepancy response flow — REQ-E07-06 (goods receipt confirmation).
//
// A goods receipt that differs from its ASN, or that had quantity rejected at
// PTI's inspection, carries a DISCREPANCY. Whether it does is derived at read
// time from the receipt and the ASN (`fulfilmentRules.js`) and is never a state
// here. What this machine records is the conversation about it:
//
//   · the supplier ACKNOWLEDGES it, or DISPUTES it — both with a comment
//     (AC-03). Either answer is a `creation`: the response record does not exist
//     until the supplier gives one, and it is keyed by the receipt it answers,
//     so a receipt can be answered once.
//   · PTI's planner RESOLVES a dispute with a comment.
//
// The receipt itself is untouched: its inspection lifecycle (goodsReceipt.flow)
// and this conversation are separate axes, the same split as invoice × match.
// ────────────────────────────────────────────────────────────────────────────

/** @import { FlowDefinition } from '../schema' */
import { POLICY_HOOKS } from '../policyHooks';

/** @type {FlowDefinition} */
export const receiptDiscrepancyFlow = {
  entity: 'receiptDiscrepancy',
  version: 1,
  states: ['Acknowledged', 'Disputed', 'Resolved'],
  initial: 'Acknowledged',
  /** An acknowledged difference needs nothing more; a resolved dispute is done.
   *  A dispute is the one state with an exit. */
  terminals: ['Acknowledged', 'Resolved'],
  transitions: [
    {
      id: 't_receiptdiscrepancy_acknowledge',
      from: [],
      to: 'Acknowledged',
      trigger: 'creation',
      requiredRole: 'receiptdiscrepancy:respond',
      requiredFields: ['receiptId', 'comment'],
      policyHooks: [POLICY_HOOKS.RECEIPT_DISCREPANCY_ANSWERABLE],
      surfaceable: { surfaced: true },
      version: 1
    },
    {
      id: 't_receiptdiscrepancy_dispute',
      from: [],
      to: 'Disputed',
      trigger: 'creation',
      requiredRole: 'receiptdiscrepancy:respond',
      requiredFields: ['receiptId', 'comment'],
      policyHooks: [POLICY_HOOKS.RECEIPT_DISCREPANCY_ANSWERABLE],
      surfaceable: { surfaced: true },
      version: 1
    },
    {
      id: 't_receiptdiscrepancy_resolve',
      from: ['Disputed'],
      to: 'Resolved',
      trigger: 'user',
      requiredRole: 'receiptdiscrepancy:resolve',
      requiredFields: ['resolutionComment', 'resolution'],
      policyHooks: [POLICY_HOOKS.RECEIPT_DISCREPANCY_RESOLUTION_AUTHORED],
      surfaceable: { surfaced: true },
      version: 1
    }
  ]
};
