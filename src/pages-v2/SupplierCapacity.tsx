import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import {
  OrderNotFound,
  PoFilterBanner,
  usePoDrillFilter,
} from './orders/PoDrillFilter';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import SampleDataBadge from '../components/ui-v2/SampleDataBadge';
import SubTabs from '../components/ui-v2/SubTabs';
import Table from '../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../components/ui-v2/TableHeader';
import TableRow from '../components/ui-v2/TableRow';
import TableCell from '../components/ui-v2/TableCell';
import Button from '../components/ui-v2/Button';
import Data from '../components/ui-v2/Data';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import EmptyState from '../components/ui-v2/EmptyState';
import NoSupplierIdentity from '../components/ui-v2/NoSupplierIdentity';
import { HandoffNotice } from '../components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '../hooks/useVerbAvailability';
import { useCurrentIdentity } from '../context/CurrentIdentityContext';
import { formatDate, formatDateTime } from '../lib/format';
import { useCapacityPlans } from '../services/query/hooks';
import type { CapacityPlan, CapacityReason } from '../services/data/types';
import { useActiveReasonCodes, useReasonLabel } from './admin/reasonCodeDisplay';
import { capacitySubmissionRefusal, planStatus } from '../services/transitions/capacityRules';
import { readStockNumber } from '../services/transitions/inventoryRules';
import {
  CapacityStatusPill,
  inputClass,
  inventoryNow,
  qty,
  useInventoryRunner,
} from './inventory/inventoryDisplay';

// ─────────────────────────────────────────────────────────────────────────────
// SUPPLIER CAPACITY CONFIRMATION — REQ-E08-04.
//
// Per material group, 13 weekly buckets: PTI's demand beside the capacity the
// supplier allocates, with optional upside (BR-05). A week below demand needs a
// starter reason, and "Other" needs a note (BR-04, AC-02). The form mirrors the
// rule so the supplier sees why Submit is not ready; the verb's policy decides.
// ─────────────────────────────────────────────────────────────────────────────

interface WeekDraft {
  allocated: string;
  upside: string;
  reason: CapacityReason | '';
  note: string;
}

const draftFrom = (plan: CapacityPlan): WeekDraft[] =>
  plan.weeks.map((w) => ({
    allocated: w.entry ? String(w.entry.allocated) : '',
    upside: w.entry?.upside !== undefined ? String(w.entry.upside) : '',
    reason: w.entry?.reason ?? '',
    note: w.entry?.note ?? '',
  }));

const SupplierCapacity: React.FC = () => {
  const { t } = useTranslation();
  // BL-32 — the administrator's list in force: only active codes are offered.
  const capacityReasons = useActiveReasonCodes('capacityShortfall');
  const reasonLabel = useReasonLabel();
  const { identity } = useCurrentIdentity();
  const plansQuery = useCapacityPlans();
  const confirm = useVerbAvailability('capacity:confirm');
  const { run, pending } = useInventoryRunner();
  const [searchParams] = useSearchParams();
  // Deep-link read: `?group=<materialGroup>` lands the "capacity confirmations
  // due" task on the group that needs one.
  const [group, setGroup] = useState<string | null>(searchParams.get('group'));
  const [draft, setDraft] = useState<WeekDraft[]>([]);
  const nowIso = inventoryNow();
  const crumb = [t('hub.nav.section.planning'), t('inv.capacity.sup.title')];

  const plans = useMemo(() => plansQuery.data?.items ?? [], [plansQuery.data]);
  // ── REQ-E07-03 BR-05 / AC-04 ──────────────────────────────────────────────
  // Arriving from one order selects that order's material group. The WEEK ROWS
  // are NOT filtered, and that is deliberate: this surface SUBMITS the horizon,
  // and `capacitySubmissionRefusal` requires every week of it — a form showing
  // three of thirteen weeks would be a form that cannot be submitted. So the
  // order's delivery weeks are MARKED instead, and the banner says so.
  const drill = usePoDrillFilter();
  const drillGroup =
    drill.kind === 'filtered' && drill.groups !== null && drill.groups.length > 0 ? drill.groups[0] : null;
  const drillWeeks = drill.kind === 'filtered' ? drill.weeks : null;
  const plan =
    plans.find((p) => p.materialGroup === (group ?? drillGroup)) ?? plans[0] ?? null;

  useEffect(() => {
    if (plan) setDraft(draftFrom(plan));
    // Reset the form when the group or its latest submission changes.
  }, [plan?.materialGroup, plan?.latest?.id, plansQuery.dataUpdatedAt]);

  if (!identity.supplierId) return <NoSupplierIdentity />;
  if (plansQuery.isPending || drill.kind === 'pending') return <LoadingState breadcrumb={crumb} />;
  // AC-07 / AC-08 — identical refusal for an unknown PO and another supplier's.
  if (drill.kind === 'notFound') return <OrderNotFound persona="supplier" breadcrumb={crumb} />;
  if (plansQuery.isError)
    return <ErrorState breadcrumb={crumb} error={plansQuery.error} onRetry={() => plansQuery.refetch()} />;
  if (!plan)
    return (
      <EmptyState
        breadcrumb={crumb}
        title={t('inv.capacity.sup.title')}
        subtitle={t('inv.capacity.sup.subtitle')}
        message={t('inv.capacity.empty')}
      />
    );

  const rows = plan.weeks.map((w, i) => {
    const d = draft[i] ?? { allocated: '', upside: '', reason: '', note: '' };
    const allocated = readStockNumber(d.allocated);
    const upside = readStockNumber(d.upside);
    return { w, d, allocated, upside };
  });
  const payloadWeeks = rows.map(({ w, d, allocated, upside }) => ({
    week: w.week,
    allocated: allocated.ok && allocated.value !== null ? allocated.value : Number.NaN,
    ...(upside.ok && upside.value !== null ? { upside: upside.value } : {}),
    ...(d.reason ? { reason: d.reason } : {}),
    ...(d.note.trim() ? { note: d.note.trim() } : {}),
  }));
  const refusal = capacitySubmissionRefusal(
    payloadWeeks,
    (week) => plan.weeks.find((w) => w.week === week)?.demand ?? 0,
    plan.weeks.map((w) => w.week),
  );
  const held = confirm.kind === 'held';

  const update = (i: number, patch: Partial<WeekDraft>) =>
    setDraft((prev) => prev.map((d, j) => (j === i ? { ...d, ...patch } : d)));

  const submit = () =>
    void run(
      { verb: 'submitCapacity', supplierId: plan.supplierId, materialGroup: plan.materialGroup, weeks: payloadWeeks },
      t('inv.capacity.toast.submitted'),
    );

  return (
    <AppShellV2>
      <PageHeader breadcrumb={crumb} title={t('inv.capacity.sup.title')} subtitle={t('inv.capacity.sup.subtitle')} />
      <PageMetaLine className="-mt-6 mb-4">
        {t('inv.asOf')} <Data>{formatDate(nowIso)}</Data>
        <SampleDataBadge className="ml-3 align-middle" />
      </PageMetaLine>

      {/* BR-04 / BR-05 — the filter, why these rows, and the way back. */}
      <PoFilterBanner drill={drill} persona="supplier" reason="capacity" />
      {drillWeeks !== null && drillWeeks.length > 0 && (
        // ⚠️ Which line is honest depends on whether the horizon reaches those
        // weeks. "The weeks are marked" beside nothing marked is a claim the
        // screen contradicts, so the out-of-horizon case says THAT instead.
        <p
          className="text-sm text-text-tertiary mb-4"
          data-testid={
            plan.weeks.some((w) => drillWeeks.includes(w.week))
              ? 'capacity-weeks-marked'
              : 'capacity-weeks-outside-horizon'
          }
        >
          {plan.weeks.some((w) => drillWeeks.includes(w.week))
            ? t('oc.drill.weeks.highlighted')
            : t('oc.drill.weeks.outside')}
        </p>
      )}

      <SubTabs<string>
        options={plans.map((p) => ({ id: p.materialGroup, label: t(`inv.group.${p.materialGroup}`) }))}
        value={plan.materialGroup}
        onChange={setGroup}
        className="mb-4"
      />

      <div className="flex flex-wrap items-center gap-3 mb-4" data-testid="capacity-status">
        <CapacityStatusPill status={planStatus(plan)} />
        <span className="text-sm text-text-secondary">
          {plan.latest ? (
            <>
              {t('inv.capacity.lastSubmitted')} <Data>{formatDateTime(plan.latest.submittedAt)}</Data>
            </>
          ) : (
            t('inv.capacity.neverSubmitted')
          )}
        </span>
        <span className="text-sm text-text-secondary">
          {t('inv.capacity.materials')} <Data>{plan.materials.join(', ')}</Data>
        </span>
      </div>

      {/* REQ-E08-04 BR-05 (BL-62) — the field is explained where it is entered. */}
      <p className="text-xs text-text-tertiary mb-2" data-testid="capacity-upside-help">
        {t('inv.capacity.upsideHelp')}
      </p>
      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto mb-4">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('inv.capacity.col.week')}</TableHeaderCell>
            <TableHeaderCell className="text-right">{t('inv.capacity.col.demand', { uom: plan.uom })}</TableHeaderCell>
            <TableHeaderCell>{t('inv.capacity.col.allocated', { uom: plan.uom })}</TableHeaderCell>
            <TableHeaderCell>{t('inv.capacity.col.upside', { uom: plan.uom })}</TableHeaderCell>
            <TableHeaderCell>{t('inv.capacity.col.reason')}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {rows.map(({ w, d, allocated }, i) => {
              const below = allocated.ok && allocated.value !== null && allocated.value < w.demand;
              return (
                <TableRow
                  key={w.week}
                  data-testid={`capacity-week-${w.week}`}
                  data-drill-week={drillWeeks?.includes(w.week) ? 'true' : undefined}
                  className={`${below ? 'bg-warning-soft' : ''} ${
                    drillWeeks?.includes(w.week) ? 'ring-1 ring-inset ring-action' : ''
                  }`.trim()}
                >
                  <TableCell className="whitespace-nowrap">
                    <Data>{formatDate(w.week)}</Data>
                  </TableCell>
                  <TableCell className="text-right">
                    <Data>{qty(w.demand)}</Data>
                  </TableCell>
                  <TableCell>
                    <input
                      aria-label={t('inv.capacity.allocatedFor', { week: formatDate(w.week) })}
                      inputMode="decimal"
                      className={inputClass}
                      disabled={!held}
                      value={d.allocated}
                      onChange={(e) => update(i, { allocated: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <input
                      aria-label={t('inv.capacity.upsideFor', { week: formatDate(w.week) })}
                      inputMode="decimal"
                      className={inputClass}
                      disabled={!held}
                      value={d.upside}
                      onChange={(e) => update(i, { upside: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    {below ? (
                      <div className="space-y-1 min-w-[180px]">
                        <select
                          aria-label={t('inv.capacity.reasonFor', { week: formatDate(w.week) })}
                          className={inputClass}
                          disabled={!held}
                          value={d.reason}
                          onChange={(e) => update(i, { reason: e.target.value as CapacityReason | '' })}
                        >
                          <option value="">{t('inv.capacity.reason.select')}</option>
                          {capacityReasons.map((r) => (
                            <option key={r} value={r}>
                              {reasonLabel('capacityShortfall', r)}
                            </option>
                          ))}
                        </select>
                        {d.reason === 'other' && (
                          <input
                            aria-label={t('inv.capacity.noteFor', { week: formatDate(w.week) })}
                            className={inputClass}
                            placeholder={t('inv.capacity.notePlaceholder')}
                            disabled={!held}
                            value={d.note}
                            onChange={(e) => update(i, { note: e.target.value })}
                          />
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-text-tertiary">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </tbody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {refusal && (
          <p role="status" className="text-sm text-warning-hover" data-testid="capacity-refusal">
            {t(`inv.capacity.refusal.${refusal.refusal}`, { week: refusal.week ? formatDate(refusal.week) : '' })}
          </p>
        )}
        {held ? (
          <Button variant="outline" disabled={pending || refusal !== null} onClick={submit} data-testid="capacity-submit">
            {t('inv.capacity.submit')}
          </Button>
        ) : (
          <HandoffNotice availability={confirm} testId="handoff-capacity-confirm" />
        )}
      </div>
    </AppShellV2>
  );
};

export default SupplierCapacity;
