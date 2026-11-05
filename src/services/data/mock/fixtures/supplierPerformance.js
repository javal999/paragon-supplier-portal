// ────────────────────────────────────────────────────────────────────────────
// Supplier performance fixtures.
//
// Relocated from src/pages-v2/SupplierPerformance.jsx in Phase 1B Batch 2.
// A KPI snapshot is per-supplier; the supplierId guard in the service layer
// ensures only the owning supplier (or buyer) can read it.
// ────────────────────────────────────────────────────────────────────────────

/** @import { KpiPoint, RadarPoint, PerformancePoint, ImprovementAction } from '../../types' */

export const SUP_007_SUPPLIER_ID = 'sup-007';

// BL-78 (BL-19: baseline first, no targets yet) — the authored targets
// (`target`, `targetPct`) are gone: the tiles show each figure neutrally, with
// "Baseline period — no target yet" where the target used to be.

// pct = the figure on a 0–100 axis, drawn as a neutral bar.
// ⚠️ REQ-E10-01 — THE OTIF ROW IS GONE FROM HERE. It is calculated from the
// call-offs, heads-ups and receipts the hub holds, for the period the page is
// showing. What stays below is genuinely SAMPLE — nothing in this prototype
// measures ASN accuracy, lead-time variance, reply speed, defect rate or
// invoice accuracy — and the page marks it as sample rather than implying it is
// derived.
/** @type {KpiPoint[]} */
export const KPIS = [
  { name: 'ASN Accuracy', value: '97.8%', pct: 98, trend: '→' },
  {
    name: 'Lead Time Variance',
    value: '1.4 days',
    pct: 35,
    trend: '↓'
  },
  {
    name: 'POA Response Time',
    value: '42 hrs',
    pct: 40,
    trend: '↓'
  },
  {
    name: 'Defect / Reject Rate',
    value: '0.8%',
    pct: 90,
    trend: '↑'
  },
  { name: 'Invoice Accuracy', value: '91%', pct: 91, trend: '↓' }
];

/** @type {RadarPoint[]} */
export const RADAR_DATA = [
  { axis: 'ASN Acc.', value: 98 },
  { axis: 'POA Speed', value: 72 },
  { axis: 'Invoice Acc.', value: 91 },
  { axis: 'Quality', value: 92 },
  { axis: 'Lead Time', value: 80 }
];

/** @type {PerformancePoint[]} */
export const WEEKLY_TREND = [
  { week: 'W1 Jan', otif: 80, asnAcc: 96, defect: 1.2, ackHrs: 52 },
  { week: 'W2 Jan', otif: 81, asnAcc: 97, defect: 1.0, ackHrs: 48 },
  { week: 'W3 Jan', otif: 79, asnAcc: 95, defect: 1.4, ackHrs: 50 },
  { week: 'W4 Jan', otif: 82, asnAcc: 97, defect: 0.9, ackHrs: 46 },
  { week: 'W1 Feb', otif: 83, asnAcc: 98, defect: 0.8, ackHrs: 44 },
  { week: 'W2 Feb', otif: 81, asnAcc: 96, defect: 1.1, ackHrs: 50 },
  { week: 'W3 Feb', otif: 84, asnAcc: 98, defect: 0.7, ackHrs: 42 },
  { week: 'W4 Feb', otif: 85, asnAcc: 99, defect: 0.6, ackHrs: 40 },
  { week: 'W1 Mar', otif: 83, asnAcc: 97, defect: 0.9, ackHrs: 44 },
  { week: 'W2 Mar', otif: 86, asnAcc: 98, defect: 0.7, ackHrs: 38 },
  { week: 'W3 Mar', otif: 85, asnAcc: 97, defect: 0.8, ackHrs: 40 },
  { week: 'W4 Mar', otif: 87, asnAcc: 98, defect: 0.8, ackHrs: 42 }
];

// KPIs to improve, with recommended corrective actions (no target or gap: BL-78). Surfaced through
// getKpis (KpiSnapshot.improvementActions) so the page reads them via useKpis.
/** @type {ImprovementAction[]} */
export const IMPROVEMENT_ACTIONS = [
  {
    kpi: 'POA Response Time',
    current: '42 hrs avg',
    action:
      'Enable WhatsApp PO notification alerts for faster acknowledgement. Assign dedicated PO coordinator for Paragon account.',
    priority: 'Medium'
  },
  {
    kpi: 'Invoice Accuracy',
    current: '91%',
    action:
      'Quantity discrepancies detected on PO-2025-00108. Implement pre-shipment count verification before invoice submission.',
    priority: 'Medium'
  }
];
