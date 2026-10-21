/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { BuyerInvoice } from '@services/data/types' */
import Data from '@components/ui-v2/Data';
import { formatIDR } from '@lib/format';

/**
 * @typedef {object} ConfirmReleaseSectionProps
 * @property {BuyerInvoice} selected  The open invoice.
 * @property {TFunction} t
 */

/**
 * The confirming-mode notice: the amount and bank account about to be
 * released, and the note that settlement is simulated. Moved out of
 * `BuyerInvoices.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<ConfirmReleaseSectionProps>}
 */
const ConfirmReleaseSection = ({ selected, t }) => (
  <section className="bg-warning-soft border-l-2 border-warning rounded px-4 py-3 text-sm text-warning-hover">
    <div className="font-semibold mb-1">{t('buyerInvoices.confirm.title')}</div>
    <div className="text-text-secondary">
      {t('buyerInvoices.confirm.body.pre')}
      <Data as="strong" className="text-text-primary">
        {formatIDR(selected.amount)}
      </Data>
      {t('buyerInvoices.confirm.body.mid')}
      <Data as="strong" className="text-text-primary">
        {selected.bankAccount}
      </Data>
      {t('buyerInvoices.confirm.body.post')}
    </div>
    <div className="mt-2 pt-2 border-t border-warning/30 text-xs text-text-secondary">
      {t('buyerInvoices.confirm.simulatedSettle')}
    </div>
  </section>
);

export default ConfirmReleaseSection;
