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
  // RFx D2 (NR-2 BR-05, NR-3 BR-06) — an RFP is awarded per option on firm
  // offers: `Partly awarded` while an option of a closed firm-offer round is
  // still open, `Awarded` when every one is settled. Neither is a terminal:
  // an award can be cancelled until it is marked "Raised in SAP" (D-7).
  states: ['Draft', 'Open', 'Closed', 'Partly awarded', 'Awarded', 'Cancelled'],
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
      // RFx D2 (NR-2 BR-01, BR-05 to BR-08; NR-3 BR-01 to BR-08) — the FINAL
      // award of an RFP: every option of its closed firm-offer rounds is
      // settled (awarded now or earlier, sourced by an RFQ, or named in
      // `notAwardedItems`). Each line names an option by ref and the supplier's
      // firm offer in force on it (never a quote), at one quantity point of the
      // round; a reason is always required (NR-2 BR-06) and CR-23 is checked
      // for every awarded supplier (BR-07). The C1 shape rule judges the split.
      // NO CASCADE: the suppliers' RFP responses stay Submitted, and each
      // responder's outcome is DERIVED from the award read (NR-2 BR-09).
      //
      // BL-130 (REQ-E03-04 BR-16f) — a final award may carry NO lines when it
      // only marks the options left open on a Partly awarded RFP "Will not
      // award", as `t_rfq_award` may. So `awardLines` is not a required field
      // here: the policy decides, and refuses AWARD_EMPTY in every other case.
      id: 't_rfp_award',
      from: ['Closed', 'Partly awarded'],
      to: 'Awarded',
      trigger: 'user',
      requiredRole: 'rfp:award',
      // The reason is judged by the policy (AWARD_REASON_REQUIRED), so a blank
      // one is refused by name rather than as a missing field.
      requiredFields: [],
      policyHooks: [POLICY_HOOKS.RFP_AWARD_GOVERNED],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // RFx D2 — the PARTIAL award, as the RFQ's pair: some options now, the
      // rest later. Same role, fields and ONE policy hook as the final award;
      // refuses AWARD_NOTHING_OPEN when it would settle every option.
      id: 't_rfp_award_partial',
      from: ['Closed', 'Partly awarded'],
      to: 'Partly awarded',
      trigger: 'user',
      requiredRole: 'rfp:award',
      requiredFields: ['awardLines'],
      policyHooks: [POLICY_HOOKS.RFP_AWARD_GOVERNED],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // RFx D2 (NR-3 BR-09, D-7) — cancelling an RFP award with a reason until
      // it is marked "Raised in SAP"; the full cancel (no other award of the
      // RFP stays in force) returns the RFP to Closed. The cancellation is
      // APPENDED (AR-08); the award record is kept. Its own atom, apart from
      // `rfp:award` (D-5), mirroring `t_rfq_award_cancel`.
      id: 't_rfp_award_cancel',
      from: ['Awarded', 'Partly awarded'],
      to: 'Closed',
      trigger: 'user',
      requiredRole: 'rfp:award-cancel',
      requiredFields: ['awardId'],
      policyHooks: [POLICY_HOOKS.RFP_AWARD_CANCEL_GOVERNED],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // RFx D2 — the PARTIAL cancel: another award of the RFP stays in force,
      // so the RFP is `Partly awarded` afterwards. One policy with the full
      // cancel, which refuses AWARD_CANCEL_TARGET_WRONG for the wrong verb.
      id: 't_rfp_award_cancel_partial',
      from: ['Awarded', 'Partly awarded'],
      to: 'Partly awarded',
      trigger: 'user',
      requiredRole: 'rfp:award-cancel',
      requiredFields: ['awardId'],
      policyHooks: [POLICY_HOOKS.RFP_AWARD_CANCEL_GOVERNED],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // RFx D2 (NR-2 BR-10, NR-3 BR-10) — the buyer marks an RFP award "Raised
      // in SAP" with the SAP document number it typed. STATE-PRESERVING, as the
      // RFQ's: recording a fact about one award is not a step in the machine.
      id: 't_rfp_award_sap_raised',
      from: ['Awarded', 'Partly awarded'],
      to: 'Awarded',
      statePreserving: true,
      trigger: 'user',
      requiredRole: 'rfp:award-sap',
      requiredFields: ['awardId', 'sapDocumentNo'],
      policyHooks: [POLICY_HOOKS.RFP_AWARD_SAP_GOVERNED],
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
