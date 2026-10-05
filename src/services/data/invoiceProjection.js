// ────────────────────────────────────────────────────────────────────────────
// Invoice persona projection (v2.2 Step 4 batch iii — DR-7, census G1/G3).
//
// The invoice is ONE canonical document (`Invoice`, one store row). Each persona
// surface reads a PROJECTION of it: the supplier and buyer vocabularies are
// label maps of the canonical `InvoiceStatus`, and `Overdue` is a clock-derived
// label computed HERE at read time (DR-8 / law 0.5 — never a stored state). This
// is the DR-7 payoff: because both surfaces derive from one source, they cannot
// contradict each other the way the two hand-maintained fixtures once did
// (HALAL-XPERSONA-01 / INV-XPERSONA-FIXTURE-01).
//
// Pure functions of (invoice, now). No store, no clock of their own — `now` is
// injected so the projection is deterministic and testable.
// ────────────────────────────────────────────────────────────────────────────

/** @import { Invoice, InvoiceStatus, SupplierInvoice, SupplierInvoiceStatus, BuyerInvoice, BuyerInvoiceStatus } from './types' */
import { supplierInvoiceStage } from '../transitions/fulfilmentRules';

/**
 * The `YYYY-MM-DD` day of an ISO instant (lexicographic date compares work).
 * @param {string} nowIso
 * @returns {string}
 */
function day(nowIso) {
  return nowIso.slice(0, 10);
}

/** Lifecycle states that are still "open" — the only ones that can be overdue.
 * @type {ReadonlySet<InvoiceStatus>}
 *  Draft is pre-submission; paid/remitted are settled; Disputed shows Disputed. */
const OVERDUE_ELIGIBLE = /** @type {Set<InvoiceStatus>} */ (
  new Set(['Submitted', 'Matched', 'Approved', 'Releasing Payment'])
);

/**
 * Computed Overdue (DR-8): an open, unpaid invoice past its due date.
 * @param {Invoice} inv
 * @param {string} nowIso
 * @returns {boolean}
 */
export function isOverdue(inv, nowIso) {
  return OVERDUE_ELIGIBLE.has(inv.status) && inv.dueDate < day(nowIso);
}

/**
 * Whole days a still-open invoice is past due (0 when not overdue).
 * @param {Invoice} inv
 * @param {string} nowIso
 * @returns {number}
 */
export function daysOutstanding(inv, nowIso) {
  if (!isOverdue(inv, nowIso)) return 0;
  const due = Date.parse(inv.dueDate);
  const now = Date.parse(day(nowIso));
  return Math.max(0, Math.round((now - due) / 86_400_000));
}

/** Canonical status → SUPPLIER label. Disputed and computed Overdue win first;
 *  the SAP interim `Releasing Payment` reads as `Approved` to the supplier — no
 * @param {Invoice} inv
 * @param {string} nowIso
 * @returns {SupplierInvoiceStatus}
 *  "paid" claim before settlement (honest-by-construction, law 0.6). */
export function toSupplierLabel(inv, nowIso) {
  if (inv.status === 'Disputed') return 'Disputed';
  if (isOverdue(inv, nowIso)) return 'Overdue';
  switch (inv.status) {
    case 'Draft':
      return 'Draft';
    case 'Submitted':
    case 'Matched':
      return 'Pending Approval';
    case 'Approved':
    case 'Releasing Payment':
      return 'Approved';
    case 'Payment Released':
      return 'Payment Released';
    case 'Remittance Received':
      return 'Remittance Received';
  }
}

/** Canonical status → BUYER label. The buyer has no `Matched`/`Remittance`
 *  lifecycle label — the match axis is surfaced separately via `matchStatus`,
 *  and remittance collapses to `Payment Released`. Draft is supplier-private and
 * @param {Invoice} inv
 * @param {string} nowIso
 * @returns {BuyerInvoiceStatus}
 *  filtered out of the buyer read before projection (defensive default here). */
export function toBuyerLabel(inv, nowIso) {
  if (inv.status === 'Disputed') return 'Disputed';
  if (isOverdue(inv, nowIso)) return 'Overdue';
  switch (inv.status) {
    case 'Draft':
    case 'Submitted':
    case 'Matched':
      return 'Pending Match';
    case 'Approved':
      return 'Approved';
    case 'Releasing Payment':
    case 'Payment Released':
    case 'Remittance Received':
      return 'Payment Released';
  }
}

/**
 * Project the canonical invoice to the SUPPLIER surface shape.
 * @param {Invoice} inv
 * @param {string} nowIso
 * @returns {SupplierInvoice}
 */
export function toSupplierInvoice(inv, nowIso) {
  return {
    id: inv.id,
    supplierId: inv.supplierId,
    invoiceNumber: inv.invoiceNumber,
    poNumber: inv.poNumber,
    amount: inv.amount,
    status: toSupplierLabel(inv, nowIso),
    submittedDate: inv.submittedDate,
    dueDate: inv.dueDate,
    paymentDate: inv.paymentDate,
    paymentRef: inv.paymentRef,
    bankAccount: inv.bankAccount,
    sapFiDoc: inv.sapFiDoc,
    channel: inv.channel,
    buyerContact: inv.buyerContact,
    remittanceNote: inv.remittanceNote,
    // REQ-E07-07 — the supplier's status list and CR-14 overdue, both derived
    // here at read time from the stored state and the clock.
    stage: supplierInvoiceStage(inv.status),
    overdue: isOverdue(inv, nowIso),
    daysOutstanding: daysOutstanding(inv, nowIso),
    matchStatus: inv.matchStatus,
    lines: inv.lines ?? [],
    invoiceDate: inv.invoiceDate ?? null,
    taxInvoiceFile: inv.taxInvoiceFile ?? null,
    returnReason: inv.returnReason ?? null
  };
}

/** Project the canonical invoice to the BUYER surface shape (match axis + aging
 * @param {Invoice} inv
 * @param {string} nowIso
 * @returns {BuyerInvoice}
 *  surfaced from the canonical entity + clock; nothing re-stored). */
export function toBuyerInvoice(inv, nowIso) {
  return {
    id: inv.id,
    // The canonical state, uncollapsed — the input every legality question takes.
    // `status` below is the display label and is lossy by design (see the DTO).
    lifecycleState: inv.status,
    invoiceNumber: inv.invoiceNumber,
    supplierName: inv.supplierName,
    supplierId: inv.supplierId,
    poNumber: inv.poNumber,
    poId: inv.poId,
    amount: inv.amount,
    currency: inv.currency,
    status: toBuyerLabel(inv, nowIso),
    receivedDate: inv.submittedDate,
    dueDate: inv.dueDate,
    paymentDate: inv.paymentDate,
    matchStatus: inv.matchStatus,
    sapFiDoc: inv.sapFiDoc,
    sapGrDoc: inv.sapGrDoc,
    approver: inv.approver,
    paymentTerms: inv.paymentTerms,
    daysOutstanding: daysOutstanding(inv, nowIso),
    bankAccount: inv.bankAccount,
    channel: inv.channel,
    lines: inv.lines ?? [],
    invoiceDate: inv.invoiceDate ?? null,
    taxInvoiceFile: inv.taxInvoiceFile ?? null,
    returnReason: inv.returnReason ?? null
  };
}
