import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import {
  OrderNotFound,
  PoFilterBanner,
  usePoDrillFilter,
} from './orders/PoDrillFilter';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import SampleDataBadge from '../components/ui-v2/SampleDataBadge';
import FilterChipsBar from '../components/ui-v2/FilterChipsBar';
import Data from '../components/ui-v2/Data';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import { formatDate, formatDateTime } from '../lib/format';
import { useCapacityPlans } from '../services/query/hooks';
import type { CapacityPlan } from '../services/data/types';
import {
  gapWeeks,
  isGapWeek,
  planStatus,
  type CapacityConfirmationStatus,
} from '../services/transitions/capacityRules';
import { CapacityStatusPill, inventoryNow, qty } from './inventory/inventoryDisplay';

// ─────────────────────────────────────────────────────────────────────────────
// PTI CAPACITY — REQ-E08-04 AC-03: allocated capacity against demand per
// supplier × material group per week, with gap weeks highlighted and the
// supplier's reason beside them. Read-only for the planner.
// ─────────────────────────────────────────────────────────────────────────────

type StatusFilter = 'all' | CapacityConfirmationStatus;

const BuyerCapacity: React.FC = () => {
  const { t } = useTranslation();
  const plansQuery = useCapacityPlans();
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
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
        (drill.groups === null || drill.groups.length === 0 || drill.groups.includes(p.materialGroup)),
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

  const keyOf = (p: CapacityPlan) => `${p.supplierId}-${p.materialGroup}`;
  const withGap = plans.filter((p) => planStatus(p) === 'gap');
  const shown = plans.filter((p) => filter === 'all' || planStatus(p) === filter);
  // AC-03 / AC-04 — arriving from one order, the grid is OPEN: a collapsed
  // section would be a list of one, which the requirement rules out.
  const isOpen = (p: CapacityPlan) =>
    expanded[keyOf(p)] ?? (drill.kind === 'filtered' || planStatus(p) === 'gap');
  const count = (f: StatusFilter) => (f === 'all' ? plans.length : plans.filter((p) => planStatus(p) === f).length);

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

      <FilterChipsBar<StatusFilter>
        options={(['all', 'gap', 'notStarted', 'outdated', 'confirmed'] as StatusFilter[]).map((f) => ({
          id: f,
          label: `${f === 'all' ? t('inv.filter.all') : t(`inv.capacity.status.${f}`)} (${count(f)})`,
        }))}
        value={filter}
        onChange={setFilter}
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
                <span className="text-sm text-text-secondary">{t(`inv.group.${p.materialGroup}`)}</span>
                <CapacityStatusPill status={planStatus(p)} />
                {gaps.length > 0 && (
                  <span className="text-xs text-warning-hover">{t('inv.capacity.gapWeeks', { count: gaps.length })}</span>
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
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-label text-text-tertiary uppercase bg-bg-hover">
                        <th className="text-left px-4 py-2">{t('inv.capacity.col.week')}</th>
                        <th className="text-right px-4 py-2">{t('inv.capacity.col.demand', { uom: p.uom })}</th>
                        <th className="text-right px-4 py-2">{t('inv.capacity.col.allocated', { uom: p.uom })}</th>
                        <th className="text-right px-4 py-2">{t('inv.capacity.col.upside', { uom: p.uom })}</th>
                        <th className="text-right px-4 py-2">{t('inv.capacity.col.gap', { uom: p.uom })}</th>
                        <th className="text-left px-4 py-2">{t('inv.capacity.col.reason')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {p.weeks
                        .filter((w) => drillWeeks === null || drillWeeks.includes(w.week))
                        .map((w) => {
                        const gap = isGapWeek(w);
                        return (
                          <tr
                            key={w.week}
                            className={`border-t border-border-subtle ${gap ? 'bg-warning-soft' : ''}`}
                            data-testid={gap ? `capacity-gap-${keyOf(p)}-${w.week}` : undefined}
                          >
                            <td className="px-4 py-2">
                              <Data>{formatDate(w.week)}</Data>
                            </td>
                            <td className="px-4 py-2 text-right">
                              <Data>{qty(w.demand)}</Data>
                            </td>
                            <td className="px-4 py-2 text-right">
                              {w.entry ? <Data>{qty(w.entry.allocated)}</Data> : <span className="text-text-tertiary">{t('inv.capacity.notStated')}</span>}
                            </td>
                            <td className="px-4 py-2 text-right">
                              {w.entry?.upside !== undefined ? <Data>{qty(w.entry.upside)}</Data> : <span className="text-text-tertiary">—</span>}
                            </td>
                            <td className={`px-4 py-2 text-right ${gap ? 'text-warning-hover font-semibold' : ''}`}>
                              {gap && w.entry ? <Data>{qty(w.demand - w.entry.allocated)}</Data> : <span className="text-text-tertiary">—</span>}
                            </td>
                            <td className="px-4 py-2 text-text-secondary">
                              {w.entry?.reason ? (
                                <>
                                  {t(`inv.capacity.reason.${w.entry.reason}`)}
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
      </div>
    </AppShellV2>
  );
};

export default BuyerCapacity;
