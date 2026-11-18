// ────────────────────────────────────────────────────────────────────────────
// DA weekly confirmation — PSC-1 (BL-336), owner 2026-11-18.
//
// The supplier confirms the week's published demand anticipation ONCE, on the
// DA page: the SOH it confirms per material is the figure that pre-fills the
// stock page (PSC-1 BR-06). The stock page remains the single stock entry
// point — this record carries no stock declaration, and the stock verb is the
// only writer of one (REQ-E08-02 BR-09).
//
// A DEGENERATE SINGLE-STATE machine, the same shape as `feedstockConfirmation`
// and `capacitySubmission`: a confirmation is a snapshot of one supplier ×
// week, a changed week is a NEW record (append-only), and the one in force is
// the latest per supplier × week, derived at read. A carried-forward week
// writes NO record (PSC-1 BR-05): its state is derived from the absence of a
// record for that week beside an earlier one.
// ────────────────────────────────────────────────────────────────────────────

/** @import { FlowDefinition } from '../schema' */
import { POLICY_HOOKS } from '../policyHooks';

/** @type {FlowDefinition} */
export const daConfirmationFlow = {
  entity: 'daConfirmation',
  version: 1,
  states: ['Confirmed'],
  initial: 'Confirmed',
  /** A confirmation is superseded by a newer one, never changed. */
  terminals: ['Confirmed'],
  transitions: [
    {
      id: 't_daconfirmation_confirm',
      from: [],
      to: 'Confirmed',
      trigger: 'creation',
      requiredRole: 'da:confirm',
      // PSC-1 BR-10 — the record is per supplier × week; `soh` carries the
      // material figures the stock page is pre-filled with, and is never a
      // stock record (BR-06).
      requiredFields: ['supplierId', 'week', 'publicationId', 'soh'],
      policyHooks: [POLICY_HOOKS.DA_CONFIRMATION_VALID],
      surfaceable: { surfaced: true },
      version: 1
    }
  ]
};
