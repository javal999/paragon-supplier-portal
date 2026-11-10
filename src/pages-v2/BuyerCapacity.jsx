/** @import React from 'react' */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import TermLabel from '@components/ui-v2/TermLabel';
import { useActiveReasonCodes, useReasonLabel } from './admin/reasonCodeDisplay';
import ReasonFilter from './inventory/ReasonFilter';
import { reasonFilterOptions } from './inventory/reasonFilterRules';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import { OrderNotFound, PoFilterBanner, usePoDrillFilter } from './orders/PoDrillFilter';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import SampleDataBadge from '@components/ui-v2/SampleDataBadge';
import FilterChipsBar from '@components/ui-v2/FilterChipsBar';
import Data from '@components/ui-v2/Data';
import WeekGrid from '@components/ui-v2/WeekGrid';
import Button from '@components/ui-v2/Button';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import { formatDate, formatDateTime } from '@lib/format';
import { useCapacityDecisions, useCapacityPlans } from '@services/query/hooks';
/** @import { CapacityDecision, CapacityPlan } from '@services/data/types' */
/** @import { CapacityConfirmationStatus } from '@services/transitions/capacityRules' */
import { isGapWeek, ltpCapacityWeeks, planStatus } from '@services/transitions/capacityRules';
import {
  PRODUCTION_LIMIT_QUESTION,
  allocatedIsProductionLimit
} from '@services/transitions/drcBufferRules';
import StrategicBufferSection from './inventory/StrategicBufferSection';
import ProtectionBufferSection from './inventory/ProtectionBufferSection';
import CapacityHeadsUpSection from './inventory/CapacityHeadsUpSection';
import {
  CapacityStatusPill,
  LtpCheckPill,
  inputClass,
  inventoryNow,
  labelClass,
  ltpSeverity,
  qty
} from './inventory/inventoryDisplay';
import { ReEntryPill, usePlanningGroupLabel } from './inventory/planningGroupDisplay';
import { CapacityGapActions, PtiDecisionLine } from './inventory/CapacityGapActions';
import { capacityDecisionKey } from '@services/transitions/capacityDecisionRules';
import {
  anyCapacityFilter,
  planMatches,
  readCapacityFilters,
  weekMatches,
  withCapacityFilter,
  withoutCapacityFilters
} from './inventory/capacityFilters';

// ─────────────────────────────────────────────────────────────────────────────
// PTI CAPACITY — REQ-E08-04 AC-03: allocated capacity against demand per
// supplier × planning group per week, with gap weeks highlighted and the
// supplier's reason beside them. Read-only for the planner.
//
// Material C5 (MR-8 BR-04, BR-05, BR-07) — the group is the planning group,
// named from the planning group store; the filter is by planning group; a week
// a move asks the supplier to re-enter reads "Needs re-entry".
//
// BR-07 / AC-04 (BL-63) — the planner narrows the view by supplier, material
// group, material and gap weeks only. Those four live in the page ADDRESS
// (`capacityFilters.js`), and compose with the status chips and the Order
// summary's PO drill filter: drill → supplier/group/material/gaps → status.
//
// BL-133 (ENG-D18) — the ONE demand figure is the group's LTP (the current
// forecast, summed over the group's materials; owner, 2026-09-29): the gap,
// "short by", the banner and the filters all read it. Beside it, BE (capacity
// + additional capacity) and the flag: amber "needs additional capacity",
// red "cannot be supplied" — the red week is where the planner acts.
//
// CAP-3 (BL-172) — the flag is the one capacity-state pill; an amber week says
// whether the supplier confirmed its additional capacity (BR-03), and the
// accordion header counts each non-green state (BR-02).
//
// INV-D8 (Inventory UX P-07) — the planner acts on a gap week: a "PTI's
// decision" row offers "Accept additional capacity" on an amber week (the
// governed `t_capacitydecision_accept`, recorded on the supplier × planning
// group × week), says how much a red week's additional capacity cannot cover,
// and offers "Ask supplier" (lane 2A's hub ask) on both. The row header reads
// "PTI's decision: pending / accepted <date>". "Move demand" is not built here.
//
// CAP-5 BR-02 (BL-174) — the Reason filter over `capacityShortfall`, in the
// address with the others, narrows WEEKS together with Gaps only; each reason
// shows how many of the weeks the other filters leave carry it.
// ─────────────────────────────────────────────────────────────────────────────

/** @typedef {'all' | CapacityConfirmationStatus} StatusFilter */

/**
 * CAP-1 wave 1 (Table B) — one supplier × planning group's weeks as columns.
 * B-04: the Gaps only filter and a PO drill-down hide week COLUMNS (`weeks` is
 * already narrowed), and a filter that leaves no week says so.
 * @type {React.FC<{
 *   plan: CapacityPlan;
 *   planKey: string;
 *   label: string;
 *   nowIso: string;
 *   ltpWeeks: ReturnType<typeof ltpCapacityWeeks>;
 *   weeks: CapacityPlan['weeks'];
 *   decisionOf: (week: string) => CapacityDecision | undefined;
 * }>}
 */
const PlanWeekGrid = ({ plan, planKey, label, nowIso, ltpWeeks, weeks, decisionOf }) => {
  const { t } = useTranslation();
  const reasonLabel = useReasonLabel();
  if (weeks.length === 0)
    return (
      <p
        className="px-4 py-4 text-sm text-text-tertiary"
        data-testid={`capacity-no-week-${planKey}`}
      >
        {t('inv.capacity.grid.noWeekMatches')}
      </p>
    );
  /** @param {string} week */
  const byWeek = (week) =>
    /** @type {CapacityPlan['weeks'][number]} */ (weeks.find((w) => w.week === week));
  /** @param {string} week */
  const lwOf = (week) => ltpWeeks.find((x) => x.week === week);
  const dash = <span className="text-text-tertiary">—</span>;
  return (
    <WeekGrid
      label={label}
      corner={t('inv.capacity.col.week')}
      currentWeek={nowIso.slice(0, 10)}
      testId={`capacity-grid-${planKey}`}
      // CAP-2 BR-01 — one choice for every accordion on the page.
      viewKey="buyerCapacity"
      weeks={weeks.map((w) => ({
        week: w.week,
        gap: isGapWeek(w),
        testId: isGapWeek(w)
          ? `capacity-gap-${planKey}-${w.week}`
          : `capacity-week-${planKey}-${w.week}`,
        marker: w.needsReEntry ? (
          <ReEntryPill testId={`capacity-reentry-${planKey}-${w.week}`} />
        ) : undefined
      }))}
      rows={[
        {
          id: 'ltp',
          label: <TermLabel term="capacityLtp" />,
          unit: plan.uom,
          combine: 'sum',
          value: (week) => lwOf(week)?.ltp ?? 0,
          format: qty,
          cell: (week) => (
            <Data data-testid={`capacity-ltp-qty-${planKey}-${week}`}>
              {qty(lwOf(week)?.ltp ?? 0)}
            </Data>
          )
        },
        {
          id: 'allocated',
          // DRC-9b [Default E3] — the allocated capacity IS the production limit
          // (MoM 3): the same figure, named so, not a second row. Under the
          // reserved 'sadrFeed' source it is not, and the label stays "Allocated".
          label: allocatedIsProductionLimit() ? (
            <span>
              <TermLabel term="productionLimit" />
              <span
                className="block text-xs text-text-tertiary"
                data-testid={`capacity-production-limit-provisional-${planKey}`}
              >
                {t('buffers.provisional', { question: PRODUCTION_LIMIT_QUESTION })}
              </span>
            </span>
          ) : (
            <TermLabel term="allocatedCapacity" />
          ),
          unit: plan.uom,
          combine: 'sum',
          value: (week) => byWeek(week).entry?.allocated ?? null,
          monthCell: (/** @type {number | null} */ v) =>
            v === null ? (
              <span className="text-text-tertiary">{t('inv.capacity.notStated')}</span>
            ) : (
              <Data>{qty(v)}</Data>
            ),
          cell: (week) => {
            const w = byWeek(week);
            return w.entry ? (
              <Data data-testid={`capacity-allocated-${planKey}-${week}`}>
                {qty(w.entry.allocated)}
              </Data>
            ) : (
              <span
                className="text-text-tertiary"
                data-testid={`capacity-allocated-${planKey}-${week}`}
              >
                {t('inv.capacity.notStated')}
              </span>
            );
          }
        },
        {
          id: 'upside',
          label: <TermLabel term="additionalCapacity" />,
          unit: plan.uom,
          combine: 'sum',
          value: (week) => byWeek(week).entry?.upside ?? null,
          format: qty,
          cell: (week) => {
            const w = byWeek(week);
            return (
              <span data-testid={`capacity-upside-${planKey}-${week}`}>
                {w.entry?.upside !== undefined ? <Data>{qty(w.entry.upside)}</Data> : dash}
              </span>
            );
          }
        },
        {
          id: 'be',
          label: <TermLabel term="capacityBe" />,
          unit: plan.uom,
          combine: 'sum',
          value: (week) => lwOf(week)?.be ?? null,
          format: qty,
          cell: (week) => {
            const lw = lwOf(week);
            return (
              <span data-testid={`capacity-be-${planKey}-${week}`}>
                {lw?.be != null ? <Data>{qty(lw.be)}</Data> : dash}
              </span>
            );
          }
        },
        {
          id: 'ltpCheck',
          label: <TermLabel term="ltpAgainstCapacity" />,
          align: 'start',
          // CAP-2 BR-03 — the month's worst week, with how many weeks hold it.
          combine: 'status',
          value: (week) => lwOf(week)?.level ?? null,
          severity: ltpSeverity,
          monthCell: (level, m) => (
            <LtpCheckPill level={level} testId={`capacity-ltp-${planKey}-month-${m.key}`} />
          ),
          cell: (week) => {
            const lw = lwOf(week);
            return lw ? (
              <LtpCheckPill
                level={lw.level}
                confirmed={lw.upsideConfirmed}
                testId={`capacity-ltp-${planKey}-${week}`}
              />
            ) : null;
          }
        },
        {
          id: 'gap',
          label: <TermLabel term="capacityShortBy" />,
          unit: plan.uom,
          combine: 'sum',
          value: (week) => {
            const w = byWeek(week);
            return isGapWeek(w) && w.entry ? w.demand - w.entry.allocated : null;
          },
          monthCell: (/** @type {number | null} */ v) =>
            v === null ? (
              dash
            ) : (
              <span className="text-warning-hover font-semibold">
                <Data>{qty(v)}</Data>
              </span>
            ),
          cell: (week) => {
            const w = byWeek(week);
            const gap = isGapWeek(w);
            return (
              <span
                data-testid={`capacity-short-${planKey}-${week}`}
                className={gap ? 'text-warning-hover font-semibold' : ''}
              >
                {gap && w.entry ? <Data>{qty(w.demand - w.entry.allocated)}</Data> : dash}
              </span>
            );
          }
        },
        {
          id: 'reason',
          label: t('inv.capacity.col.reason'),
          align: 'start',
          combine: 'distinct',
          value: (week) => {
            const e = byWeek(week).entry;
            if (!e?.reason) return null;
            const name = reasonLabel('capacityShortfall', e.reason);
            return e.note ? `${name} — ${e.note}` : name;
          },
          cell: (week) => {
            const w = byWeek(week);
            return (
              <span
                className="text-text-secondary break-words"
                data-testid={`capacity-reason-${planKey}-${week}`}
              >
                {w.entry?.reason ? (
                  <>
                    {reasonLabel('capacityShortfall', w.entry.reason)}
                    {w.entry.note ? ` — ${w.entry.note}` : ''}
                  </>
                ) : (
                  '—'
                )}
              </span>
            );
          }
        },
        {
          // INV-D8 — PTI's actions on a gap week (weekly view only: Monthly is
          // read only, CAP-D6, so the month reads "—").
          id: 'ptiDecision',
          label: <TermLabel term="ptiCapacityDecision" />,
          align: 'start',
          cell: (week) => {
            const lw = lwOf(week);
            return lw && isGapWeek(byWeek(week)) ? (
              <CapacityGapActions
                supplierId={plan.supplierId}
                planningGroupId={plan.planningGroupId}
                uom={plan.uom}
                week={lw}
                decision={decisionOf(week)}
                testKey={`${planKey}-${week}`}
              />
            ) : (
              <span data-testid={`capacity-no-action-${planKey}-${week}`}>{dash}</span>
            );
          }
        }
      ]}
    />
  );
};

/** @type {React.FC} */
const BuyerCapacity = () => {
  const { t } = useTranslation();
  const groupLabel = usePlanningGroupLabel();
  const plansQuery = useCapacityPlans();
  const decisionsQuery = useCapacityDecisions();
  const [filter, setStatusFilter] = useState(/** @type {StatusFilter} */ ('all'));
  const [expanded, setExpanded] = useState(/** @type {Record<string, boolean>} */ ({}));
  const [params, setParams] = useSearchParams();
  const filters = readCapacityFilters(params);
  /**
   * @param {Parameters<typeof withCapacityFilter>[1]} key
   * @param {string | boolean | null | readonly string[]} value
   */
  const setFilter = (key, value) =>
    setParams(withCapacityFilter(params, key, value), { replace: true });
  const nowIso = inventoryNow();
  const crumb = [t('hub.nav.section.inventory'), t('inv.capacity.pti.title')];
  const activeReasons = useActiveReasonCodes('capacityShortfall');

  const allPlans = useMemo(() => plansQuery.data?.items ?? [], [plansQuery.data]);
  // ── REQ-E07-03 BR-05 / AC-04 ──────────────────────────────────────────────
  // Capacity is agreed per supplier x material group per week, so a PO cannot be
  // its filter — the PO's SUPPLIER, its MATERIAL GROUPS and its DELIVERY WEEKS
  // are. The banner says exactly that, because a planner who arrived from one
  // order must not read a wider agreement as if it were about that order alone.
  const drill = usePoDrillFilter();
  const plans = useMemo(() => {
    if (drill.kind !== 'filtered') return allPlans;
    return allPlans.filter(
      (p) =>
        p.supplierId === drill.po.supplierId &&
        (drill.groups === null ||
          drill.groups.length === 0 ||
          drill.groups.includes(p.planningGroupId))
    );
  }, [allPlans, drill]);
  /** The PO's delivery weeks, kept only where the horizon actually covers them. */
  const drillWeeks = useMemo(() => {
    if (drill.kind !== 'filtered' || drill.weeks === null) return null;
    const horizon = new Set(plans.flatMap((p) => p.weeks.map((w) => w.week)));
    const inHorizon = drill.weeks.filter((w) => horizon.has(w));
    return inHorizon.length > 0 ? inHorizon : null;
  }, [drill, plans]);
  const weeksOutsideHorizon =
    drill.kind === 'filtered' &&
    drill.weeks !== null &&
    drill.weeks.length > 0 &&
    drillWeeks === null;

  if (plansQuery.isPending || drill.kind === 'pending') return <LoadingState breadcrumb={crumb} />;
  if (drill.kind === 'notFound') return <OrderNotFound persona="buyer" breadcrumb={crumb} />;
  if (plansQuery.isError)
    return (
      <ErrorState
        breadcrumb={crumb}
        error={plansQuery.error}
        onRetry={() => plansQuery.refetch()}
      />
    );

  /** @param {CapacityPlan} p */
  const keyOf = (p) => `${p.supplierId}-${p.planningGroupId}`;
  // INV-D8 — PTI's decision per supplier × planning group × week.
  const decisions = new Map(
    (decisionsQuery.data?.items ?? []).map((d) => [
      capacityDecisionKey(d.supplierId, d.planningGroupId, d.week),
      d
    ])
  );
  /** @param {CapacityPlan} p */
  const decisionOfPlan = (p) => (/** @type {string} */ week) =>
    decisions.get(capacityDecisionKey(p.supplierId, p.planningGroupId, week));
  const withGap = plans.filter((p) => planStatus(p) === 'gap');
  const ltpByPlan = new Map(plans.map((p) => [keyOf(p), ltpCapacityWeeks(p)]));
  /**
   * BL-227 / INV-D12 — for the row's "PTI's decision" line: an acceptance on a
   * week that has since turned red no longer counts as decided.
   * @param {CapacityPlan} p
   */
  const decisionInForceOf = (p) => (/** @type {string} */ week) => {
    const level = ltpByPlan.get(keyOf(p))?.find((w) => w.week === week)?.level;
    return level === 'cannotSupply' ? undefined : decisionOfPlan(p)(week);
  };
  /**
   * CAP-3 BR-02 — weeks per non-green state. An amber week the supplier has
   * confirmed (BR-03) leaves "Needs additional" for "Confirmed additional".
   * @param {CapacityPlan} p
   * @param {'cannotSupply' | 'needsAdditional' | 'confirmedAdditional'} state
   */
  const ltpCount = (p, state) =>
    (ltpByPlan.get(keyOf(p)) ?? []).filter((w) =>
      state === 'cannotSupply'
        ? w.level === 'cannotSupply'
        : w.level === 'needsAdditional' && w.upsideConfirmed === (state === 'confirmedAdditional')
    ).length;
  /** @type {readonly { state: 'needsAdditional' | 'confirmedAdditional' | 'cannotSupply'; testId: string; tone: string }[]} */
  const HEADER_COUNTS = [
    { state: 'needsAdditional', testId: 'capacity-amber-count', tone: 'text-warning-hover' },
    {
      state: 'confirmedAdditional',
      testId: 'capacity-confirmed-count',
      tone: 'text-warning-hover'
    },
    { state: 'cannotSupply', testId: 'capacity-red-count', tone: 'text-danger' }
  ];
  const withRed = plans.filter((p) => ltpCount(p, 'cannotSupply') > 0);
  // The option lists come from the drill-narrowed plans, so a filter can never
  // offer a supplier the PO filter has already excluded.
  const supplierOptions = [
    ...new Map(plans.map((p) => [p.supplierId, p.supplierName])).entries()
  ].sort((a, b) => a[1].localeCompare(b[1]));
  const groupOptions = [...new Set(plans.map((p) => p.planningGroupId))].sort();
  const materialOptions = [
    ...new Set(
      plans
        .filter(
          (p) =>
            (filters.supplierId === null || p.supplierId === filters.supplierId) &&
            (filters.planningGroupId === null || p.planningGroupId === filters.planningGroupId)
        )
        .flatMap((p) => p.materials)
    )
  ].sort();
  const filtered = plans.filter((p) => planMatches(p, filters));
  /**
   * The weeks a plan shows: the PO drill's weeks, then the filters.
   * @param {CapacityPlan} p
   * @param {Pick<typeof filters, 'gapsOnly' | 'reasons'>} f
   */
  const shownWeeks = (p, f) =>
    p.weeks
      .filter((w) => drillWeeks === null || drillWeeks.includes(w.week))
      .filter((w) => weekMatches(w, f));
  // CAP-5 BR-03 — each reason's count: the weeks every OTHER filter leaves.
  const noReason = { ...filters, reasons: [] };
  const reasonOptions = reasonFilterOptions(
    activeReasons,
    plans
      .filter((p) => planMatches(p, noReason))
      .filter((p) => filter === 'all' || planStatus(p) === filter)
      .flatMap((p) => shownWeeks(p, noReason).map((w) => w.entry?.reason))
  );
  const shown = filtered.filter((p) => filter === 'all' || planStatus(p) === filter);
  const filtersActive = anyCapacityFilter(filters) || filter !== 'all';
  const clearFilters = () => {
    setStatusFilter('all');
    setParams(withoutCapacityFilters(params), { replace: true });
  };
  // AC-03 / AC-04 — arriving from one order, the grid is OPEN: a collapsed
  // section would be a list of one, which the requirement rules out.
  /** @param {CapacityPlan} p */
  const isOpen = (p) =>
    expanded[keyOf(p)] ?? (drill.kind === 'filtered' || planStatus(p) === 'gap');
  /** @param {StatusFilter} f */
  const count = (f) =>
    f === 'all' ? filtered.length : filtered.filter((p) => planStatus(p) === f).length;

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={crumb}
        title={t('inv.capacity.pti.title')}
        subtitle={t('inv.capacity.pti.subtitle')}
      />
      <PageMetaLine className="-mt-6 mb-4">
        {t('inv.asOf')} <Data>{formatDate(nowIso)}</Data>
        <SampleDataBadge className="ml-3 align-middle" />
      </PageMetaLine>

      {withGap.length > 0 && (
        <div
          role="status"
          data-testid="pti-capacity-banner"
          className="bg-warning-soft border-l-2 border-warning rounded px-4 py-3 mb-4 text-sm text-warning-hover flex items-center gap-2"
        >
          <AlertTriangle size={14} aria-hidden="true" />
          {t('inv.capacity.pti.banner', { count: withGap.length })}
        </div>
      )}

      {withRed.length > 0 && (
        <div
          role="status"
          data-testid="pti-capacity-banner-red"
          className="bg-danger-soft border-l-2 border-danger rounded px-4 py-3 mb-4 text-sm text-danger flex items-center gap-2"
        >
          <AlertTriangle size={14} aria-hidden="true" />
          {t('inv.capacity.pti.bannerRed', { count: withRed.length })}
        </div>
      )}

      {/* BR-04 / BR-05 — the filter, why these rows, and the way back. */}
      <PoFilterBanner drill={drill} persona="buyer" count={plans.length} reason="capacity" />
      {weeksOutsideHorizon && (
        <div
          role="status"
          data-testid="capacity-weeks-outside-horizon"
          className="bg-bg-hover border-l-2 border-border-subtle rounded px-4 py-3 mb-4 text-sm text-text-secondary"
        >
          {t('oc.drill.weeks.outside')}
        </div>
      )}

      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto_auto_auto] items-end gap-3 mb-3"
        data-testid="capacity-filters"
      >
        <div>
          <label htmlFor="capacity-filter-supplier" className={labelClass}>
            {t('inv.capacity.filter.supplier')}
          </label>
          <select
            id="capacity-filter-supplier"
            className={inputClass}
            value={filters.supplierId ?? ''}
            onChange={(e) => setFilter('supplier', e.target.value || null)}
          >
            <option value="">{t('inv.filter.all')}</option>
            {supplierOptions.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="capacity-filter-group" className={labelClass}>
            {t('inv.capacity.filter.group')}
          </label>
          <select
            id="capacity-filter-group"
            className={inputClass}
            value={filters.planningGroupId ?? ''}
            onChange={(e) => setFilter('planningGroup', e.target.value || null)}
          >
            <option value="">{t('inv.filter.all')}</option>
            {groupOptions.map((g) => (
              <option key={g} value={g}>
                {groupLabel(g)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="capacity-filter-material" className={labelClass}>
            {t('inv.capacity.filter.material')}
          </label>
          <select
            id="capacity-filter-material"
            className={inputClass}
            value={filters.materialCode ?? ''}
            onChange={(e) => setFilter('material', e.target.value || null)}
          >
            <option value="">{t('inv.filter.all')}</option>
            {materialOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <ReasonFilter
          list="capacityShortfall"
          options={reasonOptions}
          value={filters.reasons}
          onChange={(next) => setFilter('reason', next)}
          testId="capacity-filter-reason"
        />
        <label className="inline-flex items-center gap-2 text-sm text-text-primary pb-2">
          <input
            type="checkbox"
            checked={filters.gapsOnly}
            onChange={(e) => setFilter('gapsOnly', e.target.checked)}
            data-testid="capacity-filter-gaps"
          />
          {t('inv.capacity.filter.gapsOnly')}
        </label>
        {filtersActive && (
          <Button variant="secondary" onClick={clearFilters} data-testid="capacity-filters-clear">
            {t('inv.capacity.filter.clear')}
          </Button>
        )}
      </div>
      {filters.ignoredMalformed && (
        <p className="text-xs text-text-tertiary mb-3" data-testid="capacity-filters-malformed">
          {t('inv.capacity.filter.malformed')}
        </p>
      )}

      <FilterChipsBar
        options={
          /** @type {StatusFilter[]} */ (['all', 'gap', 'notStarted', 'outdated', 'confirmed']).map(
            (f) => ({
              id: f,
              label: `${f === 'all' ? t('inv.filter.all') : t(`inv.capacity.status.${f}`)} (${count(f)})`
            })
          )
        }
        value={filter}
        onChange={setStatusFilter}
        className="mb-4"
      />

      <div className="space-y-3">
        {shown.map((p) => {
          const open = isOpen(p);
          const counts = HEADER_COUNTS.map((c) => ({ ...c, count: ltpCount(p, c.state) })).filter(
            (c) => c.count > 0
          );
          return (
            <section
              key={keyOf(p)}
              data-testid={`capacity-plan-${keyOf(p)}`}
              className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm"
            >
              <button
                type="button"
                className="w-full px-4 py-3 flex flex-wrap items-center gap-3 text-left"
                aria-expanded={open}
                onClick={() => setExpanded({ ...expanded, [keyOf(p)]: !open })}
              >
                {open ? (
                  <ChevronDown size={16} aria-hidden="true" />
                ) : (
                  <ChevronRight size={16} aria-hidden="true" />
                )}
                <span className="text-sm font-semibold text-text-primary">{p.supplierName}</span>
                <span className="text-sm text-text-secondary">{groupLabel(p.planningGroupId)}</span>
                <CapacityStatusPill status={planStatus(p)} />
                {counts.length > 0 && (
                  <span className="text-xs" data-testid={`capacity-state-counts-${keyOf(p)}`}>
                    {counts.map((c, i) => (
                      <span key={c.state}>
                        {i > 0 && <span className="text-text-tertiary"> · </span>}
                        <span className={c.tone} data-testid={`${c.testId}-${keyOf(p)}`}>
                          {t(`inv.capacity.ltpWeeks.${c.state}`, { count: c.count })}
                        </span>
                      </span>
                    ))}
                  </span>
                )}
                <PtiDecisionLine
                  gapWeeks={p.weeks.filter(isGapWeek).map((w) => w.week)}
                  decisionOf={decisionInForceOf(p)}
                  testId={`capacity-decision-header-${keyOf(p)}`}
                />
                <span className="ml-auto text-xs text-text-tertiary">
                  {p.latest ? (
                    <>
                      {t('inv.capacity.lastSubmitted')}{' '}
                      <Data>{formatDateTime(p.latest.submittedAt)}</Data>
                    </>
                  ) : (
                    t('inv.capacity.neverSubmitted')
                  )}
                </span>
              </button>
              {open && (
                <div className="border-t border-border-subtle">
                  <p
                    className="px-4 pt-2 text-xs text-text-tertiary"
                    data-testid={`capacity-upside-help-${keyOf(p)}`}
                  >
                    {t('inv.capacity.upsideHelpPti')}
                  </p>
                  <p className="px-4 pt-1 pb-2 text-xs text-text-tertiary">
                    {t('inv.capacity.ltpHelpPti')}
                  </p>
                  <PlanWeekGrid
                    plan={p}
                    planKey={keyOf(p)}
                    label={`${p.supplierName} · ${groupLabel(p.planningGroupId)}`}
                    nowIso={nowIso}
                    ltpWeeks={ltpByPlan.get(keyOf(p)) ?? []}
                    weeks={shownWeeks(p, filters)}
                    decisionOf={decisionOfPlan(p)}
                  />
                </div>
              )}
            </section>
          );
        })}
        {shown.length === 0 && (
          <div
            className="bg-bg-surface border border-border-subtle rounded-lg py-10 px-6 text-center"
            data-testid="capacity-filters-empty"
          >
            <p className="text-base font-semibold text-text-primary mb-1">
              {t('inv.capacity.filter.emptyTitle')}
            </p>
            <p className="text-sm text-text-tertiary mb-4">
              {filtersActive
                ? t('inv.capacity.filter.emptyBody')
                : t('inv.capacity.filter.emptyNone')}
            </p>
            {filtersActive && (
              <Button
                variant="outline"
                onClick={clearFilters}
                data-testid="capacity-filters-empty-clear"
              >
                {t('inv.capacity.filter.clear')}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* PEX-4 (BL-269) — the 12-month heads-up: utilisation per month, per material and brand, treemap. */}
      <CapacityHeadsUpSection
        supplierId={filters.supplierId ?? (drill.kind === 'filtered' ? drill.po.supplierId : null)}
      />
      {/* DRC-9a (BL-195) — the strategic buffer, read only, under the plans. */}
      <StrategicBufferSection
        supplierId={filters.supplierId ?? (drill.kind === 'filtered' ? drill.po.supplierId : null)}
        materialCode={filters.materialCode}
      />
      {/* DRC-9c (BL-205) [Proposed] — the protection buffer, read only, beside it. */}
      <ProtectionBufferSection
        supplierId={filters.supplierId ?? (drill.kind === 'filtered' ? drill.po.supplierId : null)}
        materialCode={filters.materialCode}
      />
    </AppShellV2>
  );
};

export default BuyerCapacity;
