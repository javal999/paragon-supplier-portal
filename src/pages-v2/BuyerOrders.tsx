import React, { useEffect, useMemo, useState } from 'react';
import { isActiveAsn } from '../services/transitions/fulfilmentRules';
import { useSearchParams } from 'react-router-dom';
import {
  OrderNotFound,
  PoFilterBanner,
  usePoDrillFilter,
} from './orders/PoDrillFilter';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  ShoppingCart,
  Clock,
  Truck,
  AlertTriangle,
  Plus,
  Download,
  FileSpreadsheet,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Mail,
  Globe,
  Send,
  FileText,
  CheckCircle2,
  Package,
  Receipt,
  Wallet,
  LucideIcon,
} from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import SapDataAgeBanner from '../components/ui-v2/SapDataAgeBanner';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import ProvenanceMarker from '../components/ui-v2/ProvenanceMarker';
import KpiCard from '../components/ui-v2/KpiCard';
import BulkActionsBar from '../components/ui-v2/BulkActionsBar';
import SubTabs from '../components/ui-v2/SubTabs';
import FilterChipsBar from '../components/ui-v2/FilterChipsBar';
import SearchBar from '../components/ui-v2/SearchBar';
import StatusPill from '../components/ui-v2/StatusPill';
import NextActLine from '../components/ui-v2/NextActLine';
import { statusTone } from '../lib/statusTone';
import Table from '../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../components/ui-v2/TableHeader';
import TableRow from '../components/ui-v2/TableRow';
import TableCell from '../components/ui-v2/TableCell';
import Button from '../components/ui-v2/Button';
import SidePanel from '../components/ui-v2/SidePanel';
import Timeline, { TimelineEvent } from '../components/ui-v2/Timeline';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import EmptyState from '../components/ui-v2/EmptyState';
import Data from '../components/ui-v2/Data';
import { useASNs, usePurchaseOrders, useSuppliers } from '../services/query/hooks';
import { useNextAct, useVerbAvailability } from '../hooks/useVerbAvailability';
import { HandoffNotice } from '../components/ui-v2/HandoffNotice';
import {
  usePurchaseOrderAcceptCounter,
  usePurchaseOrderRejectCounter,
} from '../services/query/commandHooks';
import { useToast } from '../hooks/useToast';
import { useRefusalText } from '../hooks/useRefusalText';
import {
  completionMovedLater,
  isEscalated,
  poDisplayStatus,
} from '../services/data/poResponseProjection';
import {
  PoLifecycleSteps,
  PoResponseDetails,
  RespondByLine,
  ordersNow,
  ShippingNoticeDetails,
} from './orders/PoCollaboration';
import { formatIDR, formatDate } from '../lib/format';
// POStatus / ChannelType are runtime enums (used as values) — they stay sourced
// from the enum module; the canonical drift-resolved PurchaseOrder type comes
// from the data layer.
import { ChannelType, POStatus } from '../services/data/types';
import type { PurchaseOrder } from '../services/data/types';
import { poLineQuantityText, poLineValue } from './orders/poLineQuantity';

type GroupTab =
  | 'all'
  | 'escalated'
  | 'review'
  | 'rejected'
  | 'pending'
  | 'confirmed'
  | 'transit'
  | 'delivered'
  | 'closed';

type RangeFilter = '7d' | '30d' | '90d' | 'all';

const CHANNEL_ICON: Record<ChannelType, LucideIcon> = {
  [ChannelType.WHATSAPP]: MessageCircle,
  [ChannelType.EMAIL]: Mail,
  [ChannelType.WEB]: Globe,
  [ChannelType.API]: Send,
};

const PENDING_STATUSES: POStatus[] = [POStatus.SENT, POStatus.VIEWED];
const CONFIRMED_STATUSES: POStatus[] = [
  POStatus.ACKNOWLEDGED,
  POStatus.CONFIRMED,
];
const TRANSIT_STATUSES: POStatus[] = [POStatus.PARTIALLY_DELIVERED];
const DELIVERED_STATUSES: POStatus[] = [POStatus.DELIVERED];
const CLOSED_STATUSES: POStatus[] = [POStatus.CLOSED];

// `escalated` is computed from the clock (never stored); `review` is a counter-
// offer waiting for the planner; `rejected` is the supplier's refusal.
const matchesGroup = (po: PurchaseOrder, group: GroupTab, nowIso: string): boolean => {
  const status = po.status;
  if (group === 'all') return true;
  if (group === 'escalated') return isEscalated(po, nowIso);
  if (group === 'review') return status === POStatus.ADJUSTED;
  if (group === 'rejected') return status === POStatus.REJECTED;
  if (group === 'pending') return PENDING_STATUSES.includes(status);
  if (group === 'confirmed') return CONFIRMED_STATUSES.includes(status);
  if (group === 'transit') return TRANSIT_STATUSES.includes(status);
  if (group === 'delivered') return DELIVERED_STATUSES.includes(status);
  if (group === 'closed') return CLOSED_STATUSES.includes(status);
  return true;
};

const isOpen = (status: POStatus): boolean =>
  status !== POStatus.DELIVERED && status !== POStatus.CLOSED && status !== POStatus.REJECTED;

const isOverdue = (po: PurchaseOrder): boolean =>
  po.daysOverdue > 0 && isOpen(po.status);

const COUNTRY_FLAG: Record<string, string> = {
  ID: 'ID',
  MY: 'MY',
  DE: 'DE',
  FR: 'FR',
  CN: 'CN',
  SG: 'SG',
  IN: 'IN',
};

const DAY_MS = 24 * 60 * 60 * 1000;

// `null` — no footer shortcut: an adjusted PO is reviewed in the panel body, and
// a rejected one has nothing further to ask of the supplier.
const FOOTER_ACTION_KEY: Record<POStatus, string | null> = {
  [POStatus.ADJUSTED]: null,
  [POStatus.REJECTED]: null,
  [POStatus.SENT]: 'buyerOrders.footer.sendReminder',
  [POStatus.VIEWED]: 'buyerOrders.footer.sendReminder',
  [POStatus.ACKNOWLEDGED]: 'buyerOrders.footer.requestAsn',
  [POStatus.CONFIRMED]: 'buyerOrders.footer.requestAsn',
  [POStatus.PARTIALLY_DELIVERED]: 'buyerOrders.footer.trackShipment',
  [POStatus.DELIVERED]: 'buyerOrders.footer.viewGr',
  [POStatus.CLOSED]: 'buyerOrders.footer.viewGr',
};

const STATUS_RANK: Record<POStatus, number> = {
  [POStatus.SENT]: 1,
  [POStatus.VIEWED]: 2,
  [POStatus.ACKNOWLEDGED]: 3,
  [POStatus.ADJUSTED]: 3,
  [POStatus.REJECTED]: 3,
  [POStatus.CONFIRMED]: 4,
  [POStatus.PARTIALLY_DELIVERED]: 5,
  [POStatus.DELIVERED]: 6,
  [POStatus.CLOSED]: 7,
};

const buildTimeline = (po: PurchaseOrder, t: TFunction): TimelineEvent[] => {
  const r = STATUS_RANK[po.status];
  const stateFor = (
    requiredRank: number,
  ): 'completed' | 'current' | 'pending' => {
    if (r > requiredRank) return 'completed';
    if (r === requiredRank) return 'current';
    return 'pending';
  };

  return [
    {
      id: 'created',
      title: t('buyerOrders.timeline.created'),
      timestamp: formatDate(po.orderDate),
      status: 'completed',
      icon: FileText,
    },
    {
      id: 'sent',
      title: t('buyerOrders.timeline.sent'),
      timestamp: `${formatDate(po.orderDate)} · ${po.channel}`,
      status: 'completed',
      icon: Send,
    },
    {
      id: 'ack',
      title: t('buyerOrders.timeline.acknowledged'),
      timestamp:
        r >= 3
          ? t('buyerOrders.timeline.ackAfter', {
              hours: po.acknowledgmentTimeHours,
            })
          : undefined,
      status: r >= 3 ? 'completed' : 'current',
      icon: CheckCircle2,
    },
    {
      id: 'asn',
      title: t('buyerOrders.timeline.asn'),
      timestamp: r >= 5 ? formatDate(po.confirmedDeliveryDate) : undefined,
      status: stateFor(4),
      icon: Truck,
    },
    {
      id: 'gr',
      title: t('buyerOrders.timeline.goodsReceived'),
      // Canonical dropped `deliveryDate`; goods-receipt aligns with the
      // confirmed (actual) delivery date, so map to confirmedDeliveryDate.
      timestamp: r >= 6 ? formatDate(po.confirmedDeliveryDate) : undefined,
      status: stateFor(5),
      icon: Package,
    },
    {
      id: 'invoice',
      title: t('buyerOrders.timeline.invoiceSubmitted'),
      status: stateFor(6),
      icon: Receipt,
    },
    {
      id: 'payment',
      title: t('buyerOrders.timeline.paymentPosted'),
      status: stateFor(7),
      icon: Wallet,
    },
  ];
};

// i18n-defer: buildComms fabricates sample conversation previews (mock data);
// sender label and message previews are left in EN and not translated (D — mock).
const buildComms = (po: PurchaseOrder) => [
  {
    ts: `${po.orderDate} 09:00`,
    sender: 'Procurement',
    channel: po.channel,
    preview: `${po.poNumber} issued to ${po.supplierName}. Total ${formatIDR(po.totalValue)}.`,
  },
  {
    ts: `${po.orderDate} 10:18`,
    sender: po.supplierName,
    channel: po.channel,
    preview:
      po.acknowledgmentTimeHours > 0
        ? 'Received, will confirm shortly.'
        : 'Auto-receipt logged via API.',
  },
  {
    ts: `${po.requestedDeliveryDate} 14:32`,
    sender: 'Procurement',
    channel: po.channel,
    preview: `Reminder: requested delivery ${formatDate(po.requestedDeliveryDate)}.`,
  },
];

// BL-80 — a value-limit line is worth its limit, not quantity × unit price.
const lineTotal = (li: PurchaseOrder['lineItems'][number]): number => poLineValue(li);

const BuyerOrders: React.FC = () => {
  const { t } = useTranslation();
  const ORDERS_CRUMB = [
    t('buyerOrders.crumb.transact'),
    t('buyerOrders.crumb.purchaseOrders'),
  ];
  const [group, setGroup] = useState<GroupTab>('all');
  const [range, setRange] = useState<RangeFilter>('all');
  const [search, setSearch] = useState('');
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);

  // WHO ACTS NEXT on the selected PO. Unconditional — the hook takes a nullable
  // state and answers `null` when nothing is selected; a conditional hook would
  // be a render-order bug the first time the drawer closes.
  const nextAct = useNextAct('purchaseOrder', selectedPO?.status);
  const [commsOpen, setCommsOpen] = useState(false);
  const [reviewRejecting, setReviewRejecting] = useState(false);
  const [reviewComment, setReviewComment] = useState('');
  const { toast } = useToast();
  const refusalText = useRefusalText();
  const acceptCounter = usePurchaseOrderAcceptCounter();
  const rejectCounter = usePurchaseOrderRejectCounter();
  // Two verbs, one atom today — asked once per slot so each keeps its own notice.
  const reviewAvailability = useVerbAvailability('po:review-response');
  const asnsQuery = useASNs();
  const [searchParams] = useSearchParams();
  const nowIso = ordersNow();

  const ordersQuery = usePurchaseOrders();
  const suppliersQuery = useSuppliers();
  const orders = ordersQuery.data?.items ?? [];

  // A link from the order summary or Home opens that PO (`?po=<id>`) or tab
  // (`?tab=escalated`).
  const linkedPoId = searchParams.get('po');
  const linkedTab = searchParams.get('tab');
  // REQ-E07-03 — the drill-through filter, read before the early returns so an
  // unknown or out-of-scope PO refuses rather than silently opening nothing.
  const drill = usePoDrillFilter();
  useEffect(() => {
    if (linkedTab && ['escalated', 'review', 'rejected'].includes(linkedTab)) {
      setGroup(linkedTab as GroupTab);
    }
  }, [linkedTab]);
  useEffect(() => {
    if (!linkedPoId || selectedPO) return;
    const po = (ordersQuery.data?.items ?? []).find((p) => p.id === linkedPoId);
    if (po) setSelectedPO(po);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedPoId, ordersQuery.data]);

  // Country flags are a cosmetic cross-supplier join — best-effort off the
  // suppliers list (empty for a supplier persona; the page still renders).
  const supplierCountryById = useMemo(
    () => new Map((suppliersQuery.data?.items ?? []).map((s) => [s.id, s.country])),
    [suppliersQuery.data],
  );

  const maxOrderDate = useMemo(() => {
    return orders.reduce(
      (acc, po) => (po.orderDate > acc ? po.orderDate : acc),
      orders[0]?.orderDate ?? '',
    );
  }, [orders]);

  const counts = useMemo(() => {
    return {
      all: orders.length,
      escalated: orders.filter((p) => isEscalated(p, nowIso)).length,
      review: orders.filter((p) => p.status === POStatus.ADJUSTED).length,
      rejected: orders.filter((p) => p.status === POStatus.REJECTED).length,
      pending: orders.filter((p) => PENDING_STATUSES.includes(p.status)).length,
      confirmed: orders.filter((p) => CONFIRMED_STATUSES.includes(p.status))
        .length,
      transit: orders.filter((p) => TRANSIT_STATUSES.includes(p.status)).length,
      delivered: orders.filter((p) => DELIVERED_STATUSES.includes(p.status))
        .length,
      closed: orders.filter((p) => CLOSED_STATUSES.includes(p.status)).length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);

  const kpis = useMemo(() => {
    const open = orders.filter((p) => isOpen(p.status));
    const pendingConfirmation = orders.filter((p) =>
      PENDING_STATUSES.includes(p.status),
    );
    const inTransit = orders.filter(
      (p) =>
        p.status === POStatus.CONFIRMED ||
        p.status === POStatus.PARTIALLY_DELIVERED,
    );
    const overdue = orders.filter(isOverdue);
    return {
      open: open.length,
      pendingConfirmation: pendingConfirmation.length,
      inTransit: inTransit.length,
      overdue: overdue.length,
    };
  }, [orders]);

  const filtered = useMemo(() => {
    const refDate = new Date(maxOrderDate || nowIso);
    const rangeDays =
      range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : null;
    const cutoff = rangeDays
      ? new Date(refDate.getTime() - rangeDays * DAY_MS)
      : null;

    return orders.filter((po) => {
      if (!matchesGroup(po, group, nowIso)) return false;
      if (cutoff && new Date(po.orderDate) < cutoff) return false;
      if (search) {
        const q = search.toLowerCase();
        const matMatch = po.lineItems.some(
          (li) =>
            li.materialCode.toLowerCase().includes(q) ||
            li.description.toLowerCase().includes(q),
        );
        const hay = `${po.poNumber} ${po.supplierName}`.toLowerCase();
        if (!hay.includes(q) && !matMatch) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, group, range, search, maxOrderDate]);

  // Primary gate is the PO read; the suppliers join is cosmetic and not gated.
  if (ordersQuery.isPending) return <LoadingState breadcrumb={ORDERS_CRUMB} />;
  if (ordersQuery.isError)
    return (
      <ErrorState
        breadcrumb={ORDERS_CRUMB}
        error={ordersQuery.error}
        onRetry={() => ordersQuery.refetch()}
      />
    );
  // AC-08 / AC-07 — an address naming a PO this seat cannot see is refused as
  // not found, with a way back, and says nothing about whether it exists.
  if (drill.kind === 'pending') return <LoadingState breadcrumb={ORDERS_CRUMB} />;
  if (drill.kind === 'notFound') return <OrderNotFound persona="buyer" breadcrumb={ORDERS_CRUMB} />;
  if (orders.length === 0)
    return (
      <EmptyState
        breadcrumb={ORDERS_CRUMB}
        title={t('buyerOrders.empty.title')}
        subtitle={t('buyerOrders.empty.subtitle')}
        message={t('buyerOrders.empty.message')}
      />
    );

  const closePanel = () => {
    setSelectedPO(null);
    setCommsOpen(false);
    setReviewRejecting(false);
    setReviewComment('');
  };

  // The LIVE row, so the panel follows a review the moment it lands.
  const livePO = selectedPO ? orders.find((p) => p.id === selectedPO.id) ?? selectedPO : null;
  const asnCountFor = (po: PurchaseOrder) =>
    (asnsQuery.data?.items ?? []).filter((a) => a.poReference === po.poNumber && isActiveAsn(a)).length;

  const reviewOutcome = (po: PurchaseOrder, titleKey: string) => ({
    onSuccess: (result: { status: string; reason?: string }) => {
      if (result.status === 'failed') {
        toast({
          variant: 'error',
          title: t('oc.toast.reviewFailed.title', { poNumber: po.poNumber }),
          description: refusalText(result.reason) ?? result.reason ?? '',
        });
        return;
      }
      toast({ variant: 'success', title: t(titleKey, { poNumber: po.poNumber }) });
      setReviewRejecting(false);
      setReviewComment('');
    },
    onError: () => toast({ variant: 'error', title: t('oc.toast.denied') }),
  });

  const panelTitle = selectedPO
    ? t('buyerOrders.panel.title', {
        poNumber: selectedPO.poNumber,
        supplier: selectedPO.supplierName,
      })
    : '';

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={ORDERS_CRUMB}
        title={t('buyerOrders.header.title')}
        subtitle={t('buyerOrders.header.subtitle')}
        actions={
          <BulkActionsBar
            actions={[
              { label: t('buyerOrders.action.export'), icon: FileSpreadsheet },
              { label: t('buyerOrders.action.bulkDownload'), icon: Download },
            ]}
            primary={{ label: t('buyerOrders.action.newPo'), icon: Plus }}
          />
        }
      />

      <PageMetaLine className="-mt-6 mb-6">
        {t(
          orders.length === 1
            ? 'buyerOrders.meta.summary.one'
            : 'buyerOrders.meta.summary.other',
          { count: orders.length, date: formatDate(maxOrderDate) },
        )}
        {/* D-CENSUS-8 — PARTLY REAL, so both axes render. The PO feed is fixture,
            but `purchaseOrder` is a wired CommandTarget: a supplier confirm/reject
            genuinely mutates what this page lists and writes the DR-10 trail. A
            flat "Sample" here would understate a real signal. */}
        <ProvenanceMarker capability="purchaseOrders" className="ml-3 align-middle" />
      </PageMetaLine>

      {/* REQ-E07-08 AC-03 — this page reads SAP data; say how old it is. */}
      <SapDataAgeBanner page="purchaseOrders" className="mb-4" />

      {/* REQ-E07-03 BR-04 — which PO this was filtered by, and the way back. */}
      <PoFilterBanner drill={drill} persona="buyer" count={1} />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        <KpiCard
          eyebrow={t('buyerOrders.kpi.open.eyebrow')}
          value={kpis.open.toString()}
          subtitle={t('buyerOrders.kpi.open.subtitle')}
          icon={ShoppingCart}
        />
        <KpiCard
          eyebrow={t('buyerOrders.kpi.pending.eyebrow')}
          value={kpis.pendingConfirmation.toString()}
          subtitle={t('buyerOrders.kpi.pending.subtitle')}
          icon={Clock}
        />
        <KpiCard
          eyebrow={t('buyerOrders.kpi.transit.eyebrow')}
          value={kpis.inTransit.toString()}
          subtitle={t('buyerOrders.kpi.transit.subtitle')}
          icon={Truck}
        />
        <KpiCard
          eyebrow={t('buyerOrders.kpi.overdue.eyebrow')}
          value={kpis.overdue.toString()}
          subtitle={
            kpis.overdue > 0
              ? t('buyerOrders.kpi.overdue.subtitle.past')
              : t('buyerOrders.kpi.overdue.subtitle.onSchedule')
          }
          icon={AlertTriangle}
        />
      </div>

      <SubTabs
        options={[
          { id: 'all', label: t('buyerOrders.tab.all'), count: counts.all },
          { id: 'escalated', label: t('oc.tab.escalated'), count: counts.escalated },
          { id: 'review', label: t('oc.tab.review'), count: counts.review },
          { id: 'rejected', label: t('oc.tab.rejected'), count: counts.rejected },
          { id: 'pending', label: t('buyerOrders.tab.pending'), count: counts.pending },
          { id: 'confirmed', label: t('buyerOrders.tab.confirmed'), count: counts.confirmed },
          { id: 'transit', label: t('buyerOrders.tab.transit'), count: counts.transit },
          { id: 'delivered', label: t('buyerOrders.tab.delivered'), count: counts.delivered },
          { id: 'closed', label: t('buyerOrders.tab.closed'), count: counts.closed },
        ]}
        value={group}
        onChange={setGroup}
        className="mb-5"
      />

      <div className="flex items-center justify-between gap-4 mb-4">
        <FilterChipsBar
          options={[
            { id: '7d', label: t('buyerOrders.range.7d') },
            { id: '30d', label: t('buyerOrders.range.30d') },
            { id: '90d', label: t('buyerOrders.range.90d') },
            { id: 'all', label: t('buyerOrders.range.all') },
          ]}
          value={range}
          onChange={setRange}
        />
      </div>

      <div className="mb-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={t('buyerOrders.search.placeholder')}
        />
      </div>

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('buyerOrders.table.col.po')}</TableHeaderCell>
            <TableHeaderCell>{t('buyerOrders.table.col.supplier')}</TableHeaderCell>
            <TableHeaderCell>{t('buyerOrders.table.col.material')}</TableHeaderCell>
            <TableHeaderCell>{t('buyerOrders.table.col.orderDate')}</TableHeaderCell>
            <TableHeaderCell>{t('buyerOrders.table.col.delivery')}</TableHeaderCell>
            <TableHeaderCell className="text-right">{t('buyerOrders.table.col.value')}</TableHeaderCell>
            <TableHeaderCell>{t('buyerOrders.table.col.channel')}</TableHeaderCell>
            <TableHeaderCell>{t('buyerOrders.table.col.status')}</TableHeaderCell>
            <TableHeaderCell className="text-right">{t('buyerOrders.table.col.actions')}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {filtered.map((po) => {
              const Channel = CHANNEL_ICON[po.channel];
              const overdue = isOverdue(po);
              const country = supplierCountryById.get(po.supplierId) ?? '';
              const firstLine = po.lineItems[0];
              const moreLines = po.lineItems.length - 1;
              return (
                <TableRow
                  key={po.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedPO(po)}
                >
                  <TableCell>
                    <Data as="div" className="font-semibold text-text-primary">
                      {po.poNumber}
                    </Data>
                    {po.prReference && (
                      <Data as="div" className="text-xs text-text-tertiary mt-0.5">
                        {po.prReference}
                      </Data>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-text-primary">
                      {po.supplierName}
                    </div>
                    {country && (
                      <div className="text-xs text-text-tertiary mt-0.5">
                        {COUNTRY_FLAG[country] ?? country}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-text-secondary">
                      {firstLine?.description ?? '—'}
                    </div>
                    {moreLines > 0 && (
                      <div className="text-xs text-text-tertiary mt-0.5">
                        {t(
                          moreLines === 1
                            ? 'buyerOrders.table.moreLines.one'
                            : 'buyerOrders.table.moreLines.other',
                          { count: moreLines },
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-text-secondary whitespace-nowrap">
                    <Data>{formatDate(po.orderDate)}</Data>
                  </TableCell>
                  <TableCell>
                    <div
                      className={`text-sm whitespace-nowrap ${
                        overdue
                          ? 'text-danger font-semibold'
                          : 'text-text-secondary'
                      }`}
                    >
                      <Data>{formatDate(po.requestedDeliveryDate)}</Data>
                    </div>
                    {overdue && (
                      <div className="text-xs text-danger mt-0.5">
                        {t('buyerOrders.table.overdue', { count: po.daysOverdue })}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-text-primary whitespace-nowrap">
                    <Data>{formatIDR(po.totalValue)}</Data>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-sm text-text-secondary">
                      <Channel size={14} className="text-text-tertiary" />
                      {po.channel}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusPill variant={statusTone(poDisplayStatus(po, nowIso))}>
                      {poDisplayStatus(po, nowIso)}
                    </StatusPill>
                    {completionMovedLater(po) && (
                      <div className="text-xs text-warning-hover mt-0.5">
                        {t('oc.shipping.movedLaterShort')}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <ChevronRight
                      size={16}
                      className="text-text-tertiary inline-block"
                    />
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="text-center text-sm text-text-tertiary py-10"
                >
                  {t('buyerOrders.table.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      <SidePanel
        open={selectedPO !== null}
        onClose={closePanel}
        title={panelTitle}
        footerActions={
          selectedPO && (
            <>
              <Button variant="secondary">{t('buyerOrders.footer.viewFullDetails')}</Button>
              {FOOTER_ACTION_KEY[(livePO ?? selectedPO).status] && (
                <Button variant="outline">
                  {t(FOOTER_ACTION_KEY[(livePO ?? selectedPO).status] as string)}
                </Button>
              )}
            </>
          )
        }
      >
        {selectedPO && (
          <div className="space-y-6">
            <section>
              <h3 className="text-label text-text-tertiary uppercase mb-3">
                {t('buyerOrders.panel.keyFacts')}
              </h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-text-tertiary">{t('buyerOrders.panel.field.orderDate')}</dt>
                  <Data as="dd" className="text-text-primary font-medium">
                    {formatDate(selectedPO.orderDate)}
                  </Data>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('buyerOrders.panel.field.deliveryDate')}</dt>
                  <Data
                    as="dd"
                    className={`font-medium ${
                      isOverdue(selectedPO)
                        ? 'text-danger'
                        : 'text-text-primary'
                    }`}
                  >
                    {formatDate(selectedPO.requestedDeliveryDate)}
                  </Data>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('buyerOrders.panel.field.totalValue')}</dt>
                  <Data as="dd" className="text-text-primary font-semibold">
                    {formatIDR(selectedPO.totalValue)}
                  </Data>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('buyerOrders.panel.field.channel')}</dt>
                  <dd className="text-text-primary font-medium">
                    {selectedPO.channel}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('buyerOrders.panel.field.status')}</dt>
                  <dd>
                    <StatusPill variant={statusTone(poDisplayStatus(livePO ?? selectedPO, nowIso))}>
                      {poDisplayStatus(livePO ?? selectedPO, nowIso)}
                    </StatusPill>
                    {/* The buyer's half of the same silence. `Confirmed`,
                        `Partially Delivered` and `Delivered` are all stranded
                        on this machine — every exit is an S/4HANA goods
                        movement — so the buyer watching a PO had a status word
                        and no indication that the wait is SAP's, not the
                        supplier's. Derived from the canonical state. */}
                    <span className="mt-1 block">
                      <NextActLine act={nextAct} testId="next-act-buyer-po" />
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('buyerOrders.panel.field.currency')}</dt>
                  <dd className="text-text-primary font-medium">
                    {selectedPO.currency}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('buyerOrders.panel.field.incoterms')}</dt>
                  {/* i18n-defer: hardcoded sample terms — Incoterms/payment-term codes kept verbatim (glossary: loanwords/codes) */}
                  <dd className="text-text-primary font-medium">CIF Jakarta</dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('buyerOrders.panel.field.paymentTerms')}</dt>
                  <dd className="text-text-primary font-medium">Net 30</dd>
                </div>
              </dl>
            </section>

            <RespondByLine po={livePO ?? selectedPO} nowIso={nowIso} />

            <PoLifecycleSteps po={livePO ?? selectedPO} asnCount={asnCountFor(livePO ?? selectedPO)} />

            <PoResponseDetails po={livePO ?? selectedPO} />

            {(livePO ?? selectedPO).status === POStatus.ADJUSTED && (
              <section data-testid="po-counter-review">
                <h3 className="text-label text-text-tertiary uppercase mb-3">
                  {t('oc.review.title')}
                </h3>
                {reviewAvailability.kind !== 'held' ? (
                  <HandoffNotice availability={reviewAvailability} testId="handoff-po-review-response" />
                ) : !reviewRejecting ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      disabled={acceptCounter.isPending}
                      onClick={() => {
                        const po = livePO ?? selectedPO;
                        acceptCounter.mutate({ poId: po.id }, reviewOutcome(po, 'oc.toast.accepted.title'));
                      }}
                    >
                      {t('oc.review.accept')}
                    </Button>
                    <Button variant="secondary" onClick={() => setReviewRejecting(true)}>
                      {t('oc.review.reject')}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label
                      className="block text-label text-text-tertiary uppercase"
                      htmlFor="po-review-comment"
                    >
                      {t('oc.review.comment')}
                    </label>
                    <textarea
                      id="po-review-comment"
                      className="w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action min-h-[72px]"
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={() => setReviewRejecting(false)}>
                        {t('oc.action.back')}
                      </Button>
                      <Button
                        variant="outline"
                        disabled={rejectCounter.isPending || !reviewComment.trim()}
                        onClick={() => {
                          const po = livePO ?? selectedPO;
                          rejectCounter.mutate(
                            { poId: po.id, reviewComment: reviewComment.trim() },
                            reviewOutcome(po, 'oc.toast.reopened.title'),
                          );
                        }}
                      >
                        {t('oc.review.sendReject')}
                      </Button>
                    </div>
                  </div>
                )}
              </section>
            )}

            {[POStatus.CONFIRMED, POStatus.PARTIALLY_DELIVERED, POStatus.DELIVERED, POStatus.CLOSED].includes(
              (livePO ?? selectedPO).status,
            ) && (
              <section>
                <h3 className="text-label text-text-tertiary uppercase mb-3">
                  {t('oc.shipping.title')}
                </h3>
                <ShippingNoticeDetails po={livePO ?? selectedPO} />
              </section>
            )}

            <section>
              <h3 className="text-label text-text-tertiary uppercase mb-3">
                {t('buyerOrders.panel.lineItems')}
              </h3>
              <div className="relative min-w-0 border border-border-subtle rounded-md overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-bg-hover text-text-tertiary uppercase tracking-wider">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold">
                        {t('buyerOrders.lines.col.material')}
                      </th>
                      <th className="text-right px-3 py-2 font-semibold">
                        {t('buyerOrders.lines.col.qty')}
                      </th>
                      <th className="text-right px-3 py-2 font-semibold">
                        {t('buyerOrders.lines.col.unit')}
                      </th>
                      <th className="text-right px-3 py-2 font-semibold">
                        {t('buyerOrders.lines.col.lineTotal')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPO.lineItems.map((li) => (
                      <tr
                        key={li.id}
                        className="border-t border-border-subtle"
                      >
                        <td className="px-3 py-2">
                          <Data as="div" className="text-xs text-text-tertiary">
                            {li.materialCode}
                          </Data>
                          <div className="text-text-primary mt-0.5">
                            {li.description}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right text-text-secondary whitespace-nowrap">
                          <Data>{poLineQuantityText(t, li)}</Data>
                        </td>
                        <td className="px-3 py-2 text-right text-text-secondary whitespace-nowrap">
                          <Data>{formatIDR(li.unitPrice)}</Data>
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-text-primary whitespace-nowrap">
                          <Data>{formatIDR(lineTotal(li))}</Data>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border-subtle bg-bg-hover">
                      <td
                        className="px-3 py-2 text-right font-semibold text-text-tertiary uppercase tracking-wider"
                        colSpan={3}
                      >
                        {t('buyerOrders.lines.total')}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-text-primary whitespace-nowrap">
                        <Data>{formatIDR(selectedPO.totalValue)}</Data>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>

            <section>
              <h3 className="text-label text-text-tertiary uppercase mb-3">
                {t('buyerOrders.panel.lifecycle')}
              </h3>
              <Timeline events={buildTimeline(selectedPO, t)} />
            </section>

            <section>
              <button
                type="button"
                onClick={() => setCommsOpen((v) => !v)}
                className="flex items-center gap-2 text-sm font-medium text-teal-hover hover:text-teal-hover"
              >
                {commsOpen ? (
                  <ChevronUp size={14} />
                ) : (
                  <ChevronDown size={14} />
                )}
                {commsOpen
                  ? t('buyerOrders.comms.hide')
                  : t('buyerOrders.comms.show')}{' '}
                {t(
                  buildComms(selectedPO).length === 1
                    ? 'buyerOrders.comms.history.one'
                    : 'buyerOrders.comms.history.other',
                  { count: buildComms(selectedPO).length },
                )}
              </button>
              {commsOpen && (
                <ul className="mt-3 space-y-3">
                  {buildComms(selectedPO).map((m, i) => {
                    const Icon = CHANNEL_ICON[m.channel];
                    return (
                      <li
                        key={i}
                        className="flex gap-3 p-3 border border-border-subtle rounded-md"
                      >
                        <Icon
                          size={14}
                          className="text-text-tertiary shrink-0 mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-xs text-text-tertiary">
                            <span className="font-medium text-text-secondary">
                              {m.sender}
                            </span>
                            <span>·</span>
                            <span>{m.ts}</span>
                          </div>
                          <p className="text-sm text-text-secondary mt-0.5">
                            {m.preview}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        )}
      </SidePanel>
    </AppShellV2>
  );
};

export default BuyerOrders;
