// ────────────────────────────────────────────────────────────────────────────
// Order fulfilment rules — ASN, goods receipt discrepancy, invoice
// (REQ-E07-04, REQ-E07-06, REQ-E07-07; CR-11 to CR-14).
//
// PURE functions of the records they are handed: no store, no clock. Each rule
// is ONE expression read by the policy (the law, bound in the mock adapter where
// the cross-entity reads live) and by the screens (a courtesy mirror), on the
// `confirmedQtyWithinBounds` precedent — so the form cannot drift from the verb.
//
// The module is a folder since BL-229: one file per concern, and this index
// re-exports every name the single file exported, so importers keep the old
// specifier. Helpers a sibling needs (`isNonBlank`) are not re-exported.
// ────────────────────────────────────────────────────────────────────────────

/** @typedef {import('./asn').AsnBatchSource} AsnBatchSource */
/** @typedef {import('./asn').AsnLineInput} AsnLineInput */
/** @typedef {import('./asn').AsnLineCheck} AsnLineCheck */
/** @typedef {import('./asn').AsnLineRefusal} AsnLineRefusal */
/** @typedef {import('./shelfLife').ShelfLifeLineView} ShelfLifeLineView */
/** @typedef {import('./shelfLife').ShelfLifeRequest} ShelfLifeRequest */
/** @typedef {import('./shelfLife').ShelfLifeDecision} ShelfLifeDecision */
/** @typedef {import('./shelfLife').ShelfLifeExceptionView} ShelfLifeExceptionView */
/** @typedef {import('./asnBatch').AvailableBatch} AvailableBatch */
/** @typedef {import('./asnBatch').DeclaredBatches} DeclaredBatches */
/** @typedef {import('./asnBatch').AsnSubmitRefusal} AsnSubmitRefusal */
/** @typedef {import('./goodsReceipt').ReceiptQtyOutcome} ReceiptQtyOutcome */
/** @typedef {import('./goodsReceipt').ReceiptLineComparison} ReceiptLineComparison */
/** @typedef {import('./invoice').InvoiceLineRefusal} InvoiceLineRefusal */
/** @typedef {import('./invoice').InvoiceLinePriceCheck} InvoiceLinePriceCheck */
/** @typedef {import('./invoice').InvoicePriceCheck} InvoicePriceCheck */

export { isCalendarDate } from './shared';
export {
  ASN_PO_STATES,
  ASN_INACTIVE_STATES,
  ASN_CANCELLABLE_STATES,
  isActiveAsn,
  committedQty,
  openQtyForLine,
  asnLineCheckOf,
  asnLineRefusal
} from './asn';
export {
  addCalendarMonths,
  shelfLifeMet,
  monthsLeftAt,
  shelfLifeLineView,
  onlyShelfLifeRefused,
  shelfLifeExceptionOf,
  shelfLifeWaivedFor,
  approvedShelfLifeLines,
  etaNeedsReapproval,
  shelfLifeFailingLines
} from './shelfLife';
export {
  BATCH_CONSUMING_ASN_STATES,
  availableBatches,
  batchAboveAvailable,
  asnSubmitRefusal
} from './asnBatch';
export {
  receiptQtyOutcome,
  RECEIPT_INSPECTED_STATES,
  compareReceipt,
  receiptKeptOpen,
  reopenedQtyByMaterial,
  hasReceiptDiscrepancy,
  awaitsSupplierAnswer,
  isOpenDispute
} from './goodsReceipt';
export {
  INVOICEABLE_PO_STATES,
  INVOICEABLE_RECEIPT_STATES,
  invoicedQtyByReceiptLine,
  remainingInvoiceableQty,
  prefillInvoiceLines,
  invoiceLineRefusal,
  isDuplicateInvoiceNumber,
  expectedInvoiceValue,
  linePriceRule,
  checkInvoicePrices,
  deriveInvoiceVerdict,
  supplierInvoiceStage
} from './invoice';
