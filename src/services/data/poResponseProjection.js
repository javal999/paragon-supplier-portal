// ─────────────────────────────────────────────────────────────────────────────
// PURCHASE ORDER RESPONSE PROJECTION — REQ-E07-02, REQ-E07-03, REQ-E07-05.
//
// Everything here is DERIVED AT READ TIME from a stored PO and an instant the
// caller supplies. `Escalated` in particular is a clock projection: it is never
// a member of the purchase-order transition table and never written to a PO
// (law 0.5), exactly as `invoiceProjection.isOverdue` derives Overdue.
// ─────────────────────────────────────────────────────────────────────────────

/** @import { PurchaseOrder } from './types' */
import { POStatus } from './types';
/** @import { WorkingCalendar } from '@lib/workingCalendar' */
import { addWorkingDays, documentInstant } from '@lib/workingCalendar';
import { hubWorkingCalendar } from '../transitions/workingCalendarStore';

/** The supplier's response window (REQ-E07-02 BR-01, MN-ORD-04). */
export const RESPONSE_WORKING_DAYS = 1;

/**
 * States in which the supplier has not yet approved, adjusted or rejected.
 * @type {ReadonlySet<POStatus>}
 */
const AWAITING_RESPONSE = new Set([POStatus.SENT, POStatus.VIEWED, POStatus.ACKNOWLEDGED]);

/**
 * True while the PO waits for the supplier's Approve / Adjust / Reject.
 * @param {PurchaseOrder} po
 * @returns {boolean}
 */
export function isAwaitingResponse(po) {
  return AWAITING_RESPONSE.has(po.status);
}

/**
 * The instant the supplier must respond by: 1 working day after it was asked,
 * on the hub's calendar (BL-50 — an administrator's ruling moves it).
 * @param {Pick<PurchaseOrder, 'orderDate' | 'responseRequestedAt'>} po
 * @param {WorkingCalendar} [cal]
 * @returns {Date}
 */
export function responseDeadline(po, cal = hubWorkingCalendar()) {
  const askedAt = po.responseRequestedAt ?? po.orderDate;
  return addWorkingDays(documentInstant(askedAt, cal), RESPONSE_WORKING_DAYS, cal);
}

/**
 * Computed Escalated (BR-09): no response and the deadline has passed.
 * @param {PurchaseOrder} po
 * @param {string} nowIso
 * @returns {boolean}
 */
export function isEscalated(po, nowIso) {
  return isAwaitingResponse(po) && responseDeadline(po).getTime() < Date.parse(nowIso);
}

/**
 * A response recorded after its deadline (edge case: keep the lateness visible).
 * @param {PurchaseOrder} po
 * @returns {boolean}
 */
export function respondedLate(po) {
  if (!po.response) return false;
  return Date.parse(po.response.respondedAt) > responseDeadline(po).getTime();
}

/** The status word a PO shows: the stored state, or the computed Escalated. */
/** @typedef {POStatus | 'Escalated'} PoDisplayStatus */

/**
 * @param {PurchaseOrder} po
 * @param {string} nowIso
 * @returns {PoDisplayStatus}
 */
export function poDisplayStatus(po, nowIso) {
  if (isEscalated(po, nowIso)) return 'Escalated';
  return po.status;
}

// ── The three confirmations (REQUIREMENTS §3.2) ─────────────────────────────

/** Shipping notice confirmation (REQ-E07-05). */
/**
 *  The order is not confirmed yet — nothing to confirm.
 *  Confirmed, and the supplier has not given a completion date.
 *  A completion date is given (shipment may or may not have started).
 *  The completion date was moved later than previously stated.
 *
 * @typedef {| 'notStarted'
 *   | 'missing'
 *   | 'confirmed'
 *   | 'delayed'} ShippingNoticeStatus
 */

/** @type {ReadonlySet<POStatus>} */
const SHIPPING_STATES = new Set([
  POStatus.CONFIRMED,
  POStatus.PARTIALLY_DELIVERED,
  POStatus.DELIVERED,
  POStatus.CLOSED
]);

/**
 * @param {PurchaseOrder} po
 * @returns {boolean}
 */
export function completionMovedLater(po) {
  const n = po.shippingNotice;
  return !!(
    n?.previousCompletionDate &&
    n.expectedCompletionDate &&
    n.expectedCompletionDate > n.previousCompletionDate
  );
}

/**
 * @param {PurchaseOrder} po
 * @returns {ShippingNoticeStatus}
 */
export function shippingNoticeStatus(po) {
  if (!SHIPPING_STATES.has(po.status)) return 'notStarted';
  if (!po.shippingNotice?.expectedCompletionDate) return 'missing';
  return completionMovedLater(po) ? 'delayed' : 'confirmed';
}

/**
 * Foresight / fixed-stock confirmation (REQ-E06-02), per the PO's materials:
 * Confirmed, Gap, Awaiting, or Not required when the materials have only
 * Forecast-zone periods (nothing to commit, only to acknowledge).
 */
/** @typedef {'notStarted' | 'awaiting' | 'confirmed' | 'gap' | 'notRequired'} ForesightStatus */

/** One forecast line's answer, reduced to what the summary needs. */
/**
 * @typedef {object} ForesightAnswer
 * @property {string} supplierId
 * @property {string} materialCode
 * @property {'awaiting' | 'confirmed' | 'gap' | 'notRequired'} answer
 */

/**
 * The PO's foresight status from the forecast answers for ITS supplier and
 * ITS materials. No forecast line for any of them → Not started. Forecast-zone
 * periods ask for no commitment, so they decide only when nothing else does.
 * @param {PurchaseOrder} po
 * @param {readonly ForesightAnswer[]} answers
 * @returns {ForesightStatus}
 */
export function foresightStatus(po, answers) {
  const codes = new Set(po.lineItems.map((li) => li.materialCode));
  const mine = answers.filter((a) => a.supplierId === po.supplierId && codes.has(a.materialCode));
  if (mine.length === 0) return 'notStarted';
  if (mine.some((a) => a.answer === 'gap')) return 'gap';
  if (mine.some((a) => a.answer === 'awaiting')) return 'awaiting';
  if (mine.some((a) => a.answer === 'confirmed')) return 'confirmed';
  return 'notRequired';
}

/** Supplier response status for the summary: the answer, or its absence. */
/** @typedef {'awaiting' | 'escalated' | 'approved' | 'adjusted' | 'rejected'} ResponseStatus */

/**
 * @param {PurchaseOrder} po
 * @param {string} nowIso
 * @returns {ResponseStatus}
 */
export function responseStatus(po, nowIso) {
  if (po.status === POStatus.REJECTED) return 'rejected';
  if (po.status === POStatus.ADJUSTED) return 'adjusted';
  if (isAwaitingResponse(po)) return isEscalated(po, nowIso) ? 'escalated' : 'awaiting';
  return 'approved';
}

// ── The PO lifecycle as steps (SC-02) ───────────────────────────────────────

/** @typedef {'response' | 'confirmations' | 'asn' | 'goodsReceipt' | 'invoice'} LifecycleStepId */

/** @type {readonly LifecycleStepId[]} */
export const LIFECYCLE_STEPS = ['response', 'confirmations', 'asn', 'goodsReceipt', 'invoice'];

/** @typedef {'done' | 'current' | 'upcoming' | 'blocked'} StepState */

/**
 * Each step's state. Done steps are read from the PO's own facts; the first
 * step that is not done is current (or blocked, when the supplier rejected).
 * @param {PurchaseOrder} po
 * @param {number} asnCount
 * @returns {readonly { readonly id: LifecycleStepId; readonly state: StepState }[]}
 */
export function lifecycleSteps(po, asnCount) {
  const delivered = po.status === POStatus.DELIVERED || po.status === POStatus.CLOSED;
  const receiving = delivered || po.status === POStatus.PARTIALLY_DELIVERED;
  /** @type {Record<LifecycleStepId, boolean>} */
  const done = {
    response: SHIPPING_STATES.has(po.status),
    confirmations: receiving || !!po.shippingNotice?.expectedCompletionDate,
    asn: receiving || asnCount > 0,
    goodsReceipt: delivered,
    invoice: po.status === POStatus.CLOSED
  };
  let currentSeen = false;
  return LIFECYCLE_STEPS.map((id) => {
    if (done[id]) return { id, state: /** @type {const} */ ('done') };
    if (currentSeen) return { id, state: /** @type {const} */ ('upcoming') };
    currentSeen = true;
    return {
      id,
      state:
        po.status === POStatus.REJECTED
          ? /** @type {const} */ ('blocked')
          : /** @type {const} */ ('current')
    };
  });
}
