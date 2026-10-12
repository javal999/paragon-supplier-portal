/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import { AlertTriangle, AlertOctagon } from 'lucide-react';
import KpiCard from '@components/ui-v2/KpiCard';

/**
 * The page's four-card KPI band (risk events, exposed spend, single-source
 * categories, expiring certificates). Every value is illustrative demo data
 * and every card says so; no props.
 * @type {React.FC}
 */
const RiskKpis = () => {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
      {/* Values are illustrative demo data (derivation from the risk hooks is a
          later, separate batch — CP-0 W2 is honesty-only). Every card carries the
          shared illustrative marker, mirroring BuyerDashboard's honest KPI pattern. */}
      <KpiCard
        eyebrow={t('risk.kpi.events.eyebrow')}
        value="9"
        subtitle={<span className="text-text-tertiary">{t('risk.kpi.illustrative')}</span>}
        icon={AlertOctagon}
      />
      <KpiCard
        eyebrow={t('risk.kpi.exposed.eyebrow')}
        value="$6.1M"
        subtitle={<span className="text-text-tertiary">{t('risk.kpi.illustrative')}</span>}
        icon={AlertTriangle}
      />
      <KpiCard
        eyebrow={t('risk.kpi.singleSource.eyebrow')}
        value="3"
        subtitle={<span className="text-text-tertiary">{t('risk.kpi.illustrative')}</span>}
        icon={AlertOctagon}
      />
      <KpiCard
        eyebrow={t('risk.kpi.expiring.eyebrow')}
        value="2"
        subtitle={<span className="text-text-tertiary">{t('risk.kpi.illustrative')}</span>}
        icon={AlertTriangle}
      />
    </div>
  );
};

export default RiskKpis;
