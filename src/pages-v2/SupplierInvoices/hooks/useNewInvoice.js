import { useMemo, useState } from 'react';
/** @import { GoodsReceipt, PurchaseOrder, SupplierInvoice } from '@services/data/types' */
import {
  INVOICEABLE_PO_STATES,
  INVOICEABLE_RECEIPT_STATES,
  expectedInvoiceValue,
  isDuplicateInvoiceNumber,
  prefillInvoiceLines,
  remainingInvoiceableQty
} from '@services/transitions/fulfilmentRules';
import { applyAmounts, applyEntries } from '../utils';

/**
 * The new-invoice form (REQ-E07-07): PO → received receipts → pre-filled lines.
 * Holds the panel's open flag and every field, and derives what the form and
 * its dispatch read: the invoiceable POs, the receipts with quantity left, the
 * pre-filled lines, the duplicate-number check and the readiness gate. Called by
 * the page, not by `NewInvoicePanel`, so the state stays owned by the page
 * component exactly as before the Phase 5 split.
 * @param {readonly SupplierInvoice[]} INVOICES  The supplier's WHOLE invoice
 *   population — never the drilled list (duplicate and over-invoicing rules).
 * @param {readonly GoodsReceipt[]} RECEIPTS  The supplier's goods receipts.
 * @param {readonly PurchaseOrder[] | undefined} poItems  `usePurchaseOrders().data?.items`.
 * @param {string | null | undefined} supplierId  The seat's supplier.
 */
export function useNewInvoice(INVOICES, RECEIPTS, poItems, supplierId) {
  // New invoice (REQ-E07-07): PO → received receipts → pre-filled lines.
  const [newOpen, setNewOpen] = useState(false);
  const [newPoRef, setNewPoRef] = useState('');
  const [newReceiptIds, setNewReceiptIds] = useState(/** @type {string[]} */ ([]));
  const [newLineQty, setNewLineQty] = useState(/** @type {Record<string, string>} */ ({}));
  const [newInvoiceNumber, setNewInvoiceNumber] = useState('');
  const [newInvoiceDate, setNewInvoiceDate] = useState('');
  const [newTaxFile, setNewTaxFile] = useState('');
  // BL-75 [Proposed]: typed billed amount per line; an untouched line bills quantity × price.
  const [newLineAmount, setNewLineAmount] = useState(/** @type {Record<string, string>} */ ({}));

  // POs an invoice may bill against (confirmed, partly or fully delivered).
  const invoiceablePos = (poItems ?? []).filter((po) => INVOICEABLE_PO_STATES.includes(po.status));
  const newPo = invoiceablePos.find((po) => po.poNumber === newPoRef);

  // Received receipts of that PO with quantity left to invoice (BR-01, BR-02).
  const receiptOptions = useMemo(
    () =>
      newPo
        ? RECEIPTS.filter(
            (gr) =>
              gr.poNumber === newPo.poNumber &&
              INVOICEABLE_RECEIPT_STATES.includes(gr.status) &&
              gr.inspectionResults.some(
                (r) => remainingInvoiceableQty(gr, r.materialCode, INVOICES) > 0
              )
          )
        : [],
    [newPo, RECEIPTS, INVOICES]
  );
  const prefilled = useMemo(
    () =>
      newPo
        ? prefillInvoiceLines(
            receiptOptions.filter((gr) => newReceiptIds.includes(gr.id)),
            newPo,
            INVOICES
          ).map((l) => ({ ...l, remaining: l.quantity }))
        : [],
    [newPo, receiptOptions, newReceiptIds, INVOICES]
  );
  const newRead = applyEntries(prefilled, newLineQty);
  const newExpected = expectedInvoiceValue(newRead.valid ? newRead.lines : []);
  const newDuplicate =
    !!supplierId &&
    newInvoiceNumber.trim() !== '' &&
    isDuplicateInvoiceNumber(newInvoiceNumber, supplierId, INVOICES);

  // ── CP-0 · W1 · 2f-d, BL-75 — THE ONE READ of the billed amounts ───────────
  // The gate, the inline messages and the dispatched payload all read this, so
  // none of them can disagree about what is being invoiced. The invoice total
  // is the sum of the lines, never a second typed number.
  const newAmounts = applyAmounts(newRead.lines, newLineAmount);
  const newReady =
    !!newPo &&
    newRead.lines.length > 0 &&
    newRead.valid &&
    newInvoiceNumber.trim() !== '' &&
    !newDuplicate &&
    newInvoiceDate !== '' &&
    newTaxFile !== '' &&
    newAmounts.valid;

  const resetNew = () => {
    setNewPoRef('');
    setNewReceiptIds([]);
    setNewLineQty({});
    setNewInvoiceNumber('');
    setNewInvoiceDate('');
    setNewTaxFile('');
    setNewLineAmount({});
  };

  return {
    newOpen,
    setNewOpen,
    newPoRef,
    setNewPoRef,
    newReceiptIds,
    setNewReceiptIds,
    newLineQty,
    setNewLineQty,
    newInvoiceNumber,
    setNewInvoiceNumber,
    newInvoiceDate,
    setNewInvoiceDate,
    newTaxFile,
    setNewTaxFile,
    newLineAmount,
    setNewLineAmount,
    invoiceablePos,
    newPo,
    receiptOptions,
    prefilled,
    newRead,
    newExpected,
    newDuplicate,
    newAmounts,
    newReady,
    resetNew
  };
}

/** @typedef {ReturnType<typeof useNewInvoice>} NewInvoiceForm */
