/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { SupplierInvoice } from '@services/data/types' */
import { CheckCircle2 } from 'lucide-react';
import Data from '@components/ui-v2/Data';
import { fmtDate, fmtIDRFull } from '../utils';

/**
 * The detail panel's remittance view of a paid invoice: the processed banner,
 * invoice number, amount paid, payment date, bank credited, reference and the
 * payment note when there is one. Moved out of `SupplierInvoices.jsx` by the
 * Phase 5 page split (no behaviour change).
 * @type {React.FC<{ selected: SupplierInvoice; t: TFunction }>}
 */
const RemittanceSection = ({ selected, t }) => (
  <section>
    <h3 className="text-label text-text-tertiary uppercase mb-3">
      {t('supplierInvoices.section.remittance')}
    </h3>
    <div className="bg-success-soft border-l-2 border-success rounded px-4 py-3 mb-3 text-sm text-success font-semibold flex items-center gap-2">
      <CheckCircle2 size={14} />
      {t('supplierInvoices.remittance.processed')}
    </div>
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
      <div>
        <dt className="text-text-tertiary">{t('supplierInvoices.remittance.invoiceNo')}</dt>
        <Data as="dd" className="text-text-primary">
          {selected.invoiceNumber}
        </Data>
      </div>
      <div>
        <dt className="text-text-tertiary">{t('supplierInvoices.remittance.amountPaid')}</dt>
        <dd className="text-text-primary font-semibold">
          <Data>{fmtIDRFull(selected.amount)}</Data>
        </dd>
      </div>
      <div>
        <dt className="text-text-tertiary">{t('supplierInvoices.remittance.paymentDate')}</dt>
        <dd className="text-text-primary font-medium">
          <Data>{fmtDate(selected.paymentDate)}</Data>
        </dd>
      </div>
      <div>
        <dt className="text-text-tertiary">{t('supplierInvoices.remittance.bankCredited')}</dt>
        <dd className="text-text-primary font-medium">{selected.bankAccount}</dd>
      </div>
      <div className="col-span-2">
        <dt className="text-text-tertiary">{t('supplierInvoices.remittance.reference')}</dt>
        <Data as="dd" className="text-text-primary">
          {selected.paymentRef ?? '—'}
        </Data>
      </div>
    </dl>
    {selected.remittanceNote && (
      <div className="mt-3 text-xs text-text-secondary bg-bg-hover rounded px-3 py-2 border border-border-subtle">
        <strong className="text-text-primary">
          {t('supplierInvoices.remittance.paymentNote')}
        </strong>{' '}
        {selected.remittanceNote}
      </div>
    )}
  </section>
);

export default RemittanceSection;
