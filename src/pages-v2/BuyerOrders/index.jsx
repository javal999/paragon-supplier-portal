/** @import React from 'react' */
/** @import { PurchaseOrder } from '@services/data/types' */
/** @import { GroupTab, RangeFilter } from './const' */
import { useEffect, useRef, useState } from 'react';
import { isActiveAsn } from '@services/transitions/fulfilmentRules';
import { useSearchParams } from 'react-router-dom';
import { OrderNotFound, PoFilterBanner, usePoDrillFilter } from '../orders/PoDrillFilter';
import OrdersViewSwitch, { useOrdersView } from '../orders/OrdersViewSwitch';
import BuyerOrderSummary from '../BuyerOrderSummary';
import { useTranslation } from 'react-i18next';
import { Plus, Download, FileSpreadsheet } from 'lucide-react';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import SapDataAgeBanner from '@components/ui-v2/SapDataAgeBanner';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import ProvenanceMarker from '@components/ui-v2/ProvenanceMarker';
import BulkActionsBar from '@components/ui-v2/BulkActionsBar';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import EmptyState from '@components/ui-v2/EmptyState';
import { useASNs, usePurchaseOrders, useSuppliers } from '@services/query/hooks';
import { useNextAct, useVerbAvailability } from '@hooks/useVerbAvailability';
import {
  usePurchaseOrderAcceptCounter,
  usePurchaseOrderRejectCounter
} from '@services/query/commandHooks';
import { useToast } from '@hooks/useToast';
import { useRefusalText } from '@hooks/useRefusalText';
import { ordersNow } from '../orders/PoCollaboration';
import { formatDate } from '@lib/format';
import { useOrdersWorklist } from './hooks/useOrdersWorklist';
import OrdersKpis from './components/OrdersKpis';
import OrdersFilters from './components/OrdersFilters';
import OrdersTable from './components/OrdersTable';
import PoPanel from './components/PoPanel';

/**
 * The List view of Purchase orders: the PO worklist and its panel.
 * @type {React.FC}
 */
const BuyerOrdersList = () => {
  const { t } = useTranslation();
  const ORDERS_CRUMB = [t('buyerOrders.crumb.transact'), t('buyerOrders.crumb.purchaseOrders')];
  const [group, setGroup] = useState(/** @type {GroupTab} */ ('all'));
  const [range, setRange] = useState(/** @type {RangeFilter} */ ('all'));
  const [search, setSearch] = useState('');
  const [selectedPO, setSelectedPO] = useState(/** @type {PurchaseOrder | null} */ (null));

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
  // The LIVE row, so the panel follows a review the moment it lands.
  const livePO = selectedPO ? (orders.find((p) => p.id === selectedPO.id) ?? selectedPO) : null;

  // WHO ACTS NEXT on the selected PO, from its live status. Unconditional — the
  // hook takes a nullable state and answers `null` when nothing is selected; a
  // conditional hook would be a render-order bug the first time the drawer closes.
  const nextAct = useNextAct('purchaseOrder', livePO?.status);

  // A link from the order summary or Home opens that PO (`?po=<id>`) or tab
  // (`?tab=escalated`).
  const linkedPoId = searchParams.get('po');
  const linkedTab = searchParams.get('tab');
  // REQ-E07-03 — the drill-through filter, read before the early returns so an
  // unknown or out-of-scope PO refuses rather than silently opening nothing.
  const drill = usePoDrillFilter();
  useEffect(() => {
    // `pending` added for the dashboard bar / Home's "unacknowledged POs"
    // flag (PR #74 D-review): its count is a strict subset of this tab's
    // [SENT, VIEWED], so the tab never hides a counted row.
    if (linkedTab && ['escalated', 'review', 'rejected', 'pending'].includes(linkedTab)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- applies the deep-linked tab
      setGroup(/** @type {GroupTab} */ (linkedTab));
    }
  }, [linkedTab]);
  // IA F-3 — the panel follows the address: a new `?po=` opens that PO even
  // while another is open. Only a CHANGE of the parameter acts, so a refetch
  // never pulls the panel back from a PO the user picked in the table.
  const appliedPoId = useRef(/** @type {string | null} */ (null));
  useEffect(() => {
    if (!linkedPoId) {
      appliedPoId.current = null;
      return;
    }
    if (appliedPoId.current === linkedPoId) return;
    const po = (ordersQuery.data?.items ?? []).find((p) => p.id === linkedPoId);
    if (po) {
      appliedPoId.current = linkedPoId;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- applies the deep-linked PO once orders load
      setSelectedPO(po);
    }
  }, [linkedPoId, ordersQuery.data]);

  const { supplierCountryById, maxOrderDate, counts, kpis, filtered } = useOrdersWorklist({
    orders,
    suppliersQuery,
    nowIso,
    group,
    range,
    search
  });

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

  /** @param {PurchaseOrder} po */
  const asnCountFor = (po) =>
    (asnsQuery.data?.items ?? []).filter((a) => a.poReference === po.poNumber && isActiveAsn(a))
      .length;

  /**
   * @param {PurchaseOrder} po
   * @param {string} titleKey
   */
  const reviewOutcome = (po, titleKey) => ({
    /** @param {{ status: string; reason?: string }} result */
    onSuccess: (result) => {
      if (result.status === 'failed') {
        toast({
          variant: 'error',
          title: t('oc.toast.reviewFailed.title', { poNumber: po.poNumber }),
          description: refusalText(result.reason) ?? result.reason ?? ''
        });
        return;
      }
      toast({ variant: 'success', title: t(titleKey, { poNumber: po.poNumber }) });
      setReviewRejecting(false);
      setReviewComment('');
    },
    onError: () => toast({ variant: 'error', title: t('oc.toast.denied') })
  });

  const panelTitle = selectedPO
    ? t('buyerOrders.panel.title', {
        poNumber: selectedPO.poNumber,
        supplier: selectedPO.supplierName
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
              { label: t('buyerOrders.action.bulkDownload'), icon: Download }
            ]}
            primary={{ label: t('buyerOrders.action.newPo'), icon: Plus }}
          />
        }
      />

      <PageMetaLine className="-mt-6 mb-6">
        {t(
          orders.length === 1 ? 'buyerOrders.meta.summary.one' : 'buyerOrders.meta.summary.other',
          { count: orders.length, date: formatDate(maxOrderDate) }
        )}
        {/* D-CENSUS-8 — PARTLY REAL, so both axes render. The PO feed is fixture,
            but `purchaseOrder` is a wired CommandTarget: a supplier confirm/reject
            genuinely mutates what this page lists and writes the DR-10 trail. A
            flat "Sample" here would understate a real signal. */}
        <ProvenanceMarker capability="purchaseOrders" className="ml-3 align-middle" />
      </PageMetaLine>

      <OrdersViewSwitch persona="buyer" view="list" />

      {/* REQ-E07-08 AC-03 — this page reads SAP data; say how old it is. */}
      <SapDataAgeBanner page="purchaseOrders" className="mb-4" />

      {/* REQ-E07-03 BR-04 — which PO this was filtered by, and the way back. */}
      <PoFilterBanner drill={drill} persona="buyer" count={1} />

      <OrdersKpis kpis={kpis} t={t} />

      <OrdersFilters
        counts={counts}
        group={group}
        setGroup={setGroup}
        range={range}
        setRange={setRange}
        search={search}
        setSearch={setSearch}
        t={t}
      />

      <OrdersTable
        filtered={filtered}
        supplierCountryById={supplierCountryById}
        nowIso={nowIso}
        setSelectedPO={setSelectedPO}
        t={t}
      />

      <PoPanel
        selectedPO={selectedPO}
        livePO={livePO}
        closePanel={closePanel}
        panelTitle={panelTitle}
        nowIso={nowIso}
        nextAct={nextAct}
        asnCountFor={asnCountFor}
        reviewAvailability={reviewAvailability}
        reviewRejecting={reviewRejecting}
        setReviewRejecting={setReviewRejecting}
        reviewComment={reviewComment}
        setReviewComment={setReviewComment}
        acceptCounter={acceptCounter}
        rejectCounter={rejectCounter}
        reviewOutcome={reviewOutcome}
        commsOpen={commsOpen}
        setCommsOpen={setCommsOpen}
        t={t}
      />
    </AppShellV2>
  );
};

/**
 * Purchase orders (P-02): the Summary view by default, the List view for
 * `?view=list` or any list parameter (`tab`, `po`, `focus`, …), so every link
 * written for the list still lands on it.
 * @type {React.FC}
 */
const BuyerOrders = () =>
  useOrdersView() === 'summary' ? <BuyerOrderSummary /> : <BuyerOrdersList />;

export default BuyerOrders;
