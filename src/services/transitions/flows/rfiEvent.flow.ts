// ────────────────────────────────────────────────────────────────────────────
// RFI event flow — REQ-E03-02.
//
// The buyer's capability questionnaire. It has the SAME lifecycle as an RFQ
// (Draft → Open → Closed, cancellable before award) because it is the same act
// one question earlier: raise it, publish it to the invitees, collect answers,
// close the window. It is NOT a required step before an RFQ or RFP (BR-03), so
// nothing downstream reads it as a precondition.
//
// `t_rfi_extend` is STATE-PRESERVING: extending the response window for all or
// for selected invitees (edge case) does not move the event through its
// machine, and modelling it as a state would make "Open" mean two things.
// The deadline itself is data; whether it has PASSED is derived at read from
// the clock (law 0.5) and never stored.
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';
import { POLICY_HOOKS } from '../policyHooks';

/**
 * The fields a RFI is not a RFI without. ONE list, read by the
 * create verb and by the revise-draft verb (BL-93), so an edit can never save a
 * draft the create verb would have refused, and the two cannot drift.
 */
const RFI_CONTENT_FIELDS: readonly string[] = ['title', 'templateId', 'materialCategory', 'responseDeadline'];

export const rfiEventFlow: FlowDefinition = {
  entity: 'rfiEvent',
  version: 1,
  states: ['Draft', 'Open', 'Closed', 'Cancelled'],
  initial: 'Draft',
  terminals: ['Cancelled'],
  transitions: [
    {
      // Creation. The buyer starts from a category template and may add or
      // remove questions for this one event; the event carries its OWN question
      // list from birth, so a later edit to the template never rewrites history.
      id: 't_rfi_create',
      from: [],
      to: 'Draft',
      trigger: 'creation',
      requiredRole: 'rfi:create',
      requiredFields: [...RFI_CONTENT_FIELDS],
      policyHooks: [POLICY_HOOKS.RFI_CREATE_VALID],
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
      id: 't_rfi_revise_draft',
      from: ['Draft'],
      to: 'Draft',
      statePreserving: true,
      trigger: 'user',
      requiredRole: 'rfi:create',
      requiredFields: [...RFI_CONTENT_FIELDS],
      policyHooks: [POLICY_HOOKS.RFI_CREATE_VALID],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // Publication is what makes the event visible to its invitees — the same
      // rule `t_rfq_publish` carries, and the read filters a Draft out.
      id: 't_rfi_publish',
      from: ['Draft'],
      to: 'Open',
      trigger: 'user',
      requiredRole: 'rfi:publish',
      requiredFields: [],
      policyHooks: [POLICY_HOOKS.RFX_PUBLISH_HAS_INVITEES, POLICY_HOOKS.RFX_INVITEES_QUALIFIED],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // REQ-E03-02 edge case — the buyer extends the response window, for every
      // invitee or for named ones.
      id: 't_rfi_extend',
      from: ['Open', 'Closed'],
      to: 'Open',
      statePreserving: true,
      trigger: 'user',
      requiredRole: 'rfi:publish',
      requiredFields: ['deadline'],
      policyHooks: [POLICY_HOOKS.RFX_EXTEND_VALID],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      id: 't_rfi_close',
      from: ['Open'],
      to: 'Closed',
      trigger: 'user',
      requiredRole: 'rfi:publish',
      requiredFields: [],
      policyHooks: [],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      id: 't_rfi_cancel',
      from: ['Draft', 'Open', 'Closed'],
      to: 'Cancelled',
      trigger: 'user',
      requiredRole: 'rfi:publish',
      requiredFields: [],
      policyHooks: [],
      surfaceable: { surfaced: true },
      version: 1,
    },
  ],
};
