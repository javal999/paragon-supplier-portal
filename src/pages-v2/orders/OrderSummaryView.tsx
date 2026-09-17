import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
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
import { useASNs, useCapacityPlans, usePurchaseOrders } from '../../services/query/hooks';
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
import { isActiveAsn } from '../../services/transitions/fulfilmentRules';
import type { CallOffView } from '../../services/transitions/callOffRules';
import { useCallOffViews } from '../callOffs/callOffDisplay';
import { capacityStatusForPo, type CapacityConfirmationStatus } from '../../services/transitions/capacityRules';
import { materialEntry } from '../../services/sdc';

// ─────────────────────────────────────────────────────────────────────────────
// ORDER COLLABORATION SUMMARY — REQ-E07-03 (MN-ORD-10 to MN-ORD-13).
//
// One row per PO: the supplier's response, its ASNs, and the 3 confirmations
// (REQUIREMENTS §3.2). Each available status links to the page that owns it.
// Foresight / fixed stock (REQ-E06-02) reads the forecast commitments for the
// PO's materials — Confirmed, Gap, Awaiting, or Not required when only
// Forecast-zone periods exist — and links to the forecast page for them.
// Capacity confirmation (REQ-E08-04) reads the supplier's capacity submissions
// for the material groups on the PO: Confirmed, Gap, Update needed or Not
// started, linking to the capacity page. A supplier sees its own POs only: the
// PO read is already scoped to the session's supplier.
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
  const mine = views.filter(
    (v) => v.callOff.poId === poId && v.callOff.status !== 'Draft' && v.callOff.status !== 'Dismissed',
  );
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

/** The first of the PO's materials with forecast lines — where the foresight link opens. */
const foresightMaterial = (po: PurchaseOrder, answers: readonly ForesightAnswer[]): string =>
  po.lineItems.map((li) => li.materialCode).find((code) => answers.some((a) => a.supplierId === po.supplierId && a.materialCode === code)) ?? '';

const linkClass = 'text-action hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-action rounded';

export interface OrderSummaryViewProps {
  readonly persona: Persona;
  /** Forecast answers for the foresight confirmation (empty while loading). */
  readonly foresightAnswers: readonly ForesightAnswer[];
}

const OrderSummaryView: React.FC<OrderSummaryViewProps> = ({ persona, foresightAnswers }) => {
  const { t } = useTranslation();
  const posQuery = usePurchaseOrders();
  const asnsQuery = useASNs();
  const callOffs = useCallOffViews();
  const capacityPlans = useCapacityPlans();
  const nowIso = new Date().toISOString();
  const base = persona === 'buyer' ? '/buyer' : '/supplier';
  const crumb = [
    t(persona === 'buyer' ? 'hub.nav.section.orders' : 'hub.nav.section.supplierOrders'),
    t('oc.summary.title'),
  ];

  const rows = useMemo(() => {
    const asns = asnsQuery.data?.items ?? [];
    return [...(posQuery.data?.items ?? [])]
      .sort((a, b) => b.orderDate.localeCompare(a.orderDate))
      .map((po: PurchaseOrder) => ({
        po,
        response: responseStatus(po, nowIso),
        // A cancelled ASN no longer carries goods (REQ-E07-04).
        asnCount: asns.filter((a) => a.poReference === po.poNumber && isActiveAsn(a)).length,
        foresight: foresightStatus(po, foresightAnswers),
        shipping: shippingNoticeStatus(po),
        callOffs: callOffSummary(po.id, callOffs.views),
      }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posQuery.data, asnsQuery.data, foresightAnswers, callOffs.views]);

  if (posQuery.isPending) return <LoadingState breadcrumb={crumb} />;
  if (posQuery.isError)
    return <ErrorState breadcrumb={crumb} error={posQuery.error} onRetry={() => posQuery.refetch()} />;

  const escalated = rows.filter((r) => r.response === 'escalated').length;
  const poLink = (po: PurchaseOrder) => `${base}/orders?po=${encodeURIComponent(po.id)}`;

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

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('oc.summary.col.po')}</TableHeaderCell>
            {persona === 'buyer' && <TableHeaderCell>{t('oc.summary.col.supplier')}</TableHeaderCell>}
            <TableHeaderCell>{t('oc.summary.col.response')}</TableHeaderCell>
            <TableHeaderCell className="text-right">{t('oc.summary.col.asns')}</TableHeaderCell>
            <TableHeaderCell>{t('co.summary.col')}</TableHeaderCell>
            <TableHeaderCell>{t('oc.summary.col.capacity')}</TableHeaderCell>
            <TableHeaderCell>{t('oc.summary.col.foresight')}</TableHeaderCell>
            <TableHeaderCell>{t('oc.summary.col.shipping')}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {rows.map(({ po, response, asnCount, foresight, shipping, callOffs: co }) => (
              <TableRow key={po.id} data-testid={`order-summary-row-${po.id}`}>
                <TableCell>
                  <Link to={poLink(po)} className={linkClass}>
                    <Data className="font-semibold">{po.poNumber}</Data>
                  </Link>
                </TableCell>
                {persona === 'buyer' && (
                  <TableCell className="text-sm text-text-primary">{po.supplierName}</TableCell>
                )}
                <TableCell>
                  <Link to={poLink(po)} aria-label={`${po.poNumber}: ${t(`oc.summary.response.${response}`)}`}>
                    <StatusPill variant={RESPONSE_TONE[response]}>
                      {t(`oc.summary.response.${response}`)}
                    </StatusPill>
                  </Link>
                </TableCell>
                <TableCell className="text-right">
                  {asnCount > 0 ? (
                    <Link to={`${base}/shipments`} className={linkClass}>
                      <Data>{asnCount}</Data>
                    </Link>
                  ) : (
                    <Data className="text-text-tertiary">0</Data>
                  )}
                </TableCell>
                <TableCell data-testid={`order-summary-calloffs-${po.id}`}>
                  {co.status ? (
                    <Link
                      to={`${base}/call-offs`}
                      aria-label={`${po.poNumber}: ${co.count} ${t('co.summary.col')}, ${t(`co.summary.status.${co.status}`)}`}
                      className="inline-flex items-center gap-2"
                    >
                      <Data>{co.count}</Data>
                      <StatusPill variant={CALL_OFF_TONE[co.status]}>{t(`co.summary.status.${co.status}`)}</StatusPill>
                    </Link>
                  ) : (
                    <span className="text-xs text-text-tertiary">—</span>
                  )}
                </TableCell>
                <TableCell data-testid="order-summary-capacity">
                  {(() => {
                    const capacity = capacityStatusForPo(po, capacityPlans.data?.items ?? [], materialEntry);
                    return (
                      <Link to={`${base}/capacity`} aria-label={`${po.poNumber}: ${t(`oc.summary.capacity.${capacity}`)}`}>
                        <StatusPill variant={CAPACITY_TONE[capacity]}>{t(`oc.summary.capacity.${capacity}`)}</StatusPill>
                      </Link>
                    );
                  })()}
                </TableCell>
                <TableCell data-testid={`order-summary-foresight-${po.id}`}>
                  {foresight === 'notStarted' ? (
                    <StatusPill variant="neutral">{t('oc.summary.status.notStarted')}</StatusPill>
                  ) : (
                    <Link
                      to={`${persona === 'buyer' ? '/buyer/collaboration' : '/supplier/forecasts'}?material=${encodeURIComponent(
                        foresightMaterial(po, foresightAnswers),
                      )}`}
                      aria-label={`${po.poNumber}: ${t(`oc.summary.foresight.${foresight}`)}`}
                    >
                      <StatusPill variant={FORESIGHT_TONE[foresight]}>
                        {t(`oc.summary.foresight.${foresight}`)}
                      </StatusPill>
                    </Link>
                  )}
                </TableCell>
                <TableCell>
                  {shipping === 'notStarted' ? (
                    <StatusPill variant="neutral">{t('oc.summary.status.notStarted')}</StatusPill>
                  ) : (
                    <Link to={poLink(po)} data-testid={`order-summary-shipping-${po.id}`}>
                      <StatusPill variant={SHIPPING_TONE[shipping]}>
                        {t(`oc.summary.shipping.${shipping}`)}
                      </StatusPill>
                    </Link>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-sm text-text-tertiary py-10">
                  {t('oc.summary.empty')}
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
