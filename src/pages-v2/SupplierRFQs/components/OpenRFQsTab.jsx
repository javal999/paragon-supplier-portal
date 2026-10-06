/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import { Inbox } from 'lucide-react';
import RFQCard from './RFQCard';
/** @import { RfqClarificationView, RfqEngagementView } from '@services/sourcing/rfqResponse' */
/** @import { OpenRFQ } from '../utils' */

/**
 * The "Open" tab: one `RFQCard` per RFQ still waiting on this supplier, or the
 * empty state when none is. `engagementByRfq` gives each card its own
 * engagement read; `onSubmitQuote` opens the quote panel.
 * @type {React.FC<{ rfqs: OpenRFQ[]; onSubmitQuote: (rfq: OpenRFQ) => void; supplierId: string; engagementByRfq: Map<string, RfqEngagementView>; clarifications: readonly RfqClarificationView[]; }>}
 */
const OpenRFQsTab = ({ rfqs, onSubmitQuote, supplierId, engagementByRfq, clarifications }) => {
  const { t } = useTranslation();
  if (rfqs.length === 0) {
    return (
      <div className="bg-bg-surface border border-border-subtle rounded-lg py-12 px-6 text-center">
        <div className="inline-flex w-12 h-12 rounded-full bg-bg-hover items-center justify-center mb-3">
          <Inbox size={20} className="text-text-tertiary" />
        </div>
        <div className="text-base font-semibold text-text-primary mb-1">
          {t('rfqs.open.emptyTitle')}
        </div>
        <div className="text-sm text-text-tertiary">{t('rfqs.open.emptyBody')}</div>
      </div>
    );
  }
  return (
    <div>
      {rfqs.map((rfq) => (
        <RFQCard
          key={rfq.id}
          rfq={rfq}
          onSubmitQuote={onSubmitQuote}
          supplierId={supplierId}
          engagement={engagementByRfq.get(rfq.id)}
          clarifications={clarifications}
        />
      ))}
    </div>
  );
};

export default OpenRFQsTab;
