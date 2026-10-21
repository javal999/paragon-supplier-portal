// ────────────────────────────────────────────────────────────────────────────
// Buyer dashboard derivations — pure predicates shared by the buyer widgets AND
// the buyer alerts bar, so a widget's flag and the aggregated triage count can
// never disagree. All are pure functions of (rows[, now]); no store, no clock of
// their own — the caller injects `now` so counts are deterministic in tests.
// ────────────────────────────────────────────────────────────────────────────

import { POStatus } from '@services/data/types';
/** @import { BuyerInvoice, PurchaseOrder, GoodsReceipt, ASN, RFQ, Quotation } from '@services/data/types' */
/** @import { FlagSeverity } from '@components/ui-v2/ExpandableWidget' */

const HOUR_MS = 3_600_000;

// ── Invoices (AP aging) ──────────────────────────────────────────────────────
/**
 * @param {BuyerInvoice[]} rows
 * @returns {BuyerInvoice[]}
 */
export const overdueInvoices = (rows) => rows.filter((i) => i.status === 'Overdue');

/**
 * @param {BuyerInvoice[]} rows
 * @returns {number}
 */
export const maxDaysOutstanding = (rows) =>
  rows.reduce((m, i) => Math.max(m, i.daysOutstanding), 0);

// ── Purchase orders (open / unacknowledged) ──────────────────────────────────
/**
 * @param {PurchaseOrder[]} rows
 * @returns {PurchaseOrder[]}
 */
export const openPurchaseOrders = (rows) =>
  rows.filter((p) => p.status !== POStatus.DELIVERED && p.status !== POStatus.CLOSED);

/**
 * Still 'Sent' (never acknowledged) more than 48h after the order was placed.
 * @param {PurchaseOrder[]} rows
 * @param {Date} now
 * @returns {PurchaseOrder[]}
 */
export const unacknowledgedOver48h = (rows, now) =>
  rows.filter(
    (p) =>
      p.status === POStatus.SENT && (now.getTime() - new Date(p.orderDate).getTime()) / HOUR_MS > 48
  );

// ── RFQs awaiting award ──────────────────────────────────────────────────────
/**
 * @param {RFQ[]} rfqs
 * @param {Quotation[]} quotations
 * @returns {RFQ[]}
 */
export const pendingAwardRfqs = (rfqs, quotations) => {
  const withQuotes = new Set(quotations.map((q) => q.rfqId));
  return rfqs.filter((r) => (r.status === 'Open' || r.status === 'Closed') && withQuotes.has(r.id));
};

/**
 * @param {RFQ[]} rfqs
 * @param {Date} now
 * @returns {RFQ[]}
 */
export const awardOverdue = (rfqs, now) =>
  rfqs.filter((r) => new Date(r.awardDeadline).getTime() < now.getTime());

/**
 * @param {Quotation[]} quotations
 * @returns {Map<string, number>}
 */
export const quoteCountByRfq = (quotations) => {
  const m = /** @type {Map<string, number>} */ (new Map());
  for (const q of quotations) m.set(q.rfqId, (m.get(q.rfqId) ?? 0) + 1);
  return m;
};

// ── Goods receipts (3-way match / inspection) ────────────────────────────────
const GR_PENDING = /** @type {Set<GoodsReceipt['status']>} */ (
  new Set(['Pending Inspection', 'Under Inspection'])
);
const GR_VARIANCE = /** @type {Set<GoodsReceipt['status']>} */ (
  new Set(['Quality Hold', 'Rejected', 'Partially Approved'])
);

/**
 * IA P-08 — a receipt status the planner still acts on: inspection pending or
 * under way, or a variance to decide. The ONE predicate behind Home's "Goods
 * receipts to review" and the Goods receipts page's "Needs action" tab.
 * @param {GoodsReceipt['status']} status
 * @returns {boolean}
 */
export const grStatusNeedsAction = (status) => GR_PENDING.has(status) || GR_VARIANCE.has(status);

/**
 * @param {GoodsReceipt[]} rows
 * @returns {GoodsReceipt[]}
 */
export const grNeedingAction = (rows) => rows.filter((g) => grStatusNeedsAction(g.status));

/**
 * @param {GoodsReceipt[]} rows
 * @returns {GoodsReceipt[]}
 */
export const grVariance = (rows) => rows.filter((g) => GR_VARIANCE.has(g.status));

// ── ASNs (inbound) ───────────────────────────────────────────────────────────
// MR-6 BR-08 — 'Awaiting exception' is not inbound: Quality has not let the
// goods ship yet, so it counts in neither list below.
/**
 * @param {ASN[]} rows
 * @returns {ASN[]}
 */
export const pendingAsns = (rows) =>
  rows.filter((a) => a.status === 'Submitted' || a.status === 'In Transit');

/**
 * @param {ASN[]} rows
 * @returns {ASN[]}
 */
export const discrepancyAsns = (rows) => rows.filter((a) => a.status === 'Discrepancy');

// ── Severity tiers (DP2-FLAG-01) ─────────────────────────────────────────────
// The single source of each category's tier, so a widget's flag and its alerts-
// bar chip can never disagree. Calm ladder: money/overdue = critical, variance/
// deadline = warning, plain in-flight counts = info.
/**
 * @param {BuyerInvoice[]} rows
 * @returns {FlagSeverity}
 */
export const invoiceTier = (rows) => (overdueInvoices(rows).length > 0 ? 'critical' : 'none');

/**
 * @param {PurchaseOrder[]} rows
 * @param {Date} now
 * @returns {FlagSeverity}
 */
export const poTier = (rows, now) =>
  unacknowledgedOver48h(rows, now).length > 0 ? 'critical' : 'none';

/**
 * @param {RFQ[]} rfqs
 * @param {Quotation[]} quotations
 * @param {Date} now
 * @returns {FlagSeverity}
 */
export const rfqAwardTier = (rfqs, quotations, now) => {
  const pending = pendingAwardRfqs(rfqs, quotations);
  if (pending.length === 0) return 'none';
  return awardOverdue(pending, now).length > 0 ? 'warning' : 'info';
};

/**
 * @param {GoodsReceipt[]} rows
 * @returns {FlagSeverity}
 */
export const grTier = (rows) => {
  if (grVariance(rows).length > 0) return 'warning';
  return grNeedingAction(rows).length > 0 ? 'info' : 'none';
};

/**
 * @param {ASN[]} rows
 * @returns {FlagSeverity}
 */
export const asnTier = (rows) => {
  if (discrepancyAsns(rows).length > 0) return 'warning';
  return pendingAsns(rows).length > 0 ? 'info' : 'none';
};
