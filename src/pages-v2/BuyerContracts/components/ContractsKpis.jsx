/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { useContractPortfolio } from '../hooks/useContractPortfolio' */
import { FileText, ScrollText, AlertTriangle, Wallet } from 'lucide-react';
import KpiCard from '@components/ui-v2/KpiCard';
import { formatIDR } from '../utils';

/**
 * @typedef {object} ContractsKpisProps
 * @property {ReturnType<typeof useContractPortfolio>['kpis']} kpis Active count, expiring
 *   count and the active portfolio's total value.
 * @property {number} overdueObligations Obligations whose computed display state is Overdue.
 * @property {TFunction} t
 */

/**
 * The four KPI cards above the contract list: active contracts, expiring
 * soon, overdue obligations, active portfolio value. Moved out of
 * `BuyerContracts.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<ContractsKpisProps>}
 */
const ContractsKpis = ({ kpis, overdueObligations, t }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
    <KpiCard
      eyebrow={t('contracts.kpi.active.eyebrow')}
      value={kpis.active.toString()}
      subtitle={t('contracts.kpi.active.subtitle')}
      icon={ScrollText}
    />
    <KpiCard
      eyebrow={t('contracts.kpi.expiring.eyebrow')}
      value={kpis.expiringSoon.toString()}
      subtitle={t('contracts.kpi.expiring.subtitle')}
      icon={AlertTriangle}
    />
    <KpiCard
      eyebrow={t('contracts.kpi.overdue.eyebrow')}
      value={overdueObligations.toString()}
      subtitle={t('contracts.kpi.overdue.subtitle')}
      icon={FileText}
    />
    <KpiCard
      eyebrow={t('contracts.kpi.value.eyebrow')}
      value={formatIDR(kpis.totalValue)}
      subtitle={t('contracts.kpi.value.subtitle')}
      icon={Wallet}
    />
  </div>
);

export default ContractsKpis;
