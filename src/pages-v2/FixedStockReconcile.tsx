import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import SampleDataBadge from '../components/ui-v2/SampleDataBadge';
import KpiCard from '../components/ui-v2/KpiCard';
import Table from '../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../components/ui-v2/TableHeader';
import TableRow from '../components/ui-v2/TableRow';
import TableCell from '../components/ui-v2/TableCell';
import Data from '../components/ui-v2/Data';
import StatusPill from '../components/ui-v2/StatusPill';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import { formatDate, formatNumber } from '../lib/format';
import { useFixedStockReconcile } from '../services/query/hooks';
import type { FixedStockReconcileRow } from '../services/data/types';
import { FS_OUTCOME_ORDER, countByOutcome, type FsOutcome } from '../services/transitions/fixedStockReconcile';
import { FS_RECONCILE_CYCLE_WEEKS } from '../services/transitions/forecastConfig';
import { forecastNow } from './forecasts/forecastDisplay';

// ─────────────────────────────────────────────────────────────────────────────
// FIXED STOCK (FS) RECONCILE — REQ-E06-04 (ENG-D21, BL-134).
//
// Read-only. Per supplier × material × cycle: what the supplier committed
// (REQ-E06-02), what PTI called off (REQ-E09-03), what the supplier holds
// (REQ-E08-02), against the agreed maximum stock, and the outcome. A shortfall
// in call-offs is flagged "liability — not priced" (ENG-D17), never priced.
// The planner sees every supplier; the supplier sees its own rows (the service
// scopes them). Computed at read by `transitions/fixedStockReconcile`.
// ─────────────────────────────────────────────────────────────────────────────

const OUTCOME_VARIANT: Record<FsOutcome, 'success' | 'warning' | 'danger' | 'neutral'> = {
  supplierShort: 'danger',
  underCalled: 'warning',
  stockNotReported: 'neutral',
  overHeld: 'warning',
  balanced: 'success',
};

const Qty: React.FC<{ value: number; uom: string; testId?: string }> = ({ value, uom, testId }) => (
  <Data data-testid={testId}>{`${formatNumber(value)} ${uom}`}</Data>
);

const FixedStockReconcile: React.FC<{ persona: 'buyer' | 'supplier' }> = ({ persona }) => {
  const { t } = useTranslation();
  const query = useFixedStockReconcile();
  const [outcome, setOutcome] = useState<FsOutcome | null>(null);
  const isPti = persona === 'buyer';
  const crumb = [t(isPti ? 'hub.nav.section.forecast' : 'hub.nav.section.planning'), t('fsr.title')];

  const rows = useMemo(() => query.data?.items ?? [], [query.data]);
  const counts = useMemo(() => countByOutcome(rows), [rows]);
  const shown = useMemo(() => (outcome ? rows.filter((r) => r.outcome === outcome) : rows), [rows, outcome]);

  if (query.isPending) return <LoadingState breadcrumb={crumb} />;
  if (query.isError) return <ErrorState breadcrumb={crumb} error={query.error} onRetry={() => query.refetch()} />;

  const cols = isPti ? 10 : 9;

  const resultCell = (r: FixedStockReconcileRow) => (
    <div className="space-y-1">
      <StatusPill variant={OUTCOME_VARIANT[r.outcome]}>
        <span data-testid={`fsr-outcome-${r.key}`}>{t(`fsr.outcome.${r.outcome}`)}</span>
      </StatusPill>
      {r.liabilityQty > 0 && (
        <div className="text-xs text-text-secondary" data-testid={`fsr-liability-${r.key}`}>
          {t('fsr.liability')} <Qty value={r.liabilityQty} uom={r.uom} />
        </div>
      )}
      {r.shortQty > 0 && (
        <div className="text-xs text-text-secondary">
          {t('fsr.short')} <Qty value={r.shortQty} uom={r.uom} />
        </div>
      )}
      {r.aboveMaxQty > 0 && (
        <div className="text-xs text-text-secondary">
          {t('fsr.aboveMax')} <Qty value={r.aboveMaxQty} uom={r.uom} />
        </div>
      )}
      {r.calledBeyond > 0 && (
        <div className="text-xs text-text-secondary">
          {t('fsr.calledBeyond')} <Qty value={r.calledBeyond} uom={r.uom} />
        </div>
      )}
    </div>
  );

  return (
    <AppShellV2>
      <PageHeader breadcrumb={crumb} title={t('fsr.title')} subtitle={t(isPti ? 'fsr.subtitle.pti' : 'fsr.subtitle.sup')} />
      <PageMetaLine className="-mt-6 mb-4">
        {t('fsr.asOf')} <Data>{formatDate(forecastNow())}</Data>
        <SampleDataBadge className="ml-3 align-middle" />
      </PageMetaLine>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-5 mb-6" data-testid="fsr-summary">
        {FS_OUTCOME_ORDER.map((o) => (
          <KpiCard
            key={o}
            eyebrow={t(`fsr.outcome.${o}`)}
            value={<span data-testid={`fsr-count-${o}`}>{counts[o]}</span>}
            subtitle={<span className="text-text-tertiary">{t(`fsr.outcomeHint.${o}`)}</span>}
            active={outcome === o}
            onClick={() => setOutcome((cur) => (cur === o ? null : o))}
          />
        ))}
      </div>

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto mb-6">
        <Table>
          <TableHeader>
            {isPti && <TableHeaderCell>{t('fsr.col.supplier')}</TableHeaderCell>}
            <TableHeaderCell>{t('fsr.col.material')}</TableHeaderCell>
            <TableHeaderCell>{t('fsr.col.cycle')}</TableHeaderCell>
            <TableHeaderCell>{t('fsr.col.committed')}</TableHeaderCell>
            <TableHeaderCell>{t('fsr.col.calledOff')}</TableHeaderCell>
            <TableHeaderCell>{t('fsr.col.uncalled')}</TableHeaderCell>
            <TableHeaderCell>{t('fsr.col.held')}</TableHeaderCell>
            <TableHeaderCell>{t('fsr.col.maxStock')}</TableHeaderCell>
            <TableHeaderCell>{t('fsr.col.result')}</TableHeaderCell>
            <TableHeaderCell>{t('fsr.col.status')}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {shown.map((r) => (
              <TableRow key={r.key} data-testid={`fsr-row-${r.key}`}>
                {isPti && (
                  <TableCell className="align-top">
                    <div className="text-sm text-text-primary">{r.supplierName}</div>
                    <Data className="text-xs text-text-tertiary">{r.supplierId}</Data>
                  </TableCell>
                )}
                <TableCell className="align-top">
                  <Data>{r.materialCode}</Data>
                  <div className="text-xs text-text-tertiary">{r.materialLabel}</div>
                </TableCell>
                <TableCell className="align-top whitespace-nowrap">
                  <Data>{formatDate(r.cycleStart)}</Data> – <Data>{formatDate(r.cycleEnd)}</Data>
                  <div className="text-xs text-text-tertiary">{t(`fsr.cycleKind.${r.stream}`, { weeks: FS_RECONCILE_CYCLE_WEEKS })}</div>
                </TableCell>
                <TableCell className="align-top whitespace-nowrap">
                  <Qty value={r.committed} uom={r.uom} testId={`fsr-committed-${r.key}`} />
                  <div className="text-xs text-text-tertiary">
                    {t('fsr.periods', { committed: r.periodsCommitted, awaiting: r.periodsAwaiting })}
                  </div>
                </TableCell>
                <TableCell className="align-top whitespace-nowrap">
                  <Qty value={r.calledOff} uom={r.uom} testId={`fsr-called-${r.key}`} />
                  <div className="text-xs text-text-tertiary">{t('fsr.callOffCount', { count: r.callOffNumbers.length })}</div>
                </TableCell>
                <TableCell className="align-top whitespace-nowrap">
                  <Qty value={r.uncalled} uom={r.uom} testId={`fsr-uncalled-${r.key}`} />
                </TableCell>
                <TableCell className="align-top whitespace-nowrap">
                  {r.held === null ? (
                    <span className="text-sm text-text-tertiary" data-testid={`fsr-held-${r.key}`}>
                      {t('fsr.notReported')}
                    </span>
                  ) : (
                    <>
                      <Qty value={r.held} uom={r.uom} testId={`fsr-held-${r.key}`} />
                      {r.heldAt && (
                        <div className="text-xs text-text-tertiary">
                          {t('fsr.heldAt')} <Data>{formatDate(r.heldAt)}</Data>
                        </div>
                      )}
                    </>
                  )}
                </TableCell>
                <TableCell className="align-top">
                  {r.maxStock === null ? (
                    <span className="text-sm text-text-tertiary" data-testid={`fsr-max-${r.key}`}>
                      {t('fsr.noMax')}
                    </span>
                  ) : (
                    <Qty value={r.maxStock} uom={r.uom} testId={`fsr-max-${r.key}`} />
                  )}
                </TableCell>
                <TableCell className="align-top">{resultCell(r)}</TableCell>
                <TableCell className="align-top whitespace-nowrap">
                  <StatusPill variant="neutral">
                    <span data-testid={`fsr-state-${r.key}`}>{t(r.final ? 'fsr.final' : 'fsr.provisional')}</span>
                  </StatusPill>
                </TableCell>
              </TableRow>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={cols} className="text-center text-sm text-text-tertiary py-10" data-testid="fsr-empty">
                  {t('fsr.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      <section className="bg-bg-surface border border-border-subtle rounded-lg p-4 text-sm text-text-secondary space-y-2" data-testid="fsr-rules">
        <h2 className="text-section text-text-primary">{t('fsr.rules.title')}</h2>
        <p>{t('fsr.rules.cycle', { weeks: FS_RECONCILE_CYCLE_WEEKS })}</p>
        <p>{t('fsr.rules.figures')}</p>
        <p>{t('fsr.rules.outcomes')}</p>
        <p>{t('fsr.rules.liability')}</p>
        <p>{t('fsr.rules.provisional')}</p>
      </section>
    </AppShellV2>
  );
};

export const BuyerFixedStockReconcile: React.FC = () => <FixedStockReconcile persona="buyer" />;
export const SupplierFixedStockReconcile: React.FC = () => <FixedStockReconcile persona="supplier" />;

export default FixedStockReconcile;
