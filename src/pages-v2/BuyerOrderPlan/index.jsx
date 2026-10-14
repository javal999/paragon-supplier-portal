/** @import React from 'react' */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import FilterChipsBar from '@components/ui-v2/FilterChipsBar';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import DataHealthChip from '@components/forecast/DataHealthChip';
import PurposeHeader from '@components/forecast/PurposeHeader';
import CycleSteps from '@components/forecast/CycleSteps';
import SimulatedDataBanner from '@components/forecast/SimulatedDataBanner';
import AboutThisPage, { CollapsedSection } from '@components/forecast/AboutThisPage';
import { forecastCrumb, forecastTitle } from '@components/forecast/forecastPages';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { useOrderPlan, usePurchaseOrders } from '@services/query/hooks';
import { CALL_OFF_PO_STATES } from '@services/transitions/callOffRules';
/** @import { Recommendation } from '@services/engine/orderSizing' */
/** @import { WarehouseKind } from '@services/engine/types' */
/** @import { RecRow } from './utils' */
import { sdcClock } from '@services/sdc/clock';
import { isLive } from '@services/liveness';
import { whyId } from './utils';
import { useDraftCallOff } from './hooks/useDraftCallOff';
import FillChart from './components/FillChart';
import FillTable from './components/FillTable';
import PlanAsOf from './components/PlanAsOf';
import WarehouseFacts from './components/WarehouseFacts';
import WarehouseKpis from './components/WarehouseKpis';
import RecommendationsSection from './components/RecommendationsSection';
import ShortfallNotice from './components/ShortfallNotice';
import BelowDemandSection from './components/BelowDemandSection';
import CostRatesSection from './components/CostRatesSection';
import DefinitionsSection from './components/DefinitionsSection';

// ─────────────────────────────────────────────────────────────────────────────
// ORDER PLAN — REQ-E14-05, the Material Planner's view.
//
// A page of its own rather than a column on Material requirement: that page is
// one material's netting, week by week; this one is a WAREHOUSE's plan — every
// material sharing the space, the projected fill against owned capacity and the
// 80% standard, the rented space it costs, and why each order has its size.
// The two agree by construction: Material requirement nets on these orders.
//
// Per warehouse (ENG-D7: packaging and raw material are separate): the fill
// per week under this plan, under the interim round-up it replaces, and the
// lowest any plan could reach; rented pallets and their cost at the
// PLACEHOLDER rate (ENG-D6), labelled as such; each recommendation with the
// constraint that bound it and what it saved (BR-04), last week's plan for the
// same week (BR-03) and the method that sized it (BR-02 fallback marked).
//
// BR-05: a recommendation becomes a call-off only by the planner's act. The act
// here is the EXISTING draft verb on the supplier's open umbrella line
// (`orderPlanRelease.js`); release, with the umbrella-balance check, stays on
// the Call-offs page. A seat without `calloff:plan` sees who acts instead.
// The draft carries `origin: 'engine'`; while the engine dataset is not live the
// release verb refuses it (X-03, owner decision 2026-09-23), and this page says
// so beside the button rather than letting the planner find out on release.
//
// Edge case (BL-117): a week where no plan fits even with the most rented space
// the administrator allows is counted here, with a link to Make warehouse room,
// where the planner's decision for it is recorded (FUX-D3, F-10).
//
// FUX2 B3 (F-07, F-17): each recommended order opens a "Why this quantity"
// panel (`components/forecast/WhyQuantityPanel.jsx`) with its material's
// Material requirement and Safety stock figures and its sizing, so the planner
// sees why without leaving the page. The 2 full pages stay linked above.
//
// Every figure is computed by the forecast engine at read time on its
// SYNTHETIC dataset (the `engineDataset` pill, X-03).
//
// FOLDER (frontend-standard Phase 5, PAGE-SPLIT-GUIDE): this file holds the
// page's queries, its state and the section order; each section is a file in
// `components/`, the draft act is `hooks/useDraftCallOff.js`, and the pure
// helpers and the 80% standard are `utils.js` / `const.js`.
// ─────────────────────────────────────────────────────────────────────────────

/** @type {React.FC} */
const BuyerOrderPlan = () => {
  const { t } = useTranslation();
  const query = useOrderPlan();
  const posQuery = usePurchaseOrders({ status: [...CALL_OFF_PO_STATES] });
  const planAvailability = useVerbAvailability('calloff:plan');
  const [kind, setKind] = useState(/** @type {WarehouseKind} */ ('packaging'));
  // FUX2 B3 — the one recommendation whose "Why this quantity" panel is open.
  const [whyOpen, setWhyOpen] = useState(/** @type {string | null} */ (null));
  const crumb = forecastCrumb(t, 'whatToOrder');
  const run = query.data ?? null;
  const today = sdcClock.now().slice(0, 10);
  // X-03 — the registry's own answer, read at render; the verb reads it again at release.
  const releaseWithheld = !isLive('engineDataset');
  const { drafted, pending, createDraft } = useDraftCallOff(today, releaseWithheld);

  const w = run?.warehouses.find((x) => x.kind === kind) ?? run?.warehouses[0] ?? null;
  /** @type {RecRow[]} */
  const rows = useMemo(
    () =>
      (w?.materials ?? [])
        .flatMap((m) => m.recommendations.map((rec) => ({ rec, material: m })))
        .sort(
          (a, b) =>
            a.rec.weekStart.localeCompare(b.rec.weekStart) ||
            a.rec.materialCode.localeCompare(b.rec.materialCode)
        ),
    [w]
  );

  if (query.isPending || posQuery.isPending) return <LoadingState breadcrumb={crumb} />;
  if (query.isError || posQuery.isError)
    return (
      <ErrorState
        breadcrumb={crumb}
        error={query.error ?? posQuery.error}
        onRetry={() => {
          void query.refetch();
          void posQuery.refetch();
        }}
      />
    );

  const pos = posQuery.data?.items ?? [];
  /** @type {{ id: WarehouseKind; label: string }[]} */
  const kinds = (run?.warehouses ?? []).map((x) => ({
    id: x.kind,
    label: t(`op.warehouse.${x.kind}`)
  }));
  const peak = w ? Math.max(...w.weeks.map((wk) => wk.fill ?? 0)) : 0;
  /** @param {Recommendation} r */
  const closeWhy = (r) => {
    setWhyOpen(null);
    // Focus goes back to the control that opened the panel.
    requestAnimationFrame(() => document.getElementById(`${whyId(r)}-toggle`)?.focus());
  };

  const costs = run?.costs;

  return (
    <AppShellV2>
      <PageHeader breadcrumb={crumb} title={forecastTitle(t, 'whatToOrder')} />
      <PurposeHeader page="whatToOrder" />
      <CycleSteps current="whatToOrder" />
      <SimulatedDataBanner capability="engineDataset" />
      <PlanAsOf run={run} />
      <DataHealthChip step="E14-05" className="mb-3" />

      <div className="mb-4">
        <FilterChipsBar options={kinds} value={w?.kind ?? kind} onChange={setKind} />
      </div>

      {w && (
        <>
          <WarehouseFacts w={w} />
          <WarehouseKpis w={w} peak={peak} />
          <RecommendationsSection
            rows={rows}
            pos={pos}
            whyOpen={whyOpen}
            onOpenWhy={setWhyOpen}
            onCloseWhy={closeWhy}
            drafted={drafted}
            planAvailability={planAvailability}
            pending={pending}
            releaseWithheld={releaseWithheld}
            onDraft={createDraft}
          />

          {/* FUX-D3 (F-10): the decision for these weeks is made and saved on Make warehouse room. */}
          {w.shortfallWeeks.length > 0 && <ShortfallNotice count={w.shortfallWeeks.length} />}

          <CollapsedSection
            title={t('op.fill.title')}
            testId="op-fill"
            className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-6"
          >
            <p className="text-xs text-text-secondary mt-3 mb-1" data-testid="op-fill-basis">
              {t('op.fill.basis')}
            </p>
            <p className="text-xs text-text-tertiary mb-3">{t('op.fill.intro')}</p>
            <FillChart w={w} />
            <FillTable w={w} />
          </CollapsedSection>
        </>
      )}

      {/* CAP-12 — the hub's own gaps, separate from the engine's list above (brief §6). */}
      <BelowDemandSection today={today} />

      {costs && <CostRatesSection costs={costs} />}

      <DefinitionsSection />

      <AboutThisPage>
        <p>{t('op.subtitle')}</p>
        <p data-testid="op-synthetic-note">{t('op.synthetic')}</p>
      </AboutThisPage>
    </AppShellV2>
  );
};

export default BuyerOrderPlan;
