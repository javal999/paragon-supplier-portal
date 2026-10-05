// ─────────────────────────────────────────────────────────────────────────────
// SUPPLIER PERFORMANCE RULES — REQ-E10-01 (CFOT and OTIF), CR-06 to CR-08,
// CR-17, and REQ-E07-02 BR-07 (a rejection counts in the assessment).
//
// Pure functions. Nothing here reads a clock: every derivation takes the instant
// it reasons about, so a period, an "on time" and a grade are computed at read
// time and never stored (law 0.5).
//
// The delivery arithmetic is REUSED, not rewritten: OTIF per call-off is Phase
// 3's `callOffOtif` over Phase 3's `deliveryResults` (CR-06 matching, CR-07
// timing, CR-08 in-full). This module adds only what REQ-E10-01 asks for on top
// of it — the period window, the CFOT-per-PO formula (BR-05), the rejection
// counts (BR-04) and the aggregation per supplier.
//
// ⚠️ "NO HISTORY" IS A REAL ANSWER AND IS NEVER 0%. A supplier with nothing
// measurable in the period has no percentage — printing 0 would make the
// supplier nobody has ordered from the worst performer in the room. Every
// aggregate here returns `null` for that case, which is the shape Phase 6a
// established for the supplier master's own OTIF.
// ─────────────────────────────────────────────────────────────────────────────

/** @import { ASN, CallOff, PurchaseOrder } from './types' */
/** @import { GoodsReceipt } from '@data/mockGoodsReceipts' */
/** @import { CallOffView } from '../transitions/callOffRules' */
import { callOffViews } from '../transitions/callOffRules';
/** @import { TargetStatus } from '@lib/chartPalette' */
import { targetStatus } from '@lib/chartPalette';
import { receivedOnTimeFor } from './kpiWindow';
import { complianceScoreWeight } from '../transitions/inventoryConfig';
/** @import { UpdateCompliance } from '../transitions/updateCompliance' */

const DAY_MS = 86_400_000;

// ── The period (REQ-E10-01 BR-08) ───────────────────────────────────────────

/** The periods the performance surfaces offer. Trailing windows ending today. */
export const PERFORMANCE_PERIODS = /** @type {const} */ (['30d', '90d', 'ytd']);
/** @typedef {(typeof PERFORMANCE_PERIODS)[number]} PerformancePeriod */

/**
 * Trailing length in days. `ytd` is computed from the year, not from a length.
 * @type {Readonly<Record<Exclude<PerformancePeriod, 'ytd'>, number>>}
 */
const PERIOD_DAYS = {
  '30d': 30,
  '90d': 90
};

/**
 * The period's first day, `YYYY-MM-DD` inclusive. The last day is always the
 * day of `nowIso`, so nothing in a period is still in the future.
 * @param {PerformancePeriod} period
 * @param {string} nowIso
 * @returns {string}
 */
export function periodStart(period, nowIso) {
  const today = nowIso.slice(0, 10);
  if (period === 'ytd') return `${today.slice(0, 4)}-01-01`;
  const t = Date.parse(`${today}T00:00:00.000Z`);
  return new Date(t - PERIOD_DAYS[period] * DAY_MS).toISOString().slice(0, 10);
}

/**
 * Is `date` (`YYYY-MM-DD`) inside the period that ends on the day of `nowIso`?
 * @param {string} date
 * @param {PerformancePeriod} period
 * @param {string} nowIso
 * @returns {boolean}
 */
export function inPeriod(date, period, nowIso) {
  if (!date) return false;
  const day = date.slice(0, 10);
  return day >= periodStart(period, nowIso) && day <= nowIso.slice(0, 10);
}

// ── CR-17 · the target and its status ───────────────────────────────────────

/** CR-17 — target 90%, "near" from 80% up to the target. */
export const OTIF_TARGET_PCT = 90;
export const OTIF_NEAR_BAND = 10;

/**
 * The target status of a measured percentage, or null when nothing is measured.
 * @param {number | null} pct
 * @returns {TargetStatus | null}
 */
export function performanceStatus(pct) {
  return pct === null ? null : targetStatus(pct, OTIF_TARGET_PCT, OTIF_NEAR_BAND);
}

// ── The grade bands (derived from the score, never stored) ──────────────────

/** @typedef {'A' | 'B' | 'C' | 'D'} PerformanceGrade */

/**
 * THE BAND TABLE, stated once and shown on screen. A grade is a reading of the
 * calculated score, so a stored letter cannot disagree with the figures beside
 * it.
 * @type {readonly { readonly grade: PerformanceGrade; readonly min: number }[]}
 */
export const GRADE_BANDS = Object.freeze([
  { grade: 'A', min: 90 },
  { grade: 'B', min: 80 },
  { grade: 'C', min: 70 },
  { grade: 'D', min: 0 }
]);

/**
 * The letter for a score, or null when there is no score to read.
 * @param {number | null} score
 * @returns {PerformanceGrade | null}
 */
export function gradeFor(score) {
  if (score === null) return null;
  return GRADE_BANDS.find((b) => score >= b.min)?.grade ?? 'D';
}

/**
 * REQ-E07-02 BR-07 / REQ-E10-01 BR-04 — each rejection costs the assessment
 * this many points. One stated number rather than a hidden weighting.
 */
export const REJECTION_PENALTY_POINTS = 5;

// ── CR-06 to CR-08 · OTIF per call-off, aggregated (BR-02, BR-06) ───────────

/**
 * `pct`:  Share of measured call-offs that were on time AND in full, 0–100.
 * `measured`:  Call-offs due in the period whose result is decided (the denominator).
 * `met`:  Of those, the ones that met on time and in full.
 * `pending`:  Due in the period but still open (dispatched or not yet due) — not counted.
 *
 * @typedef {{
 *   readonly pct: number | null;
 *   readonly measured: number;
 *   readonly met: number;
 *   readonly pending: number;
 * }} OtifAggregate
 */

/** @type {OtifAggregate} */
const EMPTY_OTIF = Object.freeze({ pct: null, measured: 0, met: 0, pending: 0 });

/**
 * Aggregate OTIF over the call-off views that are DUE in the period (BR-06).
 *
 * A call-off whose result is still undecided (nothing received yet, or only a
 * dispatch heads-up) is counted as pending and left OUT of the denominator —
 * it has not failed, so counting it as a miss would be an invented result.
 * @param {readonly CallOffView[]} views
 * @param {PerformancePeriod} period
 * @param {string} nowIso
 * @returns {OtifAggregate}
 */
export function otifAggregate(views, period, nowIso) {
  const due = views.filter((v) => inPeriod(v.dueDate, period, nowIso));
  const decided = due.filter((v) => v.otif !== null);
  if (decided.length === 0) {
    return { ...EMPTY_OTIF, pending: due.length };
  }
  const met = decided.filter((v) => v.otif === 1).length;
  return {
    pct: Math.round((met / decided.length) * 100),
    measured: decided.length,
    met,
    pending: due.length - decided.length
  };
}

// ── REQ-E10-01 BR-05 · CFOT per PO ──────────────────────────────────────────

/**
 * `confirmedDate`:  The date the PO was confirmed for — what "on time" is measured against.
 * `confirmedQty`:  Quantity the supplier confirmed (a rejected order confirms nothing).
 * `deliveredOnTimeQty`:  Of the confirmed quantity, what arrived on or before the confirmed date.
 * `pct`:  BR-05 — confirmed and delivered by the confirmed date ÷ PO quantity, 0–100.
 *
 * @typedef {{
 *   readonly poId: string;
 *   readonly poNumber: string;
 *   readonly supplierId: string;
 *   readonly confirmedDate: string;
 *   readonly orderedQty: number;
 *   readonly confirmedQty: number;
 *   readonly deliveredOnTimeQty: number;
 *   readonly pct: number;
 * }} PoCfot
 */

/**
 * The quantity a PO line is confirmed for: the counter-offer when one was accepted.
 * @param {PurchaseOrder} po
 * @param {string} lineId
 * @param {number} orderedQty
 * @returns {{ qty: number; date: string }}
 */
function confirmedLine(po, lineId, orderedQty) {
  const fallback = { qty: orderedQty, date: po.confirmedDeliveryDate.slice(0, 10) };
  const response = po.response;
  if (!response) return fallback;
  if (response.option === 'reject') return { qty: 0, date: fallback.date };
  if (response.option !== 'adjust') return fallback;
  // BL-66 (1) — a counter-offer only binds once the planner ACCEPTED it. While
  // it waits (no review yet) or after a rejection, the order still stands as
  // PTI placed it. (Until BL-82 the guard read `review && decision !==
  // 'accepted'`, which let a waiting counter-offer bind the moment it was sent.)
  if (response.review?.decision !== 'accepted') return fallback;
  const line = response.lines?.find((l) => l.lineId === lineId);
  if (!line) return fallback;
  return { qty: line.counterQty, date: line.counterDate.slice(0, 10) };
}

/**
 * CFOT for one purchase order (BR-01, BR-05): the quantity that was confirmed
 * AND received by its confirmed date, divided by the ordered quantity.
 *
 * Receipts are matched to the order by its number — the goods receipt names the
 * PO it fulfils — and then to the line by material, so a short delivery on one
 * material cannot be made up by an over-delivery on another. Every receipt on
 * time is added (CR-08: partial receipts add up).
 *
 * BL-66 (4) — "on time" is the SAME rule OTIF uses: on or before the confirmed
 * date and no more than EARLY_DELIVERY_WINDOW_DAYS before it. A receipt earlier
 * than that does not count (PROPOSED until BL-56 sets the early allowance).
 * @param {PurchaseOrder} po
 * @param {readonly GoodsReceipt[]} receipts
 * @returns {PoCfot | null}
 */
export function poCfot(po, receipts) {
  const orderedQty = po.lineItems.reduce((s, li) => s + li.quantity, 0);
  if (orderedQty <= 0) return null;
  const mine = receipts.filter((g) => g.poNumber === po.poNumber);

  let confirmedQty = 0;
  let deliveredOnTimeQty = 0;
  for (const li of po.lineItems) {
    const c = confirmedLine(po, li.id, li.quantity);
    confirmedQty += c.qty;
    const received = mine
      .filter((g) => receivedOnTimeFor(g.receivedDate, c.date))
      .flatMap((g) => g.inspectionResults)
      .filter((r) => r.materialCode === li.materialCode)
      .reduce((s, r) => s + r.qtyReceived, 0);
    deliveredOnTimeQty += Math.min(c.qty, received);
  }
  return {
    poId: po.id,
    poNumber: po.poNumber,
    supplierId: po.supplierId,
    confirmedDate: po.confirmedDeliveryDate.slice(0, 10),
    orderedQty,
    confirmedQty,
    deliveredOnTimeQty,
    pct: Math.round((deliveredOnTimeQty / orderedQty) * 100)
  };
}

/**
 * `measured`:  Orders due in the period that CFOT was measured over.
 *
 * @typedef {{
 *   readonly pct: number | null;
 *   readonly measured: number;
 *   readonly rows: readonly PoCfot[];
 * }} CfotAggregate
 */

/**
 * CFOT per supplier for the period (BR-08): the orders whose confirmed date
 * falls inside it. An order still in the future is not yet measurable, and the
 * period ends today, so nothing undecided reaches this denominator.
 * @param {readonly PurchaseOrder[]} pos
 * @param {readonly GoodsReceipt[]} receipts
 * @param {PerformancePeriod} period
 * @param {string} nowIso
 * @returns {CfotAggregate}
 */
export function cfotAggregate(pos, receipts, period, nowIso) {
  const rows = pos
    .filter((po) => inPeriod(po.confirmedDeliveryDate, period, nowIso))
    .map((po) => poCfot(po, receipts))
    .filter(/** @returns {r is PoCfot} */ (r) => r !== null);
  if (rows.length === 0) return { pct: null, measured: 0, rows: [] };
  const ordered = rows.reduce((s, r) => s + r.orderedQty, 0);
  const delivered = rows.reduce((s, r) => s + r.deliveredOnTimeQty, 0);
  return {
    pct: ordered > 0 ? Math.round((delivered / ordered) * 100) : null,
    measured: rows.length,
    rows
  };
}

// ── REQ-E10-01 BR-04 · rejections count in the assessment ───────────────────

/**
 * @typedef {{
 *   readonly purchaseOrders: number;
 *   readonly callOffs: number;
 *   readonly total: number;
 * }} RejectionCounts
 */

/**
 * Rejections the supplier made in the period — orders and call-offs alike.
 * @param {readonly PurchaseOrder[]} pos
 * @param {readonly CallOff[]} callOffs
 * @param {PerformancePeriod} period
 * @param {string} nowIso
 * @returns {RejectionCounts}
 */
export function rejectionCounts(pos, callOffs, period, nowIso) {
  const purchaseOrders = pos.filter(
    (po) =>
      po.response?.option === 'reject' &&
      inPeriod(po.response.respondedAt.slice(0, 10), period, nowIso)
  ).length;
  const cos = callOffs.filter(
    (c) =>
      c.status === 'Rejected' && inPeriod((c.releasedAt ?? c.needDate).slice(0, 10), period, nowIso)
  ).length;
  return { purchaseOrders, callOffs: cos, total: purchaseOrders + cos };
}

// ── The per-supplier measure the surfaces read ──────────────────────────────

/**
 * `score`: The assessment score: the mean of whatever was measured (OTIF, CFOT), less `REJECTION_PENALTY_POINTS` per rejection (BR-04), clamped to 0–100. Null when neither measure has any history in the period.
 * `noHistory`:  True when nothing in the period was measurable — the surfaces show "No history".
 * `updateCompliance`: Material B3 (MR-2) — the weekly update compliance blended into `score`, always over the rolling 13 update cycles whatever the period. Null when the input carries none (the portfolio, or a caller without the measure).
 *
 * @typedef {{
 *   readonly supplierId: string;
 *   readonly period: PerformancePeriod;
 *   readonly otif: OtifAggregate;
 *   readonly cfot: CfotAggregate;
 *   readonly rejections: RejectionCounts;
 *   readonly score: number | null;
 *   readonly grade: PerformanceGrade | null;
 *   readonly noHistory: boolean;
 *   readonly updateCompliance: UpdateCompliance | null;
 * }} SupplierMeasure
 */

/**
 * The score, stated as one arithmetic rather than hidden in the aggregation.
 *
 * Material B3 (MR-2 BR-05, MAT-D9, AR-09) — the delivery score above, blended
 * with update compliance: (1 − w) × delivery score + w × compliance %, with
 * w = `compliance.scoreWeight` read at call time. With "No history" for
 * compliance (null) w is 0 and the score is the delivery score unchanged.
 * Compliance alone never makes a score: no delivery history is still null.
 * @param {number | null} otifPct
 * @param {number | null} cfotPct
 * @param {number} rejections
 * @param {number | null} [compliancePct]
 * @param {number} [weight]
 * @returns {number | null}
 */
export function assessmentScore(
  otifPct,
  cfotPct,
  rejections,
  compliancePct = null,
  weight = complianceScoreWeight()
) {
  const parts = [otifPct, cfotPct].filter(/** @returns {p is number} */ (p) => p !== null);
  if (parts.length === 0) return null;
  const mean = parts.reduce((s, p) => s + p, 0) / parts.length;
  const penalised = mean - rejections * REJECTION_PENALTY_POINTS;
  const delivery = Math.max(0, Math.min(100, Math.round(penalised)));
  if (compliancePct === null) return delivery;
  return Math.max(0, Math.min(100, Math.round((1 - weight) * delivery + weight * compliancePct)));
}

/**
 * `updateCompliance`: Material B3 (AR-09) — each supplier's update compliance, computed ONCE per supplier by the caller's source (the mock read model, or the page's `getUpdateCompliance` read) and blended in `supplierMeasure` only. Absent: no compliance, so the score is the delivery score.
 *
 * @typedef {{
 *   readonly callOffs: readonly CallOff[];
 *   readonly asns: readonly ASN[];
 *   readonly receipts: readonly GoodsReceipt[];
 *   readonly purchaseOrders: readonly PurchaseOrder[];
 *   readonly updateCompliance?: (supplierId: string) => UpdateCompliance | null;
 * }} PerformanceInput
 */

/**
 * One supplier's measures for a period.
 *
 * The call-off views are computed over EVERY call-off, not over the supplier's
 * own subset, because CR-06 consumes each receipt once across the whole set —
 * matching per supplier first would let the same receipt answer two call-offs.
 * @param {string} supplierId
 * @param {PerformanceInput} input
 * @param {PerformancePeriod} period
 * @param {string} nowIso
 * @returns {SupplierMeasure}
 */
export function supplierMeasure(supplierId, input, period, nowIso) {
  const views = callOffViews(input.callOffs, input.asns, input.receipts, nowIso).filter(
    (v) => v.callOff.supplierId === supplierId
  );
  const otif = otifAggregate(views, period, nowIso);
  const cfot = cfotAggregate(
    input.purchaseOrders.filter((po) => po.supplierId === supplierId),
    input.receipts,
    period,
    nowIso
  );
  const rejections = rejectionCounts(
    input.purchaseOrders.filter((po) => po.supplierId === supplierId),
    input.callOffs.filter((c) => c.supplierId === supplierId),
    period,
    nowIso
  );
  const updateCompliance = input.updateCompliance?.(supplierId) ?? null;
  const score = assessmentScore(
    otif.pct,
    cfot.pct,
    rejections.total,
    updateCompliance?.pct ?? null
  );
  return {
    supplierId,
    period,
    otif,
    cfot,
    rejections,
    score,
    grade: gradeFor(score),
    noHistory: score === null,
    updateCompliance
  };
}

/**
 * Every supplier that appears in the data, measured for the period.
 * @param {readonly string[]} supplierIds
 * @param {PerformanceInput} input
 * @param {PerformancePeriod} period
 * @param {string} nowIso
 * @returns {ReadonlyMap<string, SupplierMeasure>}
 */
export function supplierMeasures(supplierIds, input, period, nowIso) {
  const out = /** @type {Map<string, SupplierMeasure>} */ (new Map());
  for (const id of supplierIds) out.set(id, supplierMeasure(id, input, period, nowIso));
  return out;
}

/**
 * The portfolio figure: every supplier's call-offs and orders taken together.
 * @param {PerformanceInput} input
 * @param {PerformancePeriod} period
 * @param {string} nowIso
 * @returns {SupplierMeasure}
 */
export function portfolioMeasure(input, period, nowIso) {
  const views = callOffViews(input.callOffs, input.asns, input.receipts, nowIso);
  const otif = otifAggregate(views, period, nowIso);
  const cfot = cfotAggregate(input.purchaseOrders, input.receipts, period, nowIso);
  const rejections = rejectionCounts(input.purchaseOrders, input.callOffs, period, nowIso);
  // A portfolio rejection count is a fleet total, not one supplier's record, so
  // it does not pull the portfolio score down per rejection.
  const score = assessmentScore(otif.pct, cfot.pct, 0);
  return {
    supplierId: '',
    period,
    otif,
    cfot,
    rejections,
    score,
    grade: gradeFor(score),
    noHistory: score === null,
    updateCompliance: null
  };
}
