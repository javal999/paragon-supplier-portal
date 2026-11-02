/** @import React from 'react' */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import KpiCard from '@components/ui-v2/KpiCard';
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
import { useModelBacktest } from '@services/query/hooks';
import PurposeHeader from '@components/forecast/PurposeHeader';
import SimulatedDataBanner from '@components/forecast/SimulatedDataBanner';
import AboutThisPage from '@components/forecast/AboutThisPage';
import DataAsOf from '@components/forecast/DataAsOf';
import TermTip from '@components/forecast/TermTip';
import { forecastCrumb, forecastTitle } from '@components/forecast/forecastPages';
/** @import { ModelBacktestView } from '@services/data/types' */
/** @import { BacktestCandidate, CandidateScore, SkuBacktest, VersusSap } from '@services/engine/modelBacktest' */
import { BACKTEST_CANDIDATES, PORTFOLIO_SCENARIOS } from '@services/engine/modelBacktest';

/**
 * BL-233 — the glossary term each method and scenario column is labelled by.
 * A scenario with no entry (the chosen model) keeps its plain label.
 * @type {Record<string, import('@lib/glossary').TermLabelId>}
 */
const CANDIDATE_TERM = {
  main: 'candMain',
  comb: 'candComb',
  theta: 'candTheta',
  sba: 'candSba',
  croston: 'candCroston',
  tsb: 'candTsb',
  sapPlan: 'candSapPlan'
};
/** @type {Record<string, import('@lib/glossary').TermLabelId | undefined>} */
const SCENARIO_TERM = { sapPlan: 'scenarioSapPlan', floor: 'scenarioFloor' };

// ─────────────────────────────────────────────────────────────────────────────
// MODEL BACKTEST — REQ-E14-10, the Material Planner's view (Experience: "per SKU
// group, the candidate models with their simulated fill rate, order-complete
// rate, average stock against capacity, accuracy and stability, and which model
// was chosen").
//
// Read-only. Computed at read time on the engine's SYNTHETIC dataset (the
// `engineDataset` pill, X-03). It chooses each SKU's model; it does NOT switch
// material planning to the engine's forecast — that is the owner's decision
// (ENG-B66), and the page says so. Every figure is the service's own.
// ─────────────────────────────────────────────────────────────────────────────

/** @type {Record<VersusSap, 'success' | 'danger' | 'neutral' | 'warning'>} */
const VS_VARIANT = {
  better: 'success',
  worse: 'danger',
  equal: 'neutral',
  mixed: 'warning'
};

/**
 * @param {number | null | undefined} x
 * @returns {string}
 */
const pct = (x, digits = 1) => {
  if (x === null || x === undefined) return '—';
  const f = 10 ** digits;
  return `${formatNumber(Math.round(x * 100 * f) / f)}%`;
};
/** @param {number} x */
const whole = (x) => formatNumber(Math.round(x));
/** @param {number | null | undefined} x */
const two = (x) => (x === null || x === undefined ? '—' : formatNumber(Math.round(x * 100) / 100));
/** @param {number | null} x */
const signedPct = (x) => (x === null ? '—' : `${x > 0 ? '+' : ''}${pct(x)}`);

/** @type {React.FC<{ testId: string; title: string; intro?: string; children: React.ReactNode }>} */
const Section = ({ testId, title, intro, children }) => (
  <section
    className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-6"
    data-testid={testId}
  >
    <h2 className="text-section text-text-primary mb-1">{title}</h2>
    {intro && <p className="text-xs text-text-tertiary mb-3">{intro}</p>}
    {children}
  </section>
);

/**
 * One candidate's cell in the SKU table: fill rate · pallet-weeks · MASC.
 * @type {React.FC<{ s: CandidateScore | undefined; chosen: boolean; testId: string }>}
 */
const ScoreCell = ({ s, chosen, testId }) => {
  if (!s) return <span className="text-text-tertiary">—</span>;
  return (
    <div data-testid={testId} className={chosen ? 'font-semibold' : ''}>
      <Data className="whitespace-nowrap">{pct(s.fillRate)}</Data>
      <div className="text-xs text-text-secondary whitespace-nowrap">
        <Data>{whole(s.palletWeeks)}</Data> · <Data>{two(s.masc)}</Data>
      </div>
    </div>
  );
};

/** @type {React.FC<{ sku: SkuBacktest }>} */
const SkuDetail = ({ sku }) => {
  const { t } = useTranslation();
  /**
   * @param {CandidateScore} s
   * @returns {string}
   */
  const status = (s) => {
    if (s.candidate === 'sapPlan') return t('mb.detail.benchmark');
    if (s.candidate === sku.selection.chosen) return t('mb.detail.chosen');
    if (s.candidate === sku.floor) return t('mb.detail.floor');
    if (sku.selection.overMascLimit.includes(s.candidate)) return t('mb.detail.overLimit');
    return t(
      sku.selection.beatsFloor.includes(s.candidate) ? 'mb.detail.beats' : 'mb.detail.notBeats'
    );
  };
  return (
    <Section testId="mb-detail" title={`${t('mb.detail.title')} · ${sku.skuCode}`}>
      <p className="text-xs text-text-secondary mb-3">{sku.name}</p>
      <Table>
        <TableHeader>
          <TableHeaderCell>{t('mb.detail.col.candidate')}</TableHeaderCell>
          <TableHeaderCell term="mbFillRate" />
          <TableHeaderCell term="mbOrderComplete" />
          <TableHeaderCell term="mbUnitsServed" />
          <TableHeaderCell term="mbPalletWeeks" />
          <TableHeaderCell term="mbMasc" />
          <TableHeaderCell term="mbWape" />
          <TableHeaderCell term="mbBias" />
          <TableHeaderCell term="mbSelection" />
        </TableHeader>
        <tbody>
          {sku.scores.map((s) => (
            <TableRow key={s.candidate} data-testid={`mb-detail-${s.candidate}`}>
              <TableCell className="text-sm text-text-primary">
                {t(`mb.candidate.${s.candidate}`)}
              </TableCell>
              <TableCell>
                <Data>{pct(s.fillRate)}</Data>
              </TableCell>
              <TableCell>
                <Data>{pct(s.orderCompleteRate)}</Data>
              </TableCell>
              <TableCell>
                <Data>{pct(s.unitFillRate)}</Data>
              </TableCell>
              <TableCell>
                <Data>{whole(s.palletWeeks)}</Data>
              </TableCell>
              <TableCell>
                <Data>{two(s.masc)}</Data>
              </TableCell>
              <TableCell>
                <Data>{pct(s.wape)}</Data>
              </TableCell>
              <TableCell>
                <Data>{signedPct(s.bias)}</Data>
              </TableCell>
              <TableCell className="text-xs text-text-secondary">{status(s)}</TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>
      <p className="text-xs text-text-tertiary mt-3" data-testid="mb-detail-materials">
        {t('mb.detail.materials', { materials: sku.materials.join(', ') })}
      </p>
    </Section>
  );
};

/** @type {React.FC} */
const BuyerModelBacktest = () => {
  const { t } = useTranslation();
  const query = useModelBacktest();
  const crumb = forecastCrumb(t, 'modelBacktest');
  /** @type {ModelBacktestView | null} */
  const run = query.data ?? null;
  const [selected, setSelected] = useState(/** @type {string | null} */ (null));
  const [kind, setKind] = useState(/** @type {'all' | 'packaging' | 'rawMaterial'} */ ('all'));
  const columns = /** @type {BacktestCandidate[]} */ (
    useMemo(
      () =>
        run
          ? BACKTEST_CANDIDATES.filter((c) =>
              run.skus.some((s) => s.scores.some((x) => x.candidate === c))
            )
          : [],
      [run]
    )
  );

  if (query.isPending) return <LoadingState breadcrumb={crumb} />;
  if (query.isError)
    return <ErrorState breadcrumb={crumb} error={query.error} onRetry={() => query.refetch()} />;
  if (!run) return <ErrorState breadcrumb={crumb} onRetry={() => query.refetch()} />;

  const sum = run.summary;
  const current = run.skus.find((s) => s.skuCode === selected) ?? run.skus[0] ?? null;
  /** @param {string} sc */
  const portfolio = (sc) =>
    /** @type {import('@services/engine/modelBacktest').PortfolioResult} */ (
      run.portfolio.find((p) => p.scenario === sc)
    );
  const newSkus = run.excluded.filter((e) => e.reason === 'newSku').length;
  const materials = kind === 'all' ? run.materials : run.materials.filter((m) => m.kind === kind);
  const limited = run.skus.filter((s) => s.selection.reason === 'mascLimit').length;

  return (
    <AppShellV2>
      <PageHeader breadcrumb={crumb} title={forecastTitle(t, 'modelBacktest')} />
      <PurposeHeader page="modelBacktest" />
      <SimulatedDataBanner capability="engineDataset" />
      <DataAsOf
        date={run.asOf}
        detail={
          <>
            {t('mb.meta.replay')} <Data data-testid="mb-from">{formatDate(run.replay.from)}</Data>{' '}
            {t('mb.meta.to')} <Data>{formatDate(run.replay.to)}</Data> ·{' '}
            {t('mb.meta.origins', { count: run.origins.length })} ·{' '}
            <span data-testid="mb-computed">
              {t('mb.meta.computed', { ms: formatNumber(run.computedInMs) })}
            </span>
          </>
        }
      />

      <div
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6"
        data-testid="mb-kpis"
      >
        <KpiCard
          eyebrow={t('mb.kpi.skus')}
          value={<span data-testid="mb-kpi-skus">{sum.skusCompared}</span>}
          subtitle={<span className="text-text-tertiary">{t('mb.kpi.skus.sub', { newSkus })}</span>}
        />
        <KpiCard
          term="mbBeats"
          value={
            <span data-testid="mb-kpi-beats">
              {t('mb.kpi.beats.value', { n: sum.chosenBeatsSap, m: sum.skusCompared })}
            </span>
          }
          subtitle={
            <span className="text-text-tertiary">
              {t('mb.kpi.beats.sub', {
                fill: sum.chosenHigherFillThanSap,
                space: sum.chosenLessSpaceThanSap,
                worse: sum.chosenWorseThanSap
              })}
            </span>
          }
        />
        <KpiCard
          term="mbMaterials"
          value={
            <span data-testid="mb-kpi-materials">
              {t('mb.kpi.beats.value', {
                n: sum.materialsChosenBeatsSap,
                m: sum.materialsCompared
              })}
            </span>
          }
          subtitle={<span className="text-text-tertiary">{t('mb.kpi.materials.sub')}</span>}
        />
        <KpiCard
          term="mbLimit"
          value={
            <span data-testid="mb-kpi-limit">
              {run.mascLimit === null ? t('mb.kpi.limit.notSet') : two(run.mascLimit)}
            </span>
          }
          subtitle={
            <span className="text-text-tertiary">
              {t(run.mascLimit === null ? 'mb.kpi.limit.notSet.sub' : 'mb.kpi.limit.set.sub')}{' '}
              <TermTip term="MASC" />
            </span>
          }
        />
      </div>

      <Section testId="mb-headline" title={t('mb.headline.title')}>
        <div className="text-sm text-text-secondary space-y-2">
          <p data-testid="mb-headline-skus">
            {t('mb.headline.skus', {
              n: sum.chosenBeatsSap,
              m: sum.skusCompared,
              fill: sum.chosenHigherFillThanSap,
              space: sum.chosenLessSpaceThanSap,
              worse: sum.chosenWorseThanSap
            })}
          </p>
          <p data-testid="mb-headline-portfolio">
            {t('mb.headline.portfolio', {
              chosen: pct(portfolio('chosen').fillRate),
              floor: pct(portfolio('floor').fillRate),
              sap: pct(portfolio('sapPlan').fillRate),
              chosenPw: whole(portfolio('chosen').palletWeeks),
              floorPw: whole(portfolio('floor').palletWeeks),
              sapPw: whole(portfolio('sapPlan').palletWeeks)
            })}
          </p>
          <p className="text-xs text-text-tertiary">{t('mb.headline.caveat')}</p>
        </div>
      </Section>

      <Section testId="mb-methods" title={t('mb.methods.title')} intro={t('mb.methods.intro')}>
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('mb.methods.col.method')}</TableHeaderCell>
            <TableHeaderCell>{t('mb.methods.col.skus')}</TableHeaderCell>
            <TableHeaderCell term="mbFillRate" />
            <TableHeaderCell term="mbOrderComplete" />
            <TableHeaderCell term="mbPalletWeeks" />
            <TableHeaderCell term="mbMascMedian" />
            <TableHeaderCell term="mbWapeMedian" />
            <TableHeaderCell>{t('mb.methods.col.chosen')}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {run.methods.map((m) => (
              <TableRow key={m.candidate} data-testid={`mb-method-${m.candidate}`}>
                <TableCell className="text-sm text-text-primary">
                  {t(`mb.candidate.${m.candidate}`)}
                </TableCell>
                <TableCell>
                  <Data>{m.skus}</Data>
                </TableCell>
                <TableCell>
                  <Data data-testid={`mb-method-fill-${m.candidate}`}>{pct(m.fillRate)}</Data>
                </TableCell>
                <TableCell>
                  <Data>{pct(m.orderCompleteRate)}</Data>
                </TableCell>
                <TableCell>
                  <Data>{whole(m.palletWeeks)}</Data>
                </TableCell>
                <TableCell>
                  <Data>{two(m.medianMasc)}</Data>
                </TableCell>
                <TableCell>
                  <Data>{pct(m.medianWape)}</Data>
                </TableCell>
                <TableCell>
                  {m.candidate === 'sapPlan' ? (
                    <span className="text-xs text-text-tertiary">{t('mb.methods.benchmark')}</span>
                  ) : (
                    <Data data-testid={`mb-method-chosen-${m.candidate}`}>{m.chosenFor}</Data>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
      </Section>

      <Section
        testId="mb-portfolio"
        title={t('mb.portfolio.title')}
        intro={t('mb.portfolio.intro')}
      >
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('mb.portfolio.col.scenario')}</TableHeaderCell>
            <TableHeaderCell term="mbFillRate" />
            <TableHeaderCell term="mbUnitsServed" />
            <TableHeaderCell term="mbPalletWeeks" />
            <TableHeaderCell term="mbPeakPackaging" />
            <TableHeaderCell term="mbPeakRaw" />
          </TableHeader>
          <tbody>
            {PORTFOLIO_SCENARIOS.map((sc) => {
              const p = portfolio(sc);
              return (
                <TableRow key={sc} data-testid={`mb-portfolio-${sc}`}>
                  <TableCell className="text-sm text-text-primary">
                    {t(`mb.scenario.${sc}`)}
                  </TableCell>
                  <TableCell>
                    <Data data-testid={`mb-portfolio-fill-${sc}`}>{pct(p.fillRate)}</Data>
                  </TableCell>
                  <TableCell>
                    <Data>{pct(p.unitFillRate)}</Data>
                  </TableCell>
                  <TableCell>
                    <Data>{whole(p.palletWeeks)}</Data>
                  </TableCell>
                  {p.warehouses.map((w) => (
                    <TableCell key={w.kind}>
                      <Data>{whole(w.peakPallets)}</Data>
                      {w.capacityPallets !== null && (
                        <div className="text-xs text-text-tertiary">
                          {t('mb.portfolio.ofCapacity', {
                            cap: whole(w.capacityPallets),
                            over: whole(w.overCapacityPalletWeeks)
                          })}
                        </div>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </tbody>
        </Table>
      </Section>

      <Section testId="mb-origins" title={t('mb.origins.title')} intro={t('mb.origins.intro')}>
        <Table>
          <TableHeader>
            <TableHeaderCell term="mbOrigin" />
            <TableHeaderCell>{t('mb.origins.col.events')}</TableHeaderCell>
            {PORTFOLIO_SCENARIOS.map((sc) => (
              <TableHeaderCell key={sc} term={SCENARIO_TERM[sc]}>
                {t(`mb.scenario.${sc}`)}
              </TableHeaderCell>
            ))}
          </TableHeader>
          <tbody>
            {run.origins.map((o, k) => (
              <TableRow key={o.weekStart} data-testid={`mb-origin-${o.weekStart}`}>
                <TableCell>
                  <Data>{formatDate(o.weekStart)}</Data>
                </TableCell>
                <TableCell
                  className="text-xs text-text-secondary"
                  data-testid={`mb-origin-events-${o.weekStart}`}
                >
                  {o.events.length === 0
                    ? t('mb.origins.none')
                    : o.events
                        .map((e) =>
                          t(`mb.event.${e}`, {
                            year: o.ramadan ? o.ramadan.replace('H', '') + ' H' : ''
                          })
                        )
                        .join(', ')}
                </TableCell>
                {PORTFOLIO_SCENARIOS.map((sc) => (
                  <TableCell key={sc}>
                    <Data>{pct(portfolio(sc).perOrigin[k]?.fillRate)}</Data>
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </tbody>
        </Table>
        <p className="text-xs text-text-tertiary mt-3" data-testid="mb-origins-allowed">
          {t('mb.origins.allowed', {
            from: formatDate(run.replay.historyFrom ?? run.replay.from),
            firstOrigin: formatDate(run.replay.from)
          })}
        </p>
      </Section>

      <Section testId="mb-skus" title={t('mb.skus.title')} intro={t('mb.skus.intro')}>
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('mb.skus.col.sku')}</TableHeaderCell>
            <TableHeaderCell>{t('mb.skus.col.chosen')}</TableHeaderCell>
            <TableHeaderCell term="mbVsSap" />
            {columns.map((c) => (
              <TableHeaderCell key={c} term={CANDIDATE_TERM[c]} />
            ))}
          </TableHeader>
          <tbody>
            {run.skus.map((s) => (
              <TableRow
                key={s.skuCode}
                data-testid={`mb-sku-${s.skuCode}`}
                onClick={() => setSelected(s.skuCode)}
                // C2 (WCAG 4.1.2): aria-selected is not exposed on a plain table row; aria-current is.
                aria-current={current?.skuCode === s.skuCode}
                className={current?.skuCode === s.skuCode ? 'bg-action-soft' : ''}
              >
                <TableCell className="align-top">
                  <Data>{s.skuCode}</Data>
                  <div className="text-xs text-text-secondary">{s.brand}</div>
                </TableCell>
                <TableCell className="align-top">
                  <span data-testid={`mb-chosen-${s.skuCode}`}>
                    <StatusPill variant={s.selection.chosen === s.floor ? 'neutral' : 'info'}>
                      {t(`mb.candidate.${s.selection.chosen}`)}
                    </StatusPill>
                  </span>
                  <div className="text-xs text-text-tertiary mt-1">
                    {t(`mb.reason.${s.selection.reason}`)}
                  </div>
                </TableCell>
                <TableCell className="align-top">
                  <span data-testid={`mb-vs-${s.skuCode}`}>
                    <StatusPill variant={VS_VARIANT[s.chosenVersusSap]}>
                      {t(`mb.vs.${s.chosenVersusSap}`)}
                    </StatusPill>
                  </span>
                </TableCell>
                {columns.map((c) => (
                  <TableCell key={c} className="align-top">
                    <ScoreCell
                      s={s.scores.find((x) => x.candidate === c)}
                      chosen={c === s.selection.chosen}
                      testId={`mb-score-${s.skuCode}-${c}`}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </tbody>
        </Table>
      </Section>

      {current && <SkuDetail key={current.skuCode} sku={current} />}

      <Section
        testId="mb-materials"
        title={t('mb.materials.title')}
        intro={t('mb.materials.intro')}
      >
        <div className="mb-3">
          <FilterChipsBar
            options={[
              { id: 'all', label: t('mb.materials.all'), count: run.materials.length },
              {
                id: 'packaging',
                label: t('mb.materials.packaging'),
                count: run.materials.filter((m) => m.kind === 'packaging').length
              },
              {
                id: 'rawMaterial',
                label: t('mb.materials.rawMaterial'),
                count: run.materials.filter((m) => m.kind === 'rawMaterial').length
              }
            ]}
            value={kind}
            onChange={setKind}
          />
        </div>
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('mb.materials.col.material')}</TableHeaderCell>
            <TableHeaderCell term="mbMaterialLead" />
            <TableHeaderCell term="mbFillRate" />
            <TableHeaderCell term="mbPalletWeeks" />
            <TableHeaderCell term="mbChosenVsSap" />
          </TableHeader>
          <tbody>
            {materials.map((m) => (
              <TableRow key={m.materialCode} data-testid={`mb-material-${m.materialCode}`}>
                <TableCell>
                  <Data>{m.materialCode}</Data>
                  <div className="text-xs text-text-secondary">{t(`mb.materials.${m.kind}`)}</div>
                </TableCell>
                <TableCell className="text-xs text-text-secondary whitespace-nowrap">
                  {t('mb.materials.weeks', { count: m.leadWeeks })}
                </TableCell>
                <TableCell>
                  <Data className="whitespace-nowrap">
                    {m.scenarios.map((s) => pct(s.fillRate, 0)).join(' · ')}
                  </Data>
                </TableCell>
                <TableCell>
                  <Data className="whitespace-nowrap">
                    {m.scenarios.map((s) => whole(s.palletWeeks)).join(' · ')}
                  </Data>
                </TableCell>
                <TableCell>
                  <StatusPill variant={VS_VARIANT[m.chosenVersusSap]}>
                    {t(`mb.vs.${m.chosenVersusSap}`)}
                  </StatusPill>
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
        {run.unreplayedMaterials.length > 0 && (
          <p className="text-xs text-text-tertiary mt-3">
            {t('mb.materials.unreplayed', { materials: run.unreplayedMaterials.join(', ') })}
          </p>
        )}
      </Section>

      <Section testId="mb-masc" title={t('mb.masc.title')} intro={t('mb.masc.intro')}>
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('mb.masc.col.candidate')}</TableHeaderCell>
            <TableHeaderCell>{t('mb.masc.col.skus')}</TableHeaderCell>
            <TableHeaderCell>{t('mb.masc.col.min')}</TableHeaderCell>
            <TableHeaderCell>{t('mb.masc.col.p25')}</TableHeaderCell>
            <TableHeaderCell>{t('mb.masc.col.median')}</TableHeaderCell>
            <TableHeaderCell>{t('mb.masc.col.p75')}</TableHeaderCell>
            <TableHeaderCell>{t('mb.masc.col.max')}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {run.mascSpread.map((m) => (
              <TableRow key={m.candidate} data-testid={`mb-masc-${m.candidate}`}>
                <TableCell className="text-sm text-text-primary">
                  {t(`mb.candidate.${m.candidate}`)}
                </TableCell>
                <TableCell>
                  <Data>{m.values}</Data>
                </TableCell>
                <TableCell>
                  <Data>{two(m.min)}</Data>
                </TableCell>
                <TableCell>
                  <Data>{two(m.p25)}</Data>
                </TableCell>
                <TableCell>
                  <Data data-testid={`mb-masc-median-${m.candidate}`}>{two(m.median)}</Data>
                </TableCell>
                <TableCell>
                  <Data>{two(m.p75)}</Data>
                </TableCell>
                <TableCell>
                  <Data>{two(m.max)}</Data>
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
        <p
          className="text-xs text-text-secondary mt-3 flex items-center gap-1"
          data-testid="mb-scale-hint"
        >
          <TermTip term="MASC" />
          {t('fux.scale.masc')}
        </p>
        <p className="text-xs text-text-secondary mt-1" data-testid="mb-masc-limit">
          {run.mascLimit === null
            ? t('mb.masc.limitNotSet')
            : t('mb.masc.limitSet', { limit: two(run.mascLimit), excluded: limited })}
        </p>
      </Section>

      <Section testId="mb-decisions" title={t('mb.decisions.title')}>
        <div className="text-sm text-text-secondary space-y-2">
          <p data-testid="mb-decision-switch">{t('mb.decisions.switch')}</p>
          <p data-testid="mb-decision-limit">{t('mb.decisions.limit')}</p>
        </div>
      </Section>

      <section
        className="bg-bg-surface border border-border-subtle rounded-lg p-4 text-sm text-text-secondary space-y-2"
        data-testid="mb-definitions"
      >
        <h2 className="text-section text-text-primary">{t('mb.def.title')}</h2>
        <p>{t('mb.def.replay')}</p>
        <p>{t('mb.def.part')}</p>
        <p>{t('mb.def.measures')}</p>
        <p>{t('mb.def.select')}</p>
      </section>

      <AboutThisPage>
        <p>{t('mb.subtitle')}</p>
        <p data-testid="mb-synthetic-note">{t('mb.synthetic')}</p>
        <p data-testid="mb-not-switched">{t('mb.notSwitched')}</p>
        {run.mainModel === 'notBuilt' && (
          <p data-testid="mb-main-not-built">{t('mb.mainNotBuilt')}</p>
        )}
      </AboutThisPage>
    </AppShellV2>
  );
};

export default BuyerModelBacktest;
