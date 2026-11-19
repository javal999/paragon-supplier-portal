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
 *
 * BL-325 — a missing or non-numeric quantity is read as 0 rather than carried
 * through as NaN: `received − shipped` with a NaN disabled the over-ship
 * refusal downstream (`q > NaN` is false) and made the opened quantity NaN.
 * A valid number passes through untouched; only a non-finite one is rewritten.
 * @param {Pick<GoodsReceipt, 'inspectionResults' | 'status'>} gr
 * @param {Pick<ASN, 'lineItems'> | null} [asn]
 * @returns {ReceiptLineComparison[]}
 */
export function compareReceipt(gr, asn) {
  const inspected = RECEIPT_INSPECTED_STATES.includes(gr.status);
  return gr.inspectionResults.map((r) => {
    const asnLine = asn?.lineItems.find((l) => l.materialCode === r.materialCode);
    // BL-325 — coerce at the boundary so no downstream sum can be NaN.
    const shippedRaw = asnLine ? asnLine.shippedQty : r.qtyExpected;
    const shipped = Number.isFinite(shippedRaw) ? shippedRaw : 0;
    const received = Number.isFinite(r.qtyReceived) ? r.qtyReceived : 0;
    const difference = received - shipped;
    // CR-11 — rejected quantity counts only once the inspection is final.
    const rejected = inspected ? r.qtyRejected : 0;
    // CR-25 — the quantity check, per material.
    const qtyOutcome = receiptQtyOutcome(r.materialCode, shipped, received);
    return {
      materialCode: r.materialCode,
      description: r.description,
      shipped,
      received,
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
 * GR-1 / BL-71 / BL-81 (owner, 2026-11-02) — the quantity a KEPT-OPEN receipt
 * puts back on the PO line, by material: "a receipt kept open reopens the
 * missing quantity for another shipment". Derived at read from the same
 * comparison the CR-25 "kept open" label reads, never stored.
 *
 * [Proposed] — the decision names the rule, not its arithmetic. The narrowest
 * reading is taken, stated here so it can be overruled:
 *   · only a line whose outcome is `shortOver` reopens anything — that is
 *     exactly "kept open". A shortfall at or below 2% closes the receipt and
 *     reopens nothing; an over-delivery reopens nothing;
 *   · the amount reopened is the WHOLE missing quantity, `shipped − received`,
 *     not only the part beyond the 2% tolerance — the tolerance decides
 *     whether the receipt is kept open, not how much is still owed;
 *   · ⚠️ BL-325 (fix) — the amount is computed ONCE PER ASN, never summed per
 *     receipt. Only an ASN that is active and counted in `shipped` may reopen,
 *     only when it has a kept-open receipt line for the material (with no
 *     receipt nothing was received, so there is nothing to put back), and what
 *     it reopens is
 *       max(0, its shipped quantity for the material − Σ received of its
 *              kept-open receipt lines for the material).
 *     So two receipts against one ASN cannot reopen the same debt twice, and a
 *     receipt whose ASN is not on record reopens NOTHING — that shipment was
 *     never subtracted from `shipped`, so its quantity is already open. This
 *     function reports one receipt's own missing quantity; the per-ASN
 *     aggregation lives in `openQtyForLine`, its only consumer;
 *   · ⚠️ BL-139 (owner ruling, 2026-11-19) — a DELIVERED ASN that a receipt
 *     covers does not reopen anything through that aggregation: the open
 *     quantity is already `committed − received` (the receipt is the
 *     authority), so adding the missing quantity back would count the same
 *     shortfall twice. See `openQtyForLine`;
 *   · no second receipt is required: the quantity reopens as soon as the
 *     receipt is kept open, and it returns to the SAME PO line and material it
 *     was received against (no document is edited; the open quantity is a read);
 *   · a receipt still under inspection reopens on the same terms its label
 *     already shows (the label is a quantity read, not a status one);
 *   · the supplier's acknowledgement or dispute of the discrepancy changes
 *     nothing here: the goods have not arrived until they arrive.
 * @param {Pick<GoodsReceipt, 'inspectionResults' | 'status'>} gr
 * @param {Pick<ASN, 'lineItems'> | null} [asn]
 * @returns {Readonly<Record<string, number>>} Missing quantity by material code.
 */
export function reopenedQtyByMaterial(gr, asn) {
  /** @type {Record<string, number>} */
  const out = {};
  for (const line of compareReceipt(gr, asn)) {
    if (line.qtyOutcome !== 'shortOver') continue;
    // BL-325 — the comparison already coerces a non-finite quantity to 0; the
    // guard here keeps this read finite on its own terms too.
    const missing = line.shipped - line.received;
    if (!Number.isFinite(missing)) continue;
    out[line.materialCode] = (out[line.materialCode] ?? 0) + missing;
  }
  return out;
}

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
