// ────────────────────────────────────────────────────────────────────────────
// RFQ confidentiality flow — the terms a confidential RFQ is read under (RFx
// working spec, 2026-09-21, "Supplier response · Confidentiality gate").
//
// A confidential RFQ's spec values, item notes and attachments are withheld
// from a supplier until it accepts the terms. The acceptance is recorded once,
// with its time, and the READ reveals the content from then on
// (`rfqResponse.maskConfidential`). A single-state record: an acceptance has no
// lifecycle, it happened or it did not.
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';
import { POLICY_HOOKS } from '../policyHooks';

export const rfqConfidentialityFlow: FlowDefinition = {
  entity: 'rfqConfidentiality',
  version: 1,
  states: ['Accepted'],
  initial: 'Accepted',
  terminals: ['Accepted'],
  transitions: [
    {
      id: 't_rfqconfidentiality_accept',
      from: [],
      to: 'Accepted',
      trigger: 'creation',
      requiredRole: 'rfqconfidentiality:accept',
      requiredFields: ['rfqId', 'supplierId'],
      policyHooks: [POLICY_HOOKS.RFQ_CONFIDENTIALITY_ACCEPTABLE],
      surfaceable: { surfaced: true },
      version: 1,
    },
  ],
};
