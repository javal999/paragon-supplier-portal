import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import SampleDataBadge from '@components/ui-v2/SampleDataBadge';
import KpiCard from '@components/ui-v2/KpiCard';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import StatusPill from '@components/ui-v2/StatusPill';
import SidePanel from '@components/ui-v2/SidePanel';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import PurposeHeader from '@components/forecast/PurposeHeader';
import SimulatedDataBanner from '@components/forecast/SimulatedDataBanner';
import AboutThisPage from '@components/forecast/AboutThisPage';
import DataAsOf from '@components/forecast/DataAsOf';
import { forecastCrumb, forecastTitle } from '@components/forecast/forecastPages';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { useRefusalText } from '@hooks/useRefusalText';
import { useToast } from '@hooks/useToast';
import { formatDate, formatNumber } from '@lib/format';
import { useFixedStockReconcile } from '@services/query/hooks';
import { useMaxStockSet } from '@services/query/commandHooks';
import type { FixedStockReconcileRow } from '@services/data/types';
import { FS_OUTCOME_ORDER, countByOutcome, type FsOutcome } from '@services/transitions/fixedStockReconcile';
import { fsReconcileCycleWeeks } from '@services/transitions/forecastConfig';
import { maxStockRefusal } from '@services/transitions/maxStock';
import { daysBetween } from '@services/engine/dates';
import { forecastNow } from './forecasts/forecastDisplay';
import { inputClass, labelClass } from './inventory/inventoryDisplay';

// ─────────────────────────────────────────────────────────────────────────────
// FIXED STOCK (FS) RECONCILE — REQ-E06-04 (ENG-D21, BL-134; owner 2026-09-29).
//
// Per supplier × material × cycle: what the supplier committed (REQ-E06-02),
// what it accepted of PTI's call-offs (REQ-E09-03), what it holds (REQ-E08-02),
// against the maximum stock Procurement maintains, and the outcome. A shortfall
// in call-offs is flagged "liability — not priced" (ENG-D17), never priced.
// The planner sees every supplier; the supplier sees its own rows (the service
// scopes them). Procurement sets the maximum stock from the row (`maxstock:set`);
// any other PTI seat sees whose act it is; a supplier reads it only.
//
// Layout (owner, 2026-09-29): Result and Status stay visible at 1280 px without
// horizontal scroll — "not called off" folds under Called off, the stock
// figure's date and the maximum under Held, and the material label wraps under
// its code.
// ─────────────────────────────────────────────────────────────────────────────

const OUTCOME_VARIANT: Record<FsOutcome, 'success' | 'warning' | 'danger' | 'neutral'> = {
  supplierShort: 'danger',
  underCalled: 'warning',
  stockNotReported: 'neutral',
  notCommitted: 'neutral',
  overHeld: 'warning',
  balanced: 'success',
};

const Qty: React.FC<{ value: number; uom: string; testId?: string }> = ({ value, uom, testId }) => (
  <Data className="whitespace-nowrap" data-testid={testId}>{`${formatNumber(value)} ${uom}`}</Data>
);

const note = 'block text-xs text-text-tertiary';

const FixedStockReconcile: React.FC<{ persona: 'buyer' | 'supplier' }> = ({ persona }) => {
  const { t } = useTranslation();
  const query = useFixedStockReconcile();
  const [outcome, setOutcome] = useState<FsOutcome | null>(null);
  const [editing, setEditing] = useState<FixedStockReconcileRow | null>(null);
  const [draft, setDraft] = useState('');
  const setMax = useMaxStockSet();
  const refusalText = useRefusalText();
  const { toast } = useToast();
  const maxAvailability = useVerbAvailability('maxstock:set');
  const isPti = persona === 'buyer';
  const canSetMax = isPti && maxAvailability.kind === 'held';
  // FUX A4: the planner's page is "End-of-cycle stock check" under Review; the
  // supplier's keeps its own name and section.
  const crumb = isPti ? forecastCrumb(t, 'stockCheck') : [t('hub.nav.section.planning'), t('fsr.title')];

  const rows = useMemo(() => query.data?.items ?? [], [query.data]);
  const counts = useMemo(() => countByOutcome(rows), [rows]);
  const shown = useMemo(() => (outcome ? rows.filter((r) => r.outcome === outcome) : rows), [rows, outcome]);

  if (query.isPending) return <LoadingState breadcrumb={crumb} />;
  if (query.isError) return <ErrorState breadcrumb={crumb} error={query.error} onRetry={() => query.refetch()} />;

  const cols = isPti ? 8 : 7;
  const draftQty = draft.trim() === '' ? null : Number(draft.trim());
  const draftInvalid = draft.trim() !== '' && (Number.isNaN(draftQty) || maxStockRefusal(draftQty) !== null);

  const openEditor = (r: FixedStockReconcileRow) => {
    setDraft(r.maxStock === null ? '' : String(r.maxStock));
    setEditing(r);
  };

  const save = async (quantity: number | null) => {
    if (!editing) return;
    const result = await setMax.mutateAsync({ supplierId: editing.supplierId, materialCode: editing.materialCode, quantity });
    if (result.status === 'failed') {
      toast({ variant: 'error', title: refusalText(result.reason) ?? t('fsr.max.refused', { reason: result.reason ?? '' }) });
      return;
    }
    toast({
      variant: 'success',
      title:
        quantity === null
          ? t('fsr.max.cleared', { material: editing.materialCode })
          : t('fsr.max.saved', { material: editing.materialCode, qty: formatNumber(quantity), uom: editing.uom }),
    });
    setEditing(null);
  };

  const cycleKind = (r: FixedStockReconcileRow) =>
    r.stream === 'packaging'
      ? t('fsr.cycleKind.packaging', { weeks: Math.round((daysBetween(r.cycleStart, r.cycleEnd) + 1) / 7) })
      : t('fsr.cycleKind.rawMaterial');

  const resultCell = (r: FixedStockReconcileRow) => (
    <div className="space-y-1">
      <StatusPill variant={OUTCOME_VARIANT[r.outcome]}>
        <span data-testid={`fsr-outcome-${r.key}`}>{t(`fsr.outcome.${r.outcome}`)}</span>
      </StatusPill>
      {r.liabilityQty > 0 && (
        <span className="block text-xs text-text-secondary" data-testid={`fsr-liability-${r.key}`}>
          {t('fsr.liability')} <Qty value={r.liabilityQty} uom={r.uom} />
        </span>
      )}
      {r.shortQty > 0 && (
        <span className="block text-xs text-text-secondary">
          {t('fsr.short')} <Qty value={r.shortQty} uom={r.uom} />
        </span>
      )}
      {r.aboveMaxQty > 0 && (
        <span className="block text-xs text-text-secondary">
          {t('fsr.aboveMax')} <Qty value={r.aboveMaxQty} uom={r.uom} />
        </span>
      )}
    </div>
  );

  return (
    <AppShellV2>
      {isPti ? (
        <>
          <PageHeader breadcrumb={crumb} title={forecastTitle(t, 'stockCheck')} />
          <PurposeHeader page="stockCheck" />
          <SimulatedDataBanner />
          <DataAsOf date={forecastNow()} />
        </>
      ) : (
        <>
          <PageHeader breadcrumb={crumb} title={t('fsr.title')} subtitle={t('fsr.subtitle.sup')} />
          <PageMetaLine className="-mt-6 mb-4">
            {t('fsr.asOf')} <Data>{formatDate(forecastNow())}</Data>
            <SampleDataBadge className="ml-3 align-middle" />
          </PageMetaLine>
        </>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6" data-testid="fsr-summary">
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

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto mb-6" data-testid="fsr-table">
        <Table>
          <TableHeader>
            {isPti && <TableHeaderCell>{t('fsr.col.supplier')}</TableHeaderCell>}
            <TableHeaderCell>{t('fsr.col.material')}</TableHeaderCell>
            <TableHeaderCell>{t('fsr.col.cycle')}</TableHeaderCell>
            <TableHeaderCell>{t('fsr.col.committed')}</TableHeaderCell>
            <TableHeaderCell>{t('fsr.col.calledOff')}</TableHeaderCell>
            <TableHeaderCell>{t('fsr.col.held')}</TableHeaderCell>
            <TableHeaderCell>{t('fsr.col.result')}</TableHeaderCell>
            <TableHeaderCell>{t('fsr.col.status')}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {shown.map((r) => (
              <TableRow key={r.key} data-testid={`fsr-row-${r.key}`}>
                {isPti && (
                  <TableCell className="align-top max-w-[11rem]">
                    <span className="block text-sm text-text-primary">{r.supplierName}</span>
                    <Data className="text-xs text-text-tertiary">{r.supplierId}</Data>
                  </TableCell>
                )}
                <TableCell className="align-top max-w-[10rem]">
                  <Data className="whitespace-nowrap">{r.materialCode}</Data>
                  <span className={note}>{r.materialLabel}</span>
                </TableCell>
                <TableCell className="align-top">
                  <Data className="whitespace-nowrap">{formatDate(r.cycleStart)}</Data>
                  <span className="block">
                    – <Data className="whitespace-nowrap">{formatDate(r.cycleEnd)}</Data>
                  </span>
                  <span className={note}>{cycleKind(r)}</span>
                </TableCell>
                <TableCell className="align-top">
                  <Qty value={r.committed} uom={r.uom} testId={`fsr-committed-${r.key}`} />
                  <span className={note}>{t('fsr.periods', { committed: r.periodsCommitted, awaiting: r.periodsAwaiting })}</span>
                </TableCell>
                <TableCell className="align-top">
                  <Qty value={r.calledOff} uom={r.uom} testId={`fsr-called-${r.key}`} />
                  <span className={note}>{t('fsr.callOffCount', { count: r.callOffNumbers.length })}</span>
                  <span className="block text-xs text-text-secondary">
                    {t('fsr.notCalledOff')} <Qty value={r.uncalled} uom={r.uom} testId={`fsr-uncalled-${r.key}`} />
                  </span>
                  {r.calledBeyond > 0 && (
                    <span className={note} data-testid={`fsr-beyond-${r.key}`}>
                      {t('fsr.calledBeyond')} <Qty value={r.calledBeyond} uom={r.uom} />
                    </span>
                  )}
                  {r.awaitingSupplier > 0 && (
                    <span className={note} data-testid={`fsr-awaiting-supplier-${r.key}`}>
                      {t('fsr.awaitingSupplier', { count: r.awaitingSupplier })}
                    </span>
                  )}
                  {r.awaitingPti > 0 && (
                    <span className={note} data-testid={`fsr-awaiting-pti-${r.key}`}>
                      {t('fsr.awaitingPti', { count: r.awaitingPti })}
                    </span>
                  )}
                </TableCell>
                <TableCell className="align-top">
                  {r.held === null ? (
                    <span className="block text-sm text-text-tertiary" data-testid={`fsr-held-${r.key}`}>
                      {t('fsr.notReported')}
                    </span>
                  ) : (
                    <>
                      <Qty value={r.held} uom={r.uom} testId={`fsr-held-${r.key}`} />
                      {r.heldAt && (
                        <span className={note}>
                          {t('fsr.heldAt')} <Data>{formatDate(r.heldAt)}</Data>
                        </span>
                      )}
                    </>
                  )}
                  <span className="block text-xs text-text-secondary mt-1" data-testid={`fsr-max-${r.key}`}>
                    {r.maxStock === null ? (
                      t('fsr.noMax')
                    ) : (
                      <>
                        {t('fsr.max')} <Qty value={r.maxStock} uom={r.uom} />
                      </>
                    )}
                  </span>
                  {isPti &&
                    (canSetMax ? (
                      <button
                        type="button"
                        className="text-xs text-action-hover hover:underline"
                        onClick={() => openEditor(r)}
                        data-testid={`fsr-max-edit-${r.key}`}
                        aria-label={t('fsr.max.editFor', { material: r.materialCode, supplier: r.supplierName })}
                      >
                        {t(r.maxStock === null ? 'fsr.max.set' : 'fsr.max.change')}
                      </button>
                    ) : (
                      <HandoffNotice availability={maxAvailability} testId={`handoff-maxstock-${r.key}`} />
                    ))}
                </TableCell>
                <TableCell className="align-top">{resultCell(r)}</TableCell>
                <TableCell className="align-top">
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
        <p>{t('fsr.rules.cycle', { weeks: fsReconcileCycleWeeks() })}</p>
        <p>{t('fsr.rules.figures')}</p>
        <p>{t('fsr.rules.outcomes')}</p>
        <p>{t('fsr.rules.liability')}</p>
        <p>{t('fsr.rules.provisional')}</p>
      </section>

      {isPti && (
        <AboutThisPage>
          <p>{t('fsr.subtitle.pti')}</p>
        </AboutThisPage>
      )}

      <SidePanel
        open={editing !== null && canSetMax}
        onClose={() => setEditing(null)}
        title={editing ? t('fsr.max.panelTitle', { material: editing.materialCode }) : ''}
        footerActions={
          editing && canSetMax ? (
            <>
              {editing.maxStock !== null && (
                <Button variant="secondary" disabled={setMax.isPending} onClick={() => void save(null)} data-testid="fsr-max-clear">
                  {t('fsr.max.clear')}
                </Button>
              )}
              <Button
                variant="outline"
                disabled={setMax.isPending || draftQty === null || draftInvalid}
                onClick={() => void save(draftQty)}
                data-testid="fsr-max-save"
              >
                {t('fsr.max.save')}
              </Button>
            </>
          ) : undefined
        }
      >
        {editing && (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              {editing.supplierName} · <Data>{editing.materialCode}</Data> {editing.materialLabel}
            </p>
            <p className="text-sm text-text-secondary">{t('fsr.max.panelHint')}</p>
            <label className="block">
              <span className={labelClass}>{t('fsr.max.input', { uom: editing.uom })}</span>
              <input
                className={inputClass}
                inputMode="numeric"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                data-testid="fsr-max-input"
                aria-invalid={draftInvalid}
              />
            </label>
            {draftInvalid && (
              <p className="text-sm text-danger" role="alert" data-testid="fsr-max-invalid">
                {t('fsr.max.invalid')}
              </p>
            )}
          </div>
        )}
      </SidePanel>
    </AppShellV2>
  );
};

export const BuyerFixedStockReconcile: React.FC = () => <FixedStockReconcile persona="buyer" />;
export const SupplierFixedStockReconcile: React.FC = () => <FixedStockReconcile persona="supplier" />;

export default FixedStockReconcile;
