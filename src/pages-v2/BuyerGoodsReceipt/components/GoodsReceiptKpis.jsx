/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { useGoodsReceiptList } from '../hooks/useGoodsReceiptList' */
import { ClipboardCheck, AlertTriangle, CheckCircle2, TrendingDown } from 'lucide-react';
import KpiCard from '@components/ui-v2/KpiCard';
import { TODAY } from '../const';
import { formatDate, formatNumber } from '../utils';

/**
 * @typedef {object} GoodsReceiptKpisProps
 * @property {ReturnType<typeof useGoodsReceiptList>['counts']} counts Receipts per status tab.
 * @property {number} approvedToday Receipts approved on the declared present.
 * @property {number} rejectionRate Rejected share of received quantity over 30 days, in %.
 * @property {TFunction} t
 */

/**
 * The four KPI cards: pending inspection, quality hold, approved today and
 * the 30-day rejection rate. Moved out of `BuyerGoodsReceipt.jsx` by the
 * Phase 5 page split (no behaviour change).
 * @type {React.FC<GoodsReceiptKpisProps>}
 */
const GoodsReceiptKpis = ({ counts, approvedToday, rejectionRate, t }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
    <KpiCard
      term="grPendingInspection"
      value={formatNumber(counts.pending)}
      icon={ClipboardCheck}
      subtitle={t('goodsReceipt.kpi.pending.subtitle')}
    />
    <KpiCard
      term="grQualityHold"
      value={<span className="text-danger">{formatNumber(counts.hold)}</span>}
      icon={AlertTriangle}
      subtitle={t('goodsReceipt.kpi.hold.subtitle')}
    />
    <KpiCard
      term="grApprovedToday"
      value={formatNumber(approvedToday)}
      icon={CheckCircle2}
      subtitle={formatDate(TODAY)}
    />
    <KpiCard
      term="grRejectionRate"
      value={`${rejectionRate.toFixed(1)}%`}
      icon={TrendingDown}
      subtitle={t('goodsReceipt.kpi.rejectionRate.subtitle')}
    />
  </div>
);

export default GoodsReceiptKpis;
