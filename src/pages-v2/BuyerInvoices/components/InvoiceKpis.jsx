/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
import { Clock, CheckCircle2, AlertTriangle, AlertOctagon } from 'lucide-react';
import KpiCard from '@components/ui-v2/KpiCard';
import { fmtCompact } from '../utils';

/**
 * @typedef {object} InvoiceKpisProps
 * @property {{ pendingApproval: number; released: number; disputed: number; overdue: number }} sums
 *   IDR totals per KPI (computed by the page over the drilled list).
 * @property {{ released: number; disputed: number; overdue: number }} counts  Invoices per status.
 * @property {number} pendingApprovalCount  Pending Match + Approved.
 * @property {TFunction} t
 */

/**
 * The four KPI cards: pending approval, released, disputed, overdue. Each
 * shows a compact IDR total and an invoice count. Moved out of
 * `BuyerInvoices.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<InvoiceKpisProps>}
 */
const InvoiceKpis = ({ sums, counts, pendingApprovalCount, t }) => {
  /** @param {number} n */
  const invoiceCount = (n) =>
    t(n === 1 ? 'buyerInvoices.kpi.invoiceCount.one' : 'buyerInvoices.kpi.invoiceCount.other', {
      count: n
    });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
      <KpiCard
        term="invPendingApproval"
        value={fmtCompact(sums.pendingApproval)}
        subtitle={invoiceCount(pendingApprovalCount)}
        icon={Clock}
      />
      <KpiCard
        term="invReleased"
        value={fmtCompact(sums.released)}
        subtitle={invoiceCount(counts.released)}
        icon={CheckCircle2}
      />
      <KpiCard
        term="invDisputed"
        value={fmtCompact(sums.disputed)}
        subtitle={invoiceCount(counts.disputed)}
        icon={AlertTriangle}
      />
      <KpiCard
        term="invOverdue"
        value={fmtCompact(sums.overdue)}
        subtitle={invoiceCount(counts.overdue)}
        icon={AlertOctagon}
      />
    </div>
  );
};

export default InvoiceKpis;
