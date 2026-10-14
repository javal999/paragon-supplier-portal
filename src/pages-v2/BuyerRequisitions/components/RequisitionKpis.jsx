/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { RequisitionCounts } from '../utils' */
import { AlertTriangle, CheckCircle2, Clock, FileText, ShoppingCart } from 'lucide-react';
import KpiCard from '@components/ui-v2/KpiCard';

/**
 * @typedef {object} RequisitionKpisProps
 * @property {RequisitionCounts} counts The per-status counts of the whole list.
 * @property {TFunction} t
 */

/**
 * The five KPI tiles: Draft, Pending approval, Approved, Sourcing event and PO
 * created, each the count of requisitions in that status. Moved out of
 * `BuyerRequisitions.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<RequisitionKpisProps>}
 */
const RequisitionKpis = ({ counts, t }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-5 mb-8">
    <KpiCard
      eyebrow={t('requisitions.kpi.draft.eyebrow')}
      value={counts.draft.toString()}
      subtitle={t('requisitions.kpi.draft.subtitle')}
      icon={FileText}
    />
    <KpiCard
      eyebrow={t('requisitions.kpi.pending.eyebrow')}
      value={counts.pending.toString()}
      subtitle={t('requisitions.kpi.pending.subtitle')}
      icon={Clock}
    />
    <KpiCard
      eyebrow={t('requisitions.kpi.approved.eyebrow')}
      value={counts.approved.toString()}
      subtitle={t('requisitions.kpi.approved.subtitle')}
      icon={CheckCircle2}
    />
    <KpiCard
      eyebrow={t('requisitions.kpi.sourcing.eyebrow')}
      value={counts.sourcing.toString()}
      subtitle={t('requisitions.kpi.sourcing.subtitle')}
      icon={AlertTriangle}
    />
    <KpiCard
      eyebrow={t('requisitions.kpi.po.eyebrow')}
      value={counts.po.toString()}
      subtitle={t('requisitions.kpi.po.subtitle')}
      icon={ShoppingCart}
    />
  </div>
);

export default RequisitionKpis;
