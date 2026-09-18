// ────────────────────────────────────────────────────────────────────────────
// RFP response flow — REQ-E03-04 (the supplier's proposal).
//
// Draft / Submitted, for the reason the RFI response splits them: a half-filled
// terms table is not a proposal and PTI must not read it as one.
//
// The submit verb carries the rule this document exists for: a DEVIATION
// WITHOUT A COMMENT IS REFUSED. A proposal that says "we deviate" and nothing
// else changes what PTI would sign and says nothing about how — and a screen
// that merely marks the field red is a screen a hand-made dispatch walks past.
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';
import { POLICY_HOOKS } from '../policyHooks';

export const rfpResponseFlow: FlowDefinition = {
  entity: 'rfpResponse',
  version: 1,
  states: ['Draft', 'Submitted'],
  initial: 'Draft',
  terminals: ['Submitted'],
  transitions: [
    {
      id: 't_rfpresponse_save',
      from: [],
      to: 'Draft',
      trigger: 'creation',
      requiredRole: 'rfpresponse:answer',
      requiredFields: ['rfpId', 'supplierId'],
      policyHooks: [POLICY_HOOKS.RFX_RESPONSE_INVITED],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      id: 't_rfpresponse_submit',
      from: ['Draft'],
      to: 'Submitted',
      trigger: 'user',
      requiredRole: 'rfpresponse:answer',
      requiredFields: [],
      policyHooks: [POLICY_HOOKS.RFP_SUBMIT_TERMS_ANSWERED],
      surfaceable: { surfaced: true },
      version: 1,
    },
  ],
};
