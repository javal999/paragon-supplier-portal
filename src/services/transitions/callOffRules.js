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

/** @import { ASN, AsnLineItem, CallOff, CallOffConfirmationKind, CallOffDelivery, CallOffStatus, CallOffType, CallOffWarning, PurchaseOrder, POLineItem } from '../data/types' */
import { POStatus } from '../data/types';
/** @import { GoodsReceipt } from '@data/mockGoodsReceipts' */
import { generateSchedule } from '../delivery/generator';
/** @import { ReleaseCadence } from '../delivery/types' */
import { DELIVERY_GRACE_DAYS, MATCH_WINDOW_DAYS } from '../delivery/fulfillment';
import { EARLY_DELIVERY_WINDOW_DAYS } from '../data/kpiWindow';
import { ANTICIPATION_DAYS, DRIFT_COUNT } from '../chase/deliveryChase';
/** @import { WorkingCalendar } from '@lib/workingCalendar' */
import { addWorkingDays, documentInstant } from '@lib/workingCalendar';
import { hubWorkingCalendar } from './workingCalendarStore';
/** @import { CallOffTolerance } from './callOffTolerance' */
import { callOffConfirmWorkingDays, callOffTolerance } from './callOffTolerance';

const DAY_MS = 86_400_000;

/** @type {readonly CallOffType[]} */
export const CALL_OFF_TYPES = ['jit', 'forecast'];
/** @type {readonly ReleaseCadence[]} */
export const CALL_OFF_CADENCES = ['weekly', 'monthly', 'quarterly'];

/**
 * An umbrella PO can take call-offs while it is approved and still open.
 * @type {readonly POStatus[]}
 */
export const CALL_OFF_PO_STATES = [POStatus.CONFIRMED, POStatus.PARTIALLY_DELIVERED];

/**
 * Supplier-confirmed states — a dispatch or an ASN may follow (BR-06).
 * @type {readonly CallOffStatus[]}
 */
export const CALL_OFF_CONFIRMED_STATES = [
  'Confirmed',
  'Confirmed with New Date',
  'Confirmed with Changes',
  'Partially Confirmed'
];

/** States whose quantity is drawn from the umbrella PO (CR-04). A draft is not
 * @type {readonly CallOffStatus[]}
 *  released, and a dismissed or rejected call-off gives its quantity back. */
const RELEASED_STATES = ['Awaiting Confirmation', ...CALL_OFF_CONFIRMED_STATES];

/**
 * @param {Pick<CallOff, 'status'>} c
 * @returns {boolean}
 */
export const isReleased = (c) => RELEASED_STATES.includes(c.status);

/**
 * X-03 (owner decision 2026-09-23) — a draft the Order plan created from an
 * engine recommendation is not released to a supplier while the engine runs on
 * simulated data. `engineLive` is the liveness registry's own answer for
 * `engineDataset`, read by the caller at the moment it asks (the policy hook at
 * dispatch, the page at render) — never a copied flag. Editing and dismissing
 * such a draft are unaffected.
 * @param {Pick<CallOff, 'origin'>} c
 * @param {boolean} engineLive
 * @returns {boolean}
 */
export const engineReleaseWithheld = (c, engineLive) => c.origin === 'engine' && !engineLive;

/**
 * @param {unknown} v
 * @returns {v is string}
 */
export const isNonBlank = (v) => typeof v === 'string' && v.trim().length > 0;

/**
 * A real calendar date written `YYYY-MM-DD`.
 * @param {unknown} v
 * @returns {v is string}
 */
export const isCallOffDate = (v) => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
};

/**
 * @param {unknown} v
 * @returns {v is number}
 */
export const isPositiveQty = (v) => typeof v === 'number' && Number.isFinite(v) && v > 0;

/** @param {string} d */
const dayMs = (d) => Date.parse(`${d.slice(0, 10)}T00:00:00.000Z`);
/**
 * @param {string} from
 * @param {string} to
 */
const daysBetween = (from, to) => Math.round((dayMs(to) - dayMs(from)) / DAY_MS);

// ── CR-04 · remaining on the umbrella PO ────────────────────────────────────

/**
 * What a release is checked against (CR-04; BL-13 decided on 2026-09-21 that
 * the umbrella PO holds a QUANTITY per line, so BL-49 makes quantity the
 * default). Value is the check only on a line that carries no quantity — an SAP
 * value-limit line, marked by `valueLimit`.
 */
/** @typedef {'quantity' | 'value'} ReleaseBasis */

/** @typedef {Pick<POLineItem, 'id' | 'quantity' | 'unitPrice' | 'valueLimit'>} UmbrellaLine */

/**
 * @param {UmbrellaLine} line
 * @returns {ReleaseBasis}
 */
export const releaseBasis = (line) => (line.valueLimit === undefined ? 'quantity' : 'value');

/**
 * `orderedQty`:  Ordered and remaining quantity — null on a line that has no quantity.
 *
 * @typedef {{
 *   readonly basis: ReleaseBasis;
 *   readonly orderedQty: number | null;
 *   readonly releasedQty: number;
 *   readonly remainingQty: number | null;
 *   readonly orderedValue: number;
 *   readonly releasedValue: number;
 *   readonly remainingValue: number;
 * }} UmbrellaRemaining
 */

/**
 * Remaining quantity = PO line quantity − released call-off quantity; remaining
 * value = PO line value − released call-off value, where a value-limit line's
 * ordered value is its limit. `excludeId` leaves one call-off out (the one being
 * released or changed).
 * @param {UmbrellaLine} line
 * @param {readonly CallOff[]} callOffs
 * @param {string} [excludeId]
 * @returns {UmbrellaRemaining}
 */
export function umbrellaRemaining(line, callOffs, excludeId) {
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
    remainingValue: orderedValue - releasedValue
  };
}

/** A release measured against what remains, in the line's own basis. */
/**
 * @typedef {{
 *   readonly basis: ReleaseBasis;
 *   readonly exceeds: boolean;
 *   readonly requestedQty: number;
 *   readonly requestedValue: number;
 *   readonly remaining: UmbrellaRemaining;
 * }} ReleaseCheck
 */

/**
 * REQ-E09-01 BR-04 / AC-03 with CR-04 — release is blocked beyond what remains:
 * on remaining QUANTITY by default, on remaining VALUE only where the line has
 * no quantity (BL-49). Exactly the remainder is allowed.
 * @param {number} quantity
 * @param {UmbrellaLine} line
 * @param {readonly CallOff[]} callOffs
 * @param {string} [excludeId]
 * @returns {ReleaseCheck}
 */
export function releaseCheck(quantity, line, callOffs, excludeId) {
  const remaining = umbrellaRemaining(line, callOffs, excludeId);
  const requestedValue = quantity * line.unitPrice;
  const exceeds =
    remaining.basis === 'quantity'
      ? quantity > (remaining.remainingQty ?? 0)
      : requestedValue > remaining.remainingValue;
  return { basis: remaining.basis, exceeds, requestedQty: quantity, requestedValue, remaining };
}

/**
 * @param {number} quantity
 * @param {UmbrellaLine} line
 * @param {readonly CallOff[]} callOffs
 * @param {string} [excludeId]
 * @returns {boolean}
 */
export function exceedsRemaining(quantity, line, callOffs, excludeId) {
  return releaseCheck(quantity, line, callOffs, excludeId).exceeds;
}

/** Why a call-off could not be placed on this PO line, or null. */
/** @typedef {'poNotFound' | 'poNotOpen' | 'lineNotFound'} UmbrellaRefusal */

/**
 * @param {PurchaseOrder | undefined} po
 * @param {unknown} lineId
 * @returns {UmbrellaRefusal | null}
 */
export function umbrellaRefusal(po, lineId) {
  if (!po) return 'poNotFound';
  if (!CALL_OFF_PO_STATES.includes(po.status)) return 'poNotOpen';
  if (!po.lineItems.some((li) => li.id === lineId)) return 'lineNotFound';
  return null;
}

// ── CR-04 BR-05 · series generator (reuses the delivery generator) ──────────

/**
 * `firstNeedDate`:  The first need date, `YYYY-MM-DD`.
 *
 * @typedef {{
 *   readonly totalQty: number;
 *   readonly qtyPerCallOff: number;
 *   readonly cadence: ReleaseCadence;
 *   readonly firstNeedDate: string;
 * }} SeriesInput
 */

/**
 * count = ceil(total ÷ qty per call-off); the last takes the remainder.
 * @param {SeriesInput} input
 * @returns {readonly CallOffDelivery[]}
 */
export function generateCallOffSeries(input) {
  if (!isCallOffDate(input.firstNeedDate)) return [];
  return generateSchedule({
    contractId: 'series',
    agreementId: 'series',
    lineSeq: 1,
    startDate: input.firstNeedDate,
    cadence: input.cadence,
    qtyPerRelease: input.qtyPerCallOff,
    agreedTotalQty: input.totalQty,
    releaseType: 'FRC'
  }).map((l) => ({ quantity: l.plannedQty, date: l.releaseDate }));
}

// ── REQ-E09-03 · supplier confirmation and tolerance (CR-05; BL-47, BL-56) ──

/** The deliveries a confirming answer proposes, or a refusal. */
/**
 * @typedef {| 'date'
 *   | 'sameDate'
 *   | 'quantity'
 *   | 'sameQuantity'
 *   | 'splitCount'
 *   | 'splitDates'} ConfirmationRefusal
 */

/**
 * @typedef {{
 *   readonly confirmedDate?: unknown;
 *   readonly confirmedQty?: unknown;
 *   readonly deliveries?: unknown;
 * }} ConfirmationInput
 */

/**
 * @param {Pick<CallOff, 'quantity' | 'needDate'>} callOff
 * @param {CallOffConfirmationKind} kind
 * @param {ConfirmationInput} input
 * @returns {{ deliveries: readonly CallOffDelivery[] } | { refusal: ConfirmationRefusal }}
 */
export function proposedDeliveries(callOff, kind, input) {
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
      const date =
        input.confirmedDate === undefined || input.confirmedDate === ''
          ? callOff.needDate
          : input.confirmedDate;
      if (!isCallOffDate(date)) return { refusal: 'date' };
      return { deliveries: [{ quantity: input.confirmedQty, date }] };
    }
    case 'partial': {
      const rows = input.deliveries;
      if (!Array.isArray(rows) || rows.length !== 2) return { refusal: 'splitCount' };
      /** @type {CallOffDelivery[]} */
      const out = [];
      for (const r of /** @type {Partial<CallOffDelivery>[]} */ (rows)) {
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
/** @typedef {'asRequested' | 'overWithin' | 'overBeyond' | 'short' | 'late' | 'early'} ToleranceFindingKind */

/**
 * `qty`:  Quantity over or short of the released quantity.
 * `pct`:  That quantity as a percentage of the released quantity (display only; the decision is exact).
 * `days`:  For `late` / `early`: the largest number of days off the need date.
 * `date`:  For `late` / `early`: the delivery date furthest from the need date.
 * `limit`:  The limit the finding was measured against (percent, or days for `early`).
 *
 * @typedef {{
 *   readonly kind: ToleranceFindingKind;
 *   readonly needsApproval: boolean;
 *   readonly qty?: number;
 *   readonly pct?: number;
 *   readonly days?: number;
 *   readonly date?: string;
 *   readonly limit?: number;
 * }} ToleranceFinding
 */

/** Where a confirmation falls against the tolerances (BR-03). */
/**
 * `within`:  Accepted automatically — nothing needs the planner.
 * `short`:  A shortfall: a visible partial delivery, which does NOT make `within` false.
 *
 * @typedef {{
 *   readonly within: boolean;
 *   readonly overQty: boolean;
 *   readonly short: boolean;
 *   readonly early: boolean;
 *   readonly late: boolean;
 *   readonly findings: readonly ToleranceFinding[];
 * }} ToleranceCheck
 */

/**
 * Percentage for display, to 2 decimals.
 * @param {number} part
 * @param {number} whole
 */
const pctOf = (part, whole) => Math.round((part / whole) * 10_000) / 100;

/**
 * @param {Pick<CallOff, 'quantity' | 'needDate'>} callOff
 * @param {readonly CallOffDelivery[]} deliveries
 * @param {CallOffTolerance} [tol]
 * @returns {ToleranceCheck}
 */
export function checkTolerance(
  callOff,
  deliveries,
  // Read at every call (BL-32): a default parameter is evaluated per call, so
  // the administrator's value in force decides, never a copy taken at load.
  tol = callOffTolerance()
) {
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

  /** @type {ToleranceFinding[]} */
  const findings = [];
  if (over > 0) {
    findings.push({
      kind: overQty ? 'overBeyond' : 'overWithin',
      needsApproval: overQty,
      qty: over,
      pct: pctOf(over, callOff.quantity),
      limit: tol.overPct
    });
  }
  if (short) {
    findings.push({
      kind: 'short',
      needsApproval: false,
      qty: -over,
      pct: pctOf(-over, callOff.quantity)
    });
  }
  if (late) findings.push({ kind: 'late', needsApproval: true, days: lateBy, date: latest });
  if (earlyBy > 0) {
    // An earlier date inside the allowance is accepted and says so; with the
    // placeholder at 0 days (BL-56) every earlier date needs approval.
    findings.push({
      kind: 'early',
      needsApproval: early,
      days: earlyBy,
      date: earliest,
      limit: tol.earlyDays
    });
  }
  if (findings.length === 0) findings.push({ kind: 'asRequested', needsApproval: false });

  return { within: !overQty && !late && !early, overQty, short, early, late, findings };
}

/**
 * The shortfall an ACCEPTED or waiting confirmation leaves against the released
 * quantity — the "visible partial" of CR-05. 0 when nothing is short or the
 * supplier has not answered.
 * @param {Pick<CallOff, 'quantity' | 'confirmation'>} c
 * @returns {number}
 */
export function confirmedShortfall(c) {
  if (!c.confirmation) return 0;
  const total = c.confirmation.deliveries.reduce((s, d) => s + d.quantity, 0);
  return Math.max(0, c.quantity - total);
}

/**
 * The stored state each confirming answer lands in.
 * @type {Readonly<Record<CallOffConfirmationKind, CallOffStatus>>}
 */
export const CONFIRMATION_STATE = {
  confirm: 'Confirmed',
  newDate: 'Confirmed with New Date',
  changes: 'Confirmed with Changes',
  partial: 'Partially Confirmed'
};

/**
 * @param {Pick<CallOff, 'confirmation'>} c
 * @returns {boolean}
 */
export const isAwaitingApproval = (c) => c.confirmation?.approval === 'awaiting';

/**
 * Confirmed by the supplier AND accepted (automatically or by the planner).
 * @param {Pick<CallOff, 'status' | 'confirmation'>} c
 * @returns {boolean}
 */
export const isConfirmedAndAccepted = (c) =>
  CALL_OFF_CONFIRMED_STATES.includes(c.status) && !isAwaitingApproval(c);

/**
 * The approved need date(s) and quantities OTIF is measured against (BR-07):
 * the accepted confirmation's deliveries; else what both sides last agreed
 * (BL-66 (2) — a planner's change applies only once the supplier confirms it
 * and that confirmation is accepted); else the released call-off, which is all
 * there is before the supplier has ever confirmed.
 * @param {CallOff} c
 * @returns {readonly CallOffDelivery[]}
 */
export function approvedDeliveries(c) {
  if (c.confirmation && isConfirmedAndAccepted(c)) return c.confirmation.deliveries;
  if (c.agreedDeliveries && c.agreedDeliveries.length > 0) return c.agreedDeliveries;
  return [{ quantity: c.quantity, date: c.needDate }];
}

// ── BR-05 · confirmation deadline and Escalated (derived) ──────────────────

/** BR-05 — 1 working day after release, on the hub's calendar (BL-50: every
 * @param {CallOff} c
 * @param {WorkingCalendar} [cal]
 * @returns {Date | null}
 *  deadline reads the calendar the administrator maintains). */
export function confirmationDeadline(c, cal = hubWorkingCalendar()) {
  if (!c.releasedAt) return null;
  return addWorkingDays(documentInstant(c.releasedAt, cal), callOffConfirmWorkingDays(), cal);
}

/**
 * @param {CallOff} c
 * @param {string} nowIso
 * @returns {boolean}
 */
export function isCallOffEscalated(c, nowIso) {
  if (c.status !== 'Awaiting Confirmation') return false;
  const due = confirmationDeadline(c);
  return !!due && due.getTime() < Date.parse(nowIso);
}

// ── REQ-E09-04 · dispatch heads-ups (a linked ASN counts as one) ────────────

/**
 * @typedef {{
 *   readonly source: 'notice' | 'asn';
 *   readonly ref: string;
 *   readonly shippedDate: string;
 *   readonly expectedArrival: string;
 *   readonly quantity: number;
 * }} HeadsUp
 */

/** ASN states that mean goods have left (a draft has not shipped, nor has an
 *  ASN awaiting a shelf-life exception — MR-6 BR-08). */
const SHIPPED_ASN_STATES = ['Submitted', 'In Transit', 'Delivered', 'Discrepancy'];

/**
 * The call-off's heads-ups: its own dispatch notices, plus every shipped ASN
 * linked to it (BR-05 — the supplier does not report twice). An ASN a notice
 * already names is not counted again.
 * @param {CallOff} c
 * @param {readonly ASN[]} asns
 * @returns {readonly HeadsUp[]}
 */
export function headsUpsFor(c, asns) {
  /** @type {HeadsUp[]} */
  const notices = c.dispatches.map((d) => ({
    source: 'notice',
    ref: d.id,
    shippedDate: d.shippedDate,
    expectedArrival: d.expectedArrival,
    quantity: d.quantity
  }));
  const named = new Set(c.dispatches.map((d) => d.asnNumber).filter(Boolean));
  /** @type {HeadsUp[]} */
  const fromAsns = asns
    .filter(
      (a) =>
        a.callOffId === c.id && SHIPPED_ASN_STATES.includes(a.status) && !named.has(a.asnNumber)
    )
    .map((a) => ({
      source: 'asn',
      ref: a.asnNumber,
      shippedDate: a.shipDate ?? a.eta.slice(0, 10),
      expectedArrival: a.eta.slice(0, 10),
      quantity: a.lineItems
        .filter((l) => l.materialCode === c.materialCode)
        .reduce((s, l) => s + l.shippedQty, 0)
    }));
  return [...notices, ...fromAsns].sort((a, b) =>
    a.expectedArrival.localeCompare(b.expectedArrival)
  );
}

/**
 * At Risk (REQ-E09-04 edge case): a heads-up arrives after the approved date of
 * the delivery it fills. Heads-ups fill the approved deliveries in date order.
 * @param {CallOff} c
 * @param {readonly HeadsUp[]} headsUps
 * @returns {boolean}
 */
export function isAtRisk(c, headsUps) {
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

// ── MR-6 BR-10 to BR-12 · the ASN against its call-off (warnings only) ─────

/** The ASN fields the call-off check reads. `asnNumber` is '' for an ASN the wizard has not created yet. */
/**
 * `lineItems`:  The lines as entered: material and shipped quantity.
 *
 * @typedef {Pick<ASN, 'asnNumber' | 'eta'> & Partial<Pick<ASN, 'shipDate' | 'callOffFinal' | 'callOffId' | 'poReference'>> & {
 *     readonly lineItems: readonly Pick<AsnLineItem, 'materialCode' | 'shippedQty'>[];
 *   }} AsnForCallOffCheck
 */

/**
 * @param {{ readonly lineItems: readonly Pick<AsnLineItem, 'materialCode' | 'shippedQty'>[] }} a
 * @param {string} materialCode
 * @returns {number}
 */
const shippedOf = (a, materialCode) =>
  a.lineItems
    .filter((l) => l.materialCode === materialCode && Number.isFinite(l.shippedQty))
    .reduce((s, l) => s + l.shippedQty, 0);

/**
 * Order of shipment: ship date (else ETA), then ASN number.
 * @param {Pick<ASN, 'asnNumber' | 'eta'> & Partial<Pick<ASN, 'shipDate'>>} a
 * @returns {string}
 */
const shipKey = (a) => `${(a.shipDate ?? a.eta ?? '').slice(0, 10)}|${a.asnNumber}`;

/**
 * The call-off's ASNs shipped before this one: linked to it, shipped (a draft
 * has not left, a cancelled one never will), and earlier by ship date then ASN
 * number. An ASN not yet numbered (the wizard's) comes after all of them.
 * @param {string} callOffId
 * @param {readonly ASN[]} asns
 * @param {AsnForCallOffCheck} asn
 * @returns {ASN[]}
 */
function earlierAsns(callOffId, asns, asn) {
  const mine = shipKey(asn);
  return asns.filter(
    (a) =>
      a.callOffId === callOffId &&
      a.asnNumber !== asn.asnNumber &&
      SHIPPED_ASN_STATES.includes(a.status) &&
      (asn.asnNumber === '' || shipKey(a) < mine)
  );
}

/**
 * MR-6 BR-10 — how an ASN differs from the call-off it ships. PURE; warnings
 * only, never a refusal (BR-12). The same function feeds the wizard's confirm
 * step, the Submit drawer, the record stored at submit, and the planner's
 * "Mismatch" marker, which recomputes it on read (edge case 6).
 *
 * · Quantity, per material: the call-off's shipped total (its earlier shipped
 *   ASNs plus this one) against the agreed total — the approved deliveries,
 *   so a call-off confirmed with changes or re-agreed is compared with what
 *   was agreed, not the original release (edge case 5). Over by more than
 *   `callOff.overPct` warns; under warns only once the ASN is marked final.
 * · Date: the ETA against the agreed delivery this ASN fills (deliveries fill
 *   in date order, as `isAtRisk` reads them). Earlier than the agreed date
 *   minus `callOff.earlyAllowanceDays` warns; any day later warns.
 * · Material: an ASN line whose material is not the call-off's.
 * @param {CallOff} callOff
 * @param {readonly ASN[]} asns
 * @param {AsnForCallOffCheck} asn
 * @param {CallOffTolerance} [tol]
 * @returns {CallOffWarning[]}
 */
export function callOffWarnings(
  callOff,
  asns,
  asn,
  // Read at every call (BL-32), as `checkTolerance` does.
  tol = callOffTolerance()
) {
  /** @type {CallOffWarning[]} */
  const out = [];
  const callOffNumber = callOff.callOffNumber;
  for (const l of asn.lineItems) {
    if (l.materialCode !== callOff.materialCode) {
      out.push({
        kind: 'material',
        detail: {
          callOffNumber,
          materialCode: l.materialCode,
          expectedMaterial: callOff.materialCode
        }
      });
    }
  }
  const prior = earlierAsns(callOff.id, asns, asn).reduce(
    (s, a) => s + shippedOf(a, callOff.materialCode),
    0
  );
  const shipped = prior + shippedOf(asn, callOff.materialCode);
  const slots = [...approvedDeliveries(callOff)].sort((a, b) => a.date.localeCompare(b.date));
  const agreed = slots.reduce((s, d) => s + d.quantity, 0);
  const diff = shipped - agreed;
  // Exact comparison, as CR-05's: diff / agreed > pct / 100.
  if (diff > 0 && diff * 100 > tol.overPct * agreed) {
    out.push({
      kind: 'qtyOver',
      detail: { callOffNumber, shipped, agreed, pct: pctOf(diff, agreed), limit: tol.overPct }
    });
  }
  if (diff < 0 && asn.callOffFinal === true) {
    out.push({
      kind: 'qtyUnder',
      detail: { callOffNumber, shipped, agreed, pct: pctOf(-diff, agreed) }
    });
  }
  const eta = (asn.eta ?? '').slice(0, 10);
  if (isCallOffDate(eta) && slots.length > 0) {
    let filled = 0;
    const slot = slots.find((d) => (filled += d.quantity) > prior) ?? slots[slots.length - 1];
    const days = daysBetween(slot.date, eta);
    if (days > 0) {
      out.push({ kind: 'late', detail: { callOffNumber, eta, agreedDate: slot.date, days } });
    } else if (-days > tol.earlyDays) {
      out.push({
        kind: 'early',
        detail: { callOffNumber, eta, agreedDate: slot.date, days: -days, limit: tol.earlyDays }
      });
    }
  }
  return out;
}

/**
 * MR-6 BR-11 — an OPEN confirmed call-off: confirmed and accepted, and its
 * delivery not yet settled (not due, dispatched or at risk — not delivered,
 * late-received or missed).
 * @param {Pick<CallOffView, 'callOff' | 'delivery'>} v
 * @returns {boolean}
 */
export function isOpenCallOff(v) {
  return (
    isConfirmedAndAccepted(v.callOff) &&
    (v.delivery === 'notDue' || v.delivery === 'dispatched' || v.delivery === 'atRisk')
  );
}

/**
 * MR-6 BR-11 — "This PO line has an open call-off; link it?": the ASN names no
 * call-off, ships the PO line's material, and the line has an open confirmed
 * call-off. `callOffs` are the open ones (`isOpenCallOff`). A warning only.
 * @param {Pick<POLineItem, 'id' | 'materialCode'>} poLine
 * @param {readonly CallOff[]} callOffs
 * @param {AsnForCallOffCheck} asn
 * @returns {CallOffWarning | null}
 */
export function unlinkedCallOffWarning(poLine, callOffs, asn) {
  if (asn.callOffId) return null;
  if (shippedOf(asn, poLine.materialCode) <= 0) return null;
  const open = callOffs.filter(
    (c) =>
      c.poLineId === poLine.id &&
      (asn.poReference === undefined || c.poNumber === asn.poReference) &&
      isConfirmedAndAccepted(c)
  );
  if (open.length === 0) return null;
  return {
    kind: 'unlinked',
    detail: { materialCode: poLine.materialCode, callOffNumbers: open.map((c) => c.callOffNumber) }
  };
}

/**
 * Every call-off warning an ASN carries now: BR-10 against the call-off it
 * names, else BR-11 for each PO line (read off the PO's call-offs) with an
 * open confirmed call-off. An ASN naming a call-off that is gone warns nothing.
 * `views` are the call-off projection (`callOffViews`), which is what knows
 * whether a call-off is still open.
 * @param {AsnForCallOffCheck} asn
 * @param {readonly Pick<CallOffView, 'callOff' | 'delivery'>[]} views
 * @param {readonly ASN[]} asns
 * @param {CallOffTolerance} [tol]
 * @returns {CallOffWarning[]}
 */
export function asnCallOffWarnings(asn, views, asns, tol = callOffTolerance()) {
  if (asn.callOffId) {
    const c = views.find((v) => v.callOff.id === asn.callOffId)?.callOff;
    return c ? callOffWarnings(c, asns, asn, tol) : [];
  }
  const open = views.filter(isOpenCallOff).map((v) => v.callOff);
  const lines = /** @type {Map<string, Pick<POLineItem, 'id' | 'materialCode'>>} */ (new Map());
  for (const c of open) {
    if (c.poNumber === asn.poReference && !lines.has(c.poLineId))
      lines.set(c.poLineId, { id: c.poLineId, materialCode: c.materialCode });
  }
  return [...lines.values()]
    .map((l) => unlinkedCallOffWarning(l, open, asn))
    .filter(/** @returns {w is CallOffWarning} */ (w) => w !== null);
}

// ── MR-6 BR-13 · confirmed call-offs the supplier's stock must cover ────────

/** A supplier × material's confirmed call-off deliveries still to ship, in date order. */
/**
 * @typedef {{
 *   readonly supplierId: string;
 *   readonly supplierName: string;
 *   readonly materialCode: string;
 *   readonly deliveries: readonly CallOffDelivery[];
 * }} CallOffCoverSubject
 */

/**
 * MR-6 BR-13 — what the supplier's stock has to cover: every OPEN confirmed
 * call-off's approved deliveries (`isOpenCallOff` — a call-off already
 * received, received late or missed is not asked of stock), less what its
 * heads-ups (linked shipped ASNs and dispatch notices) already carry, earliest
 * first. Grouped per supplier × material, so two call-offs that each fit but
 * together do not are seen together.
 * @param {readonly Pick<CallOffView, 'callOff' | 'delivery' | 'headsUps'>[]} views
 * @returns {CallOffCoverSubject[]}
 */
export function callOffCoverSubjects(views) {
  const groups =
    /** @type {Map<string, { supplierId: string; supplierName: string; materialCode: string; deliveries: CallOffDelivery[] }>} */ (
      new Map()
    );
  for (const v of views) {
    if (!isOpenCallOff(v)) continue;
    const c = v.callOff;
    let sent = v.headsUps.reduce((s, h) => s + h.quantity, 0);
    /** @type {CallOffDelivery[]} */
    const outstanding = [];
    for (const d of [...approvedDeliveries(c)].sort((a, b) => a.date.localeCompare(b.date))) {
      const take = Math.min(sent, d.quantity);
      sent -= take;
      if (d.quantity - take > 0) outstanding.push({ quantity: d.quantity - take, date: d.date });
    }
    if (outstanding.length === 0) continue;
    const key = `${c.supplierId}|${c.materialCode}`;
    const g = groups.get(key) ?? {
      supplierId: c.supplierId,
      supplierName: c.supplierName,
      materialCode: c.materialCode,
      deliveries: []
    };
    g.deliveries.push(...outstanding);
    groups.set(key, g);
  }
  return [...groups.values()].map((g) => ({
    ...g,
    deliveries: [...g.deliveries].sort((a, b) => a.date.localeCompare(b.date))
  }));
}

// ── CR-06 to CR-08 · delivery result and OTIF (pure; reused by Phase 6) ─────

/** A goods receipt line, reduced to what the match needs. */
/**
 * @typedef {{
 *   readonly ref: string;
 *   readonly supplierId: string;
 *   readonly materialCode: string;
 *   readonly date: string;
 *   readonly quantity: number;
 * }} ReceiptEvent
 */

/**
 * @param {readonly GoodsReceipt[]} receipts
 * @returns {readonly ReceiptEvent[]}
 */
export function receiptEvents(receipts) {
  return receipts.flatMap((gr) =>
    gr.inspectionResults.map((r) => ({
      ref: gr.grNumber,
      supplierId: gr.supplierId,
      materialCode: r.materialCode,
      date: gr.receivedDate.slice(0, 10),
      quantity: r.qtyReceived
    }))
  );
}

/** @typedef {'onTime' | 'late' | 'missed' | 'pending'} DeliveryTiming */

/**
 * `seq`:  Index of the approved delivery (a partially confirmed call-off has 2).
 * `inFull`:  CR-08: received (or dispatched) quantity ≥ approved quantity; null while pending or missed.
 * `basis`:  What the result rests on: goods receipts, the supplier's heads-up, or nothing yet.
 * `ref`:  The first receipt matched (or the heads-up).
 * `refs`:  Every receipt counted toward this delivery, first match first (BL-66 (3)).
 * `quantity`:  The quantity counted: the SUM of the matched receipts (or the heads-up's).
 *
 * @typedef {{
 *   readonly callOffId: string;
 *   readonly seq: number;
 *   readonly approvedDate: string;
 *   readonly approvedQty: number;
 *   readonly timing: DeliveryTiming;
 *   readonly inFull: boolean | null;
 *   readonly basis: 'receipt' | 'dispatch' | 'none';
 *   readonly ref?: string;
 *   readonly refs?: readonly string[];
 *   readonly quantity?: number;
 * }} DeliveryResult
 */

/**
 * Call-offs whose delivery is measured: released, not rejected, not a draft.
 * @param {CallOff} c
 * @returns {boolean}
 */
export const isMeasured = (c) => isReleased(c);

/**
 * Delivery results for every measured call-off, per approved delivery.
 *
 * CR-06: a receipt counts toward a delivery of the same supplier and material
 * when it arrives no more than EARLY_DELIVERY_WINDOW_DAYS before the approved
 * date and no more than MATCH_WINDOW_DAYS after it. Deliveries take receipts in
 * date order, each the closest date then the closest quantity, and a receipt is
 * used once.
 *
 * CR-08 (BL-66 (3)): "in full" is the SUM of every receipt matched to the
 * delivery. After each delivery has taken its closest receipt, every receipt
 * still unused goes to the nearest delivery (same supplier and material, inside
 * its window) that is still short — so two partial receipts add up, while a
 * receipt that is another call-off's closest match is never taken from it. A
 * delivery is on time only when every receipt counted for it arrived on or
 * before its approved date (CR-07).
 *
 * CR-07 (BL-66 (5)): with no receipt, a delivery is MISSED once
 * DELIVERY_GRACE_DAYS have passed after its approved date — whether or not the
 * supplier sent a heads-up. Before then a heads-up (ASN or notice, dated by
 * expected arrival) stands in as a provisional result, and nothing at all is
 * pending.
 * @param {readonly CallOff[]} callOffs
 * @param {readonly ReceiptEvent[]} receipts
 * @param {readonly ASN[]} asns
 * @param {string} nowIso
 * @returns {readonly DeliveryResult[]}
 */
export function deliveryResults(callOffs, receipts, asns, nowIso) {
  const slots = callOffs
    .filter(isMeasured)
    .flatMap((c) => approvedDeliveries(c).map((d, seq) => ({ c, d, seq })))
    .sort(
      (a, b) => a.d.date.localeCompare(b.d.date) || a.c.id.localeCompare(b.c.id) || a.seq - b.seq
    );
  /** @typedef {(typeof slots)[number]} Slot */
  /**
   * @param {Slot} s
   * @param {ReceiptEvent} r
   * @returns {boolean}
   */
  const matchable = (s, r) => {
    const offset = daysBetween(s.d.date, r.date);
    return (
      r.supplierId === s.c.supplierId &&
      r.materialCode === s.c.materialCode &&
      offset >= -EARLY_DELIVERY_WINDOW_DAYS &&
      offset <= MATCH_WINDOW_DAYS
    );
  };
  const used = /** @type {Set<ReceiptEvent>} */ (new Set());
  const matched = /** @type {Map<Slot, ReceiptEvent[]>} */ (new Map());

  // Pass 1 — CR-06: each delivery takes its closest receipt.
  for (const s of slots) {
    const candidates = receipts.filter((r) => !used.has(r) && matchable(s, r));
    if (candidates.length === 0) continue;
    const pick = [...candidates].sort(
      (a, b) =>
        Math.abs(daysBetween(s.d.date, a.date)) - Math.abs(daysBetween(s.d.date, b.date)) ||
        Math.abs(a.quantity - s.d.quantity) - Math.abs(b.quantity - s.d.quantity) ||
        a.ref.localeCompare(b.ref)
    )[0];
    used.add(pick);
    matched.set(s, [pick]);
  }

  // Pass 2 — CR-08: a receipt left over tops up the nearest delivery still short.
  /**
   * @param {readonly ReceiptEvent[]} rs
   * @returns {number}
   */
  const total = (rs) => rs.reduce((t, r) => t + r.quantity, 0);
  const leftovers = receipts
    .filter((r) => !used.has(r))
    .sort((a, b) => a.date.localeCompare(b.date) || a.ref.localeCompare(b.ref));
  for (const r of leftovers) {
    const short = slots.filter((s) => {
      const got = matched.get(s);
      return got !== undefined && total(got) < s.d.quantity && matchable(s, r);
    });
    if (short.length === 0) continue;
    // `slots` is date-ordered, so a tie on distance goes to the earlier delivery.
    const target = [...short].sort(
      (a, b) => Math.abs(daysBetween(a.d.date, r.date)) - Math.abs(daysBetween(b.d.date, r.date))
    )[0];
    used.add(r);
    /** @type {NonNullable<ReturnType<typeof matched.get>>} */ (matched.get(target)).push(r);
  }

  const headsUpCache = /** @type {Map<string, HeadsUp[]>} */ (new Map());
  const nowDay = nowIso.slice(0, 10);
  /** @type {DeliveryResult[]} */
  const out = [];
  for (const s of slots) {
    const { c, d, seq } = s;
    const base = { callOffId: c.id, seq, approvedDate: d.date, approvedQty: d.quantity };
    const got = matched.get(s);
    if (got) {
      const quantity = total(got);
      out.push({
        ...base,
        timing: got.every((r) => r.date <= d.date) ? 'onTime' : 'late',
        inFull: quantity >= d.quantity,
        basis: 'receipt',
        ref: got[0].ref,
        refs: got.map((r) => r.ref),
        quantity
      });
      continue;
    }
    if (!headsUpCache.has(c.id)) headsUpCache.set(c.id, [...headsUpsFor(c, asns)]);
    const h = /** @type {NonNullable<ReturnType<typeof headsUpCache.get>>} */ (
      headsUpCache.get(c.id)
    ).shift();
    const missed = daysBetween(d.date, nowDay) > DELIVERY_GRACE_DAYS;
    if (h) {
      out.push({
        ...base,
        // Nothing received DELIVERY_GRACE_DAYS after the date: missed, even
        // though it was dispatched (BL-66 (5)). Before then, the heads-up.
        timing: missed ? 'missed' : h.expectedArrival <= d.date ? 'onTime' : 'late',
        inFull: missed ? null : h.quantity >= d.quantity,
        basis: 'dispatch',
        ref: h.ref,
        quantity: h.quantity
      });
      continue;
    }
    out.push({ ...base, timing: missed ? 'missed' : 'pending', inFull: null, basis: 'none' });
  }
  return out;
}

/**
 * OTIF for one call-off (REQ-E10-01, measured per call-off): 1 when every
 * approved delivery was received on time and in full, 0 when any was late,
 * short or missed, null while any is still pending or only dispatched. Phase 6
 * reads this for the performance dashboard.
 * @param {string} callOffId
 * @param {readonly DeliveryResult[]} results
 * @returns {1 | 0 | null}
 */
export function callOffOtif(callOffId, results) {
  const mine = results.filter((r) => r.callOffId === callOffId);
  if (mine.length === 0) return null;
  if (
    mine.some(
      (r) =>
        r.timing === 'missed' ||
        (r.basis === 'receipt' && (r.timing === 'late' || r.inFull === false))
    )
  ) {
    return 0;
  }
  if (mine.every((r) => r.basis === 'receipt' && r.timing === 'onTime' && r.inFull === true))
    return 1;
  return null;
}

// ── The status a call-off shows, and the reminders (CR-09) ──────────────────

/**
 * @typedef {| 'notDue'
 *   | 'dispatched'
 *   | 'atRisk'
 *   | 'deliveredOnTime'
 *   | 'late'
 *   | 'missed'} CallOffDeliveryStatus
 */

/**
 * `confirmation`:  Confirmation status: the stored state, Awaiting Approval, or Escalated.
 * `dueDate`:  The earliest approved date — "must come".
 * `tolerance`:  The tolerance rule applied to the supplier's confirmation, read now (CR-05); null before an answer.
 * `shortfall`:  The confirmed shortfall against the released quantity — the visible partial (CR-05).
 *
 * @typedef {{
 *   readonly callOff: CallOff;
 *   readonly confirmation: CallOffStatus | 'Awaiting Approval' | 'Escalated';
 *   readonly delivery: CallOffDeliveryStatus | null;
 *   readonly deadline: Date | null;
 *   readonly headsUps: readonly HeadsUp[];
 *   readonly results: readonly DeliveryResult[];
 *   readonly otif: 1 | 0 | null;
 *   readonly dueDate: string;
 *   readonly tolerance: ToleranceCheck | null;
 *   readonly shortfall: number;
 * }} CallOffView
 */

/**
 * @param {readonly CallOff[]} callOffs
 * @param {readonly ASN[]} asns
 * @param {readonly GoodsReceipt[]} receipts
 * @param {string} nowIso
 * @returns {readonly CallOffView[]}
 */
export function callOffViews(callOffs, asns, receipts, nowIso) {
  const results = deliveryResults(callOffs, receiptEvents(receipts), asns, nowIso);
  return callOffs.map((c) => {
    const mine = results.filter((r) => r.callOffId === c.id);
    const headsUps = headsUpsFor(c, asns);
    /** @type {CallOffView['confirmation']} */
    const confirmation = isCallOffEscalated(c, nowIso)
      ? 'Escalated'
      : isAwaitingApproval(c)
        ? 'Awaiting Approval'
        : c.status;
    /** @type {CallOffDeliveryStatus | null} */
    let delivery = null;
    if (isConfirmedAndAccepted(c)) {
      const received = mine.filter((r) => r.basis === 'receipt');
      if (mine.some((r) => r.timing === 'missed')) delivery = 'missed';
      else if (received.some((r) => r.timing === 'late')) delivery = 'late';
      else if (received.length > 0 && received.length === mine.length) delivery = 'deliveredOnTime';
      else if (isAtRisk(c, headsUps)) delivery = 'atRisk';
      else if (headsUps.length > 0) delivery = 'dispatched';
      else delivery = 'notDue';
    }
    const dates = approvedDeliveries(c)
      .map((d) => d.date)
      .sort();
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
      shortfall: confirmedShortfall(c)
    };
  });
}

/**
 * CR-09 supplier reminder: confirmed, due within 7 days, no ASN or heads-up.
 * @param {CallOffView} v
 * @param {string} nowIso
 * @returns {boolean}
 */
export function isDueWithoutHeadsUp(v, nowIso) {
  if (!isConfirmedAndAccepted(v.callOff) || v.headsUps.length > 0) return false;
  if (v.delivery !== 'notDue') return false;
  const days = daysBetween(nowIso.slice(0, 10), v.dueDate);
  return days >= 0 && days <= ANTICIPATION_DAYS;
}

/** CR-09 drift: 2 or more late or missed deliveries for one supplier and material. */
/**
 * @typedef {{
 *   readonly supplierId: string;
 *   readonly supplierName: string;
 *   readonly materialCode: string;
 *   readonly count: number;
 * }} DeliveryDrift
 */

/**
 * @param {readonly CallOffView[]} views
 * @returns {readonly DeliveryDrift[]}
 */
export function deliveryDrift(views) {
  const groups = /** @type {Map<string, DeliveryDrift>} */ (new Map());
  for (const v of views) {
    const bad = v.results.filter(
      (r) => r.timing === 'missed' || (r.basis === 'receipt' && r.timing === 'late')
    ).length;
    if (bad === 0) continue;
    const key = `${v.callOff.supplierId}|${v.callOff.materialCode}`;
    const prev = groups.get(key);
    groups.set(key, {
      supplierId: v.callOff.supplierId,
      supplierName: v.callOff.supplierName,
      materialCode: v.callOff.materialCode,
      count: (prev?.count ?? 0) + bad
    });
  }
  return [...groups.values()].filter((g) => g.count >= DRIFT_COUNT);
}
