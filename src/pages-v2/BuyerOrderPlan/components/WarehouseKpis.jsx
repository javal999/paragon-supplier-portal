/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import KpiCard from '@components/ui-v2/KpiCard';
import { formatIDR, formatNumber } from '@lib/format';
/** @import { WarehousePlanView } from '@services/data/types' */
import { pct } from '../utils';

/**
 * The four summary tiles for the selected warehouse: orders, peak fill,
 * rented pallet-weeks and rent cost, each under this plan with the interim
 * figure (or the placeholder-rate note) beneath.
 * @type {React.FC<{ w: WarehousePlanView; peak: number }>}
 */
const WarehouseKpis = ({ w, peak }) => {
  const { t } = useTranslation();
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6"
      data-testid="op-kpis"
    >
      <KpiCard
        eyebrow={t('op.kpi.orders')}
        value={<span data-testid="op-kpi-orders">{w.after.orders}</span>}
        subtitle={
          <span className="text-text-tertiary">
            {t('op.kpi.orders.sub', { count: w.before.orders })}
          </span>
        }
      />
      <KpiCard
        term="peakFill"
        value={<span data-testid="op-kpi-peak">{pct(peak)}</span>}
        subtitle={<span className="text-text-tertiary">{t('op.kpi.peak.sub')}</span>}
      />
      <KpiCard
        term="rentedPalletWeeks"
        value={
          <span data-testid="op-kpi-rented">
            {formatNumber(Math.round(w.after.rentedPalletWeeks))}
          </span>
        }
        subtitle={
          <span className="text-text-tertiary">
            {t('op.kpi.rented.sub', {
              value: formatNumber(Math.round(w.before.rentedPalletWeeks))
            })}
          </span>
        }
      />
      <KpiCard
        term="rentCost"
        value={
          <span data-testid="op-kpi-rent-cost">
            {formatIDR(Math.round(w.after.rentIdr), { compact: true })}
          </span>
        }
        subtitle={<span className="text-warning-hover">{t('op.kpi.rentCost.sub')}</span>}
      />
    </div>
  );
};

export default WarehouseKpis;
