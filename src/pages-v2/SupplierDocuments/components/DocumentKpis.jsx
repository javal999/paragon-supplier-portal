/** @import React from 'react' */
import { AlertTriangle, CheckCircle2, Clock, Files, UploadCloud } from 'lucide-react';
import KpiCard from '@components/ui-v2/KpiCard';
import { useTranslation } from 'react-i18next';

/**
 * @typedef {object} DocumentKpisProps
 * @property {number} total  Every document the supplier holds.
 * @property {number} validCount  Documents the display classifier reads as valid.
 * @property {number} expiringCount  Documents the expiry projection reads as expiring.
 * @property {number} expiredCount  Documents the expiry projection reads as expired.
 * @property {number} awaitingCount  Documents whose STORED status is `Awaiting Upload`.
 */

/**
 * The five KPI tiles: total, valid, expiring, expired and needs-action. The
 * page computes every figure against its one clock read and passes the
 * numbers. Moved out of `SupplierDocuments.jsx` by the Phase 5 page split (no
 * behaviour change).
 * @type {React.FC<DocumentKpisProps>}
 */
const DocumentKpis = ({ total, validCount, expiringCount, expiredCount, awaitingCount }) => {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-5 mb-6">
      <KpiCard
        eyebrow={t('supplierDocuments.kpi.total.eyebrow')}
        value={total.toString()}
        subtitle={t('supplierDocuments.kpi.total.subtitle')}
        icon={Files}
      />
      <KpiCard
        eyebrow={t('supplierDocuments.kpi.valid.eyebrow')}
        value={validCount.toString()}
        subtitle={t('supplierDocuments.kpi.valid.subtitle')}
        icon={CheckCircle2}
      />
      <KpiCard
        eyebrow={t('supplierDocuments.kpi.expiring.eyebrow')}
        value={expiringCount.toString()}
        subtitle={
          <span className="text-warning-hover">{t('supplierDocuments.kpi.expiring.subtitle')}</span>
        }
        icon={Clock}
      />
      <KpiCard
        eyebrow={t('supplierDocuments.kpi.expired.eyebrow')}
        value={expiredCount.toString()}
        subtitle={
          <span className="text-danger">{t('supplierDocuments.kpi.expired.subtitle')}</span>
        }
        icon={AlertTriangle}
      />
      <KpiCard
        eyebrow={t('supplierDocuments.kpi.needsAction.eyebrow')}
        value={awaitingCount.toString()}
        subtitle={t('supplierDocuments.kpi.needsAction.subtitle')}
        icon={UploadCloud}
      />
    </div>
  );
};

export default DocumentKpis;
