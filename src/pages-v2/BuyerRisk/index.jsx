/** @import React from 'react' */
/** @import { TabKey } from './const' */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileSpreadsheet, BellRing } from 'lucide-react';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import LivenessPill from '@components/ui-v2/LivenessPill';
import IllustrativeRegion from '@components/ui-v2/IllustrativeRegion';
import BulkActionsBar from '@components/ui-v2/BulkActionsBar';
import SubTabs from '@components/ui-v2/SubTabs';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import EmptyState from '@components/ui-v2/EmptyState';
import { useToast } from '@hooks/useToast';
import { useRiskData } from './hooks/useRiskData';
import AlertBanner from './components/AlertBanner';
import RiskKpis from './components/RiskKpis';
import WorldMap from './components/WorldMap';
import RiskTabPanel from './components/RiskTabPanel';

// ────────────────────────────────────────────────────────────────────────────
// SEAM NOTE — /buyer/risk is a REAL-LATER capability (source of record).
//
// Everything this page renders — the KPI band, the alert banners, the risk map,
// and all five tab bodies (geopolitical scores/exposure/probability, supply
// exposure rows, the scenario model + its ARIA recommendation, compliance-risk
// records, commodity prices) — is AUTHORED FIXTURE DATA. It is not decoration
// and it is not a placeholder to be deleted: it is the ILLUSTRATIVE
// SPECIFICATION for supply-risk intelligence, the Stage-2 I3 capability (risk +
// compliance), which will derive these same figures from real spend, supplier,
// and commodity data once F1/F2/F3 land the sources.
//
// Registry status: capability `risk` is registered in the LivenessRegistry with a
// `null` backing (services/liveness/registry.js) → derives SIMULATED → every
// marker on this page is amber "Sample" and green is structurally unreachable.
// When the real derivation lands, `risk` flips through the two gates and the
// IllustrativeRegion frames below come off on their own — no edit here.
//
// Breadcrumb for the CP-2 harvest: treat this file's fixture shape
// (services/data/mock/fixtures/buyerRisk.js) as the I3 read-model sketch. This
// note is a source-of-record marker only — the contract package is CP-2, gated.
//
// Phase 5 page split (no behaviour change): this file keeps the page shell —
// the six reads (via `useRiskData`), the selected tab, the dismissed alerts and
// the header actions. Each section lives in `components/`.
// ────────────────────────────────────────────────────────────────────────────

/** @type {{ id: TabKey; labelKey: string }[]} */
const TAB_DEFS = [
  { id: 'geo', labelKey: 'risk.tab.geo' },
  { id: 'exposure', labelKey: 'risk.tab.exposure' },
  { id: 'scenario', labelKey: 'risk.tab.scenario' },
  { id: 'compliance', labelKey: 'risk.tab.compliance' },
  { id: 'commodity', labelKey: 'risk.tab.commodity' }
];

/** @type {React.FC} */
const BuyerRisk = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const RISK_CRUMB = [t('risk.crumb.intelligence'), t('risk.crumb.supplyRisk')];
  const TABS = TAB_DEFS.map((tb) => ({ id: tb.id, label: t(tb.labelKey) }));
  const {
    alerts,
    geoRisks,
    exposure,
    scenarios,
    compliance,
    commodities,
    queries,
    anyPending,
    anyError,
    allEmpty
  } = useRiskData();

  const [tab, setTab] = useState(/** @type {TabKey} */ ('geo'));
  const [dismissedAlerts, setDismissedAlerts] = useState(/** @type {string[]} */ ([]));

  const visibleAlerts = alerts.filter((a) => !dismissedAlerts.includes(a.id));

  if (anyPending) return <LoadingState breadcrumb={RISK_CRUMB} />;
  if (anyError)
    return (
      <ErrorState
        breadcrumb={RISK_CRUMB}
        error={queries.find((q) => q.isError)?.error}
        onRetry={() => queries.forEach((q) => q.refetch())}
      />
    );
  if (allEmpty)
    return (
      <EmptyState
        breadcrumb={RISK_CRUMB}
        title={t('risk.empty.title')}
        subtitle={t('risk.empty.subtitle')}
        message={t('risk.empty.message')}
      />
    );

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={RISK_CRUMB}
        title={t('risk.header.title')}
        subtitle={t('risk.header.subtitle')}
        actions={
          <BulkActionsBar
            actions={[
              {
                label: t('risk.action.exportReport'),
                icon: FileSpreadsheet,
                onClick: () =>
                  toast({
                    variant: 'info',
                    title: t('risk.toast.exportStarting')
                  })
              }
            ]}
            primary={{
              label: t('risk.action.configureAlerts'),
              icon: BellRing,
              onClick: () =>
                toast({
                  title: t('risk.toast.alertConfig.title'),
                  description: t('risk.toast.alertConfig.desc')
                })
            }}
          />
        }
      />

      <PageMetaLine className="-mt-6 mb-6 flex items-center gap-3">
        <span>{t('risk.meta.illustrative')}</span>
        {/* Honest-render: capability="risk" derives SIMULATED (null backing,
            registry.js) — the amber "Sample" marker. Green is structurally
            unreachable (two-gate guard); this replaces the hand-rolled LIVE/
            Real-time chrome that lied over static demo data (CP-0 · W2). */}
        <LivenessPill capability="risk" />
      </PageMetaLine>

      {visibleAlerts.length > 0 && (
        <IllustrativeRegion
          capability="risk"
          label={t('risk.illustrative.alerts')}
          className="mb-6"
        >
          {visibleAlerts.map((a) => (
            <AlertBanner
              key={a.id}
              alert={a}
              onDismiss={() => setDismissedAlerts((prev) => [...prev, a.id])}
            />
          ))}
        </IllustrativeRegion>
      )}

      <RiskKpis />

      <IllustrativeRegion capability="risk" label={t('risk.illustrative.map')} className="mb-6">
        <WorldMap />
      </IllustrativeRegion>

      <SubTabs options={TABS} value={tab} onChange={setTab} className="mb-5" />

      <RiskTabPanel
        tab={tab}
        geoRisks={geoRisks}
        exposure={exposure}
        scenarios={scenarios}
        compliance={compliance}
        commodities={commodities}
      />

      {/* Replaces the former "Last updated <new Date()>" footer — a manufactured
          freshness stamp over data that never changes. The honest footer names
          the real-later capability instead of inventing a refresh time. */}
      <PageMetaLine className="mt-6">{t('risk.meta.futureCapability')}</PageMetaLine>
    </AppShellV2>
  );
};

export default BuyerRisk;
