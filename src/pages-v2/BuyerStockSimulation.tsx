import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import SampleDataBadge from '@components/ui-v2/SampleDataBadge';
import LivenessPill from '@components/ui-v2/LivenessPill';
import MaterialSearch, { MaterialMatchReason, useMaterialSearch } from '@components/ui-v2/MaterialSearch';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import Button from '@components/ui-v2/Button';
import StatusPill from '@components/ui-v2/StatusPill';
import Data from '@components/ui-v2/Data';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import { formatDate, formatDateTime } from '@lib/format';
import { usePlanningGroups, useStockSimulation } from '@services/query/hooks';
import type { SimulationOverrideField, StockSimulationFilter, StockSimulationRow } from '@services/data/types';
import { dayOf, isIsoDay } from '@services/transitions/inventoryRules';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { inventoryNow, inputClass, labelClass } from './inventory/inventoryDisplay';
import { planningGroupLabel } from './inventory/planningGroupDisplay';
import { PicCell, PicFilter, PicHeader, usePicFilter } from './materials/picDisplay';
import {
  FlagList,
  PlannerInputLabel,
  QtyCell,
  SIMULATE_ATOM,
  SimulationDetail,
} from './inventory/stockSimulationDisplay';

// ─────────────────────────────────────────────────────────────────────────────
// Material E2 · STOCK SIMULATION — MR-7 section e (steps 1 to 6), AC-01 to
// AC-06; MAT-D2 (a separate page: the stock visibility page keeps no
// "available" figure, REQ-E08-01 BR-01).
//
// One row per supplier × material at the check date, from the read
// `getStockSimulation` (E1's `simulateSupplierStock` over the stores):
// Supplier available, Already called off (not shipped), Free to call off,
// and PTI inbound — PTI inbound in its own cell, never added to the supplier's
// figure (BR-02). A row opens the 13 weekly buckets and the planner inputs.
// The check date and every filter live in the page address, so a reload or a
// shared link keeps them.
// ─────────────────────────────────────────────────────────────────────────────

const COLUMNS = 12;

const BuyerStockSimulation: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const today = dayOf(inventoryNow());
  const dateParam = params.get('date');
  const date = dateParam && isIsoDay(dateParam) ? dateParam : today;
  const supplierId = params.get('supplier') ?? '';
  const groupId = params.get('group') ?? '';
  const search = params.get('q') ?? '';
  const pic = usePicFilter();
  const canInput = useVerbAvailability(SIMULATE_ATOM).kind === 'held';
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [openInput, setOpenInput] = useState<SimulationOverrideField | null>(null);

  const setParam = useCallback(
    (name: string, value: string) =>
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (value === '') p.delete(name);
          else p.set(name, value);
          return p;
        },
        { replace: true },
      ),
    [setParams],
  );

  const filter = useMemo<StockSimulationFilter>(
    () => ({ ...(supplierId ? { supplierId } : {}), ...(groupId ? { planningGroupId: groupId } : {}) }),
    [supplierId, groupId],
  );
  const query = useStockSimulation(date, filter);
  // The option lists come from every row at the date, not the filtered ones.
  const everyRow = useStockSimulation(date);
  const groups = usePlanningGroups();
  const crumb = [t('hub.nav.section.inventory'), t('sim.title')];

  const rows = useMemo(() => query.data?.items ?? [], [query.data]);
  const byPic = rows.filter((r) => pic.matches(r.mrpController));
  const found = useMaterialSearch(search, byPic, (r) => ({
    code: r.materialCode,
    description: r.materialLabel,
    supplierId: r.supplierId,
  }));

  if (query.isPending) return <LoadingState breadcrumb={crumb} />;
  if (query.isError) return <ErrorState breadcrumb={crumb} error={query.error} onRetry={() => query.refetch()} />;

  const all = everyRow.data?.items ?? rows;
  const suppliers = [...new Map(all.map((r) => [r.supplierId, r.supplierName])).entries()].sort((a, b) =>
    a[1].localeCompare(b[1]),
  );
  const groupIds = new Set(all.map((r) => r.planningGroupId).filter((g): g is string => !!g));
  const groupOptions = (groups.data?.items ?? []).filter((g) => groupIds.has(g.id));
  // Edge case 6 — a simulation looks forward only, from the latest update on the page.
  const latest = rows.reduce<string | null>((m, r) => {
    const t0 = r.simulation?.t0 ?? r.refusal?.t0 ?? null;
    const d = t0 ? dayOf(t0) : null;
    return d && (!m || d > m) ? d : m;
  }, null);

  const toggle = (key: string) => {
    setOpenInput(null);
    setOpenRow(openRow === key ? null : key);
  };
  const openInputFor = (key: string, field: SimulationOverrideField) => {
    setOpenRow(key);
    setOpenInput(field);
  };
  const createCallOff = (r: StockSimulationRow) =>
    navigate(`/buyer/call-offs?newFor=${encodeURIComponent(r.supplierId)}&material=${encodeURIComponent(r.materialCode)}`);
  const createPoRequest = (r: StockSimulationRow) =>
    navigate(
      `/buyer/purchase-requisition?new=1&material=${encodeURIComponent(r.materialCode)}&supplier=${encodeURIComponent(r.supplierId)}`,
    );

  return (
    <AppShellV2>
      <PageHeader breadcrumb={crumb} title={t('sim.title')} subtitle={t('sim.subtitle')} />
      <PageMetaLine className="-mt-6 mb-4">
        {t('sim.asOf')} <Data>{formatDate(inventoryNow())}</Data>
        <SampleDataBadge className="ml-3 align-middle" />
      </PageMetaLine>

      <div className="flex flex-wrap items-end gap-3 mb-2">
        <div>
          <label htmlFor="sim-date" className={labelClass}>
            {t('sim.filter.date')}
          </label>
          <div className="flex items-center gap-2">
            <input
              id="sim-date"
              type="date"
              data-testid="sim-date"
              className={inputClass}
              value={date}
              min={latest ?? undefined}
              onChange={(e) => setParam('date', e.target.value === today ? '' : e.target.value)}
            />
            <Button variant="secondary" onClick={() => setParam('date', '')} disabled={date === today}>
              {t('sim.filter.today')}
            </Button>
          </div>
        </div>
        <div>
          <label htmlFor="sim-supplier" className={labelClass}>
            {t('sim.filter.supplier')}
          </label>
          <select
            id="sim-supplier"
            data-testid="sim-supplier"
            className={inputClass}
            value={supplierId}
            onChange={(e) => setParam('supplier', e.target.value)}
          >
            <option value="">{t('sim.filter.supplierAll')}</option>
            {suppliers.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="sim-group" className={labelClass}>
            {t('sim.filter.group')}
          </label>
          <select
            id="sim-group"
            data-testid="sim-group"
            className={inputClass}
            value={groupId}
            onChange={(e) => setParam('group', e.target.value)}
          >
            <option value="">{t('sim.filter.groupAll')}</option>
            {groupOptions.map((g) => (
              <option key={g.id} value={g.id}>
                {planningGroupLabel(t, g)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[240px]">
          <MaterialSearch mode="filter" query={search} onQueryChange={(q) => setParam('q', q)} testId="sim-search" />
        </div>
        <PicFilter
          refs={rows.map((r) => r.mrpController)}
          persona="buyer"
          filter={pic.filter}
          setFilter={pic.setFilter}
          myCode={pic.myCode}
        />
      </div>
      {latest && date < latest ? (
        <p role="alert" className="text-xs text-danger mb-2" data-testid="sim-date-before">
          {t('sim.filter.dateBefore', { date: formatDate(latest) })}
        </p>
      ) : null}
      <p className="text-xs text-text-secondary mb-4" data-testid="sim-separate-note">
        {t('sim.separate')}
      </p>

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableHeaderCell>
              <span className="sr-only">{t('sim.detail.weeks')}</span>
            </TableHeaderCell>
            <TableHeaderCell>{t('sim.col.material')}</TableHeaderCell>
            <TableHeaderCell>{t('sim.col.supplier')}</TableHeaderCell>
            <TableHeaderCell>
              <PicHeader />
            </TableHeaderCell>
            <TableHeaderCell className="text-right">
              <span className="inline-flex items-center gap-2 whitespace-nowrap">
                {t('sim.col.available')}
                <LivenessPill capability="inventory" />
              </span>
            </TableHeaderCell>
            <TableHeaderCell className="text-right">{t('sim.col.calledOff')}</TableHeaderCell>
            <TableHeaderCell className="text-right">{t('sim.col.free')}</TableHeaderCell>
            <TableHeaderCell className="text-right border-l border-border-subtle">{t('sim.col.ptiInbound')}</TableHeaderCell>
            <TableHeaderCell>{t('sim.col.lastUpdate')}</TableHeaderCell>
            <TableHeaderCell>{t('sim.col.basis')}</TableHeaderCell>
            <TableHeaderCell>{t('sim.col.flags')}</TableHeaderCell>
            <TableHeaderCell className="text-right">{t('sim.col.actions')}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {found.map(({ item: r, match }) => {
              const key = `${r.supplierId}-${r.materialCode}`;
              const open = openRow === key;
              return (
                <React.Fragment key={key}>
                  <SimulationRow
                    row={r}
                    open={open}
                    onToggle={() => toggle(key)}
                    canInput={canInput}
                    onInput={(f) => openInputFor(key, f)}
                    onCallOff={() => createCallOff(r)}
                    onPoRequest={() => createPoRequest(r)}
                    matchReason={<MaterialMatchReason match={match} testId={`sim-match-${key}`} />}
                  />
                  {open ? (
                    <tr>
                      <td colSpan={COLUMNS} className="p-0 border-b border-border-subtle">
                        <SimulationDetail row={r} open={openInput} setOpen={setOpenInput} />
                      </td>
                    </tr>
                  ) : null}
                </React.Fragment>
              );
            })}
            {found.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS} className="py-10 text-center text-sm text-text-tertiary" data-testid="sim-empty">
                  {t('sim.empty')}
                </td>
              </tr>
            ) : null}
          </tbody>
        </Table>
      </div>
    </AppShellV2>
  );
};

/** One supplier × material row: the figures side by side, never summed (BR-02). */
const SimulationRow: React.FC<{
  row: StockSimulationRow;
  open: boolean;
  onToggle: () => void;
  canInput: boolean;
  onInput: (field: SimulationOverrideField) => void;
  onCallOff: () => void;
  onPoRequest: () => void;
  matchReason: React.ReactNode;
}> = ({ row: r, open, onToggle, canInput, onInput, onCallOff, onPoRequest, matchReason }) => {
  const { t } = useTranslation();
  const key = `${r.supplierId}-${r.materialCode}`;
  const s = r.simulation;
  const inputs = (s?.components ?? []).filter((c) => !!c.plannerInput);
  const lastUpdate = s?.t0 ?? r.refusal?.t0 ?? null;
  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
  };
  const Chevron = open ? ChevronDown : ChevronRight;
  return (
    // BL-31 — the row opens on a click anywhere; from the keyboard, the toggle
    // button is the one tab stop (the row itself stays out of the tab order).
    <TableRow onClick={onToggle} tabIndex={-1} data-testid={`sim-row-${key}`}>
      <TableCell>
        <button
          type="button"
          aria-expanded={open}
          aria-label={t(open ? 'sim.detail.close' : 'sim.detail.open', { material: r.materialCode, supplier: r.supplierName })}
          onClick={stop(onToggle)}
          className="rounded p-1 text-text-tertiary hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-action"
          data-testid={`sim-toggle-${key}`}
        >
          <Chevron size={16} aria-hidden="true" />
        </button>
      </TableCell>
      <TableCell>
        <Data className="text-xs font-bold text-text-primary">{r.materialCode}</Data>
        <div className="text-sm text-text-primary">{r.materialLabel}</div>
        {matchReason}
        {r.sample ? (
          <div className="mt-1" data-testid={`sim-sample-${key}`}>
            <StatusPill variant="info">{t('sim.sample')}</StatusPill>
          </div>
        ) : null}
      </TableCell>
      <TableCell>
        <div className="text-sm text-text-primary">{r.supplierName}</div>
      </TableCell>
      <TableCell>
        <PicCell value={r.mrpController} testId={`sim-pic-${key}`} />
      </TableCell>
      <TableCell className="text-right whitespace-nowrap" data-testid={`sim-available-${key}`}>
        <AvailableCell row={r} canInput={canInput} onInput={onInput} />
        {inputs.map((c) =>
          c.plannerInput ? <PlannerInputLabel key={c.plannerInput.overrideId} input={c.plannerInput} testId={`sim-input-label-${key}`} /> : null,
        )}
      </TableCell>
      <TableCell className="text-right whitespace-nowrap" data-testid={`sim-calledoff-${key}`}>
        {s ? <QtyCell value={s.calledOffNotShipped} uom={r.uom} /> : <span className="text-text-tertiary">—</span>}
      </TableCell>
      <TableCell className="text-right whitespace-nowrap" data-testid={`sim-free-${key}`}>
        {s && s.freeToCallOff !== null ? <QtyCell value={s.freeToCallOff} uom={r.uom} strong /> : <span className="text-text-tertiary">—</span>}
      </TableCell>
      <TableCell className="text-right whitespace-nowrap border-l border-border-subtle" data-testid={`sim-pti-${key}`}>
        {s ? <QtyCell value={s.ptiInbound} uom={r.uom} /> : <span className="text-text-tertiary">—</span>}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        {lastUpdate ? <Data className="text-xs">{formatDateTime(lastUpdate)}</Data> : <span className="text-xs text-text-tertiary">{t('sim.noUpdate')}</span>}
      </TableCell>
      <TableCell>
        {s ? (
          <StatusPill variant={s.basis === 'plannerInput' ? 'info' : 'neutral'}>
            {t(s.basis === 'plannerInput' ? 'sim.basis.plannerInput' : 'sim.basis.supplier')}
          </StatusPill>
        ) : null}
      </TableCell>
      <TableCell>
        <FlagList flags={s?.flags ?? []} canInput={canInput} onInput={onInput} testId={`sim-flags-${key}`} />
      </TableCell>
      <TableCell className="text-right">
        <div className="flex flex-col items-end gap-1">
          <Button
            variant="outline"
            className="!px-3 !py-1.5 text-xs whitespace-nowrap"
            onClick={stop(onCallOff)}
            aria-label={t('sim.action.callOffFor', { material: r.materialCode, supplier: r.supplierName })}
            data-testid={`sim-calloff-${key}`}
          >
            {t('sim.action.callOff')}
          </Button>
          <Button
            variant="secondary"
            className="!px-3 !py-1.5 text-xs whitespace-nowrap"
            onClick={stop(onPoRequest)}
            aria-label={t('sim.action.poFor', { material: r.materialCode, supplier: r.supplierName })}
            data-testid={`sim-po-${key}`}
          >
            {t('sim.action.po')}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

/** Supplier available: the figure, "Missing" (with its input), or the refusal. */
const AvailableCell: React.FC<{
  row: StockSimulationRow;
  canInput: boolean;
  onInput: (field: SimulationOverrideField) => void;
}> = ({ row: r, canInput, onInput }) => {
  const { t } = useTranslation();
  if (r.refusal)
    return (
      <span className="text-xs text-danger whitespace-normal">
        {t(`sim.refusal.${r.refusal.refusal}`, { date: r.refusal.t0 ? formatDate(r.refusal.t0) : '' })}
      </span>
    );
  const s = r.simulation;
  if (s && s.available !== null) return <QtyCell value={s.available} uom={r.uom} strong />;
  return (
    <div className="text-xs">
      <div className="text-text-tertiary">{t('sim.cannot')}</div>
      {canInput ? (
        <button
          type="button"
          className="text-action-hover hover:underline rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-action"
          onClick={(e) => {
            e.stopPropagation();
            onInput('soh');
          }}
          data-testid={`sim-missing-soh-${r.supplierId}-${r.materialCode}`}
        >
          {`${t('sim.missing')} · ${t('sim.input.enter', { field: t('sim.input.field.soh') })}`}
        </button>
      ) : (
        <span className="text-text-tertiary">{t('sim.missing')}</span>
      )}
    </div>
  );
};

export default BuyerStockSimulation;
