// ────────────────────────────────────────────────────────────────────────────
// UCX-P7 (BL-368) · UCX-D22 — THE ESCALATED PO AND PTI'S DECISION.
//
// `Escalated` is DERIVED, never stored: `poResponseProjection.isEscalated` is
// true while the PO awaits the supplier's answer and its response deadline has
// passed (`SENT` / `VIEWED` / `ACKNOWLEDGED`). Law 0.5 forbids writing it.
//
// What was missing is the RECORD of what PTI did (UCX-F1, a Blocker: two dead
// buttons, no verb, no record). This module fixes the vocabulary: the four
// decisions UCX-D22 rules, the verb that records each one, and the PO state
// that decision takes the order to. An order leaves the Escalated projection
// only through one of these recorded decisions or the supplier's own answer.
//
// ⚠️ **"STILL WAITING" RECORDS AND MOVES NOTHING.** The supplier has not
// answered and the order still needs one, so the PO stays in its awaiting
// state; the record is what tells the planner (and the next reader) that PTI
// looked and chose to wait. Pretending otherwise — a state that hides the
// open question — was the defect this proposal exists to close.
// ────────────────────────────────────────────────────────────────────────────

/** @import { POStatus } from '@services/data/types' */

/**
 * The four decisions on an escalated PO (UCX-D22, ruled 2026-11-25).
 * @typedef {'supplierConfirmedOutside' | 'sourcingElsewhere' | 'cancellingInSap' | 'stillWaiting'} PoEscalationDecision
 */

/** @type {readonly PoEscalationDecision[]} */
export const PO_ESCALATION_DECISIONS = Object.freeze(
  /** @type {PoEscalationDecision[]} */ ([
    'supplierConfirmedOutside',
    'sourcingElsewhere',
    'cancellingInSap',
    'stillWaiting'
  ])
);

/**
 * The verb that records each decision. The ids are the flows' transition ids:
 * the page sends the one its select names, so the code path is the decision.
 * @type {Readonly<Record<PoEscalationDecision, string>>}
 */
export const PO_ESCALATION_VERB = Object.freeze({
  supplierConfirmedOutside: 't_po_escalation_supplier_confirmed',
  sourcingElsewhere: 't_po_escalation_sourcing_elsewhere',
  cancellingInSap: 't_po_escalation_cancelled_in_sap',
  stillWaiting: 't_po_escalation_still_waiting'
});

/**
 * Where a decision takes the PO. `null` records the decision and moves nothing
 * ("still waiting": the supplier still owes an answer).
 * @type {Readonly<Record<PoEscalationDecision, POStatus | null>>}
 */
export const PO_ESCALATION_TO = Object.freeze({
  supplierConfirmedOutside: /** @type {POStatus} */ ('Confirmed'),
  sourcingElsewhere: /** @type {POStatus} */ ('Rejected'),
  cancellingInSap: /** @type {POStatus} */ ('Closed'),
  stillWaiting: null
});

/**
 * The states a PO can be escalated FROM — the awaiting-response states.
 * @type {readonly POStatus[]}
 */
export const PO_ESCALATION_FROM = Object.freeze(
  /** @type {POStatus[]} */ (['Sent', 'Viewed', 'Acknowledged'])
);

/**
 * @param {unknown} value
 * @returns {value is PoEscalationDecision}
 */
export function isPoEscalationDecision(value) {
  return (
    typeof value === 'string' &&
    PO_ESCALATION_DECISIONS.includes(/** @type {PoEscalationDecision} */ (value))
  );
}

/**
 * The refusal for a decision the ruled set does not hold, or null.
 * @param {unknown} decision
 * @returns {string | null}
 */
export function escalationDecisionRefusal(decision) {
  return isPoEscalationDecision(decision)
    ? null
    : `ESCALATION_DECISION_UNKNOWN: choose one of ${PO_ESCALATION_DECISIONS.join(', ')}`;
}
