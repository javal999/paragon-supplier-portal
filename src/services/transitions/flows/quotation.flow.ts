// ────────────────────────────────────────────────────────────────────────────
// Quotation flow — v2.2 Step 4 batch (iv).
//
// The supplier's response to an RFQ. Its award and reject transitions are the
// CASCADE TARGETS of `t_rfq_award` (build plan line 91): on award, the winning
// quotation fires `t_quotation_award` and every other fires `t_quotation_reject`
// — driven by the dispatcher cascade, one event per transition (each correlatable
// to the source award via `causationId`, DR-10). RFx C2: cancelling an award
// fires `t_quotation_reinstate` the same way, back to Under Review.
//
// `t_quotation_submit` (creation, supplier) + `t_quotation_review` (buyer) are
// AUTHORED-UNWIRED this batch — the supplier quote-submit verb lands in its own
// batch; here we wire only the award-path (award + reject). `states` lists
// transition-states only.
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';
import { POLICY_HOOKS } from '../policyHooks';

export const quotationFlow: FlowDefinition = {
  entity: 'quotation',
  version: 1,
  states: ['Submitted', 'Under Review', 'Awarded', 'Rejected'],
  initial: 'Submitted',
  /**
   * PF-0 · D-2 — both cascade outcomes WERE endings. RFx C2 (AR-06): a
   * cancelled award reinstates the quotes it decided (`t_quotation_reinstate`,
   * Awarded or Rejected → Under Review), so neither is final any more and the
   * machine declares no ending.
   */
  terminals: [],
  transitions: [
    {
      // Supplier submits a quotation against an invited RFQ. Creation-shape
      // (store-assigned number). WIRED in Task 3b. The required floor is the
      // rfqId + the two facts that make an offer COMPARABLE — what it costs and
      // when it arrives.
      //
      // `leadTimeDays` briefly left this floor in 2e-b-1 and is RESTORED in
      // 2e-b-1a (operator ruling, commercial): a price with no delivery promise
      // is an INCOMPLETE bid, and ranking it on price alone hides the delivery
      // risk that can make the cheapest quote the worst outcome. The reason it
      // was removed — that requiring it pushed suppliers to put *something* in
      // the box, which a `|| 0` then turned into a governed promise — is now
      // answered at the input instead: the box refuses what it cannot read
      // rather than defaulting it.
      id: 't_quotation_submit',
      from: [],
      to: 'Submitted',
      trigger: 'creation',
      requiredRole: 'quotation:submit',
      // `currency` joins the floor in 2e-c-2. A price is a number AND a
      // currency; requiring the number alone let an EUR 3.00 bid be minted as a
      // rupiah 3. Required rather than defaulted, because defaulting is what
      // silently made every foreign bid domestic in the first place.
      requiredFields: ['rfqId', 'unitPrice', 'leadTimeDays', 'currency'],
      // Membership, not merely presence: `requiredFields` only proves the field
      // is non-empty, so without this an arbitrary token ('CNY', 'Rp', 'usd')
      // would satisfy the floor and be stored as a currency nobody permits.
      //
      // REQ-E03-03 AC-05 / BR-05 — the response deadline is enforced HERE and
      // not on the screen. A closed window that only greys a button out is a
      // window any hand-made dispatch walks through, and a quote accepted after
      // the deadline is a quote the other bidders never had the chance to beat.
      // The deadline in force is the invitee's own extension when the buyer
      // granted one, so extending for two suppliers does not reopen the event.
      policyHooks: [
        POLICY_HOOKS.QUOTATION_SUBMIT_CURRENCY_PERMITTED,
        POLICY_HOOKS.QUOTATION_SUBMIT_BEFORE_DEADLINE,
        POLICY_HOOKS.QUOTATION_LINES_WELL_FORMED,
        // RFx spec 2026-09-21 — the tiered quote, per item and per break.
        POLICY_HOOKS.QUOTATION_TIERED_WELL_FORMED,
        // NR-1 BR-03 to BR-05 — the requested documents and the file limits.
        POLICY_HOOKS.QUOTATION_DOCUMENTS_COMPLETE,
      ],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // REQ-E03-05 BR-03 — a REVISED quote inside a negotiation round. A
      // CREATION verb, not an edit: every version is kept and viewable by the
      // buyer (AC-03), so revising mints a new quotation that names the one it
      // supersedes. The superseded version is not deleted and not relabelled.
      //
      // Its guard is the one BR-03 exists for: ONLY A SUPPLIER INVITED TO THE
      // ROUND MAY SUBMIT. Membership of the RFQ is not enough — the shortlist
      // is the whole point of a round.
      id: 't_quotation_revise',
      from: [],
      to: 'Submitted',
      trigger: 'creation',
      requiredRole: 'quotation:submit',
      requiredFields: ['roundId', 'rfqId', 'unitPrice', 'leadTimeDays', 'currency'],
      policyHooks: [
        POLICY_HOOKS.QUOTATION_SUBMIT_CURRENCY_PERMITTED,
        POLICY_HOOKS.QUOTATION_REVISE_IN_ROUND,
        POLICY_HOOKS.QUOTATION_LINES_WELL_FORMED,
        // RFx spec 2026-09-21 — the tiered quote, per item and per break.
        POLICY_HOOKS.QUOTATION_TIERED_WELL_FORMED,
        // NR-1 BR-09 — a revised quote carries files, so the requested
        // documents and the file limits are judged as on submit (B4).
        POLICY_HOOKS.QUOTATION_DOCUMENTS_COMPLETE,
      ],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // Buyer moves a submitted quote into evaluation. WIRED in Task 3b.
      id: 't_quotation_review',
      from: ['Submitted'],
      to: 'Under Review',
      trigger: 'user',
      requiredRole: 'quotation:review',
      requiredFields: [],
      policyHooks: [],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // CASCADE TARGET (this batch, WIRED) — the winning quote on RFQ award.
      id: 't_quotation_award',
      from: ['Submitted', 'Under Review'],
      to: 'Awarded',
      trigger: 'cascade',
      requiredRole: 'quotation:award',
      requiredFields: [],
      policyHooks: [],
      surfaceable: {
        surfaced: false,
        because: 'computed',
        why:
          'A consequence of the buyer awarding the RFQ (cascade). The buyer ' +
          'acted once; this is the fan-out.',
      },
      version: 1,
    },
    {
      // CASCADE TARGET (this batch, WIRED) — every non-winning quote on RFQ award.
      id: 't_quotation_reject',
      from: ['Submitted', 'Under Review'],
      to: 'Rejected',
      trigger: 'cascade',
      requiredRole: 'quotation:reject',
      requiredFields: [],
      policyHooks: [],
      surfaceable: {
        surfaced: false,
        because: 'computed',
        why:
          'A consequence of the buyer awarding the RFQ (cascade). Losing ' +
          'quotes are not rejected one by one.',
      },
      version: 1,
    },
    {
      // RFx C2 (AR-06) — CASCADE TARGET of an award cancel
      // (`t_rfq_award_cancel` / `_partial`): the mirror of award and reject.
      // A quote the cancelled award named goes back to Under Review, and so do
      // the quotes a cancelled FINAL award rejected. Its atom sits in
      // `AUTOMATION_ATOMS` only: no person holds a quote-reinstating atom.
      id: 't_quotation_reinstate',
      from: ['Awarded', 'Rejected'],
      to: 'Under Review',
      trigger: 'cascade',
      requiredRole: 'quotation:reinstate',
      requiredFields: [],
      policyHooks: [],
      surfaceable: {
        surfaced: false,
        because: 'computed',
        why:
          'A consequence of the buyer cancelling an award (cascade). The ' +
          'quotes that award decided go back to evaluation in one act.',
      },
      version: 1,
    },
  ],
};
