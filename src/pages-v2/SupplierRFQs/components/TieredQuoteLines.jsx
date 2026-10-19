/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
/** @import { TieredQuoteSummary } from '../utils' */

/**
 * RFx UX S-09 — a tiered quote as the supplier priced it: how many items carry
 * a price, then per item the break-1 price and the item's own MOQ. Used on My
 * Quotes and on the rounds page in place of the derived average unit price.
 * @type {React.FC<{ summary: TieredQuoteSummary; testId: string }>}
 */
const TieredQuoteLines = ({ summary, testId }) => {
  const { t } = useTranslation();
  return (
    <div className="text-sm" data-testid={testId}>
      <div className="text-text-secondary mb-1" data-testid={`${testId}-priced`}>
        {t('rfqs.quotes.itemsPriced', { priced: summary.priced, total: summary.total })}
      </div>
      <ul className="space-y-0.5">
        {summary.lines.map((l) => (
          <li
            key={l.lineNo}
            className="flex flex-wrap gap-x-2 text-text-tertiary"
            data-testid={`${testId}-item-${l.lineNo}`}
          >
            <span className="text-text-primary">{l.description}</span>
            <span>
              {t('rfqs.quotes.break1')} <Data>{l.break1Price}</Data> (<Data>{l.break1Qty}</Data>)
            </span>
            <span>
              {t('rfqs.quotes.itemMoq')} <Data>{l.moq}</Data>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TieredQuoteLines;
