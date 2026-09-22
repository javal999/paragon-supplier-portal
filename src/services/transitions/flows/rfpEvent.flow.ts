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

/**
 * The fields a RFP is not a RFP without. ONE list, read by the
 * create verb and by the revise-draft verb (BL-93), so an edit can never save a
 * draft the create verb would have refused, and the two cannot drift.
 */
const RFP_CONTENT_FIELDS: readonly string[] = ['title', 'materialCategory', 'responseDeadline'];

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
      requiredFields: [...RFP_CONTENT_FIELDS],
      policyHooks: [POLICY_HOOKS.RFP_CREATE_TERMS_KNOWN],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // BL-93 — the buyer edits a DRAFT: every stored field, replaced by the
      // wizard's whole payload. STATE-PRESERVING and legal from `Draft` ONLY, so
      // an event already sent is refused by name (ILLEGAL_TRANSITION) rather than
      // rewritten under the suppliers answering it. Same atom as create (CE-06:
      // a seat that may draft may finish its draft without being able to send
      // it), same required fields and the SAME policy hook, reused — not a copy.
      // Callers pass `expectedState: 'Draft'`, so a draft somebody else sent in
      // the meantime is refused STALE_STATE and not overwritten. The target
      // appends WHO and WHEN to `revisions` (CE-08).
      id: 't_rfp_revise_draft',
      from: ['Draft'],
      to: 'Draft',
      statePreserving: true,
      trigger: 'user',
      requiredRole: 'rfp:create',
      requiredFields: [...RFP_CONTENT_FIELDS],
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
