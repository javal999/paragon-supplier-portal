/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { useRfqBoard } from '../hooks/useRfqBoard' */
import { FileText, Clock, CheckCircle2, Award } from 'lucide-react';
import KpiCard from '@components/ui-v2/KpiCard';

/**
 * The four KPI cards above the board: active RFQs, responses due this week,
 * ready to award, awarded in the last 90 days. Moved out of
 * `BuyerSourcing.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<{ kpis: ReturnType<typeof useRfqBoard>['kpis']; t: TFunction }>}
 */
const SourcingKpis = ({ kpis, t }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
    <KpiCard
      eyebrow={t('sourcing.kpi.active.eyebrow')}
      value={kpis.active.toString()}
      subtitle={t('sourcing.kpi.active.subtitle')}
      icon={FileText}
    />
    <KpiCard
      eyebrow={t('sourcing.kpi.awaiting.eyebrow')}
      value={kpis.awaiting.toString()}
      subtitle={t('sourcing.kpi.awaiting.subtitle')}
      icon={Clock}
    />
    <KpiCard
      eyebrow={t('sourcing.kpi.ready.eyebrow')}
      value={kpis.readyToAward.toString()}
      subtitle={t('sourcing.kpi.ready.subtitle')}
      icon={CheckCircle2}
    />
    <KpiCard
      eyebrow={t('sourcing.kpi.awarded.eyebrow')}
      value={kpis.awardedQuarter.toString()}
      subtitle={t('sourcing.kpi.awarded.subtitle')}
      icon={Award}
    />
  </div>
);

export default SourcingKpis;
