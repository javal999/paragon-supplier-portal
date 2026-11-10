import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import SampleDataBadge from '@components/ui-v2/SampleDataBadge';
import LivenessPill from '@components/ui-v2/LivenessPill';
import MaterialSearch, {
  MaterialMatchReason,
  useMaterialSearch
} from '@components/ui-v2/MaterialSearch';
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
import {
  useCallOffs,
  usePlanningGroups,
  usePurchaseOrders,
  useStockSimulation
} from '@services/query/hooks';
import { CALL_OFF_PO_STATES } from '@services/transitions/callOffRules';
/** @import { SimulationOverrideField, StockSimulationFilter, StockSimulationRow } from '@services/data/types' */
import { dayOf, isIsoDay } from '@services/transitions/inventoryRules';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { inventoryNow, inputClass, labelClass } from './inventory/inventoryDisplay';
import { planningGroupLabel } from './inventory/planningGroupDisplay';
import TermLabel from '@components/ui-v2/TermLabel';
import AskSupplierButton from './inventory/AskSupplierButton';
import { callOffHref, poRequestHref } from './inventory/inventoryLinks';
import { PicCell, PicFilter, PicHeader, usePicFilter } from './materials/picDisplay';
/** @import { AgreementLine } from './inventory/stockSimulationDisplay' */
import {
  agreementLineFor,
  FlagList,
  FreeCell,
  isOverCalled,
  lineLeftText,
  PlannerInputLabel,
  QtyCell,
  SIMULATE_ATOM,
  SimulationDetail
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
//
// P-05 / P-06 — the row offers the act the hub can complete: "Create call-off"
// (with what is left on the agreement line) only where the supplier has an
// agreement line with quantity left and the pair is not over-called;
// otherwise "Create PO request" is the outline action, with a grey note why.
// An over-called row adds "Ask supplier" for a production date beside it
// (INV-D9, lane 2D).
// ─────────────────────────────────────────────────────────────────────────────

const COLUMNS = 12;

/** @type {React.FC} */
const BuyerStockSimulation = () => {
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
  const [openRow, setOpenRow] = useState(/** @type {string | null} */ (null));
  const [openInput, setOpenInput] = useState(/** @type {SimulationOverrideField | null} */ (null));

  const setParam = useCallback(
    /** @param {string} name @param {string} value */ (name, value) =>
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (value === '') p.delete(name);
          else p.set(name, value);
          return p;
        },
        { replace: true }
      ),
    [setParams]
  );

  const filter = /** @type {StockSimulationFilter} */ (
    useMemo(
      () => ({
        ...(supplierId ? { supplierId } : {}),
        ...(groupId ? { planningGroupId: groupId } : {})
      }),
      [supplierId, groupId]
    )
  );
  const query = useStockSimulation(date, filter);
  // The option lists come from every row at the date, not the filtered ones.
  const everyRow = useStockSimulation(date);
  const groups = usePlanningGroups();
  // P-06 — the agreement lines, read the way the call-off page reads them.
  const posQuery = usePurchaseOrders({ status: [...CALL_OFF_PO_STATES] });
  const callOffsQuery = useCallOffs();
  const crumb = [t('hub.nav.section.inventory'), t('sim.title')];

  const rows = useMemo(() => query.data?.items ?? [], [query.data]);
  const byPic = rows.filter((r) => pic.matches(r.mrpController));
  const found = useMaterialSearch(search, byPic, (r) => ({
    code: r.materialCode,
    description: r.materialLabel,
    supplierId: r.supplierId
  }));

  if (query.isPending || posQuery.isPending || callOffsQuery.isPending)
    return <LoadingState breadcrumb={crumb} />;
  const failed = [query, posQuery, callOffsQuery].find((x) => x.isError);
  if (failed)
    return <ErrorState breadcrumb={crumb} error={failed.error} onRetry={() => failed.refetch()} />;
  const pos = posQuery.data?.items ?? [];
  const callOffs = callOffsQuery.data?.items ?? [];

  const all = everyRow.data?.items ?? rows;
  const suppliers = [...new Map(all.map((r) => [r.supplierId, r.supplierName])).entries()].sort(
    (a, b) => a[1].localeCompare(b[1])
  );
  const groupIds = new Set(
    all.map((r) => r.planningGroupId).filter(/** @returns {g is string} */ (g) => !!g)
  );
  const groupOptions = (groups.data?.items ?? []).filter((g) => groupIds.has(g.id));
  // Edge case 6 — a simulation looks forward only, from the latest update on the page.
  const latest = rows.reduce((m, r) => {
    const t0 = r.simulation?.t0 ?? r.refusal?.t0 ?? null;
    const d = t0 ? dayOf(t0) : null;
    return d && (!m || d > m) ? d : m;
  }, /** @type {string | null} */ (null));

  /** @param {string} key */
  const toggle = (key) => {
    setOpenInput(null);
    setOpenRow(openRow === key ? null : key);
  };
  /**
   * @param {string} key
   * @param {SimulationOverrideField} field
   */
  const openInputFor = (key, field) => {
    setOpenRow(key);
    setOpenInput(field);
  };
  /** @param {StockSimulationRow} r */
  const createCallOff = (r) => navigate(callOffHref(r.supplierId, r.materialCode));
  /** @param {StockSimulationRow} r */
  const createPoRequest = (r) => navigate(poRequestHref(r.supplierId, r.materialCode));

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
            <Button
              variant="secondary"
              onClick={() => setParam('date', '')}
              disabled={date === today}
            >
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
          <MaterialSearch
            mode="filter"
            query={search}
            onQueryChange={(q) => setParam('q', q)}
            testId="sim-search"
          />
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

      {/* User feedback 2026-11-10 — frozen header + pinned Material/Supplier, so the
          table can be scrolled both ways without losing what a row and a column are. */}
      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
        <Table frozenHeader scrollLabel={t('sim.title')}>
          <TableHeader>
            <TableHeaderCell pin="left">{t('sim.col.material')}</TableHeaderCell>
            <TableHeaderCell pin="left">{t('sim.col.supplier')}</TableHeaderCell>
            <TableHeaderCell>
              <PicHeader />
            </TableHeaderCell>
            <TableHeaderCell className="text-right">
              <span className="inline-flex items-center gap-2 whitespace-nowrap">
                <TermLabel term="supplierAvailable" />
                <LivenessPill capability="inventory" />
              </span>
            </TableHeaderCell>
            <TableHeaderCell className="text-right" term="calledOffNotShipped" />
            <TableHeaderCell className="text-right" term="freeToCallOff" />
            <TableHeaderCell
              className="text-right border-l border-border-subtle"
              term="ptiInbound"
            />
            <TableHeaderCell>{t('sim.col.lastUpdate')}</TableHeaderCell>
            <TableHeaderCell term="simulationBasis" />
            <TableHeaderCell term="simulationFlags" />
            <TableHeaderCell className="text-right">{t('sim.col.actions')}</TableHeaderCell>
            <TableHeaderCell pin="right">
              <span className="sr-only">{t('sim.detail.weeks')}</span>
            </TableHeaderCell>
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
                    line={agreementLineFor(pos, callOffs, r.supplierId, r.materialCode)}
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
                <td
                  colSpan={COLUMNS}
                  className="py-10 text-center text-sm text-text-tertiary"
                  data-testid="sim-empty"
                >
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

/**
 * One supplier × material row: the figures side by side, never summed (BR-02).
 * @type {React.FC<{ row: StockSimulationRow; open: boolean; onToggle: () => void; canInput: boolean; onInput: (field: SimulationOverrideField) => void; line: AgreementLine; onCallOff: () => void; onPoRequest: () => void; matchReason: React.ReactNode; }>}
 */
const SimulationRow = ({
  row: r,
  open,
  onToggle,
  canInput,
  onInput,
  line,
  onCallOff,
  onPoRequest,
  matchReason
}) => {
  const { t } = useTranslation();
  const key = `${r.supplierId}-${r.materialCode}`;
  const s = r.simulation;
  const inputs = (s?.components ?? []).filter((c) => !!c.plannerInput);
  const lastUpdate = s?.t0 ?? r.refusal?.t0 ?? null;
  /** @param {() => void} fn */
  const stop = (fn) => /** @param {React.MouseEvent} e */ (e) => {
    e.stopPropagation();
    fn();
  };
  const Chevron = open ? ChevronDown : ChevronRight;
  const overCalled = isOverCalled(s);
  const flags = s?.flags ?? [];
  return (
    // BL-31 — the row opens on a click anywhere; from the keyboard, the toggle
    // button is the one tab stop (the row itself stays out of the tab order).
    <TableRow onClick={onToggle} tabIndex={-1} data-testid={`sim-row-${key}`}>
      <TableCell pin="left">
        <Data className="text-xs font-bold text-text-primary whitespace-nowrap">
          {r.materialCode}
        </Data>
        <div className="text-sm text-text-primary">{r.materialLabel}</div>
        {matchReason}
        {r.sample ? (
          <div className="mt-1" data-testid={`sim-sample-${key}`}>
            <StatusPill variant="info">
              {t(
                r.sampleCase === 2
                  ? 'sim.sampleCase2'
                  : r.sampleCase === 3
                    ? 'sim.sampleCase3'
                    : 'sim.sample'
              )}
            </StatusPill>
          </div>
        ) : null}
      </TableCell>
      <TableCell pin="left">
        <div className="text-sm text-text-primary line-clamp-2" title={r.supplierName}>
          {r.supplierName}
        </div>
      </TableCell>
      <TableCell>
        <PicCell value={r.mrpController} testId={`sim-pic-${key}`} />
      </TableCell>
      <TableCell className="text-right whitespace-nowrap" data-testid={`sim-available-${key}`}>
        <AvailableCell row={r} canInput={canInput} onInput={onInput} />
        {inputs.map((c) =>
          c.plannerInput ? (
            <PlannerInputLabel
              key={c.plannerInput.overrideId}
              input={c.plannerInput}
              testId={`sim-input-label-${key}`}
            />
          ) : null
        )}
      </TableCell>
      <TableCell className="text-right whitespace-nowrap" data-testid={`sim-calledoff-${key}`}>
        {s ? (
          <QtyCell value={s.calledOffNotShipped} uom={r.uom} />
        ) : (
          <span className="text-text-tertiary">—</span>
        )}
      </TableCell>
      <TableCell className="text-right whitespace-nowrap" data-testid={`sim-free-${key}`}>
        {s && s.freeToCallOff !== null ? (
          <FreeCell value={s.freeToCallOff} uom={r.uom} />
        ) : (
          <span className="text-text-tertiary">—</span>
        )}
      </TableCell>
      <TableCell
        className="text-right whitespace-nowrap border-l border-border-subtle"
        data-testid={`sim-pti-${key}`}
      >
        {s ? (
          <QtyCell value={s.ptiInbound} uom={r.uom} />
        ) : (
          <span className="text-text-tertiary">—</span>
        )}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        {lastUpdate ? (
          <Data className="text-xs">{formatDateTime(lastUpdate)}</Data>
        ) : (
          <span className="text-xs text-text-tertiary">{t('sim.noUpdate')}</span>
        )}
      </TableCell>
      <TableCell>
        {s ? (
          <StatusPill variant={s.basis === 'plannerInput' ? 'info' : 'neutral'}>
            {t(s.basis === 'plannerInput' ? 'sim.basis.plannerInput' : 'sim.basis.supplier')}
          </StatusPill>
        ) : null}
      </TableCell>
      <TableCell>
        {overCalled ? (
          <div className="mb-1" data-testid={`sim-overcalled-${key}`}>
            <StatusPill variant="danger">{t('sim.overCalledMeans')}</StatusPill>
          </div>
        ) : null}
        {overCalled && flags.length === 0 ? null : (
          <FlagList
            flags={flags}
            canInput={canInput}
            onInput={onInput}
            testId={`sim-flags-${key}`}
          />
        )}
      </TableCell>
      <TableCell className="text-right">
        <RowActions
          row={r}
          line={line}
          overCalled={overCalled}
          onCallOff={stop(onCallOff)}
          onPoRequest={stop(onPoRequest)}
        />
      </TableCell>
      <TableCell pin="right">
        <button
          type="button"
          aria-expanded={open}
          aria-label={t(open ? 'sim.detail.close' : 'sim.detail.open', {
            material: r.materialCode,
            supplier: r.supplierName
          })}
          onClick={stop(onToggle)}
          className="rounded p-1 text-text-tertiary hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-action"
          data-testid={`sim-toggle-${key}`}
        >
          <Chevron size={16} aria-hidden="true" />
        </button>
      </TableCell>
    </TableRow>
  );
};

/**
 * P-05 / P-06 — the row's actions. "Create call-off" only where an agreement
 * line has quantity left and the pair is not over-called; otherwise "Create PO
 * request" is the outline action, with a grey note when there is no line or it
 * is used up (an over-called row's reason is its flag).
 * An over-called row also offers "Ask supplier" for a production date (INV-D9).
 * @type {React.FC<{ row: StockSimulationRow; line: AgreementLine; overCalled: boolean; onCallOff: (e: React.MouseEvent) => void; onPoRequest: (e: React.MouseEvent) => void; }>}
 */
const RowActions = ({ row: r, line, overCalled, onCallOff, onPoRequest }) => {
  const { t } = useTranslation();
  const key = `${r.supplierId}-${r.materialCode}`;
  const callOff = !overCalled && line.state === 'line';
  const note = callOff
    ? null
    : line.state === 'none'
      ? t('sim.action.noLine')
      : line.state === 'exhausted' && !overCalled
        ? t('sim.action.lineExhausted', { po: line.poNumber })
        : null;
  return (
    <div className="flex flex-col items-end gap-1">
      {!overCalled && line.state === 'line' ? (
        <>
          <Button
            variant="outline"
            className="!px-3 !py-1.5 text-xs whitespace-nowrap"
            onClick={onCallOff}
            aria-label={t('sim.action.callOffFor', {
              material: r.materialCode,
              supplier: r.supplierName
            })}
            data-testid={`sim-calloff-${key}`}
          >
            {t('sim.action.callOff')}
          </Button>
          <span
            className="text-[11px] text-text-secondary whitespace-nowrap"
            data-testid={`sim-line-${key}`}
          >
            {lineLeftText(t, line, r.uom)}
          </span>
        </>
      ) : null}
      <Button
        variant={callOff ? 'secondary' : 'outline'}
        className="!px-3 !py-1.5 text-xs whitespace-nowrap"
        onClick={onPoRequest}
        aria-label={t('sim.action.poFor', {
          material: r.materialCode,
          supplier: r.supplierName
        })}
        data-testid={`sim-po-${key}`}
      >
        {t('sim.action.po')}
      </Button>
      {note ? (
        <span
          className="text-[11px] text-text-tertiary whitespace-nowrap"
          data-testid={`sim-noline-${key}`}
        >
          {note}
        </span>
      ) : null}
      {overCalled ? (
        // P-05 / INV-D9 — the hub ask beside "Create PO request". Clicks inside
        // (the dialog included) stay out of the row, which opens on a click.
        <div
          className="flex flex-col items-end gap-1"
          onClick={(e) => e.stopPropagation()}
          data-testid={`sim-ask-${key}`}
          data-topic="productionDate"
        >
          <AskSupplierButton
            supplierId={r.supplierId}
            materialCode={r.materialCode}
            topic="productionDate"
            testId={`sim-ask-${key}`}
          />
        </div>
      ) : null}
    </div>
  );
};

/**
 * Supplier available: the figure, "Missing" (with its input), or the refusal.
 * @type {React.FC<{ row: StockSimulationRow; canInput: boolean; onInput: (field: SimulationOverrideField) => void; }>}
 */
const AvailableCell = ({ row: r, canInput, onInput }) => {
  const { t } = useTranslation();
  if (r.refusal)
    return (
      <span className="text-xs text-danger whitespace-normal">
        {t(`sim.refusal.${r.refusal.refusal}`, {
          date: r.refusal.t0 ? formatDate(r.refusal.t0) : ''
        })}
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
