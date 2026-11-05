// ────────────────────────────────────────────────────────────────────────────
// Buyer supplier-scorecard fixtures.
//
// Relocated from src/pages-v2/BuyerScorecard.jsx in Phase 1' Batch 1.1b-iii.
// Portfolio grading across the active supplier network — a buyer-only aggregate,
// not per-supplier-scoped.
//
// D-2 ruling: the page previously carried IMPROVEMENT_ACTIONS as a single shared
// const and COMPLIANCE_ISSUES keyed by supplier NAME. Both are folded here onto
// the per-supplier record (`improvementActions` / `complianceIssue`) so nothing
// masquerades as per-supplier data. The old COMPLIANCE_ISSUES entry for
// "Sample Specialty Chemicals" matched no displayed supplier (the extra supplier
// is "Sample Specialty FR"), so it was dead data and is dropped.
// ⚠️ REQ-E10-01 (Phase 6b) — NO GRADE, NO SCORE, NO OTIF ROW HERE ANY MORE.
// All three were authored, and all three are now calculated from the call-offs,
// heads-ups, receipts and orders the hub holds. The rows are keyed by the
// SUPPLIER MASTER id so the join to those measures is real; the remaining KPI
// rows (OTDR, acknowledgement, defect rate, …) are genuinely sample figures and
// the page marks them as such rather than pretending they are derived.
// ────────────────────────────────────────────────────────────────────────────

/** @import { SupplierScorecard, ScorecardKpi, ScorecardRadarAxis, ScorecardImprovementAction } from '../../types' */

// BL-78 (BL-19: baseline first, no targets yet) — the authored targets
// (`target`, `targetPct`) are gone: the tiles show each figure neutrally, with
// "Baseline period — no target yet" where the target used to be.

// Sample Personal Care improvement-plan actions — folded off the page's shared IMPROVEMENT_ACTIONS
// const onto the single supplier that renders them (impPlan === true).
/** @type {ScorecardImprovementAction[]} */
const SAMPLE_PC_IMPROVEMENT_ACTIONS = [
  {
    item: 'Reduce PO acknowledgment time to <24h',
    due: 'Apr 30 2026',
    owner: 'Supplier OPS Team',
    status: 'In Progress'
  },
  {
    item: 'Resolve quality non-conformance batch BAS-2026-0034 root cause',
    due: 'Apr 20 2026',
    owner: 'Quality Dept',
    status: 'In Progress'
  },
  {
    item: 'Improve lead time adherence from 74% to ≥85%',
    due: 'May 31 2026',
    owner: 'Production Planning',
    status: 'Pending'
  }
];

/** @type {SupplierScorecard[]} */
const CORE_SCORECARDS = [
  {
    id: 'sup-009',
    name: 'Sample Vitamins Co.',
    country: 'CN',
    category: 'Active Ingredients',
    tier: 'Tier 3 — API',
    sapBp: 'BP-20045',
    channel: 'API',
    kpis: [
      { name: 'OTDR', value: '96%', pct: 96, trend: '↑' },
      { name: 'PO Ack Rate', value: '100%', pct: 100, trend: '→' },
      { name: 'Ack Speed', value: '6h', pct: 90, trend: '↑' },
      {
        name: 'Lead Time Adherence',
        value: '92%',
        pct: 92,
        trend: '↑'
      },
      { name: 'GR/PO Variance', value: '−4%', pct: 50, trend: '↓' },
      { name: 'Fill Rate', value: '96%', pct: 96, trend: '↑' },
      {
        name: 'Invoice Accuracy',
        value: '100%',
        pct: 100,
        trend: '→'
      },
      { name: 'QNCR', value: '0.2%', pct: 90, trend: '↑' },
      {
        name: 'Inventory DOS',
        value: '24 days',
        pct: 80,
        trend: '→'
      },
      {
        name: 'Responsiveness',
        value: '88/100',
        pct: 88,
        trend: '↑'
      },
      { name: 'Sustainability', value: '82/100', pct: 82, trend: '↑' }
    ],
    radar: [
      { axis: 'Delivery', value: 94 },
      { axis: 'Quality', value: 96 },
      { axis: 'Commercial', value: 88 },
      { axis: 'Responsiveness', value: 88 },
      { axis: 'Sustainability', value: 82 }
    ],
    otifTrend: [88, 89, 90, 91, 92, 91, 93, 94, 93, 94, 95, 94],
    ackSpeedTrend: [8, 7, 6, 6, 5, 5, 4, 6, 5, 4, 6, 6],
    defectTrend: [0.4, 0.3, 0.3, 0.2, 0.2, 0.2, 0.1, 0.2, 0.2, 0.2, 0.1, 0.2],
    commLog: [
      {
        date: 'Apr 6 2026',
        type: 'PO Confirmation',
        channel: 'API',
        message: 'PO-2025-00108 confirmed via API in 4 minutes',
        status: 'Completed'
      },
      {
        date: 'Apr 4 2026',
        type: 'Invoice Submitted',
        channel: 'Web Portal',
        message: 'INV-2026-00235 submitted — 3-way match: Perfect',
        status: 'Completed'
      },
      {
        date: 'Apr 1 2026',
        type: 'ASN Submitted',
        channel: 'API',
        message: 'ASN-2026-002 submitted for PO-2025-00108',
        status: 'Completed'
      },
      {
        date: 'Mar 28 2026',
        type: 'RFQ Response',
        channel: 'API',
        message: 'Quotation submitted for RFQ-2026-001 — score: 87/100',
        status: 'Completed'
      },
      {
        date: 'Mar 15 2026',
        type: 'Inventory Update',
        channel: 'API Push',
        message: 'Inventory position updated: Niacinamide B3 — 2,400 KG (24 days)',
        status: 'Completed'
      }
    ]
  },
  {
    id: 'sup-007',
    name: 'PT Sample Packaging Indonesia',
    country: 'ID',
    category: 'Packaging Primary',
    tier: 'Tier 1 — WhatsApp',
    sapBp: 'BP-10007',
    channel: 'WhatsApp',
    complianceIssue: { level: 'missing', label: 'BPJPH Halal cert not certified' },
    kpis: [
      { name: 'OTDR', value: '91%', pct: 91, trend: '↑' },
      { name: 'PO Ack Rate', value: '92%', pct: 92, trend: '↑' },
      { name: 'Ack Speed', value: '18h', pct: 75, trend: '→' },
      {
        name: 'Lead Time Adherence',
        value: '85%',
        pct: 85,
        trend: '↑'
      },
      { name: 'GR/PO Variance', value: '0%', pct: 100, trend: '→' },
      { name: 'Fill Rate', value: '95%', pct: 95, trend: '↑' },
      { name: 'Invoice Accuracy', value: '98%', pct: 98, trend: '→' },
      { name: 'QNCR', value: '0.4%', pct: 70, trend: '↑' },
      {
        name: 'Inventory DOS',
        value: '18 days',
        pct: 80,
        trend: '→'
      },
      {
        name: 'Responsiveness',
        value: '80/100',
        pct: 80,
        trend: '↑'
      },
      { name: 'Sustainability', value: '68/100', pct: 68, trend: '↑' }
    ],
    radar: [
      { axis: 'Delivery', value: 88 },
      { axis: 'Quality', value: 91 },
      { axis: 'Commercial', value: 82 },
      { axis: 'Responsiveness', value: 80 },
      { axis: 'Sustainability', value: 68 }
    ],
    otifTrend: [82, 83, 84, 84, 85, 85, 86, 87, 87, 88, 88, 88],
    ackSpeedTrend: [22, 20, 19, 18, 18, 17, 16, 18, 17, 18, 17, 18],
    defectTrend: [0.6, 0.5, 0.5, 0.5, 0.4, 0.4, 0.4, 0.3, 0.4, 0.3, 0.4, 0.3],
    commLog: [
      {
        date: 'Apr 5 2026',
        type: 'PO Confirmation',
        channel: 'WhatsApp',
        message: 'PO-2025-00107 confirmed via WhatsApp in 3 hours',
        status: 'Completed'
      },
      {
        date: 'Mar 31 2026',
        type: 'ASN Submitted',
        channel: 'Web Portal',
        message: 'ASN-2026-001 submitted for PO-2025-00107',
        status: 'Completed'
      },
      {
        date: 'Mar 15 2026',
        type: 'Invoice',
        channel: 'Email',
        message: 'INV-2026-00198 submitted via email',
        status: 'Completed'
      },
      {
        date: 'Mar 10 2026',
        type: 'PO Confirmation',
        channel: 'WhatsApp',
        message: 'PO-2025-00098 confirmed',
        status: 'Completed'
      },
      {
        date: 'Feb 28 2026',
        type: 'GR Discrepancy',
        channel: 'Web Portal',
        message: 'Short delivery on PO-2025-00091 — 5% variance',
        status: 'Resolved'
      }
    ]
  },
  {
    id: 'sup-005',
    name: 'Sample Personal Care DE',
    country: 'DE',
    category: 'Active Ingredients',
    tier: 'Tier 3 — API',
    sapBp: 'BP-20012',
    channel: 'API',
    impPlan: true,
    complianceIssue: { level: 'expiring', label: 'ISO 9001 expiring in 83d' },
    improvementActions: SAMPLE_PC_IMPROVEMENT_ACTIONS,
    kpis: [
      { name: 'OTDR', value: '82%', pct: 82, trend: '↓' },
      { name: 'PO Ack Rate', value: '88%', pct: 88, trend: '↑' },
      { name: 'Ack Speed', value: '42h', pct: 40, trend: '↓' },
      {
        name: 'Lead Time Adherence',
        value: '74%',
        pct: 74,
        trend: '↓'
      },
      { name: 'GR/PO Variance', value: '+1%', pct: 80, trend: '→' },
      { name: 'Fill Rate', value: '90%', pct: 90, trend: '↑' },
      { name: 'Invoice Accuracy', value: '85%', pct: 85, trend: '↓' },
      { name: 'QNCR', value: '1.2%', pct: 30, trend: '↓' },
      {
        name: 'Inventory DOS',
        value: '8 days',
        pct: 40,
        trend: '↓'
      },
      {
        name: 'Responsiveness',
        value: '62/100',
        pct: 62,
        trend: '↓'
      },
      { name: 'Sustainability', value: '70/100', pct: 70, trend: '↑' }
    ],
    radar: [
      { axis: 'Delivery', value: 78 },
      { axis: 'Quality', value: 82 },
      { axis: 'Commercial', value: 74 },
      { axis: 'Responsiveness', value: 62 },
      { axis: 'Sustainability', value: 70 }
    ],
    otifTrend: [85, 84, 82, 83, 81, 80, 79, 78, 78, 79, 78, 78],
    ackSpeedTrend: [28, 30, 32, 29, 31, 33, 35, 34, 36, 34, 33, 34],
    defectTrend: [0.8, 0.9, 1.0, 0.9, 1.1, 1.0, 1.2, 1.1, 1.0, 1.1, 1.2, 1.1],
    commLog: [
      {
        date: 'Apr 5 2026',
        type: 'Late Delivery Alert',
        channel: 'Email',
        message: 'PO-2025-00099 is 5 days overdue — held at Jakarta Customs',
        status: 'Open'
      },
      {
        date: 'Apr 2 2026',
        type: 'Improvement Plan',
        channel: 'Email',
        message: 'Improvement plan issued — 30-day review period',
        status: 'Active'
      },
      {
        date: 'Mar 28 2026',
        type: 'PO Confirmation',
        channel: 'API',
        message: 'PO-2025-00099 confirmed — 42h delay',
        status: 'Completed'
      },
      {
        date: 'Mar 20 2026',
        type: 'Invoice Dispute',
        channel: 'Email',
        message: 'INV-2026-00201 disputed — PPN calculation error',
        status: 'Resolved'
      },
      {
        date: 'Mar 10 2026',
        type: 'QNCR Filed',
        channel: 'Email',
        message: 'Non-conformance report for batch BAS-2026-0034',
        status: 'Resolved'
      }
    ]
  }
];

// The five "extra" suppliers reuse the top record's KPI/radar shape (the page's
// original construction) with distinct identity + trend series.
/** @type {SupplierScorecard[]} */
const EXTRA_SCORECARDS = /** @type {const} */ ([
  'PT Sample Specialty Fats',
  'PT Sample Halal Emulsifiers',
  'Sample Fragrance House SG',
  'PT Sample Oleochemicals',
  'Sample Specialty FR'
]).map((name, i) => ({
  id: /** @type {const} */ (['sup-002', 'sup-010', 'sup-003', 'sup-001', 'sup-006'])[i],
  name,
  country: /** @type {const} */ (['ID', 'ID', 'SG', 'ID', 'FR'])[i],
  category: /** @type {const} */ ([
    'Halal Emulsifier',
    'Halal Emulsifier',
    'Fragrance',
    'Natural Botanical',
    'Active Ingredients'
  ])[i],
  tier: /** @type {const} */ ([
    'Tier 2 — Web',
    'Tier 1 — WhatsApp',
    'Tier 3 — API',
    'Tier 2 — Web',
    'Tier 2 — Web'
  ])[i],
  sapBp: `BP-2000${10 + i}`,
  channel: /** @type {const} */ (['Web', 'WhatsApp', 'API', 'Web', 'Web'])[i],
  kpis: /** @type {ScorecardKpi[]} */ (CORE_SCORECARDS[0].kpis),
  radar: /** @type {ScorecardRadarAxis[]} */ (CORE_SCORECARDS[0].radar),
  otifTrend: [82, 84, 85, 87, 88, 89, 90, 91, 91, 92, 92, 91],
  ackSpeedTrend: [12, 11, 10, 9, 8, 8, 7, 7, 6, 6, 5, 5],
  defectTrend: [0.5, 0.4, 0.4, 0.3, 0.3, 0.2, 0.2, 0.2, 0.1, 0.2, 0.1, 0.2],
  commLog: []
}));

/** @type {SupplierScorecard[]} */
export const SUPPLIER_SCORECARDS = [...CORE_SCORECARDS, ...EXTRA_SCORECARDS];
