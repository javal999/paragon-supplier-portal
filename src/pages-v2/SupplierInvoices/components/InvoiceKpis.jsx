/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import KpiCard from '@components/ui-v2/KpiCard';
import { fmtIDR } from '../utils';

/**
 * @typedef {object} InvoiceKpisProps
 * @property {{ paid: number; pending: number; returned: number }} sums  Amount per stage group.
 * @property {{ paid: number; pending: number; returned: number }} counts  Invoices per stage group.
 * @property {TFunction} t
 */

/**
 * The three KPI tiles: received (paid), pending, and disputed (returned), each
 * an amount over the supplier's whole invoice population with its count.
 * Moved out of `SupplierInvoices.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<InvoiceKpisProps>}
 */
const InvoiceKpis = ({ sums, counts, t }) => (
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
    <KpiCard
      term="supPaymentsReceived"
      value={fmtIDR(sums.paid)}
      subtitle={
        <span className="text-success">
          {t(
            counts.paid === 1
              ? 'supplierInvoices.kpi.invoiceCount.one'
              : 'supplierInvoices.kpi.invoiceCount.other',
            { count: counts.paid }
          )}
        </span>
      }
      icon={CheckCircle2}
    />
    <KpiCard
      term="supPendingPayment"
      value={fmtIDR(sums.pending)}
      subtitle={
        <span className="text-warning-hover">
          {t(
            counts.pending === 1
              ? 'supplierInvoices.kpi.invoiceCount.one'
              : 'supplierInvoices.kpi.invoiceCount.other',
            { count: counts.pending }
          )}
        </span>
      }
      icon={Clock}
    />
    <KpiCard
      term="supInvDisputed"
      value={fmtIDR(sums.returned)}
      subtitle={
        <span className="text-danger">
          {t(
            counts.returned === 1
              ? 'supplierInvoices.kpi.invoiceCount.one'
              : 'supplierInvoices.kpi.invoiceCount.other',
            { count: counts.returned }
          )}
        </span>
      }
      icon={AlertTriangle}
    />
  </div>
);

export default InvoiceKpis;
