/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { BuyerInvoice } from '@services/data/types' */
import Data from '@components/ui-v2/Data';
import { formatDate } from '@lib/format';

/**
 * @typedef {object} SapPaymentSectionsProps
 * @property {BuyerInvoice} selected  The open invoice.
 * @property {TFunction} t
 */

/**
 * The panel's SAP documents section (FI and GR document, or "pending") and
 * its payment section (bank account, payment date), as two sibling sections.
 * Moved out of `BuyerInvoices.jsx` by the Phase 5 page split (no behaviour
 * change).
 * @type {React.FC<SapPaymentSectionsProps>}
 */
const SapPaymentSections = ({ selected, t }) => (
  <>
    <section>
      <h3 className="text-label text-text-tertiary uppercase mb-3">
        {t('buyerInvoices.section.sapDocs')}
      </h3>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div>
          <dt className="text-text-tertiary">{t('buyerInvoices.field.fiDocument')}</dt>
          <Data as="dd" className={`${selected.sapFiDoc ? 'text-success' : 'text-text-tertiary'}`}>
            {selected.sapFiDoc ?? t('buyerInvoices.field.pending')}
          </Data>
        </div>
        <div>
          <dt className="text-text-tertiary">{t('buyerInvoices.field.grDocument')}</dt>
          <Data as="dd" className={`${selected.sapGrDoc ? 'text-success' : 'text-text-tertiary'}`}>
            {selected.sapGrDoc ?? t('buyerInvoices.field.pending')}
          </Data>
        </div>
      </dl>
    </section>

    <section>
      <h3 className="text-label text-text-tertiary uppercase mb-3">
        {t('buyerInvoices.section.payment')}
      </h3>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div>
          <dt className="text-text-tertiary">{t('buyerInvoices.field.bankAccount')}</dt>
          <Data as="dd" className="text-text-primary font-medium">
            {selected.bankAccount}
          </Data>
        </div>
        <div>
          <dt className="text-text-tertiary">{t('buyerInvoices.field.paymentDate')}</dt>
          <Data as="dd" className="text-text-primary font-medium">
            {formatDate(selected.paymentDate)}
          </Data>
        </div>
      </dl>
    </section>
  </>
);

export default SapPaymentSections;
