// ────────────────────────────────────────────────────────────────────────────
// SUPPLIER MEASURE READ MODEL — REQ-E10-01 projected onto the supplier master.
//
// The supplier master no longer STORES an OTIF percentage or a grade letter:
// both are projected here, at read, from the call-offs, the dispatch heads-ups,
// the goods receipts and the purchase orders the hub actually holds. A supplier
// with nothing measurable in the window carries NEITHER — the absence is what
// every surface renders as "No history" (Phase 6a's shape), and CR-15 scores
// reliability 50 from that same absence.
//
// ONE window for the master data (`MASTER_PERIOD`), so a supplier list, a
// supplier profile, a marketplace card and an RFx invitee row can never quote
// three different OTIFs for the same supplier. The performance PAGES take the
// period from the user's own chips instead — that is REQ-E10-01 BR-08, and it
// is a different question from "what is this supplier's standing".
// ────────────────────────────────────────────────────────────────────────────

/** @import { Supplier } from '@app-types/supplier.types' */
import { ScorecardGrade } from '@app-types/supplier.types';
import { sdcClock } from '../../sdc/clock';
/** @import { PerformanceInput, PerformancePeriod, SupplierMeasure } from '../performanceRules' */
import { supplierMeasure } from '../performanceRules';
import { callOffStore } from './stores/callOffStore';
import { asnStore } from './stores/asnStore';
import { goodsReceiptStore } from './stores/goodsReceiptStore';
import { purchaseOrderStore } from './stores/purchaseOrderStore';
import { updateCompliance } from './updateComplianceReadModel';
/** @import { UpdateCompliance } from '../../transitions/updateCompliance' */

/**
 * The window the supplier master's standing figure is measured over.
 * @type {PerformancePeriod}
 */
export const MASTER_PERIOD = '90d';

/**
 * Everything the measures read, taken from the mutable stores. Material B3
 * (AR-09): update compliance is computed once per supplier, as of `nowIso`,
 * and `supplierMeasure` blends it — the same rule the pages' path calls.
 * @param {string} [nowIso]
 * @returns {PerformanceInput}
 */
export function performanceInput(nowIso = sdcClock.now()) {
  const compliance = /** @type {Map<string, UpdateCompliance>} */ (new Map());
  return {
    callOffs: callOffStore.all(),
    asns: asnStore.all(),
    receipts: goodsReceiptStore.all(),
    purchaseOrders: purchaseOrderStore.all(),
    updateCompliance: (supplierId) => {
      const hit = compliance.get(supplierId);
      if (hit) return hit;
      const c = updateCompliance(supplierId, nowIso);
      compliance.set(supplierId, c);
      return c;
    }
  };
}

/** @type {Readonly<Record<'A' | 'B' | 'C' | 'D', ScorecardGrade>>} */
const GRADE_ENUM = {
  A: ScorecardGrade.A,
  B: ScorecardGrade.B,
  C: ScorecardGrade.C,
  D: ScorecardGrade.D
};

/**
 * One supplier's measures against the master window.
 * @param {string} supplierId
 * @returns {SupplierMeasure}
 */
export function masterMeasure(supplierId, nowIso = sdcClock.now()) {
  return supplierMeasure(supplierId, performanceInput(nowIso), MASTER_PERIOD, nowIso);
}

/**
 * Project the calculated OTIF and grade onto a supplier record. Both fields are
 * OMITTED when there is no history — never zeroed, never defaulted to `D`.
 * @param {Supplier} supplier
 * @returns {Supplier}
 */
export function withMeasures(supplier, nowIso = sdcClock.now()) {
  const m = masterMeasure(supplier.id, nowIso);
  /** @type {Supplier} */
  const next = { ...supplier };
  delete next.otif;
  delete next.scorecardGrade;
  delete next.performanceScore;
  if (m.otif.pct !== null) next.otif = m.otif.pct;
  if (m.grade !== null) next.scorecardGrade = GRADE_ENUM[m.grade];
  if (m.score !== null) next.performanceScore = m.score;
  return next;
}

/**
 * @param {readonly Supplier[]} suppliers
 * @returns {Supplier[]}
 */
export function allWithMeasures(suppliers, nowIso = sdcClock.now()) {
  return suppliers.map((s) => withMeasures(s, nowIso));
}
