import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import KpiCard from '@components/ui-v2/KpiCard';
import StatusPill from '@components/ui-v2/StatusPill';
import Button from '@components/ui-v2/Button';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import Data from '@components/ui-v2/Data';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import { formatDate, formatDateTime, formatNumber } from '@lib/format';
import PurposeHeader from '@components/forecast/PurposeHeader';
import SimulatedDataBanner from '@components/forecast/SimulatedDataBanner';
import AboutThisPage from '@components/forecast/AboutThisPage';
import DataAsOf from '@components/forecast/DataAsOf';
import { forecastCrumb, forecastTitle } from '@components/forecast/forecastPages';
import { useDataHealth } from '@services/query/hooks';
import type { CheckId, CheckResult, FeedHealth, Freshness, StepStatus } from '@services/engine/dataHealth';

// ─────────────────────────────────────────────────────────────────────────────
// DATA HEALTH — REQ-E14-01, the Material Planner's view (AC-01).
//
// Read-only. Per feed the engine reads: its owner, refresh, last arrival and
// age against the administrator's freshness limit (X-05), its record count,
// and each quality check from the feed spec with pass or fail. Selecting a
// feed shows its checks; a failing check drills into its records by key. The
// engine steps panel names which calculations a stale feed or a failed check
// would affect.
//
// Computed at read time on the engine's SYNTHETIC dataset (the `engineDataset`
// pill, X-03). Nothing here is restated: every figure is the report's own.
// ─────────────────────────────────────────────────────────────────────────────

/** How many failing records the drill-in lists before "and N more". */
const RECORD_LIMIT = 100;

const FRESH_VARIANT: Record<Freshness, 'success' | 'warning' | 'danger' | 'neutral'> = {
  fresh: 'success',
  stale: 'warning',
  missing: 'danger',
  noLimit: 'neutral',
};

const STEP_VARIANT: Record<StepStatus, 'success' | 'warning' | 'danger'> = {
  clear: 'success',
  flagged: 'warning',
  affected: 'danger',
};

const CheckDetail: React.FC<{ feed: FeedHealth; tolerance: string }> = ({ feed, tolerance }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState<CheckId | null>(feed.checks.find((c) => !c.passed)?.check ?? null);
  const current: CheckResult | null = feed.checks.find((c) => c.check === open && !c.passed) ?? null;
  const days = (n: number | null) => (n === null ? '—' : t('dh.days', { count: n }));
  return (
    <section className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-6" data-testid="dh-detail">
      <h2 className="text-section text-text-primary mb-3">
        {t('dh.detail.title')} · {t(`dh.feed.${feed.feed}`)} <Data className="text-text-tertiary">{feed.entity}</Data>
      </h2>
      <div className="overflow-x-auto mb-4">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('dh.detail.check')}</TableHeaderCell>
            <TableHeaderCell>{t('dh.detail.severity')}</TableHeaderCell>
            <TableHeaderCell>{t('dh.detail.checked')}</TableHeaderCell>
            <TableHeaderCell>{t('dh.detail.failing')}</TableHeaderCell>
            <TableHeaderCell>{t('dh.detail.result')}</TableHeaderCell>
            <TableHeaderCell>{''}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {feed.checks.map((c) => (
              <TableRow key={c.check} data-testid={`dh-check-${c.check}`}>
                <TableCell className="text-sm">{t(`dh.check.${c.check}`, { tolerance })}</TableCell>
                <TableCell className="text-xs text-text-secondary">{t(`dh.severity.${c.severity}`)}</TableCell>
                <TableCell>
                  <Data>{formatNumber(c.checked)}</Data>
                </TableCell>
                <TableCell>
                  <Data data-testid={`dh-check-failing-${c.check}`}>{formatNumber(c.failures.length)}</Data>
                </TableCell>
                <TableCell>
                  {c.passed ? (
                    <StatusPill variant="success">{t('dh.detail.pass')}</StatusPill>
                  ) : (
                    <StatusPill variant={c.severity === 'flag' ? 'warning' : 'danger'}>{t('dh.detail.fail')}</StatusPill>
                  )}
                </TableCell>
                <TableCell>
                  {!c.passed && (
                    <Button variant="outline" onClick={() => setOpen(c.check)} data-testid={`dh-show-${c.check}`}>
                      {t('dh.detail.show')}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
      </div>

      {current && (
        <div className="mb-4" data-testid="dh-records">
          <h3 className="text-sm font-medium text-text-primary mb-2">
            {t('dh.records.title')} · {t(`dh.check.${current.check}`, { tolerance })}
          </h3>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableHeaderCell>{t('dh.records.key')}</TableHeaderCell>
                <TableHeaderCell>{t('dh.records.detail')}</TableHeaderCell>
              </TableHeader>
              <tbody>
                {/* A failure's key is the failing record's key, which repeats
                    when the feed itself holds duplicates (what this page
                    reports). The list is read-only and replaced whole per
                    check, so the index suffix only separates those repeats. */}
                {current.failures.slice(0, RECORD_LIMIT).map((f, i) => (
                  // eslint-disable-next-line react/no-array-index-key -- read-only check output; record keys can repeat
                  <TableRow key={`${f.key}#${i}`} data-testid={`dh-record-${f.key}`}>
                    <TableCell>
                      <Data>{f.key}</Data>
                    </TableCell>
                    <TableCell>
                      <Data>{f.detail}</Data>
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          </div>
          {current.failures.length > RECORD_LIMIT && (
            <p className="text-xs text-text-tertiary mt-1">{t('dh.records.more', { count: current.failures.length - RECORD_LIMIT })}</p>
          )}
        </div>
      )}

      {feed.warehouses && (
        <div data-testid="dh-warehouses">
          <h3 className="text-sm font-medium text-text-primary mb-1">{t('dh.wh.title')}</h3>
          <p className="text-xs text-text-tertiary mb-2">{t('dh.wh.intro')}</p>
          <Table>
            <TableHeader>
              <TableHeaderCell>{t('dh.wh.warehouse')}</TableHeaderCell>
              <TableHeaderCell>{t('dh.wh.latest')}</TableHeaderCell>
              <TableHeaderCell>{t('dh.col.freshness')}</TableHeaderCell>
              <TableHeaderCell>{t('dh.wh.materials')}</TableHeaderCell>
            </TableHeader>
            <tbody>
              {feed.warehouses.map((w) => (
                <TableRow key={w.warehouseId} data-testid={`dh-wh-${w.warehouseId}`}>
                  <TableCell>
                    <Data>{w.warehouseId}</Data>
                  </TableCell>
                  <TableCell>
                    <Data>{w.latestSnapshot ? formatDate(w.latestSnapshot) : t('dh.never')}</Data>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <StatusPill variant={FRESH_VARIANT[w.freshness]}>{t(`dh.fresh.${w.freshness}`)}</StatusPill>{' '}
                    <span className="text-xs text-text-tertiary">{t('dh.age', { age: days(w.ageDays), limit: days(feed.limitDays) })}</span>
                  </TableCell>
                  <TableCell>
                    <Data>{formatNumber(w.materials.length)}</Data>
                  </TableCell>
                </TableRow>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </section>
  );
};

const BuyerDataHealth: React.FC = () => {
  const { t } = useTranslation();
  const query = useDataHealth();
  const crumb = forecastCrumb(t, 'dataHealth');
  const report = query.data ?? null;
  const feeds = useMemo(() => report?.feeds ?? [], [report]);
  const [selected, setSelected] = useState<string | null>(null);
  // Until the planner picks one, the first feed with a failing check is open.
  const current = feeds.find((f) => f.feed === selected) ?? feeds.find((f) => f.checks.some((c) => !c.passed)) ?? null;

  if (query.isPending) return <LoadingState breadcrumb={crumb} />;
  if (query.isError) return <ErrorState breadcrumb={crumb} error={query.error} onRetry={() => query.refetch()} />;

  const tolerance = `${Math.round((report?.stockAccuracyTolerance ?? 0) * 1000) / 10}%`;
  const days = (n: number | null) => (n === null ? '—' : t('dh.days', { count: n }));
  const checks = feeds.flatMap((f) => f.checks);
  const stale = feeds.filter((f) => f.freshness === 'stale' || f.freshness === 'missing').length;
  const refused = feeds.reduce((s, f) => s + f.refusedRecords, 0);
  const flagged = feeds.reduce((s, f) => s + f.flaggedRecords, 0);

  return (
    <AppShellV2>
      <PageHeader breadcrumb={crumb} title={forecastTitle(t, 'dataHealth')} />
      <PurposeHeader page="dataHealth" />
      <SimulatedDataBanner capability="engineDataset" />
      <DataAsOf date={report?.asOf ?? null} withTime />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6" data-testid="dh-kpis">
        <KpiCard
          eyebrow={t('dh.kpi.feeds')}
          value={<span data-testid="dh-kpi-feeds">{feeds.length}</span>}
          subtitle={
            <span className="text-text-tertiary">
              {t('dh.kpi.feeds.sub', { mdm: feeds.filter((f) => f.source === 'mdm').length, hub: feeds.filter((f) => f.source === 'hub').length })}
            </span>
          }
        />
        <KpiCard
          eyebrow={t('dh.kpi.stale')}
          value={<span data-testid="dh-kpi-stale">{stale}</span>}
          subtitle={<span className="text-text-tertiary">{t('dh.kpi.stale.sub')}</span>}
        />
        <KpiCard
          eyebrow={t('dh.kpi.checks')}
          value={<span data-testid="dh-kpi-checks">{checks.filter((c) => !c.passed).length}</span>}
          subtitle={<span className="text-text-tertiary">{t('dh.kpi.checks.sub', { total: checks.length })}</span>}
        />
        <KpiCard
          eyebrow={t('dh.kpi.records')}
          value={<span data-testid="dh-kpi-refused">{formatNumber(refused)}</span>}
          subtitle={
            <span className="text-text-tertiary" data-testid="dh-kpi-flagged">
              {t('dh.kpi.records.sub', { flagged: formatNumber(flagged) })}
            </span>
          }
        />
      </div>

      <section className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-6" data-testid="dh-steps">
        <h2 className="text-section text-text-primary mb-1">{t('dh.steps.title')}</h2>
        <p className="text-xs text-text-tertiary mb-3">{t('dh.steps.intro')}</p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {(report?.steps ?? []).map((s) => (
            <li key={s.step} className="border border-border-subtle rounded p-3" data-testid={`dh-step-${s.step}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-text-primary">{t(`dh.step.${s.step}`)}</span>
                <StatusPill variant={STEP_VARIANT[s.status]}>{t(`dh.steps.${s.status}`)}</StatusPill>
              </div>
              {s.byFeeds.length > 0 && (
                <div className="text-xs text-text-secondary mt-1" data-testid={`dh-step-by-${s.step}`}>
                  {t('dh.steps.by', { feeds: s.byFeeds.map((f) => t(`dh.feed.${f}`)).join(', ') })}
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto mb-6">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('dh.col.feed')}</TableHeaderCell>
            <TableHeaderCell>{t('dh.col.owner')}</TableHeaderCell>
            <TableHeaderCell>{t('dh.col.refresh')}</TableHeaderCell>
            <TableHeaderCell>{t('dh.col.arrival')}</TableHeaderCell>
            <TableHeaderCell>{t('dh.col.freshness')}</TableHeaderCell>
            <TableHeaderCell>{t('dh.col.records')}</TableHeaderCell>
            <TableHeaderCell>{t('dh.col.checks')}</TableHeaderCell>
            <TableHeaderCell>{t('dh.col.affects')}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {feeds.map((f) => {
              const failing = f.checks.filter((c) => !c.passed);
              return (
                <TableRow
                  key={f.feed}
                  data-testid={`dh-row-${f.feed}`}
                  onClick={() => setSelected(f.feed)}
                  // C2 (WCAG 4.1.2): aria-selected is not exposed on a plain table row; aria-current is.
                  aria-current={current?.feed === f.feed}
                  className={current?.feed === f.feed ? 'bg-action-soft' : ''}
                >
                  <TableCell className="align-top">
                    <div className="text-sm text-text-primary">{t(`dh.feed.${f.feed}`)}</div>
                    <Data className="text-xs text-text-tertiary">{f.entity}</Data>
                  </TableCell>
                  <TableCell className="align-top text-xs text-text-secondary" data-testid={`dh-owner-${f.feed}`}>
                    {t(`dh.owner.${f.source}`)}
                  </TableCell>
                  <TableCell className="align-top text-xs text-text-secondary">{t(`dh.refresh.${f.refresh}`)}</TableCell>
                  <TableCell className="align-top">
                    <Data data-testid={`dh-arrival-${f.feed}`}>{f.lastArrival ? formatDateTime(f.lastArrival) : t('dh.never')}</Data>
                  </TableCell>
                  <TableCell className="align-top whitespace-nowrap">
                    <span data-testid={`dh-fresh-${f.feed}`}>
                      <StatusPill variant={FRESH_VARIANT[f.freshness]}>{t(`dh.fresh.${f.freshness}`)}</StatusPill>
                    </span>
                    {f.limitDays !== null && (
                      <div className="text-xs text-text-tertiary" data-testid={`dh-age-${f.feed}`}>
                        {t('dh.age', { age: days(f.ageDays), limit: days(f.limitDays) })}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="align-top">
                    <Data data-testid={`dh-records-${f.feed}`}>{formatNumber(f.records)}</Data>
                  </TableCell>
                  <TableCell className="align-top whitespace-nowrap" data-testid={`dh-checks-${f.feed}`}>
                    {failing.length === 0 ? (
                      <StatusPill variant="success">{t('dh.checks.allPass')}</StatusPill>
                    ) : (
                      <StatusPill variant={failing.every((c) => c.severity === 'flag') ? 'warning' : 'danger'}>
                        {t('dh.checks.passed', { passed: f.checks.length - failing.length, total: f.checks.length })}
                      </StatusPill>
                    )}
                  </TableCell>
                  <TableCell className="align-top text-xs text-text-secondary" data-testid={`dh-affects-${f.feed}`}>
                    {/* F-18: the steps by their page names, not their requirement codes. */}
                    {f.affects.map((step) => t(`dh.step.${step}`)).join(' · ')}
                  </TableCell>
                </TableRow>
              );
            })}
          </tbody>
        </Table>
      </div>

      {current ? <CheckDetail key={current.feed} feed={current} tolerance={tolerance} /> : <p className="text-sm text-text-tertiary mb-6">{t('dh.detail.select')}</p>}

      <section className="bg-bg-surface border border-border-subtle rounded-lg p-4 text-sm text-text-secondary space-y-2" data-testid="dh-definitions">
        <h2 className="text-section text-text-primary">{t('dh.def.title')}</h2>
        <p>{t('dh.def.freshness')}</p>
        <p>{t('dh.def.refuse')}</p>
        <p>{t('dh.def.flag')}</p>
      </section>

      <AboutThisPage>
        <p>{t('dh.subtitle')}</p>
        <p data-testid="dh-synthetic-note">{t('dh.synthetic')}</p>
        <p data-testid="dh-owner-note">{t('dh.owner')}</p>
        <p data-testid="dh-not-built">{t('dh.notBuilt')}</p>
        <p>{t('dh.limitsWhere')}</p>
      </AboutThisPage>
    </AppShellV2>
  );
};

export default BuyerDataHealth;
