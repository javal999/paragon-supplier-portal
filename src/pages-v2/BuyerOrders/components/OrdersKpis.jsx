/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
import { ShoppingCart, Clock, Truck, AlertTriangle } from 'lucide-react';
import KpiCard from '@components/ui-v2/KpiCard';

/**
 * @typedef {object} OrdersKpisProps
 * @property {{ open: number; pendingConfirmation: number; inTransit: number; overdue: number }} kpis
 *   PO counts per KPI (computed by `useOrdersWorklist`).
 * @property {TFunction} t
 */

/**
 * The four KPI cards: open, pending confirmation, in transit, overdue. Moved
 * out of `BuyerOrders.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<OrdersKpisProps>}
 */
const OrdersKpis = ({ kpis, t }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
    <KpiCard
      term="poOpenTotal"
      value={kpis.open.toString()}
      subtitle={t('buyerOrders.kpi.open.subtitle')}
      icon={ShoppingCart}
    />
    <KpiCard
      term="poPendingConfirmation"
      value={kpis.pendingConfirmation.toString()}
      subtitle={t('buyerOrders.kpi.pending.subtitle')}
      icon={Clock}
    />
    <KpiCard
      term="poInTransit"
      value={kpis.inTransit.toString()}
      subtitle={t('buyerOrders.kpi.transit.subtitle')}
      icon={Truck}
    />
    <KpiCard
      term="poOverdue"
      value={kpis.overdue.toString()}
      subtitle={
        kpis.overdue > 0
          ? t('buyerOrders.kpi.overdue.subtitle.past')
          : t('buyerOrders.kpi.overdue.subtitle.onSchedule')
      }
      icon={AlertTriangle}
    />
  </div>
);

export default OrdersKpis;
