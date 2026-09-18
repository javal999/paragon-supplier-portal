// ────────────────────────────────────────────────────────────────────────────
// RFI response flow — REQ-E03-02 (the supplier's side).
//
// TWO STATES, AND THE SPLIT IS THE REQUIREMENT. A partial answer is kept as a
// DRAFT and is invisible to the buyer until submitted (edge case), so "saved"
// and "sent" cannot be the same state — the same shape `requirementResponse`
// uses for a forecast commitment, for the same reason.
//
// The submit verb is where the required-question rule bites: a screen can grey
// a button out, only the verb can refuse the act (RFI_SUBMIT_COMPLETE).
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';
import { POLICY_HOOKS } from '../policyHooks';

export const rfiResponseFlow: FlowDefinition = {
  entity: 'rfiResponse',
  version: 1,
  states: ['Draft', 'Submitted'],
  initial: 'Draft',
  terminals: ['Submitted'],
  transitions: [
    {
      // Creation — the supplier's own verb, so the scope gate resolves the
      // owner from the payload and a cross-tenancy save is refused by name.
      id: 't_rfiresponse_save',
      from: [],
      to: 'Draft',
      trigger: 'creation',
      requiredRole: 'rfiresponse:answer',
      requiredFields: ['rfiId', 'supplierId'],
      policyHooks: [POLICY_HOOKS.RFX_RESPONSE_INVITED],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      id: 't_rfiresponse_submit',
      from: ['Draft'],
      to: 'Submitted',
      trigger: 'user',
      requiredRole: 'rfiresponse:answer',
      requiredFields: [],
      policyHooks: [POLICY_HOOKS.RFI_SUBMIT_COMPLETE],
      surfaceable: { surfaced: true },
      version: 1,
    },
  ],
};
