/** @import React from 'react' */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
/** @import { LucideIcon } from 'lucide-react' */
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Mail,
  MessageCircle,
  Globe,
  Send
} from 'lucide-react';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import {
  CHART_SERIES,
  CHART_SEMANTIC,
  CHART_MID,
  CHART_GRID,
  targetStatus,
  TARGET_STATUS
} from '@lib/chartPalette';
import PageHeader from '@components/ui-v2/PageHeader';
import Data from '@components/ui-v2/Data';
import TargetBar from '@components/ui-v2/TargetBar';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import FilterChipsBar from '@components/ui-v2/FilterChipsBar';
import KpiCard from '@components/ui-v2/KpiCard';
import PurposeHeader from '@components/forecast/PurposeHeader';
import SimulatedDataBanner from '@components/forecast/SimulatedDataBanner';
import DataAsOf from '@components/forecast/DataAsOf';
import { forecastTitle, linkTarget } from '@components/forecast/forecastPages';
import { FIELD_FOCUS_RING } from '@components/forecast/focusRing';
import { usePerformance } from './performance/performanceDisplay';
import KpiDefinitions from './performance/KpiDefinitions';
import UpdateComplianceCard from './performance/UpdateComplianceCard';
/** @import { PerformancePeriod } from '@services/data/performanceRules' */
import { GRADE_BANDS, PERFORMANCE_PERIODS } from '@services/data/performanceRules';
import StatusPill from '@components/ui-v2/StatusPill';
import { LEVEL_VARIANT } from './qualification/QualificationPanel';
import Button from '@components/ui-v2/Button';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import EmptyState from '@components/ui-v2/EmptyState';
import { useToast } from '@hooks/useToast';
import { useCategoryLabel } from '@hooks/useCategoryLabel';
import { useChannelLabel } from '@hooks/useChannelLabel';
import { useSupplierScorecards } from '@services/query/hooks';
import { isLive } from '@services/liveness';
/** @import { ScorecardKpi, ScorecardRadarAxis, ScorecardGradeLetter, CommLogEntry, KpiTrend } from '@services/data/types' */

/** @typedef {ScorecardGradeLetter} Grade */
/** @typedef {KpiTrend} Trend */

/** @type {Record<string, string>} */
const COUNTRY_FLAGS = {
  ID: '🇮🇩',
  CN: '🇨🇳',
  DE: '🇩🇪',
  FR: '🇫🇷',
  MY: '🇲🇾',
  SG: '🇸🇬'
};

/** @type {ScorecardRadarAxis[]} */
const TARGET_RADAR = [
  { axis: 'Delivery', value: 90 },
  { axis: 'Quality', value: 90 },
  { axis: 'Commercial', value: 90 },
  { axis: 'Responsiveness', value: 90 },
  { axis: 'Sustainability', value: 90 }
];

const OTIF_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
];

/** @type {Record<Grade, { stroke: string; soft: string; text: string }>} */
const GRADE_TONE = {
  A: {
    stroke: 'var(--pds-color-feedback-success)',
    soft: 'var(--pds-color-feedback-success-background)',
    text: 'text-success'
  },
  B: {
    stroke: 'var(--pds-color-feedback-info)',
    soft: 'var(--pds-color-feedback-info-background)',
    text: 'text-info'
  },
  C: {
    stroke: 'var(--pds-color-feedback-warning)',
    soft: 'var(--pds-color-feedback-warning-background)',
    text: 'text-warning-hover'
  },
  D: {
    stroke: 'var(--pds-color-feedback-danger)',
    soft: 'var(--pds-color-feedback-danger-background)',
    text: 'text-danger'
  }
};

/** @type {Record<CommLogEntry['status'], 'success' | 'warning' | 'neutral'>} */
const COMM_STATUS_VARIANT = {
  Completed: 'success',
  Resolved: 'success',
  Active: 'neutral',
  Open: 'warning'
};

// DP2-PALETTE-01: chart/UI colour sourced from the central palette (SSoT),
// not page-local hex. Values unchanged — pure de-dup.
const TOKEN_TEAL = CHART_SERIES[0];
const TOKEN_MID = CHART_MID;
const TOKEN_DANGER = CHART_SEMANTIC.danger;
const TOKEN_MUTED = CHART_SEMANTIC.neutral;
const TOKEN_BORDER = CHART_GRID;

/**
 * @typedef {object} ChartTooltipPayload
 * @property {string} name
 * @property {number} value
 * @property {string} [color]
 */
/**
 * @typedef {object} ChartTooltipProps
 * @property {boolean} [active]
 * @property {ChartTooltipPayload[]} [payload]
 * @property {string} [label]
 */

/** @type {React.FC<ChartTooltipProps>} */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg-surface border border-border-subtle rounded-md shadow-sm px-3 py-2 text-xs">
      <div className="font-semibold text-text-primary mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color }}>
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  );
};

/** @type {React.FC<{ grade: Grade }>} */
const GradeBadge = ({ grade }) => {
  const tone = GRADE_TONE[grade];
  return (
    <div
      className="w-20 h-20 rounded-full flex items-center justify-center"
      style={{
        backgroundColor: tone.soft,
        border: `4px solid ${tone.stroke}`
      }}
    >
      <span className="text-kpi" style={{ color: tone.stroke }}>
        {grade}
      </span>
    </div>
  );
};

/** @type {React.FC<{ trend: Trend }>} */
const TrendIcon = ({ trend }) => {
  if (trend === '↑') return <TrendingUp size={14} className="text-success" aria-hidden="true" />;
  if (trend === '↓') return <TrendingDown size={14} className="text-danger" aria-hidden="true" />;
  return <Minus size={14} className="text-text-tertiary" aria-hidden="true" />;
};

/** @type {React.FC<{ k: ScorecardKpi }>} */
const KpiProgressTile = ({ k }) => {
  const { t } = useTranslation();
  const status = targetStatus(k.pct, k.targetPct);
  return (
    <div className="bg-bg-hover border border-border-subtle rounded-md px-4 py-3">
      <div className="flex items-start justify-between gap-2 mb-1">
        {/* i18n-defer: k.name is a fixture-seeded KPI metric name (data) */}
        <div className="text-label text-text-tertiary uppercase">{k.name}</div>
        <TrendIcon trend={k.trend} />
      </div>
      <Data as="div" className="text-kpi" style={{ color: TARGET_STATUS[status].text }}>
        {k.value}
      </Data>
      <div className="text-label text-text-tertiary mb-2">
        {t('buyerScorecard.kpi.target')}: {k.target}
      </div>
      <TargetBar pct={k.pct} target={k.targetPct} trackClass="bg-bg-surface" />
    </div>
  );
};

/** @type {Record<string, LucideIcon>} */
const CHANNEL_ICON_MAP = {
  API: Send,
  'API Push': Send,
  Email: Mail,
  WhatsApp: MessageCircle,
  'Web Portal': Globe,
  Web: Globe
};

/**
 * @param {string} channel
 * @returns {LucideIcon}
 */
const channelIcon = (channel) => CHANNEL_ICON_MAP[channel] ?? Send;

/** @type {React.FC} */
const BuyerScorecard = () => {
  const { t } = useTranslation();
  const cl = useCategoryLabel();
  const chl = useChannelLabel();
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState(/** @type {string} */ ('sup-007'));
  // REQ-E10-01 BR-08 — the period is an INPUT to the measures, not a caption.
  const [period, setPeriod] = useState(/** @type {PerformancePeriod} */ ('90d'));

  const SCORECARD_CRUMB = [
    t('buyerScorecard.crumb.intelligence'),
    // FUX2-R4 (B6) — named by its menu label, so the title and both menus
    // (Review for MP, Performance for BUY) cannot drift.
    t('hub.nav.pti.performance')
  ];

  const scorecardsQuery = useSupplierScorecards();
  const suppliers = scorecardsQuery.data?.items ?? [];
  const perf = usePerformance(period);
  const PERIOD_OPTIONS = PERFORMANCE_PERIODS.map((id) => ({
    id,
    label: t(`perf.period.${id}`)
  }));

  if (scorecardsQuery.isPending) return <LoadingState breadcrumb={SCORECARD_CRUMB} />;
  if (scorecardsQuery.isError)
    return (
      <ErrorState
        breadcrumb={SCORECARD_CRUMB}
        error={scorecardsQuery.error}
        onRetry={() => scorecardsQuery.refetch()}
      />
    );
  if (suppliers.length === 0)
    return (
      <EmptyState
        breadcrumb={SCORECARD_CRUMB}
        title={t('buyerScorecard.empty.title')}
        subtitle={t('buyerScorecard.empty.subtitle')}
        message={t('buyerScorecard.empty.message')}
      />
    );

  const supp = suppliers.find((s) => s.id === selectedId) ?? suppliers[0];
  const compliance = supp.complianceIssue;
  // REQ-E10-01 — grade, score, OTIF, CFOT and the rejection counts are all read
  // from the calculated measures for the chosen period. "No history" is a real
  // answer here and is never rendered as 0%.
  const measure = perf.forSupplier(supp.id);

  const trendData = supp.otifTrend.map((v, i) => ({
    month: OTIF_MONTHS[i],
    otif: v,
    ackSpeed: supp.ackSpeedTrend[i],
    defect: supp.defectTrend[i]
  }));

  const radarData = supp.radar.map((r, i) => ({
    ...r,
    target: TARGET_RADAR[i]?.value ?? 90
  }));

  const latestCommDate = supp.commLog[0]?.date ?? '—';
  const improvementActions = supp.improvementActions ?? [];

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={SCORECARD_CRUMB}
        title={t('hub.nav.pti.performance')}
        subtitle={t('buyerScorecard.header.subtitle')}
        actions={
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className={`h-10 min-w-[260px] px-3 text-sm text-text-primary bg-bg-surface border border-border-input rounded-md focus:outline-none focus:border-action cursor-pointer ${FIELD_FOCUS_RING}`}
            aria-label={t('buyerScorecard.header.selectSupplier')}
          >
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        }
      />
      {/* Forecast UX phase 2, B6 (F-11, FUX-D2) — the one supplier-evaluation
          page states its decision and its place in the cycle for both roles that
          open it (Material Planner under Review, Procurement under Performance),
          carries the one simulated-data banner in place of the old "Sample data"
          label on the KPI section, and dates its figures. */}
      <PurposeHeader page="performance" />
      <SimulatedDataBanner capability="scorecards" />
      <DataAsOf date={perf.nowIso} />

      <PageMetaLine className="mb-6">
        {t(
          suppliers.length === 1
            ? 'buyerScorecard.meta.suppliers.one'
            : 'buyerScorecard.meta.suppliers.other',
          { count: suppliers.length }
        )}{' '}
        · {t('buyerScorecard.meta.lastActivity')} {latestCommDate} · {t('perf.periodLabel')}:{' '}
        {t(`perf.period.${period}`)}
      </PageMetaLine>

      <div className="mb-6">
        <FilterChipsBar options={PERIOD_OPTIONS} value={period} onChange={setPeriod} />
      </div>

      {/* REQ-E10-01 — the calculated half of the assessment. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
        <KpiCard
          eyebrow={t('perf.otif')}
          value={
            measure.otif.pct === null
              ? t('rfx.noHistory')
              : // BL-53 — no target colour: BL-19 set no target yet, only a
                // baseline period, so the figure is not judged against 90%.
                `${measure.otif.pct}%`
          }
          subtitle={
            <span className="text-text-tertiary" data-testid="scorecard-otif">
              {measure.otif.pct === null
                ? t('perf.noMeasured')
                : t('perf.measuredCallOffs', { count: measure.otif.measured })}
            </span>
          }
        />
        <KpiCard
          eyebrow={t('perf.cfot')}
          value={measure.cfot.pct === null ? t('rfx.noHistory') : `${measure.cfot.pct}%`}
          subtitle={
            <span className="text-text-tertiary">
              <span data-testid="scorecard-cfot">
                {measure.cfot.pct === null
                  ? t('perf.noMeasured')
                  : t('perf.measuredOrders', { count: measure.cfot.measured })}
              </span>
              {/* B6 (FUX-D5) — the basis, so this is not read as Supplier
                  reliability's "Confirmed-date lines delivered". */}
              <span className="block" data-testid="scorecard-cfot-basis">
                {t(`perf.cfot.basis.${period}`)}
              </span>
            </span>
          }
        />
        <KpiCard
          eyebrow={t('perf.rejections')}
          value={String(measure.rejections.total)}
          subtitle={
            <span className="text-text-tertiary" data-testid="scorecard-rejections">
              {t('perf.rejectionsSplit', {
                orders: measure.rejections.purchaseOrders,
                callOffs: measure.rejections.callOffs
              })}
            </span>
          }
        />
        <KpiCard
          eyebrow={t('perf.score')}
          value={measure.score === null ? t('rfx.noHistory') : `${measure.score}`}
          subtitle={<span className="text-text-tertiary">{t('perf.calculated')}</span>}
        />
      </div>

      {/* B6 (F-11) — the engine's plan-change measures live on Supplier reliability. */}
      <p
        className="-mt-3 mb-6 text-sm text-text-secondary"
        data-testid="scorecard-reliability-link"
      >
        {t('perf.reliabilityLink')} →{' '}
        <Link to={linkTarget('reliability').path} className="text-action-hover hover:underline">
          {forecastTitle(t, 'reliability')}
        </Link>
      </p>

      {/* Material B3 (MR-2, US-MAT-03) — the supplier's weekly update compliance. */}
      {/* B6 — while the page banner shows (scorecards not live), it carries the
          compliance card's "sample" fact too; the card's pill returns with no
          edit here once the scorecard feed is live. */}
      <UpdateComplianceCard
        compliance={measure.updateCompliance}
        testId="scorecard-update-compliance"
        livenessPill={isLive('scorecards')}
      />

      {/* BL-53 — the definitions behind OTIF and CFOT, and "Baseline period". */}
      <KpiDefinitions />

      {/* DP-1: the supplier identity hero restyles from a solid navy fill to a
          light surface — navy text, teal accents, semantic grade badge kept. */}
      <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="text-section text-text-primary mb-2">
              <span className="mr-2">{COUNTRY_FLAGS[supp.country] ?? '●'}</span>
              {supp.name}
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold bg-bg-hover text-text-secondary border border-border-subtle">
                {cl(supp.category)}
              </span>
              {/* i18n-defer: supp.tier is a composite fixture string
                  ("Tier 3 — API" …) — data, no central map; kept canonical EN. */}
              <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold bg-teal-soft text-teal-hover">
                {supp.tier}
              </span>
            </div>
            <div className="flex flex-wrap gap-5 text-xs text-text-secondary">
              <span>
                <span className="text-text-tertiary font-semibold">
                  {t('buyerScorecard.hero.sapBp')}:{' '}
                </span>
                {supp.sapBp}
              </span>
              <span>
                <span className="text-text-tertiary font-semibold">
                  {t('buyerScorecard.hero.channel')}:{' '}
                </span>
                {chl(supp.channel)}
              </span>
            </div>
            {compliance && (
              <div
                className={`mt-4 inline-flex items-center gap-2 rounded px-3 py-2 text-xs font-medium ${
                  compliance.level === 'expiring'
                    ? 'bg-warning-soft text-warning-hover'
                    : 'bg-danger-soft text-danger'
                }`}
              >
                <AlertTriangle size={14} />
                <span>
                  {t('buyerScorecard.hero.complianceAlert')}: {compliance.label}
                </span>
                <span className="ml-2 text-text-tertiary font-normal">
                  {t('buyerScorecard.hero.seeComplianceTracker')}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-2 shrink-0">
            {measure.grade === null ? (
              <div
                data-testid="scorecard-grade"
                className="text-sm font-semibold text-text-tertiary"
              >
                {t('rfx.noHistory')}
              </div>
            ) : (
              <>
                <GradeBadge grade={measure.grade} />
                <div
                  data-testid="scorecard-grade"
                  className="text-base font-bold text-text-primary"
                >
                  {measure.score}/100
                </div>
              </>
            )}
            <div className="text-meta text-text-tertiary text-center max-w-[12rem]">
              {t('perf.gradeBands', {
                bands: GRADE_BANDS.map((b) => `${b.grade} ${b.min}+`).join(' · ')
              })}
            </div>
            {/* Material G1 (MR-10 BR-09) — the free-text relationship status is
                retired; the standing shown is the vendor's computed level. */}
            {supp.qualification ? (
              <span data-testid="scorecard-qualification">
                <StatusPill variant={LEVEL_VARIANT[supp.qualification]}>
                  {t('qualification.scorecard.label', {
                    level: t(`qualification.level.${supp.qualification}`)
                  })}
                </StatusPill>
              </span>
            ) : null}
          </div>
        </div>
      </section>

      <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-6 mb-6">
        <h2 className="flex flex-wrap items-center gap-3 text-section text-text-primary mb-4 pb-3 border-b border-border-subtle">
          {/* D-CENSUS-8 — these rows are still authored: no hub data measures
              OTDR, acknowledgement speed, defect rate or sustainability. B6: the
              page-level SimulatedDataBanner now carries that fact. */}
          {t('buyerScorecard.kpi.title')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {supp.kpis.map((k) => (
            <KpiProgressTile key={k.name} k={k} />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-6">
        <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-6 relative overflow-hidden">
          <h2 className="text-section text-text-primary mb-4 pb-3 border-b border-border-subtle">
            {t('buyerScorecard.radar.title')}
          </h2>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
              <PolarGrid stroke={TOKEN_BORDER} />
              <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fill: TOKEN_MID }} />
              <PolarRadiusAxis
                domain={[0, 100]}
                tick={{ fontSize: 9, fill: TOKEN_MUTED }}
                axisLine={false}
                tickCount={6}
              />
              <Radar
                name={t('buyerScorecard.radar.benchmark')}
                dataKey="target"
                stroke={TOKEN_MID}
                fill="transparent"
                strokeDasharray="4 2"
              />
              <Radar
                name={supp.name.split(' ')[0]}
                dataKey="value"
                stroke={TOKEN_TEAL}
                fill={TOKEN_TEAL}
                fillOpacity={0.2}
                strokeWidth={2}
              />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
          {/* C2 (WCAG 1.1.1): the chart's figures, for a screen reader. */}
          {/* The card is `relative overflow-hidden` so this absolutely placed table, which grows to its content despite `sr-only`, cannot widen the page at phone size. */}
          <table className="sr-only" data-testid="scorecard-radar-table">
            <caption>{t('buyerScorecard.radar.title')}</caption>
            <thead>
              <tr>
                <th scope="col">{t('buyerScorecard.chart.area')}</th>
                <th scope="col">{supp.name}</th>
                <th scope="col">{t('buyerScorecard.radar.benchmark')}</th>
              </tr>
            </thead>
            <tbody>
              {radarData.map((r) => (
                <tr key={r.axis}>
                  <th scope="row">{r.axis}</th>
                  <td>{r.value}</td>
                  <td>{r.target}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-6 relative overflow-hidden">
          <h2 className="text-section text-text-primary mb-1 pb-3 border-b border-border-subtle">
            {t('buyerScorecard.trends.title')}
          </h2>
          <div className="text-meta text-text-tertiary mb-3 mt-3">
            {t('buyerScorecard.trends.caption')}
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trendData} margin={{ top: 10, right: 40, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={TOKEN_BORDER} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: TOKEN_MUTED }} />
              <YAxis yAxisId="pct" domain={[60, 100]} tick={{ fontSize: 10, fill: TOKEN_MUTED }} />
              <YAxis
                yAxisId="hrs"
                orientation="right"
                domain={[0, 40]}
                tick={{ fontSize: 10, fill: TOKEN_MUTED }}
                tickFormatter={/** @param {number} v */ (v) => `${v}h`}
              />
              <Tooltip content={<ChartTooltip />} />
              {/* BL-53 — the "OTIF target 90%" reference line is retired: BL-19
                  set no target yet, only a baseline period. */}
              <Line
                yAxisId="pct"
                type="monotone"
                dataKey="otif"
                stroke={TOKEN_TEAL}
                strokeWidth={2.5}
                dot={{ r: 3 }}
                name={t('buyerScorecard.series.otif')}
                activeDot={{ r: 5 }}
              />
              <Line
                yAxisId="hrs"
                type="monotone"
                dataKey="ackSpeed"
                stroke={TOKEN_MID}
                strokeWidth={1.5}
                dot={{ r: 2 }}
                name={t('buyerScorecard.series.ackSpeed')}
                strokeDasharray="4 2"
              />
              <Line
                yAxisId="pct"
                type="monotone"
                dataKey="defect"
                stroke={TOKEN_DANGER}
                strokeWidth={1.5}
                dot={{ r: 2 }}
                name={t('buyerScorecard.series.defectRate')}
                strokeDasharray="2 2"
              />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
            </LineChart>
          </ResponsiveContainer>
          {/* C2 (WCAG 1.1.1): the chart's figures, for a screen reader. */}
          <table className="sr-only" data-testid="scorecard-trend-table">
            <caption>{t('buyerScorecard.trends.title')}</caption>
            <thead>
              <tr>
                <th scope="col">{t('buyerScorecard.chart.month')}</th>
                <th scope="col">{t('buyerScorecard.series.otif')}</th>
                <th scope="col">{t('buyerScorecard.series.ackSpeed')}</th>
                <th scope="col">{t('buyerScorecard.series.defectRate')}</th>
              </tr>
            </thead>
            <tbody>
              {trendData.map((d) => (
                <tr key={d.month}>
                  <th scope="row">{d.month}</th>
                  <td>{d.otif}</td>
                  <td>{d.ackSpeed}</td>
                  <td>{d.defect}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      {supp.impPlan && (
        <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-6 mb-6">
          <div className="bg-danger-soft border-l-2 border-danger rounded px-4 py-3 mb-4 text-sm text-danger font-semibold flex items-center gap-2">
            <AlertTriangle size={14} />
            {t('buyerScorecard.imp.banner')}
          </div>
          <h2 className="text-section text-text-primary mb-4 pb-3 border-b border-border-subtle">
            {t('buyerScorecard.imp.title')}
          </h2>
          <div className="flex flex-col gap-2 mb-4">
            {improvementActions.map((a) => (
              <div
                key={a.item}
                className="flex items-center justify-between gap-3 px-4 py-3 bg-danger-soft/40 border border-danger-soft rounded-md"
              >
                <div className="min-w-0">
                  {/* i18n-defer: a.item is fixture action-item narrative (data) */}
                  <div className="text-sm font-semibold text-text-primary">{a.item}</div>
                  <div className="text-xs text-text-tertiary mt-0.5">
                    {t('buyerScorecard.imp.owner')}: {a.owner}
                  </div>
                </div>
                <div className="text-right shrink-0 flex flex-col items-end gap-1">
                  <div className="text-xs text-text-tertiary">
                    {t('buyerScorecard.imp.due')}: {a.due}
                  </div>
                  <StatusPill variant="neutral">{a.status}</StatusPill>
                </div>
              </div>
            ))}
          </div>
          <Button
            variant="outline"
            icon={Mail}
            onClick={() =>
              toast({
                variant: 'success',
                title: t('buyerScorecard.imp.toast.title', { name: supp.name }),
                description: t('buyerScorecard.imp.toast.desc')
              })
            }
          >
            {t('buyerScorecard.imp.send')}
          </Button>
        </section>
      )}

      <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-6">
        <h2 className="text-section text-text-primary mb-4 pb-3 border-b border-border-subtle">
          {t('buyerScorecard.comm.title')}
        </h2>
        {supp.commLog.length === 0 ? (
          <div className="text-sm text-text-tertiary text-center py-6">
            {t('buyerScorecard.comm.empty')}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {supp.commLog.map((log) => {
              const Icon = channelIcon(log.channel);
              return (
                <div
                  // CommLogEntry has no id. Date + type + message names one
                  // event: the message quotes the document number it concerns.
                  key={`${log.date}|${log.type}|${log.message}`}
                  className="flex items-start gap-4 px-4 py-3 bg-bg-hover border border-border-subtle rounded-md"
                >
                  <div className="shrink-0 text-center min-w-[88px]">
                    <div className="text-xs text-text-tertiary whitespace-nowrap">{log.date}</div>
                    <div className="inline-flex items-center gap-1 text-xs text-teal-hover font-semibold mt-1">
                      <Icon size={12} />
                      {chl(log.channel)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    {/* i18n-defer: log.type + log.message are fixture comm-log
                        narrative (data) — kept canonical EN. */}
                    <div className="text-xs font-bold text-text-secondary mb-0.5">{log.type}</div>
                    <div className="text-sm text-text-secondary">{log.message}</div>
                  </div>
                  <StatusPill variant={COMM_STATUS_VARIANT[log.status]}>{log.status}</StatusPill>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </AppShellV2>
  );
};

export default BuyerScorecard;
