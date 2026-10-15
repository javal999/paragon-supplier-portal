/** @import React from 'react' */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import SampleDataBadge from '@components/ui-v2/SampleDataBadge';
import StatusPill from '@components/ui-v2/StatusPill';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import Data from '@components/ui-v2/Data';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
/** @import { StatusTone } from '@lib/statusTone' */
import { formatDate } from '@lib/format';
import { ordersNow } from './PoCollaboration';
import {
  useASNs,
  useCapacityPlans,
  useGoodsReceipts,
  usePurchaseOrders
} from '@services/query/hooks';
/** @import { PurchaseOrder } from '@services/data/types' */
/** @import { ForesightAnswer, ForesightStatus, ResponseStatus, ShippingNoticeStatus } from '@services/data/poResponseProjection' */
import {
  completionMovedLater,
  foresightStatus,
  responseStatus,
  shippingNoticeStatus
} from '@services/data/poResponseProjection';
/** @import { Persona } from '@components/layout-v2/navConfig' */
/** @import { CallOffView } from '@services/transitions/callOffRules' */
import { useCallOffViews } from '../callOffs/callOffDisplay';
/** @import { CapacityConfirmationStatus } from '@services/transitions/capacityRules' */
import { capacityStatusForPo } from '@services/transitions/capacityRules';
import { materialEntry } from '@services/sdc';
import { dayOf, mondayOf } from '@services/transitions/inventoryRules';
/** @import { AttentionInputs, PoJoinableInvoice } from './orderSummaryModel' */
import {
  asnsForPo,
  callOffsForPo,
  attentionBand,
  compareAttention,
  invoicesForPo,
  poHasReceiptDiscrepancy,
  receiptsForPo
} from './orderSummaryModel';
/** @import { DrillTarget } from './orderSummaryDrill' */
import { drillHref, drillPath, EMPTY_CONTRACT, NOT_REQUIRED } from './orderSummaryDrill';
import { DrillLink, EmptyCell } from './DrillCell';
import { readOrderSummaryViewState, saveOrderSummaryViewState } from './orderSummaryViewState';
import OrdersViewSwitch, { PURCHASE_ORDERS_HEADER } from './OrdersViewSwitch';

/** IA review item 2 — the Summary view's "moved later" filter parameter. */
export const MOVED_PARAM = 'moved';

// ─────────────────────────────────────────────────────────────────────────────
// ORDER COLLABORATION SUMMARY — REQ-E07-03 (MN-ORD-10 to MN-ORD-13).
//
// One row per PO, and per BR-01 ten columns of it: the PO, its supplier, the
// supplier's response, its ASNs, its call-offs, the 3 confirmations (capacity,
// foresight / fixed stock, shipping notice), its goods receipts and its
// invoices. Every cell with a record behind it is a link to the page that OWNS
// that record, filtered to this PO (BR-02); a cell with nothing behind it is not
// a link and states why (BR-03, `DrillCell`).
//
// ⚠️ **THE SUMMARY CALCULATES NO STATUS OF ITS OWN (BR-10), AND EVERY COLUMN
// HERE NAMES THE MODULE IT READS.** Response and shipping notice come from
// `poResponseProjection`, capacity from `capacityRules.capacityStatusForPo`,
// foresight from `poResponseProjection.foresightStatus`, call-offs from
// `callOffRules` through `useCallOffViews`, receipt discrepancies from
// `fulfilmentRules.hasReceiptDiscrepancy`. Membership — which records belong to
// a PO, and so what each count says — lives in `orderSummaryModel`, which the
// DESTINATIONS also call, which is what makes AC-10 hold by construction rather
// than by two filters that happen to agree today.
//
// A supplier sees its own POs only: the PO read is already scoped to the
// session's supplier (BR-06), so nothing here filters by supplier by hand.
//
// P-02 — this is the Summary view of Purchase orders: it wears that page's
// title and breadcrumb, and the "Summary | List" switch sits under the header.
// ─────────────────────────────────────────────────────────────────────────────

/** @type {Record<ResponseStatus, StatusTone>} */
const RESPONSE_TONE = {
  awaiting: 'neutral',
  escalated: 'danger',
  approved: 'success',
  adjusted: 'warning',
  rejected: 'danger'
};

/** @type {Record<ShippingNoticeStatus, StatusTone>} */
const SHIPPING_TONE = {
  notStarted: 'neutral',
  missing: 'warning',
  confirmed: 'success',
  delayed: 'warning'
};

/** @type {Record<CapacityConfirmationStatus, StatusTone>} */
const CAPACITY_TONE = {
  notStarted: 'neutral',
  outdated: 'neutral',
  confirmed: 'success',
  gap: 'warning'
};

/** @type {Record<ForesightStatus, StatusTone>} */
const FORESIGHT_TONE = {
  notStarted: 'neutral',
  awaiting: 'neutral',
  confirmed: 'success',
  gap: 'warning',
  notRequired: 'neutral'
};

/** The call-off confirmation status for one PO (REQ-E07-03 with REQ-E09-03):
 *  the most urgent state among its released call-offs. */
/** @typedef {'escalated' | 'awaitingApproval' | 'awaiting' | 'rejected' | 'confirmed'} CallOffSummaryStatus */

/** @type {Record<CallOffSummaryStatus, StatusTone>} */
const CALL_OFF_TONE = {
  escalated: 'danger',
  awaitingApproval: 'warning',
  awaiting: 'neutral',
  rejected: 'danger',
  confirmed: 'success'
};

/**
 * @param {string} poId
 * @param {readonly CallOffView[]} views
 * @returns {{ count: number; status: CallOffSummaryStatus | null }}
 */
export function callOffSummary(poId, views) {
  const mine = callOffsForPo(views, poId);
  if (mine.length === 0) return { count: 0, status: null };
  /** @param {CallOffView['confirmation']} s */
  const has = (s) => mine.some((v) => v.confirmation === s);
  /** @type {CallOffSummaryStatus} */
  const status = has('Escalated')
    ? 'escalated'
    : has('Awaiting Approval')
      ? 'awaitingApproval'
      : has('Awaiting Confirmation')
        ? 'awaiting'
        : has('Rejected')
          ? 'rejected'
          : 'confirmed';
  return { count: mine.length, status };
}

/**
 * The PO's materials that have forecast lines — where the foresight link opens.
 * @param {PurchaseOrder} po
 * @param {readonly ForesightAnswer[]} answers
 * @returns {readonly string[]}
 */
const foresightMaterials = (po, answers) =>
  [...new Set(po.lineItems.map((li) => li.materialCode))].filter((code) =>
    answers.some((a) => a.supplierId === po.supplierId && a.materialCode === code)
  );

/**
 * The planning groups of a PO's lines — the capacity destination's filter (BR-05; Material C5, MR-8 BR-04).
 * @param {PurchaseOrder} po
 * @returns {readonly string[]}
 */
const poMaterialGroups = (po) =>
  [
    ...new Set(
      po.lineItems
        .map((li) => materialEntry(li.materialCode)?.planningGroupId)
        .filter(/** @returns {g is string} */ (g) => typeof g === 'string')
    )
  ].sort();

/**
 * The Mondays of the weeks the PO delivers into — the other half of BR-05.
 * @param {PurchaseOrder} po
 * @returns {readonly string[]}
 */
const poDeliveryWeeks = (po) =>
  [
    ...new Set(
      [po.requestedDeliveryDate, po.confirmedDeliveryDate]
        .filter(/** @returns {d is string} */ (d) => typeof d === 'string' && d.length >= 10)
        .map((d) => mondayOf(dayOf(d)))
    )
  ].sort();

/** The least an invoice must expose for this summary. Both projections satisfy it. */
/**
 * `returnReason`:  Finance returned it to the supplier — an attention signal (BR-11).
 *
 * @typedef {PoJoinableInvoice & {
 *     readonly returnReason: string | null;
 *   }} SummaryInvoice
 */

/**
 * `foresightAnswers`:  Forecast answers for the foresight confirmation (empty while loading).
 * `invoices`: The invoices of THIS persona's own read (REQ-E07-07). Passed in rather than fetched here because the buyer and supplier reads are different projections with different populations — the buyer's drops drafts, the supplier's keeps its own — and AC-10 wants each summary counting exactly what ITS destination lists.
 *
 * @typedef {{
 *     readonly persona: Persona;
 *     readonly foresightAnswers: readonly ForesightAnswer[];
 *     readonly invoices: readonly SummaryInvoice[];
 *   }} OrderSummaryViewProps
 */

/** @type {React.FC<OrderSummaryViewProps>} */
const OrderSummaryView = ({ persona, foresightAnswers, invoices }) => {
  const { t } = useTranslation();
  const posQuery = usePurchaseOrders();
  const asnsQuery = useASNs();
  const receiptsQuery = useGoodsReceipts();
  const callOffs = useCallOffViews();
  const capacityPlans = useCapacityPlans();
  const nowIso = ordersNow();
  const header = PURCHASE_ORDERS_HEADER[persona];
  const crumb = header.crumb.map((key) => t(key));

  // BR-04 / AC-06 — the filters and the scroll offset the user left behind.
  const stored = useRef(readOrderSummaryViewState(persona));
  const [search, setSearch] = useState(stored.current.search);
  const [attentionOnly, setAttentionOnly] = useState(stored.current.attentionOnly);
  // IA review item 2 — My tasks "Orders whose expected completion moved later"
  // lands here with `moved=1`: only those orders, by the same rule the task
  // counts with (`completionMovedLater`), and a way to clear it.
  const [params] = useSearchParams();
  const movedOnly = params.get(MOVED_PARAM) === '1';

  useEffect(() => {
    saveOrderSummaryViewState(persona, { search, attentionOnly, scrollY: stored.current.scrollY });
  }, [persona, search, attentionOnly]);

  const restored = useRef(false);
  useEffect(() => {
    if (restored.current || stored.current.scrollY === 0) return;
    restored.current = true;
    window.scrollTo(0, stored.current.scrollY);
  }, []);

  /** Leaving for a destination: remember where the row was (BR-04). */
  const rememberPosition = () =>
    saveOrderSummaryViewState(persona, { search, attentionOnly, scrollY: window.scrollY });

  const rows = useMemo(() => {
    const asns = asnsQuery.data?.items ?? [];
    const receipts = receiptsQuery.data?.items ?? [];
    const plans = capacityPlans.data?.items ?? [];
    return (posQuery.data?.items ?? [])
      .map(
        /** @param {PurchaseOrder} po */ (po) => {
          const poReceipts = receiptsForPo(receipts, po.poNumber);
          const poInvoices = invoicesForPo(invoices, po.poNumber, receipts);
          const capacity = capacityStatusForPo(po, plans, materialEntry);
          const foresight = foresightStatus(po, foresightAnswers);
          const co = callOffSummary(po.id, callOffs.views);
          const discrepancy = poHasReceiptDiscrepancy(po, receipts, asns);
          const returned = poInvoices.some((i) => i.returnReason !== null);
          /** @type {AttentionInputs} */
          const attention = {
            response: responseStatus(po, nowIso),
            overdue: po.daysOverdue > 0,
            capacity,
            foresight,
            callOffAlarm: co.status === 'escalated' || co.status === 'rejected',
            receiptDiscrepancy: discrepancy || returned,
            needDate: po.requestedDeliveryDate
          };
          return {
            po,
            response: attention.response,
            asnCount: asnsForPo(asns, po.poNumber).length,
            foresight,
            shipping: shippingNoticeStatus(po),
            callOffs: co,
            capacity,
            receiptCount: poReceipts.length,
            discrepancy,
            invoiceCount: poInvoices.length,
            returned,
            attention
          };
        }
      )
      .sort((a, b) => compareAttention(a.attention, b.attention));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    posQuery.data,
    asnsQuery.data,
    receiptsQuery.data,
    capacityPlans.data,
    foresightAnswers,
    callOffs.views,
    invoices
  ]);

  if (posQuery.isPending) return <LoadingState breadcrumb={crumb} />;
  if (posQuery.isError)
    return (
      <ErrorState breadcrumb={crumb} error={posQuery.error} onRetry={() => posQuery.refetch()} />
    );

  const escalated = rows.filter((r) => r.response === 'escalated').length;
  const q = search.trim().toLowerCase();
  const shown = rows.filter((r) => {
    // "Needs attention" is the requirement's own first two bands (BR-11):
    // escalated or overdue, and orders carrying a gap or a discrepancy.
    if (attentionOnly && attentionBand(r.attention) > 1) return false;
    if (movedOnly && !completionMovedLater(r.po)) return false;
    if (q === '') return true;
    const hay = `${r.po.poNumber} ${r.po.supplierName} ${r.po.lineItems.map((li) => `${li.materialCode} ${li.description}`).join(' ')}`;
    return hay.toLowerCase().includes(q);
  });

  /**
   * @param {PurchaseOrder} po
   * @returns {DrillTarget}
   */
  const target = (po) => ({
    poId: po.id,
    supplierId: po.supplierId,
    groups: poMaterialGroups(po),
    weeks: poDeliveryWeeks(po),
    materials: foresightMaterials(po, foresightAnswers)
  });

  /**
   * @param {Parameters<typeof drillHref>[0]} column
   * @param {PurchaseOrder} po
   * @param {DrillTarget['focus']} [focus]
   */
  const href = (column, po, focus) => drillHref(column, persona, { ...target(po), focus });

  /**
   * @param {PurchaseOrder} po
   * @param {string} columnKey
   * @param {string} status
   */
  const statusAria = (po, columnKey, status) =>
    t('oc.summary.cell.aria.status', { poNumber: po.poNumber, column: t(columnKey), status });

  /**
   * @param {PurchaseOrder} po
   * @param {string} kind
   * @param {number} count
   */
  const countAria = (po, kind, count) =>
    t(count === 1 ? `oc.summary.cell.aria.${kind}.one` : `oc.summary.cell.aria.${kind}.other`, {
      poNumber: po.poNumber,
      count
    });

  // 10 columns for PTI, 9 for a supplier (no supplier column of its own).
  const columnCount = persona === 'buyer' ? 10 : 9;

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={crumb}
        title={t(header.title)}
        subtitle={t(persona === 'buyer' ? 'oc.summary.subtitle.pti' : 'oc.summary.subtitle.sup')}
      />
      <PageMetaLine className="-mt-6 mb-4">
        {t('oc.summary.asOf')} <Data>{formatDate(nowIso)}</Data>
        <SampleDataBadge className="ml-3 align-middle" />
      </PageMetaLine>

      <OrdersViewSwitch persona={persona} view="summary" />

      {escalated > 0 && (
        <div
          role="status"
          className="bg-danger-soft border-l-2 border-danger rounded px-4 py-3 mb-4 text-sm text-danger"
          data-testid="order-summary-escalated-banner"
        >
          {t(
            escalated === 1
              ? 'oc.summary.banner.escalated.one'
              : 'oc.summary.banner.escalated.other',
            {
              count: escalated
            }
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <label className="sr-only" htmlFor="order-summary-search">
          {t('oc.summary.filter.search')}
        </label>
        <input
          id="order-summary-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('oc.summary.filter.searchPlaceholder')}
          data-testid="order-summary-search"
          className="text-sm border border-border-subtle rounded px-3 py-2 w-72 max-w-full bg-bg-surface"
        />
        <label className="text-sm text-text-secondary inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={attentionOnly}
            onChange={(e) => setAttentionOnly(e.target.checked)}
            data-testid="order-summary-attention-only"
          />
          {t('oc.summary.filter.attentionOnly')}
        </label>
      </div>

      {movedOnly ? (
        <div
          role="status"
          className="bg-action-soft border-l-2 border-action rounded px-4 py-3 mb-4 text-sm text-text-secondary flex flex-wrap items-center gap-x-3 gap-y-1"
          data-testid="order-summary-moved-filter"
        >
          <span>{t('oc.summary.filter.moved', { count: shown.length })}</span>
          <Link
            to={`${drillPath('po', persona)}?view=summary`}
            className="text-action-hover underline"
            data-testid="order-summary-moved-clear"
          >
            {t('oc.summary.filter.movedClear')}
          </Link>
        </div>
      ) : null}

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableHeaderCell pin="left">{t('oc.summary.col.po')}</TableHeaderCell>
            {persona === 'buyer' && (
              <TableHeaderCell pin="left">{t('oc.summary.col.supplier')}</TableHeaderCell>
            )}
            <TableHeaderCell pin="left">{t('oc.summary.col.response')}</TableHeaderCell>
            <TableHeaderCell className="text-right">{t('oc.summary.col.asns')}</TableHeaderCell>
            <TableHeaderCell>{t('oc.summary.col.callOffs')}</TableHeaderCell>
            {/* The 3 confirmations share 1 column: separately they pushed the
                receipt and invoice columns off a 1280px screen. Each marker is
                still its own link or its own empty statement. */}
            <TableHeaderCell>{t('oc.summary.col.confirmations')}</TableHeaderCell>
            <TableHeaderCell className="text-right">{t('oc.summary.col.receipts')}</TableHeaderCell>
            <TableHeaderCell className="text-right">{t('oc.summary.col.invoices')}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {shown.map((row) => {
              const { po } = row;
              return (
                <TableRow key={po.id} data-testid={`order-summary-row-${po.id}`}>
                  {/* PO number — never empty (the drill-through table says so). */}
                  <TableCell pin="left">
                    <DrillLink
                      to={/** @type {NonNullable<ReturnType<typeof href>>} */ (href('po', po))}
                      label={po.poNumber}
                      onNavigate={rememberPosition}
                    >
                      <Data className="font-semibold whitespace-nowrap">{po.poNumber}</Data>
                    </DrillLink>
                    {/* BR-11 puts escalated AND overdue orders at the top. Without
                        this line an Approved order sits above an Escalated one with
                        nothing on screen saying why it earned the place. */}
                    {po.daysOverdue > 0 && (
                      <div
                        className="text-xs text-danger whitespace-nowrap"
                        data-testid={`order-summary-overdue-${po.id}`}
                      >
                        <span title={t('oc.summary.overdueTitle', { count: po.daysOverdue })}>
                          {t('oc.summary.overdueBy', { count: po.daysOverdue })}
                        </span>
                      </div>
                    )}
                  </TableCell>

                  {/* Supplier — the profile, or the empty statement when there is
                      no supplier id to open one with. */}
                  {persona === 'buyer' && (
                    <TableCell pin="left">
                      {href('supplier', po) ? (
                        <DrillLink
                          to={
                            /** @type {NonNullable<ReturnType<typeof href>>} */ (
                              href('supplier', po)
                            )
                          }
                          label={t('oc.summary.cell.aria.supplier', {
                            poNumber: po.poNumber,
                            supplier: po.supplierName
                          })}
                          onNavigate={rememberPosition}
                          testId={`order-summary-supplier-${po.id}`}
                        >
                          <span className="text-sm line-clamp-2" title={po.supplierName}>
                            {po.supplierName}
                          </span>
                        </DrillLink>
                      ) : (
                        <EmptyCell
                          contract={
                            /** @type {import('./orderSummaryDrill').EmptyContract} */ (
                              EMPTY_CONTRACT.supplier
                            )
                          }
                          testId={`order-summary-supplier-${po.id}`}
                        />
                      )}
                    </TableCell>
                  )}

                  {/* Response — never empty; "Awaiting response" still opens the PO. */}
                  <TableCell pin="left">
                    <DrillLink
                      to={
                        /** @type {NonNullable<ReturnType<typeof href>>} */ (
                          href('response', po, 'response')
                        )
                      }
                      label={statusAria(
                        po,
                        'oc.summary.col.response',
                        t(`oc.summary.response.${row.response}`)
                      )}
                      onNavigate={rememberPosition}
                      testId={`order-summary-response-${po.id}`}
                    >
                      <StatusPill variant={RESPONSE_TONE[row.response]}>
                        {t(`oc.summary.response.${row.response}`)}
                      </StatusPill>
                    </DrillLink>
                  </TableCell>

                  {/* ASNs (REQ-E07-04) — cancelled ASNs excluded from the count
                      AND from the destination (BR-09). */}
                  <TableCell className="text-right">
                    {row.asnCount > 0 ? (
                      <DrillLink
                        to={/** @type {NonNullable<ReturnType<typeof href>>} */ (href('asns', po))}
                        label={countAria(po, 'asns', row.asnCount)}
                        onNavigate={rememberPosition}
                        testId={`order-summary-asns-${po.id}`}
                      >
                        <Data>{row.asnCount}</Data>
                      </DrillLink>
                    ) : (
                      <EmptyCell
                        contract={
                          /** @type {import('./orderSummaryDrill').EmptyContract} */ (
                            EMPTY_CONTRACT.asns
                          )
                        }
                        testId={`order-summary-asns-${po.id}`}
                      />
                    )}
                  </TableCell>

                  {/* Call-offs (REQ-E09-03). */}
                  <TableCell data-testid={`order-summary-calloffs-${po.id}`}>
                    {row.callOffs.status ? (
                      <DrillLink
                        to={
                          /** @type {NonNullable<ReturnType<typeof href>>} */ (href('callOffs', po))
                        }
                        label={t(
                          row.callOffs.count === 1
                            ? 'oc.summary.cell.aria.callOffs.one'
                            : 'oc.summary.cell.aria.callOffs.other',
                          {
                            poNumber: po.poNumber,
                            count: row.callOffs.count,
                            status: t(`co.summary.status.${row.callOffs.status}`)
                          }
                        )}
                        onNavigate={rememberPosition}
                        className="inline-flex items-center gap-2"
                      >
                        <Data>{row.callOffs.count}</Data>
                        <StatusPill variant={CALL_OFF_TONE[row.callOffs.status]}>
                          {t(`co.summary.status.${row.callOffs.status}`)}
                        </StatusPill>
                      </DrillLink>
                    ) : (
                      <EmptyCell
                        contract={
                          /** @type {import('./orderSummaryDrill').EmptyContract} */ (
                            EMPTY_CONTRACT.callOffs
                          )
                        }
                      />
                    )}
                  </TableCell>

                  {/* The 3 confirmations (REQ-E08-04, REQ-E06-02, REQ-E07-05),
                      each keeping its own destination and its own empty reason. */}
                  <TableCell data-testid={`order-summary-confirmations-${po.id}`}>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span
                        className="inline-flex items-center gap-1.5"
                        data-testid={`order-summary-capacity-${po.id}`}
                      >
                        <span className="text-label uppercase text-text-tertiary">
                          {t('oc.summary.short.capacity')}
                        </span>
                        {row.capacity === 'notStarted' ? (
                          <EmptyCell
                            contract={
                              /** @type {import('./orderSummaryDrill').EmptyContract} */ (
                                EMPTY_CONTRACT.capacity
                              )
                            }
                          />
                        ) : (
                          <DrillLink
                            to={
                              /** @type {NonNullable<ReturnType<typeof href>>} */ (
                                href('capacity', po)
                              )
                            }
                            label={statusAria(
                              po,
                              'oc.summary.col.capacity',
                              t(`oc.summary.capacity.${row.capacity}`)
                            )}
                            onNavigate={rememberPosition}
                          >
                            <StatusPill variant={CAPACITY_TONE[row.capacity]}>
                              {t(`oc.summary.capacity.${row.capacity}`)}
                            </StatusPill>
                          </DrillLink>
                        )}
                      </span>

                      <span
                        className="inline-flex items-center gap-1.5"
                        data-testid={`order-summary-foresight-${po.id}`}
                      >
                        <span className="text-label uppercase text-text-tertiary">
                          {t('oc.summary.short.foresight')}
                        </span>
                        {row.foresight === 'notRequired' ? (
                          <EmptyCell contract={NOT_REQUIRED} />
                        ) : row.foresight === 'notStarted' ? (
                          <EmptyCell
                            contract={
                              /** @type {import('./orderSummaryDrill').EmptyContract} */ (
                                EMPTY_CONTRACT.foresight
                              )
                            }
                          />
                        ) : (
                          <DrillLink
                            to={
                              /** @type {NonNullable<ReturnType<typeof href>>} */ (
                                href('foresight', po)
                              )
                            }
                            label={statusAria(
                              po,
                              'oc.summary.col.foresight',
                              t(`oc.summary.foresight.${row.foresight}`)
                            )}
                            onNavigate={rememberPosition}
                          >
                            <StatusPill variant={FORESIGHT_TONE[row.foresight]}>
                              {t(`oc.summary.foresight.${row.foresight}`)}
                            </StatusPill>
                          </DrillLink>
                        )}
                      </span>

                      <span
                        className="inline-flex items-center gap-1.5"
                        data-testid={`order-summary-shipping-${po.id}`}
                      >
                        <span className="text-label uppercase text-text-tertiary">
                          {t('oc.summary.short.shipping')}
                        </span>
                        {row.shipping === 'notStarted' ? (
                          <EmptyCell
                            contract={
                              /** @type {import('./orderSummaryDrill').EmptyContract} */ (
                                EMPTY_CONTRACT.shipping
                              )
                            }
                          />
                        ) : (
                          <DrillLink
                            to={
                              /** @type {NonNullable<ReturnType<typeof href>>} */ (
                                href('shipping', po, 'shipping')
                              )
                            }
                            label={statusAria(
                              po,
                              'oc.summary.col.shipping',
                              t(`oc.summary.shipping.${row.shipping}`)
                            )}
                            onNavigate={rememberPosition}
                          >
                            <StatusPill variant={SHIPPING_TONE[row.shipping]}>
                              {t(`oc.summary.shipping.${row.shipping}`)}
                            </StatusPill>
                          </DrillLink>
                        )}
                      </span>
                    </div>
                  </TableCell>

                  {/* Goods receipts (REQ-E07-06). */}
                  <TableCell className="text-right" data-testid={`order-summary-receipts-${po.id}`}>
                    {row.receiptCount > 0 ? (
                      <DrillLink
                        to={
                          /** @type {NonNullable<ReturnType<typeof href>>} */ (href('receipts', po))
                        }
                        label={countAria(po, 'receipts', row.receiptCount)}
                        onNavigate={rememberPosition}
                        className="inline-flex items-center gap-2"
                      >
                        <Data>{row.receiptCount}</Data>
                        {row.discrepancy && (
                          <StatusPill variant="warning">{t('oc.summary.discrepancy')}</StatusPill>
                        )}
                      </DrillLink>
                    ) : (
                      <EmptyCell
                        contract={
                          /** @type {import('./orderSummaryDrill').EmptyContract} */ (
                            EMPTY_CONTRACT.receipts
                          )
                        }
                      />
                    )}
                  </TableCell>

                  {/* Invoices (REQ-E07-07). */}
                  <TableCell className="text-right" data-testid={`order-summary-invoices-${po.id}`}>
                    {row.invoiceCount > 0 ? (
                      <DrillLink
                        to={
                          /** @type {NonNullable<ReturnType<typeof href>>} */ (href('invoices', po))
                        }
                        label={countAria(po, 'invoices', row.invoiceCount)}
                        onNavigate={rememberPosition}
                        className="inline-flex items-center gap-2"
                      >
                        <Data>{row.invoiceCount}</Data>
                        {row.returned && (
                          <StatusPill variant="warning">{t('oc.summary.returned')}</StatusPill>
                        )}
                      </DrillLink>
                    ) : (
                      <EmptyCell
                        contract={
                          /** @type {import('./orderSummaryDrill').EmptyContract} */ (
                            EMPTY_CONTRACT.invoices
                          )
                        }
                      />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {shown.length === 0 && (
              <tr>
                <td colSpan={columnCount} className="text-center text-sm text-text-tertiary py-10">
                  {rows.length === 0 ? t('oc.summary.empty') : t('oc.summary.filter.none')}
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>
    </AppShellV2>
  );
};

export default OrderSummaryView;
