/** @import React from 'react' */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import StatusPill from '@components/ui-v2/StatusPill';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import EmptyState from '@components/ui-v2/EmptyState';
import NoSupplierIdentity from '@components/ui-v2/NoSupplierIdentity';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { useRefusalText } from '@hooks/useRefusalText';
import { useCurrentIdentity } from '@context/CurrentIdentityContext';
import { formatDate, formatDateTime } from '@lib/format';
import { isoWeek } from '@services/engine/dates';
/** @import { InventoryPosition, PurchaseOrder } from '@services/data/types' */
import {
  useCapacityPlans,
  useForecastCommitments,
  useInventory,
  usePurchaseOrders,
  useSupplierWeeklyPublication
} from '@services/query/hooks';
import {
  useDaConfirmation,
  useFeedstockConfirm,
  useInventoryCommand
} from '@services/query/commandHooks';
import { isAwaitingResponse } from '@services/data/poResponseProjection';
import { planStatus } from '@services/transitions/capacityRules';
import {
  FEEDSTOCK_RULES,
  feedstockCycleStatus,
  feedstockRefusalOf
} from '@services/transitions/feedstockRules';
import { updateCycleSettings } from '@services/transitions/inventoryConfig';
import { hubWorkingCalendar } from '@services/transitions/workingCalendarStore';
import { weeklyUpdateStatus } from '@services/transitions/updateCycle';
import { daConfirmationDueAt, daStockCutoffAt } from '@services/transitions/daConfirmationRules';
import { dayOf, incomingTotals, productionProblem } from '@services/transitions/inventoryRules';
import {
  capacityLastChanged,
  carriedForwardItems,
  feedstockApplies,
  lastConfirmedAt,
  materialConfirmed,
  publishedMaterialsOf,
  weeklyProgress
} from '@services/transitions/weeklyConfirmationRules';
import { CapacityStatusPill, inventoryNow } from './inventory/inventoryDisplay';
import { usePlanningGroupLabel } from './inventory/planningGroupDisplay';
import { foresightPublishedInWeek } from './demandAnticipation/DaConfirmationPanel';

// ─────────────────────────────────────────────────────────────────────────────
// SUPPLIER · WEEKLY CONFIRMATION — UCX-P4 v2 (BL-365), PSC-1.
//
// The one weekly page (UCX-F2, UCX-F11, UCX-F30): the weekly items in one
// table, ONE confirmation per material each week — stock on hand, in
// production and feedstock (UCX-D17) — with a "Last confirmed" date. Capacity
// keeps its own 13-week page and shows only its status and "Last changed" date
// here. "Confirm the week" carries ONLY the demand anticipation, the due POs
// and the Foresight periods (UCX-D17); stock, in production, feedstock and
// capacity are never carried.
//
// THE WRITE PATH IS THE EXISTING ONE (UCX-D18): a material confirm dispatches
// the stock declaration verb (`t_inventorydeclaration_declare`) and, for a
// packaging material, the feedstock confirmation verb (`t_feedstock_confirm`);
// the week confirm dispatches the PSC-1 DA confirmation (`t_daconfirmation_confirm`).
// This page adds NO verb, and a refusal from any of them is rendered on its own
// row rather than swallowed.
//
// THE SUPPLIER DA VIEW STAYS OFF (DRC-D10, UCX-D2): `SUPPLIER_DA_VIEW_ENABLED`
// is untouched, and this page never renders a published DA figure. The read it
// needs for the week's confirmation is publication IDENTITY only — week, id,
// the materials it holds and the confirmation state (`getSupplierWeeklyPublication`)
// — so the DA is a carried item named by week, never a row of figures.
// ─────────────────────────────────────────────────────────────────────────────

const INPUT_CLASS =
  'w-28 px-2 py-1 text-sm text-right font-mono text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action';
const DATE_CLASS =
  'px-2 py-1 text-sm font-mono text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action';

/**
 * One row's unsaved edits. Every figure is a string while it is in a form.
 * @typedef {{ soh: string; inProduction: string; completion: string; feedstock: string }} RowDraft
 */

/**
 * A typed quantity: null when empty or not a number of 0 or more (UCX-R5: a
 * prefilled figure the actor leaves alone is still the figure in force).
 * @param {string} text
 * @returns {number | null}
 */
const qtyOf = (text) => {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

/**
 * `W36` for a week's Monday.
 * @param {string} week
 */
const weekLabel = (week) => `W${isoWeek(week)}`;

/**
 * The day after the week's Sunday — the exclusive bound `foresightPublishedInWeek` reads.
 * @param {string} week
 */
const weekEndOf = (week) =>
  new Date(Date.parse(`${week}T00:00:00.000Z`) + 7 * 24 * 3_600_000).toISOString().slice(0, 10);

/** The stock-and-feedstock table's head, extracted to keep JSX nesting shallow. @type {React.FC} */
const StockHead = () => {
  const { t } = useTranslation();
  return (
    <thead>
      <tr className="text-label text-text-tertiary uppercase">
        <th className="text-left py-1">{t('wk.col.material')}</th>
        <th className="text-right py-1">{t('wk.col.soh')}</th>
        <th className="text-right py-1">{t('wk.col.inProduction')}</th>
        <th className="text-right py-1">{t('wk.col.feedstock')}</th>
        <th className="text-left py-1">{t('wk.col.lastConfirmed')}</th>
        <th className="text-left py-1">{t('wk.col.status')}</th>
        <th className="text-right py-1">{t('wk.col.action')}</th>
      </tr>
    </thead>
  );
};

/** The capacity table's head, extracted for the same reason. @type {React.FC} */
const CapacityHead = () => {
  const { t } = useTranslation();
  return (
    <thead>
      <tr className="text-label text-text-tertiary uppercase">
        <th className="text-left py-1">{t('wk.col.group')}</th>
        <th className="text-left py-1">{t('wk.capacity.weeks')}</th>
        <th className="text-left py-1">{t('wk.capacity.lastChanged')}</th>
        <th className="text-left py-1">{t('wk.col.status')}</th>
        <th className="text-right py-1">
          <span className="sr-only">{t('wk.col.action')}</span>
        </th>
      </tr>
    </thead>
  );
};

/** @type {React.FC} */
const SupplierWeekly = () => {
  const { t } = useTranslation();
  const { identity } = useCurrentIdentity();
  const supplierId = identity.supplierId;
  const groupLabel = usePlanningGroupLabel();
  const inventory = useInventory();
  const capacity = useCapacityPlans();
  const pos = usePurchaseOrders();
  const commitments = useForecastCommitments();
  const publication = useSupplierWeeklyPublication();
  const stockCommand = useInventoryCommand();
  const feedstockCommand = useFeedstockConfirm();
  const daConfirm = useDaConfirmation();
  const stockAvailability = useVerbAvailability('inventorydeclaration:declare');
  const feedstockAvailability = useVerbAvailability('feedstock:confirm');
  const daAvailability = useVerbAvailability('da:confirm');
  const refusalText = useRefusalText();
  const [drafts, setDrafts] = useState(/** @type {Record<string, Partial<RowDraft>>} */ ({}));
  const [refusals, setRefusals] = useState(/** @type {Record<string, string>} */ ({}));
  const [weekRefusal, setWeekRefusal] = useState(/** @type {string | null} */ (null));
  const [weekDone, setWeekDone] = useState(/** @type {string | null} */ (null));

  const nowIso = inventoryNow();
  const calendar = hubWorkingCalendar();
  const settings = updateCycleSettings();
  const crumb = [t('hub.nav.section.planning'), t('hub.nav.sup.weekly')];

  /** @param {string} code */
  const clearDraft = (code) =>
    setDrafts((d) => {
      const next = { ...d };
      delete next[code];
      return next;
    });
  /** @param {string} code @param {string} text */
  const setRefusal = (code, text) => setRefusals((r) => ({ ...r, [code]: text }));
  /** @param {string} code */
  const clearRefusal = (code) =>
    setRefusals((r) => {
      const next = { ...r };
      delete next[code];
      return next;
    });

  if (!supplierId) return <NoSupplierIdentity />;
  if (inventory.isPending || capacity.isPending || publication.isPending)
    return <LoadingState breadcrumb={crumb} />;
  if (inventory.isError)
    return (
      <ErrorState breadcrumb={crumb} error={inventory.error} onRetry={() => inventory.refetch()} />
    );

  const own = (inventory.data?.items ?? []).filter((p) => p.supplierId === supplierId);
  if (own.length === 0)
    return (
      <EmptyState
        breadcrumb={crumb}
        title={t('wk.title')}
        subtitle={t('wk.subtitle')}
        message={t('wk.hint.prefill')}
      />
    );

  // A supplier whose figures arrive by pull does not use this page (the Stock
  // page shows the sync, MR-1 B2) — say so rather than offer a second write.
  if (own.some((p) => p.apiConnected))
    return (
      <AppShellV2>
        <PageHeader breadcrumb={crumb} title={t('wk.title')} subtitle={t('wk.subtitle')} />
        <div
          className="bg-bg-surface border border-border-subtle rounded-lg p-4"
          data-testid="weekly-api"
          role="status"
        >
          <p className="text-base font-semibold text-text-primary mb-1">{t('wk.api.title')}</p>
          <p className="text-sm text-text-secondary">{t('wk.api.body')}</p>
          <Link
            to="/supplier/inventory"
            className="text-sm text-action-hover hover:underline mt-2 inline-block"
          >
            {t('hub.nav.sup.stock')}
          </Link>
        </div>
      </AppShellV2>
    );

  const stock = weeklyUpdateStatus(supplierId, own, nowIso, calendar, settings);
  const dailyFeedstock = own.some((p) => p.pullAgreement === true);
  const feedstockStatus = feedstockCycleStatus(
    supplierId,
    own.map((p) => ({
      supplierId: p.supplierId,
      materialCode: p.materialCode,
      feedstockRecordedAt: p.feedstock?.recordedAt ?? null
    })),
    nowIso,
    calendar,
    settings,
    dailyFeedstock
  );
  const progress = weeklyProgress({
    positions: own,
    stockUpdated: stock.updated,
    feedstockUpdated: feedstockStatus.updated
  });

  /** The page's prefill: the figures of the last confirmation (or the stock record). */
  const prefillOf = (/** @type {InventoryPosition} */ p) => {
    const production = p.incoming.filter((i) => i.source === 'production');
    const dates = production
      .map((i) => i.date)
      .filter(/** @returns {d is string} */ (d) => typeof d === 'string' && d !== '')
      .sort();
    return /** @type {RowDraft} */ ({
      soh: p.supplierSoh === null ? '' : String(p.supplierSoh),
      inProduction: String(incomingTotals(p.incoming).inProduction),
      completion: dates.length > 0 ? dates[dates.length - 1] : '',
      feedstock: p.feedstock ? String(p.feedstock.feedstockQty) : ''
    });
  };
  /** @param {InventoryPosition} p */
  const draftOf = (p) => ({ ...prefillOf(p), ...drafts[p.materialCode] });
  /** @param {InventoryPosition} p */
  const confirmedNow = (p) =>
    materialConfirmed({
      stockUpdated: stock.updated.includes(p.materialCode),
      feedstockUpdated: feedstockStatus.updated.includes(p.materialCode),
      feedstockApplies: feedstockApplies(p)
    });
  /** @param {InventoryPosition} p */
  const changedNow = (p) => {
    const d = draftOf(p);
    const pre = prefillOf(p);
    /** @param {string} a @param {string} b */
    const same = (a, b) => qtyOf(a) === qtyOf(b) && (qtyOf(a) !== null || a.trim() === b.trim());
    if (!same(d.soh, pre.soh) || !same(d.inProduction, pre.inProduction)) return true;
    if (feedstockApplies(p) && !same(d.feedstock, pre.feedstock)) return true;
    return (qtyOf(d.inProduction) ?? 0) > 0 && d.completion !== pre.completion;
  };
  /** @param {InventoryPosition} p */
  const rowProblem = (p) => {
    const d = draftOf(p);
    if (qtyOf(d.soh) === null) return t('wk.hint.invalid');
    if (qtyOf(d.inProduction) === null) return t('wk.hint.invalid');
    if (feedstockApplies(p) && qtyOf(d.feedstock) === null) return t('wk.hint.feedstockMissing');
    const production = productionProblem(
      qtyOf(d.inProduction),
      d.completion,
      /** @type {const} */ ('manual')
    );
    if (production?.reason === 'productionDateMissing') return t('wk.hint.completion');
    if (production?.reason === 'invalidDate') return t('wk.hint.invalid');
    return null;
  };

  const heldStock = stockAvailability.kind === 'held';
  const heldFeedstock = feedstockAvailability.kind === 'held';
  const heldDa = daAvailability.kind === 'held';
  const rowPending = stockCommand.isPending || feedstockCommand.isPending;
  const today = dayOf(nowIso);

  /** @param {InventoryPosition} p */
  const confirmMaterial = async (p) => {
    const d = draftOf(p);
    const soh = qtyOf(d.soh);
    const inProduction = qtyOf(d.inProduction);
    const feed = qtyOf(d.feedstock);
    if (soh === null || inProduction === null) return;
    if (feedstockApplies(p) && feed === null) return;
    if (productionProblem(inProduction, d.completion, 'manual') !== null) return;
    clearRefusal(p.materialCode);
    const runs = p.incoming.filter((i) => i.source === 'production');
    const runsUnchanged = inProduction === incomingTotals(p.incoming).inProduction;
    const result = await stockCommand.mutateAsync({
      verb: 'declare',
      channel: 'manual',
      supplierId,
      materialCode: p.materialCode,
      totalQty: soh,
      inProductionQty: inProduction,
      ...(inProduction > 0 ? { productionCompletionDate: d.completion } : {}),
      // BL-358 — an unchanged figure keeps the runs it already has (a single
      // pair would silently collapse them); a changed one is the replacement
      // MAT-D4 describes, written as the single pair above.
      ...(runsUnchanged && runs.length > 0
        ? {
            inProductionRuns: runs.map((r) => ({
              quantity: r.quantity,
              ...(r.date ? { completionDate: r.date } : {})
            }))
          }
        : {})
    });
    if (result.status === 'failed') {
      setRefusal(
        p.materialCode,
        t('wk.refusal.row', {
          reason: refusalText(result.reason) ?? result.reason ?? t('inv.refusal.generic')
        })
      );
      return;
    }
    if (feedstockApplies(p) && feed !== null) {
      const feedResult = await feedstockCommand.mutateAsync({
        supplierId,
        materialCode: p.materialCode,
        feedstockQty: feed,
        confirmedOn: today,
        note: ''
      });
      if (feedResult.status === 'failed') {
        const code = feedstockRefusalOf(feedResult.reason ?? undefined);
        setRefusal(
          p.materialCode,
          t('wk.refusal.row', {
            reason:
              code === null
                ? (refusalText(feedResult.reason) ?? feedResult.reason ?? t('inv.refusal.generic'))
                : t(`fsConfirm.refusal.${code}`, { max: FEEDSTOCK_RULES.noteMaxLength })
          })
        );
        return;
      }
    }
    clearDraft(p.materialCode);
  };

  const plans = (capacity.data?.items ?? []).filter((p) => p.supplierId === supplierId);
  const groupsToConfirm = plans.filter((p) => planStatus(p) !== 'confirmed').length;

  const duePos = (pos.data?.items ?? []).filter(
    (/** @type {PurchaseOrder} */ po) => po.supplierId === supplierId && isAwaitingResponse(po)
  );
  const pub = publication.data ?? null;
  const foresight =
    pub === null
      ? []
      : foresightPublishedInWeek(
          (commitments.data?.items ?? []).map((l) => ({
            materialCode: l.materialCode,
            periodBucket: l.periodBucket,
            publishedAt: l.publishedAt
          })),
          pub.week,
          weekEndOf(pub.week)
        );
  const carried = carriedForwardItems({
    duePurchaseOrderCount: duePos.length,
    foresightCount: foresight.length
  });

  /** @param {string} materialCode */
  const positionOf = (materialCode) => own.find((p) => p.materialCode === materialCode);
  const publishedOwn =
    pub === null
      ? []
      : publishedMaterialsOf(
          [...pub.materialCodes],
          own.map((p) => p.materialCode)
        );
  const publishedSohValid = publishedOwn.every((code) => {
    const position = positionOf(code);
    return position !== undefined && qtyOf(draftOf(position).soh) !== null;
  });
  // A published material with an UNSAVED edit must be confirmed first: the DA
  // confirmation names the figure in force, and the stock record is what makes
  // it the figure in force (PSC-1 BR-06 — the stock page is the one writer).
  const publishedRowsSaved = publishedOwn.every((code) => {
    const position = positionOf(code);
    return position !== undefined && !changedNow(position);
  });
  const allConfirmed = progress.total > 0 && progress.confirmed === progress.total;
  const weekConfirmed = weekDone ?? pub?.confirmedAt ?? null;
  const weekDisabled =
    !heldDa ||
    pub === null ||
    weekConfirmed !== null ||
    !allConfirmed ||
    !publishedRowsSaved ||
    !publishedSohValid ||
    daConfirm.isPending;

  const weekBlocked = !heldDa
    ? null
    : pub === null
      ? t('wk.week.noPublication')
      : !allConfirmed || !publishedRowsSaved
        ? t('wk.week.blocked')
        : !publishedSohValid
          ? t('wk.hint.invalid')
          : null;

  const confirmWeek = async () => {
    if (weekDisabled || pub === null) return;
    /** @type {{ materialCode: string; soh: number }[]} */
    const soh = [];
    for (const code of publishedOwn) {
      const position = positionOf(code);
      const value = position ? qtyOf(draftOf(position).soh) : null;
      if (value === null) return;
      soh.push({ materialCode: code, soh: value });
    }
    if (soh.length === 0) return;
    setWeekRefusal(null);
    const result = await daConfirm.mutateAsync({
      supplierId,
      week: pub.week,
      publicationId: pub.publicationId,
      soh
    });
    if (result.status === 'failed') {
      setWeekRefusal(refusalText(result.reason) ?? result.reason ?? t('wk.week.failed'));
      return;
    }
    setWeekDone(pub.week);
  };

  const confirmationDue = pub === null ? null : daConfirmationDueAt(pub.publishedAt, calendar);
  const stockCutoff = daStockCutoffAt(nowIso, calendar, settings);

  return (
    <AppShellV2>
      <PageHeader breadcrumb={crumb} title={t('wk.title')} subtitle={t('wk.subtitle')} />
      <div data-testid="supplier-weekly">
        <p className="text-sm text-text-primary mb-3" data-testid="weekly-publication">
          {pub === null ? (
            t('wk.noPublication')
          ) : (
            <>
              {t('wk.published', {
                week: weekLabel(pub.week),
                date: formatDate(pub.publishedAt)
              })}
            </>
          )}
        </p>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {confirmationDue !== null && (
            <span className="inline-flex items-center rounded-sm border border-warning/30 bg-warning-soft px-2 py-0.5 text-xs text-warning-hover">
              {t('wk.due.confirmation')} · <Data>{formatDateTime(confirmationDue)}</Data>
            </span>
          )}
          <span className="inline-flex items-center rounded-sm border border-border-subtle bg-bg-hover px-2 py-0.5 text-xs text-text-secondary">
            {t('wk.due.stock')} · <Data>{formatDateTime(stockCutoff)}</Data>
          </span>
          <span className="flex-1" />
          <span data-testid="weekly-count">
            <StatusPill variant={progress.confirmed === progress.total ? 'success' : 'warning'}>
              {t('wk.count', { confirmed: progress.confirmed, total: progress.total })}
            </StatusPill>
          </span>
        </div>

        <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm mb-4">
          <header className="px-4 py-3 border-b border-border-subtle">
            <h2 className="text-section text-text-primary">{t('wk.table.title')}</h2>
          </header>
          <div className="px-4 py-3 space-y-3">
            {!heldStock && (
              <HandoffNotice availability={stockAvailability} testId="handoff-weekly-stock" />
            )}
            {!heldFeedstock && (
              <HandoffNotice
                availability={feedstockAvailability}
                testId="handoff-weekly-feedstock"
              />
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <StockHead />
                <tbody>
                  {own.map((p) => {
                    const d = draftOf(p);
                    const isConfirmed = confirmedNow(p);
                    const changed = changedNow(p);
                    const problem = rowProblem(p);
                    const status = changed ? 'changed' : isConfirmed ? 'confirmed' : 'toConfirm';
                    const last = lastConfirmedAt(p.lastUpdatedAt, p.feedstock?.recordedAt ?? null);
                    const rowHeld = heldStock && (!feedstockApplies(p) || heldFeedstock);
                    // BL-358 — while the in-production figure is unchanged, its
                    // runs are written back as they are; the pair's date cannot
                    // change them, so it is shown read-only. A CHANGED figure
                    // replaces the runs with MAT-D4's single pair, and its
                    // completion date becomes editable.
                    const runs = p.incoming.filter((i) => i.source === 'production');
                    const runsUnchanged =
                      qtyOf(d.inProduction) === incomingTotals(p.incoming).inProduction;
                    return (
                      <tr
                        key={p.materialCode}
                        className="border-t border-border-subtle align-top"
                        data-testid={`weekly-row-${p.materialCode}`}
                      >
                        <td className="py-1.5">
                          <Data className="text-xs font-bold text-text-primary">
                            {p.materialCode}
                          </Data>
                          <span className="ml-2 text-text-primary">{p.materialLabel}</span>
                        </td>
                        <td className="py-1.5 text-right whitespace-nowrap">
                          <input
                            type="number"
                            min={0}
                            step="any"
                            inputMode="decimal"
                            className={INPUT_CLASS}
                            aria-label={t('wk.field.sohFor', { material: p.materialCode })}
                            data-testid={`weekly-soh-${p.materialCode}`}
                            value={d.soh}
                            onChange={(e) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [p.materialCode]: {
                                  ...prefillOf(p),
                                  ...prev[p.materialCode],
                                  soh: e.target.value
                                }
                              }))
                            }
                          />
                        </td>
                        <td className="py-1.5 text-right whitespace-nowrap">
                          <input
                            type="number"
                            min={0}
                            step="any"
                            inputMode="decimal"
                            className={INPUT_CLASS}
                            aria-label={t('wk.field.inProductionFor', {
                              material: p.materialCode
                            })}
                            data-testid={`weekly-production-${p.materialCode}`}
                            value={d.inProduction}
                            onChange={(e) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [p.materialCode]: {
                                  ...prefillOf(p),
                                  ...prev[p.materialCode],
                                  inProduction: e.target.value
                                }
                              }))
                            }
                          />
                          {(qtyOf(d.inProduction) ?? 0) > 0 && (
                            <div className="mt-1">
                              {runs.length > 0 && runsUnchanged ? (
                                <>
                                  <Data
                                    className="text-xs text-text-tertiary"
                                    data-testid={`weekly-completion-${p.materialCode}`}
                                  >
                                    {formatDate(d.completion)}
                                  </Data>
                                  <div className="text-xs text-text-tertiary mt-0.5 max-w-xs whitespace-normal">
                                    {t('wk.hint.runs', { count: runs.length })}
                                  </div>
                                </>
                              ) : (
                                <>
                                  <input
                                    type="date"
                                    className={DATE_CLASS}
                                    aria-label={t('wk.field.completionFor', {
                                      material: p.materialCode
                                    })}
                                    data-testid={`weekly-completion-${p.materialCode}`}
                                    value={d.completion}
                                    onChange={(e) =>
                                      setDrafts((prev) => ({
                                        ...prev,
                                        [p.materialCode]: {
                                          ...prefillOf(p),
                                          ...prev[p.materialCode],
                                          completion: e.target.value
                                        }
                                      }))
                                    }
                                  />
                                  <div className="text-xs text-text-tertiary mt-0.5">
                                    {t('wk.hint.completion')}
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-1.5 text-right whitespace-nowrap">
                          {feedstockApplies(p) ? (
                            <input
                              type="number"
                              min={0}
                              step="any"
                              inputMode="decimal"
                              className={INPUT_CLASS}
                              aria-label={t('wk.field.feedstockFor', {
                                material: p.materialCode
                              })}
                              data-testid={`weekly-feedstock-${p.materialCode}`}
                              value={d.feedstock}
                              onChange={(e) =>
                                setDrafts((prev) => ({
                                  ...prev,
                                  [p.materialCode]: {
                                    ...prefillOf(p),
                                    ...prev[p.materialCode],
                                    feedstock: e.target.value
                                  }
                                }))
                              }
                            />
                          ) : (
                            <span className="text-xs text-text-tertiary">
                              {t('wk.hint.feedstockRaw')}
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 whitespace-nowrap">
                          <Data
                            className="text-xs text-text-tertiary"
                            data-testid={`weekly-last-${p.materialCode}`}
                          >
                            {last === null ? t('wk.last.never') : formatDate(last)}
                          </Data>
                        </td>
                        <td className="py-1.5 whitespace-nowrap">
                          <span data-testid={`weekly-status-${p.materialCode}`}>
                            <StatusPill
                              variant={
                                status === 'confirmed'
                                  ? 'success'
                                  : status === 'changed'
                                    ? 'info'
                                    : 'warning'
                              }
                            >
                              {status === 'confirmed'
                                ? t('wk.status.confirmed')
                                : status === 'changed'
                                  ? t('wk.status.changed')
                                  : t('wk.status.toConfirm')}
                            </StatusPill>
                          </span>
                          {refusals[p.materialCode] !== undefined && (
                            <p
                              role="alert"
                              className="text-xs text-danger mt-1 max-w-xs whitespace-normal"
                              data-testid={`weekly-refusal-${p.materialCode}`}
                            >
                              {refusals[p.materialCode]}
                            </p>
                          )}
                        </td>
                        <td className="py-1.5 text-right whitespace-nowrap">
                          {problem !== null && (
                            <p className="text-xs text-warning-hover mb-1 max-w-xs whitespace-normal">
                              {problem}
                            </p>
                          )}
                          <Button
                            variant="outline"
                            className="!px-3 !py-1 text-xs"
                            disabled={
                              !rowHeld ||
                              rowPending ||
                              problem !== null ||
                              (isConfirmed && !changed)
                            }
                            aria-label={t('wk.action.confirmFor', {
                              material: p.materialCode
                            })}
                            data-testid={`weekly-confirm-${p.materialCode}`}
                            onClick={() => void confirmMaterial(p)}
                          >
                            {changed ? t('wk.action.confirmChanged') : t('wk.action.confirm')}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-text-tertiary">{t('wk.hint.prefill')}</p>
            <p className="text-xs text-text-tertiary">{t('wk.hint.feedstock')}</p>
          </div>
        </section>

        <section
          className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm mb-4"
          data-testid="weekly-capacity"
        >
          <header className="px-4 py-3 border-b border-border-subtle flex flex-wrap items-baseline gap-2">
            <h2 className="text-section text-text-primary">{t('wk.capacity.title')}</h2>
            {groupsToConfirm > 0 && (
              <span className="text-sm text-text-secondary">
                · {t('wk.capacity.still', { count: groupsToConfirm })}
              </span>
            )}
          </header>
          <div className="px-4 py-3 space-y-2">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <CapacityHead />
                <tbody>
                  {plans.map((plan) => {
                    const status = planStatus(plan);
                    const lastChanged = capacityLastChanged(plan);
                    return (
                      <tr
                        key={plan.planningGroupId}
                        className="border-t border-border-subtle"
                        data-testid={`weekly-group-${plan.planningGroupId}`}
                      >
                        <td className="py-1.5 text-text-primary">
                          {groupLabel(plan.planningGroupId)}
                        </td>
                        <td className="py-1.5 text-text-tertiary">
                          {status === 'notStarted'
                            ? t('wk.capacity.notStarted')
                            : t('wk.capacity.same')}
                        </td>
                        <td className="py-1.5 whitespace-nowrap">
                          <Data
                            className="text-xs text-text-tertiary"
                            data-testid={`weekly-changed-${plan.planningGroupId}`}
                          >
                            {lastChanged === null
                              ? t('wk.capacity.notYet')
                              : formatDate(lastChanged)}
                          </Data>
                        </td>
                        <td className="py-1.5">
                          <CapacityStatusPill status={status} />
                        </td>
                        <td className="py-1.5 text-right whitespace-nowrap">
                          <Link
                            to={`/supplier/capacity?group=${encodeURIComponent(plan.planningGroupId)}`}
                            className="text-sm text-action-hover hover:underline"
                            data-testid={`weekly-open-${plan.planningGroupId}`}
                          >
                            {t('wk.capacity.open')}
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-text-tertiary">{t('wk.capacity.note')}</p>
          </div>
        </section>

        <section
          className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm mb-4 px-4 py-3 space-y-2"
          data-testid="weekly-carry"
        >
          <h2 className="text-section text-text-primary">{t('wk.carry.title')}</h2>
          <p className="text-sm text-text-secondary">{t('wk.carry.hint')}</p>
          <dl className="grid gap-3 sm:grid-cols-3">
            {carried.map((item) => (
              <div key={item.kind} data-testid={`weekly-carry-${item.kind}`}>
                <dt className="text-label text-text-tertiary uppercase">
                  {item.kind === 'demandAnticipation'
                    ? t('wk.carry.da')
                    : item.kind === 'purchaseOrders'
                      ? t('wk.carry.pos')
                      : t('wk.carry.foresight')}
                </dt>
                <dd className="text-sm text-text-primary">
                  {item.kind === 'demandAnticipation' &&
                    (pub === null
                      ? t('wk.carry.daNone')
                      : t('wk.carry.daValue', { week: weekLabel(pub.week) }))}
                  {item.kind === 'purchaseOrders' && (
                    <>
                      {t('wk.carry.posValue', { count: item.count ?? 0 })}
                      {' · '}
                      <Link
                        to="/supplier/orders"
                        className="text-action-hover hover:underline"
                        data-testid="weekly-open-orders"
                      >
                        {t('wk.carry.openOrders')}
                      </Link>
                    </>
                  )}
                  {item.kind === 'foresight' &&
                    ((item.count ?? 0) === 0 ? (
                      t('wk.carry.foresightNone')
                    ) : (
                      <>
                        {t('wk.carry.foresightCount', { count: item.count ?? 0 })}
                        {' · '}
                        <Link
                          to="/supplier/forecasts"
                          className="text-action-hover hover:underline"
                          data-testid="weekly-open-foresight"
                        >
                          {t('wk.carry.openForesight')}
                        </Link>
                      </>
                    ))}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm px-4 py-3 space-y-2">
          {!heldDa && <HandoffNotice availability={daAvailability} testId="handoff-weekly-da" />}
          {weekConfirmed !== null ? (
            <div data-testid="weekly-week-done">
              <StatusPill variant="success">
                {t('wk.week.done', { week: weekLabel(weekConfirmed) })}
              </StatusPill>
              <p className="text-sm text-text-secondary mt-1">{t('wk.week.sees')}</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-text-secondary">{weekBlocked ?? t('wk.week.ready')}</p>
              {weekRefusal !== null && (
                <p className="text-sm text-danger" role="alert" data-testid="weekly-week-refusal">
                  {weekRefusal}
                </p>
              )}
              <Button
                variant="outline"
                disabled={weekDisabled}
                data-testid="weekly-confirm-week"
                onClick={() => void confirmWeek()}
              >
                {t('wk.week.confirm')}
              </Button>
            </>
          )}
        </section>
      </div>
    </AppShellV2>
  );
};

export default SupplierWeekly;
