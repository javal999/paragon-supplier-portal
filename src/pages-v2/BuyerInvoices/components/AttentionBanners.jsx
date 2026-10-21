/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { BuyerInvoice } from '@services/data/types' */
import { AlertTriangle, AlertOctagon } from 'lucide-react';

/**
 * @typedef {object} AttentionBannersProps
 * @property {BuyerInvoice[]} overdueInvoices  Invoices whose status is Overdue.
 * @property {BuyerInvoice[]} disputedInvoices  Invoices whose status is Disputed.
 * @property {TFunction} t
 */

/**
 * The two attention banners under the KPI row: overdue invoices (number and
 * days outstanding) and disputed invoices (numbers). Each renders only when
 * its list is non-empty. Moved out of `BuyerInvoices.jsx` by the Phase 5 page
 * split (no behaviour change).
 * @type {React.FC<AttentionBannersProps>}
 */
const AttentionBanners = ({ overdueInvoices, disputedInvoices, t }) => (
  <>
    {overdueInvoices.length > 0 && (
      <div className="bg-danger-soft border-l-2 border-danger rounded px-4 py-3 mb-3 text-sm text-danger flex items-start gap-2">
        <AlertOctagon size={14} className="shrink-0 mt-0.5" />
        <div>
          <strong>
            {t(
              overdueInvoices.length === 1
                ? 'buyerInvoices.banner.overdue.label.one'
                : 'buyerInvoices.banner.overdue.label.other',
              { count: overdueInvoices.length }
            )}
          </strong>
          {overdueInvoices
            .map((i) =>
              t('buyerInvoices.banner.overdue.item', {
                invoice: i.invoiceNumber,
                days: i.daysOutstanding
              })
            )
            .join(' · ')}
        </div>
      </div>
    )}

    {disputedInvoices.length > 0 && (
      <div className="bg-warning-soft border-l-2 border-warning rounded px-4 py-3 mb-6 text-sm text-warning-hover flex items-start gap-2">
        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
        <div>
          <strong>{t('buyerInvoices.banner.dispute.label')}</strong>
          {disputedInvoices.map((i) => i.invoiceNumber).join(', ')}
          {t('buyerInvoices.banner.dispute.body')}
        </div>
      </div>
    )}
  </>
);

export default AttentionBanners;
