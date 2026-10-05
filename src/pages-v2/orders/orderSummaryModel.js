// ─────────────────────────────────────────────────────────────────────────────
// ORDER SUMMARY MODEL — REQ-E07-03 BR-09, BR-10 and BR-11.
//
// ⚠️ **THE POINT OF THIS MODULE IS THAT THERE IS ONLY ONE OF IT.** BR-09 says a
// count on the summary must equal the number of records the destination lists,
// and BR-10 says the summary never calculates a status of its own. Both are
// promises about TWO surfaces agreeing, and the only way to keep such a promise
// without a second source of truth is for both surfaces to call the SAME
// predicate. So the summary's ASN count and the shipments page's PO-filtered ASN
// list are literally the same function applied to the same read, and a
// divergence between them is a type error rather than a discrepancy a user finds.
//
// Nothing here derives a STATUS: the statuses come from the owning pages' own
// rules modules (`poResponseProjection`, `capacityRules`, `callOffRules`,
// `fulfilmentRules`). What this module owns is membership (which records belong
// to a PO) and ordering (BR-11 attention).
// ─────────────────────────────────────────────────────────────────────────────

/** @import { ASN, GoodsReceipt, PurchaseOrder } from '@services/data/types' */
/** @import { CallOffView } from '@services/transitions/callOffRules' */
import { hasReceiptDiscrepancy, isActiveAsn } from '@services/transitions/fulfilmentRules';
/** @import { CapacityConfirmationStatus } from '@services/transitions/capacityRules' */
/** @import { ForesightStatus, ResponseStatus } from '@services/data/poResponseProjection' */

// ── Membership (BR-09) ──────────────────────────────────────────────────────

/**
 * The ASNs of one PO, counted on the summary AND listed at the destination.
 * A cancelled ASN carries no goods (REQ-E07-04), so it is excluded from BOTH.
 * @template {Pick<ASN, 'poReference' | 'status'>} T
 * @param {readonly T[]} asns
 * @param {string} poNumber
 * @returns {readonly T[]}
 */
export const asnsForPo = (asns, poNumber) =>
  asns.filter((a) => a.poReference === poNumber && isActiveAsn(a));

/**
 * The call-offs of one PO. A planner's own unreleased draft and a dismissed
 * draft are not deliveries anybody is waiting for, so neither is counted nor
 * listed (BR-09). The supplier read never returns them at all.
 * @param {readonly CallOffView[]} views
 * @param {string} poId
 * @returns {readonly CallOffView[]}
 */
export const callOffsForPo = (views, poId) =>
  views.filter(
    (v) =>
      v.callOff.poId === poId && v.callOff.status !== 'Draft' && v.callOff.status !== 'Dismissed'
  );

/**
 * The goods receipts of one PO. SAP receipts reference the umbrella PO number.
 * @template {Pick<GoodsReceipt, 'poNumber'>} T
 * @param {readonly T[]} receipts
 * @param {string} poNumber
 * @returns {readonly T[]}
 */
export const receiptsForPo = (receipts, poNumber) =>
  receipts.filter((g) => g.poNumber === poNumber);

/** The least an invoice must expose for the PO join. Both persona projections fit. */
/**
 * @typedef {{
 *     readonly poNumber: string;
 *     readonly lines: readonly { readonly receiptId: string }[];
 *   }} PoJoinableInvoice
 */

/** A receipt, as the invoice join reads it. */
/**
 * @typedef {{
 *     readonly id: string;
 *     readonly poNumber: string;
 *   }} PoJoinableReceipt
 */

/**
 * Every PO an invoice covers: the PO it names, plus the PO of every goods
 * receipt its lines draw on. An invoice covering several POs appears under each
 * of them (REQ-E07-03 data edges), which is why this returns a set and not a
 * field.
 * @param {PoJoinableInvoice} invoice
 * @param {readonly PoJoinableReceipt[]} receipts
 * @returns {readonly string[]}
 */
export function invoicePoNumbers(invoice, receipts) {
  const out = /** @type {Set<string>} */ (new Set([invoice.poNumber]));
  for (const line of invoice.lines) {
    const receipt = receipts.find((r) => r.id === line.receiptId);
    if (receipt) out.add(receipt.poNumber);
  }
  return [...out];
}

/**
 * The invoices of one PO, counted on the summary AND listed at the destination.
 *
 * ⚠️ **DRAFT EXCLUSION IS THE READ'S JOB, NOT THIS FUNCTION'S, AND THAT IS WHY
 * AC-10 HOLDS FOR BOTH PERSONAS.** `getBuyerInvoices` already drops `Draft`
 * and `getSupplierInvoices` already keeps the supplier's own — so passing each
 * persona its own read makes the count agree with its own destination without
 * this module knowing which persona asked.
 * @template {PoJoinableInvoice} T
 * @param {readonly T[]} invoices
 * @param {string} poNumber
 * @param {readonly PoJoinableReceipt[]} receipts
 * @returns {readonly T[]}
 */
export const invoicesForPo = (invoices, poNumber, receipts) =>
  invoices.filter((i) => invoicePoNumbers(i, receipts).includes(poNumber));

// ── Attention order (BR-11) ─────────────────────────────────────────────────

/** What the ordering reads off one row. Every field comes from an owning rule. */
/**
 * `overdue`: The order is past its date. A PREDICATE, not a day count, and deliberately: `daysOverdue` is a stored fixture figure (`projectionGate/dayCounts`), and a surface that copies one into a record of its own is the shape that guard exists to catch. BR-11 needs "is it late", never "by how many days".
 * `needDate`:  The date the order is needed — the last tie-break.
 *
 * @typedef {{
 *     readonly response: ResponseStatus;
 *     readonly overdue: boolean;
 *     readonly capacity: CapacityConfirmationStatus;
 *     readonly foresight: ForesightStatus;
 *     readonly callOffAlarm: boolean;
 *     readonly receiptDiscrepancy: boolean;
 *     readonly needDate: string;
 *   }} AttentionInputs
 */

/**
 * 0 = escalated or overdue, 1 = a gap or a discrepancy, 2 = the rest (BR-11).
 * @param {AttentionInputs} a
 * @returns {0 | 1 | 2}
 */
export function attentionBand(a) {
  if (a.response === 'escalated' || a.overdue) return 0;
  if (a.capacity === 'gap' || a.foresight === 'gap' || a.callOffAlarm || a.receiptDiscrepancy)
    return 1;
  return 2;
}

/**
 * BR-11 — escalated or overdue first, then gaps and discrepancies, then need date.
 * @param {AttentionInputs} a
 * @param {AttentionInputs} b
 * @returns {number}
 */
export function compareAttention(a, b) {
  return attentionBand(a) - attentionBand(b) || a.needDate.localeCompare(b.needDate);
}

/**
 * True when any receipt of this PO differs from what its ASN shipped (REQ-E07-06).
 * @param {Pick<PurchaseOrder, 'poNumber'>} po
 * @param {readonly GoodsReceipt[]} receipts
 * @param {readonly ASN[]} asns
 * @returns {boolean}
 */
export function poHasReceiptDiscrepancy(po, receipts, asns) {
  return receiptsForPo(receipts, po.poNumber).some((gr) =>
    hasReceiptDiscrepancy(gr, asns.find((a) => a.asnNumber === gr.asnNumber) ?? null)
  );
}
