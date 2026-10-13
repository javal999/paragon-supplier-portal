/** @import React from 'react' */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import SampleDataBadge from '@components/ui-v2/SampleDataBadge';
import Data from '@components/ui-v2/Data';
import Button from '@components/ui-v2/Button';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import { formatDate } from '@lib/format';
import { useDemandAnticipation } from '@services/query/hooks';
/** @import { DemandAnticipationRow } from '@services/transitions/demandAnticipationRules' */
import { inputClass, inventoryNow, labelClass } from '../inventory/inventoryDisplay';
import AnticipationGrid from './components/AnticipationGrid';
import PublishPanel from './components/PublishPanel';
import { frozenWeeks, latestPublication, publishPreview, sharePct, weekRange } from './display';

// ─────────────────────────────────────────────────────────────────────────────
// DEMAND ANTICIPATION — CAP-10 (BL-179), SC-HUB-DEMAND-ANTICIPATION-BRIEF-2026-10
// §4 (CAP-D10 to CAP-D13). The Material Planner's page, under Weekly plan.
//
// One WeekGrid per supplier × material, filtered by supplier and material (in
// the page address). Frozen weeks show a lock and the published figure; "Would
// be" beside them is today's recomputation, read only (BR-03). Publish freezes
// the fixed 4-week horizon holding the current hub week, once; a future horizon
// stays open, and weeks frozen earlier keep their figure (BR-01, BR-02, CAP-D17). The sample data opens with one seeded publication, and
// the page says it is a sample publication rather than naming an act.
//
// Every input is sample data (the sample LTP and SAP stock fixtures), so the
// Sample data marker always shows. The figure is never shown as "DA": that
// abbreviation labels Delivery Agreements (CAP-D10).
// ─────────────────────────────────────────────────────────────────────────────

/** @param {DemandAnticipationRow} r */
const keyOf = (r) => `${r.supplierId}-${r.materialCode}`;

/** @type {React.FC} */
const BuyerDemandAnticipation = () => {
  const { t } = useTranslation();
  const query = useDemandAnticipation();
  const [params, setParams] = useSearchParams();
  const nowIso = inventoryNow();
  const crumb = [t('hub.nav.section.weeklyPlan'), t('hub.nav.pti.demandAnticipation')];
  const rows = useMemo(() => query.data?.items ?? [], [query.data]);
  const supplier = params.get('supplier');
  const material = params.get('material');

  if (query.isPending) return <LoadingState breadcrumb={crumb} />;
  if (query.isError)
    return <ErrorState breadcrumb={crumb} error={query.error} onRetry={() => query.refetch()} />;

  const { horizon, next, frozen: horizonFrozen, toFreeze } = publishPreview(rows, nowIso);
  const latest = latestPublication(rows);
  const frozen = frozenWeeks(rows);
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
      <PageMetaLine className="-mt-6 mb-4">
        {t('demandAnt.asOf')} <Data>{formatDate(nowIso)}</Data>
        <SampleDataBadge className="ml-3 align-middle" />
      </PageMetaLine>

      <section
        className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-4"
        data-testid="dant-publication"
      >
        <p className="text-sm text-text-primary mb-1" data-testid="dant-frozen-weeks">
          <span className="text-text-secondary">{t('demandAnt.pub.label')}: </span>
          {frozen.length > 0 ? <Data>{weekRange(frozen)}</Data> : t('demandAnt.pub.none')}
        </p>
        {latest ? (
          <p className="text-xs text-text-tertiary mb-3" data-testid="dant-latest-publication">
            {latest.source === 'sampleSeed'
              ? t('demandAnt.pub.sampleSeed', { date: formatDate(latest.publishedAt) })
              : `${t('demandAnt.pub.published', { date: formatDate(latest.publishedAt) })} · ${t('demandAnt.pub.unattributed')}`}
          </p>
        ) : null}
        <p className="text-xs text-text-tertiary mb-3">{t('demandAnt.howItWorks')}</p>
        <PublishPanel horizon={horizon} next={next} frozen={horizonFrozen} toFreeze={toFreeze} />
      </section>

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
            onClick={() => setParams(new URLSearchParams(), { replace: true })}
            data-testid="dant-filters-clear"
          >
            {t('demandAnt.filter.clear')}
          </Button>
        ) : null}
      </div>

      <p className="text-xs text-text-tertiary mb-3">{t('demandAnt.wouldBeHelp')}</p>

      <div className="space-y-3">
        {shown.map((r) => (
          <section
            key={keyOf(r)}
            data-testid={`dant-card-${keyOf(r)}`}
            className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm"
          >
            <header className="px-4 py-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-sm font-semibold text-text-primary">{r.supplierName}</span>
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
              <p className="px-4 pb-2 text-xs text-warning-hover">{t('demandAnt.card.noStock')}</p>
            ) : null}
            <div className="border-t border-border-subtle">
              <AnticipationGrid row={r} rowKey={keyOf(r)} currentWeek={nowIso.slice(0, 10)} />
            </div>
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
    </AppShellV2>
  );
};

export default BuyerDemandAnticipation;
