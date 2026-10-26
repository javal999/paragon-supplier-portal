/** @import React from 'react' */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import { OrderNotFound, PoFilterBanner, usePoDrillFilter } from './orders/PoDrillFilter';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import SampleDataBadge from '@components/ui-v2/SampleDataBadge';
import SubTabs from '@components/ui-v2/SubTabs';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import WeekGrid from '@components/ui-v2/WeekGrid';
import { useWeekGridView } from '@components/ui-v2/weekGridView';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import EmptyState from '@components/ui-v2/EmptyState';
import NoSupplierIdentity from '@components/ui-v2/NoSupplierIdentity';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { useCurrentIdentity } from '@context/CurrentIdentityContext';
import { formatDate, formatDateTime } from '@lib/format';
import { useCapacityDecisions, useCapacityPlans } from '@services/query/hooks';
/** @import { CapacityPlan, CapacityReason } from '@services/data/types' */
/** @import { CapacityRefusal } from '@services/transitions/capacityRules' */
import { useActiveReasonCodes, useReasonLabel } from './admin/reasonCodeDisplay';
import { shortfallReasonNeedsNote } from '@services/transitions/reasonCodes';
import {
  capacitySubmissionRefusal,
  ltpCapacityLevel,
  planStatus
} from '@services/transitions/capacityRules';
import { readStockNumber } from '@services/transitions/inventoryRules';
import { isoWeek } from '@services/engine/dates';
import {
  CapacityStatusPill,
  LtpCheckPill,
  inputClass,
  inventoryNow,
  ltpSeverity,
  qty,
  useInventoryRunner
} from './inventory/inventoryDisplay';
import { ReEntryPill, usePlanningGroupLabel } from './inventory/planningGroupDisplay';

// ─────────────────────────────────────────────────────────────────────────────
// SUPPLIER CAPACITY CONFIRMATION — REQ-E08-04.
//
// Per material group, 13 weekly buckets: PTI's demand beside the capacity the
// supplier allocates, with optional upside (BR-05). A week below demand needs a
// starter reason, and Force Majeure, Discontinued and Other need a note
// (BR-04, AC-02, CAP-D8; `reasonCodes.js`). The form mirrors the
// rule so the supplier sees why Submit is not ready; the verb's policy decides.
//
// BL-133 (ENG-D18) — the week's demand IS the group's LTP (the current
// forecast for the group's materials, summed; owner, 2026-09-29), so the
// reason rule and the LTP flag read one number. Beside it, BE (capacity +
// additional capacity, derived from what is typed): amber above the
// capacity, red above BE. Capacity is confirmed here BEFORE the LTP is submitted on
// Forecast & commitments (ENG-D19).
//
// Material C5 (MR-8 BR-04, BR-05) — the tabs are PLANNING groups, named from
// the planning group store. A week a planning-group move touched reads "Needs
// re-entry": the supplier confirms it again by submitting the group.
//
// CAP-3 BR-03 (BL-172, CAP-D1) — an amber week (LTP above allocated, within
// BE) offers "Confirm additional capacity" in its Additional capacity cell
// (weekly view only; Monthly is read only). The confirmation rides the same
// `t_capacity_submit` as the figures, as `upsideConfirmed: true` on the week —
// no new verb — and is sent only for a week that is amber when submitted.
// Changing the additional capacity clears it: a new figure is a new promise.
//
// INV-D8 (Inventory UX P-07) — when PTI accepts the additional capacity on a
// week, that week reads "PTI accepted your additional capacity on <date>", read
// only, in a "PTI's decision" row shown only when the group has one. The read
// is narrowed to the supplier's own decisions; the entry flow is unchanged.
//
// INV-D2 (BL-65, Inventory UX S-05) — capacity stays one value per week. Under
// the Allocated and Additional capacity labels, "Copy W36 to all weeks" copies
// the FIRST week's figure into every other week of that row, in the form only:
// nothing is sent until Submit, which runs the same verb and rules (a week now
// below the LTP still needs a reason). The other row is untouched. Weekly view
// only, and only while the seat can submit; a week already holding that figure
// keeps its additional-capacity confirmation, a changed one loses it (CAP-3).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {object} WeekDraft
 * @property {string} allocated
 * @property {string} upside
 * @property {boolean} upsideConfirmed CAP-3 BR-03 — the supplier confirms an amber week's additional capacity.
 * @property {CapacityReason | ''} reason
 * @property {string} note
 */

/**
 * @param {CapacityPlan} plan
 * @returns {WeekDraft[]}
 */
const draftFrom = (plan) =>
  plan.weeks.map((w) => ({
    allocated: w.entry ? String(w.entry.allocated) : '',
    upside: w.entry?.upside !== undefined ? String(w.entry.upside) : '',
    upsideConfirmed: w.entry?.upsideConfirmed === true,
    reason: w.entry?.reason ?? '',
    note: w.entry?.note ?? ''
  }));

/**
 * CAP-1 C-03 — which field of the named week a refusal sends the supplier to.
 * @type {Partial<Record<CapacityRefusal, 'allocated' | 'reason' | 'note'>>}
 */
const REFUSAL_TARGET = {
  missingWeek: 'allocated',
  invalidQuantity: 'allocated',
  reasonRequired: 'reason',
  noteRequired: 'note'
};

// C-01 — a 96 px, right-aligned number input inside the 112 px week column.
const gridInputClass = `${inputClass.replace('w-full', 'w-[96px]')} text-right`;

// BL-186 — the reason select and its note in compact text. Its cell is at least 128 px, so a
// week that shows the select grows to 144 px (the other weeks stay 112 px,
// W1-Q1) and "Force Majeure" or "Keadaan kahar" reads in full.
const compactFieldClass = inputClass.replace('px-3', 'pl-2 pr-1').replace('text-sm', 'text-xs');
const REASON_CELL = 'space-y-1 min-w-[128px]';

// CAP-2 BR-01 — the page key the Weekly/Monthly choice is remembered under.
const VIEW_KEY = 'supplierCapacity';

// Stands in for the week while the sentence is translated, so the translated
// string itself stays unchanged and the week can be drawn as a button.
const WEEK_SLOT = '\u2063week\u2063';

/**
 * CAP-1 C-03 — the refusal sentence, with its week as a button that scrolls to
 * that week's column and focuses the field the refusal is about.
 * @type {React.FC<{ refusalKey: string; week?: string; target?: 'allocated' | 'reason' | 'note' }>}
 */
const RefusalLine = ({ refusalKey, week, target }) => {
  const { t } = useTranslation();
  const label = week ? formatDate(week) : '';
  const parts = t(refusalKey, { week: WEEK_SLOT }).split(WEEK_SLOT);
  if (!week || !target || parts.length !== 2) return <>{t(refusalKey, { week: label })}</>;
  const go = () => {
    const el = document.getElementById(`capacity-${target}-input-${week}`);
    if (!el) return;
    el.scrollIntoView?.({ block: 'nearest', inline: 'center' });
    el.focus();
  };
  return (
    <>
      {parts[0]}
      <button
        type="button"
        onClick={go}
        data-testid="capacity-refusal-week"
        className="underline underline-offset-2 hover:text-action-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-action rounded-sm"
      >
        <Data className="text-warning-hover">{label}</Data>
      </button>
      {parts[1]}
    </>
  );
};

/** @type {React.FC} */
const SupplierCapacity = () => {
  const { t } = useTranslation();
  const groupLabel = usePlanningGroupLabel();
  // BL-32 — the administrator's list in force: only active codes are offered.
  const capacityReasons = useActiveReasonCodes('capacityShortfall');
  const reasonLabel = useReasonLabel();
  const { identity } = useCurrentIdentity();
  const plansQuery = useCapacityPlans();
  const decisionsQuery = useCapacityDecisions();
  const confirm = useVerbAvailability('capacity:confirm');
  const { run, pending } = useInventoryRunner();
  const [params] = useSearchParams();
  // Deep-link read: `?group=<planningGroupId>` (one-shot, like the material
  // params elsewhere) pre-selects the group for "capacity confirmations due".
  const [group, setGroup] = useState(/** @type {string | null} */ (params.get('group')));
  const [draft, setDraft] = useState(/** @type {WeekDraft[]} */ ([]));
  // CAP-2 BR-05 — Monthly is read only, so the refusal's week is not a link there.
  const [gridView] = useWeekGridView(VIEW_KEY);
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
    drill.kind === 'filtered' && drill.groups !== null && drill.groups.length > 0
      ? drill.groups[0]
      : null;
  const drillWeeks = drill.kind === 'filtered' ? drill.weeks : null;
  const plan = plans.find((p) => p.planningGroupId === (group ?? drillGroup)) ?? plans[0] ?? null;

  useEffect(() => {
    if (plan) setDraft(draftFrom(plan));
    // Reset the form when the group or its latest submission changes.
  }, [plan?.planningGroupId, plan?.latest?.id, plansQuery.dataUpdatedAt]);

  if (!identity.supplierId) return <NoSupplierIdentity />;
  if (plansQuery.isPending || drill.kind === 'pending') return <LoadingState breadcrumb={crumb} />;
  // AC-07 / AC-08 — identical refusal for an unknown PO and another supplier's.
  if (drill.kind === 'notFound') return <OrderNotFound persona="supplier" breadcrumb={crumb} />;
  if (plansQuery.isError)
    return (
      <ErrorState
        breadcrumb={crumb}
        error={plansQuery.error}
        onRetry={() => plansQuery.refetch()}
      />
    );
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
    const d = draft[i] ?? {
      allocated: '',
      upside: '',
      upsideConfirmed: false,
      reason: '',
      note: ''
    };
    const allocated = readStockNumber(d.allocated);
    const upside = readStockNumber(d.upside);
    const ltp = w.demand;
    const stated =
      allocated.ok && allocated.value !== null
        ? {
            allocated: allocated.value,
            upside: upside.ok && upside.value !== null ? upside.value : undefined
          }
        : null;
    const below = allocated.ok && allocated.value !== null && allocated.value < w.demand;
    return { w, d, allocated, upside, ltp, stated, below, level: ltpCapacityLevel(ltp, stated) };
  });
  const payloadWeeks = rows.map(({ w, d, allocated, upside, level }) => ({
    week: w.week,
    allocated: allocated.ok && allocated.value !== null ? allocated.value : Number.NaN,
    ...(upside.ok && upside.value !== null ? { upside: upside.value } : {}),
    ...(level === 'needsAdditional' && d.upsideConfirmed
      ? { upsideConfirmed: /** @type {const} */ (true) }
      : {}),
    ...(d.reason ? { reason: d.reason } : {}),
    ...(d.note.trim() ? { note: d.note.trim() } : {})
  }));
  const refusal = capacitySubmissionRefusal(
    payloadWeeks,
    (week) => plan.weeks.find((w) => w.week === week)?.demand ?? 0,
    plan.weeks.map((w) => w.week)
  );
  const held = confirm.kind === 'held';
  // INV-D8 — PTI's acceptances on this group, by week (the read is the supplier's own).
  const accepted = new Map(
    (decisionsQuery.data?.items ?? [])
      .filter((d) => d.supplierId === plan.supplierId && d.planningGroupId === plan.planningGroupId)
      .map((d) => [d.week, d])
  );

  /**
   * @param {number} i
   * @param {Partial<WeekDraft>} patch
   */
  const update = (i, patch) =>
    setDraft((prev) => prev.map((d, j) => (j === i ? { ...d, ...patch } : d)));

  // INV-D2 — the first week is the source; the label names it.
  const firstWeek = plan.weeks.length > 0 ? `W${isoWeek(plan.weeks[0].week)}` : '';
  /**
   * @param {'allocated' | 'upside'} field
   * @param {string} rowLabel
   */
  const copyAction = (field, rowLabel) => {
    if (!held || plan.weeks.length < 2) return undefined;
    const source = (draft[0]?.[field] ?? '').trim();
    const read = readStockNumber(source);
    const value = read.ok ? read.value : null;
    const copy = () =>
      setDraft((prev) =>
        prev.map((d, j) => {
          if (j === 0 || d[field] === source) return d;
          return field === 'upside'
            ? { ...d, upside: source, upsideConfirmed: false }
            : { ...d, allocated: source };
        })
      );
    return (
      <Button
        variant="outline"
        className="!px-2 !py-1 text-xs text-left"
        disabled={value === null}
        onClick={copy}
        data-testid={`capacity-copy-${field}`}
        aria-label={
          value !== null
            ? t('inv.capacity.copyToAllFor', {
                week: firstWeek,
                row: rowLabel,
                qty: qty(value)
              })
            : t('inv.capacity.copyToAllEmpty', { week: firstWeek, row: rowLabel })
        }
      >
        {t('inv.capacity.copyToAll', { week: firstWeek })}
      </Button>
    );
  };

  const submit = () =>
    void run(
      {
        verb: 'submitCapacity',
        supplierId: plan.supplierId,
        planningGroupId: plan.planningGroupId,
        weeks: payloadWeeks
      },
      t('inv.capacity.toast.submitted')
    );

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={crumb}
        title={t('inv.capacity.sup.title')}
        subtitle={t('inv.capacity.sup.subtitle')}
      />
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

      <SubTabs
        options={plans.map((p) => ({
          id: p.planningGroupId,
          label: groupLabel(p.planningGroupId)
        }))}
        value={plan.planningGroupId}
        onChange={setGroup}
        className="mb-4"
      />

      <div className="flex flex-wrap items-center gap-3 mb-4" data-testid="capacity-status">
        <CapacityStatusPill status={planStatus(plan)} />
        <span className="text-sm text-text-secondary">
          {plan.latest ? (
            <>
              {t('inv.capacity.lastSubmitted')}{' '}
              <Data>{formatDateTime(plan.latest.submittedAt)}</Data>
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
      <p className="text-xs text-text-tertiary mb-2" data-testid="capacity-ltp-help">
        {t('inv.capacity.ltpHelp')}
      </p>
      {/* CAP-1 wave 1 (Table C) — metrics per row, weeks per column. Inputs sit
          row by row in the DOM, so Tab runs along a row (C-05). */}
      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm mb-4">
        <WeekGrid
          label={groupLabel(plan.planningGroupId)}
          corner={t('inv.capacity.col.week')}
          currentWeek={nowIso.slice(0, 10)}
          testId="capacity-grid"
          viewKey={VIEW_KEY}
          editable={held}
          weeks={rows.map(({ w, below }) => ({
            week: w.week,
            gap: below,
            drill: drillWeeks?.includes(w.week) ?? false,
            testId: `capacity-week-${w.week}`,
            headerAttrs: { 'data-drill-week': drillWeeks?.includes(w.week) ? 'true' : undefined },
            marker: w.needsReEntry ? (
              <ReEntryPill testId={`capacity-reentry-${w.week}`} />
            ) : undefined
          }))}
          rows={[
            {
              id: 'ltp',
              label: t('inv.capacity.row.ltp'),
              unit: plan.uom,
              combine: 'sum',
              value: (_w, i) => rows[i].ltp,
              format: qty,
              cell: (week, i) => (
                <Data data-testid={`capacity-ltp-qty-${week}`}>{qty(rows[i].ltp)}</Data>
              )
            },
            {
              id: 'allocated',
              label: t('inv.capacity.row.allocated'),
              unit: plan.uom,
              action: copyAction('allocated', t('inv.capacity.row.allocated')),
              // CAP-2 — the month sums what is typed, as the BE and pill do.
              combine: 'sum',
              value: (_w, i) => rows[i].stated?.allocated ?? null,
              format: qty,
              cell: (week, i) => (
                <input
                  id={`capacity-allocated-input-${week}`}
                  aria-label={t('inv.capacity.allocatedFor', { week: formatDate(week) })}
                  inputMode="decimal"
                  className={gridInputClass}
                  disabled={!held}
                  value={rows[i].d.allocated}
                  onChange={(e) => update(i, { allocated: e.target.value })}
                />
              )
            },
            {
              id: 'upside',
              label: t('inv.capacity.row.upside'),
              unit: plan.uom,
              action: copyAction('upside', t('inv.capacity.row.upside')),
              combine: 'sum',
              value: (_w, i) => rows[i].stated?.upside ?? null,
              format: qty,
              cell: (week, i) => (
                <div className="space-y-1">
                  <input
                    aria-label={t('inv.capacity.upsideFor', { week: formatDate(week) })}
                    inputMode="decimal"
                    className={gridInputClass}
                    disabled={!held}
                    value={rows[i].d.upside}
                    onChange={(e) => update(i, { upside: e.target.value, upsideConfirmed: false })}
                  />
                  {rows[i].level === 'needsAdditional' && (
                    <label className="flex items-start gap-1 text-xs text-text-secondary">
                      <input
                        type="checkbox"
                        className="mt-0.5 accent-action"
                        aria-label={t('inv.capacity.confirmUpsideFor', { week: formatDate(week) })}
                        data-testid={`capacity-confirm-upside-${week}`}
                        disabled={!held}
                        checked={rows[i].d.upsideConfirmed}
                        onChange={(e) => update(i, { upsideConfirmed: e.target.checked })}
                      />
                      <span aria-hidden="true">{t('inv.capacity.confirmUpside')}</span>
                    </label>
                  )}
                </div>
              )
            },
            {
              id: 'be',
              label: t('inv.capacity.row.be'),
              unit: plan.uom,
              combine: 'sum',
              value: (_w, i) => {
                const st = rows[i].stated;
                return st ? st.allocated + (st.upside ?? 0) : null;
              },
              format: qty,
              cell: (week, i) => {
                const stated = rows[i].stated;
                return (
                  <span data-testid={`capacity-be-${week}`}>
                    {stated ? (
                      <Data>{qty(stated.allocated + (stated.upside ?? 0))}</Data>
                    ) : (
                      <span className="text-text-tertiary">—</span>
                    )}
                  </span>
                );
              }
            },
            {
              id: 'ltpCheck',
              label: t('inv.capacity.col.ltpCheck'),
              align: 'start',
              // CAP-2 BR-03 — the month shows its worst week, with the count.
              combine: 'status',
              value: (_w, i) => rows[i].level,
              severity: ltpSeverity,
              monthCell: (level, m) => (
                <LtpCheckPill level={level} testId={`capacity-ltp-month-${m.key}`} />
              ),
              cell: (week, i) => (
                <LtpCheckPill
                  level={rows[i].level}
                  confirmed={rows[i].d.upsideConfirmed}
                  testId={`capacity-ltp-${week}`}
                />
              )
            },
            {
              // C-02 — the row is always present, so the grid never jumps.
              id: 'reason',
              label: t('inv.capacity.col.reason'),
              align: 'start',
              // CAP-2 BR-03 / BR-05 — every distinct reason of the month's weeks,
              // as text: the select stays in the weekly view.
              combine: 'distinct',
              value: (_w, i) => {
                const { d, below } = rows[i];
                if (!below || !d.reason) return null;
                const name = reasonLabel('capacityShortfall', d.reason);
                return d.note.trim() ? `${name} — ${d.note.trim()}` : name;
              },
              cell: (week, i) => {
                const { d, below } = rows[i];
                return below ? (
                  <div className={REASON_CELL}>
                    <select
                      id={`capacity-reason-input-${week}`}
                      aria-label={t('inv.capacity.reasonFor', { week: formatDate(week) })}
                      title={
                        d.reason
                          ? reasonLabel('capacityShortfall', d.reason)
                          : t('inv.capacity.reason.select')
                      }
                      className={compactFieldClass}
                      disabled={!held}
                      value={d.reason}
                      onChange={(e) =>
                        update(i, {
                          reason: /** @type {CapacityReason | ''} */ (e.target.value)
                        })
                      }
                    >
                      <option value="">{t('inv.capacity.reason.select')}</option>
                      {capacityReasons.map((r) => (
                        <option key={r} value={r}>
                          {reasonLabel('capacityShortfall', r)}
                        </option>
                      ))}
                    </select>
                    {shortfallReasonNeedsNote(d.reason) && (
                      <input
                        id={`capacity-note-input-${week}`}
                        aria-label={t('inv.capacity.noteFor', { week: formatDate(week) })}
                        className={compactFieldClass}
                        placeholder={t('inv.capacity.notePlaceholder')}
                        disabled={!held}
                        value={d.note}
                        onChange={(e) => update(i, { note: e.target.value })}
                      />
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-text-tertiary">—</span>
                );
              }
            },
            {
              // INV-D8 — PTI's decision, read only; the row shows once PTI has one.
              id: 'ptiDecision',
              label: t('capDecision.row'),
              align: 'start',
              hidden: accepted.size === 0,
              cell: (week) => {
                const d = accepted.get(week);
                return d ? (
                  <span
                    className="text-xs text-text-secondary"
                    data-testid={`capacity-pti-accepted-${week}`}
                  >
                    {t('capDecision.supplier.accepted')} <Data>{formatDate(d.decidedAt)}</Data>
                  </span>
                ) : (
                  <span className="text-xs text-text-tertiary">—</span>
                );
              }
            }
          ]}
        />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {refusal && (
          <p role="status" className="text-sm text-warning-hover" data-testid="capacity-refusal">
            <RefusalLine
              refusalKey={`inv.capacity.refusal.${refusal.refusal}`}
              week={refusal.week}
              target={
                gridView === 'weekly' &&
                refusal.week &&
                plan.weeks.some((w) => w.week === refusal.week)
                  ? REFUSAL_TARGET[refusal.refusal]
                  : undefined
              }
            />
          </p>
        )}
        {held ? (
          <Button
            variant="outline"
            disabled={pending || refusal !== null}
            onClick={submit}
            data-testid="capacity-submit"
          >
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
