import { useState } from 'react';
/** @import { GoodsReceipt, SupplierInvoice } from '@services/data/types' */
import {
  isDuplicateInvoiceNumber,
  remainingInvoiceableQty
} from '@services/transitions/fulfilmentRules';
import { readInvoiceAmount } from '../../invoices/invoiceAmountModel';
import { applyEntries } from '../utils';

/**
 * Correct and resubmit a returned invoice: the invoice being corrected
 * (`fixTarget`, which also opens the panel), its editable fields, `openFix`
 * to seed them from the invoice, and the derived lines, amount read,
 * duplicate-number check and readiness gate. Called by the page, not by
 * `FixInvoicePanel`, because the table row and the detail panel both open it
 * and the state stays owned by the page component as before the Phase 5 split.
 * @param {readonly SupplierInvoice[]} INVOICES  The supplier's WHOLE invoice population.
 * @param {readonly GoodsReceipt[]} RECEIPTS  The supplier's goods receipts.
 */
export function useFixInvoice(INVOICES, RECEIPTS) {
  // Correct and resubmit a returned invoice.
  const [fixTarget, setFixTarget] = useState(/** @type {SupplierInvoice | null} */ (null));
  const [fixAmount, setFixAmount] = useState('');
  const [fixNumber, setFixNumber] = useState('');
  const [fixDate, setFixDate] = useState('');
  const [fixTaxFile, setFixTaxFile] = useState('');
  const [fixLineQty, setFixLineQty] = useState(/** @type {Record<string, string>} */ ({}));

  // ── Correct and resubmit ────────────────────────────────────────────────
  /** @param {SupplierInvoice} inv */
  const openFix = (inv) => {
    setFixTarget(inv);
    setFixAmount(String(inv.amount));
    setFixNumber(inv.invoiceNumber);
    setFixDate(inv.invoiceDate ?? '');
    setFixTaxFile(inv.taxInvoiceFile ?? '');
    setFixLineQty({});
  };
  const fixLines = (fixTarget?.lines ?? []).map((l) => {
    const gr = RECEIPTS.find((g) => g.id === l.receiptId);
    return {
      ...l,
      remaining: gr ? remainingInvoiceableQty(gr, l.materialCode, INVOICES, fixTarget?.id) : null
    };
  });
  const fixRead = applyEntries(fixLines, fixLineQty);
  const fixAmountRead = readInvoiceAmount(fixAmount);
  const fixDuplicate =
    !!fixTarget &&
    fixNumber.trim() !== '' &&
    isDuplicateInvoiceNumber(fixNumber, fixTarget.supplierId, INVOICES, fixTarget.id);
  const fixReady =
    !!fixTarget &&
    fixAmountRead.ok &&
    fixAmountRead.value > 0 &&
    fixRead.valid &&
    fixNumber.trim() !== '' &&
    !fixDuplicate;

  return {
    fixTarget,
    setFixTarget,
    fixAmount,
    setFixAmount,
    fixNumber,
    setFixNumber,
    fixDate,
    setFixDate,
    fixTaxFile,
    setFixTaxFile,
    fixLineQty,
    setFixLineQty,
    openFix,
    fixLines,
    fixRead,
    fixAmountRead,
    fixDuplicate,
    fixReady
  };
}

/** @typedef {ReturnType<typeof useFixInvoice>} FixInvoiceForm */
