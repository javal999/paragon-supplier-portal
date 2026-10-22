/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { BuyerInvoice } from '@services/data/types' */
import { invoicePriceTolerance } from '@services/transitions';
import { statusLabelKey } from '@lib/statusLabel';
import { fmtIdr } from '../../invoices/InvoiceCollaboration';
import { MATCH_DESC_KEY, MATCH_VARIANT } from '../const';

/**
 * @typedef {object} MatchSectionProps
 * @property {BuyerInvoice} selected  The open invoice.
 * @property {TFunction} t
 */

/**
 * The panel's 3-way match box: the localized match status on a tint chosen by
 * its variant, and the status's explanation with the configured price
 * tolerances. Moved out of `BuyerInvoices.jsx` by the Phase 5 page split (no
 * behaviour change).
 * @type {React.FC<MatchSectionProps>}
 */
const MatchSection = ({ selected, t }) => (
  <section>
    <h3 className="text-label text-text-tertiary uppercase mb-3">
      {t('buyerInvoices.section.match')}
    </h3>
    <div
      className={`border-l-2 rounded px-3 py-3 text-sm ${
        MATCH_VARIANT[selected.matchStatus] === 'success'
          ? 'bg-success-soft border-success text-success'
          : MATCH_VARIANT[selected.matchStatus] === 'danger'
            ? 'bg-danger-soft border-danger text-danger'
            : 'bg-bg-hover border-border-subtle text-text-secondary'
      }`}
    >
      <div className="font-semibold">
        {(() => {
          const k = statusLabelKey(selected.matchStatus);
          return k ? t(k) : selected.matchStatus;
        })()}
      </div>
      <div className="text-text-secondary mt-1">
        {t(MATCH_DESC_KEY[selected.matchStatus], {
          contractPct: invoicePriceTolerance().contractPricePct,
          pct: invoicePriceTolerance().standardPct,
          cap: fmtIdr(invoicePriceTolerance().standardCapIdr)
        })}
      </div>
    </div>
  </section>
);

export default MatchSection;
