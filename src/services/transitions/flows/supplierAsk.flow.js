// ────────────────────────────────────────────────────────────────────────────
// "Ask supplier" — a hub ask (INV-D9; Inventory UX S-04, P-02, P-03, P-05,
// P-07; the ask half of INV-D8).
//
// PTI's planner asks one supplier one question about one subject — a material
// it supplies, or a capacity planning group and week. The ask shows on the
// supplier's To do and Stock page; the supplier answers in the hub (text and
// an optional date); PTI closes it, or withdraws it while it is still open.
// No email (BL-26): PTI may share the hub link on WhatsApp, outside the verb.
//
//   Open ──answer──▶ Answered ──close──▶ Closed
//     └──withdraw──▶ Withdrawn
//
// Every act is appended to the ask's history; nothing earlier is overwritten
// (RFX-R3). `entityId` is the ask id (`ask-0001`), minted by the store.
// ────────────────────────────────────────────────────────────────────────────

/** @import { FlowDefinition } from '../schema' */
import { POLICY_HOOKS } from '../policyHooks';

/** @type {FlowDefinition} */
export const supplierAskFlow = {
  entity: 'supplierAsk',
  version: 1,
  states: ['Open', 'Answered', 'Closed', 'Withdrawn'],
  initial: 'Open',
  /** A closed or withdrawn ask is history; a new question is a new ask. */
  terminals: ['Closed', 'Withdrawn'],
  transitions: [
    {
      // PTI asks. The subject (material, or planning group and week) is
      // checked against what the supplier supplies by the policy hook.
      id: 't_supplierask_raise',
      from: [],
      to: 'Open',
      trigger: 'creation',
      requiredRole: 'supplierask:raise',
      requiredFields: ['supplierId', 'topic', 'question'],
      policyHooks: [POLICY_HOOKS.SUPPLIER_ASK_RAISABLE],
      surfaceable: { surfaced: true },
      version: 1
    },
    {
      // The supplier the ask names answers it, with an optional date.
      id: 't_supplierask_answer',
      from: ['Open'],
      to: 'Answered',
      trigger: 'user',
      requiredRole: 'supplierask:answer',
      requiredFields: ['answer'],
      policyHooks: [POLICY_HOOKS.SUPPLIER_ASK_ANSWERABLE],
      surfaceable: { surfaced: true },
      version: 1
    },
    {
      // PTI has read the answer and closes the ask.
      id: 't_supplierask_close',
      from: ['Answered'],
      to: 'Closed',
      trigger: 'user',
      requiredRole: 'supplierask:close',
      requiredFields: [],
      policyHooks: [],
      surfaceable: { surfaced: true },
      version: 1
    },
    {
      // PTI no longer needs the answer.
      id: 't_supplierask_withdraw',
      from: ['Open'],
      to: 'Withdrawn',
      trigger: 'user',
      requiredRole: 'supplierask:close',
      requiredFields: [],
      policyHooks: [],
      surfaceable: { surfaced: true },
      version: 1
    }
  ]
};
