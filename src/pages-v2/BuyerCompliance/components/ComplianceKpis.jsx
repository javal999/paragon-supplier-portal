/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
import { AlertTriangle, CheckCircle2, Clock, FileQuestion, RefreshCw } from 'lucide-react';
import KpiCard from '@components/ui-v2/KpiCard';

/**
 * @typedef {object} ComplianceKpisProps
 * @property {{ expired: number; expiring: number; missing: number; valid: number; underReview: number }} counts
 *   Registry rows per computed display status (computed by the page).
 * @property {TFunction} t
 */

/**
 * The five KPI cards: expired, expiring, missing, under review, valid. Moved
 * out of `BuyerCompliance.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<ComplianceKpisProps>}
 */
const ComplianceKpis = ({ counts, t }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-5 mb-6">
    <KpiCard
      eyebrow={t('compliance.kpi.expired.eyebrow')}
      value={counts.expired.toString()}
      subtitle={<span className="text-danger">{t('compliance.kpi.expired.subtitle')}</span>}
      icon={AlertTriangle}
    />
    <KpiCard
      eyebrow={t('compliance.kpi.expiring.eyebrow')}
      value={counts.expiring.toString()}
      subtitle={<span className="text-warning-hover">{t('compliance.kpi.expiring.subtitle')}</span>}
      icon={Clock}
    />
    <KpiCard
      eyebrow={t('compliance.kpi.missing.eyebrow')}
      value={counts.missing.toString()}
      subtitle={<span className="text-danger">{t('compliance.kpi.missing.subtitle')}</span>}
      icon={FileQuestion}
    />
    {/* HALAL-UNDERREVIEW: Under Review now has its own visible KPI home —
        first-class, not a silent second-class state. */}
    <KpiCard
      eyebrow={t('compliance.kpi.underReview.eyebrow')}
      value={counts.underReview.toString()}
      subtitle={t('compliance.kpi.underReview.subtitle')}
      icon={RefreshCw}
    />
    <KpiCard
      eyebrow={t('compliance.kpi.valid.eyebrow')}
      value={counts.valid.toString()}
      subtitle={t('compliance.kpi.valid.subtitle')}
      icon={CheckCircle2}
    />
  </div>
);

export default ComplianceKpis;
