/** @import React from 'react' */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import Tabs from '@components/ui-v2/Tabs';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import SampleDataBadge from '@components/ui-v2/SampleDataBadge';
import Data from '@components/ui-v2/Data';
import Button from '@components/ui-v2/Button';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import { formatDate } from '@lib/format';
import { usePageTab } from '@hooks/usePageTab';
import CycleSteps from '@components/forecast/CycleSteps';
import DataHealthChip from '@components/forecast/DataHealthChip';
import PurposeHeader from '@components/forecast/PurposeHeader';
import BasisLine from '@components/forecast/BasisLine';
import { forecastCrumb } from '@components/forecast/forecastPages';
import { STEP_HEALTH } from '@components/forecast/cycleCounts';
import { useDemandAnticipation } from '@services/query/hooks';
/** @import { DemandAnticipationRow } from '@services/transitions/demandAnticipationRules' */
/** @import { EngineStep } from '@services/engine/dataHealth' */
import { inputClass, inventoryNow, labelClass } from '../inventory/inventoryDisplay';
import AnticipationGrid from './components/AnticipationGrid';
import PublishPanel from './components/PublishPanel';
import LtpInputsPanel from './components/LtpInputsPanel';
import { OutOfDateNote } from './components/DaCauses';
import ConsumptionPanel from './components/ConsumptionPanel';
import PlanCheck from './components/PlanCheck';
import { latestPublication, publishPreview, sharePct, weekDates, weekLabel } from './display';

// ─────────────────────────────────────────────────────────────────────────────
// DEMAND ANTICIPATION — CAP-10 (BL-179), reworked by DRC-2 (BL-188) and DRC-4
// (BL-190), SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10. The Material Planner's
// page, under Weekly plan.
//
// One card per supplier × material, filtered by supplier and material (in the
// page address): the plan vs execution check (DRC-4) and the carry-over of the
// planning week above a WeekGrid. The horizon is the pair's lead time, rolling
// weekly (DRC-2 BR-01). Publish records the current planning week's figures,
// and the supplier agreements to carry a remainder outside the horizon [Owner
// A8]; a published week shows "Would be" beside it, today's recomputation, read
// only. The sample data opens with one seeded publication, and the page says
// it is a sample publication rather than naming an act.
//
// Every input is sample data (the sample LTP and SAP stock fixtures), so the
// Sample data marker always shows. The figure is never shown as "DA": that
// abbreviation labels Delivery Agreements (CAP-D10).
//
// P-12 (IA-B06) — TABS. The header and the as-of line with the Sample data
// badge stay above the tabs; below them "This week" (the publication, the
// filters and the per-material cards), then "Record consumption" (CAP-11).
// The publication history stays its own page, linked beside the tabs and
// from the publication. The tab is `?tab=thisWeek|consumption`; the
// `supplier=` / `material=` filters live on This week, which is the default.
//
// FSR-D3 (BL-251, U-11) — step 6 of the weekly step strip: the "Decision here
// / Uses / Next" purpose header and the Data health chip, as on the other
// steps, placed where Publish to suppliers puts them. The chip names the
// engine step whose feeds match this page's inputs (`STEP_HEALTH`). The
// Sample data marker stays: unlike the engine pages, what is published here
// does reach suppliers inside the hub.
// ─────────────────────────────────────────────────────────────────────────────

/** @param {DemandAnticipationRow} r */
const keyOf = (r) => `${r.supplierId}-${r.materialCode}`;

/** FSR-D3 (BL-251) — the engine step this page's Data health chip names, from the one registry. */
const DA_HEALTH_STEP = /** @type {EngineStep} */ (STEP_HEALTH.demandAnticipation);

/** P-12 — the page's tabs, in order; the first opens by default. */
// i18n-defer: tab identifiers, not copy — each renders through t(`demandAnt.tab.${id}`)
export const DEMAND_ANTICIPATION_TABS = /** @type {const} */ (['thisWeek', 'consumption']);

/**
 * IA review item 1 — a card's weeks grid, behind a toggle under its plan check.
 * @type {React.FC<{ row: DemandAnticipationRow; rowKey: string; open: boolean; onToggle: (open: boolean) => void; currentWeek: string }>}
 */
const CardWeeks = ({ row, rowKey, open, onToggle, currentWeek }) => {
  const { t } = useTranslation();
  return (
    <>
      <div className="px-4 pb-3">
        <Button
          variant="secondary"
          aria-expanded={open}
          aria-controls={`dant-weeks-${rowKey}`}
          onClick={() => onToggle(!open)}
          data-testid={`dant-weeks-toggle-${rowKey}`}
        >
          {open ? t('demandAnt.card.hideWeeks') : t('demandAnt.card.showWeeks')}
        </Button>
      </div>
      {open ? (
        <div className="border-t border-border-subtle" id={`dant-weeks-${rowKey}`}>
          <AnticipationGrid row={row} rowKey={rowKey} currentWeek={currentWeek} />
        </div>
      ) : null}
    </>
  );
};

/** @type {React.FC} */
const BuyerDemandAnticipation = () => {
  const { t } = useTranslation();
  const query = useDemandAnticipation();
  const [params, setParams] = useSearchParams();
  const nowIso = inventoryNow();
  const crumb = forecastCrumb(t, 'demandAnticipation');
  const rows = useMemo(() => query.data?.items ?? [], [query.data]);
  // BL-267 — one entry per material (the inputs are per material, not per supplier).
  const ltpMaterials = useMemo(
    () =>
      [...new Map(rows.map((r) => [r.materialCode, r])).values()].map((r) => ({
        materialCode: r.materialCode,
        materialLabel: r.materialLabel,
        ltpInputs:
          /** @type {{ ltpInputs?: import('@services/data/mock/demandAnticipationReadModel').RowLtpInputs }} */ (
            r
          ).ltpInputs
      })),
    [rows]
  );
  const supplier = params.get('supplier');
  const material = params.get('material');
  const { tab, select } = usePageTab(DEMAND_ANTICIPATION_TABS);
  // IA review item 1 — each card opens on its plan check; its weeks grid
  // (about 700 px) unfolds on request. A card shown alone opens unfolded. The
  // map holds only the cards the planner toggled.
  const [weeksOpen, setWeeksOpen] = useState(
    /** @type {ReadonlyMap<string, boolean>} */ (new Map())
  );

  if (query.isPending) return <LoadingState breadcrumb={crumb} />;
  if (query.isError)
    return <ErrorState breadcrumb={crumb} error={query.error} onRetry={() => query.refetch()} />;

  const { planningWeek, published, changed } = publishPreview(rows, nowIso);
  const latest = latestPublication(rows);
  const supplierOptions = [
    ...new Map(rows.map((r) => [r.supplierId, r.supplierName])).entries()
  ].sort((a, b) => a[1].localeCompare(b[1]));
  const materialOptions = [
    ...new Set(
      rows.filter((r) => !supplier || r.supplierId === supplier).map((r) => r.materialCode)
    )
  ].sort();
  const shown = rows.filter(
    (r) => (!supplier || r.supplierId === supplier) && (!material || r.materialCode === material)
  );
  const filtered = supplier !== null || material !== null;
  /**
   * @param {'supplier' | 'material'} name
   * @param {string} value
   */
  const setFilter = (name, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    if (name === 'supplier') next.delete('material');
    setParams(next, { replace: true });
  };

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={crumb}
        title={t('hub.nav.pti.demandAnticipation')}
        subtitle={t('demandAnt.subtitle')}
      />
      <PurposeHeader page="demandAnticipation" />
      <CycleSteps current="demandAnticipation" />
      <PageMetaLine className="mb-2">
        {t('demandAnt.asOf')} <Data>{formatDate(nowIso)}</Data>
        <SampleDataBadge className="ml-3 align-middle" />
      </PageMetaLine>
      {/* FSR-D3 (BL-251) — the chip the other steps carry; E14-03 reads the plan and stock feeds. */}
      <DataHealthChip step={DA_HEALTH_STEP} className="mb-4" />

      <div className="flex flex-wrap items-end justify-between gap-x-6 mb-4">
        <Tabs
          tabs={DEMAND_ANTICIPATION_TABS.map((id) => ({ id, label: t(`demandAnt.tab.${id}`) }))}
          active={tab}
          onChange={(id) => select(/** @type {(typeof DEMAND_ANTICIPATION_TABS)[number]} */ (id))}
          className="flex-1"
        />
        {/* P-12 — the history is its own page, linked beside the tabs. */}
        <Link
          to="/buyer/demand-anticipation-history"
          className="py-3 text-sm text-action-hover hover:underline"
          data-testid="dant-history-tab-link"
        >
          {t('daHist.openHistory')}
        </Link>
      </div>

      <div
        role="tabpanel"
        aria-label={t(`demandAnt.tab.${tab}`)}
        data-testid={`dant-tabpanel-${tab}`}
      >
        {tab === 'thisWeek' && (
          <>
            <section
              className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-4"
              data-testid="dant-publication"
            >
              <p className="text-sm text-text-primary mb-1" data-testid="dant-planning-week">
                <span className="text-text-secondary">{t('demandAnt.pub.label')}: </span>
                <Data>{weekLabel(planningWeek)}</Data>{' '}
                <span className="text-text-secondary">({weekDates([planningWeek])})</span>
                {' · '}
                <span data-testid="dant-publication-state">
                  {published
                    ? changed > 0
                      ? t('demandAnt.pub.publishedChanged', { count: changed })
                      : t('demandAnt.pub.publishedSame')
                    : t('demandAnt.pub.none')}
                </span>
              </p>
              {latest ? (
                <p
                  className="text-xs text-text-tertiary mb-3"
                  data-testid="dant-latest-publication"
                >
                  {latest.source === 'sampleSeed'
                    ? t('demandAnt.pub.sampleSeed', { date: formatDate(latest.publishedAt) })
                    : `${t('demandAnt.pub.published', { date: formatDate(latest.publishedAt) })} · ${t('demandAnt.pub.unattributed')}`}
                </p>
              ) : null}
              <p className="text-xs text-text-tertiary mb-3">
                {t('demandAnt.howItWorks')}{' '}
                {/* DRC-3 (BL-189) — every publication, with its stamp and carry origin. */}
                <Link
                  to="/buyer/demand-anticipation-history"
                  className="text-action-hover hover:underline"
                  data-testid="dant-history-link"
                >
                  {t('daHist.openHistory')}
                </Link>
              </p>
              <PublishPanel rows={rows} planningWeek={planningWeek} changed={changed} />
            </section>

            {/* BL-267 (PEX-5) — the LTP inputs: upload LTP A, Festive, B and the choice per material. */}
            <LtpInputsPanel materials={ltpMaterials} />

            <div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(2,minmax(0,16rem))_auto] items-end gap-3 mb-4"
              data-testid="dant-filters"
            >
              <div>
                <label htmlFor="dant-filter-supplier" className={labelClass}>
                  {t('demandAnt.filter.supplier')}
                </label>
                <select
                  id="dant-filter-supplier"
                  className={inputClass}
                  value={supplier ?? ''}
                  onChange={(e) => setFilter('supplier', e.target.value)}
                >
                  <option value="">{t('demandAnt.filter.all')}</option>
                  {supplierOptions.map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="dant-filter-material" className={labelClass}>
                  {t('demandAnt.filter.material')}
                </label>
                <select
                  id="dant-filter-material"
                  className={inputClass}
                  value={material ?? ''}
                  onChange={(e) => setFilter('material', e.target.value)}
                >
                  <option value="">{t('demandAnt.filter.all')}</option>
                  {materialOptions.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              {filtered ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    const next = new URLSearchParams(params);
                    next.delete('supplier');
                    next.delete('material');
                    setParams(next, { replace: true });
                  }}
                  data-testid="dant-filters-clear"
                >
                  {t('demandAnt.filter.clear')}
                </Button>
              ) : null}
            </div>

            {/* FSR-D1 (BL-237, C-01): every card's figures (LTP, SOH share, call-offs,
                OSIP ROP Order) are the hub sample, the plan of record. */}
            <BasisLine standing="planOfRecord" className="mb-1" />
            <p className="text-xs text-text-tertiary mb-3">{t('demandAnt.wouldBeHelp')}</p>

            <div className="space-y-3">
              {shown.map((r) => (
                <section
                  key={keyOf(r)}
                  data-testid={`dant-card-${keyOf(r)}`}
                  className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm"
                >
                  <header className="px-4 py-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-sm font-semibold text-text-primary">
                      {r.supplierName}
                    </span>
                    <Data className="text-sm">{r.materialCode}</Data>
                    <span className="text-sm text-text-secondary">{r.materialLabel}</span>
                    {r.share !== null ? (
                      <span
                        className="ml-auto text-xs text-text-tertiary"
                        data-testid={`dant-share-${keyOf(r)}`}
                      >
                        {t('demandAnt.card.share', { pct: sharePct(r.share) })}
                      </span>
                    ) : null}
                  </header>
                  {!r.stockOnRecord ? (
                    <p className="px-4 pb-2 text-xs text-warning-hover">
                      {t('demandAnt.card.noStock')}
                    </p>
                  ) : null}
                  {/* BL-268 (PEX-6 BR-01) — the published DA an input change moved, with the cause. */}
                  {
                    /** @type {{ outOfDate?: { causes: readonly import('@services/transitions/daCauseRules').DaCause[] } | null }} */ (
                      r
                    ).outOfDate ? (
                      <OutOfDateNote
                        causes={
                          /** @type {{ outOfDate: { causes: readonly import('@services/transitions/daCauseRules').DaCause[] } }} */ (
                            r
                          ).outOfDate.causes
                        }
                        testId={`dant-outofdate-${keyOf(r)}`}
                      />
                    ) : null
                  }
                  <PlanCheck row={r} rowKey={keyOf(r)} />
                  <CardWeeks
                    row={r}
                    rowKey={keyOf(r)}
                    open={weeksOpen.get(keyOf(r)) ?? shown.length === 1}
                    onToggle={(open) => setWeeksOpen((m) => new Map(m).set(keyOf(r), open))}
                    currentWeek={nowIso.slice(0, 10)}
                  />
                </section>
              ))}
              {shown.length === 0 ? (
                <div
                  className="bg-bg-surface border border-border-subtle rounded-lg py-10 px-6 text-center"
                  data-testid="dant-empty"
                >
                  <p className="text-base font-semibold text-text-primary mb-1">
                    {t('demandAnt.empty.title')}
                  </p>
                  <p className="text-sm text-text-tertiary">
                    {filtered ? t('demandAnt.empty.filtered') : t('demandAnt.empty.body')}
                  </p>
                </div>
              ) : null}
            </div>
          </>
        )}

        {tab === 'consumption' && (
          <>
            {/* CAP-11 (kept) — the planner records consumption; it feeds the grid and the DRC-18 average. */}
            <ConsumptionPanel rows={rows} nowIso={nowIso} />
          </>
        )}
      </div>
    </AppShellV2>
  );
};

export default BuyerDemandAnticipation;
