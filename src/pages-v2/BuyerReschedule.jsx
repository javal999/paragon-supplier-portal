/** @import React from 'react' */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
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
import DataHealthChip from '@components/forecast/DataHealthChip';
import PurposeHeader from '@components/forecast/PurposeHeader';
import CycleSteps from '@components/forecast/CycleSteps';
import SimulatedDataBanner from '@components/forecast/SimulatedDataBanner';
import AboutThisPage from '@components/forecast/AboutThisPage';
import DataAsOf from '@components/forecast/DataAsOf';
import { forecastCrumb, forecastTitle } from '@components/forecast/forecastPages';
import { useToast } from '@hooks/useToast';
import { useRefusalText } from '@hooks/useRefusalText';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { formatDate, formatIDR, formatNumber } from '@lib/format';
import { CHART_AXIS, CHART_GRID, CHART_SEMANTIC, CHART_SERIES } from '@lib/chartPalette';
import { useOrderPlan, useReschedule } from '@services/query/hooks';
import {
  useCallOffCommand,
  useSapChangeMarkCommand,
  useWarehouseDecisionCommand
} from '@services/query/commandHooks';
/** @import { RescheduleProposalView, RescheduleView, SapChangeMark, WarehouseDecision, WarehousePlanView, WarehouseRescheduleView } from '@services/data/types' */
/** @import { ShortfallWeek } from '@services/engine/orderSizing' */
import { planChangeAfter, selectionEffect } from '@services/engine/reschedule';
/** @import { WarehouseKind } from '@services/engine/types' */
import { isoWeek } from '@services/engine/dates';
import { isLive } from '@services/liveness';
import { POLICY_HOOKS } from '@services/transitions/policyHooks';
import { refusedByPolicy } from '@services/transitions/refusalMessage';
/** @import { WarehouseDecisionChoice } from '@services/transitions/warehouseDecisionRules' */
import {
  DECISION_NOTE_REQUIRED,
  WAREHOUSE_DECISION_CHOICES,
  decisionInForce,
  earlierDecisions,
  madeOnOlderPlan,
  warehouseDecisionRefusal
} from '@services/transitions/warehouseDecisionRules';
import { qtyOf } from './materialPlan/planDisplay';

// ─────────────────────────────────────────────────────────────────────────────
// RESCHEDULE OPEN ORDERS — REQ-E14-13, the Material Planner's warehouse relief.
//
// Per warehouse (ENG-D7): the projected fill now, after the planner's selected
// proposals (recomputed from the baseline, AC-03) and after every relief
// proposal; the stock already on hand, and the weeks it alone overfills — which
// no open order can relieve. The relief list is ranked by net saving, valued
// together (BR-06: each freed over-capacity pallet-week is claimed once), with
// everything inside the lead time or the Firm zone last and marked "needs
// supplier agreement". Reschedule-in (shortage) is listed apart.
//
// BR-07: a call-off change goes through the EXISTING change verb
// (`t_calloff_change`, a reason required) with the engine named as its origin;
// a PO-line change is made in SAP and recorded here as "taken to SAP"
// (`t_sapchange_mark`, ENG-D16). BR-08 / X-03: while the engine dataset is not
// live both verbs refuse, and the page says so in place of the act.
// BR-09: the plan-change guard shows how PTI's share of schedules changed inside
// the lead time (E14-02) would move if the selected proposals were sent.
//
// FUX-D3 (F-10, F-22): the weeks that do not fit even with the most rented
// space (from the order plan) sit here above the proposals, each with the
// planner's saved decision (`t_warehousedecision_record`) — a record of intent
// that changes no order and is never sent to SAP or a supplier.
//
// Every figure is computed by the forecast engine at read time on its
// SYNTHETIC dataset (the `engineDataset` pill, X-03).
// ─────────────────────────────────────────────────────────────────────────────

/** @param {string} w */
const weekLabel = (w) => `W${isoWeek(w)}`;
/** @param {number | null} x */
const pct = (x) => (x === null ? '—' : `${formatNumber(Math.round(x * 100))}%`);
/** @param {number | null} x */
const pctShare = (x) => (x === null ? '—' : `${formatNumber(Math.round(x * 1000) / 10)}%`);
/** @param {number} x */
const pw = (x) => formatNumber(Math.round(x));
const STANDARD = 0.8;
const TOKEN_NOW = CHART_SERIES[1];
const TOKEN_SELECTED = CHART_SERIES[0];
const TOKEN_ON_HAND = CHART_SERIES[4];
const TOKEN_CAPACITY = CHART_SEMANTIC.danger;
const TOKEN_STANDARD = CHART_SEMANTIC.warning;

/** @type {React.FC<{ w: WarehouseRescheduleView; selected: readonly number[] }>} */
const FillChart = ({ w, selected }) => {
  const { t } = useTranslation();
  const data = w.weeks.map((wk, i) => ({
    week: weekLabel(wk.weekStart),
    now: Math.round(wk.fill * 1000) / 10,
    selected: Math.round(selected[i] * 1000) / 10,
    onHand: Math.round(wk.onHandFill * 1000) / 10
  }));
  const top = Math.max(120, ...data.map((d) => d.now));
  return (
    <div className="h-64" data-testid="rs-fill-chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: -8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
          <XAxis dataKey="week" tick={{ fontSize: 10, fill: CHART_AXIS }} interval={1} />
          <YAxis
            domain={[0, Math.ceil(top / 10) * 10]}
            tick={{ fontSize: 10, fill: CHART_AXIS }}
            unit="%"
          />
          <Tooltip formatter={(v) => `${String(v)}%`} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <ReferenceLine y={100} stroke={TOKEN_CAPACITY} strokeDasharray="4 2" />
          <ReferenceLine y={STANDARD * 100} stroke={TOKEN_STANDARD} strokeDasharray="4 2" />
          <Line
            type="monotone"
            dataKey="now"
            name={t('rs.fill.series.now')}
            stroke={TOKEN_NOW}
            strokeDasharray="5 3"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="selected"
            name={t('rs.fill.series.selected')}
            stroke={TOKEN_SELECTED}
            strokeWidth={2}
            dot={{ r: 2 }}
          />
          <Line
            type="monotone"
            dataKey="onHand"
            name={t('rs.fill.series.onHand')}
            stroke={TOKEN_ON_HAND}
            strokeDasharray="2 2"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

/**
 * The latest "taken to SAP" mark for a line.
 * @param {readonly SapChangeMark[]} marks
 * @param {string} lineId
 */
const markFor = (marks, lineId) => marks.find((m) => m.lineId === lineId) ?? null;

// ── FUX-D3 (F-10, F-22) · THE WAREHOUSE-WEEK DECISION ───────────────────────
// The weeks that do not fit even with the most rented space come from the order
// plan (`shortfallWeeks`, BL-117); the decision for each is recorded through
// `t_warehousedecision_record` and read back from the ledger on this page's own
// read. The page pre-checks with the same rule the verb's policy hook calls
// (`warehouseDecisionRefusal`, MAT-R2). A seat without the atom sees who acts.

const inputClass =
  'w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action placeholder:text-text-tertiary';
/** @param {number} x */
const pal = (x) => formatNumber(Math.round(x * 10) / 10);

/**
 * What arrives by the week and whether moving it keeps safety stock — the "push out" option's detail.
 * @type {React.FC<{ sw: ShortfallWeek; plan: WarehousePlanView }>}
 */
const LaterDeliveries = ({ sw, plan }) => {
  const { t } = useTranslation();
  const nameOf = new Map(plan.materials.map((m) => /** @type {const} */ ([m.materialCode, m])));
  return (
    <div className="overflow-x-auto mt-3" data-testid={`rs-decide-later-${sw.weekStart}`}>
      <Table>
        <TableHeader>
          <TableHeaderCell>{t('rs.decide.col.material')}</TableHeaderCell>
          <TableHeaderCell>{t('rs.decide.col.delivery')}</TableHeaderCell>
          <TableHeaderCell>{t('rs.decide.col.week')}</TableHeaderCell>
          <TableHeaderCell>{t('rs.decide.col.quantity')}</TableHeaderCell>
          <TableHeaderCell>{t('rs.decide.col.safety')}</TableHeaderCell>
        </TableHeader>
        <tbody>
          {sw.later.deliveries.map((d) => {
            const m = nameOf.get(d.materialCode);
            return (
              <TableRow
                key={`${d.materialCode}-${d.source}-${d.weekStart}`}
                data-testid={`rs-decide-delivery-${d.materialCode}-${d.source}-${d.weekStart}`}
              >
                <TableCell>
                  <div className="text-sm text-text-primary">
                    {m?.materialLabel ?? d.materialCode}
                  </div>
                  <Data className="text-xs text-text-tertiary">{d.materialCode}</Data>
                </TableCell>
                <TableCell>{t(`rs.decide.source.${d.source}`)}</TableCell>
                <TableCell>
                  <Data>{weekLabel(d.weekStart)}</Data>
                </TableCell>
                <TableCell>
                  <Data>{`${qtyOf(d.quantity, m?.uom ?? 'PCS')} ${m?.uom ?? ''}`.trim()}</Data>
                  <div className="text-xs text-text-tertiary">
                    <Data>{t('rs.decide.palletsUnit', { value: pal(d.pallets) })}</Data>
                  </div>
                </TableCell>
                <TableCell>
                  {d.keepsSafetyStock ? (
                    <StatusPill variant="success">{t('rs.decide.keeps')}</StatusPill>
                  ) : (
                    <StatusPill variant="warning">{t('rs.decide.breaks')}</StatusPill>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
};

/**
 * The decision in force for a week, with the review marker when the plan has moved on.
 * @type {React.FC<{ weekStart: string; ledger: readonly WarehouseDecision[]; stream: WarehouseKind; currentVersion: number | null }>}
 */
const DecisionInForce = ({ weekStart, ledger, stream, currentVersion }) => {
  const { t } = useTranslation();
  const now = decisionInForce(ledger, stream, weekStart);
  const earlier = earlierDecisions(ledger, stream, weekStart).length;
  if (!now)
    return (
      <p className="text-xs text-text-tertiary mb-2" data-testid={`rs-decide-none-${weekStart}`}>
        {t('rs.decide.none')}
      </p>
    );
  const vars = {
    choice: t(`rs.decide.inline.${now.choice}`),
    date: formatDate(now.recordedAt),
    version: now.planVersion ?? ''
  };
  return (
    <div className="mb-2" data-testid={`rs-decide-inforce-${weekStart}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-text-primary">
          {t(now.planVersion === null ? 'rs.decide.inForce.noVersion' : 'rs.decide.inForce', vars)}
        </span>
        {madeOnOlderPlan(now, currentVersion) && (
          <span data-testid={`rs-decide-older-${weekStart}`}>
            <StatusPill variant="warning">{t('rs.decide.olderPlan')}</StatusPill>
          </span>
        )}
      </div>
      {now.note !== null && <p className="text-xs text-text-secondary mt-1">{now.note}</p>}
      {earlier > 0 && (
        <p className="text-xs text-text-tertiary mt-1">
          {t('rs.decide.earlier', { count: earlier })}
        </p>
      )}
    </div>
  );
};

/**
 * One week's choice control: the four ways, the note, and the save. Rendered only for a seat holding the atom.
 * @type {React.FC<{ sw: ShortfallWeek; plan: WarehousePlanView; rate: number }>}
 */
const DecisionControl = ({ sw, plan, rate }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const refusalText = useRefusalText();
  const command = useWarehouseDecisionCommand();
  const [picked, setPicked] = useState(/** @type {WarehouseDecisionChoice | null} */ (null));
  const [note, setNote] = useState('');
  const refusal = picked === null ? null : warehouseDecisionRefusal(picked, note);
  /**
   * @param {WarehouseDecisionChoice} c
   * @returns {string}
   */
  const detail = (c) => {
    if (c === 'rent')
      return t('rs.decide.detail.rent', {
        pallets: pal(sw.rent.pallets),
        cost: formatIDR(Math.round(sw.rent.costIdr)),
        rate: formatIDR(rate)
      });
    if (c === 'pushOut')
      return sw.later.deliveries.length === 0
        ? t('rs.decide.later.none')
        : t(sw.later.enough ? 'rs.decide.later.enough' : 'rs.decide.later.notEnough', {
            count: sw.later.deliveries.length,
            movable: pal(sw.later.movablePallets)
          });
    return t(`rs.decide.detail.${c}`);
  };
  const save = async () => {
    if (picked === null || refusal !== null) return;
    try {
      const res = await command.mutateAsync({
        stream: plan.kind,
        weekStart: sw.weekStart,
        choice: picked,
        note: note.trim() || null
      });
      if (res.status === 'failed') {
        toast({
          variant: 'warning',
          title: t('rs.decide.toast.refused'),
          description: refusalText(res.reason) ?? res.reason ?? ''
        });
        return;
      }
      setPicked(null);
      setNote('');
      toast({
        variant: 'success',
        title: t('rs.decide.toast.saved'),
        description: t('rs.decide.toast.savedDesc', { week: weekLabel(sw.weekStart) })
      });
    } catch {
      toast({ variant: 'error', title: t('rs.decide.toast.refused') });
    }
  };
  const noteId = `rs-decide-note-${plan.kind}-${sw.weekStart}`;
  return (
    <div>
      <div
        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        role="group"
        aria-label={t('rs.decide.choose')}
      >
        {WAREHOUSE_DECISION_CHOICES.map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={picked === c}
            onClick={() => setPicked(c)}
            className={`text-left border rounded-md p-3 ${picked === c ? 'border-action bg-action-soft' : 'border-border-subtle hover:border-action'}`}
            data-testid={`rs-decide-choose-${c}-${sw.weekStart}`}
          >
            <div className="text-sm font-medium text-text-primary">
              {t(`rs.decide.choice.${c}`)}
            </div>
            <div className="text-xs text-text-secondary mt-1">{detail(c)}</div>
          </button>
        ))}
      </div>
      {picked === 'pushOut' && sw.later.deliveries.length > 0 && (
        <LaterDeliveries sw={sw} plan={plan} />
      )}
      <div className="mt-3 flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1">
          <label htmlFor={noteId} className="block text-label text-text-tertiary uppercase mb-1">
            {t('rs.decide.note')}
          </label>
          <input
            id={noteId}
            type="text"
            maxLength={500}
            className={inputClass}
            aria-required={picked === 'accept'}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            data-testid={`rs-decide-note-${sw.weekStart}`}
          />
          <p className="text-xs text-text-tertiary mt-1">
            {t(picked === 'accept' ? 'rs.decide.note.required' : 'rs.decide.note.optional')}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => void save()}
          disabled={picked === null || refusal !== null || command.isPending}
          data-testid={`rs-decide-save-${sw.weekStart}`}
        >
          {t('rs.decide.save')}
        </Button>
      </div>
      {refusal !== null && (
        <p
          className="text-xs text-warning-hover mt-2"
          role="status"
          data-testid={`rs-decide-refusal-${sw.weekStart}`}
        >
          {t(
            refusal.startsWith(DECISION_NOTE_REQUIRED)
              ? 'rs.decide.refusal.note'
              : 'rs.decide.refusal.choice'
          )}
        </p>
      )}
    </div>
  );
};

/**
 * The card: every week of the warehouse shown that does not fit, its saved decision, and the control.
 * @type {React.FC<{ plan: WarehousePlanView; rate: number; ledger: readonly WarehouseDecision[]; currentVersion: number | null; }>}
 */
const DecisionCard = ({ plan, rate, ledger, currentVersion }) => {
  const { t } = useTranslation();
  const availability = useVerbAvailability('warehousedecision:record');
  return (
    <section
      className="bg-bg-surface border border-danger rounded-lg p-4 mb-6"
      data-testid="rs-decide"
    >
      <h2 className="text-section text-text-primary mb-1">{t('rs.decide.title')}</h2>
      <p className="text-xs text-text-tertiary mb-1">
        {t('rs.decide.intro', { max: formatNumber(Math.round(plan.maxRentedPallets ?? 0)) })}
      </p>
      <p className="text-xs text-text-tertiary mb-1" data-testid="rs-decide-basis">
        {t('rs.decide.basis')}
      </p>
      <p className="text-xs text-text-secondary mb-3" data-testid="rs-decide-intent">
        {t('rs.decide.intent')}
      </p>
      {availability.kind !== 'held' && (
        <HandoffNotice availability={availability} testId="handoff-reschedule-decision" />
      )}
      {plan.shortfallWeeks.map((sw) => (
        <div
          key={sw.weekStart}
          className="border border-border-subtle rounded-md p-4 mt-3"
          data-testid={`rs-decide-week-${sw.weekStart}`}
        >
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-2">
            <h3 className="text-sm font-semibold text-text-primary">
              <Data>{weekLabel(sw.weekStart)}</Data> · <Data>{formatDate(sw.weekStart)}</Data>
            </h3>
            <span className="text-sm text-danger" data-testid={`rs-decide-pallets-${sw.weekStart}`}>
              {t('rs.decide.pallets', { value: pal(sw.shortfallPallets) })}
            </span>
            <span className="text-xs text-text-tertiary">
              {t('rs.decide.against', { pallets: pal(sw.pallets), limit: pal(sw.limitPallets) })}
            </span>
          </div>
          {sw.unavoidable && (
            <p
              className="text-xs text-text-secondary mb-2"
              data-testid={`rs-decide-unavoidable-${sw.weekStart}`}
            >
              {t('rs.decide.unavoidable')}
            </p>
          )}
          <DecisionInForce
            weekStart={sw.weekStart}
            ledger={ledger}
            stream={plan.kind}
            currentVersion={currentVersion}
          />
          {availability.kind === 'held' && (
            <DecisionControl key={`${plan.kind}-${sw.weekStart}`} sw={sw} plan={plan} rate={rate} />
          )}
        </div>
      ))}
    </section>
  );
};

/** @type {React.FC} */
const BuyerReschedule = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const refusalText = useRefusalText();
  const query = useReschedule();
  // FUX-D3 — the weeks that do not fit come from the order plan (BL-117).
  const orderPlan = useOrderPlan();
  const callOffCommand = useCallOffCommand();
  const sapCommand = useSapChangeMarkCommand();
  const planAvailability = useVerbAvailability('calloff:plan');
  const sapAvailability = useVerbAvailability('sapchange:mark');
  const [kind, setKind] = useState(/** @type {WarehouseKind} */ ('packaging'));
  const [selected, setSelected] = useState(/** @type {ReadonlySet<string>} */ (new Set()));
  const [sent, setSent] = useState(/** @type {ReadonlySet<string>} */ (new Set()));
  const crumb = forecastCrumb(t, 'makeRoom');
  /** @type {RescheduleView | null} */
  const run = query.data ?? null;
  // X-03 — the registry's own answer, read at render; each verb reads it again.
  const withheld = !isLive('engineDataset');

  const w = run?.warehouses.find((x) => x.kind === kind) ?? run?.warehouses[0] ?? null;
  const planW = orderPlan.data?.warehouses.find((x) => x.kind === (w?.kind ?? kind)) ?? null;
  const rentRate = orderPlan.data?.costs.rentIdrPerPalletWeek ?? null;
  const relief = useMemo(() => (w?.proposals ?? []).filter((p) => p.rank !== null), [w]);
  const shortage = useMemo(
    () => (w?.proposals ?? []).filter((p) => p.type === 'rescheduleIn'),
    [w]
  );
  const noSaving = useMemo(
    () => (w?.proposals ?? []).filter((p) => p.rank === null && p.type !== 'rescheduleIn'),
    [w]
  );
  const mine = useMemo(
    () => new Set([...selected].filter((id) => w?.proposals.some((p) => p.id === id))),
    [selected, w]
  );
  const effect = w && run ? selectionEffect(w, mine, run.costs) : null;
  const allProposals = useMemo(() => (run?.warehouses ?? []).flatMap((x) => x.proposals), [run]);
  const guardAfter = run ? planChangeAfter(run.planChange, allProposals, selected) : null;

  if (query.isPending) return <LoadingState breadcrumb={crumb} />;
  if (query.isError)
    return (
      <ErrorState breadcrumb={crumb} error={query.error} onRetry={() => void query.refetch()} />
    );

  /** @type {{ id: WarehouseKind; label: string }[]} */
  const kinds = (run?.warehouses ?? []).map((x) => ({
    id: x.kind,
    label: t(`rs.warehouse.${x.kind}`)
  }));
  /** @param {string} id */
  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const selectFree = () =>
    setSelected(
      (prev) =>
        new Set([...prev, ...relief.filter((p) => !p.needsSupplierAgreement).map((p) => p.id)])
    );
  const clearSelection = () => setSelected(new Set());

  /** @param {RescheduleProposalView} p */
  const reasonFor = (p) =>
    p.type === 'reduce'
      ? t('rs.reason.reduce', { quantity: `${qtyOf(p.proposedQuantity, p.uom)} ${p.uom}` })
      : t('rs.reason.later', { week: p.needWeek ? weekLabel(p.needWeek) : '—' });

  /** @param {RescheduleProposalView} p */
  const sendChange = async (p) => {
    try {
      const res = await callOffCommand.mutateAsync({
        verb: 'change',
        id: /** @type {NonNullable<typeof p.line.callOffId>} */ (p.line.callOffId),
        reason: reasonFor(p),
        needDate: /** @type {NonNullable<typeof p.proposedDate>} */ (p.proposedDate),
        ...(p.proposedQuantity !== p.line.quantity
          ? { quantity: p.proposedQuantity + p.line.receivedQuantity }
          : {}),
        origin: 'engine'
      });
      if (res.status === 'failed') {
        const description = refusedByPolicy(res.reason, POLICY_HOOKS.CALLOFF_ENGINE_DATA_LIVE)
          ? t('rs.refusal.simulated')
          : (refusalText(res.reason) ?? res.reason ?? '');
        toast({ variant: 'warning', title: t('rs.toast.refused'), description });
        return;
      }
      setSent((prev) => new Set(prev).add(p.id));
      toast({ variant: 'success', title: t('rs.toast.sent'), description: t('rs.toast.sentDesc') });
    } catch {
      toast({ variant: 'error', title: t('rs.toast.refused') });
    }
  };

  /** @param {RescheduleProposalView} p */
  const markSap = async (p) => {
    try {
      const res = await sapCommand.mutateAsync({
        poNumber: p.line.poNumber,
        line: /** @type {NonNullable<typeof p.line.poLine>} */ (p.line.poLine),
        proposalType: p.type,
        proposedDate: p.proposedDate,
        proposedQuantity: p.proposedQuantity + (p.type === 'cancel' ? 0 : p.line.receivedQuantity)
      });
      if (res.status === 'failed') {
        const description = refusedByPolicy(res.reason, POLICY_HOOKS.SAP_CHANGE_ENGINE_DATA_LIVE)
          ? t('rs.refusal.simulated')
          : (refusalText(res.reason) ?? res.reason ?? '');
        toast({ variant: 'warning', title: t('rs.toast.refused'), description });
        return;
      }
      toast({ variant: 'success', title: t('rs.toast.marked') });
    } catch {
      toast({ variant: 'error', title: t('rs.toast.refused') });
    }
  };

  /**
   * The act for one proposal — or why there is none.
   * @param {RescheduleProposalView} p
   */
  const actionFor = (p) => {
    if (p.line.kind === 'callOff') {
      if (p.type === 'cancel')
        return <span className="text-xs text-text-tertiary">{t('rs.action.callOffCancel')}</span>;
      if (sent.has(p.id))
        return <StatusPill variant="info">{t('rs.action.awaitingConfirmation')}</StatusPill>;
      if (planAvailability.kind !== 'held')
        return <HandoffNotice availability={planAvailability} testId="handoff-reschedule-change" />;
      if (withheld)
        return (
          <div
            className="text-xs text-warning-hover max-w-[16rem]"
            data-testid={`rs-withheld-${p.id}`}
          >
            {t('rs.action.withheldCallOff')}
          </div>
        );
      return (
        <Button
          variant="outline"
          onClick={() => void sendChange(p)}
          disabled={callOffCommand.isPending}
          data-testid={`rs-send-${p.id}`}
        >
          {t('rs.action.send')}
        </Button>
      );
    }
    const mark = markFor(run?.sapMarks ?? [], p.id);
    if (mark)
      return (
        <div className="text-xs" data-testid={`rs-marked-${p.id}`}>
          <StatusPill variant="info">{t('rs.action.taken')}</StatusPill>
          <div className="text-text-tertiary mt-1">
            <Data>{formatDate(mark.markedAt)}</Data>
          </div>
        </div>
      );
    if (sapAvailability.kind !== 'held')
      return <HandoffNotice availability={sapAvailability} testId="handoff-reschedule-sap" />;
    return (
      <div>
        <div className="text-xs text-text-secondary mb-1">{t('rs.action.inSap')}</div>
        {withheld ? (
          <div
            className="text-xs text-warning-hover max-w-[16rem]"
            data-testid={`rs-withheld-${p.id}`}
          >
            {t('rs.action.withheldSap')}
          </div>
        ) : (
          <Button
            variant="outline"
            onClick={() => void markSap(p)}
            disabled={sapCommand.isPending}
            data-testid={`rs-mark-${p.id}`}
          >
            {t('rs.action.mark')}
          </Button>
        )}
      </div>
    );
  };

  /** @param {RescheduleProposalView} p */
  const flags = (p) => (
    <div className="flex flex-wrap gap-1 mt-1">
      {p.needsSupplierAgreement && (
        <StatusPill variant="warning">{t('rs.flag.agreement')}</StatusPill>
      )}
      {p.liability && <StatusPill variant="warning">{t('rs.flag.liability')}</StatusPill>}
      {p.bandLimited && <StatusPill variant="neutral">{t('rs.flag.band')}</StatusPill>}
      {p.lastOpenLineOnPo && <StatusPill variant="neutral">{t('rs.flag.lastLine')}</StatusPill>}
      {p.addsToPlanChange && <StatusPill variant="neutral">{t('rs.flag.planChange')}</StatusPill>}
    </div>
  );

  /**
   * @param {readonly RescheduleProposalView[]} rows
   * @param {boolean} selectable
   * @param {string} testPrefix
   */
  const proposalRows = (rows, selectable, testPrefix) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          {selectable && <TableHeaderCell>{t('rs.col.select')}</TableHeaderCell>}
          <TableHeaderCell>{t('rs.col.rank')}</TableHeaderCell>
          <TableHeaderCell>{t('rs.col.material')}</TableHeaderCell>
          <TableHeaderCell>{t('rs.col.order')}</TableHeaderCell>
          <TableHeaderCell>{t('rs.col.now')}</TableHeaderCell>
          <TableHeaderCell>{t('rs.col.proposed')}</TableHeaderCell>
          <TableHeaderCell>{t('rs.col.freed')}</TableHeaderCell>
          <TableHeaderCell>{t('rs.col.saving')}</TableHeaderCell>
          <TableHeaderCell>{t('rs.col.cost')}</TableHeaderCell>
          <TableHeaderCell>{t('rs.col.position')}</TableHeaderCell>
          <TableHeaderCell>{t('rs.col.action')}</TableHeaderCell>
        </TableHeader>
        <tbody>
          {rows.map((p) => (
            <TableRow key={p.id} data-testid={`${testPrefix}-${p.id}`}>
              {selectable && (
                <TableCell className="align-top">
                  <input
                    type="checkbox"
                    aria-label={t('rs.col.selectOne', { order: p.line.reference })}
                    checked={selected.has(p.id)}
                    onChange={() => toggle(p.id)}
                    data-testid={`rs-select-${p.id}`}
                  />
                </TableCell>
              )}
              <TableCell className="align-top">
                <Data>{p.rank ?? '—'}</Data>
              </TableCell>
              <TableCell className="align-top">
                <div className="text-sm text-text-primary">{p.materialLabel}</div>
                <Data className="text-xs text-text-tertiary">{p.line.materialCode}</Data>
                <div className="text-xs text-text-secondary">{p.supplierName ?? '—'}</div>
              </TableCell>
              <TableCell className="align-top whitespace-nowrap">
                <Data>{p.line.reference}</Data>
                <div className="text-xs text-text-tertiary">{t(`rs.kind.${p.line.kind}`)}</div>
              </TableCell>
              <TableCell className="align-top whitespace-nowrap">
                <Data>{formatDate(p.line.date)}</Data>
                <div className="text-xs text-text-tertiary">
                  <Data>{`${qtyOf(p.line.quantity, p.uom)} ${p.uom}`}</Data>
                </div>
              </TableCell>
              <TableCell className="align-top whitespace-nowrap">
                <StatusPill variant="neutral">{t(`rs.type.${p.type}`)}</StatusPill>
                <div className="text-xs mt-1" data-testid={`rs-proposed-${p.id}`}>
                  {p.proposedDate === null ? (
                    <span className="text-text-tertiary">{t('rs.proposed.cancel')}</span>
                  ) : (
                    <>
                      <Data>{formatDate(p.proposedDate)}</Data> ·{' '}
                      <Data>{`${qtyOf(p.proposedQuantity, p.uom)} ${p.uom}`}</Data>
                    </>
                  )}
                </div>
                <div className="text-xs text-text-tertiary">
                  {p.needWeek === null
                    ? t('rs.need.none')
                    : t('rs.need.week', { week: weekLabel(p.needWeek) })}
                </div>
              </TableCell>
              <TableCell className="align-top whitespace-nowrap">
                <Data data-testid={`rs-freed-${p.id}`}>
                  {t('rs.palletWeeks', { value: pw(p.overCapacityPalletWeeksFreed) })}
                </Data>
                <div className="text-xs text-text-tertiary">
                  {t('rs.freedAll', { value: pw(p.palletWeeksFreed) })}
                </div>
              </TableCell>
              <TableCell className="align-top whitespace-nowrap">
                <Data data-testid={`rs-saving-${p.id}`}>
                  {formatIDR(Math.round(p.rentSavedIdr))}
                </Data>
                <div className="text-xs text-text-tertiary">
                  {t('rs.net')} <Data>{formatIDR(Math.round(p.netSavingIdr))}</Data>
                </div>
              </TableCell>
              <TableCell className="align-top whitespace-nowrap">
                <Data data-testid={`rs-penalty-${p.id}`}>
                  {formatIDR(Math.round(p.changePenaltyIdr))}
                </Data>
                {p.liability && (
                  <div className="text-xs text-warning-hover">{t('rs.liabilityNotPriced')}</div>
                )}
              </TableCell>
              <TableCell className="align-top">
                <div className="text-sm" data-testid={`rs-zone-${p.id}`}>
                  {t(`rs.zone.${p.zone}`)}
                </div>
                <div className="text-xs text-text-tertiary">
                  {t(p.insideLeadTime ? 'rs.lt.inside' : 'rs.lt.outside', {
                    days: p.daysAhead,
                    lead: p.leadTimeDays
                  })}
                </div>
                {flags(p)}
              </TableCell>
              <TableCell className="align-top">{actionFor(p)}</TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>
    </div>
  );

  const onHandWeeks = w ? w.weeks.filter((wk) => wk.onHandOverPallets > 0) : [];
  const freeCount = relief.filter((p) => !p.needsSupplierAgreement).length;

  return (
    <AppShellV2>
      <PageHeader breadcrumb={crumb} title={forecastTitle(t, 'makeRoom')} />
      <PurposeHeader page="makeRoom" />
      <CycleSteps current="makeRoom" />
      <SimulatedDataBanner capability="engineDataset" />
      <DataAsOf
        date={run?.planMadeAt ?? null}
        detail={
          run?.planMadeAt ? (
            <>
              {t('rs.meta.horizon')} {t('rs.meta.weeks', { count: run.weeks.length })}
            </>
          ) : (
            t('rs.meta.noPlan')
          )
        }
      />
      <DataHealthChip step="E14-13" className="mb-3" />

      <div className="mb-4">
        <FilterChipsBar options={kinds} value={w?.kind ?? kind} onChange={setKind} />
      </div>

      {w && effect && (
        <>
          <p className="text-sm text-text-secondary mb-3" data-testid="rs-capacity">
            {t(`rs.warehouse.${w.kind}`)} · <Data>{w.warehouseId}</Data> ·{' '}
            {t('rs.warehouse.capacity')}{' '}
            <Data>{t('rs.warehouse.pallets', { value: formatNumber(w.capacityPallets) })}</Data>
          </p>

          <div
            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6"
            data-testid="rs-kpis"
          >
            <KpiCard
              eyebrow={t('rs.kpi.over')}
              value={<span data-testid="rs-kpi-over">{pw(w.totals.overPalletWeeks)}</span>}
              subtitle={<span className="text-text-tertiary">{t('rs.kpi.over.sub')}</span>}
            />
            <KpiCard
              eyebrow={t('rs.kpi.relief')}
              value={<span data-testid="rs-kpi-relief">{pw(w.totals.reliefPalletWeeks)}</span>}
              subtitle={
                <span className="text-text-tertiary">
                  {t('rs.kpi.relief.sub', { count: w.totals.reliefProposals, free: freeCount })}
                </span>
              }
            />
            <KpiCard
              eyebrow={t('rs.kpi.saving')}
              value={
                <span data-testid="rs-kpi-saving">
                  {formatIDR(Math.round(w.totals.rentSavedIdr), { compact: true })}
                </span>
              }
              subtitle={
                <span className="text-warning-hover">
                  {t('rs.kpi.saving.sub', {
                    penalty: formatIDR(Math.round(w.totals.changePenaltyIdr), { compact: true })
                  })}
                </span>
              }
            />
            <KpiCard
              eyebrow={t('rs.kpi.onHand')}
              value={<span data-testid="rs-kpi-onhand">{pw(w.totals.onHandOverPalletWeeks)}</span>}
              subtitle={
                <span className="text-text-tertiary">
                  {t('rs.kpi.onHand.sub', { value: pw(w.totals.overPalletWeeksAfterRelief) })}
                </span>
              }
            />
          </div>

          {planW && rentRate !== null && planW.shortfallWeeks.length > 0 && (
            <DecisionCard
              key={planW.kind}
              plan={planW}
              rate={rentRate}
              ledger={/** @type {RescheduleView} */ (run).warehouseDecisions}
              currentVersion={/** @type {RescheduleView} */ (run).planVersions[planW.kind]}
            />
          )}

          <section
            className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-6"
            data-testid="rs-guard"
          >
            <h2 className="text-section text-text-primary mb-1">{t('rs.guard.title')}</h2>
            <p className="text-xs text-text-tertiary mb-3">
              {t('rs.guard.intro', {
                weeks: /** @type {RescheduleView} */ (run).planChangeWindowWeeks
              })}
            </p>
            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div>
                <dt className="text-text-secondary">{t('rs.guard.selected')}</dt>
                <dd>
                  <Data data-testid="rs-guard-selected">{mine.size}</Data>{' '}
                  <span className="text-xs text-text-tertiary">
                    {t('rs.guard.inside', { count: effect.insideLeadTime })}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-text-secondary">{t('rs.guard.share')}</dt>
                <dd>
                  <Data data-testid="rs-guard-before">
                    {pctShare(/** @type {RescheduleView} */ (run).planChange.share)}
                  </Data>{' '}
                  → <Data data-testid="rs-guard-after">{pctShare(guardAfter?.share ?? null)}</Data>
                </dd>
              </div>
              <div>
                <dt className="text-text-secondary">{t('rs.guard.effect')}</dt>
                <dd>
                  <Data data-testid="rs-selection-freed">
                    {t('rs.palletWeeks', { value: pw(effect.freedOverPalletWeeks) })}
                  </Data>{' '}
                  ·{' '}
                  <Data data-testid="rs-selection-saving">
                    {formatIDR(Math.round(effect.rentSavedIdr))}
                  </Data>
                  <div className="text-xs text-text-tertiary">
                    {t('rs.guard.penalty')}{' '}
                    <Data>{formatIDR(Math.round(effect.changePenaltyIdr))}</Data>
                  </div>
                </dd>
              </div>
            </dl>
            <p className="text-xs text-text-tertiary mt-2">{t('rs.guard.callOffs')}</p>
          </section>

          <section
            className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-6"
            data-testid="rs-relief"
          >
            <h2 className="text-section text-text-primary mb-1">{t('rs.relief.title')}</h2>
            <p className="text-xs text-text-tertiary mb-3">{t('rs.relief.intro')}</p>
            {relief.length === 0 ? (
              <p
                className="text-sm text-text-tertiary py-6 text-center"
                data-testid="rs-relief-empty"
              >
                {t('rs.relief.empty')}
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2 mb-3">
                  <Button variant="outline" onClick={selectFree} data-testid="rs-select-free">
                    {t('rs.relief.selectFree', { count: freeCount })}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={clearSelection}
                    data-testid="rs-select-clear"
                  >
                    {t('rs.relief.clear')}
                  </Button>
                </div>
                {proposalRows(relief, true, 'rs-relief')}
              </>
            )}
          </section>

          {/* FUX A4 (F-08): the on-hand caveat sits under the proposals, not above them. */}
          {onHandWeeks.length > 0 && (
            <p className="text-sm text-text-secondary mb-4" data-testid="rs-onhand-note">
              {t('rs.onHand.note', {
                count: onHandWeeks.length,
                first: weekLabel(onHandWeeks[0].weekStart),
                last: weekLabel(onHandWeeks[onHandWeeks.length - 1].weekStart)
              })}
            </p>
          )}

          {shortage.length > 0 && (
            <section
              className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-6"
              data-testid="rs-shortage"
            >
              <h2 className="text-section text-text-primary mb-1">{t('rs.shortage.title')}</h2>
              <p className="text-xs text-text-tertiary mb-3">{t('rs.shortage.intro')}</p>
              {proposalRows(shortage, true, 'rs-shortage')}
            </section>
          )}

          {noSaving.length > 0 && (
            <details
              className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-6"
              data-testid="rs-nosaving"
            >
              <summary className="text-section text-text-primary cursor-pointer">
                {t('rs.noSaving.title', { count: noSaving.length })}
              </summary>
              <p className="text-xs text-text-tertiary my-3">{t('rs.noSaving.intro')}</p>
              {proposalRows(noSaving, false, 'rs-nosaving')}
            </details>
          )}

          <details
            className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-6"
            data-testid="rs-fill"
          >
            <summary className="cursor-pointer">
              <h2 className="inline text-section text-text-primary">{t('rs.fill.title')}</h2>
            </summary>
            <p className="text-xs text-text-secondary mt-3 mb-1" data-testid="rs-fill-basis">
              {t('rs.fill.basis')}
            </p>
            <p className="text-xs text-text-tertiary mb-3">{t('rs.fill.intro')}</p>
            <FillChart w={w} selected={effect.fill} />
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableHeaderCell>{t('rs.fill.col.week')}</TableHeaderCell>
                  <TableHeaderCell>{t('rs.fill.col.now')}</TableHeaderCell>
                  <TableHeaderCell>{t('rs.fill.col.selected')}</TableHeaderCell>
                  <TableHeaderCell>{t('rs.fill.col.allRelief')}</TableHeaderCell>
                  <TableHeaderCell>{t('rs.fill.col.onHand')}</TableHeaderCell>
                  <TableHeaderCell>{t('rs.fill.col.status')}</TableHeaderCell>
                </TableHeader>
                <tbody>
                  {w.weeks.map((wk, i) => (
                    <TableRow key={wk.weekStart} data-testid={`rs-week-${wk.weekStart}`}>
                      <TableCell className="whitespace-nowrap">
                        <Data>{weekLabel(wk.weekStart)}</Data>
                        <div className="text-xs text-text-tertiary">
                          <Data>{formatDate(wk.weekStart)}</Data>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Data data-testid={`rs-fill-now-${wk.weekStart}`}>{pct(wk.fill)}</Data>
                      </TableCell>
                      <TableCell>
                        <Data data-testid={`rs-fill-selected-${wk.weekStart}`}>
                          {pct(effect.fill[i])}
                        </Data>
                      </TableCell>
                      <TableCell>
                        <Data
                          className="text-text-secondary"
                          data-testid={`rs-fill-relief-${wk.weekStart}`}
                        >
                          {pct(wk.fillAfterRelief)}
                        </Data>
                      </TableCell>
                      <TableCell>
                        <Data className="text-text-secondary">{pct(wk.onHandFill)}</Data>
                      </TableCell>
                      <TableCell>
                        {wk.onHandOverPallets > 0 ? (
                          <StatusPill variant="danger">{t('rs.fill.status.onHand')}</StatusPill>
                        ) : effect.fill[i] > 1 ? (
                          <StatusPill variant="danger">{t('rs.fill.status.over')}</StatusPill>
                        ) : effect.fill[i] > STANDARD ? (
                          <StatusPill variant="warning">{t('rs.fill.status.above')}</StatusPill>
                        ) : (
                          <StatusPill variant="success">{t('rs.fill.status.within')}</StatusPill>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </tbody>
              </Table>
            </div>
          </details>

          {w.info.length > 0 && (
            <details
              className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-6"
              data-testid="rs-info"
            >
              <summary className="cursor-pointer">
                <h2 className="inline text-section text-text-primary">{t('rs.info.title')}</h2>
              </summary>
              <p className="text-xs text-text-tertiary my-3">{t('rs.info.intro')}</p>
              <ul className="text-sm space-y-1">
                {w.info.map((i) => (
                  <li key={i.line.id} data-testid={`rs-info-${i.line.id}`}>
                    <Data>{i.line.reference}</Data> · {i.materialLabel} ·{' '}
                    <Data>{formatDate(i.line.date)}</Data> —{' '}
                    <span className="text-text-secondary">{t(`rs.info.reason.${i.reason}`)}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}

      {run && (
        <details
          className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-5"
          data-testid="rs-settings"
        >
          <summary className="cursor-pointer">
            <h2 className="inline text-section text-text-primary">{t('rs.settings.title')}</h2>
          </summary>
          <dl className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div data-testid="rs-setting-threshold">
              <dt className="text-text-secondary">{t('rs.settings.threshold')}</dt>
              <dd>
                <Data>{t('rs.settings.weeks', { count: run.thresholdWeeks })}</Data>
                <div className="text-xs text-text-tertiary">{t('rs.settings.thresholdNote')}</div>
              </dd>
            </div>
            <div data-testid="rs-setting-rent">
              <dt className="text-text-secondary">{t('rs.settings.rent')}</dt>
              <dd>
                <Data>{formatIDR(run.costs.rentIdrPerPalletWeek)}</Data>
                <div className="text-xs text-warning-hover">
                  {t('rs.settings.placeholderFinance')}
                </div>
              </dd>
            </div>
            <div data-testid="rs-setting-penalty">
              <dt className="text-text-secondary">{t('rs.settings.penalty')}</dt>
              <dd>
                <Data>{formatIDR(run.costs.changePenaltyIdrPerPallet)}</Data>
                <div className="text-xs text-warning-hover">
                  {t('rs.settings.placeholderPlanner')}
                </div>
              </dd>
            </div>
          </dl>
          <p className="text-xs text-text-tertiary mt-2">{t('rs.settings.where')}</p>
        </details>
      )}

      <details
        className="bg-bg-surface border border-border-subtle rounded-lg p-4 text-sm text-text-secondary space-y-2"
        data-testid="rs-definitions"
      >
        <summary className="cursor-pointer">
          <h2 className="inline text-section text-text-primary">{t('rs.def.title')}</h2>
        </summary>
        <p>{t('rs.method')}</p>
        <p>{t('rs.def.need')}</p>
        <p>{t('rs.def.types')}</p>
        <p>{t('rs.def.zones')}</p>
        <p>{t('rs.def.value')}</p>
        <p>{t('rs.def.onHand')}</p>
        {run && run.unconfirmedPoLines > 0 && (
          <p data-testid="rs-unconfirmed">
            {t('rs.def.unconfirmed', { count: run.unconfirmedPoLines })}
          </p>
        )}
      </details>

      <AboutThisPage>
        <p>{t('rs.subtitle')}</p>
        <p data-testid="rs-synthetic-note">{t('rs.synthetic')}</p>
        {withheld && <p data-testid="rs-withheld-note">{t('rs.withheld')}</p>}
      </AboutThisPage>
    </AppShellV2>
  );
};

export default BuyerReschedule;
