// ────────────────────────────────────────────────────────────────────────────
// RFP event flow — REQ-E03-04.
//
// The commercial-terms request. Same lifecycle as the RFI one file over, and
// deliberately a SEPARATE machine rather than one `sourcingEvent` flow with a
// type field: the two ask for different things, refuse different payloads
// (questions vs terms), and a shared machine would have to branch on the type
// inside every policy hook — which is how reading a guard stops telling you
// what it guards. An RFP is required neither before nor after an RFI or RFQ
// (BR-02).
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';
import { POLICY_HOOKS } from '../policyHooks';

export const rfpEventFlow: FlowDefinition = {
  entity: 'rfpEvent',
  version: 1,
  states: ['Draft', 'Open', 'Closed', 'Cancelled'],
  initial: 'Draft',
  terminals: ['Cancelled'],
  transitions: [
    {
      id: 't_rfp_create',
      from: [],
      to: 'Draft',
      trigger: 'creation',
      requiredRole: 'rfp:create',
      requiredFields: ['title', 'materialCategory', 'responseDeadline'],
      policyHooks: [POLICY_HOOKS.RFP_CREATE_TERMS_KNOWN],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      id: 't_rfp_publish',
      from: ['Draft'],
      to: 'Open',
      trigger: 'user',
      requiredRole: 'rfp:publish',
      requiredFields: [],
      policyHooks: [POLICY_HOOKS.RFX_PUBLISH_HAS_INVITEES],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      id: 't_rfp_extend',
      from: ['Open', 'Closed'],
      to: 'Open',
      statePreserving: true,
      trigger: 'user',
      requiredRole: 'rfp:publish',
      requiredFields: ['deadline'],
      policyHooks: [POLICY_HOOKS.RFX_EXTEND_VALID],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      id: 't_rfp_close',
      from: ['Open'],
      to: 'Closed',
      trigger: 'user',
      requiredRole: 'rfp:publish',
      requiredFields: [],
      policyHooks: [],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      id: 't_rfp_cancel',
      from: ['Draft', 'Open', 'Closed'],
      to: 'Cancelled',
      trigger: 'user',
      requiredRole: 'rfp:publish',
      requiredFields: [],
      policyHooks: [],
      surfaceable: { surfaced: true },
      version: 1,
    },
  ],
};
