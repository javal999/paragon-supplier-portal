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
      policyHooks: [
        POLICY_HOOKS.RFX_RESPONSE_INVITED,
        POLICY_HOOKS.RFX_RESPONSE_ACCEPTANCE_GATE,
        // NR-1 BR-05 — a draft save checks the file limits only.
        POLICY_HOOKS.RFX_RESPONSE_DOCUMENTS_WITHIN_LIMITS,
        // NR-1 AC-07 — no upload, replace or delete after the deadline.
        POLICY_HOOKS.RFX_RESPONSE_WINDOW_OPEN,
        // NR-1 BR-08 — a Submitted response changes only through revise.
        POLICY_HOOKS.RFX_RESPONSE_NOT_SUBMITTED,
      ],
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
      policyHooks: [POLICY_HOOKS.RFP_SUBMIT_TERMS_ANSWERED, POLICY_HOOKS.RFX_RESPONSE_DOCUMENTS_COMPLETE],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // NR-1 BR-08 (D-6) — as `t_rfiresponse_revise`: state-preserving, the
      // revised proposal appended as the next version, judged by the submit
      // rules (a deviation still needs its comment) and refused
      // RESPONSE_DEADLINE_PASSED outside the window.
      id: 't_rfpresponse_revise',
      from: ['Submitted'],
      to: 'Submitted',
      statePreserving: true,
      trigger: 'user',
      requiredRole: 'rfpresponse:answer',
      requiredFields: [],
      policyHooks: [
        POLICY_HOOKS.RFX_RESPONSE_WINDOW_OPEN,
        POLICY_HOOKS.RFP_SUBMIT_TERMS_ANSWERED,
        POLICY_HOOKS.RFX_RESPONSE_DOCUMENTS_COMPLETE,
      ],
      surfaceable: { surfaced: true },
      version: 1,
    },
  ],
};
