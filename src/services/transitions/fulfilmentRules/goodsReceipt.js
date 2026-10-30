// ────────────────────────────────────────────────────────────────────────────
// Fulfilment rules · goods receipt discrepancy (REQ-E07-06; CR-11, CR-25) —
// the per-material quantity tolerance outcome and the receipt-versus-ASN line
// comparison. Separate from the ASN and invoice rules; it reads the tolerance
// from `fulfilmentConfig.js`.
// ────────────────────────────────────────────────────────────────────────────

/** @import { ASN } from '../../data/types' */
/** @import { GoodsReceipt, GRStatus } from '@data/mockGoodsReceipts' */
import { receiptQtyToleranceFor } from '../fulfilmentConfig';

// ── Goods receipt discrepancy (REQ-E07-06) ──────────────────────────────────

// ⚠️ `RECEIPT_QTY_TOLERANCE = 0` ("PQ-04 — until the tolerance is decided, any
// difference is a discrepancy") IS RETIRED. PQ-04 was decided on 2026-09-21 as
// CR-25 (BL-45): any over-delivery is flagged; a shortfall above 2% is flagged
// and keeps the receipt open; a shortfall at or below 2% closes it. The values
// are per material, in `fulfilmentConfig.js`.

/**
 * CR-25 — what a received quantity means against what was shipped:
 *   exact       — received exactly what was shipped
 *   overWithin  — over by no more than the over-delivery tolerance (not flagged).
 *                 Unreachable at the decided 0%; exists because the
 *                 administrator can set more (BL-32), and "received as shipped"
 *                 would then be a false sentence about a line that was not
 *   over        — over by more than the over-delivery tolerance; at the decided
 *                 0%, any quantity above what was shipped (flagged: a decision,
 *                 not a default)
 *   shortWithin — short by no more than the material's tolerance (closes, not flagged)
 *   shortOver   — short by more than the tolerance (flagged; the receipt stays open)
 */
/** @typedef {'exact' | 'overWithin' | 'over' | 'shortWithin' | 'shortOver'} ReceiptQtyOutcome */

/**
 * CR-25 for one line. PURE. The percentage test is written as
 * |difference| × 100 ≤ shipped × pct so exactly 2% is decided exactly.
 * @param {string} materialCode
 * @param {number} shipped
 * @param {number} received
 * @returns {ReceiptQtyOutcome}
 */
export function receiptQtyOutcome(materialCode, shipped, received) {
  const difference = received - shipped;
  if (difference === 0) return 'exact';
  const tol = receiptQtyToleranceFor(materialCode);
  if (difference > 0) return difference * 100 <= shipped * tol.overPct ? 'overWithin' : 'over';
  return -difference * 100 <= shipped * tol.shortPct ? 'shortWithin' : 'shortOver';
}

/**
 * Receipt states in which the inspection result is final.
 * @type {readonly GRStatus[]}
 */
export const RECEIPT_INSPECTED_STATES = [
  'Approved',
  'Partially Approved',
  'Rejected',
  'Posting to SAP',
  'Posted to SAP'
];

/**
 * @typedef {object} ReceiptLineComparison
 * @property {string} materialCode
 * @property {string} description
 * @property {number} shipped -  From the ASN line for this material; the receipt's expected quantity when
 *    the ASN is not on record.
 * @property {number} received
 * @property {number} accepted
 * @property {number} rejected
 * @property {number} difference -  received − shipped (negative = short).
 * @property {number | null} differencePct -  |difference| ÷ shipped × 100; null when nothing was shipped.
 * @property {ReceiptQtyOutcome} qtyOutcome -  CR-25 — what the quantity difference means for this material.
 * @property {boolean} flagged -  BR-03 / BR-05 — outside tolerance, or anything rejected at inspection.
 */

/**
 * Compare every receipt line with what was shipped. Derived at read time.
 * @param {Pick<GoodsReceipt, 'inspectionResults' | 'status'>} gr
 * @param {Pick<ASN, 'lineItems'> | null} [asn]
 * @returns {ReceiptLineComparison[]}
 */
export function compareReceipt(gr, asn) {
  const inspected = RECEIPT_INSPECTED_STATES.includes(gr.status);
  return gr.inspectionResults.map((r) => {
    const asnLine = asn?.lineItems.find((l) => l.materialCode === r.materialCode);
    const shipped = asnLine ? asnLine.shippedQty : r.qtyExpected;
    const difference = r.qtyReceived - shipped;
    // CR-11 — rejected quantity counts only once the inspection is final.
    const rejected = inspected ? r.qtyRejected : 0;
    // CR-25 — the quantity check, per material.
    const qtyOutcome = receiptQtyOutcome(r.materialCode, shipped, r.qtyReceived);
    return {
      materialCode: r.materialCode,
      description: r.description,
      shipped,
      received: r.qtyReceived,
      accepted: inspected ? r.qtyAccepted : 0,
      rejected,
      difference,
      differencePct: shipped > 0 ? (Math.abs(difference) / shipped) * 100 : null,
      qtyOutcome,
      flagged: qtyOutcome === 'over' || qtyOutcome === 'shortOver' || rejected > 0
    };
  });
}

/**
 * CR-25 — the receipt stays OPEN while any line is short by more than its
 * tolerance: the rest of the shipment is still owed. Derived at read time,
 * never stored. A shortfall within tolerance, an exact line and an
 * over-delivery do not keep it open (an over-delivery is flagged instead).
 * @param {Pick<GoodsReceipt, 'inspectionResults' | 'status'>} gr
 * @param {Pick<ASN, 'lineItems'> | null} [asn]
 * @returns {boolean}
 */
export const receiptKeptOpen = (gr, asn) =>
  compareReceipt(gr, asn).some((l) => l.qtyOutcome === 'shortOver');

/**
 * @param {Pick<GoodsReceipt, 'inspectionResults' | 'status'>} gr
 * @param {Pick<ASN, 'lineItems'> | null} [asn]
 * @returns {boolean}
 */
export const hasReceiptDiscrepancy = (gr, asn) => compareReceipt(gr, asn).some((l) => l.flagged);

/**
 * A discrepancy still waiting for the supplier's answer.
 * @param {Pick<GoodsReceipt, 'inspectionResults' | 'status' | 'discrepancyResponse'>} gr
 * @param {Pick<ASN, 'lineItems'> | null} [asn]
 * @returns {boolean}
 */
export const awaitsSupplierAnswer = (gr, asn) =>
  hasReceiptDiscrepancy(gr, asn) && !gr.discrepancyResponse;

/**
 * A dispute PTI has not resolved yet.
 * @param {Pick<GoodsReceipt, 'discrepancyResponse'>} gr
 * @returns {boolean}
 */
export const isOpenDispute = (gr) => gr.discrepancyResponse?.status === 'Disputed';
