/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
import { ClipboardList, Truck, CreditCard, Target } from 'lucide-react';
import ProvenanceMarker from '@components/ui-v2/ProvenanceMarker';
import KpiCard from '@components/ui-v2/KpiCard';

/**
 * @typedef {object} KpiStripProps
 * @property {number} openOrders  POs not yet Delivered or Closed.
 * @property {number} pendingASNs  Confirmed POs awaiting an ASN.
 * @property {number} unpaidInvoices  Invoices not yet paid out.
 * @property {boolean} hasOtif  Whether the supplier has a measured OTIF at all.
 * @property {number | undefined} otif  The measured OTIF percentage.
 * @property {TFunction} t
 */

/**
 * The provenance line and the four KPI tiles (open orders, pending ASNs,
 * unpaid invoices, OTIF). Moved out of `SupplierDashboard.jsx` by the Phase 5
 * page split (no behaviour change).
 * @type {React.FC<KpiStripProps>}
 */
const KpiStrip = ({ openOrders, pendingASNs, unpaidInvoices, hasOtif, otif, t }) => (
  <>
    {/* Three counted-from-fixture tiles beside one measured one, so the marker says
        which tile it is not speaking for rather than claiming the row. */}
    <div
      className="mb-2 flex flex-wrap items-center gap-3"
      data-testid="supplier-dashboard-kpi-provenance"
    >
      <ProvenanceMarker capability="dashboard" />
      <span className="text-meta text-text-tertiary">
        {t('supplierDashboard.kpi.otif.eyebrow')}: {t('perf.calculated')}
      </span>
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 mb-6">
      <KpiCard
        eyebrow={t('supplierDashboard.kpi.openOrders.eyebrow')}
        value={openOrders.toString()}
        subtitle={t('supplierDashboard.kpi.openOrders.subtitle')}
        icon={ClipboardList}
      />
      <KpiCard
        eyebrow={t('supplierDashboard.kpi.pendingAsns.eyebrow')}
        value={pendingASNs.toString()}
        subtitle={t('supplierDashboard.kpi.pendingAsns.subtitle')}
        icon={Truck}
      />
      <KpiCard
        eyebrow={t('supplierDashboard.kpi.unpaidInvoices.eyebrow')}
        value={unpaidInvoices.toString()}
        subtitle={
          unpaidInvoices > 0 ? (
            <span className="text-danger">{t('supplierDashboard.kpi.unpaidInvoices.pending')}</span>
          ) : (
            t('supplierDashboard.kpi.unpaidInvoices.settled')
          )
        }
        icon={CreditCard}
      />
      <KpiCard
        eyebrow={t('supplierDashboard.kpi.otif.eyebrow')}
        value={hasOtif ? `${otif}%` : t('rfx.noHistory')}
        subtitle={t('supplierDashboard.kpi.otif.subtitle')}
        icon={Target}
      />
    </div>
  </>
);

export default KpiStrip;
