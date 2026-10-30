// ────────────────────────────────────────────────────────────────────────────
// Fulfilment rules · invoice (REQ-E07-07; CR-12, CR-13) — invoiceable
// quantity, line refusals, duplicate numbers, the price check and the match
// verdict at submission. Separate from the receipt rules; it reads only the
// receipts it is handed and `checkPrice` from `invoiceRollup.js`.
// ────────────────────────────────────────────────────────────────────────────

import { POStatus } from '../../data/types';
/** @import { Invoice, InvoiceLine, InvoiceStatus, PurchaseOrder, SupplierInvoiceStage } from '../../data/types' */
/** @import { GoodsReceipt, GRStatus } from '@data/mockGoodsReceipts' */
/** @import { MatchVerdict, PriceCheck, PriceRule } from '../invoiceRollup' */
import { checkPrice } from '../invoiceRollup';

// ── Invoice (REQ-E07-07) ────────────────────────────────────────────────────

/**
 * POs an invoice may bill against — confirmed, partly or fully delivered.
 * @type {readonly POStatus[]}
 */
export const INVOICEABLE_PO_STATES = [
  POStatus.CONFIRMED,
  POStatus.PARTIALLY_DELIVERED,
  POStatus.DELIVERED
];

/**
 * Receipts whose accepted quantity is final and so can be invoiced.
 * @type {readonly GRStatus[]}
 */
export const INVOICEABLE_RECEIPT_STATES = [
  'Approved',
  'Partially Approved',
  'Posting to SAP',
  'Posted to SAP'
];

/**
 * @param {string} receiptId
 * @param {string} materialCode
 */
const lineKey = (receiptId, materialCode) => `${receiptId}|${materialCode}`;

/**
 * Quantity already invoiced per receipt line, across every invoice but one.
 * @param {readonly Pick<Invoice, 'id' | 'lines'>[]} invoices
 * @param {string} [excludeInvoiceId]
 * @returns {Map<string, number>}
 */
export function invoicedQtyByReceiptLine(invoices, excludeInvoiceId) {
  const out = /** @type {Map<string, number>} */ (new Map());
  for (const inv of invoices) {
    if (inv.id === excludeInvoiceId) continue;
    for (const l of inv.lines ?? []) {
      const k = lineKey(l.receiptId, l.materialCode);
      out.set(k, (out.get(k) ?? 0) + l.quantity);
    }
  }
  return out;
}

/**
 * BR-02 — accepted minus already invoiced, for one receipt line.
 * @param {Pick<GoodsReceipt, 'id' | 'inspectionResults'>} gr
 * @param {string} materialCode
 * @param {readonly Pick<Invoice, 'id' | 'lines'>[]} invoices
 * @param {string} [excludeInvoiceId]
 * @returns {number}
 */
export function remainingInvoiceableQty(gr, materialCode, invoices, excludeInvoiceId) {
  const r = gr.inspectionResults.find((x) => x.materialCode === materialCode);
  if (!r) return 0;
  const done =
    invoicedQtyByReceiptLine(invoices, excludeInvoiceId).get(lineKey(gr.id, materialCode)) ?? 0;
  return Math.max(0, r.qtyAccepted - done);
}

/**
 * Pre-fill: one invoice line per receipt line with quantity left to invoice —
 * invoiced quantity = accepted not yet invoiced, at the PO unit price.
 * @param {readonly GoodsReceipt[]} receipts
 * @param {Pick<PurchaseOrder, 'lineItems'>} po
 * @param {readonly Pick<Invoice, 'id' | 'lines'>[]} invoices
 * @param {string} [excludeInvoiceId]
 * @returns {InvoiceLine[]}
 */
export function prefillInvoiceLines(receipts, po, invoices, excludeInvoiceId) {
  /** @type {InvoiceLine[]} */
  const lines = [];
  for (const gr of receipts) {
    for (const r of gr.inspectionResults) {
      const qty = remainingInvoiceableQty(gr, r.materialCode, invoices, excludeInvoiceId);
      if (qty <= 0) continue;
      const poLine = po.lineItems.find((li) => li.materialCode === r.materialCode);
      lines.push({
        receiptId: gr.id,
        grNumber: gr.grNumber,
        materialCode: r.materialCode,
        description: r.description,
        quantity: qty,
        uom: poLine?.uom,
        unitPrice: poLine?.unitPrice ?? 0,
        ...(poLine?.contractNumber ? { contractNumber: poLine.contractNumber } : {})
      });
    }
  }
  return lines;
}

/**
 * @typedef {| 'unknownReceipt'
 *   | 'foreignReceipt'
 *   | 'notReceived'
 *   | 'unknownMaterial'
 *   | 'quantity'
 *   | 'overInvoiced'
 *   | 'price'} InvoiceLineRefusal
 */

/**
 * Why one invoice line would be refused, or null. BR-01 (own POs only: the
 * receipt must belong to this supplier and this PO), BR-02 (quantity at most
 * accepted minus already invoiced), CR-12 (the PO unit price is the basis, and
 * so is the PO line's contract: a line cannot drop or change the contract that
 * puts it at 0% tolerance; a billed amount, when given, must be a positive
 * number).
 * @param {Partial<InvoiceLine> | null | undefined} line
 * @param {{ supplierId: string; po: Pick<PurchaseOrder, 'poNumber' | 'lineItems'>; receipts: readonly GoodsReceipt[]; invoices: readonly Pick<Invoice, 'id' | 'lines'>[]; excludeInvoiceId?: string; }} ctx
 * @returns {InvoiceLineRefusal | null}
 */
export function invoiceLineRefusal(line, ctx) {
  const gr = ctx.receipts.find((g) => g.id === line?.receiptId);
  if (!line || !gr) return 'unknownReceipt';
  if (gr.supplierId !== ctx.supplierId || gr.poNumber !== ctx.po.poNumber) return 'foreignReceipt';
  if (!INVOICEABLE_RECEIPT_STATES.includes(gr.status)) return 'notReceived';
  const poLine = ctx.po.lineItems.find((li) => li.materialCode === line.materialCode);
  if (!poLine || !gr.inspectionResults.some((r) => r.materialCode === line.materialCode)) {
    return 'unknownMaterial';
  }
  const q = line.quantity;
  if (typeof q !== 'number' || !Number.isFinite(q) || q <= 0) return 'quantity';
  if (q > remainingInvoiceableQty(gr, poLine.materialCode, ctx.invoices, ctx.excludeInvoiceId)) {
    return 'overInvoiced';
  }
  if (line.unitPrice !== poLine.unitPrice) return 'price';
  if ((line.contractNumber ?? null) !== (poLine.contractNumber ?? null)) return 'price';
  if (
    line.billedAmount !== undefined &&
    !(
      typeof line.billedAmount === 'number' &&
      Number.isFinite(line.billedAmount) &&
      line.billedAmount > 0
    )
  ) {
    return 'price';
  }
  return null;
}

/**
 * AC-02 — the same invoice number from the same supplier is a duplicate.
 * @param {string} invoiceNumber
 * @param {string} supplierId
 * @param {readonly Pick<Invoice, 'id' | 'supplierId' | 'invoiceNumber'>[]} invoices
 * @param {string} [excludeInvoiceId]
 * @returns {boolean}
 */
export function isDuplicateInvoiceNumber(invoiceNumber, supplierId, invoices, excludeInvoiceId) {
  const norm = invoiceNumber.trim().toLowerCase();
  return invoices.some(
    (i) =>
      i.id !== excludeInvoiceId &&
      i.supplierId === supplierId &&
      i.invoiceNumber.trim().toLowerCase() === norm
  );
}

/**
 * CR-12 — expected value = Σ invoiced quantity × PO unit price.
 * @param {readonly Pick<InvoiceLine, 'quantity' | 'unitPrice'>[]} lines
 * @returns {number}
 */
export const expectedInvoiceValue = (lines) =>
  lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);

/**
 * CR-12 — the rule a line is checked under: 0% on a contract price, else 2% within the cap.
 * @param {Pick<InvoiceLine, 'contractNumber'>} l
 * @returns {PriceRule}
 */
export const linePriceRule = (l) => (l.contractNumber ? 'contract' : 'standard');

/** CR-12 for one invoice line: billed amount (or quantity × price) against quantity × PO price. */
/**
 * @typedef {PriceCheck & {
 *     receiptId: string;
 *     materialCode: string;
 *     contractNumber: string | null;
 *   }} InvoiceLinePriceCheck
 */

/** CR-12 across an invoice's lines, plus any part of the total not split by line. */
/**
 * @typedef {object} InvoicePriceCheck
 * @property {InvoiceLinePriceCheck[]} lines
 * @property {PriceCheck | null} unsplit The invoice total minus the lines' billed amounts, checked on its own; null
 *   when the total equals the lines. Checked at 0% when any line carries a
 *   contract price — a difference that is not split by line cannot be shown to
 *   fall on a line allowed 2% — else at 2% within the cap, against the whole
 *   expected value.
 * @property {boolean} held -  True when any line, or the unsplit part, is held.
 */

/**
 * CR-12, line by line. PURE — reads only the invoice. Each line is checked
 * under its own rule (`linePriceRule`); a line with no billed amount of its own
 * is billed at quantity × unit price, so a line can only be held on its own
 * account when the supplier stated what it billed for it.
 * @param {Pick<Invoice, 'amount' | 'lines'>} inv
 * @returns {InvoicePriceCheck}
 */
export function checkInvoicePrices(inv) {
  const lines = (inv.lines ?? []).map((l) => {
    const expected = l.quantity * l.unitPrice;
    return {
      ...checkPrice(linePriceRule(l), expected, l.billedAmount ?? expected),
      receiptId: l.receiptId,
      materialCode: l.materialCode,
      contractNumber: l.contractNumber ?? null
    };
  });
  const billedTotal = lines.reduce((a, l) => a + l.billed, 0);
  const expectedTotal = lines.reduce((a, l) => a + l.expected, 0);
  const rest = Math.round((inv.amount - billedTotal) * 100) / 100;
  const unsplit =
    rest === 0
      ? null
      : checkPrice(
          lines.some((l) => l.rule === 'contract') ? 'contract' : 'standard',
          expectedTotal,
          expectedTotal + rest
        );
  return { lines, unsplit, held: lines.some((l) => l.held) || (unsplit?.held ?? false) };
}

/**
 * The match at submission: CR-13 first (any rejected quantity on a referenced
 * receipt → Quantity mismatch), then CR-12 line by line (`checkInvoicePrices`:
 * any held line, or a held unsplit difference → Price variance, else Matched).
 * The same `checkPrice` the receipt-post match uses, so the two moments cannot
 * disagree about the rule.
 * @param {Pick<Invoice, 'amount' | 'lines'>} inv
 * @param {readonly GoodsReceipt[]} receipts
 * @returns {MatchVerdict}
 */
export function deriveInvoiceVerdict(inv, receipts) {
  const lines = inv.lines ?? [];
  const ids = new Set(lines.map((l) => l.receiptId));
  const rejects = receipts.some(
    (gr) => ids.has(gr.id) && gr.inspectionResults.some((r) => r.qtyRejected > 0)
  );
  if (rejects) return 'Qty Mismatch';
  return checkInvoicePrices(inv).held ? 'Price Variance' : 'Matched';
}

/**
 * Stored invoice state → the supplier's status list (REQ-E07-07 step 5).
 * @param {InvoiceStatus} status
 * @returns {SupplierInvoiceStage}
 */
export function supplierInvoiceStage(status) {
  switch (status) {
    case 'Draft':
      return 'Draft';
    case 'Submitted':
      return 'Submitted';
    case 'Matched':
    case 'Approved':
      return 'Verified';
    case 'Releasing Payment':
      return 'Scheduled for payment';
    case 'Payment Released':
    case 'Remittance Received':
      return 'Paid';
    case 'Disputed':
      return 'Returned';
  }
}
