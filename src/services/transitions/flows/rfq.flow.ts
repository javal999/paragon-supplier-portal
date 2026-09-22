// ────────────────────────────────────────────────────────────────────────────
// Request-for-Quotation (RFQ) flow — v2.2 Step 4 batch (iv).
//
// The buyer-side sourcing machine. `t_rfq_award` is the CASCADE-CLASS verb
// (build plan line 91): awarding an RFQ fans out onto its quotations — the
// winner → Awarded, every other → Rejected — through the dispatcher's cascade
// mechanism (NOT N ad-hoc hook calls). The cascade LINKS live in `cascades.ts`;
// the mock adapter resolves WHICH quotation ids (winner from the payload, losers
// from the store). Award mints NO SAP artifact (no PO, no contract) — it records
// award metadata only; a `done` cascade, never a sapBoundary verb.
//
// Neighbors: publish / cancel / reopen are WIRED (publish since PF-1a); close
// stays authored-unwired until the sourcing boundary lands.
// `states` lists transition-states only (no clock-derived display states).
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';
import { POLICY_HOOKS } from '../policyHooks';

/**
 * The fields an RFQ is not an RFQ without. ONE list, read by the create verb
 * and by the revise-draft verb (BL-93), so an edit can never save a draft the
 * create verb would have refused, and the two cannot drift.
 */
const RFQ_CONTENT_FIELDS: readonly string[] = ['title', 'materialCategory', 'totalQty'];

export const rfqFlow: FlowDefinition = {
  entity: 'rfq',
  version: 1,
  states: ['Draft', 'Open', 'Closed', 'Awarded', 'Cancelled'],
  initial: 'Draft',
  /** PF-0 · D-2 — an awarded or cancelled RFQ is done. */
  terminals: ['Awarded', 'Cancelled'],
  transitions: [
    {
      // CREATION verb (Phase A/2, WIRED). Buyer raises a sourcing event. Mirrors
      // t_pr_create's creation shape (creation-class member, not a new event
      // category).
      //
      // ⚠️ PF-1a · D-1 (OPERATOR) — BIRTHS AT `Draft`, AND THIS REVERSES FORK-2B.
      // Paragon's practice is DRAFT → REVIEW → PUBLISH. FORK-2B had minted
      // directly into Open (create+publish as ONE buyer action, matching the
      // prior wizard's output), which left `initial: 'Draft'` contradicting this
      // very edge, `Draft` unreachable, and `t_rfq_publish` UNFIREABLE SINCE THE
      // DAY IT WAS AUTHORED (PF-0: `PF0-RFQ-DRAFT-DEAD-01`).
      //
      // This COMPLETES A CAPABILITY THE FLOW AUTHOR SPECIFIED AND THE CREATION
      // PATH BYPASSED. It does not build a new one: publish, the Draft branch of
      // cancel, and the declared initial were all already written and
      // role-gated. What changed is the one value that made them unreachable.
      // This is the dispatcher path that
      // RETIRES the `extraRfqs` client-fabrication anti-pattern (C6 §1): the RFQ
      // is store-minted with a store-assigned number, never a fabricated peer.
      //
      // `totalQty` joined the required floor in CP-0 2e-b-4a, mirroring
      // `t_pr_create`'s `['material', 'quantity']` and
      // `t_inventorydeclaration_declare`'s `['materialCode', 'totalQty']`: the
      // quantity being sourced is what makes the event ANSWERABLE, and it is the
      // multiplicand of every quotation's `totalPrice`. An absent quantity now
      // fails MISSING_FIELDS instead of being minted as a silent 0 — the second
      // lock behind `normalizeRfqCreateDraft`, so even a hand-crafted dispatch
      // that skips the wizard cannot raise a quantity-less RFQ. `isEmpty` treats
      // only undefined/null/'' as missing, so a TYPED zero still dispatches: this
      // gate rules on absence, never on value.
      id: 't_rfq_create',
      from: [],
      to: 'Draft',
      trigger: 'creation',
      requiredRole: 'rfq:create',
      requiredFields: [...RFQ_CONTENT_FIELDS],
      // The rebuilt RFQ (items, quantity breaks, currency) is judged here, BY
      // NAME, when it is sent. See `rfqModel.rfqCreateRefusal`.
      policyHooks: [POLICY_HOOKS.RFQ_CREATE_VALID],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // BL-93 — the buyer edits a DRAFT RFQ: every stored field, replaced by the
      // wizard's whole payload. STATE-PRESERVING and legal from `Draft` ONLY, so
      // an RFQ already sent is refused by name (ILLEGAL_TRANSITION) rather than
      // rewritten under the suppliers quoting it. Same atom as create (CE-06: a
      // seat that may draft may finish its draft without being able to send it),
      // same required fields and the SAME `rfq_create_valid` hook, reused.
      // Callers pass `expectedState: 'Draft'`, so a draft somebody else sent in
      // the meantime is refused STALE_STATE and not overwritten. The target
      // appends WHO and WHEN to `revisions` (CE-08). It never cascades: the
      // requisition an RFQ was raised from is linked once, at create.
      id: 't_rfq_revise_draft',
      from: ['Draft'],
      to: 'Draft',
      statePreserving: true,
      trigger: 'user',
      requiredRole: 'rfq:create',
      requiredFields: [...RFQ_CONTENT_FIELDS],
      policyHooks: [POLICY_HOOKS.RFQ_CREATE_VALID],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // Buyer publishes a drafted RFQ to its invited suppliers.
      //
      // ⚠️ PF-1a — WIRED, and it is the verb that now makes a sourcing event
      // VISIBLE. Supplier RFQ reads exclude `Draft` (`MockProcurementService.
      // getRFQs`), so publication is the act that exposes the event to the
      // invited list rather than a status relabel. Unfireable from the day it
      // was authored until D-1 moved creation to `Draft`.
      id: 't_rfq_publish',
      from: ['Draft'],
      to: 'Open',
      trigger: 'user',
      requiredRole: 'rfq:publish',
      requiredFields: [],
      policyHooks: [],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // Response window ends (a Paragon-side boundary event, not a clock state).
      // Authored-unwired until the sourcing boundary lands.
      id: 't_rfq_close',
      from: ['Open'],
      to: 'Closed',
      trigger: 'system',
      requiredRole: 'rfq:close',
      requiredFields: [],
      policyHooks: [],
      surfaceable: {
        surfaced: false,
        because: 'computed',
        why:
          'The award deadline elapsing. Nobody initiates it; law 0.5 forbids ' +
          'a `clock` trigger, so it is modelled `system` — and nothing fires ' +
          'it today, which is why the surface offers Award from Open AND ' +
          'Closed.',
      },
      version: 1,
    },
    {
      // CASCADE SOURCE (this batch, WIRED). Buyer awards the RFQ to a chosen
      // quotation; the cascade fans out onto the quotations (winner + losers).
      // requiredFields carry the award decision — set as metadata ONLY (no PO /
      // contract minted, honest-by-construction).
      //
      // ⚠️ **REQ-E03-05 BR-06 WIDENED IT TO A SPLIT WITHOUT CHANGING ITS
      // FLOOR.** `awardedQuotationId` / `awardedSupplierId` still name the
      // PRINCIPAL award — the cascade reads them to pick the winner — and an
      // optional `awardLines` carries the rest of the split. A single-supplier
      // award is therefore byte-identical to what it was, and a two-supplier
      // award is the same verb with one more field, rather than a second award
      // verb that could drift from this one.
      id: 't_rfq_award',
      from: ['Open', 'Closed'],
      to: 'Awarded',
      trigger: 'user',
      requiredRole: 'rfq:award',
      requiredFields: ['awardedQuotationId', 'awardedSupplierId'],
      policyHooks: [POLICY_HOOKS.RFQ_AWARD_GOVERNED],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // REQ-E03-03 BR-05 — the buyer extends the response window, for every
      // invitee or for named ones. STATE-PRESERVING for the reason the FX pin
      // below is: moving a date is not a step in the sourcing machine, and a
      // state for it would make `Open` mean two different things.
      id: 't_rfq_extend',
      from: ['Open', 'Closed'],
      to: 'Open',
      statePreserving: true,
      trigger: 'user',
      requiredRole: 'rfq:publish',
      requiredFields: ['deadline'],
      policyHooks: [POLICY_HOOKS.RFX_EXTEND_VALID],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // CP-0 · 2e-c-3 — the buyer RECORDS the FX basis a multi-currency
      // comparison is ranked against. WIRED.
      //
      // STATE-PRESERVING: pinning a rate is not a step in the sourcing machine.
      // It is legal from Open AND Closed — `t_rfq_award` is legal from both, so
      // a comparison (and therefore a pin) must be too, and a Closed RFQ with
      // foreign bids would otherwise be permanently unrankable.
      //
      // A DISPATCHED VERB rather than a store write, because D-1 requires every
      // pin to land in the DR-10 trail: the basis a contract was awarded on is
      // exactly the kind of fact an audit asks about later. It carries a role of
      // its own (`rfq:fx-pin`, not `rfq:award`) — recording the basis and
      // choosing the winner are different authorities, and collapsing them would
      // let anyone who may compare also decide.
      //
      // The D-1 FREEZE is structural in the TARGET, not here: `applyTransition`
      // APPENDS to `fxPins` and has no update path, so a superseding rate is a
      // new entry and the prior basis is preserved by construction.
      id: 't_rfq_fx_pin',
      from: ['Open', 'Closed'],
      to: 'Open',
      statePreserving: true,
      trigger: 'user',
      requiredRole: 'rfq:fx-pin',
      // `rate` and `asOf` are the fact; `quote` says what it converts; `source`
      // says who says so. A rate without provenance is a number a buyer would
      // have to take on faith, and MANUAL vs SAP_EXHGRATE is precisely the
      // distinction an auditor cares about.
      requiredFields: ['quote', 'rate', 'asOf', 'source'],
      policyHooks: [POLICY_HOOKS.RFQ_FX_PIN_WELL_FORMED],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // Buyer cancels a sourcing event before award. Authored-unwired.
      id: 't_rfq_cancel',
      from: ['Draft', 'Open', 'Closed'],
      to: 'Cancelled',
      trigger: 'user',
      requiredRole: 'rfq:cancel',
      requiredFields: [],
      policyHooks: [],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // Buyer reopens a closed RFQ for further responses. Authored-unwired.
      id: 't_rfq_reopen',
      from: ['Closed'],
      to: 'Open',
      trigger: 'user',
      requiredRole: 'rfq:reopen',
      requiredFields: [],
      policyHooks: [],
      surfaceable: { surfaced: true },
      version: 1,
    },
  ],
};
