import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import FilterChipsBar from '@components/ui-v2/FilterChipsBar';
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
import { useForecastVersions, useStabilisedPlan } from '@services/query/hooks';
import { useForecastCommand } from '@services/query/commandHooks';
import type { ForecastVersionView, StabiliseRunView, StabilisedSeriesView } from '@services/data/types';
import { STABILISE_RULES, type PeriodResult, type StabiliseRule } from '@services/engine/stabilise';
import { isoWeek } from '@services/engine/dates';
import { isLive } from '@services/liveness';
import { POLICY_HOOKS } from '@services/transitions/policyHooks';
import { refusedByPolicy } from '@services/transitions/refusalMessage';
import { qtyOf } from './materialPlan/planDisplay';
import DataHealthChip from '@components/forecast/DataHealthChip';
import PurposeHeader from '@components/forecast/PurposeHeader';
import SimulatedDataBanner from '@components/forecast/SimulatedDataBanner';
import AboutThisPage from '@components/forecast/AboutThisPage';
import DataAsOf from '@components/forecast/DataAsOf';
import TermTip from '@components/forecast/TermTip';
import { forecastCrumb, forecastTitle } from '@components/forecast/forecastPages';

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
// ─────────────────────────────────────────────────────────────────────────────

type Source = 'engine' | 'sapHistory';

const weekLabel = (w: string) => `W${isoWeek(w)}`;
const ratio = (x: number | null) => (x === null ? '—' : formatNumber(Math.round(x * 1000) / 1000));
const pctShare = (x: number | null) => (x === null ? '—' : `${formatNumber(Math.round(x * 1000) / 10)}%`);
const meanOf = (xs: readonly number[]): number | null => (xs.length > 0 ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
const qty = (x: number | null, uom: StabilisedSeriesView['uom']) => (x === null ? '—' : `${qtyOf(x, uom)} ${uom}`);

const held = (s: Pick<StabilisedSeriesView, 'counts'>) => ({
  firm: s.counts.firmFrozen,
  band: s.counts.bandHeld + s.counts.cumulativeHeld,
  damped: s.counts.damped,
});
const anyHeld = (s: StabilisedSeriesView) => {
  const h = held(s);
  return h.firm + h.band + h.damped > 0;
};

const RULE_VARIANT: Record<StabiliseRule, 'neutral' | 'info' | 'warning'> = {
  new: 'neutral',
  unchanged: 'neutral',
  firmFrozen: 'info',
  forecast: 'neutral',
  damped: 'info',
  bandHeld: 'warning',
  cumulativeHeld: 'warning',
  override: 'warning',
};

const PeriodTable: React.FC<{ s: StabilisedSeriesView }> = ({ s }) => {
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
          {s.latest.map((p: PeriodResult) => (
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
                <Data data-testid={`stb-published-${key}-${p.period}`}>{qty(p.published, s.uom)}</Data>
              </TableCell>
              <TableCell>
                <StatusPill variant={RULE_VARIANT[p.rule]}>
                  <span data-testid={`stb-rule-${key}-${p.period}`}>{t(`stb.rule.${p.rule}`)}</span>
                </StatusPill>
                {p.beyondBand && p.rule !== 'override' && (
                  <div className="text-xs text-warning-hover mt-1" data-testid={`stb-reason-needed-${key}-${p.period}`}>
                    {t('stb.detail.reasonNeeded')}
                  </div>
                )}
                {p.reason && <div className="text-xs text-text-secondary mt-1">{p.reason}</div>}
                {p.previous !== null && p.awaitingCommitment && (
                  <div className="text-xs text-text-tertiary mt-1">{t('stb.detail.recommit')}</div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

const RunSection: React.FC<{ run: StabiliseRunView; source: Source }> = ({ run, source }) => {
  const { t } = useTranslation();
  const [onlyMoving, setOnlyMoving] = useState<'moving' | 'all'>('moving');
  const [open, setOpen] = useState<string | null>(null);
  const { raw, stabilised, counts, replayCounts, beyondBand } = run.totals;
  const rows = useMemo(
    () => run.series.filter((s) => onlyMoving === 'all' || anyHeld(s)),
    [run.series, onlyMoving],
  );
  const latestHeld = { firm: counts.firmFrozen, band: counts.bandHeld + counts.cumulativeHeld, damped: counts.damped };
  return (
    <div data-testid={`stb-run-${source}`}>
      <p className="text-xs text-text-tertiary mb-4">{t(`stb.source.${source}.intro`)}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6" data-testid="stb-kpis">
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
              <span data-testid="stb-kpi-share-stab">{pctShare(stabilised.insideLeadTime.share)}</span>
            </span>
          }
          subtitle={<span className="text-text-tertiary">{t('stb.kpi.share.sub', { count: raw.insideLeadTime.schedules })}</span>}
        />
        <KpiCard
          eyebrow={t('stb.kpi.band')}
          value={
            <span data-testid="stb-kpi-band-stab">
              {t('stb.kpi.band.value', { n: stabilised.tradeOff.withinBand, m: stabilised.tradeOff.revisions })}
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
          value={<span data-testid="stb-kpi-held">{formatNumber(latestHeld.firm + latestHeld.band + latestHeld.damped)}</span>}
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

      <section className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-6" data-testid="stb-rules">
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

      <section className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-6" data-testid="stb-series">
        <h2 className="text-section text-text-primary mb-1">{t('stb.series.title')}</h2>
        <p className="text-xs text-text-tertiary mb-3">{t('stb.series.intro')}</p>
        <div className="mb-3">
          <FilterChipsBar<'moving' | 'all'>
            options={[
              { id: 'moving', label: t('stb.series.onlyMoving'), count: run.series.filter(anyHeld).length },
              { id: 'all', label: t('stb.series.all'), count: run.series.length },
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
                          <Data>{t('stb.series.days', { firm: s.terms.firmDays, tradeOff: s.terms.tradeOffDays })}</Data>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Data data-testid={`stb-held-${key}`}>{`${h.firm} · ${h.band} · ${h.damped}`}</Data>
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

const BuyerStabilise: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const refusalText = useRefusalText();
  const query = useStabilisedPlan();
  const forecastCommand = useForecastCommand();
  const publishAvailability = useVerbAvailability('forecast:publish');
  const versionsQuery = useForecastVersions();
  const [source, setSource] = useState<Source>('engine');
  const crumb = forecastCrumb(t, 'publish');
  // X-03 — the registry's own answer, read at render; the verb reads it again.
  const withheld = !isLive('engineDataset');

  if (query.isPending) return <LoadingState breadcrumb={crumb} />;
  if (query.isError) return <ErrorState breadcrumb={crumb} error={query.error} onRetry={() => void query.refetch()} />;
  const plan = query.data ?? null;

  const publish = async (stream: 'packaging' | 'rawMaterial') => {
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
  const lastPublished = (['packaging', 'rawMaterial'] as const)
    .map((stream) => (versionsQuery.data?.items ?? []).find((v) => v.stream === stream && v.isCurrent))
    .filter((v): v is ForecastVersionView => v !== undefined);
  const pv = plan?.versions;

  return (
    <AppShellV2>
      <PageHeader breadcrumb={crumb} title={forecastTitle(t, 'publish')} />
      <PurposeHeader page="publish" />
      <SimulatedDataBanner capability="engineDataset" />
      <DataAsOf
        date={plan?.planMadeAt ?? null}
        detail={
          plan?.planMadeAt ? (
            pv && pv.packaging.length > 0 ? (
              t('stb.meta.versions', { packaging: pv.packaging.length, raw: pv.rawMaterial.length, from: formatDate(pv.packaging[0]) })
            ) : null
          ) : (
            t('stb.meta.noPlan')
          )
        }
      />
      {/* F-02 — the published quantities are the material net requirement, so the
          chip counts the checks that reach Material requirement (and Safety stock,
          which feeds it). */}
      <DataHealthChip step="E14-03" className="mb-3" />

      <div className="mb-4">
        <FilterChipsBar<Source>
          options={[
            { id: 'engine', label: t('stb.source.engine') },
            { id: 'sapHistory', label: t('stb.source.sapHistory') },
          ]}
          value={source}
          onChange={setSource}
        />
      </div>

      {run && <RunSection key={source} run={run} source={source} />}

      {plan && (
        <section className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-5" data-testid="stb-settings">
          <h2 className="text-section text-text-primary mb-2">{t('stb.settings.title')}</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-text-secondary">{t('stb.settings.weight')}</dt>
              <dd>
                <Data data-testid="stb-setting-weight">{`${formatNumber(Math.round(plan.params.tradeOffWeight * 100))}%`}</Data>
                <div className="text-xs text-text-tertiary">{t('stb.settings.weightNote')}</div>
              </dd>
            </div>
            <div>
              <dt className="text-text-secondary">{t('stb.settings.forecastWeight')}</dt>
              <dd>
                <Data>{`${formatNumber(Math.round(plan.params.forecastWeight * 100))}%`}</Data>
                <div className="text-xs text-text-tertiary">{t('stb.settings.forecastWeightNote')}</div>
              </dd>
            </div>
            <div>
              <dt className="text-text-secondary">{t('stb.settings.band')}</dt>
              <dd>
                <Data data-testid="stb-setting-band">
                  {t('stb.settings.bandValue', {
                    perVersion: Math.round(plan.params.band.perVersion * 100),
                    cumulative: Math.round(plan.params.band.cumulative * 100),
                  })}
                </Data>
                <div className="text-xs text-text-tertiary">{t('stb.settings.bandNote')}</div>
              </dd>
            </div>
          </dl>
        </section>
      )}


      <section className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-6" data-testid="stb-publish">
        <h2 className="text-section text-text-primary mb-1">{t('stb.publish.title')}</h2>
        <p className="text-xs text-text-tertiary mb-3">{t('stb.publish.intro')}</p>
        <ul className="text-sm text-text-secondary mb-2 space-y-1" data-testid="stb-last-published">
          {lastPublished.map((v) => (
            <li key={v.publicationId} data-testid={`stb-last-published-${v.stream}`}>
              {t('stb.publish.last', { stream: t(`fc.stream.${v.stream}`) })}{' '}
              <Data>{t('fc.version', { version: v.version })}</Data>, <Data>{formatDate(v.publishedAt)}</Data>
            </li>
          ))}
          {versionsQuery.isSuccess && lastPublished.length === 0 && <li>{t('stb.publish.lastNone')}</li>}
        </ul>
        <p className="text-sm mb-3">
          <Link to="/buyer/forecasts" className="text-action-hover hover:underline" data-testid="stb-versions-link">
            {t('stb.publish.versionsLink')}
          </Link>
        </p>
        {publishAvailability.kind !== 'held' ? (
          <HandoffNotice availability={publishAvailability} testId="handoff-stabilise-publish" />
        ) : withheld ? (
          <p className="text-sm text-warning-hover" data-testid="stb-publish-withheld">
            {t('stb.publish.withheld')}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void publish('packaging')} disabled={forecastCommand.isPending} data-testid="stb-publish-packaging">
              {t('stb.publish.packaging')}
            </Button>
            <Button variant="outline" onClick={() => void publish('rawMaterial')} disabled={forecastCommand.isPending} data-testid="stb-publish-rawMaterial">
              {t('stb.publish.rawMaterial')}
            </Button>
          </div>
        )}
      </section>

      <section className="bg-bg-surface border border-border-subtle rounded-lg p-4 text-sm text-text-secondary space-y-2" data-testid="stb-definitions">
        <h2 className="text-section text-text-primary">{t('stb.def.title')}</h2>
        <p>{t('stb.def.quantity')}</p>
        <p>{t('stb.def.zones')}</p>
        <p>{t('stb.def.masc')}</p>
        <p>{t('stb.def.share')}</p>
      </section>

      <AboutThisPage>
        <p>{t('stb.subtitle')}</p>
        <p data-testid="stb-synthetic-note">{t('stb.synthetic')}</p>
        {withheld && <p data-testid="stb-withheld-note">{t('stb.withheld')}</p>}
        <p data-testid="stb-range-note">
          {t('stb.range')}{' '}
          <Link to="/buyer/demand-forecast" className="text-action-hover hover:underline" data-testid="stb-range-link">
            {t('stb.range.link')}
          </Link>
        </p>
        <p>{t('stb.replay')}</p>
      </AboutThisPage>
    </AppShellV2>
  );
};

export default BuyerStabilise;
