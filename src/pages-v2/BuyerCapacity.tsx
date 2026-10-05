import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useReasonLabel } from './admin/reasonCodeDisplay';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import {
  OrderNotFound,
  PoFilterBanner,
  usePoDrillFilter,
} from './orders/PoDrillFilter';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import SampleDataBadge from '@components/ui-v2/SampleDataBadge';
import FilterChipsBar from '@components/ui-v2/FilterChipsBar';
import Data from '@components/ui-v2/Data';
import Button from '@components/ui-v2/Button';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import { formatDate, formatDateTime } from '@lib/format';
import { useCapacityPlans } from '@services/query/hooks';
import type { CapacityPlan } from '@services/data/types';
import {
  gapWeeks,
  isGapWeek,
  ltpCapacityWeeks,
  planStatus,
  type CapacityConfirmationStatus,
} from '@services/transitions/capacityRules';
import { CapacityStatusPill, LtpCheckPill, inputClass, inventoryNow, labelClass, qty } from './inventory/inventoryDisplay';
import { ReEntryPill, usePlanningGroupLabel } from './inventory/planningGroupDisplay';
import {
  anyCapacityFilter,
  planMatches,
  readCapacityFilters,
  weekMatches,
  withCapacityFilter,
  withoutCapacityFilters,
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
// + additional capacity) and the flag: amber "needs the additional capacity",
// red "cannot be supplied" — the red week is where the planner acts.
// ─────────────────────────────────────────────────────────────────────────────

type StatusFilter = 'all' | CapacityConfirmationStatus;

const BuyerCapacity: React.FC = () => {
  const { t } = useTranslation();
  const reasonLabel = useReasonLabel();
  const groupLabel = usePlanningGroupLabel();
  const plansQuery = useCapacityPlans();
  const [filter, setStatusFilter] = useState<StatusFilter>('all');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [params, setParams] = useSearchParams();
  const filters = readCapacityFilters(params);
  const setFilter = (key: Parameters<typeof withCapacityFilter>[1], value: string | boolean | null) =>
    setParams(withCapacityFilter(params, key, value), { replace: true });
  const nowIso = inventoryNow();
  const crumb = [t('hub.nav.section.inventory'), t('inv.capacity.pti.title')];

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
        (drill.groups === null || drill.groups.length === 0 || drill.groups.includes(p.planningGroupId)),
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
    drill.kind === 'filtered' && drill.weeks !== null && drill.weeks.length > 0 && drillWeeks === null;

  if (plansQuery.isPending || drill.kind === 'pending') return <LoadingState breadcrumb={crumb} />;
  if (drill.kind === 'notFound') return <OrderNotFound persona="buyer" breadcrumb={crumb} />;
  if (plansQuery.isError)
    return <ErrorState breadcrumb={crumb} error={plansQuery.error} onRetry={() => plansQuery.refetch()} />;

  const keyOf = (p: CapacityPlan) => `${p.supplierId}-${p.planningGroupId}`;
  const withGap = plans.filter((p) => planStatus(p) === 'gap');
  const ltpByPlan = new Map(plans.map((p) => [keyOf(p), ltpCapacityWeeks(p)]));
  const ltpCount = (p: CapacityPlan, level: 'cannotSupply' | 'needsAdditional') =>
    (ltpByPlan.get(keyOf(p)) ?? []).filter((w) => w.level === level).length;
  const withRed = plans.filter((p) => ltpCount(p, 'cannotSupply') > 0);
  // The option lists come from the drill-narrowed plans, so a filter can never
  // offer a supplier the PO filter has already excluded.
  const supplierOptions = [...new Map(plans.map((p) => [p.supplierId, p.supplierName])).entries()].sort((a, b) =>
    a[1].localeCompare(b[1]),
  );
  const groupOptions = [...new Set(plans.map((p) => p.planningGroupId))].sort();
  const materialOptions = [
    ...new Set(
      plans
        .filter((p) => (filters.supplierId === null || p.supplierId === filters.supplierId) && (filters.planningGroupId === null || p.planningGroupId === filters.planningGroupId))
        .flatMap((p) => p.materials),
    ),
  ].sort();
  const filtered = plans.filter((p) => planMatches(p, filters));
  const shown = filtered.filter((p) => filter === 'all' || planStatus(p) === filter);
  const filtersActive = anyCapacityFilter(filters) || filter !== 'all';
  const clearFilters = () => {
    setStatusFilter('all');
    setParams(withoutCapacityFilters(params), { replace: true });
  };
  // AC-03 / AC-04 — arriving from one order, the grid is OPEN: a collapsed
  // section would be a list of one, which the requirement rules out.
  const isOpen = (p: CapacityPlan) =>
    expanded[keyOf(p)] ?? (drill.kind === 'filtered' || planStatus(p) === 'gap');
  const count = (f: StatusFilter) => (f === 'all' ? filtered.length : filtered.filter((p) => planStatus(p) === f).length);

  return (
    <AppShellV2>
      <PageHeader breadcrumb={crumb} title={t('inv.capacity.pti.title')} subtitle={t('inv.capacity.pti.subtitle')} />
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto_auto] items-end gap-3 mb-3" data-testid="capacity-filters">
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

      <FilterChipsBar<StatusFilter>
        options={(['all', 'gap', 'notStarted', 'outdated', 'confirmed'] as StatusFilter[]).map((f) => ({
          id: f,
          label: `${f === 'all' ? t('inv.filter.all') : t(`inv.capacity.status.${f}`)} (${count(f)})`,
        }))}
        value={filter}
        onChange={setStatusFilter}
        className="mb-4"
      />

      <div className="space-y-3">
        {shown.map((p) => {
          const open = isOpen(p);
          const gaps = gapWeeks(p);
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
                {open ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
                <span className="text-sm font-semibold text-text-primary">{p.supplierName}</span>
                <span className="text-sm text-text-secondary">{groupLabel(p.planningGroupId)}</span>
                <CapacityStatusPill status={planStatus(p)} />
                {gaps.length > 0 && (
                  <span className="text-xs text-warning-hover">{t('inv.capacity.gapWeeks', { count: gaps.length })}</span>
                )}
                {ltpCount(p, 'cannotSupply') > 0 && (
                  <span className="text-xs text-danger" data-testid={`capacity-red-count-${keyOf(p)}`}>
                    {t('inv.capacity.ltpWeeks.cannotSupply', { count: ltpCount(p, 'cannotSupply') })}
                  </span>
                )}
                {ltpCount(p, 'needsAdditional') > 0 && (
                  <span className="text-xs text-warning-hover" data-testid={`capacity-amber-count-${keyOf(p)}`}>
                    {t('inv.capacity.ltpWeeks.needsAdditional', { count: ltpCount(p, 'needsAdditional') })}
                  </span>
                )}
                <span className="ml-auto text-xs text-text-tertiary">
                  {p.latest ? (
                    <>
                      {t('inv.capacity.lastSubmitted')} <Data>{formatDateTime(p.latest.submittedAt)}</Data>
                    </>
                  ) : (
                    t('inv.capacity.neverSubmitted')
                  )}
                </span>
              </button>
              {open && (
                <div className="overflow-x-auto border-t border-border-subtle">
                  <p className="px-4 pt-2 text-xs text-text-tertiary" data-testid={`capacity-upside-help-${keyOf(p)}`}>
                    {t('inv.capacity.upsideHelpPti')}
                  </p>
                  <p className="px-4 pt-1 text-xs text-text-tertiary">{t('inv.capacity.ltpHelpPti')}</p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-label text-text-tertiary uppercase bg-bg-hover">
                        <th className="text-left px-4 py-2">{t('inv.capacity.col.week')}</th>
                        <th className="text-right px-4 py-2">{t('inv.capacity.col.ltp', { uom: p.uom })}</th>
                        <th className="text-right px-4 py-2">{t('inv.capacity.col.allocated', { uom: p.uom })}</th>
                        <th className="text-right px-4 py-2">{t('inv.capacity.col.upside', { uom: p.uom })}</th>
                        <th className="text-right px-4 py-2">{t('inv.capacity.col.be', { uom: p.uom })}</th>
                        <th className="text-left px-4 py-2">{t('inv.capacity.col.ltpCheck')}</th>
                        <th className="text-right px-4 py-2">{t('inv.capacity.col.gap', { uom: p.uom })}</th>
                        <th className="text-left px-4 py-2">{t('inv.capacity.col.reason')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {p.weeks
                        .filter((w) => drillWeeks === null || drillWeeks.includes(w.week))
                        .filter((w) => weekMatches(w, filters))
                        .map((w) => {
                        const gap = isGapWeek(w);
                        const lw = ltpByPlan.get(keyOf(p))?.find((x) => x.week === w.week);
                        return (
                          <tr
                            key={w.week}
                            className={`border-t border-border-subtle ${gap ? 'bg-warning-soft' : ''}`}
                            data-testid={gap ? `capacity-gap-${keyOf(p)}-${w.week}` : undefined}
                          >
                            <td className="px-4 py-2">
                              <Data>{formatDate(w.week)}</Data>
                              {w.needsReEntry ? <ReEntryPill testId={`capacity-reentry-${keyOf(p)}-${w.week}`} /> : null}
                            </td>
                            <td className="px-4 py-2 text-right">
                              <Data>{qty(lw?.ltp ?? 0)}</Data>
                            </td>
                            <td className="px-4 py-2 text-right">
                              {w.entry ? <Data>{qty(w.entry.allocated)}</Data> : <span className="text-text-tertiary">{t('inv.capacity.notStated')}</span>}
                            </td>
                            <td className="px-4 py-2 text-right">
                              {w.entry?.upside !== undefined ? <Data>{qty(w.entry.upside)}</Data> : <span className="text-text-tertiary">—</span>}
                            </td>
                            <td className="px-4 py-2 text-right">
                              {lw?.be != null ? <Data>{qty(lw.be)}</Data> : <span className="text-text-tertiary">—</span>}
                            </td>
                            <td className="px-4 py-2">
                              {lw && <LtpCheckPill level={lw.level} testId={`capacity-ltp-${keyOf(p)}-${w.week}`} />}
                            </td>
                            <td className={`px-4 py-2 text-right ${gap ? 'text-warning-hover font-semibold' : ''}`}>
                              {gap && w.entry ? <Data>{qty(w.demand - w.entry.allocated)}</Data> : <span className="text-text-tertiary">—</span>}
                            </td>
                            <td className="px-4 py-2 text-text-secondary">
                              {w.entry?.reason ? (
                                <>
                                  {reasonLabel('capacityShortfall', w.entry.reason)}
                                  {w.entry.note ? ` — ${w.entry.note}` : ''}
                                </>
                              ) : (
                                '—'
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
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
            <p className="text-base font-semibold text-text-primary mb-1">{t('inv.capacity.filter.emptyTitle')}</p>
            <p className="text-sm text-text-tertiary mb-4">
              {filtersActive ? t('inv.capacity.filter.emptyBody') : t('inv.capacity.filter.emptyNone')}
            </p>
            {filtersActive && (
              <Button variant="outline" onClick={clearFilters} data-testid="capacity-filters-empty-clear">
                {t('inv.capacity.filter.clear')}
              </Button>
            )}
          </div>
        )}
      </div>
    </AppShellV2>
  );
};

export default BuyerCapacity;
