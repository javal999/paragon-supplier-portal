/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import { Inbox, Send, Trophy } from 'lucide-react';
import KpiCard from '@components/ui-v2/KpiCard';

/**
 * @typedef {object} RfqKpiRowProps
 * @property {number} openCount -  RFQs still waiting on this supplier.
 * @property {number} submittedCount -  This supplier's quotation versions.
 * @property {number} awaitingCount -  Quotations submitted and not yet decided (Submitted / Under Review).
 */

/**
 * The three KPI tiles under the header: open RFQs, quotes submitted, and quotes
 * awaiting an award decision. Every figure is derived by the workspace from the
 * supplier's own reads; none is a literal.
 * @type {React.FC<RfqKpiRowProps>}
 */
const RfqKpiRow = ({ openCount, submittedCount, awaitingCount }) => {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
      <KpiCard
        eyebrow={t('rfqs.kpi.open.eyebrow')}
        value={openCount.toString()}
        subtitle={t('rfqs.kpi.open.subtitle')}
        icon={Inbox}
      />
      <KpiCard
        eyebrow={t('rfqs.kpi.submitted.eyebrow')}
        value={submittedCount.toString()}
        subtitle={t('rfqs.kpi.submitted.subtitle')}
        icon={Send}
      />
      <KpiCard
        eyebrow={t('rfqs.kpi.award.eyebrow')}
        value={awaitingCount.toString()}
        subtitle={<span className="text-warning-hover">{t('rfqs.kpi.award.subtitle')}</span>}
        icon={Trophy}
      />
    </div>
  );
};

export default RfqKpiRow;
