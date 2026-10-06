/** @import React from 'react' */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import KpiCard from '@components/ui-v2/KpiCard';
import Tabs from '@components/ui-v2/Tabs';
import StatusPill from '@components/ui-v2/StatusPill';
import FilterChipsBar from '@components/ui-v2/FilterChipsBar';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import Data from '@components/ui-v2/Data';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import { formatDate, formatNumber } from '@lib/format';
import { useDemandForecast } from '@services/query/hooks';
/** @import { DemandForecastRun, ForecastMethod } from '@services/engine/demandForecast' */
/** @import { EventFactor } from '@services/engine/eventCalendar' */
/** @import { DemandForecastSkuView } from '@services/data/types' */
/** @import { SeriesRange } from '@services/engine/demandRange' */
import DemandRangeSection from './demandForecast/DemandRangeSection';
import PurposeHeader from '@components/forecast/PurposeHeader';
import SimulatedDataBanner from '@components/forecast/SimulatedDataBanner';
import AboutThisPage from '@components/forecast/AboutThisPage';
import DataAsOf from '@components/forecast/DataAsOf';
import { forecastCrumb, forecastTitle } from '@components/forecast/forecastPages';
/** @import { QualityFrame } from './BuyerForecastBias' */
import ForecastBiasTab from './BuyerForecastBias';

// ─────────────────────────────────────────────────────────────────────────────
// DEMAND FORECAST — REQ-E14-07, the Material Planner's view (Experience: "the
// forecast per SKU, brand and total, and which method produced each SKU's
// forecast"), and REQ-E14-09's demand range (P50 / P90 per SKU, brand, total
// and material, and how often sales fell outside it; BL-111).
//
// Read-only. The total and each brand (own forecast, reconciled, SAP's plan),
// every SKU with its method, and a SKU's weeks. Computed at read time on the
// engine's SYNTHETIC dataset (the `engineDataset` pill, X-03). The main model
// is not built and the page says so; no figure here is labelled as it. Every
// number is the service's own.
// ─────────────────────────────────────────────────────────────────────────────

/** @type {Record<ForecastMethod, 'success' | 'warning' | 'danger' | 'info' | 'neutral'>} */
const METHOD_VARIANT = {
  main: 'success',
  comb: 'info',
  sba: 'neutral',
  croston: 'neutral',
  tsb: 'warning',
  newSkuSap: 'warning',
  discontinued: 'neutral'
};

// The accumulator is typed `number` inline: the TS original wrote `reduce<number>`,
// and without it `reduce` picks the overload whose accumulator is the element
// type (`number | null`).
/**
 * @param {readonly (number | null)[] | null} xs
 * @returns {number | null}
 */
const sum = (xs) =>
  xs === null ? null : xs.reduce((/** @type {number} */ a, v) => a + (v ?? 0), 0);
/**
 * @param {number} a
 * @param {number | null} b
 * @returns {string}
 */
const diffPct = (a, b) => {
  if (b === null || b === 0) return '—';
  const d = Math.round(((a - b) / b) * 1000) / 10;
  return `${d > 0 ? '+' : ''}${formatNumber(d)}%`;
};
/** @param {number | undefined} x */
const two = (x) => (x === undefined ? '—' : formatNumber(Math.round(x * 100) / 100));

/** @type {React.FC<{ sku: DemandForecastSkuView; weeks: readonly string[]; events: DemandForecastRun['events']['horizon']; range: SeriesRange | null; }>} */
const SkuDetail = ({ sku, weeks, events, range }) => {
  const { t } = useTranslation();
  const d = sku.detail;
  return (
    <section
      className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-6"
      data-testid="df-detail"
    >
      <h2 className="text-section text-text-primary mb-1">
        {t('df.detail.title')} · <Data>{sku.skuCode}</Data>{' '}
        <span className="text-sm text-text-secondary">{sku.name}</span>
      </h2>
      <div className="text-xs text-text-secondary space-y-1 mb-3" data-testid="df-detail-method">
        {sku.method === 'comb' && d.ses && d.holt && d.damped && (
          <p>
            {t('df.detail.comb', {
              sesAlpha: two(d.ses.alpha),
              holtAlpha: two(d.holt.alpha),
              holtBeta: two(d.holt.beta),
              dampedAlpha: two(d.damped.alpha),
              dampedBeta: two(d.damped.beta),
              phi: two(d.damped.phi)
            })}
          </p>
        )}
        {sku.method === 'comb' && (
          <p>{t(d.seasonal ? 'df.detail.seasonal' : 'df.detail.notSeasonal')}</p>
        )}
        {sku.method === 'newSkuSap' && <p>{t('df.detail.newSkuSap')}</p>}
        {(sku.method === 'sba' || sku.method === 'croston' || sku.method === 'tsb') && (
          <>
            <p>{t('df.detail.slow', { p: two(d.p), v: two(d.v) })}</p>
            <p>{t(`df.detail.${sku.method}`)}</p>
          </>
        )}
        {sku.method === 'discontinued' && <p>{t('df.detail.discontinued')}</p>}
        {sku.method === 'main' && <p>{t('df.detail.main')}</p>}
        {sku.endsOn && <p>{t('df.detail.endsOn', { date: formatDate(sku.endsOn) })}</p>}
      </div>
      <div className="overflow-x-auto max-h-96 overflow-y-auto">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('df.detail.col.week')}</TableHeaderCell>
            <TableHeaderCell>{t('df.detail.col.base')}</TableHeaderCell>
            <TableHeaderCell>{t('df.detail.col.forecast')}</TableHeaderCell>
            {range?.bands.map((b) => (
              <TableHeaderCell key={b.level}>
                {t('df.range.col.p', { level: Math.round(b.level * 100) })}
              </TableHeaderCell>
            ))}
            {sku.theta && <TableHeaderCell>{t('df.detail.col.theta')}</TableHeaderCell>}
            <TableHeaderCell>{t('df.detail.col.sap')}</TableHeaderCell>
            <TableHeaderCell>{t('df.detail.col.events')}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {weeks.map((w, i) => (
              <TableRow key={w} data-testid={`df-week-${w}`}>
                <TableCell>
                  <Data>{formatDate(w)}</Data>
                </TableCell>
                <TableCell>
                  <Data>{formatNumber(Math.round(sku.base[i]))}</Data>
                </TableCell>
                <TableCell>
                  <Data data-testid={`df-week-forecast-${w}`}>{formatNumber(sku.forecast[i])}</Data>
                  {/* REQ-E14-11 X-06 — a planner override in force; the engine's own value beside it. */}
                  {sku.overridden.includes(i) && (
                    <div
                      className="text-xs text-text-tertiary whitespace-nowrap"
                      data-testid={`df-week-overridden-${w}`}
                    >
                      {t('fb.df.overridden')} · {t('fb.df.engineCol')}{' '}
                      <Data className="text-text-tertiary">
                        {formatNumber(sku.engineForecast[i])}
                      </Data>
                    </div>
                  )}
                </TableCell>
                {range?.bands.map((b) => (
                  <TableCell key={b.level}>
                    <Data data-testid={`df-week-p${Math.round(b.level * 100)}-${w}`}>
                      {b.values[i] === null
                        ? '—'
                        : formatNumber(
                            /** @type {NonNullable<(typeof b.values)[number]>} */ (b.values[i])
                          )}
                    </Data>
                  </TableCell>
                ))}
                {sku.theta && (
                  <TableCell>
                    <Data className="text-text-tertiary">
                      {formatNumber(Math.round(sku.theta[i]))}
                    </Data>
                  </TableCell>
                )}
                <TableCell>
                  <Data>{sku.sapPlan ? formatNumber(sku.sapPlan[i]) : '—'}</Data>
                </TableCell>
                <TableCell
                  className="text-xs text-text-secondary"
                  data-testid={`df-week-events-${w}`}
                >
                  {(events[i]?.events ?? []).map((e) => t(`df.events.event.${e}`)).join(', ')}
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
      </div>
    </section>
  );
};

/** @type {React.FC<{ events: DemandForecastRun['events'] }>} */
const EventsSection = ({ events }) => {
  const { t } = useTranslation();
  /** @type {{ key: string; label: string; factors: readonly EventFactor[] }[]} */
  const cols = [
    { key: 'total', label: t('df.events.col.level'), factors: events.total },
    ...events.brands.map((b) => ({ key: b.brand, label: b.brand, factors: b.factors }))
  ];
  const events0 = events.total.map((f) => f.event);
  return (
    <section
      className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-6"
      data-testid="df-events"
    >
      <h2 className="text-section text-text-primary mb-1">{t('df.events.title')}</h2>
      <p className="text-xs text-text-tertiary mb-1">{t('df.events.intro')}</p>
      <p className="text-xs text-text-secondary mb-3" data-testid="df-events-synthetic">
        {t('df.events.synthetic')}
      </p>
      <div className="overflow-x-auto mb-3">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('df.events.col.event')}</TableHeaderCell>
            <TableHeaderCell>{t('df.events.col.when')}</TableHeaderCell>
            {cols.map((c) => (
              <TableHeaderCell key={c.key}>{c.label}</TableHeaderCell>
            ))}
          </TableHeader>
          <tbody>
            {events0.map((e) => (
              <TableRow key={e} data-testid={`df-event-${e}`}>
                <TableCell className="text-sm text-text-primary align-top">
                  {t(`df.events.event.${e}`)}
                </TableCell>
                <TableCell className="text-xs text-text-secondary align-top">
                  {t(`df.events.when.${e}`, { lead: events.lead })}
                </TableCell>
                {cols.map((c) => {
                  const f = /** @type {EventFactor} */ (c.factors.find((x) => x.event === e));
                  return (
                    <TableCell
                      key={c.key}
                      className="align-top"
                      data-testid={`df-event-${e}-${c.key}`}
                    >
                      <Data className="whitespace-nowrap">{`× ${formatNumber(Math.round(f.factor * 1000) / 1000)}`}</Data>
                      <div className="text-xs text-text-tertiary">
                        {t(`df.events.status.${f.status}`)}
                        {f.status !== 'notEstimable' &&
                          ` · ${t('df.events.occ', { count: f.occurrences })}`}
                      </div>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </tbody>
        </Table>
      </div>
      <p className="text-xs text-text-tertiary" data-testid="df-ramadan-table">
        {t('df.events.ramadanTable')}{' '}
        {events.ramadan
          .map((r) =>
            t('df.events.ramadanRow', {
              year: r.hijriYear,
              start: formatDate(r.start),
              eid: formatDate(r.eid)
            })
          )
          .join(' · ')}
      </p>
      {events.horizonBeyondTable && (
        <p className="text-xs text-warning-hover mt-1" data-testid="df-ramadan-beyond">
          {t('df.events.beyondTable', { date: formatDate(events.tableCoversUntil) })}
        </p>
      )}
    </section>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// FORECAST QUALITY — Forecast UX phase 2, task B5 (F-06, F-12). One page, two
// tabs, so "how did the forecast do" has one home: "Forecast vs plan" (the
// demand forecast below) and "Bias and overrides" (`BuyerForecastBias.jsx`).
// The tab is kept in the address (`?tab=bias`), so a reload or a shared link
// lands on the same tab, and `/buyer/forecast-bias` redirects here (FUX2-R1).
// Both tabs share one frame: the page title, purpose header, banner, the tabs
// and the line naming the plan source (F-06). Each tab reads only its own data.
// ─────────────────────────────────────────────────────────────────────────────

/** @typedef {'forecast' | 'bias'} QualityTab */

/** @type {React.FC<{ tab: QualityTab; onTab: (tab: QualityTab) => void; children: React.ReactNode }>} */
const ForecastQualityFrame = ({ tab, onTab, children }) => {
  const { t } = useTranslation();
  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={forecastCrumb(t, 'forecastQuality')}
        title={forecastTitle(t, 'forecastQuality')}
      />
      <PurposeHeader page="forecastQuality" />
      <SimulatedDataBanner capability="engineDataset" />
      <div data-testid="fq-tabs" data-tab={tab}>
        <Tabs
          tabs={[
            { id: 'forecast', label: t('df.tab.forecast') },
            { id: 'bias', label: t('df.tab.bias') }
          ]}
          active={tab}
          onChange={(id) => onTab(id === 'bias' ? 'bias' : 'forecast')}
          className="mb-3"
        />
      </div>
      {/* F-06 — which plan drives orders, and what this page measures against it. */}
      <p className="text-sm text-text-secondary mb-4" data-testid="fq-plan-source">
        {t('df.planSource')}
      </p>
      {children}
    </AppShellV2>
  );
};

/** @type {React.FC} */
const BuyerDemandForecast = () => {
  const [params, setParams] = useSearchParams();
  /** @type {QualityTab} */
  const tab = params.get('tab') === 'bias' ? 'bias' : 'forecast';
  /** @type {QualityFrame} */
  const frame = (content) => (
    <ForecastQualityFrame
      tab={tab}
      onTab={(next) => setParams(next === 'bias' ? { tab: 'bias' } : {})}
    >
      {content}
    </ForecastQualityFrame>
  );
  return tab === 'bias' ? <ForecastBiasTab frame={frame} /> : <DemandForecastTab frame={frame} />;
};

/** @type {React.FC<{ frame: QualityFrame }>} */
const DemandForecastTab = ({ frame }) => {
  const { t } = useTranslation();
  const query = useDemandForecast();
  const crumb = forecastCrumb(t, 'forecastQuality');
  const run = query.data ?? null;
  const [brand, setBrand] = useState(/** @type {string} */ ('all'));
  const [selected, setSelected] = useState(/** @type {string | null} */ (null));
  const skus = useMemo(() => run?.skus ?? [], [run]);

  if (query.isPending) return <LoadingState breadcrumb={crumb} />;
  if (query.isError)
    return <ErrorState breadcrumb={crumb} error={query.error} onRetry={() => query.refetch()} />;
  if (!run) return <ErrorState breadcrumb={crumb} onRetry={() => query.refetch()} />;

  const shown = brand === 'all' ? skus : skus.filter((s) => s.brand === brand);
  const current =
    skus.find((s) => s.skuCode === selected) ??
    shown.find((s) => s.method !== 'discontinued') ??
    null;
  const c = run.methodCounts;
  const totalForecast = /** @type {NonNullable<ReturnType<typeof sum>>} */ (
    sum(run.total.forecast)
  );
  const totalSap = sum(run.total.sapPlan);
  const levels = [run.total, ...run.brands];
  const recon = run.reconciliation;

  return frame(
    <>
      <DataAsOf
        date={run.asOf}
        detail={
          <>
            {t('df.meta.run')} <Data data-testid="df-first-week">{formatDate(run.weeks[0])}</Data>{' '}
            {t('df.meta.to')} <Data>{formatDate(run.weeks[run.weeks.length - 1])}</Data>
          </>
        }
      />
      {/* REQ-E14-11 / REQ-E14-10 — the two engine pages Forecast quality reaches. */}
      <p className="text-xs text-text-secondary mb-4" data-testid="df-overrides">
        {run.overrideCells > 0 && <>{t('fb.df.overrides', { count: run.overrideCells })} </>}
        <Link
          to="/buyer/demand-forecast?tab=bias"
          className="text-action hover:underline"
          data-testid="df-bias-link"
        >
          {t('fb.df.link')}
        </Link>
        <span data-testid="df-backtest-link">
          {' · '}
          <Link to="/buyer/model-backtest" className="text-action hover:underline">
            {t('mb.link.fromDemandForecast')}
          </Link>
        </span>
      </p>

      <div
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6"
        data-testid="df-kpis"
      >
        <KpiCard
          eyebrow={t('df.kpi.skus')}
          value={<span data-testid="df-kpi-skus">{skus.length - c.discontinued}</span>}
          subtitle={
            <span className="text-text-tertiary">
              {t('df.kpi.skus.sub', { ended: c.discontinued, oem: run.excludedOem.length })}
            </span>
          }
        />
        <KpiCard
          eyebrow={t('df.kpi.fallback')}
          value={<span data-testid="df-kpi-comb">{c.comb}</span>}
          subtitle={
            <span className="text-text-tertiary">
              {t('df.kpi.fallback.sub', { slow: c.sba + c.croston + c.tsb, launch: c.newSkuSap })}
            </span>
          }
        />
        <KpiCard
          eyebrow={t('df.kpi.total')}
          value={<span data-testid="df-kpi-total">{formatNumber(totalForecast)}</span>}
          subtitle={
            <span className="text-text-tertiary" data-testid="df-kpi-total-sap">
              {totalSap === null
                ? t('df.kpi.total.noSap')
                : t('df.kpi.total.sub', {
                    sap: formatNumber(totalSap),
                    diff: diffPct(totalForecast, totalSap)
                  })}
            </span>
          }
        />
        <KpiCard
          eyebrow={t('df.kpi.recon')}
          value={<span data-testid="df-kpi-recon">{t('df.kpi.recon.value')}</span>}
          subtitle={
            <span className="text-text-tertiary" data-testid="df-kpi-recon-method">
              {recon.method === 'mintShrink'
                ? t('df.kpi.recon.mint', {
                    lambda: two(recon.lambda ?? undefined),
                    clipped: recon.clippedCells
                  })
                : t('df.kpi.recon.wls', {
                    reason: t(`df.recon.fallback.${recon.fallback}`),
                    clipped: recon.clippedCells
                  })}
            </span>
          }
        />
      </div>

      <section
        className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-6"
        data-testid="df-levels"
      >
        <h2 className="text-section text-text-primary mb-1">{t('df.levels.title')}</h2>
        <p className="text-xs text-text-tertiary mb-3">{t('df.levels.intro')}</p>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableHeaderCell>{t('df.levels.col.level')}</TableHeaderCell>
              <TableHeaderCell>{t('df.levels.col.skus')}</TableHeaderCell>
              <TableHeaderCell>{t('df.levels.col.base')}</TableHeaderCell>
              <TableHeaderCell>{t('df.levels.col.forecast')}</TableHeaderCell>
              <TableHeaderCell>{t('df.levels.col.sap')}</TableHeaderCell>
              <TableHeaderCell>{t('df.levels.col.diff')}</TableHeaderCell>
            </TableHeader>
            <tbody>
              {levels.map((l) => {
                const f = /** @type {NonNullable<ReturnType<typeof sum>>} */ (sum(l.forecast));
                const sap = sum(l.sapPlan);
                const active = skus.filter(
                  (s) => l.skuCodes.includes(s.skuCode) && s.method !== 'discontinued'
                ).length;
                return (
                  <TableRow key={l.key} data-testid={`df-level-${l.key}`}>
                    <TableCell className="text-sm text-text-primary">
                      {l.level === 'total' ? t('df.levels.total') : l.key}
                    </TableCell>
                    <TableCell>
                      <Data>{formatNumber(active)}</Data>
                    </TableCell>
                    <TableCell>
                      <Data>
                        {formatNumber(
                          Math.round(
                            /** @type {NonNullable<ReturnType<typeof sum>>} */ (sum(l.base))
                          )
                        )}
                      </Data>
                    </TableCell>
                    <TableCell>
                      <Data data-testid={`df-level-forecast-${l.key}`}>{formatNumber(f)}</Data>
                    </TableCell>
                    <TableCell>
                      <Data>{sap === null ? '—' : formatNumber(sap)}</Data>
                    </TableCell>
                    <TableCell>
                      <Data>{diffPct(f, sap)}</Data>
                    </TableCell>
                  </TableRow>
                );
              })}
            </tbody>
          </Table>
        </div>
      </section>

      <section
        className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-6"
        data-testid="df-skus"
      >
        <h2 className="text-section text-text-primary mb-1">{t('df.skus.title')}</h2>
        <p className="text-xs text-text-tertiary mb-3">{t('df.skus.intro')}</p>
        <div className="mb-3">
          <FilterChipsBar
            options={[
              { id: 'all', label: t('df.skus.all'), count: skus.length },
              ...run.brands.map((b) => ({
                id: b.key,
                label: b.key,
                count: skus.filter((s) => s.brand === b.key).length
              }))
            ]}
            value={brand}
            onChange={setBrand}
          />
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableHeaderCell>{t('df.skus.col.sku')}</TableHeaderCell>
              <TableHeaderCell>{t('df.skus.col.brand')}</TableHeaderCell>
              <TableHeaderCell>{t('df.skus.col.method')}</TableHeaderCell>
              <TableHeaderCell>{t('df.skus.col.history')}</TableHeaderCell>
              <TableHeaderCell>{t('df.skus.col.next4')}</TableHeaderCell>
              <TableHeaderCell>{t('df.skus.col.forecast')}</TableHeaderCell>
              <TableHeaderCell>{t('df.skus.col.sap')}</TableHeaderCell>
              <TableHeaderCell>{t('df.skus.col.diff')}</TableHeaderCell>
            </TableHeader>
            <tbody>
              {shown.map((s) => {
                const f = /** @type {NonNullable<ReturnType<typeof sum>>} */ (sum(s.forecast));
                const sap = sum(s.sapPlan);
                return (
                  <TableRow
                    key={s.skuCode}
                    data-testid={`df-sku-${s.skuCode}`}
                    onClick={() => setSelected(s.skuCode)}
                    aria-selected={current?.skuCode === s.skuCode}
                    className={current?.skuCode === s.skuCode ? 'bg-action-soft' : ''}
                  >
                    <TableCell className="align-top">
                      <Data>{s.skuCode}</Data>
                      <div className="text-xs text-text-secondary">{s.name}</div>
                    </TableCell>
                    <TableCell className="align-top text-sm">{s.brand}</TableCell>
                    <TableCell className="align-top whitespace-nowrap">
                      <span data-testid={`df-method-${s.skuCode}`}>
                        <StatusPill variant={METHOD_VARIANT[s.method]}>
                          {t(`df.method.${s.method}`)}
                        </StatusPill>
                      </span>
                    </TableCell>
                    <TableCell className="align-top text-xs text-text-secondary whitespace-nowrap">
                      {t('df.skus.weeks', { count: s.historyWeeks })}
                      {s.stockoutWeeks > 0 && (
                        <div>{t('df.skus.stockouts', { count: s.stockoutWeeks })}</div>
                      )}
                    </TableCell>
                    <TableCell className="align-top">
                      <Data>
                        {s.forecast
                          .slice(0, 4)
                          .map((v) => formatNumber(v))
                          .join(' · ')}
                      </Data>
                    </TableCell>
                    <TableCell className="align-top">
                      <Data data-testid={`df-sku-total-${s.skuCode}`}>{formatNumber(f)}</Data>
                    </TableCell>
                    <TableCell className="align-top">
                      <Data>{sap === null ? '—' : formatNumber(sap)}</Data>
                    </TableCell>
                    <TableCell className="align-top">
                      <Data>{diffPct(f, sap)}</Data>
                    </TableCell>
                  </TableRow>
                );
              })}
            </tbody>
          </Table>
        </div>
      </section>

      {current && (
        <SkuDetail
          key={current.skuCode}
          sku={current}
          weeks={run.weeks}
          events={run.events.horizon}
          range={run.range.skus.find((r) => r.key === current.skuCode) ?? null}
        />
      )}

      <DemandRangeSection range={run.range} />

      <EventsSection events={run.events} />

      <section
        className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-6"
        data-testid="df-oem"
      >
        <h2 className="text-section text-text-primary mb-1">{t('df.oem.title')}</h2>
        {run.excludedOem.length === 0 ? (
          <p className="text-sm text-text-tertiary">{t('df.oem.none')}</p>
        ) : (
          <ul className="text-sm space-y-1">
            {run.excludedOem.map((o) => (
              <li key={o.skuCode} data-testid={`df-oem-${o.skuCode}`}>
                <Data>{o.skuCode}</Data> <span className="text-text-secondary">{o.name}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        className="bg-bg-surface border border-border-subtle rounded-lg p-4 text-sm text-text-secondary space-y-2"
        data-testid="df-definitions"
      >
        <h2 className="text-section text-text-primary">{t('df.def.title')}</h2>
        <p>{t('df.def.order')}</p>
        <p>{t('df.def.comb')}</p>
        <p>{t('df.def.stockout')}</p>
        <p>{t('df.def.recon')}</p>
        <p>{t('df.def.range')}</p>
      </section>

      <AboutThisPage>
        <p>{t('df.subtitle')}</p>
        <p data-testid="df-synthetic-note">{t('df.synthetic')}</p>
        <p data-testid="df-grain-note">{t('df.grain')}</p>
        <p data-testid="df-main-not-built">{t('df.mainNotBuilt')}</p>
        <p data-testid="df-source-note">{t('df.source')}</p>
      </AboutThisPage>
    </>
  );
};

export default BuyerDemandForecast;
