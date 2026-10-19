/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { useRfqBoard } from '../hooks/useRfqBoard' */
/** @import { KpiFilter } from '../const' */
import { FileText, Clock, CheckCircle2, Award } from 'lucide-react';
import KpiCard from '@components/ui-v2/KpiCard';

/**
 * The four KPI cards above the board: active RFQs, responses due this week,
 * ready to award, awarded in the last 90 days. RFx UX 1D (B-04): each card is
 * a filter — clicked, the table shows the RFQs it counts (`kpi` is the one
 * pressed, `onKpi` toggles it).
 * @type {React.FC<{
 *   kpis: ReturnType<typeof useRfqBoard>['kpis'];
 *   kpi: KpiFilter | null;
 *   onKpi: (k: KpiFilter) => void;
 *   t: TFunction;
 * }>}
 */
const SourcingKpis = ({ kpis, kpi, onKpi, t }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
    <KpiCard
      eyebrow={t('sourcing.kpi.active.eyebrow')}
      value={kpis.active.toString()}
      subtitle={t('sourcing.kpi.active.subtitle')}
      icon={FileText}
      active={kpi === 'active'}
      onClick={() => onKpi('active')}
    />
    <KpiCard
      eyebrow={t('sourcing.kpi.awaiting.eyebrow')}
      value={kpis.awaiting.toString()}
      subtitle={t('sourcing.kpi.awaiting.subtitle')}
      icon={Clock}
      active={kpi === 'awaiting'}
      onClick={() => onKpi('awaiting')}
    />
    <KpiCard
      eyebrow={t('sourcing.kpi.ready.eyebrow')}
      value={kpis.readyToAward.toString()}
      subtitle={t('sourcing.kpi.ready.subtitle')}
      icon={CheckCircle2}
      active={kpi === 'ready'}
      onClick={() => onKpi('ready')}
    />
    <KpiCard
      eyebrow={t('sourcing.kpi.awarded.eyebrow')}
      value={kpis.awardedQuarter.toString()}
      subtitle={t('sourcing.kpi.awarded.subtitle')}
      icon={Award}
      active={kpi === 'awarded'}
      onClick={() => onKpi('awarded')}
    />
  </div>
);

export default SourcingKpis;
