// ────────────────────────────────────────────────────────────────────────────
// Mutable invoice store (v2.2 Step 4 batch iii — DR-7).
//
// The ONE home for canonical invoices. Both persona reads project from here
// (getSupplierInvoices / getBuyerInvoices), so the two surfaces can never drift.
// Same contract as purchaseOrderStore / goodsReceiptStore: reads resolve from
// here, commands mutate IMMUTABLY (new object + new array) so an invalidated
// query yields new references and every derivation re-derives together. Keyed by
// `id`; creation ADDS a new invoice with a store-assigned number.
//
// `nextFiDoc()` / `nextPaymentRef()` mint the SAP references for a payment — but
// ONLY settlement calls them (Option B). Before settle a `Releasing Payment`
// invoice carries NO FI document ("pending SAP assignment"); this is the honest
// replacement for any client-side "paid" fabrication (law 0.6).
// ────────────────────────────────────────────────────────────────────────────

import { INVOICES } from '../fixtures/invoices';
/** @import { Invoice } from '../../types' */

/**
 * @param {Invoice} i
 * @returns {Invoice}
 */
function clone(i) {
  return { ...i };
}

/** @type {Invoice[]} */
let rows = INVOICES.map(clone);
let seq = 0;
let fiSeq = 0;
let paySeq = 0;

export const invoiceStore = {
  /** @returns {readonly Invoice[]} */
  all() {
    return rows;
  },
  /**
   * @param {string} id
   * @returns {Invoice | undefined}
   */
  get(id) {
    return rows.find((i) => i.id === id);
  },
  /**
   * Immutable update — swap in a new invoice + new array (see purchaseOrderStore).
   * @param {string} id
   * @param {(i: Invoice) => Invoice} next
   * @returns {void}
   */
  update(id, next) {
    rows = rows.map((i) => (i.id === id ? next(i) : i));
  },
  /**
   * Add a newly-created invoice (creation). New array reference.
   * @param {Invoice} invoice
   * @returns {void}
   */
  add(invoice) {
    rows = [invoice, ...rows];
  },
  /**
   * Store-assigned invoice number for a creation (no client-side fabrication).
   * @returns {string}
   */
  nextNumber() {
    seq += 1;
    return `INV-2026-${9000 + seq}`;
  },
  /**
   * SAP-assigned FI (financial) document — minted only on payment settlement.
   * @returns {string}
   */
  nextFiDoc() {
    fiSeq += 1;
    return `FI-${5100011000 + fiSeq}`;
  },
  /**
   * Payment reference — minted only on payment settlement.
   * @returns {string}
   */
  nextPaymentRef() {
    paySeq += 1;
    return `PAY-2026-${95000 + paySeq}`;
  },
  /** @returns {void} */
  reset() {
    rows = INVOICES.map(clone);
    seq = 0;
    fiSeq = 0;
    paySeq = 0;
  }
};
