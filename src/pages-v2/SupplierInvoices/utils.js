/** @import { TFunction } from 'i18next' */
/** @import { TimelineEvent } from '@components/ui-v2/Timeline' */
/** @import { InvoiceLine, SupplierInvoice, SupplierInvoiceStage } from '@services/data/types' */
import { CheckCircle2, Clock, FileText, Wallet } from 'lucide-react';
import { formatDate, formatIDR } from '@lib/format';
import { statusLabelKey } from '@lib/statusLabel';
import { readQty } from '../invoices/InvoiceCollaboration';
import { readInvoiceAmount } from '../invoices/invoiceAmountModel';

// Pure helpers of the supplier invoices page, moved out of
// `SupplierInvoices.jsx` by the Phase 5 page split (no behaviour change).

/**
 * Short IDR amount for KPI tiles and table cells, through the shared compact
 * scale: a billion is "B" in English and "M" (miliar) in Indonesian; millions
 * are "jt" in both (BL-83). It used to write "M" in English too, where it reads
 * as million.
 * @param {number} n
 * @returns {string}
 */
export const fmtIDR = (n) => formatIDR(n, { compact: true });

/**
 * Full IDR amount, grouped in the Indonesian locale.
 * @param {number} n
 * @returns {string}
 */
export const fmtIDRFull = (n) => `Rp ${n.toLocaleString('id-ID')}`;

/**
 * A date as `DD Mon YYYY` in the UI language ("31 Agu 2026" in Indonesian),
 * or an em dash when there is none.
 * @param {string | null} s
 * @returns {string}
 */
export const fmtDate = (s) => formatDate(s);

/**
 * REQ-E07-07 step 5 — Submitted → Verified → Scheduled for payment → Paid.
 * Kept beside `buildTimeline`, the one function that maps it.
 * @type {readonly SupplierInvoiceStage[]}
 */
// i18n-defer: canonical status tokens, localized at render through statusLabelKey
const STAGE_ORDER = ['Submitted', 'Verified', 'Scheduled for payment', 'Paid'];

/**
 * The detail panel's lifecycle timeline for one invoice.
 * @param {SupplierInvoice} inv
 * @param {TFunction} t
 * @returns {TimelineEvent[]}
 */
export const buildTimeline = (inv, t) => {
  const at = inv.stage === 'Returned' ? 0 : STAGE_ORDER.indexOf(inv.stage);
  const icons = [FileText, CheckCircle2, Clock, Wallet];
  return STAGE_ORDER.map((stage, i) => {
    const k = statusLabelKey(stage);
    return {
      id: stage,
      title: k ? t(k) : stage,
      timestamp:
        i === 0 && inv.stage !== 'Draft'
          ? fmtDate(inv.submittedDate)
          : i === 3 && inv.paymentDate
            ? fmtDate(inv.paymentDate)
            : undefined,
      status:
        inv.stage === 'Draft'
          ? 'pending'
          : i < at || (inv.stage === 'Paid' && i === at)
            ? 'completed'
            : i === at
              ? 'current'
              : 'pending',
      icon: icons[i]
    };
  });
};

/**
 * The key of one invoice line in a typed-quantity map: receipt and material.
 * @param {Pick<InvoiceLine, 'receiptId' | 'materialCode'>} l
 */
export const lineKey = (l) => `${l.receiptId}|${l.materialCode}`;

/**
 * Apply typed quantities to lines; report whether every line is readable and in bounds.
 * @param {readonly (InvoiceLine & { remaining: number | null })[]} lines
 * @param {Record<string, string>} entries
 */
export const applyEntries = (lines, entries) => {
  const out = lines.map((l) => {
    const q = readQty(entries[lineKey(l)] ?? String(l.quantity));
    return { ...l, quantity: q };
  });
  const valid = out.every(
    (l, i) =>
      Number.isFinite(l.quantity) &&
      l.quantity > 0 &&
      (lines[i].remaining === null ||
        l.quantity <=
          /** @type {NonNullable<((typeof lines)[number])['remaining']>} */ (lines[i].remaining))
  );
  /** @type {InvoiceLine[]} */
  const clean = out.map(({ remaining: _r, ...l }) => l);
  return { lines: clean, valid };
};

/**
 * A line's default billed amount: quantity × PO unit price, to the sen. NaN
 * while the quantity is unreadable.
 * @param {Pick<InvoiceLine, 'quantity' | 'unitPrice'>} l
 * @returns {number}
 */
export const defaultLineAmount = (l) => Math.round(l.quantity * l.unitPrice * 100) / 100;

/**
 * One line's billed amount: the typed text through `readInvoiceAmount`, or the
 * default (quantity × PO unit price) while nothing is typed.
 * @param {string | undefined} typed
 * @param {Pick<InvoiceLine, 'quantity' | 'unitPrice'>} l
 * @returns {ReturnType<typeof readInvoiceAmount>}
 */
export const readLineAmount = (typed, l) => {
  if (typed !== undefined) return readInvoiceAmount(typed);
  const d = defaultLineAmount(l);
  return Number.isFinite(d) ? { ok: true, value: d } : { ok: false, reason: 'EMPTY_QTY' };
};

/**
 * BL-75 [Proposed] — the amount the supplier bills PER LINE. A line the
 * supplier has not typed an amount for is billed at quantity × PO unit price,
 * so the amounts follow the quantity until they are overtyped. The invoice
 * total is the sum of the lines (to the sen); the whole-invoice difference that
 * CR-12 used to check under the strictest rule cannot arise from this form.
 * Each typed amount goes through `readInvoiceAmount`, the one read of an amount.
 * @param {readonly InvoiceLine[]} lines  Lines with their typed quantities applied (`applyEntries`).
 * @param {Record<string, string>} entries  Typed amount text per `lineKey`.
 */
export const applyAmounts = (lines, entries) => {
  const reads = lines.map((l) => readLineAmount(entries[lineKey(l)], l));
  const valid = reads.length > 0 && reads.every((r) => r.ok && r.value > 0);
  const total = Math.round(reads.reduce((a, r) => a + (r.ok ? r.value : 0), 0) * 100) / 100;
  const billed = lines.map((l, i) => {
    const r = reads[i];
    return r.ok ? { ...l, billedAmount: r.value } : l;
  });
  return { reads, valid, total, lines: billed };
};
