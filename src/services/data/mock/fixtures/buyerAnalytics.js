// ────────────────────────────────────────────────────────────────────────────
// Buyer analytics fixtures.
//
// Relocated from src/pages-v2/BuyerAnalytics.tsx in Phase 1B Batch 2.
// Aggregate buyer-side reporting data — not per-supplier-scoped.
// ────────────────────────────────────────────────────────────────────────────

/** @import { SpendCategoryRow, TopSupplierSpend, MonthlyOtifRow, MonthlyPoRow, MonthlyChannelMix, AnalyticsPerfRow, AnalyticsSummary } from '../../types' */

const TOKEN_TEAL = '#0097A7';
const TOKEN_NAVY = '#0D1B2A';
const TOKEN_MID = '#354A5F';
const TOKEN_SUCCESS = '#107E3E';
const TOKEN_WARNING = '#B45309';
const TOKEN_INFO = '#1E5BAE';
const TOKEN_MUTED = '#6B7785';

/** @type {SpendCategoryRow[]} */
export const SPEND_CAT = [
  { category: 'Active Ingredients', value: 1260, color: TOKEN_TEAL },
  { category: 'Fragrance', value: 840, color: TOKEN_MID },
  { category: 'Packaging Primary', value: 630, color: TOKEN_SUCCESS },
  { category: 'Natural/Botanical', value: 504, color: TOKEN_WARNING },
  { category: 'Packaging Secondary', value: 420, color: TOKEN_INFO },
  { category: 'Halal Emulsifiers', value: 336, color: TOKEN_NAVY },
  { category: 'Other', value: 210, color: TOKEN_MUTED }
];

/** @type {TopSupplierSpend[]} */
export const TOP_SUPPLIERS = [
  { supplier: 'PT Sample Packaging', spend: 820 },
  { supplier: 'Sample Vitamins', spend: 680 },
  { supplier: 'Sample Personal Care DE', spend: 540 },
  { supplier: 'PT Sample Specialty Fats', spend: 420 },
  { supplier: 'PT Sample Halal Emulsifiers', spend: 380 }
];

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
  'Jan',
  'Feb',
  'Mar'
];
const OTIF_VALS = [82, 84, 83, 85, 86, 84, 87, 88, 86, 87, 88, 87, 87, 88, 87];
const OTDR_VALS = [85, 86, 87, 88, 87, 89, 90, 91, 89, 91, 92, 91, 91, 92, 91];

/** @type {MonthlyOtifRow[]} */
export const OTIF_DATA = OTIF_VALS.map((v, i) => ({
  month: MONTHS[i],
  otif: v,
  otdr: OTDR_VALS[i]
}));

const PO_VOLS = [3, 4, 3, 5, 4, 6, 5, 4, 5, 6, 4, 5, 4, 5, 3];
const CYCLE_VALS = [48, 42, 38, 35, 32, 30, 28, 26, 28, 25, 24, 23, 22, 21, 22];

/** @type {MonthlyPoRow[]} */
export const PO_VOL_DATA = PO_VOLS.map((v, i) => ({
  month: MONTHS[i],
  pos: v,
  cycleTime: CYCLE_VALS[i]
}));

/** @type {MonthlyChannelMix[]} */
export const CHANNEL_DATA = [
  { month: 'Oct', whatsapp: 20, web: 15, email: 55, api: 10 },
  { month: 'Nov', whatsapp: 25, web: 18, email: 47, api: 10 },
  { month: 'Dec', whatsapp: 30, web: 20, email: 40, api: 10 },
  { month: 'Jan', whatsapp: 35, web: 22, email: 33, api: 10 },
  { month: 'Feb', whatsapp: 40, web: 24, email: 26, api: 10 },
  { month: 'Mar', whatsapp: 45, web: 25, email: 20, api: 10 }
];

// ⚠️ REQ-E10-01 — THIS TABLE NO LONGER CARRIES AN OTIF OR A GRADE. Both were
// authored numbers beside supplier NAMES that matched no master record, so the
// table could not have been joined to a delivery history even in principle. The
// row now names a supplier id; the page resolves the name, the category, the
// calculated OTIF and the grade from the master and the measures. What stays
// here is the genuinely SAMPLE half — no hub data measures OTDR, acknowledgement
// speed or first-time invoice match — and the page marks it as sample.
/** @type {AnalyticsPerfRow[]} */
export const PERF_TABLE = [
  { supplierId: 'sup-007', otdr: 91, ackSpeed: '18h', invoiceMatch: '98%', trend: '↑' },
  { supplierId: 'sup-009', otdr: 96, ackSpeed: '6h', invoiceMatch: '100%', trend: '↑' },
  { supplierId: 'sup-005', otdr: 82, ackSpeed: '42h', invoiceMatch: '85%', trend: '↓' },
  { supplierId: 'sup-002', otdr: 94, ackSpeed: '12h', invoiceMatch: '97%', trend: '→' },
  { supplierId: 'sup-010', otdr: 88, ackSpeed: '24h', invoiceMatch: '95%', trend: '↑' },
  { supplierId: 'sup-003', otdr: 93, ackSpeed: '8h', invoiceMatch: '99%', trend: '→' },
  { supplierId: 'sup-001', otdr: 85, ackSpeed: '30h', invoiceMatch: '92%', trend: '↑' },
  { supplierId: 'sup-006', otdr: 76, ackSpeed: '56h', invoiceMatch: '88%', trend: '↓' },
  { supplierId: 'sup-008', otdr: 89, ackSpeed: '20h', invoiceMatch: '96%', trend: '→' }
];

// Headline KPI cards — relocated from the inline JSX in BuyerAnalytics so the
// summary reads through the service like every other analytics surface.
/** @type {AnalyticsSummary} */
export const ANALYTICS_SUMMARY = {
  totalSpend: {
    value: 'Rp 4.2B',
    subtitle: '+12% vs last year · 8 categories',
    tone: 'success'
  },
  activeSuppliers: {
    value: '12',
    subtitle: '2 onboarding · 8 Grade A or B',
    tone: 'success'
  },
  avgCycleTime: {
    value: '28h',
    subtitle: '-42% vs 6 months ago',
    tone: 'success'
  }
};
