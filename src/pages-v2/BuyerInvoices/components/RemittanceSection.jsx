/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { BuyerInvoice } from '@services/data/types' */
import { Download } from 'lucide-react';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import { formatIDR, formatDate } from '@lib/format';

/**
 * @typedef {object} RemittanceSectionProps
 * @property {BuyerInvoice} selected  The open invoice.
 * @property {() => void} downloadPdf  The remittance-PDF button's handler (#229: it toasts that
 *   nothing was downloaded).
 * @property {TFunction} t
 */

/**
 * The remittance-mode advice: invoice, PO, amount, payment date and bank
 * account as a small table, the download-PDF button and the note. Moved out of
 * `BuyerInvoices.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<RemittanceSectionProps>}
 */
const RemittanceSection = ({ selected, downloadPdf, t }) => (
  <section>
    <h3 className="text-label text-text-tertiary uppercase mb-3">
      {t('buyerInvoices.section.remittance')}
    </h3>
    <div className="relative min-w-0 border border-border-subtle rounded-md overflow-x-auto">
      <table className="w-full text-xs">
        <tbody>
          {[
            [t('buyerInvoices.remit.invoiceNo'), selected.invoiceNumber],
            [t('buyerInvoices.field.poReference'), selected.poNumber],
            [t('buyerInvoices.field.amount'), formatIDR(selected.amount)],
            [t('buyerInvoices.field.paymentDate'), formatDate(selected.paymentDate)],
            [t('buyerInvoices.field.bankAccount'), selected.bankAccount]
          ].map(([label, value]) => (
            <tr key={label} className="border-t border-border-subtle first:border-t-0">
              <td className="px-3 py-2 text-text-tertiary uppercase tracking-wider font-semibold w-1/3">
                {label}
              </td>
              <td className="px-3 py-2 font-semibold text-text-primary">
                <Data>{value}</Data>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <div className="mt-3 flex justify-end gap-2">
      <Button variant="secondary" icon={Download} onClick={downloadPdf}>
        {t('buyerInvoices.remit.downloadPdf')}
      </Button>
    </div>
    <div className="mt-3 bg-success-soft border-l-2 border-success rounded px-3 py-2 text-xs text-text-secondary">
      {t('buyerInvoices.remit.note')}
    </div>
  </section>
);

export default RemittanceSection;
