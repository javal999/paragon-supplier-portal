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

import type { ASN, CallOff, PurchaseOrder } from './types';
import type { GoodsReceipt } from '../../data/mockGoodsReceipts';
import {
  callOffViews,
  type CallOffView,
} from '../transitions/callOffRules';
import { targetStatus, type TargetStatus } from '../../lib/chartPalette';
import { receivedOnTimeFor } from './kpiWindow';

const DAY_MS = 86_400_000;

// ── The period (REQ-E10-01 BR-08) ───────────────────────────────────────────

/** The periods the performance surfaces offer. Trailing windows ending today. */
export const PERFORMANCE_PERIODS = ['30d', '90d', 'ytd'] as const;
export type PerformancePeriod = (typeof PERFORMANCE_PERIODS)[number];

/** Trailing length in days. `ytd` is computed from the year, not from a length. */
const PERIOD_DAYS: Readonly<Record<Exclude<PerformancePeriod, 'ytd'>, number>> = {
  '30d': 30,
  '90d': 90,
};

/**
 * The period's first day, `YYYY-MM-DD` inclusive. The last day is always the
 * day of `nowIso`, so nothing in a period is still in the future.
 */
export function periodStart(period: PerformancePeriod, nowIso: string): string {
  const today = nowIso.slice(0, 10);
  if (period === 'ytd') return `${today.slice(0, 4)}-01-01`;
  const t = Date.parse(`${today}T00:00:00.000Z`);
  return new Date(t - PERIOD_DAYS[period] * DAY_MS).toISOString().slice(0, 10);
}

/** Is `date` (`YYYY-MM-DD`) inside the period that ends on the day of `nowIso`? */
export function inPeriod(date: string, period: PerformancePeriod, nowIso: string): boolean {
  if (!date) return false;
  const day = date.slice(0, 10);
  return day >= periodStart(period, nowIso) && day <= nowIso.slice(0, 10);
}

// ── CR-17 · the target and its status ───────────────────────────────────────

/** CR-17 — target 90%, "near" from 80% up to the target. */
export const OTIF_TARGET_PCT = 90;
export const OTIF_NEAR_BAND = 10;

/** The target status of a measured percentage, or null when nothing is measured. */
export function performanceStatus(pct: number | null): TargetStatus | null {
  return pct === null ? null : targetStatus(pct, OTIF_TARGET_PCT, OTIF_NEAR_BAND);
}

// ── The grade bands (derived from the score, never stored) ──────────────────

export type PerformanceGrade = 'A' | 'B' | 'C' | 'D';

/**
 * THE BAND TABLE, stated once and shown on screen. A grade is a reading of the
 * calculated score, so a stored letter cannot disagree with the figures beside
 * it.
 */
export const GRADE_BANDS: readonly { readonly grade: PerformanceGrade; readonly min: number }[] =
  Object.freeze([
    { grade: 'A', min: 90 },
    { grade: 'B', min: 80 },
    { grade: 'C', min: 70 },
    { grade: 'D', min: 0 },
  ]);

/** The letter for a score, or null when there is no score to read. */
export function gradeFor(score: number | null): PerformanceGrade | null {
  if (score === null) return null;
  return GRADE_BANDS.find((b) => score >= b.min)?.grade ?? 'D';
}

/**
 * REQ-E07-02 BR-07 / REQ-E10-01 BR-04 — each rejection costs the assessment
 * this many points. One stated number rather than a hidden weighting.
 */
export const REJECTION_PENALTY_POINTS = 5;

// ── CR-06 to CR-08 · OTIF per call-off, aggregated (BR-02, BR-06) ───────────

export interface OtifAggregate {
  /** Share of measured call-offs that were on time AND in full, 0–100. */
  readonly pct: number | null;
  /** Call-offs due in the period whose result is decided (the denominator). */
  readonly measured: number;
  /** Of those, the ones that met on time and in full. */
  readonly met: number;
  /** Due in the period but still open (dispatched or not yet due) — not counted. */
  readonly pending: number;
}

const EMPTY_OTIF: OtifAggregate = Object.freeze({ pct: null, measured: 0, met: 0, pending: 0 });

/**
 * Aggregate OTIF over the call-off views that are DUE in the period (BR-06).
 *
 * A call-off whose result is still undecided (nothing received yet, or only a
 * dispatch heads-up) is counted as pending and left OUT of the denominator —
 * it has not failed, so counting it as a miss would be an invented result.
 */
export function otifAggregate(
  views: readonly CallOffView[],
  period: PerformancePeriod,
  nowIso: string,
): OtifAggregate {
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
    pending: due.length - decided.length,
  };
}

// ── REQ-E10-01 BR-05 · CFOT per PO ──────────────────────────────────────────

export interface PoCfot {
  readonly poId: string;
  readonly poNumber: string;
  readonly supplierId: string;
  /** The date the PO was confirmed for — what "on time" is measured against. */
  readonly confirmedDate: string;
  readonly orderedQty: number;
  /** Quantity the supplier confirmed (a rejected order confirms nothing). */
  readonly confirmedQty: number;
  /** Of the confirmed quantity, what arrived on or before the confirmed date. */
  readonly deliveredOnTimeQty: number;
  /** BR-05 — confirmed and delivered by the confirmed date ÷ PO quantity, 0–100. */
  readonly pct: number;
}

/** The quantity a PO line is confirmed for: the counter-offer when one was accepted. */
function confirmedLine(po: PurchaseOrder, lineId: string, orderedQty: number): { qty: number; date: string } {
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
 */
export function poCfot(po: PurchaseOrder, receipts: readonly GoodsReceipt[]): PoCfot | null {
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
    pct: Math.round((deliveredOnTimeQty / orderedQty) * 100),
  };
}

export interface CfotAggregate {
  readonly pct: number | null;
  /** Orders due in the period that CFOT was measured over. */
  readonly measured: number;
  readonly rows: readonly PoCfot[];
}

/**
 * CFOT per supplier for the period (BR-08): the orders whose confirmed date
 * falls inside it. An order still in the future is not yet measurable, and the
 * period ends today, so nothing undecided reaches this denominator.
 */
export function cfotAggregate(
  pos: readonly PurchaseOrder[],
  receipts: readonly GoodsReceipt[],
  period: PerformancePeriod,
  nowIso: string,
): CfotAggregate {
  const rows = pos
    .filter((po) => inPeriod(po.confirmedDeliveryDate, period, nowIso))
    .map((po) => poCfot(po, receipts))
    .filter((r): r is PoCfot => r !== null);
  if (rows.length === 0) return { pct: null, measured: 0, rows: [] };
  const ordered = rows.reduce((s, r) => s + r.orderedQty, 0);
  const delivered = rows.reduce((s, r) => s + r.deliveredOnTimeQty, 0);
  return {
    pct: ordered > 0 ? Math.round((delivered / ordered) * 100) : null,
    measured: rows.length,
    rows,
  };
}

// ── REQ-E10-01 BR-04 · rejections count in the assessment ───────────────────

export interface RejectionCounts {
  readonly purchaseOrders: number;
  readonly callOffs: number;
  readonly total: number;
}

/** Rejections the supplier made in the period — orders and call-offs alike. */
export function rejectionCounts(
  pos: readonly PurchaseOrder[],
  callOffs: readonly CallOff[],
  period: PerformancePeriod,
  nowIso: string,
): RejectionCounts {
  const purchaseOrders = pos.filter(
    (po) =>
      po.response?.option === 'reject' &&
      inPeriod(po.response.respondedAt.slice(0, 10), period, nowIso),
  ).length;
  const cos = callOffs.filter(
    (c) =>
      c.status === 'Rejected' &&
      inPeriod((c.releasedAt ?? c.needDate).slice(0, 10), period, nowIso),
  ).length;
  return { purchaseOrders, callOffs: cos, total: purchaseOrders + cos };
}

// ── The per-supplier measure the surfaces read ──────────────────────────────

export interface SupplierMeasure {
  readonly supplierId: string;
  readonly period: PerformancePeriod;
  readonly otif: OtifAggregate;
  readonly cfot: CfotAggregate;
  readonly rejections: RejectionCounts;
  /**
   * The assessment score: the mean of whatever was measured (OTIF, CFOT), less
   * `REJECTION_PENALTY_POINTS` per rejection (BR-04), clamped to 0–100. Null
   * when neither measure has any history in the period.
   */
  readonly score: number | null;
  readonly grade: PerformanceGrade | null;
  /** True when nothing in the period was measurable — the surfaces show "No history". */
  readonly noHistory: boolean;
}

/** The score, stated as one arithmetic rather than hidden in the aggregation. */
export function assessmentScore(
  otifPct: number | null,
  cfotPct: number | null,
  rejections: number,
): number | null {
  const parts = [otifPct, cfotPct].filter((p): p is number => p !== null);
  if (parts.length === 0) return null;
  const mean = parts.reduce((s, p) => s + p, 0) / parts.length;
  const penalised = mean - rejections * REJECTION_PENALTY_POINTS;
  return Math.max(0, Math.min(100, Math.round(penalised)));
}

export interface PerformanceInput {
  readonly callOffs: readonly CallOff[];
  readonly asns: readonly ASN[];
  readonly receipts: readonly GoodsReceipt[];
  readonly purchaseOrders: readonly PurchaseOrder[];
}

/**
 * One supplier's measures for a period.
 *
 * The call-off views are computed over EVERY call-off, not over the supplier's
 * own subset, because CR-06 consumes each receipt once across the whole set —
 * matching per supplier first would let the same receipt answer two call-offs.
 */
export function supplierMeasure(
  supplierId: string,
  input: PerformanceInput,
  period: PerformancePeriod,
  nowIso: string,
): SupplierMeasure {
  const views = callOffViews(input.callOffs, input.asns, input.receipts, nowIso).filter(
    (v) => v.callOff.supplierId === supplierId,
  );
  const otif = otifAggregate(views, period, nowIso);
  const cfot = cfotAggregate(
    input.purchaseOrders.filter((po) => po.supplierId === supplierId),
    input.receipts,
    period,
    nowIso,
  );
  const rejections = rejectionCounts(
    input.purchaseOrders.filter((po) => po.supplierId === supplierId),
    input.callOffs.filter((c) => c.supplierId === supplierId),
    period,
    nowIso,
  );
  const score = assessmentScore(otif.pct, cfot.pct, rejections.total);
  return {
    supplierId,
    period,
    otif,
    cfot,
    rejections,
    score,
    grade: gradeFor(score),
    noHistory: score === null,
  };
}

/** Every supplier that appears in the data, measured for the period. */
export function supplierMeasures(
  supplierIds: readonly string[],
  input: PerformanceInput,
  period: PerformancePeriod,
  nowIso: string,
): ReadonlyMap<string, SupplierMeasure> {
  const out = new Map<string, SupplierMeasure>();
  for (const id of supplierIds) out.set(id, supplierMeasure(id, input, period, nowIso));
  return out;
}

/** The portfolio figure: every supplier's call-offs and orders taken together. */
export function portfolioMeasure(
  input: PerformanceInput,
  period: PerformancePeriod,
  nowIso: string,
): SupplierMeasure {
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
  };
}
