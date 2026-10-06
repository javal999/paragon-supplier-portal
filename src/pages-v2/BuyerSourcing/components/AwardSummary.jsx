/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { RFQ } from '@data/mockRfqs' */
/** @import { useQuoteComparison } from '../hooks/useQuoteComparison' */
import { Trophy } from 'lucide-react';
import Data from '@components/ui-v2/Data';
import { formatDate, formatMoney } from '@lib/format';

/**
 * The award summary on an Awarded RFQ: who it went to, the awarded value in
 * the quote's own currency, the award date, and the PO (none — award mints no
 * PO). Moved out of `BuyerSourcing.jsx` by the Phase 5 page split (no
 * behaviour change).
 * @type {React.FC<{
 *   selectedRfq: RFQ;
 *   awardedQuote: ReturnType<typeof useQuoteComparison>['awardedQuote'];
 *   supplierNameById: Map<string, string>;
 *   t: TFunction;
 * }>}
 */
const AwardSummary = ({ selectedRfq, awardedQuote, supplierNameById, t }) => (
  <section className="bg-success-soft border border-success/30 rounded-md p-4">
    <div className="flex items-center gap-2 mb-3">
      <Trophy size={16} className="text-success" />
      <h3 className="text-section text-text-primary">{t('sourcing.panel.awardSummary')}</h3>
    </div>
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
      <div>
        <dt className="text-text-tertiary">{t('sourcing.panel.awardedTo')}</dt>
        <dd className="text-text-primary font-semibold">
          {selectedRfq.awardedSupplierId
            ? (supplierNameById.get(selectedRfq.awardedSupplierId) ?? selectedRfq.awardedSupplierId)
            : '—'}
        </dd>
      </div>
      <div>
        <dt className="text-text-tertiary">{t('sourcing.panel.awardedValue')}</dt>
        <Data as="dd" className="text-text-primary font-semibold">
          {/* 2e-c-4 — was an unconditional `formatIDR`, so an awarded USD or
              EUR quote had its contract value restated in rupiah on
              the ONE row recording what Paragon actually committed
              to. The award summary is the last place a currency may
              be assumed. */}
          {awardedQuote ? formatMoney(awardedQuote.totalPrice, awardedQuote.currency) : '—'}
        </Data>
      </div>
      <div>
        <dt className="text-text-tertiary">{t('sourcing.panel.awardDate')}</dt>
        <Data as="dd" className="text-text-primary font-medium">
          {formatDate(selectedRfq.awardDeadline)}
        </Data>
      </div>
      <div>
        <dt className="text-text-tertiary">{t('sourcing.panel.poIssued')}</dt>
        {/* Award mints no PO — issuance is a separate buyer verb. */}
        <dd className="text-text-tertiary font-medium">—</dd>
      </div>
    </dl>
  </section>
);

export default AwardSummary;
