/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
import { Clock, CheckCircle2, Wallet, Truck } from 'lucide-react';
import KpiCard from '@components/ui-v2/KpiCard';
import { fmtIDR } from '../utils';

/**
 * @typedef {object} OrdersKpisProps
 * @property {{ all: number; action: number; progress: number; completed: number }} counts  POs per tab group.
 * @property {number} totalValuePending  Value of every PO not yet delivered or closed.
 * @property {TFunction} t
 */

/**
 * The four KPI tiles: open orders (needing action), in progress, the value
 * still pending, and delivered. Moved out of `SupplierOrders.jsx` by the
 * Phase 5 page split (no behaviour change).
 * @type {React.FC<OrdersKpisProps>}
 */
const OrdersKpis = ({ counts, totalValuePending, t }) => (
  <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
    <KpiCard
      eyebrow={t('supplierOrders.kpi.openOrders.eyebrow')}
      value={counts.action.toString()}
      subtitle={
        counts.action > 0 ? (
          <span className="text-warning-hover">
            {t('supplierOrders.kpi.openOrders.needsAction')}
          </span>
        ) : (
          t('supplierOrders.kpi.openOrders.cleared')
        )
      }
      icon={Clock}
    />
    <KpiCard
      eyebrow={t('supplierOrders.kpi.inProgress.eyebrow')}
      value={counts.progress.toString()}
      subtitle={t('supplierOrders.kpi.inProgress.subtitle')}
      icon={Truck}
    />
    <KpiCard
      eyebrow={t('supplierOrders.kpi.totalValue.eyebrow')}
      value={fmtIDR(totalValuePending)}
      subtitle={t('supplierOrders.kpi.totalValue.subtitle')}
      icon={Wallet}
    />
    <KpiCard
      eyebrow={t('supplierOrders.kpi.delivered.eyebrow')}
      value={counts.completed.toString()}
      subtitle={<span className="text-success">{t('supplierOrders.kpi.delivered.subtitle')}</span>}
      icon={CheckCircle2}
    />
  </div>
);

export default OrdersKpis;
