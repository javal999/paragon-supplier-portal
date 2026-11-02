/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
import { Truck, Anchor, Clock, AlertTriangle } from 'lucide-react';
import KpiCard from '@components/ui-v2/KpiCard';
import { TODAY } from '../const';
import { formatDate, formatNumber } from '../utils';

/**
 * @typedef {object} ShipmentsKpisProps
 * @property {{ transit: number; dock: number; delayed: number }} counts  The tab counts, by display state.
 * @property {number} arrivingToday  Shipments whose ETA is `TODAY`.
 * @property {TFunction} t
 */

/**
 * The four KPI tiles: in transit, at dock, delayed, arriving today. Moved out
 * of `BuyerShipments.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<ShipmentsKpisProps>}
 */
const ShipmentsKpis = ({ counts, arrivingToday, t }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
    <KpiCard
      term="shipInTransit"
      value={formatNumber(counts.transit)}
      icon={Anchor}
      subtitle={t('shipments.kpi.inTransit.subtitle')}
    />
    <KpiCard
      term="shipAtDock"
      value={<span className="text-warning-hover">{formatNumber(counts.dock)}</span>}
      icon={Truck}
      subtitle={t('shipments.kpi.atDock.subtitle')}
    />
    <KpiCard
      term="shipDelayed"
      value={<span className="text-danger">{formatNumber(counts.delayed)}</span>}
      icon={AlertTriangle}
      subtitle={t('shipments.kpi.delayed.subtitle')}
    />
    <KpiCard
      term="shipArrivingToday"
      value={formatNumber(arrivingToday)}
      icon={Clock}
      subtitle={formatDate(TODAY)}
    />
  </div>
);

export default ShipmentsKpis;
