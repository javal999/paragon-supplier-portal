import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppShellV2 from '../../components/layout-v2/AppShellV2';
import PageHeader from '../../components/ui-v2/PageHeader';
import PageMetaLine from '../../components/ui-v2/PageMetaLine';
import SampleDataBadge from '../../components/ui-v2/SampleDataBadge';
import StatusPill from '../../components/ui-v2/StatusPill';
import Table from '../../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../../components/ui-v2/TableHeader';
import TableRow from '../../components/ui-v2/TableRow';
import TableCell from '../../components/ui-v2/TableCell';
import Data from '../../components/ui-v2/Data';
import LoadingState from '../../components/ui-v2/LoadingState';
import ErrorState from '../../components/ui-v2/ErrorState';
import type { StatusTone } from '../../lib/statusTone';
import { formatDate } from '../../lib/format';
import { ordersNow } from './PoCollaboration';
import { useASNs, useCapacityPlans, useGoodsReceipts, usePurchaseOrders } from '../../services/query/hooks';
import type { PurchaseOrder } from '../../services/data/types';
import {
  foresightStatus,
  responseStatus,
  shippingNoticeStatus,
  type ForesightAnswer,
  type ForesightStatus,
  type ResponseStatus,
  type ShippingNoticeStatus,
} from '../../services/data/poResponseProjection';
import type { Persona } from '../../components/layout-v2/navConfig';
import type { CallOffView } from '../../services/transitions/callOffRules';
import { useCallOffViews } from '../callOffs/callOffDisplay';
import { capacityStatusForPo, type CapacityConfirmationStatus } from '../../services/transitions/capacityRules';
import { materialEntry } from '../../services/sdc';
import { dayOf, mondayOf } from '../../services/transitions/inventoryRules';
import {
  asnsForPo,
  callOffsForPo,
  attentionBand,
  compareAttention,
  invoicesForPo,
  poHasReceiptDiscrepancy,
  receiptsForPo,
  type AttentionInputs,
  type PoJoinableInvoice,
} from './orderSummaryModel';
import { drillHref, EMPTY_CONTRACT, NOT_REQUIRED, type DrillTarget } from './orderSummaryDrill';
import { DrillLink, EmptyCell } from './DrillCell';
import {
  readOrderSummaryViewState,
  saveOrderSummaryViewState,
} from './orderSummaryViewState';

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
// ─────────────────────────────────────────────────────────────────────────────

const RESPONSE_TONE: Record<ResponseStatus, StatusTone> = {
  awaiting: 'neutral',
  escalated: 'danger',
  approved: 'success',
  adjusted: 'warning',
  rejected: 'danger',
};

const SHIPPING_TONE: Record<ShippingNoticeStatus, StatusTone> = {
  notStarted: 'neutral',
  missing: 'warning',
  confirmed: 'success',
  delayed: 'warning',
};

const CAPACITY_TONE: Record<CapacityConfirmationStatus, StatusTone> = {
  notStarted: 'neutral',
  outdated: 'neutral',
  confirmed: 'success',
  gap: 'warning',
};

const FORESIGHT_TONE: Record<ForesightStatus, StatusTone> = {
  notStarted: 'neutral',
  awaiting: 'neutral',
  confirmed: 'success',
  gap: 'warning',
  notRequired: 'neutral',
};

/** The call-off confirmation status for one PO (REQ-E07-03 with REQ-E09-03):
 *  the most urgent state among its released call-offs. */
export type CallOffSummaryStatus = 'escalated' | 'awaitingApproval' | 'awaiting' | 'rejected' | 'confirmed';

const CALL_OFF_TONE: Record<CallOffSummaryStatus, StatusTone> = {
  escalated: 'danger',
  awaitingApproval: 'warning',
  awaiting: 'neutral',
  rejected: 'danger',
  confirmed: 'success',
};

export function callOffSummary(
  poId: string,
  views: readonly CallOffView[],
): { count: number; status: CallOffSummaryStatus | null } {
  const mine = callOffsForPo(views, poId);
  if (mine.length === 0) return { count: 0, status: null };
  const has = (s: CallOffView['confirmation']) => mine.some((v) => v.confirmation === s);
  const status: CallOffSummaryStatus = has('Escalated')
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

/** The PO's materials that have forecast lines — where the foresight link opens. */
const foresightMaterials = (po: PurchaseOrder, answers: readonly ForesightAnswer[]): readonly string[] =>
  [...new Set(po.lineItems.map((li) => li.materialCode))].filter((code) =>
    answers.some((a) => a.supplierId === po.supplierId && a.materialCode === code),
  );

/** The material groups of a PO's lines — the capacity destination's filter (BR-05). */
const poMaterialGroups = (po: PurchaseOrder): readonly string[] =>
  [
    ...new Set(
      po.lineItems
        .map((li) => materialEntry(li.materialCode)?.materialGroup)
        .filter((g): g is string => typeof g === 'string'),
    ),
  ].sort();

/** The Mondays of the weeks the PO delivers into — the other half of BR-05. */
const poDeliveryWeeks = (po: PurchaseOrder): readonly string[] =>
  [
    ...new Set(
      [po.requestedDeliveryDate, po.confirmedDeliveryDate]
        .filter((d): d is string => typeof d === 'string' && d.length >= 10)
        .map((d) => mondayOf(dayOf(d))),
    ),
  ].sort();

/** The least an invoice must expose for this summary. Both projections satisfy it. */
export interface SummaryInvoice extends PoJoinableInvoice {
  /** Finance returned it to the supplier — an attention signal (BR-11). */
  readonly returnReason: string | null;
}

export interface OrderSummaryViewProps {
  readonly persona: Persona;
  /** Forecast answers for the foresight confirmation (empty while loading). */
  readonly foresightAnswers: readonly ForesightAnswer[];
  /**
   * The invoices of THIS persona's own read (REQ-E07-07). Passed in rather than
   * fetched here because the buyer and supplier reads are different projections
   * with different populations — the buyer's drops drafts, the supplier's keeps
   * its own — and AC-10 wants each summary counting exactly what ITS destination
   * lists.
   */
  readonly invoices: readonly SummaryInvoice[];
}

const OrderSummaryView: React.FC<OrderSummaryViewProps> = ({ persona, foresightAnswers, invoices }) => {
  const { t } = useTranslation();
  const posQuery = usePurchaseOrders();
  const asnsQuery = useASNs();
  const receiptsQuery = useGoodsReceipts();
  const callOffs = useCallOffViews();
  const capacityPlans = useCapacityPlans();
  const nowIso = ordersNow();
  const crumb = [
    t(persona === 'buyer' ? 'hub.nav.section.orders' : 'hub.nav.section.supplierOrders'),
    t('oc.summary.title'),
  ];

  // BR-04 / AC-06 — the filters and the scroll offset the user left behind.
  const stored = useRef(readOrderSummaryViewState(persona));
  const [search, setSearch] = useState(stored.current.search);
  const [attentionOnly, setAttentionOnly] = useState(stored.current.attentionOnly);

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
      .map((po: PurchaseOrder) => {
        const poReceipts = receiptsForPo(receipts, po.poNumber);
        const poInvoices = invoicesForPo(invoices, po.poNumber, receipts);
        const capacity = capacityStatusForPo(po, plans, materialEntry);
        const foresight = foresightStatus(po, foresightAnswers);
        const co = callOffSummary(po.id, callOffs.views);
        const discrepancy = poHasReceiptDiscrepancy(po, receipts, asns);
        const returned = poInvoices.some((i) => i.returnReason !== null);
        const attention: AttentionInputs = {
          response: responseStatus(po, nowIso),
          overdue: po.daysOverdue > 0,
          capacity,
          foresight,
          callOffAlarm: co.status === 'escalated' || co.status === 'rejected',
          receiptDiscrepancy: discrepancy || returned,
          needDate: po.requestedDeliveryDate,
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
          attention,
        };
      })
      .sort((a, b) => compareAttention(a.attention, b.attention));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posQuery.data, asnsQuery.data, receiptsQuery.data, capacityPlans.data, foresightAnswers, callOffs.views, invoices]);

  if (posQuery.isPending) return <LoadingState breadcrumb={crumb} />;
  if (posQuery.isError)
    return <ErrorState breadcrumb={crumb} error={posQuery.error} onRetry={() => posQuery.refetch()} />;

  const escalated = rows.filter((r) => r.response === 'escalated').length;
  const q = search.trim().toLowerCase();
  const shown = rows.filter((r) => {
    // "Needs attention" is the requirement's own first two bands (BR-11):
    // escalated or overdue, and orders carrying a gap or a discrepancy.
    if (attentionOnly && attentionBand(r.attention) > 1) return false;
    if (q === '') return true;
    const hay = `${r.po.poNumber} ${r.po.supplierName} ${r.po.lineItems.map((li) => `${li.materialCode} ${li.description}`).join(' ')}`;
    return hay.toLowerCase().includes(q);
  });

  const target = (po: PurchaseOrder): DrillTarget => ({
    poId: po.id,
    supplierId: po.supplierId,
    groups: poMaterialGroups(po),
    weeks: poDeliveryWeeks(po),
    materials: foresightMaterials(po, foresightAnswers),
  });

  const href = (column: Parameters<typeof drillHref>[0], po: PurchaseOrder, focus?: DrillTarget['focus']) =>
    drillHref(column, persona, { ...target(po), focus });

  const statusAria = (po: PurchaseOrder, columnKey: string, status: string) =>
    t('oc.summary.cell.aria.status', { poNumber: po.poNumber, column: t(columnKey), status });

  const countAria = (po: PurchaseOrder, kind: string, count: number) =>
    t(count === 1 ? `oc.summary.cell.aria.${kind}.one` : `oc.summary.cell.aria.${kind}.other`, {
      poNumber: po.poNumber,
      count,
    });

  // 10 columns for PTI, 9 for a supplier (no supplier column of its own).
  const columnCount = persona === 'buyer' ? 10 : 9;

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={crumb}
        title={t('oc.summary.title')}
        subtitle={t(persona === 'buyer' ? 'oc.summary.subtitle.pti' : 'oc.summary.subtitle.sup')}
      />
      <PageMetaLine className="-mt-6 mb-4">
        {t('oc.summary.asOf')} <Data>{formatDate(nowIso)}</Data>
        <SampleDataBadge className="ml-3 align-middle" />
      </PageMetaLine>

      {escalated > 0 && (
        <div
          role="status"
          className="bg-danger-soft border-l-2 border-danger rounded px-4 py-3 mb-4 text-sm text-danger"
          data-testid="order-summary-escalated-banner"
        >
          {t(escalated === 1 ? 'oc.summary.banner.escalated.one' : 'oc.summary.banner.escalated.other', {
            count: escalated,
          })}
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

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('oc.summary.col.po')}</TableHeaderCell>
            {persona === 'buyer' && <TableHeaderCell>{t('oc.summary.col.supplier')}</TableHeaderCell>}
            <TableHeaderCell>{t('oc.summary.col.response')}</TableHeaderCell>
            <TableHeaderCell className="text-right">{t('oc.summary.col.asns')}</TableHeaderCell>
            <TableHeaderCell>{t('oc.summary.col.callOffs')}</TableHeaderCell>
            <TableHeaderCell>{t('oc.summary.col.capacity')}</TableHeaderCell>
            <TableHeaderCell>{t('oc.summary.col.foresight')}</TableHeaderCell>
            <TableHeaderCell>{t('oc.summary.col.shipping')}</TableHeaderCell>
            <TableHeaderCell className="text-right">{t('oc.summary.col.receipts')}</TableHeaderCell>
            <TableHeaderCell className="text-right">{t('oc.summary.col.invoices')}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {shown.map((row) => {
              const { po } = row;
              return (
                <TableRow key={po.id} data-testid={`order-summary-row-${po.id}`}>
                  {/* PO number — never empty (the drill-through table says so). */}
                  <TableCell>
                    <DrillLink to={href('po', po)!} label={po.poNumber} onNavigate={rememberPosition}>
                      <Data className="font-semibold">{po.poNumber}</Data>
                    </DrillLink>
                  </TableCell>

                  {/* Supplier — the profile, or the empty statement when there is
                      no supplier id to open one with. */}
                  {persona === 'buyer' && (
                    <TableCell>
                      {href('supplier', po) ? (
                        <DrillLink
                          to={href('supplier', po)!}
                          label={t('oc.summary.cell.aria.supplier', {
                            poNumber: po.poNumber,
                            supplier: po.supplierName,
                          })}
                          onNavigate={rememberPosition}
                          testId={`order-summary-supplier-${po.id}`}
                        >
                          <span className="text-sm truncate max-w-[11rem] inline-block align-bottom" title={po.supplierName}>
                            {po.supplierName}
                          </span>
                        </DrillLink>
                      ) : (
                        <EmptyCell
                          contract={EMPTY_CONTRACT.supplier!}
                          testId={`order-summary-supplier-${po.id}`}
                        />
                      )}
                    </TableCell>
                  )}

                  {/* Response — never empty; "Awaiting response" still opens the PO. */}
                  <TableCell>
                    <DrillLink
                      to={href('response', po, 'response')!}
                      label={statusAria(po, 'oc.summary.col.response', t(`oc.summary.response.${row.response}`))}
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
                        to={href('asns', po)!}
                        label={countAria(po, 'asns', row.asnCount)}
                        onNavigate={rememberPosition}
                        testId={`order-summary-asns-${po.id}`}
                      >
                        <Data>{row.asnCount}</Data>
                      </DrillLink>
                    ) : (
                      <EmptyCell contract={EMPTY_CONTRACT.asns!} testId={`order-summary-asns-${po.id}`} />
                    )}
                  </TableCell>

                  {/* Call-offs (REQ-E09-03). */}
                  <TableCell data-testid={`order-summary-calloffs-${po.id}`}>
                    {row.callOffs.status ? (
                      <DrillLink
                        to={href('callOffs', po)!}
                        label={t(
                          row.callOffs.count === 1
                            ? 'oc.summary.cell.aria.callOffs.one'
                            : 'oc.summary.cell.aria.callOffs.other',
                          {
                            poNumber: po.poNumber,
                            count: row.callOffs.count,
                            status: t(`co.summary.status.${row.callOffs.status}`),
                          },
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
                      <EmptyCell contract={EMPTY_CONTRACT.callOffs!} />
                    )}
                  </TableCell>

                  {/* Capacity (REQ-E08-04) — filtered to the supplier, the PO's
                      material groups and its delivery weeks (BR-05). */}
                  <TableCell data-testid={`order-summary-capacity-${po.id}`}>
                    {row.capacity === 'notStarted' ? (
                      <EmptyCell contract={EMPTY_CONTRACT.capacity!} />
                    ) : (
                      <DrillLink
                        to={href('capacity', po)!}
                        label={statusAria(po, 'oc.summary.col.capacity', t(`oc.summary.capacity.${row.capacity}`))}
                        onNavigate={rememberPosition}
                      >
                        <StatusPill variant={CAPACITY_TONE[row.capacity]}>
                          {t(`oc.summary.capacity.${row.capacity}`)}
                        </StatusPill>
                      </DrillLink>
                    )}
                  </TableCell>

                  {/* Foresight / fixed stock (REQ-E06-02). "Not required" when the
                      PO's materials have no forecast periods (BR-08). */}
                  <TableCell data-testid={`order-summary-foresight-${po.id}`}>
                    {row.foresight === 'notRequired' ? (
                      <EmptyCell contract={NOT_REQUIRED} />
                    ) : row.foresight === 'notStarted' ? (
                      <EmptyCell contract={EMPTY_CONTRACT.foresight!} />
                    ) : (
                      <DrillLink
                        to={href('foresight', po)!}
                        label={statusAria(po, 'oc.summary.col.foresight', t(`oc.summary.foresight.${row.foresight}`))}
                        onNavigate={rememberPosition}
                      >
                        <StatusPill variant={FORESIGHT_TONE[row.foresight]}>
                          {t(`oc.summary.foresight.${row.foresight}`)}
                        </StatusPill>
                      </DrillLink>
                    )}
                  </TableCell>

                  {/* Shipping notice (REQ-E07-05) — on the PO detail. */}
                  <TableCell data-testid={`order-summary-shipping-${po.id}`}>
                    {row.shipping === 'notStarted' ? (
                      <EmptyCell contract={EMPTY_CONTRACT.shipping!} />
                    ) : (
                      <DrillLink
                        to={href('shipping', po, 'shipping')!}
                        label={statusAria(po, 'oc.summary.col.shipping', t(`oc.summary.shipping.${row.shipping}`))}
                        onNavigate={rememberPosition}
                      >
                        <StatusPill variant={SHIPPING_TONE[row.shipping]}>
                          {t(`oc.summary.shipping.${row.shipping}`)}
                        </StatusPill>
                      </DrillLink>
                    )}
                  </TableCell>

                  {/* Goods receipts (REQ-E07-06). */}
                  <TableCell className="text-right" data-testid={`order-summary-receipts-${po.id}`}>
                    {row.receiptCount > 0 ? (
                      <DrillLink
                        to={href('receipts', po)!}
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
                      <EmptyCell contract={EMPTY_CONTRACT.receipts!} />
                    )}
                  </TableCell>

                  {/* Invoices (REQ-E07-07). */}
                  <TableCell className="text-right" data-testid={`order-summary-invoices-${po.id}`}>
                    {row.invoiceCount > 0 ? (
                      <DrillLink
                        to={href('invoices', po)!}
                        label={countAria(po, 'invoices', row.invoiceCount)}
                        onNavigate={rememberPosition}
                        className="inline-flex items-center gap-2"
                      >
                        <Data>{row.invoiceCount}</Data>
                        {row.returned && <StatusPill variant="warning">{t('oc.summary.returned')}</StatusPill>}
                      </DrillLink>
                    ) : (
                      <EmptyCell contract={EMPTY_CONTRACT.invoices!} />
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
