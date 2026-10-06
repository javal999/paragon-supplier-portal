/** @import React from 'react' */
import { AlertTriangle, CheckCircle2, FileText, Send, Truck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import KpiCard from '@components/ui-v2/KpiCard';
/** @import { AsnStatus } from '@services/data/types' */
/** @import { StatusFilter } from '../const' */

/**
 * The five status KPI tiles. Each shows its count and, clicked, filters the
 * list to that status (clicking the active one clears it).
 * @type {React.FC<{ counts: Record<AsnStatus, number>; statusFilter: StatusFilter; onSelect: (s: AsnStatus) => void }>}
 */
const ShipmentsKpiRow = ({ counts, statusFilter, onSelect }) => {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
      <KpiCard
        eyebrow={t('supplierShipments.kpi.draft.eyebrow')}
        value={counts.Draft.toString()}
        icon={FileText}
        onClick={() => onSelect('Draft')}
        active={statusFilter === 'Draft'}
      />
      <KpiCard
        eyebrow={t('supplierShipments.kpi.submitted.eyebrow')}
        value={counts.Submitted.toString()}
        icon={Send}
        onClick={() => onSelect('Submitted')}
        active={statusFilter === 'Submitted'}
      />
      <KpiCard
        eyebrow={t('supplierShipments.kpi.inTransit.eyebrow')}
        value={counts['In Transit'].toString()}
        icon={Truck}
        onClick={() => onSelect('In Transit')}
        active={statusFilter === 'In Transit'}
      />
      <KpiCard
        eyebrow={t('supplierShipments.kpi.delivered.eyebrow')}
        value={counts.Delivered.toString()}
        icon={CheckCircle2}
        onClick={() => onSelect('Delivered')}
        active={statusFilter === 'Delivered'}
      />
      <KpiCard
        eyebrow={t('supplierShipments.kpi.discrepancy.eyebrow')}
        value={counts.Discrepancy.toString()}
        icon={AlertTriangle}
        onClick={() => onSelect('Discrepancy')}
        active={statusFilter === 'Discrepancy'}
      />
    </div>
  );
};

export default ShipmentsKpiRow;
