/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { BuyerInvoice } from '@services/data/types' */

/**
 * @typedef {object} DisputeReasonSectionProps
 * @property {BuyerInvoice} selected  The open invoice.
 * @property {string} disputeReason  The reason typed so far (state owned by the page).
 * @property {(reason: string) => void} setDisputeReason
 * @property {TFunction} t
 */

/**
 * The disputing-mode form: a labelled textarea for the dispute reason and the
 * note under it. Moved out of `BuyerInvoices.jsx` by the Phase 5 page split
 * (no behaviour change).
 * @type {React.FC<DisputeReasonSectionProps>}
 */
const DisputeReasonSection = ({ selected, disputeReason, setDisputeReason, t }) => (
  <section>
    <h3 className="text-label text-text-tertiary uppercase mb-3">
      {t('buyerInvoices.section.raiseDispute')}
    </h3>
    <label htmlFor="dispute-reason" className="sr-only">
      {t('buyerInvoices.dispute.srLabel', { invoiceNumber: selected.invoiceNumber })}
    </label>
    <textarea
      id="dispute-reason"
      className="w-full text-sm border border-border-subtle rounded-md px-3 py-2 bg-bg-surface text-text-primary"
      rows={3}
      placeholder={t('buyerInvoices.dispute.placeholder')}
      value={disputeReason}
      onChange={(e) => setDisputeReason(e.target.value)}
    />
    <div className="mt-2 text-xs text-text-tertiary">{t('buyerInvoices.dispute.note')}</div>
  </section>
);

export default DisputeReasonSection;
