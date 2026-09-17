// ────────────────────────────────────────────────────────────────────────────
// Order fulfilment rules — ASN, goods receipt discrepancy, invoice
// (REQ-E07-04, REQ-E07-06, REQ-E07-07; CR-11 to CR-14).
//
// PURE functions of the records they are handed: no store, no clock. Each rule
// is ONE expression read by the policy (the law, bound in the mock adapter where
// the cross-entity reads live) and by the screens (a courtesy mirror), on the
// `confirmedQtyWithinBounds` precedent — so the form cannot drift from the verb.
// ────────────────────────────────────────────────────────────────────────────

import { POStatus } from '../data/types';
import type {
  ASN,
  AsnStatus,
  Invoice,
  InvoiceLine,
  InvoiceStatus,
  PurchaseOrder,
  POLineItem,
  SupplierInvoiceStage,
} from '../data/types';
import type { GoodsReceipt, GRStatus } from '../../data/mockGoodsReceipts';
import { deriveMatchVerdict, type MatchVerdict } from './invoiceRollup';

const isNonBlank = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

/** A real calendar date written `YYYY-MM-DD`. */
export const isCalendarDate = (v: unknown): v is string => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
};

// ── ASN (REQ-E07-04) ────────────────────────────────────────────────────────

/** A PO an ASN may be created against: approved, and not yet fully received. */
export const ASN_PO_STATES: readonly POStatus[] = [POStatus.CONFIRMED, POStatus.PARTIALLY_DELIVERED];

/** ASN states that no longer carry goods toward PTI. */
export const ASN_INACTIVE_STATES: readonly AsnStatus[] = ['Cancelled'];

/** ASN states the supplier may still cancel — before anything was received. */
export const ASN_CANCELLABLE_STATES: readonly AsnStatus[] = ['Draft', 'Submitted'];

export const isActiveAsn = (a: Pick<ASN, 'status'>): boolean => !ASN_INACTIVE_STATES.includes(a.status);

/** The quantity the supplier committed on a PO line: confirmed, else ordered. */
export const committedQty = (li: Pick<POLineItem, 'quantity' | 'confirmedQty'>): number =>
  li.confirmedQty > 0 ? li.confirmedQty : li.quantity;

/**
 * BR-02 — open quantity on a PO line = committed quantity minus the quantity on
 * the PO's non-cancelled ASNs for that material. `excludeAsn` leaves one ASN out
 * (the one being edited). Never below zero.
 */
export function openQtyForLine(
  po: Pick<PurchaseOrder, 'poNumber'>,
  line: Pick<POLineItem, 'materialCode' | 'quantity' | 'confirmedQty'>,
  asns: readonly ASN[],
  excludeAsn?: string,
): number {
  const shipped = asns
    .filter((a) => a.poReference === po.poNumber && isActiveAsn(a) && a.asnNumber !== excludeAsn)
    .flatMap((a) => a.lineItems)
    .filter((l) => l.materialCode === line.materialCode)
    .reduce((sum, l) => sum + (Number.isFinite(l.shippedQty) ? l.shippedQty : 0), 0);
  return Math.max(0, committedQty(line) - shipped);
}

/** One ASN line as the supplier enters it. */
export interface AsnLineInput {
  materialCode: string;
  shippedQty: number;
  batchNumber?: string;
  expiryDate?: string;
}

export type AsnLineRefusal = 'unknownMaterial' | 'quantity' | 'overOpen' | 'batch' | 'expiry';

/**
 * Why one ASN line would be refused, or null. `requireBatch` is off at draft
 * time (a draft may be incomplete) and on at submission (BR-04).
 */
export function asnLineRefusal(
  line: Partial<AsnLineInput> | null | undefined,
  po: Pick<PurchaseOrder, 'poNumber' | 'lineItems'>,
  asns: readonly ASN[],
  opts: { excludeAsn?: string; overShipReason?: unknown; requireBatch: boolean },
): AsnLineRefusal | null {
  const item = po.lineItems.find((li) => li.materialCode === line?.materialCode);
  if (!line || !item) return 'unknownMaterial';
  const q = line.shippedQty;
  if (typeof q !== 'number' || !Number.isFinite(q) || q <= 0) return 'quantity';
  if (q > openQtyForLine(po, item, asns, opts.excludeAsn) && !isNonBlank(opts.overShipReason)) {
    return 'overOpen';
  }
  if (opts.requireBatch && !isNonBlank(line.batchNumber)) return 'batch';
  if (line.expiryDate !== undefined && line.expiryDate !== '' && !isCalendarDate(line.expiryDate)) {
    return 'expiry';
  }
  return null;
}

/** Why an ASN cannot be submitted (BR-04), or null when it is complete. */
export type AsnSubmitRefusal = 'noLines' | 'shipDate' | 'eta' | 'etaBeforeShip';

export function asnSubmitRefusal(fields: {
  lineCount: number;
  shipDate: unknown;
  eta: unknown;
}): AsnSubmitRefusal | null {
  if (fields.lineCount === 0) return 'noLines';
  if (!isCalendarDate(fields.shipDate)) return 'shipDate';
  if (!isCalendarDate(fields.eta)) return 'eta';
  if ((fields.eta as string) < (fields.shipDate as string)) return 'etaBeforeShip';
  return null;
}

// ── Goods receipt discrepancy (REQ-E07-06) ──────────────────────────────────

/** PQ-04 — until the tolerance is decided, any difference is a discrepancy. */
export const RECEIPT_QTY_TOLERANCE = 0;

/** Receipt states in which the inspection result is final. */
export const RECEIPT_INSPECTED_STATES: readonly GRStatus[] = [
  'Approved',
  'Partially Approved',
  'Rejected',
  'Posting to SAP',
  'Posted to SAP',
];

export interface ReceiptLineComparison {
  materialCode: string;
  description: string;
  /** From the ASN line for this material; the receipt's expected quantity when
   *  the ASN is not on record. */
  shipped: number;
  received: number;
  accepted: number;
  rejected: number;
  /** received − shipped (negative = short). */
  difference: number;
  /** BR-03 / BR-05 — outside tolerance, or anything rejected at inspection. */
  flagged: boolean;
}

/** Compare every receipt line with what was shipped. Derived at read time. */
export function compareReceipt(
  gr: Pick<GoodsReceipt, 'inspectionResults' | 'status'>,
  asn?: Pick<ASN, 'lineItems'> | null,
): ReceiptLineComparison[] {
  const inspected = RECEIPT_INSPECTED_STATES.includes(gr.status);
  return gr.inspectionResults.map((r) => {
    const asnLine = asn?.lineItems.find((l) => l.materialCode === r.materialCode);
    const shipped = asnLine ? asnLine.shippedQty : r.qtyExpected;
    const difference = r.qtyReceived - shipped;
    // CR-11 — rejected quantity counts only once the inspection is final.
    const rejected = inspected ? r.qtyRejected : 0;
    return {
      materialCode: r.materialCode,
      description: r.description,
      shipped,
      received: r.qtyReceived,
      accepted: inspected ? r.qtyAccepted : 0,
      rejected,
      difference,
      flagged: Math.abs(difference) > RECEIPT_QTY_TOLERANCE || rejected > 0,
    };
  });
}

export const hasReceiptDiscrepancy = (
  gr: Pick<GoodsReceipt, 'inspectionResults' | 'status'>,
  asn?: Pick<ASN, 'lineItems'> | null,
): boolean => compareReceipt(gr, asn).some((l) => l.flagged);

/** A discrepancy still waiting for the supplier's answer. */
export const awaitsSupplierAnswer = (
  gr: Pick<GoodsReceipt, 'inspectionResults' | 'status' | 'discrepancyResponse'>,
  asn?: Pick<ASN, 'lineItems'> | null,
): boolean => hasReceiptDiscrepancy(gr, asn) && !gr.discrepancyResponse;

/** A dispute PTI has not resolved yet. */
export const isOpenDispute = (gr: Pick<GoodsReceipt, 'discrepancyResponse'>): boolean =>
  gr.discrepancyResponse?.status === 'Disputed';

// ── Invoice (REQ-E07-07) ────────────────────────────────────────────────────

/** POs an invoice may bill against — confirmed, partly or fully delivered. */
export const INVOICEABLE_PO_STATES: readonly POStatus[] = [
  POStatus.CONFIRMED,
  POStatus.PARTIALLY_DELIVERED,
  POStatus.DELIVERED,
];

/** Receipts whose accepted quantity is final and so can be invoiced. */
export const INVOICEABLE_RECEIPT_STATES: readonly GRStatus[] = [
  'Approved',
  'Partially Approved',
  'Posting to SAP',
  'Posted to SAP',
];

const lineKey = (receiptId: string, materialCode: string) => `${receiptId}|${materialCode}`;

/** Quantity already invoiced per receipt line, across every invoice but one. */
export function invoicedQtyByReceiptLine(
  invoices: readonly Pick<Invoice, 'id' | 'lines'>[],
  excludeInvoiceId?: string,
): Map<string, number> {
  const out = new Map<string, number>();
  for (const inv of invoices) {
    if (inv.id === excludeInvoiceId) continue;
    for (const l of inv.lines ?? []) {
      const k = lineKey(l.receiptId, l.materialCode);
      out.set(k, (out.get(k) ?? 0) + l.quantity);
    }
  }
  return out;
}

/** BR-02 — accepted minus already invoiced, for one receipt line. */
export function remainingInvoiceableQty(
  gr: Pick<GoodsReceipt, 'id' | 'inspectionResults'>,
  materialCode: string,
  invoices: readonly Pick<Invoice, 'id' | 'lines'>[],
  excludeInvoiceId?: string,
): number {
  const r = gr.inspectionResults.find((x) => x.materialCode === materialCode);
  if (!r) return 0;
  const done = invoicedQtyByReceiptLine(invoices, excludeInvoiceId).get(lineKey(gr.id, materialCode)) ?? 0;
  return Math.max(0, r.qtyAccepted - done);
}

/**
 * Pre-fill: one invoice line per receipt line with quantity left to invoice —
 * invoiced quantity = accepted not yet invoiced, at the PO unit price.
 */
export function prefillInvoiceLines(
  receipts: readonly GoodsReceipt[],
  po: Pick<PurchaseOrder, 'lineItems'>,
  invoices: readonly Pick<Invoice, 'id' | 'lines'>[],
  excludeInvoiceId?: string,
): InvoiceLine[] {
  const lines: InvoiceLine[] = [];
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
      });
    }
  }
  return lines;
}

export type InvoiceLineRefusal =
  | 'unknownReceipt'
  | 'foreignReceipt'
  | 'notReceived'
  | 'unknownMaterial'
  | 'quantity'
  | 'overInvoiced'
  | 'price';

/**
 * Why one invoice line would be refused, or null. BR-01 (own POs only: the
 * receipt must belong to this supplier and this PO), BR-02 (quantity at most
 * accepted minus already invoiced), CR-12 (the PO unit price is the basis).
 */
export function invoiceLineRefusal(
  line: Partial<InvoiceLine> | null | undefined,
  ctx: {
    supplierId: string;
    po: Pick<PurchaseOrder, 'poNumber' | 'lineItems'>;
    receipts: readonly GoodsReceipt[];
    invoices: readonly Pick<Invoice, 'id' | 'lines'>[];
    excludeInvoiceId?: string;
  },
): InvoiceLineRefusal | null {
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
  return null;
}

/** AC-02 — the same invoice number from the same supplier is a duplicate. */
export function isDuplicateInvoiceNumber(
  invoiceNumber: string,
  supplierId: string,
  invoices: readonly Pick<Invoice, 'id' | 'supplierId' | 'invoiceNumber'>[],
  excludeInvoiceId?: string,
): boolean {
  const norm = invoiceNumber.trim().toLowerCase();
  return invoices.some(
    (i) =>
      i.id !== excludeInvoiceId &&
      i.supplierId === supplierId &&
      i.invoiceNumber.trim().toLowerCase() === norm,
  );
}

/** CR-12 — expected value = Σ invoiced quantity × PO unit price. */
export const expectedInvoiceValue = (lines: readonly Pick<InvoiceLine, 'quantity' | 'unitPrice'>[]): number =>
  lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);

/**
 * The match at submission: CR-13 first (any rejected quantity on a referenced
 * receipt → Quantity mismatch), then CR-12 (within 1% of the expected value →
 * Matched, else Price variance). The same `deriveMatchVerdict` the receipt-post
 * match uses, so the two moments cannot disagree about the rule.
 */
export function deriveInvoiceVerdict(
  inv: Pick<Invoice, 'amount' | 'lines'>,
  receipts: readonly GoodsReceipt[],
): MatchVerdict {
  const lines = inv.lines ?? [];
  const ids = new Set(lines.map((l) => l.receiptId));
  const rejects = receipts.some((gr) => ids.has(gr.id) && gr.inspectionResults.some((r) => r.qtyRejected > 0));
  return deriveMatchVerdict(expectedInvoiceValue(lines), inv.amount, rejects);
}

/** Stored invoice state → the supplier's status list (REQ-E07-07 step 5). */
export function supplierInvoiceStage(status: InvoiceStatus): SupplierInvoiceStage {
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
