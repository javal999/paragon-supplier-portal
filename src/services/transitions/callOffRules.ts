// ─────────────────────────────────────────────────────────────────────────────
// CALL-OFF RULES — REQ-E09-01, REQ-E09-03, REQ-E09-04 and CR-04 to CR-09.
//
// Pure functions shared by the policy hooks (the law), the pages (a courtesy
// mirror) and the Home tasks. Nothing here reads a clock: every derivation takes
// the instant it reasons about, so Escalated, At Risk, Dispatched and on time /
// late / missed are computed at read time and never stored (law 0.5).
//
// The delivery arithmetic is REUSED, not rewritten: the series generator is the
// scheduling-agreement generator (CR-04 BR-05), and the matching window, grace
// period, reminder horizon and drift count are the constants the delivery
// fulfillment and chase modules already carry (CR-06, CR-07, CR-09).
// ─────────────────────────────────────────────────────────────────────────────

import type {
  ASN,
  CallOff,
  CallOffConfirmationKind,
  CallOffDelivery,
  CallOffStatus,
  CallOffType,
  PurchaseOrder,
  POLineItem,
} from '../data/types';
import { POStatus } from '../data/types';
import type { GoodsReceipt } from '../../data/mockGoodsReceipts';
import { generateSchedule } from '../delivery/generator';
import type { ReleaseCadence } from '../delivery/types';
import { DELIVERY_GRACE_DAYS, MATCH_WINDOW_DAYS } from '../delivery/fulfillment';
import { ANTICIPATION_DAYS, DRIFT_COUNT } from '../chase/deliveryChase';
import { addWorkingDays, documentInstant, type WorkingCalendar } from '../../lib/workingCalendar';
import { hubWorkingCalendar } from './workingCalendarStore';
import {
  callOffConfirmWorkingDays,
  callOffTolerance,
  type CallOffTolerance,
} from './callOffTolerance';

const DAY_MS = 86_400_000;

export const CALL_OFF_TYPES: readonly CallOffType[] = ['jit', 'forecast'];
export const CALL_OFF_CADENCES: readonly ReleaseCadence[] = ['weekly', 'monthly', 'quarterly'];

/** An umbrella PO can take call-offs while it is approved and still open. */
export const CALL_OFF_PO_STATES: readonly POStatus[] = [POStatus.CONFIRMED, POStatus.PARTIALLY_DELIVERED];

/** Supplier-confirmed states — a dispatch or an ASN may follow (BR-06). */
export const CALL_OFF_CONFIRMED_STATES: readonly CallOffStatus[] = [
  'Confirmed',
  'Confirmed with New Date',
  'Confirmed with Changes',
  'Partially Confirmed',
];

/** States whose quantity is drawn from the umbrella PO (CR-04). A draft is not
 *  released, and a dismissed or rejected call-off gives its quantity back. */
const RELEASED_STATES: readonly CallOffStatus[] = ['Awaiting Confirmation', ...CALL_OFF_CONFIRMED_STATES];

export const isReleased = (c: Pick<CallOff, 'status'>): boolean => RELEASED_STATES.includes(c.status);

export const isNonBlank = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

/** A real calendar date written `YYYY-MM-DD`. */
export const isCallOffDate = (v: unknown): v is string => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
};

export const isPositiveQty = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v > 0;

const dayMs = (d: string) => Date.parse(`${d.slice(0, 10)}T00:00:00.000Z`);
const daysBetween = (from: string, to: string) => Math.round((dayMs(to) - dayMs(from)) / DAY_MS);

// ── CR-04 · remaining on the umbrella PO ────────────────────────────────────

/**
 * What a release is checked against (CR-04; BL-13 decided on 2026-09-21 that
 * the umbrella PO holds a QUANTITY per line, so BL-49 makes quantity the
 * default). Value is the check only on a line that carries no quantity — an SAP
 * value-limit line, marked by `valueLimit`.
 */
export type ReleaseBasis = 'quantity' | 'value';

type UmbrellaLine = Pick<POLineItem, 'id' | 'quantity' | 'unitPrice' | 'valueLimit'>;

export const releaseBasis = (line: UmbrellaLine): ReleaseBasis =>
  line.valueLimit === undefined ? 'quantity' : 'value';

export interface UmbrellaRemaining {
  readonly basis: ReleaseBasis;
  /** Ordered and remaining quantity — null on a line that has no quantity. */
  readonly orderedQty: number | null;
  readonly releasedQty: number;
  readonly remainingQty: number | null;
  readonly orderedValue: number;
  readonly releasedValue: number;
  readonly remainingValue: number;
}

/**
 * Remaining quantity = PO line quantity − released call-off quantity; remaining
 * value = PO line value − released call-off value, where a value-limit line's
 * ordered value is its limit. `excludeId` leaves one call-off out (the one being
 * released or changed).
 */
export function umbrellaRemaining(
  line: UmbrellaLine,
  callOffs: readonly CallOff[],
  excludeId?: string,
): UmbrellaRemaining {
  const basis = releaseBasis(line);
  const releasedQty = callOffs
    .filter((c) => c.poLineId === line.id && c.id !== excludeId && isReleased(c))
    .reduce((s, c) => s + c.quantity, 0);
  const orderedValue = line.valueLimit ?? line.quantity * line.unitPrice;
  const releasedValue = releasedQty * line.unitPrice;
  return {
    basis,
    orderedQty: basis === 'quantity' ? line.quantity : null,
    releasedQty,
    remainingQty: basis === 'quantity' ? line.quantity - releasedQty : null,
    orderedValue,
    releasedValue,
    remainingValue: orderedValue - releasedValue,
  };
}

/** A release measured against what remains, in the line's own basis. */
export interface ReleaseCheck {
  readonly basis: ReleaseBasis;
  readonly exceeds: boolean;
  readonly requestedQty: number;
  readonly requestedValue: number;
  readonly remaining: UmbrellaRemaining;
}

/**
 * REQ-E09-01 BR-04 / AC-03 with CR-04 — release is blocked beyond what remains:
 * on remaining QUANTITY by default, on remaining VALUE only where the line has
 * no quantity (BL-49). Exactly the remainder is allowed.
 */
export function releaseCheck(
  quantity: number,
  line: UmbrellaLine,
  callOffs: readonly CallOff[],
  excludeId?: string,
): ReleaseCheck {
  const remaining = umbrellaRemaining(line, callOffs, excludeId);
  const requestedValue = quantity * line.unitPrice;
  const exceeds =
    remaining.basis === 'quantity'
      ? quantity > (remaining.remainingQty ?? 0)
      : requestedValue > remaining.remainingValue;
  return { basis: remaining.basis, exceeds, requestedQty: quantity, requestedValue, remaining };
}

export function exceedsRemaining(
  quantity: number,
  line: UmbrellaLine,
  callOffs: readonly CallOff[],
  excludeId?: string,
): boolean {
  return releaseCheck(quantity, line, callOffs, excludeId).exceeds;
}

/** Why a call-off could not be placed on this PO line, or null. */
export type UmbrellaRefusal = 'poNotFound' | 'poNotOpen' | 'lineNotFound';

export function umbrellaRefusal(po: PurchaseOrder | undefined, lineId: unknown): UmbrellaRefusal | null {
  if (!po) return 'poNotFound';
  if (!CALL_OFF_PO_STATES.includes(po.status)) return 'poNotOpen';
  if (!po.lineItems.some((li) => li.id === lineId)) return 'lineNotFound';
  return null;
}

// ── CR-04 BR-05 · series generator (reuses the delivery generator) ──────────

export interface SeriesInput {
  readonly totalQty: number;
  readonly qtyPerCallOff: number;
  readonly cadence: ReleaseCadence;
  /** The first need date, `YYYY-MM-DD`. */
  readonly firstNeedDate: string;
}

/** count = ceil(total ÷ qty per call-off); the last takes the remainder. */
export function generateCallOffSeries(input: SeriesInput): readonly CallOffDelivery[] {
  if (!isCallOffDate(input.firstNeedDate)) return [];
  return generateSchedule({
    contractId: 'series',
    agreementId: 'series',
    lineSeq: 1,
    startDate: input.firstNeedDate,
    cadence: input.cadence,
    qtyPerRelease: input.qtyPerCallOff,
    agreedTotalQty: input.totalQty,
    releaseType: 'FRC',
  }).map((l) => ({ quantity: l.plannedQty, date: l.releaseDate }));
}

// ── REQ-E09-03 · supplier confirmation and tolerance (CR-05; BL-47, BL-56) ──

/** The deliveries a confirming answer proposes, or a refusal. */
export type ConfirmationRefusal =
  | 'date'
  | 'sameDate'
  | 'quantity'
  | 'sameQuantity'
  | 'splitCount'
  | 'splitDates';

export interface ConfirmationInput {
  readonly confirmedDate?: unknown;
  readonly confirmedQty?: unknown;
  readonly deliveries?: unknown;
}

export function proposedDeliveries(
  callOff: Pick<CallOff, 'quantity' | 'needDate'>,
  kind: CallOffConfirmationKind,
  input: ConfirmationInput,
): { deliveries: readonly CallOffDelivery[] } | { refusal: ConfirmationRefusal } {
  switch (kind) {
    case 'confirm':
      return { deliveries: [{ quantity: callOff.quantity, date: callOff.needDate }] };
    case 'newDate': {
      if (!isCallOffDate(input.confirmedDate)) return { refusal: 'date' };
      if (input.confirmedDate === callOff.needDate) return { refusal: 'sameDate' };
      return { deliveries: [{ quantity: callOff.quantity, date: input.confirmedDate }] };
    }
    case 'changes': {
      if (!isPositiveQty(input.confirmedQty)) return { refusal: 'quantity' };
      if (input.confirmedQty === callOff.quantity) return { refusal: 'sameQuantity' };
      const date = input.confirmedDate === undefined || input.confirmedDate === '' ? callOff.needDate : input.confirmedDate;
      if (!isCallOffDate(date)) return { refusal: 'date' };
      return { deliveries: [{ quantity: input.confirmedQty, date }] };
    }
    case 'partial': {
      const rows = input.deliveries;
      if (!Array.isArray(rows) || rows.length !== 2) return { refusal: 'splitCount' };
      const out: CallOffDelivery[] = [];
      for (const r of rows as Partial<CallOffDelivery>[]) {
        if (!isPositiveQty(r?.quantity)) return { refusal: 'quantity' };
        if (!isCallOffDate(r?.date)) return { refusal: 'date' };
        out.push({ quantity: r.quantity, date: r.date });
      }
      if (out[0].date === out[1].date) return { refusal: 'splitDates' };
      return { deliveries: [...out].sort((a, b) => a.date.localeCompare(b.date)) };
    }
  }
}

/**
 * What the tolerance rule found in one confirmation (BR-03, CR-05 as revised on
 * 2026-09-21). Each finding names the rule that applied and whether it sends
 * the confirmation to the planner, so both call-off screens can show the rule
 * AND its reason from the same derivation the verb uses.
 *
 * · `asRequested` — the released quantity on the need date.
 * · `overWithin`  — over the released quantity, within the 5% allowance.
 * · `overBeyond`  — more than 5% over: waits for the planner.
 * · `short`       — less than released: a partial delivery, accepted and kept
 *                   visible, never a reason to wait.
 * · `late`        — a delivery after the need date: always waits for the planner.
 * · `early`       — a delivery before the need date, beyond the early allowance
 *                   (placeholder 0 days, BL-56): waits for the planner.
 */
export type ToleranceFindingKind = 'asRequested' | 'overWithin' | 'overBeyond' | 'short' | 'late' | 'early';

export interface ToleranceFinding {
  readonly kind: ToleranceFindingKind;
  readonly needsApproval: boolean;
  /** Quantity over or short of the released quantity. */
  readonly qty?: number;
  /** That quantity as a percentage of the released quantity (display only; the decision is exact). */
  readonly pct?: number;
  /** For `late` / `early`: the largest number of days off the need date. */
  readonly days?: number;
  /** For `late` / `early`: the delivery date furthest from the need date. */
  readonly date?: string;
  /** The limit the finding was measured against (percent, or days for `early`). */
  readonly limit?: number;
}

/** Where a confirmation falls against the tolerances (BR-03). */
export interface ToleranceCheck {
  /** Accepted automatically — nothing needs the planner. */
  readonly within: boolean;
  readonly overQty: boolean;
  /** A shortfall: a visible partial delivery, which does NOT make `within` false. */
  readonly short: boolean;
  readonly early: boolean;
  readonly late: boolean;
  readonly findings: readonly ToleranceFinding[];
}

/** Percentage for display, to 2 decimals. */
const pctOf = (part: number, whole: number) => Math.round((part / whole) * 10_000) / 100;

export function checkTolerance(
  callOff: Pick<CallOff, 'quantity' | 'needDate'>,
  deliveries: readonly CallOffDelivery[],
  // Read at every call (BL-32): a default parameter is evaluated per call, so
  // the administrator's value in force decides, never a copy taken at load.
  tol: CallOffTolerance = callOffTolerance(),
): ToleranceCheck {
  const total = deliveries.reduce((s, d) => s + d.quantity, 0);
  const over = total - callOff.quantity;
  // Exact comparison, no floating-point multiply: over / quantity > pct / 100.
  const overQty = over > 0 && over * 100 > tol.overPct * callOff.quantity;
  const short = over < 0;
  const byDate = [...deliveries].sort((a, b) => a.date.localeCompare(b.date));
  const latest = byDate[byDate.length - 1]?.date ?? callOff.needDate;
  const earliest = byDate[0]?.date ?? callOff.needDate;
  const lateBy = Math.max(0, daysBetween(callOff.needDate, latest));
  const earlyBy = Math.max(0, daysBetween(earliest, callOff.needDate));
  const late = lateBy > 0;
  const early = earlyBy > tol.earlyDays;

  const findings: ToleranceFinding[] = [];
  if (over > 0) {
    findings.push({
      kind: overQty ? 'overBeyond' : 'overWithin',
      needsApproval: overQty,
      qty: over,
      pct: pctOf(over, callOff.quantity),
      limit: tol.overPct,
    });
  }
  if (short) {
    findings.push({ kind: 'short', needsApproval: false, qty: -over, pct: pctOf(-over, callOff.quantity) });
  }
  if (late) findings.push({ kind: 'late', needsApproval: true, days: lateBy, date: latest });
  if (earlyBy > 0) {
    // An earlier date inside the allowance is accepted and says so; with the
    // placeholder at 0 days (BL-56) every earlier date needs approval.
    findings.push({ kind: 'early', needsApproval: early, days: earlyBy, date: earliest, limit: tol.earlyDays });
  }
  if (findings.length === 0) findings.push({ kind: 'asRequested', needsApproval: false });

  return { within: !overQty && !late && !early, overQty, short, early, late, findings };
}

/**
 * The shortfall an ACCEPTED or waiting confirmation leaves against the released
 * quantity — the "visible partial" of CR-05. 0 when nothing is short or the
 * supplier has not answered.
 */
export function confirmedShortfall(c: Pick<CallOff, 'quantity' | 'confirmation'>): number {
  if (!c.confirmation) return 0;
  const total = c.confirmation.deliveries.reduce((s, d) => s + d.quantity, 0);
  return Math.max(0, c.quantity - total);
}

/** The stored state each confirming answer lands in. */
export const CONFIRMATION_STATE: Readonly<Record<CallOffConfirmationKind, CallOffStatus>> = {
  confirm: 'Confirmed',
  newDate: 'Confirmed with New Date',
  changes: 'Confirmed with Changes',
  partial: 'Partially Confirmed',
};

export const isAwaitingApproval = (c: Pick<CallOff, 'confirmation'>): boolean =>
  c.confirmation?.approval === 'awaiting';

/** Confirmed by the supplier AND accepted (automatically or by the planner). */
export const isConfirmedAndAccepted = (c: Pick<CallOff, 'status' | 'confirmation'>): boolean =>
  CALL_OFF_CONFIRMED_STATES.includes(c.status) && !isAwaitingApproval(c);

/**
 * The approved need date(s) and quantities OTIF is measured against (BR-07):
 * the accepted confirmation's deliveries, or the released call-off while it is
 * not yet confirmed.
 */
export function approvedDeliveries(c: CallOff): readonly CallOffDelivery[] {
  if (c.confirmation && isConfirmedAndAccepted(c)) return c.confirmation.deliveries;
  return [{ quantity: c.quantity, date: c.needDate }];
}

// ── BR-05 · confirmation deadline and Escalated (derived) ──────────────────

/** BR-05 — 1 working day after release, on the hub's calendar (BL-50: every
 *  deadline reads the calendar the administrator maintains). */
export function confirmationDeadline(c: CallOff, cal: WorkingCalendar = hubWorkingCalendar()): Date | null {
  if (!c.releasedAt) return null;
  return addWorkingDays(documentInstant(c.releasedAt, cal), callOffConfirmWorkingDays(), cal);
}

export function isCallOffEscalated(c: CallOff, nowIso: string): boolean {
  if (c.status !== 'Awaiting Confirmation') return false;
  const due = confirmationDeadline(c);
  return !!due && due.getTime() < Date.parse(nowIso);
}

// ── REQ-E09-04 · dispatch heads-ups (a linked ASN counts as one) ────────────

export interface HeadsUp {
  readonly source: 'notice' | 'asn';
  readonly ref: string;
  readonly shippedDate: string;
  readonly expectedArrival: string;
  readonly quantity: number;
}

/** ASN states that mean goods have left (a draft has not shipped). */
const SHIPPED_ASN_STATES = ['Submitted', 'In Transit', 'Delivered', 'Discrepancy'];

/**
 * The call-off's heads-ups: its own dispatch notices, plus every shipped ASN
 * linked to it (BR-05 — the supplier does not report twice). An ASN a notice
 * already names is not counted again.
 */
export function headsUpsFor(c: CallOff, asns: readonly ASN[]): readonly HeadsUp[] {
  const notices: HeadsUp[] = c.dispatches.map((d) => ({
    source: 'notice',
    ref: d.id,
    shippedDate: d.shippedDate,
    expectedArrival: d.expectedArrival,
    quantity: d.quantity,
  }));
  const named = new Set(c.dispatches.map((d) => d.asnNumber).filter(Boolean));
  const fromAsns: HeadsUp[] = asns
    .filter((a) => a.callOffId === c.id && SHIPPED_ASN_STATES.includes(a.status) && !named.has(a.asnNumber))
    .map((a) => ({
      source: 'asn',
      ref: a.asnNumber,
      shippedDate: a.shipDate ?? a.eta.slice(0, 10),
      expectedArrival: a.eta.slice(0, 10),
      quantity: a.lineItems
        .filter((l) => l.materialCode === c.materialCode)
        .reduce((s, l) => s + l.shippedQty, 0),
    }));
  return [...notices, ...fromAsns].sort((a, b) => a.expectedArrival.localeCompare(b.expectedArrival));
}

/**
 * At Risk (REQ-E09-04 edge case): a heads-up arrives after the approved date of
 * the delivery it fills. Heads-ups fill the approved deliveries in date order.
 */
export function isAtRisk(c: CallOff, headsUps: readonly HeadsUp[]): boolean {
  const slots = [...approvedDeliveries(c)].sort((a, b) => a.date.localeCompare(b.date));
  let i = 0;
  let left = slots[0]?.quantity ?? 0;
  for (const h of headsUps) {
    if (i >= slots.length) break;
    if (h.expectedArrival > slots[i].date) return true;
    left -= h.quantity;
    while (left <= 0 && i < slots.length) {
      i += 1;
      left += slots[i]?.quantity ?? 0;
    }
  }
  return false;
}

// ── CR-06 to CR-08 · delivery result and OTIF (pure; reused by Phase 6) ─────

/** A goods receipt line, reduced to what the match needs. */
export interface ReceiptEvent {
  readonly ref: string;
  readonly supplierId: string;
  readonly materialCode: string;
  readonly date: string;
  readonly quantity: number;
}

export function receiptEvents(receipts: readonly GoodsReceipt[]): readonly ReceiptEvent[] {
  return receipts.flatMap((gr) =>
    gr.inspectionResults.map((r) => ({
      ref: gr.grNumber,
      supplierId: gr.supplierId,
      materialCode: r.materialCode,
      date: gr.receivedDate.slice(0, 10),
      quantity: r.qtyReceived,
    })),
  );
}

export type DeliveryTiming = 'onTime' | 'late' | 'missed' | 'pending';

export interface DeliveryResult {
  readonly callOffId: string;
  /** Index of the approved delivery (a partially confirmed call-off has 2). */
  readonly seq: number;
  readonly approvedDate: string;
  readonly approvedQty: number;
  readonly timing: DeliveryTiming;
  /** CR-08: received (or dispatched) quantity ≥ approved quantity; null while pending or missed. */
  readonly inFull: boolean | null;
  /** What the result rests on: a goods receipt, the supplier's heads-up, or nothing yet. */
  readonly basis: 'receipt' | 'dispatch' | 'none';
  readonly ref?: string;
  readonly quantity?: number;
}

/** Call-offs whose delivery is measured: released, not rejected, not a draft. */
export const isMeasured = (c: CallOff): boolean => isReleased(c);

/**
 * Delivery results for every measured call-off, per approved delivery.
 *
 * CR-06: a receipt counts toward a delivery of the same supplier and material
 * within MATCH_WINDOW_DAYS of its approved date; deliveries take receipts in
 * date order, each the closest date then the closest quantity, and a receipt is
 * used once. Without a receipt, the call-off's own heads-ups (ASN or notice)
 * stand in, dated by expected arrival. CR-07: on time on or before the approved
 * date; missed when nothing arrived DELIVERY_GRACE_DAYS after it; pending
 * before that.
 */
export function deliveryResults(
  callOffs: readonly CallOff[],
  receipts: readonly ReceiptEvent[],
  asns: readonly ASN[],
  nowIso: string,
): readonly DeliveryResult[] {
  const slots = callOffs
    .filter(isMeasured)
    .flatMap((c) => approvedDeliveries(c).map((d, seq) => ({ c, d, seq })))
    .sort((a, b) => a.d.date.localeCompare(b.d.date) || a.c.id.localeCompare(b.c.id) || a.seq - b.seq);
  const used = new Set<ReceiptEvent>();
  const headsUpCache = new Map<string, HeadsUp[]>();
  const nowDay = nowIso.slice(0, 10);
  const out: DeliveryResult[] = [];

  for (const { c, d, seq } of slots) {
    const base = { callOffId: c.id, seq, approvedDate: d.date, approvedQty: d.quantity };
    const candidates = receipts.filter(
      (r) =>
        !used.has(r) &&
        r.supplierId === c.supplierId &&
        r.materialCode === c.materialCode &&
        Math.abs(daysBetween(d.date, r.date)) <= MATCH_WINDOW_DAYS,
    );
    if (candidates.length > 0) {
      const pick = [...candidates].sort(
        (a, b) =>
          Math.abs(daysBetween(d.date, a.date)) - Math.abs(daysBetween(d.date, b.date)) ||
          Math.abs(a.quantity - d.quantity) - Math.abs(b.quantity - d.quantity) ||
          a.ref.localeCompare(b.ref),
      )[0];
      used.add(pick);
      out.push({
        ...base,
        timing: pick.date <= d.date ? 'onTime' : 'late',
        inFull: pick.quantity >= d.quantity,
        basis: 'receipt',
        ref: pick.ref,
        quantity: pick.quantity,
      });
      continue;
    }
    if (!headsUpCache.has(c.id)) headsUpCache.set(c.id, [...headsUpsFor(c, asns)]);
    const pool = headsUpCache.get(c.id)!;
    const h = pool.shift();
    if (h) {
      out.push({
        ...base,
        timing: h.expectedArrival <= d.date ? 'onTime' : 'late',
        inFull: h.quantity >= d.quantity,
        basis: 'dispatch',
        ref: h.ref,
        quantity: h.quantity,
      });
      continue;
    }
    const missed = daysBetween(d.date, nowDay) > DELIVERY_GRACE_DAYS;
    out.push({ ...base, timing: missed ? 'missed' : 'pending', inFull: null, basis: 'none' });
  }
  return out;
}

/**
 * OTIF for one call-off (REQ-E10-01, measured per call-off): 1 when every
 * approved delivery was received on time and in full, 0 when any was late,
 * short or missed, null while any is still pending or only dispatched. Phase 6
 * reads this for the performance dashboard.
 */
export function callOffOtif(callOffId: string, results: readonly DeliveryResult[]): 1 | 0 | null {
  const mine = results.filter((r) => r.callOffId === callOffId);
  if (mine.length === 0) return null;
  if (mine.some((r) => r.timing === 'missed' || (r.basis === 'receipt' && (r.timing === 'late' || r.inFull === false)))) {
    return 0;
  }
  if (mine.every((r) => r.basis === 'receipt' && r.timing === 'onTime' && r.inFull === true)) return 1;
  return null;
}

// ── The status a call-off shows, and the reminders (CR-09) ──────────────────

export type CallOffDeliveryStatus =
  | 'notDue'
  | 'dispatched'
  | 'atRisk'
  | 'deliveredOnTime'
  | 'late'
  | 'missed';

export interface CallOffView {
  readonly callOff: CallOff;
  /** Confirmation status: the stored state, Awaiting Approval, or Escalated. */
  readonly confirmation: CallOffStatus | 'Awaiting Approval' | 'Escalated';
  readonly delivery: CallOffDeliveryStatus | null;
  readonly deadline: Date | null;
  readonly headsUps: readonly HeadsUp[];
  readonly results: readonly DeliveryResult[];
  readonly otif: 1 | 0 | null;
  /** The earliest approved date — "must come". */
  readonly dueDate: string;
  /** The tolerance rule applied to the supplier's confirmation, read now (CR-05); null before an answer. */
  readonly tolerance: ToleranceCheck | null;
  /** The confirmed shortfall against the released quantity — the visible partial (CR-05). */
  readonly shortfall: number;
}

export function callOffViews(
  callOffs: readonly CallOff[],
  asns: readonly ASN[],
  receipts: readonly GoodsReceipt[],
  nowIso: string,
): readonly CallOffView[] {
  const results = deliveryResults(callOffs, receiptEvents(receipts), asns, nowIso);
  return callOffs.map((c) => {
    const mine = results.filter((r) => r.callOffId === c.id);
    const headsUps = headsUpsFor(c, asns);
    const confirmation: CallOffView['confirmation'] = isCallOffEscalated(c, nowIso)
      ? 'Escalated'
      : isAwaitingApproval(c)
        ? 'Awaiting Approval'
        : c.status;
    let delivery: CallOffDeliveryStatus | null = null;
    if (isConfirmedAndAccepted(c)) {
      const received = mine.filter((r) => r.basis === 'receipt');
      if (mine.some((r) => r.timing === 'missed')) delivery = 'missed';
      else if (received.some((r) => r.timing === 'late')) delivery = 'late';
      else if (received.length > 0 && received.length === mine.length) delivery = 'deliveredOnTime';
      else if (isAtRisk(c, headsUps)) delivery = 'atRisk';
      else if (headsUps.length > 0) delivery = 'dispatched';
      else delivery = 'notDue';
    }
    const dates = approvedDeliveries(c).map((d) => d.date).sort();
    return {
      callOff: c,
      confirmation,
      delivery,
      deadline: confirmationDeadline(c),
      headsUps,
      results: mine,
      otif: callOffOtif(c.id, mine),
      dueDate: dates[0],
      tolerance: c.confirmation ? checkTolerance(c, c.confirmation.deliveries) : null,
      shortfall: confirmedShortfall(c),
    };
  });
}

/** CR-09 supplier reminder: confirmed, due within 7 days, no ASN or heads-up. */
export function isDueWithoutHeadsUp(v: CallOffView, nowIso: string): boolean {
  if (!isConfirmedAndAccepted(v.callOff) || v.headsUps.length > 0) return false;
  if (v.delivery !== 'notDue') return false;
  const days = daysBetween(nowIso.slice(0, 10), v.dueDate);
  return days >= 0 && days <= ANTICIPATION_DAYS;
}

/** CR-09 drift: 2 or more late or missed deliveries for one supplier and material. */
export interface DeliveryDrift {
  readonly supplierId: string;
  readonly supplierName: string;
  readonly materialCode: string;
  readonly count: number;
}

export function deliveryDrift(views: readonly CallOffView[]): readonly DeliveryDrift[] {
  const groups = new Map<string, DeliveryDrift>();
  for (const v of views) {
    const bad = v.results.filter(
      (r) => r.timing === 'missed' || (r.basis === 'receipt' && r.timing === 'late'),
    ).length;
    if (bad === 0) continue;
    const key = `${v.callOff.supplierId}|${v.callOff.materialCode}`;
    const prev = groups.get(key);
    groups.set(key, {
      supplierId: v.callOff.supplierId,
      supplierName: v.callOff.supplierName,
      materialCode: v.callOff.materialCode,
      count: (prev?.count ?? 0) + bad,
    });
  }
  return [...groups.values()].filter((g) => g.count >= DRIFT_COUNT);
}
