// ─────────────────────────────────────────────────────────────────────────────
// PURCHASE ORDER RESPONSE PROJECTION — REQ-E07-02, REQ-E07-03, REQ-E07-05.
//
// Everything here is DERIVED AT READ TIME from a stored PO and an instant the
// caller supplies. `Escalated` in particular is a clock projection: it is never
// a member of the purchase-order transition table and never written to a PO
// (law 0.5), exactly as `invoiceProjection.isOverdue` derives Overdue.
// ─────────────────────────────────────────────────────────────────────────────

import { POStatus, type PurchaseOrder } from './types';
import { addWorkingDays, documentInstant, type WorkingCalendar } from '../../lib/workingCalendar';
import { hubWorkingCalendar } from '../transitions/workingCalendarStore';

/** The supplier's response window (REQ-E07-02 BR-01, MN-ORD-04). */
export const RESPONSE_WORKING_DAYS = 1;

/** States in which the supplier has not yet approved, adjusted or rejected. */
const AWAITING_RESPONSE: ReadonlySet<POStatus> = new Set([
  POStatus.SENT,
  POStatus.VIEWED,
  POStatus.ACKNOWLEDGED,
]);

/** True while the PO waits for the supplier's Approve / Adjust / Reject. */
export function isAwaitingResponse(po: PurchaseOrder): boolean {
  return AWAITING_RESPONSE.has(po.status);
}

/**
 * The instant the supplier must respond by: 1 working day after it was asked,
 * on the hub's calendar (BL-50 — an administrator's ruling moves it).
 */
export function responseDeadline(
  po: PurchaseOrder,
  cal: WorkingCalendar = hubWorkingCalendar(),
): Date {
  const askedAt = po.responseRequestedAt ?? po.orderDate;
  return addWorkingDays(documentInstant(askedAt, cal), RESPONSE_WORKING_DAYS, cal);
}

/** Computed Escalated (BR-09): no response and the deadline has passed. */
export function isEscalated(po: PurchaseOrder, nowIso: string): boolean {
  return isAwaitingResponse(po) && responseDeadline(po).getTime() < Date.parse(nowIso);
}

/** A response recorded after its deadline (edge case: keep the lateness visible). */
export function respondedLate(po: PurchaseOrder): boolean {
  if (!po.response) return false;
  return Date.parse(po.response.respondedAt) > responseDeadline(po).getTime();
}

/** The status word a PO shows: the stored state, or the computed Escalated. */
export type PoDisplayStatus = POStatus | 'Escalated';

export function poDisplayStatus(po: PurchaseOrder, nowIso: string): PoDisplayStatus {
  if (isEscalated(po, nowIso)) return 'Escalated';
  return po.status;
}

// ── The three confirmations (REQUIREMENTS §3.2) ─────────────────────────────

/** Shipping notice confirmation (REQ-E07-05). */
export type ShippingNoticeStatus =
  /** The order is not confirmed yet — nothing to confirm. */
  | 'notStarted'
  /** Confirmed, and the supplier has not given a completion date. */
  | 'missing'
  /** A completion date is given (shipment may or may not have started). */
  | 'confirmed'
  /** The completion date was moved later than previously stated. */
  | 'delayed';

const SHIPPING_STATES: ReadonlySet<POStatus> = new Set([
  POStatus.CONFIRMED,
  POStatus.PARTIALLY_DELIVERED,
  POStatus.DELIVERED,
  POStatus.CLOSED,
]);

export function completionMovedLater(po: PurchaseOrder): boolean {
  const n = po.shippingNotice;
  return !!(n?.previousCompletionDate && n.expectedCompletionDate && n.expectedCompletionDate > n.previousCompletionDate);
}

export function shippingNoticeStatus(po: PurchaseOrder): ShippingNoticeStatus {
  if (!SHIPPING_STATES.has(po.status)) return 'notStarted';
  if (!po.shippingNotice?.expectedCompletionDate) return 'missing';
  return completionMovedLater(po) ? 'delayed' : 'confirmed';
}

/**
 * Foresight / fixed-stock confirmation (REQ-E06-02), per the PO's materials:
 * Confirmed, Gap, Awaiting, or Not required when the materials have only
 * Forecast-zone periods (nothing to commit, only to acknowledge).
 */
export type ForesightStatus = 'notStarted' | 'awaiting' | 'confirmed' | 'gap' | 'notRequired';

/** One forecast line's answer, reduced to what the summary needs. */
export interface ForesightAnswer {
  readonly supplierId: string;
  readonly materialCode: string;
  readonly answer: 'awaiting' | 'confirmed' | 'gap' | 'notRequired';
}

/**
 * The PO's foresight status from the forecast answers for ITS supplier and
 * ITS materials. No forecast line for any of them → Not started. Forecast-zone
 * periods ask for no commitment, so they decide only when nothing else does.
 */
export function foresightStatus(po: PurchaseOrder, answers: readonly ForesightAnswer[]): ForesightStatus {
  const codes = new Set(po.lineItems.map((li) => li.materialCode));
  const mine = answers.filter((a) => a.supplierId === po.supplierId && codes.has(a.materialCode));
  if (mine.length === 0) return 'notStarted';
  if (mine.some((a) => a.answer === 'gap')) return 'gap';
  if (mine.some((a) => a.answer === 'awaiting')) return 'awaiting';
  if (mine.some((a) => a.answer === 'confirmed')) return 'confirmed';
  return 'notRequired';
}

/** Supplier response status for the summary: the answer, or its absence. */
export type ResponseStatus = 'awaiting' | 'escalated' | 'approved' | 'adjusted' | 'rejected';

export function responseStatus(po: PurchaseOrder, nowIso: string): ResponseStatus {
  if (po.status === POStatus.REJECTED) return 'rejected';
  if (po.status === POStatus.ADJUSTED) return 'adjusted';
  if (isAwaitingResponse(po)) return isEscalated(po, nowIso) ? 'escalated' : 'awaiting';
  return 'approved';
}

// ── The PO lifecycle as steps (SC-02) ───────────────────────────────────────

export type LifecycleStepId = 'response' | 'confirmations' | 'asn' | 'goodsReceipt' | 'invoice';

export const LIFECYCLE_STEPS: readonly LifecycleStepId[] = [
  'response',
  'confirmations',
  'asn',
  'goodsReceipt',
  'invoice',
];

export type StepState = 'done' | 'current' | 'upcoming' | 'blocked';

/**
 * Each step's state. Done steps are read from the PO's own facts; the first
 * step that is not done is current (or blocked, when the supplier rejected).
 */
export function lifecycleSteps(
  po: PurchaseOrder,
  asnCount: number,
): readonly { readonly id: LifecycleStepId; readonly state: StepState }[] {
  const delivered = po.status === POStatus.DELIVERED || po.status === POStatus.CLOSED;
  const receiving = delivered || po.status === POStatus.PARTIALLY_DELIVERED;
  const done: Record<LifecycleStepId, boolean> = {
    response: SHIPPING_STATES.has(po.status),
    confirmations: receiving || !!po.shippingNotice?.expectedCompletionDate,
    asn: receiving || asnCount > 0,
    goodsReceipt: delivered,
    invoice: po.status === POStatus.CLOSED,
  };
  let currentSeen = false;
  return LIFECYCLE_STEPS.map((id) => {
    if (done[id]) return { id, state: 'done' as const };
    if (currentSeen) return { id, state: 'upcoming' as const };
    currentSeen = true;
    return { id, state: po.status === POStatus.REJECTED ? ('blocked' as const) : ('current' as const) };
  });
}
