import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import FilterChipsBar from '@components/ui-v2/FilterChipsBar';
import SubTabs from '@components/ui-v2/SubTabs';
import KpiCard from '@components/ui-v2/KpiCard';
import StatusPill from '@components/ui-v2/StatusPill';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import Data from '@components/ui-v2/Data';
import Button from '@components/ui-v2/Button';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { useToast } from '@hooks/useToast';
import { useRefusalText } from '@hooks/useRefusalText';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { formatDate, formatNumber } from '@lib/format';
import {
  useDataHealth,
  useForecastVersions,
  useOrderPlan,
  useReschedule,
  useStabilisedPlan
} from '@services/query/hooks';
import { useForecastCommand } from '@services/query/commandHooks';
/** @import { StabiliseRunView, StabilisedPlanView, StabilisedSeriesView } from '@services/data/types' */
/** @import { PeriodResult, StabiliseRule } from '@services/engine/stabilise' */
import { STABILISE_RULES } from '@services/engine/stabilise';
import { isoWeek } from '@services/engine/dates';
import { isLive } from '@services/liveness';
import { POLICY_HOOKS } from '@services/transitions/policyHooks';
import { refusedByPolicy } from '@services/transitions/refusalMessage';
import { qtyOf } from './materialPlan/planDisplay';
import DataHealthChip from '@components/forecast/DataHealthChip';
import PurposeHeader from '@components/forecast/PurposeHeader';
import CycleSteps from '@components/forecast/CycleSteps';
import SimulatedDataBanner from '@components/forecast/SimulatedDataBanner';
import AboutThisPage from '@components/forecast/AboutThisPage';
import DataAsOf from '@components/forecast/DataAsOf';
import TermTip from '@components/forecast/TermTip';
import { FORECAST_PAGES, forecastCrumb, forecastTitle } from '@components/forecast/forecastPages';
import {
  STEP_HEALTH,
  currentVersions,
  failingChecks,
  recommendedOrders,
  weeksOverCapacity
} from '@components/forecast/cycleCounts';
import PublishedVersions from './BuyerForecasts';

// ─────────────────────────────────────────────────────────────────────────────
// STABILISE AND PUBLISH — REQ-E14-06, the Material Planner's view before a plan
// goes to suppliers.
//
// Per supplier × material and week (AC-03): the engine's value, the last and
// first values the supplier saw, the damped value, the allowed range, what
// would be published and which rule set it — Firm kept (BR-03), Trade-off
// damped (BR-04) and held to the ENG-D8 band (BR-05), a week beyond the band
// flagged as needing a reason. The effect on E14-02's plan-change measures
// (MASC, weeks changed inside the lead time, Trade-off revisions inside the
// band) is shown raw against stabilised, on two sources: the engine's own plan
// (replayed, ENG-B30) and SAP's plan history suppliers already saw (ENG-B33).
//
// BR-06's range: E14-09 is built (BL-111) and shown on the Demand forecast
// page; it is not published beside these quantities (ENG-B99), and the page
// says so with a link to it.
// Publishing goes through the EXISTING verb (`t_forecastversion_publish`,
// `source: 'engine'`) and is refused while the engine dataset is simulated
// (X-03) — the page says so in place of the act — and, once live, until SOMO
// ratifies C8 §8 (ENG-B35). Every figure is computed by the engine at read
// time on its SYNTHETIC dataset (the `engineDataset` pill).
//
// FUX-D1 (2026-10-05): this is the only publish point — the SAP-plan
// re-publish on Forecasts is removed. Above the act the page shows the last
// published version per stream, read from the published versions. The version
// record carries no source (SAP plan or engine) and no next-due date, so the
// line shows neither rather than infer them.
//
// FUX phase 2 B2 (F-01, F-13): one page for publishing. Two tabs, kept in the
// address: "Version to publish" (the content above) and "Published versions"
// (`?tab=versions`, the list that was its own page at `/buyer/forecasts`, which
// now redirects here — FUX2-R1). Above the publish act a checklist shows
// whether the week is ready: inputs (Data health), recommended orders, weeks
// over warehouse capacity and held Trade-off weeks without a reason. Each item
// is derived at render from data the hooks already return, by the counting
// rules the linked pages apply (`cycleCounts.ts`); nothing is stored (FUX2-R3).
// It adds no gate to the verb (FUX-R1): the act and its refusal are unchanged.
// ─────────────────────────────────────────────────────────────────────────────

/** @typedef {'engine' | 'sapHistory'} Source */

/** @param {string} w */
const weekLabel = (w) => `W${isoWeek(w)}`;
/** @param {number | null} x */
const ratio = (x) => (x === null ? '—' : formatNumber(Math.round(x * 1000) / 1000));
/** @param {number | null} x */
const pctShare = (x) => (x === null ? '—' : `${formatNumber(Math.round(x * 1000) / 10)}%`);
/**
 * @param {readonly number[]} xs
 * @returns {number | null}
 */
const meanOf = (xs) => (xs.length > 0 ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
/**
 * @param {number | null} x
 * @param {StabilisedSeriesView['uom']} uom
 */
const qty = (x, uom) => (x === null ? '—' : `${qtyOf(x, uom)} ${uom}`);

/** @param {Pick<StabilisedSeriesView, 'counts'>} s */
const held = (s) => ({
  firm: s.counts.firmFrozen,
  band: s.counts.bandHeld + s.counts.cumulativeHeld,
  damped: s.counts.damped
});
/** @param {StabilisedSeriesView} s */
const anyHeld = (s) => {
  const h = held(s);
  return h.firm + h.band + h.damped > 0;
};

/** @type {Record<StabiliseRule, 'neutral' | 'info' | 'warning'>} */
const RULE_VARIANT = {
  new: 'neutral',
  unchanged: 'neutral',
  firmFrozen: 'info',
  forecast: 'neutral',
  damped: 'info',
  bandHeld: 'warning',
  cumulativeHeld: 'warning',
  override: 'warning'
};

/** @type {React.FC<{ s: StabilisedSeriesView }>} */
const PeriodTable = ({ s }) => {
  const { t } = useTranslation();
  const key = `${s.supplierId}-${s.materialCode}`;
  return (
    <div className="overflow-x-auto" data-testid={`stb-detail-${key}`}>
      <h3 className="text-sm font-semibold text-text-primary mb-2">
        {t('stb.detail.title', { material: s.materialLabel, supplier: s.supplierName })}
      </h3>
      <Table>
        <TableHeader>
          <TableHeaderCell>{t('stb.detail.col.week')}</TableHeaderCell>
          <TableHeaderCell>
            <span className="inline-flex items-center gap-1">
              {t('stb.detail.col.zone')} <TermTip term="Firm" /> <TermTip term="Trade-off" />
            </span>
          </TableHeaderCell>
          <TableHeaderCell>{t('stb.detail.col.raw')}</TableHeaderCell>
          <TableHeaderCell>{t('stb.detail.col.previous')}</TableHeaderCell>
          <TableHeaderCell>{t('stb.detail.col.first')}</TableHeaderCell>
          <TableHeaderCell>{t('stb.detail.col.damped')}</TableHeaderCell>
          <TableHeaderCell>{t('stb.detail.col.range')}</TableHeaderCell>
          <TableHeaderCell>{t('stb.detail.col.published')}</TableHeaderCell>
          <TableHeaderCell>{t('stb.detail.col.rule')}</TableHeaderCell>
        </TableHeader>
        <tbody>
          {s.latest.map(
            /** @param {PeriodResult} p */ (p) => (
              <TableRow key={p.period} data-testid={`stb-week-${key}-${p.period}`}>
                <TableCell className="whitespace-nowrap">
                  <Data>{weekLabel(p.period)}</Data>
                  <div className="text-xs text-text-tertiary">
                    <Data>{formatDate(p.period)}</Data>
                  </div>
                </TableCell>
                <TableCell>{t(`stb.zone.${p.zone}`)}</TableCell>
                <TableCell className="whitespace-nowrap">
                  <Data data-testid={`stb-raw-${key}-${p.period}`}>{qty(p.raw, s.uom)}</Data>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <Data className="text-text-secondary">{qty(p.previous, s.uom)}</Data>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <Data className="text-text-secondary">{qty(p.first, s.uom)}</Data>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <Data className="text-text-secondary">{qty(p.damped, s.uom)}</Data>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {p.range ? (
                    <Data className="text-text-secondary">{`${qtyOf(p.range.low, s.uom)} – ${qtyOf(p.range.high, s.uom)}`}</Data>
                  ) : (
                    <span className="text-text-tertiary">—</span>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <Data data-testid={`stb-published-${key}-${p.period}`}>
                    {qty(p.published, s.uom)}
                  </Data>
                </TableCell>
                <TableCell>
                  <StatusPill variant={RULE_VARIANT[p.rule]}>
                    <span data-testid={`stb-rule-${key}-${p.period}`}>
                      {t(`stb.rule.${p.rule}`)}
                    </span>
                  </StatusPill>
                  {p.beyondBand && p.rule !== 'override' && (
                    <div
                      className="text-xs text-warning-hover mt-1"
                      data-testid={`stb-reason-needed-${key}-${p.period}`}
                    >
                      {t('stb.detail.reasonNeeded')}
                    </div>
                  )}
                  {p.reason && <div className="text-xs text-text-secondary mt-1">{p.reason}</div>}
                  {p.previous !== null && p.awaitingCommitment && (
                    <div className="text-xs text-text-tertiary mt-1">
                      {t('stb.detail.recommit')}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            )
          )}
        </tbody>
      </Table>
    </div>
  );
};

/** @type {React.FC<{ run: StabiliseRunView; source: Source }>} */
const RunSection = ({ run, source }) => {
  const { t } = useTranslation();
  const [onlyMoving, setOnlyMoving] = useState(/** @type {'moving' | 'all'} */ ('moving'));
  const [open, setOpen] = useState(/** @type {string | null} */ (null));
  const { raw, stabilised, counts, replayCounts, beyondBand } = run.totals;
  const rows = useMemo(
    () => run.series.filter((s) => onlyMoving === 'all' || anyHeld(s)),
    [run.series, onlyMoving]
  );
  const latestHeld = {
    firm: counts.firmFrozen,
    band: counts.bandHeld + counts.cumulativeHeld,
    damped: counts.damped
  };
  return (
    <div data-testid={`stb-run-${source}`}>
      <p className="text-xs text-text-tertiary mb-4">{t(`stb.source.${source}.intro`)}</p>

      <div
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6"
        data-testid="stb-kpis"
      >
        <KpiCard
          eyebrow={t('stb.kpi.masc')}
          value={
            <span>
              <span data-testid="stb-kpi-masc-raw">{ratio(raw.masc)}</span> →{' '}
              <span data-testid="stb-kpi-masc-stab">{ratio(stabilised.masc)}</span>
            </span>
          }
          subtitle={
            <span className="text-text-tertiary">
              {t('stb.kpi.masc.sub', { count: raw.mascPairs })} <TermTip term="MASC" />
              <span className="block" data-testid="stb-scale-hint">
                {t('fux.scale.masc')}
              </span>
            </span>
          }
        />
        <KpiCard
          eyebrow={t('stb.kpi.share')}
          value={
            <span>
              <span data-testid="stb-kpi-share-raw">{pctShare(raw.insideLeadTime.share)}</span> →{' '}
              <span data-testid="stb-kpi-share-stab">
                {pctShare(stabilised.insideLeadTime.share)}
              </span>
            </span>
          }
          subtitle={
            <span className="text-text-tertiary">
              {t('stb.kpi.share.sub', { count: raw.insideLeadTime.schedules })}
            </span>
          }
        />
        <KpiCard
          eyebrow={t('stb.kpi.band')}
          value={
            <span data-testid="stb-kpi-band-stab">
              {t('stb.kpi.band.value', {
                n: stabilised.tradeOff.withinBand,
                m: stabilised.tradeOff.revisions
              })}
            </span>
          }
          subtitle={
            <span className="text-text-tertiary" data-testid="stb-kpi-band-raw">
              {t('stb.kpi.band.sub', { n: raw.tradeOff.withinBand, m: raw.tradeOff.revisions })}
            </span>
          }
        />
        <KpiCard
          eyebrow={t('stb.kpi.held')}
          value={
            <span data-testid="stb-kpi-held">
              {formatNumber(latestHeld.firm + latestHeld.band + latestHeld.damped)}
            </span>
          }
          subtitle={
            <span className="text-text-tertiary">
              {t('stb.kpi.held.sub', latestHeld)}
              {beyondBand > 0 && (
                <span className="block text-warning-hover" data-testid="stb-kpi-reason">
                  {t('stb.kpi.reason', { count: beyondBand })}
                </span>
              )}
            </span>
          }
        />
      </div>

      <section
        className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-6"
        data-testid="stb-rules"
      >
        <h2 className="text-section text-text-primary mb-1">{t('stb.rules.title')}</h2>
        <p className="text-xs text-text-tertiary mb-3">{t('stb.rules.intro')}</p>
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('stb.rules.col.rule')}</TableHeaderCell>
            <TableHeaderCell>{t('stb.rules.col.latest')}</TableHeaderCell>
            <TableHeaderCell>{t('stb.rules.col.replay')}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {STABILISE_RULES.map((r) => (
              <TableRow key={r} data-testid={`stb-rule-row-${r}`}>
                <TableCell>{t(`stb.rule.${r}`)}</TableCell>
                <TableCell>
                  <Data data-testid={`stb-count-${r}`}>{formatNumber(counts[r])}</Data>
                </TableCell>
                <TableCell>
                  <Data className="text-text-secondary" data-testid={`stb-replay-${r}`}>
                    {formatNumber(replayCounts[r])}
                  </Data>
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
      </section>

      <section
        className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-6"
        data-testid="stb-series"
      >
        <h2 className="text-section text-text-primary mb-1">{t('stb.series.title')}</h2>
        <p className="text-xs text-text-tertiary mb-3">{t('stb.series.intro')}</p>
        <div className="mb-3">
          <FilterChipsBar
            options={[
              {
                id: 'moving',
                label: t('stb.series.onlyMoving'),
                count: run.series.filter(anyHeld).length
              },
              { id: 'all', label: t('stb.series.all'), count: run.series.length }
            ]}
            value={onlyMoving}
            onChange={setOnlyMoving}
          />
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-text-tertiary py-6 text-center" data-testid="stb-series-empty">
            {t('stb.series.empty')}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableHeaderCell>{t('stb.series.col.material')}</TableHeaderCell>
                <TableHeaderCell>{t('stb.series.col.supplier')}</TableHeaderCell>
                <TableHeaderCell>
                  <span className="inline-flex items-center gap-1">
                    {t('stb.series.col.zones')} <TermTip term="Firm" /> <TermTip term="Trade-off" />
                  </span>
                </TableHeaderCell>
                <TableHeaderCell>{t('stb.series.col.held')}</TableHeaderCell>
                <TableHeaderCell>{t('stb.series.col.masc')}</TableHeaderCell>
                <TableHeaderCell>{t('stb.series.col.open')}</TableHeaderCell>
              </TableHeader>
              <tbody>
                {rows.map((s) => {
                  const key = `${s.supplierId}-${s.materialCode}`;
                  const h = held(s);
                  return (
                    <React.Fragment key={key}>
                      <TableRow data-testid={`stb-series-${key}`}>
                        <TableCell>
                          <div className="text-sm text-text-primary">{s.materialLabel}</div>
                          <Data className="text-xs text-text-tertiary">{s.materialCode}</Data>
                        </TableCell>
                        <TableCell>{s.supplierName}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Data>
                            {t('stb.series.days', {
                              firm: s.terms.firmDays,
                              tradeOff: s.terms.tradeOffDays
                            })}
                          </Data>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Data
                            data-testid={`stb-held-${key}`}
                          >{`${h.firm} · ${h.band} · ${h.damped}`}</Data>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Data>{`${ratio(meanOf(s.raw.masc))} → ${ratio(meanOf(s.stabilised.masc))}`}</Data>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="secondary"
                            onClick={() => setOpen(open === key ? null : key)}
                            data-testid={`stb-open-${key}`}
                          >
                            {open === key ? t('stb.series.hide') : t('stb.series.show')}
                          </Button>
                        </TableCell>
                      </TableRow>
                      {open === key && (
                        <tr>
                          <td colSpan={6} className="p-3 bg-bg-hover">
                            <PeriodTable s={s} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
};

/**
 * The values in use (ENG-D8, ENG-D9).
 * @type {React.FC<{ params: StabilisedPlanView['params'] }>}
 */
const SettingsSection = ({ params }) => {
  const { t } = useTranslation();
  return (
    <section
      className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-5"
      data-testid="stb-settings"
    >
      <h2 className="text-section text-text-primary mb-2">{t('stb.settings.title')}</h2>
      <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <div>
          <dt className="text-text-secondary">{t('stb.settings.weight')}</dt>
          <dd>
            <Data data-testid="stb-setting-weight">{`${formatNumber(Math.round(params.tradeOffWeight * 100))}%`}</Data>
            <div className="text-xs text-text-tertiary">{t('stb.settings.weightNote')}</div>
          </dd>
        </div>
        <div>
          <dt className="text-text-secondary">{t('stb.settings.forecastWeight')}</dt>
          <dd>
            <Data>{`${formatNumber(Math.round(params.forecastWeight * 100))}%`}</Data>
            <div className="text-xs text-text-tertiary">{t('stb.settings.forecastWeightNote')}</div>
          </dd>
        </div>
        <div>
          <dt className="text-text-secondary">{t('stb.settings.band')}</dt>
          <dd>
            <Data data-testid="stb-setting-band">
              {t('stb.settings.bandValue', {
                perVersion: Math.round(params.band.perVersion * 100),
                cumulative: Math.round(params.band.cumulative * 100)
              })}
            </Data>
            <div className="text-xs text-text-tertiary">{t('stb.settings.bandNote')}</div>
          </dd>
        </div>
      </dl>
    </section>
  );
};

/** @typedef {'publish' | 'versions'} Tab */
const TAB_PARAM = 'tab';
/**
 * @param {string | null} raw
 * @returns {Tab}
 */
const tabOf = (raw) => (raw === 'versions' ? 'versions' : 'publish');

/** @typedef {'pass' | 'attention' | 'count' | 'unknown'} ItemState */
/** @type {Record<ItemState, 'success' | 'warning' | 'neutral'>} */
const ITEM_VARIANT = {
  pass: 'success',
  attention: 'warning',
  count: 'neutral',
  unknown: 'neutral'
};

/**
 * @typedef {{
 *     readonly id: 'inputs' | 'orders' | 'warehouse' | 'held';
 *     readonly state: ItemState;
 *     readonly text: string;
 *     readonly to: string;
 *     readonly linkText: string;
 *   }} ChecklistItem
 */

/**
 * F-01 · evaluation §5 "Publish gate checklist". Four items, each with its state
 * and a link to the page that resolves it. Orders carry a number, not a status:
 * no "reviewed" flag exists, and none is invented (FUX2-R3).
 * @type {React.FC<{ run: StabiliseRunView | null }>}
 */
const PublishChecklist = ({ run }) => {
  const { t } = useTranslation();
  const health = useDataHealth();
  const orderPlan = useOrderPlan();
  const reschedule = useReschedule();
  const unknown = t('stb.check.unknown');

  // The page's own Data health chip count (the checks that reach this step).
  const failing = health.data ? failingChecks(health.data, STEP_HEALTH.publish) : null;
  const overCapacity = reschedule.data ? weeksOverCapacity(reschedule.data) : null;
  const orders = orderPlan.data ? recommendedOrders(orderPlan.data) : null;
  // Held Trade-off weeks are the weeks beyond the band with no reason
  // (`stabilise.ts`: an override is the same week WITH one), the weeks the
  // detail table marks "needs a reason".
  const heldNoReason = run ? run.totals.counts.bandHeld + run.totals.counts.cumulativeHeld : null;

  /** @type {ChecklistItem[]} */
  const items = [
    {
      id: 'inputs',
      state: failing === null ? 'unknown' : failing > 0 ? 'attention' : 'pass',
      text:
        failing === null
          ? unknown
          : failing > 0
            ? t('fux.steps.checks', { count: failing })
            : t('fux.steps.pass'),
      to: FORECAST_PAGES.dataHealth.path,
      linkText: t(FORECAST_PAGES.dataHealth.titleKey)
    },
    {
      id: 'orders',
      state: orders === null ? 'unknown' : 'count',
      text: orders === null ? unknown : t('fux.count.toOrder', { count: orders }),
      to: FORECAST_PAGES.whatToOrder.path,
      linkText: t(FORECAST_PAGES.whatToOrder.titleKey)
    },
    {
      id: 'warehouse',
      state: overCapacity === null ? 'unknown' : overCapacity > 0 ? 'attention' : 'pass',
      text: overCapacity === null ? unknown : t('fux.count.overCapacity', { count: overCapacity }),
      to: FORECAST_PAGES.makeRoom.path,
      linkText: t(FORECAST_PAGES.makeRoom.titleKey)
    },
    {
      id: 'held',
      state: heldNoReason === null ? 'unknown' : heldNoReason > 0 ? 'attention' : 'pass',
      text: heldNoReason === null ? unknown : t('stb.check.held.state', { count: heldNoReason }),
      to: FORECAST_PAGES.publish.path,
      linkText: t('stb.check.held.link')
    }
  ];

  return (
    <div className="mb-4" data-testid="stb-checklist">
      <h3 className="text-sm font-semibold text-text-primary mb-1">{t('stb.check.title')}</h3>
      <p className="text-xs text-text-tertiary mb-2">{t('stb.check.intro')}</p>
      <ul className="divide-y divide-border-subtle border border-border-subtle rounded">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm"
            data-testid={`stb-check-${item.id}`}
            data-state={item.state}
          >
            <span className="text-text-primary min-w-[12rem]">{t(`stb.check.${item.id}`)}</span>
            <StatusPill variant={ITEM_VARIANT[item.state]}>
              <span data-testid={`stb-check-${item.id}-state`}>{item.text}</span>
            </StatusPill>
            <Link
              to={item.to}
              className="text-action-hover hover:underline ml-auto"
              data-testid={`stb-check-${item.id}-link`}
              onClick={
                item.id === 'held'
                  ? () =>
                      document
                        .querySelector('[data-testid="stb-series"]')
                        ?.scrollIntoView?.({ behavior: 'smooth' })
                  : undefined
              }
            >
              {item.linkText}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

/** @type {React.FC} */
const BuyerStabilise = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const refusalText = useRefusalText();
  const query = useStabilisedPlan();
  const forecastCommand = useForecastCommand();
  const publishAvailability = useVerbAvailability('forecast:publish');
  const versionsQuery = useForecastVersions();
  const [source, setSource] = useState(/** @type {Source} */ ('engine'));
  const [params, setParams] = useSearchParams();
  const tab = tabOf(params.get(TAB_PARAM));
  const crumb = forecastCrumb(t, 'publish');
  // X-03 — the registry's own answer, read at render; the verb reads it again.
  const withheld = !isLive('engineDataset');

  // The tab shown decides which read the page waits for.
  const shownQuery = tab === 'versions' ? versionsQuery : query;
  if (shownQuery.isPending) return <LoadingState breadcrumb={crumb} />;
  if (shownQuery.isError)
    return (
      <ErrorState
        breadcrumb={crumb}
        error={shownQuery.error}
        onRetry={() => void shownQuery.refetch()}
      />
    );
  const plan = query.data ?? null;
  const versions = versionsQuery.data?.items ?? [];
  /** @param {Tab} next */
  const selectTab = (next) =>
    setParams(
      (prev) => {
        const out = new URLSearchParams(prev);
        if (next === 'versions') out.set(TAB_PARAM, 'versions');
        else out.delete(TAB_PARAM);
        return out;
      },
      { replace: true }
    );

  /** @param {'packaging' | 'rawMaterial'} stream */
  const publish = async (stream) => {
    try {
      const res = await forecastCommand.mutateAsync({ verb: 'publish', stream, source: 'engine' });
      if (res.status === 'failed') {
        const byHook = refusedByPolicy(res.reason, POLICY_HOOKS.FORECAST_ENGINE_PUBLISH_ALLOWED);
        const description = byHook
          ? res.reason?.includes('ENGINE_DATA_SIMULATED')
            ? t('stb.refusal.simulated')
            : t('stb.refusal.c8')
          : (refusalText(res.reason) ?? res.reason ?? '');
        toast({ variant: 'warning', title: t('stb.toast.refused'), description });
      }
    } catch {
      toast({ variant: 'error', title: t('stb.toast.refused') });
    }
  };

  const run = plan ? plan[source] : null;
  // FUX-D1 · F-13 — the current published version of each stream.
  const lastPublished = currentVersions(versions);
  const pv = plan?.versions;

  return (
    <AppShellV2>
      <PageHeader breadcrumb={crumb} title={forecastTitle(t, 'publish')} />
      <PurposeHeader page="publish" />
      <CycleSteps current="publish" />
      {/* One banner, for the figures the tab shows: the engine's plan, or the
          published versions (FUX-R3). */}
      <SimulatedDataBanner
        capability={tab === 'versions' ? 'forecastPublications' : 'engineDataset'}
      />
      <div className="mb-4">
        <SubTabs
          options={[
            { id: 'publish', label: t('stb.tab.publish') },
            { id: 'versions', label: t('stb.tab.versions'), count: versions.length }
          ]}
          value={tab}
          onChange={selectTab}
        />
      </div>

      {tab === 'versions' ? (
        <PublishedVersions versions={versions} />
      ) : (
        <>
          <DataAsOf
            date={plan?.planMadeAt ?? null}
            detail={
              plan?.planMadeAt
                ? pv && pv.packaging.length > 0
                  ? t('stb.meta.versions', {
                      packaging: pv.packaging.length,
                      raw: pv.rawMaterial.length,
                      from: formatDate(pv.packaging[0])
                    })
                  : null
                : t('stb.meta.noPlan')
            }
          />
          {/* F-02 — the published quantities are the material net requirement, so the
              chip counts the checks that reach Material requirement (and Safety stock,
              which feeds it). */}
          <DataHealthChip step="E14-03" className="mb-3" />

          <div className="mb-4">
            <FilterChipsBar
              options={[
                { id: 'engine', label: t('stb.source.engine') },
                { id: 'sapHistory', label: t('stb.source.sapHistory') }
              ]}
              value={source}
              onChange={setSource}
            />
          </div>

          {run && <RunSection key={source} run={run} source={source} />}

          {plan && <SettingsSection params={plan.params} />}

          <section
            className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-6"
            data-testid="stb-publish"
          >
            <h2 className="text-section text-text-primary mb-1">{t('stb.publish.title')}</h2>
            <p className="text-xs text-text-tertiary mb-3">{t('stb.publish.intro')}</p>
            <ul
              className="text-sm text-text-secondary mb-2 space-y-1"
              data-testid="stb-last-published"
            >
              {lastPublished.map((v) => (
                <li key={v.publicationId} data-testid={`stb-last-published-${v.stream}`}>
                  {t('stb.publish.last', { stream: t(`fc.stream.${v.stream}`) })}{' '}
                  <Data>{t('fc.version', { version: v.version })}</Data>,{' '}
                  <Data>{formatDate(v.publishedAt)}</Data>
                </li>
              ))}
              {versionsQuery.isSuccess && lastPublished.length === 0 && (
                <li>{t('stb.publish.lastNone')}</li>
              )}
            </ul>
            <p className="text-sm mb-3">
              <Link
                to={`${FORECAST_PAGES.publish.path}?${TAB_PARAM}=versions`}
                className="text-action-hover hover:underline"
                data-testid="stb-versions-link"
              >
                {t('stb.publish.versionsLink')}
              </Link>
            </p>
            <PublishChecklist run={plan?.engine ?? null} />
            {publishAvailability.kind !== 'held' ? (
              <HandoffNotice
                availability={publishAvailability}
                testId="handoff-stabilise-publish"
              />
            ) : withheld ? (
              <p className="text-sm text-warning-hover" data-testid="stb-publish-withheld">
                {t('stb.publish.withheld')}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => void publish('packaging')}
                  disabled={forecastCommand.isPending}
                  data-testid="stb-publish-packaging"
                >
                  {t('stb.publish.packaging')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void publish('rawMaterial')}
                  disabled={forecastCommand.isPending}
                  data-testid="stb-publish-rawMaterial"
                >
                  {t('stb.publish.rawMaterial')}
                </Button>
              </div>
            )}
          </section>

          <section
            className="bg-bg-surface border border-border-subtle rounded-lg p-4 text-sm text-text-secondary space-y-2"
            data-testid="stb-definitions"
          >
            <h2 className="text-section text-text-primary">{t('stb.def.title')}</h2>
            <p>{t('stb.def.quantity')}</p>
            <p>{t('stb.def.zones')}</p>
            <p>{t('stb.def.masc')}</p>
            <p>{t('stb.def.share')}</p>
          </section>
        </>
      )}

      <AboutThisPage>
        {tab === 'versions' ? (
          <p>{t('fc.pti.versions.subtitle')}</p>
        ) : (
          <>
            <p>{t('stb.subtitle')}</p>
            <p data-testid="stb-synthetic-note">{t('stb.synthetic')}</p>
            {withheld && <p data-testid="stb-withheld-note">{t('stb.withheld')}</p>}
            <p data-testid="stb-range-note">
              {t('stb.range')}{' '}
              <Link
                to="/buyer/demand-forecast"
                className="text-action-hover hover:underline"
                data-testid="stb-range-link"
              >
                {t('stb.range.link')}
              </Link>
            </p>
            <p>{t('stb.replay')}</p>
          </>
        )}
      </AboutThisPage>
    </AppShellV2>
  );
};

export default BuyerStabilise;
