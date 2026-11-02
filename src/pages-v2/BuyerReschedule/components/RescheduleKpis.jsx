/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import KpiCard from '@components/ui-v2/KpiCard';
import { formatIDR } from '@lib/format';
/** @import { WarehouseRescheduleView } from '@services/data/types' */
import { pw } from '../utils';

/**
 * The four KPI tiles for the warehouse shown: pallet-weeks over capacity, the
 * relief the proposals offer (and how many need no supplier agreement), the
 * rent they save against their change penalty, and what stock on hand alone
 * overfills.
 * @type {React.FC<{ w: WarehouseRescheduleView; freeCount: number }>}
 */
const RescheduleKpis = ({ w, freeCount }) => {
  const { t } = useTranslation();
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6"
      data-testid="rs-kpis"
    >
      <KpiCard
        term="rsOver"
        value={<span data-testid="rs-kpi-over">{pw(w.totals.overPalletWeeks)}</span>}
        subtitle={<span className="text-text-tertiary">{t('rs.kpi.over.sub')}</span>}
      />
      <KpiCard
        term="rsRelief"
        value={<span data-testid="rs-kpi-relief">{pw(w.totals.reliefPalletWeeks)}</span>}
        subtitle={
          <span className="text-text-tertiary">
            {t('rs.kpi.relief.sub', { count: w.totals.reliefProposals, free: freeCount })}
          </span>
        }
      />
      <KpiCard
        term="rsSaving"
        value={
          <span data-testid="rs-kpi-saving">
            {formatIDR(Math.round(w.totals.rentSavedIdr), { compact: true })}
          </span>
        }
        subtitle={
          <span className="text-warning-hover">
            {t('rs.kpi.saving.sub', {
              penalty: formatIDR(Math.round(w.totals.changePenaltyIdr), { compact: true })
            })}
          </span>
        }
      />
      <KpiCard
        term="rsOnHandLoad"
        value={<span data-testid="rs-kpi-onhand">{pw(w.totals.onHandOverPalletWeeks)}</span>}
        subtitle={
          <span className="text-text-tertiary">
            {t('rs.kpi.onHand.sub', { value: pw(w.totals.overPalletWeeksAfterRelief) })}
          </span>
        }
      />
    </div>
  );
};

export default RescheduleKpis;
