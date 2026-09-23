import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowUp } from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import LivenessPill from '../components/ui-v2/LivenessPill';
import FilterChipsBar from '../components/ui-v2/FilterChipsBar';
import KpiCard from '../components/ui-v2/KpiCard';
import Table from '../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../components/ui-v2/TableHeader';
import TableRow from '../components/ui-v2/TableRow';
import TableCell from '../components/ui-v2/TableCell';
import Data from '../components/ui-v2/Data';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import { formatDate } from '../lib/format';
import { useSupplierReliability } from '../services/query/hooks';
import { RELIABILITY_WINDOWS, type ReliabilityWindowWeeks, type SupplierReliabilityView } from '../services/data/types';
import { portfolioReliability } from '../services/engine/reliability';
import { MissSplitLine, Rate, mascOf, pctOf } from './reliability/reliabilityDisplay';

// ─────────────────────────────────────────────────────────────────────────────
// SUPPLIER RELIABILITY — REQ-E14-02 (BL-99), the Material Planner's view.
//
// Read-only. Per supplier: confirmation by the deadline (BR-01), delivery
// against the commitment (BR-02), the missed lines split by cause (BR-03/04),
// and PTI's own plan changes on that supplier's materials (BR-05) — share of
// lines changed inside the lead time and MASC / MASC-I. Every figure is
// computed by the forecast engine at read time on its SYNTHETIC dataset, and
// the page says so (the `engineDataset` pill, X-03).
//
// CFOT is deliberately absent: it waits on BL-66 (REQ-E14-02 open item), and
// the page states that in words rather than showing a figure it cannot stand
// behind.
// ─────────────────────────────────────────────────────────────────────────────

type SortDir = 'ascending' | 'descending';

/** Lowest confirmation first by default — the biggest lever reads first. Rows with no history go last. */
function sortRows(rows: readonly SupplierReliabilityView[], dir: SortDir): SupplierReliabilityView[] {
  return [...rows].sort((a, b) => {
    const x = a.confirmation.rate;
    const y = b.confirmation.rate;
    if (x === null && y === null) return a.supplierId.localeCompare(b.supplierId);
    if (x === null) return 1;
    if (y === null) return -1;
    return dir === 'ascending' ? x - y || a.supplierId.localeCompare(b.supplierId) : y - x || a.supplierId.localeCompare(b.supplierId);
  });
}

const BuyerReliability: React.FC = () => {
  const { t } = useTranslation();
  const [weeks, setWeeks] = useState<ReliabilityWindowWeeks>(26);
  const [dir, setDir] = useState<SortDir>('ascending');
  const query = useSupplierReliability(weeks);
  const crumb = [t('hub.nav.section.forecast'), t('rel.pti.title')];

  const rows = useMemo(() => query.data?.items ?? [], [query.data]);
  const sorted = useMemo(() => sortRows(rows, dir), [rows, dir]);
  const total = useMemo(() => portfolioReliability(rows), [rows]);

  if (query.isPending) return <LoadingState breadcrumb={crumb} />;
  if (query.isError) return <ErrorState breadcrumb={crumb} error={query.error} onRetry={() => query.refetch()} />;

  const first = rows[0];
  const windowOptions = RELIABILITY_WINDOWS.map((w) => ({ id: String(w), label: t(`rel.window.${w}`) }));

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={crumb}
        title={t('rel.pti.title')}
        subtitle={t('rel.pti.subtitle')}
        actions={<LivenessPill capability="engineDataset" />}
      />
      <PageMetaLine className="-mt-6 mb-2">
        {first && (
          <>
            {t('rel.windowLabel')} <Data>{formatDate(first.windowFrom)}</Data> – <Data>{formatDate(first.windowTo)}</Data>
          </>
        )}
      </PageMetaLine>
      <p className="text-xs text-text-tertiary mb-1" data-testid="rel-synthetic-note">
        {t('rel.synthetic')}
      </p>
      <p className="text-xs text-text-tertiary mb-4" data-testid="rel-cfot-pending">
        {t('rel.cfotPending')}
      </p>

      <div className="mb-4">
        <FilterChipsBar<string>
          options={windowOptions}
          value={String(weeks)}
          onChange={(id) => setWeeks(Number(id) as ReliabilityWindowWeeks)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6" data-testid="rel-portfolio">
        <KpiCard
          eyebrow={t('rel.kpi.confirmation')}
          value={pctOf(total.confirmation.rate) ?? t('rel.noData')}
          subtitle={
            <span className="text-text-tertiary">
              {t('rel.kpi.confirmation.sub', { confirmed: total.confirmation.confirmed, due: total.confirmation.due })}
            </span>
          }
        />
        <KpiCard
          eyebrow={t('rel.kpi.commitment')}
          value={pctOf(total.commitment.rate) ?? t('rel.noData')}
          subtitle={<span className="text-text-tertiary">{t('rel.kpi.commitment.sub')}</span>}
        />
        <KpiCard
          eyebrow={t('rel.kpi.misses')}
          value={String(total.misses.total)}
          subtitle={
            <span className="text-text-tertiary">
              {t('rel.kpi.misses.sub', {
                never: total.misses.neverConfirmed,
                supplier: total.misses.supplierCaused,
                pti: total.misses.ptiCaused,
              })}
            </span>
          }
        />
        <KpiCard
          eyebrow={t('rel.kpi.planChange')}
          value={pctOf(total.planChange.share) ?? t('rel.noData')}
          subtitle={
            <span className="text-text-tertiary">
              {t('rel.kpi.planChange.sub', {
                changed: total.planChange.changedInsideLeadTime,
                schedules: total.planChange.schedules,
              })}
            </span>
          }
        />
      </div>

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto mb-6">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('rel.col.supplier')}</TableHeaderCell>
            <TableHeaderCell ariaSort={dir}>
              <button
                type="button"
                className="inline-flex items-center gap-1 uppercase hover:text-action"
                onClick={() => setDir((d) => (d === 'ascending' ? 'descending' : 'ascending'))}
                aria-label={t(dir === 'ascending' ? 'rel.sort.descending' : 'rel.sort.ascending')}
                data-testid="rel-sort-confirmation"
              >
                {t('rel.col.confirmation')}
                {dir === 'ascending' ? <ArrowUp size={12} aria-hidden="true" /> : <ArrowDown size={12} aria-hidden="true" />}
              </button>
            </TableHeaderCell>
            <TableHeaderCell>{t('rel.col.commitment')}</TableHeaderCell>
            <TableHeaderCell>{t('rel.col.misses')}</TableHeaderCell>
            <TableHeaderCell>{t('rel.col.planChange')}</TableHeaderCell>
            <TableHeaderCell>{t('rel.col.masc')}</TableHeaderCell>
            <TableHeaderCell>{t('rel.col.mascI')}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {sorted.map((r) => (
              <TableRow key={r.supplierId} data-testid={`rel-row-${r.supplierId}`}>
                <TableCell className="align-top">
                  <div className="text-sm text-text-primary">{r.supplierName}</div>
                  <Data className="text-xs text-text-tertiary">{r.supplierId}</Data>
                </TableCell>
                <TableCell className="align-top whitespace-nowrap">
                  <Rate value={pctOf(r.confirmation.rate)} testId={`rel-confirmation-${r.supplierId}`} />
                  <div className="text-xs text-text-tertiary">
                    <Data>{r.confirmation.confirmed}</Data> / <Data>{r.confirmation.due}</Data>
                  </div>
                </TableCell>
                <TableCell className="align-top whitespace-nowrap">
                  <Rate value={pctOf(r.commitment.rate)} testId={`rel-commitment-${r.supplierId}`} />
                </TableCell>
                <TableCell className="align-top">
                  <Data data-testid={`rel-misses-${r.supplierId}`}>{r.misses.total}</Data>
                  <div>
                    <MissSplitLine split={r.misses} testId={`rel-split-${r.supplierId}`} />
                  </div>
                </TableCell>
                <TableCell className="align-top whitespace-nowrap">
                  <Rate value={pctOf(r.planChange.share)} testId={`rel-planchange-${r.supplierId}`} />
                  <div className="text-xs text-text-tertiary">
                    <Data>{r.planChange.changedInsideLeadTime}</Data> / <Data>{r.planChange.schedules}</Data>
                  </div>
                </TableCell>
                <TableCell className="align-top whitespace-nowrap">
                  <Rate value={mascOf(r.planChange.masc)} testId={`rel-masc-${r.supplierId}`} />
                </TableCell>
                <TableCell className="align-top whitespace-nowrap">
                  <Rate value={mascOf(r.planChange.mascI)} />
                </TableCell>
              </TableRow>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-sm text-text-tertiary py-10">
                  {t('rel.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      <section className="bg-bg-surface border border-border-subtle rounded-lg p-4 text-sm text-text-secondary space-y-2" data-testid="rel-definitions">
        <h2 className="text-section text-text-primary">{t('rel.def.title')}</h2>
        <p>{t('rel.def.confirmation')}</p>
        <p>{t('rel.def.commitment')}</p>
        <p>{t('rel.def.misses')}</p>
        <p>{t('rel.def.planChange')}</p>
        <p>{t('rel.def.masc')}</p>
      </section>
    </AppShellV2>
  );
};

export default BuyerReliability;
