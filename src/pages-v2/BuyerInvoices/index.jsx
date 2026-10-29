/** @import React from 'react' */
/** @import { BuyerInvoice } from '@services/data/types' */
/** @import { TabKey, StatusFilter, PanelMode } from './const' */
import { useEffect, useMemo, useState } from 'react';
import { FileSpreadsheet, Database } from 'lucide-react';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import {
  OrderNotFound,
  PoFilterBanner,
  drilledPoNumber,
  usePoDrillFilter
} from '../orders/PoDrillFilter';
import { invoicePoNumbers, invoicesForPo } from '../orders/orderSummaryModel';
import { useGoodsReceipts, useBuyerInvoices } from '@services/query/hooks';
import SapDataAgeBanner from '@components/ui-v2/SapDataAgeBanner';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import ProvenanceMarker from '@components/ui-v2/ProvenanceMarker';
import BulkActionsBar from '@components/ui-v2/BulkActionsBar';
import SubTabs from '@components/ui-v2/SubTabs';
import FilterChipsBar from '@components/ui-v2/FilterChipsBar';
import SidePanel from '@components/ui-v2/SidePanel';
import { useToast } from '@hooks/useToast';
import { useUrlEnumParam } from '@hooks/useUrlEnumParam';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import EmptyState from '@components/ui-v2/EmptyState';
import { useTranslation } from 'react-i18next';
import { useRefusalText } from '@hooks/useRefusalText';
import { STATUS_FILTER_KEY } from './const';
import { useInvoiceSeat } from './hooks/useInvoiceSeat';
import { useInvoiceStats } from './hooks/useInvoiceStats';
import { useInvoiceCommands } from './hooks/useInvoiceCommands';
import InvoiceKpis from './components/InvoiceKpis';
import AttentionBanners from './components/AttentionBanners';
import InvoiceQueueTable from './components/InvoiceQueueTable';
import AnalyticsTab from './components/AnalyticsTab';
import AgingTab from './components/AgingTab';
import InvoicePanelFooter from './components/InvoicePanelFooter';
import InvoiceDetail from './components/InvoiceDetail';

// Phase 5 page split (no behaviour change): this file keeps the page shell —
// the query wrapper and its four honest states, every piece of page state (tab,
// status filter, selection, panel mode, dispute reason), the `?tab=` /
// `?status=` deep-link reads, the drill-through filter, the header actions and
// the status chips. The seat derivation lives in `useInvoiceSeat`, the figures
// in `useInvoiceStats`, the commands (release → settle, dispute, resolve, the
// footer dispatcher and the remittance toasts) in `useInvoiceCommands` — all
// called here, so their state lives as long as the page; each section lives in
// `components/`.

// Declared in the file that `.map()`s it: the module-scope-literal gate keys
// its grandfathered row on `file::CONST` (`grandfathered.js`).
/** @type {StatusFilter[]} */
const STATUS_OPTIONS = [
  'all',
  'Pending Match',
  'Approved',
  'Payment Released',
  'Disputed',
  'Overdue'
];

// The buyer invoice list re-derives from the ONE canonical store via the query
// layer (3.6 pattern) — NO local seeded copy, NO GR-post localStorage overlay
// (INV-SEED-01 retired; the GR-post → invoice-match auto-advance returns as a
// real cascade under INV-GR-OVERLAY-01, next batch). The selected invoice is
// tracked by id so a background refetch never strands a stale object.
/** @type {React.FC<{ invoices: BuyerInvoice[] }>} */
const BuyerInvoicesView = ({ invoices: allInvoices }) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const refusalText = useRefusalText();
  const crumb = [t('buyerInvoices.crumb.transact'), t('buyerInvoices.crumb.invoices')];
  const [tab, setTab] = useState(/** @type {TabKey} */ ('queue'));
  const [statusFilter, setStatusFilter] = useState(/** @type {StatusFilter} */ ('all'));
  // Deep-link read: `?tab=queue&status=Overdue` lands the "overdue supplier
  // invoices" task on the queue tab, filtered to overdue.
  useUrlEnumParam('tab', /** @type {TabKey[]} */ (['queue', 'analytics', 'aging']), setTab);
  useUrlEnumParam('status', STATUS_OPTIONS, setStatusFilter);
  const [selectedId, setSelectedId] = useState(/** @type {string | null} */ (null));
  // ── REQ-E07-03 · the drill-through filter ─────────────────────────────────
  // The receipts join is what makes "an invoice covering several POs appears
  // under each PO it covers" true in BOTH directions: the summary counts it on
  // every PO its lines touch, and this page lists it under each of them.
  const drill = usePoDrillFilter();
  const drilledPo = drilledPoNumber(drill);
  const receiptsQuery = useGoodsReceipts();
  const receipts = useMemo(() => receiptsQuery.data?.items ?? [], [receiptsQuery.data]);
  const invoices = useMemo(
    () => (drilledPo === null ? allInvoices : [...invoicesForPo(allInvoices, drilledPo, receipts)]),
    [allInvoices, drilledPo, receipts]
  );
  // AC-03 — exactly one record behind the cell arrives OPEN, not as a list of one.
  const onlyInvoiceId = drilledPo !== null && invoices.length === 1 ? invoices[0].id : null;
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- AC-03: a drill-down to one record opens it
    if (onlyInvoiceId !== null) setSelectedId(onlyInvoiceId);
  }, [onlyInvoiceId]);
  const [disputeReason, setDisputeReason] = useState('');
  const selected = useMemo(
    () => invoices.find((i) => i.id === selectedId) ?? null,
    [invoices, selectedId]
  );
  const { commitAction, nextAct, availabilityOfVerb, footerVerbId, commitAvailability } =
    useInvoiceSeat(selected);
  const [panelMode, setPanelMode] = useState(/** @type {PanelMode} */ ('detail'));
  const {
    releasePending,
    disputePending,
    resolvePending,
    settleWatch,
    handleFooterAction,
    handleReleasePayment,
    retrySettle,
    confirmDispute,
    sendRemittance,
    downloadPdf
  } = useInvoiceCommands({
    selected,
    setPanelMode,
    disputeReason,
    setDisputeReason,
    t,
    toast,
    refusalText
  });

  // Aging bucket display label — only the 'Current' token localizes; the numeric
  // ranges (1–30d …) are stable data used as chart X-axis keys + React keys.
  /** @param {string} bucket */
  const agingBucketLabel = (bucket) =>
    bucket === 'Current' ? t('buyerInvoices.aging.current') : bucket;

  const {
    counts,
    sums,
    pendingApprovalCount,
    matchCounts,
    overdueInvoices,
    disputedInvoices,
    lastUpdated
  } = useInvoiceStats(invoices);

  const filtered = useMemo(
    () => (statusFilter === 'all' ? invoices : invoices.filter((i) => i.status === statusFilter)),
    [invoices, statusFilter]
  );

  const closePanel = () => {
    setSelectedId(null);
    setPanelMode('detail');
    setDisputeReason('');
  };

  /** @param {BuyerInvoice} inv */
  const openInvoice = (inv) => {
    setSelectedId(inv.id);
    setPanelMode('detail');
  };

  const panelTitle = selected
    ? t('buyerInvoices.panel.title', { invoiceNumber: selected.invoiceNumber })
    : '';

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={crumb}
        title={t('buyerInvoices.header.title')}
        subtitle={t('buyerInvoices.header.subtitle')}
        actions={
          <BulkActionsBar
            actions={[
              {
                label: t('buyerInvoices.action.sapApExport'),
                icon: Database,
                onClick: () =>
                  toast({
                    title: t('buyerInvoices.toast.sapExport.title')
                  })
              },
              {
                label: t('buyerInvoices.action.exportReport'),
                icon: FileSpreadsheet,
                onClick: () =>
                  toast({
                    variant: 'info',
                    title: t('buyerInvoices.toast.agingReport.title')
                  })
              }
            ]}
          />
        }
      />

      <PageMetaLine className="-mt-6 mb-6">
        {t(
          invoices.length === 1
            ? 'buyerInvoices.meta.summary.one'
            : 'buyerInvoices.meta.summary.other',
          { count: invoices.length }
        )}{' '}
        {lastUpdated}
        {/* D-CENSUS-8 — PARTLY REAL, both axes. Dispute / Resolve / Release-payment /
            Settle all dispatch through the wired `invoice` target (the Option-B SAP
            boundary is simulated at `settle`, not faked earlier). Feed is fixture. */}
        <ProvenanceMarker capability="invoices" className="ml-3 align-middle" />
      </PageMetaLine>

      {/* REQ-E07-08 AC-03 — this page reads SAP data; say how old it is. */}
      <SapDataAgeBanner page="invoices" className="mb-4" />

      <InvoiceKpis sums={sums} counts={counts} pendingApprovalCount={pendingApprovalCount} t={t} />

      <AttentionBanners
        overdueInvoices={overdueInvoices}
        disputedInvoices={disputedInvoices}
        t={t}
      />

      {/* BR-04 / AC-02 — the filter, and the way back. */}
      <PoFilterBanner drill={drill} persona="buyer" count={invoices.length} />
      {drilledPo !== null && invoices.some((i) => invoicePoNumbers(i, receipts).length > 1) && (
        <p className="text-sm text-text-tertiary mb-4" data-testid="invoice-multi-po-note">
          {t('oc.drill.invoice.multiPo')}
        </p>
      )}

      <SubTabs
        options={[
          { id: 'queue', label: t('buyerInvoices.tab.queue') },
          { id: 'analytics', label: t('buyerInvoices.tab.analytics') },
          { id: 'aging', label: t('buyerInvoices.tab.aging') }
        ]}
        value={tab}
        onChange={setTab}
        className="mb-5"
      />

      {tab === 'queue' && (
        <>
          <div className="mb-4">
            <FilterChipsBar
              options={STATUS_OPTIONS.map((id) => ({
                id,
                label: t(STATUS_FILTER_KEY[id]),
                count: id === 'all' ? counts.all : invoices.filter((i) => i.status === id).length
              }))}
              value={statusFilter}
              onChange={setStatusFilter}
            />
          </div>

          <InvoiceQueueTable filtered={filtered} onOpen={openInvoice} t={t} />
        </>
      )}

      {tab === 'analytics' && <AnalyticsTab matchCounts={matchCounts} t={t} />}

      {tab === 'aging' && <AgingTab agingBucketLabel={agingBucketLabel} t={t} />}

      <SidePanel
        open={selected !== null}
        onClose={closePanel}
        title={panelTitle}
        footerActions={
          selected && (
            <InvoicePanelFooter
              selected={selected}
              panelMode={panelMode}
              setPanelMode={setPanelMode}
              closePanel={closePanel}
              availabilityOfVerb={availabilityOfVerb}
              settleWatch={settleWatch}
              retrySettle={retrySettle}
              footerVerbId={footerVerbId}
              commitAvailability={commitAvailability}
              commitAction={commitAction}
              releasePending={releasePending}
              disputePending={disputePending}
              resolvePending={resolvePending}
              handleFooterAction={handleFooterAction}
              handleReleasePayment={handleReleasePayment}
              confirmDispute={confirmDispute}
              setDisputeReason={setDisputeReason}
              sendRemittance={sendRemittance}
              t={t}
            />
          )
        }
      >
        {selected && (
          <InvoiceDetail
            selected={selected}
            panelMode={panelMode}
            nextAct={nextAct}
            disputeReason={disputeReason}
            setDisputeReason={setDisputeReason}
            downloadPdf={downloadPdf}
            t={t}
          />
        )}
      </SidePanel>
    </AppShellV2>
  );
};

// Query wrapper — resolves the scoped invoice list and renders the four honest
// states. The presentational view (which owns local mutable state seeded from
// the server list) only mounts once real data has resolved.
/** @type {React.FC} */
const BuyerInvoices = () => {
  const { t } = useTranslation();
  const crumb = [t('buyerInvoices.crumb.transact'), t('buyerInvoices.crumb.invoices')];
  const invoicesQuery = useBuyerInvoices();
  // AC-08 — refused at the page's own gate, beside the other three honest states.
  const drill = usePoDrillFilter();
  if (invoicesQuery.isPending || drill.kind === 'pending')
    return <LoadingState breadcrumb={crumb} />;
  if (drill.kind === 'notFound') return <OrderNotFound persona="buyer" breadcrumb={crumb} />;
  if (invoicesQuery.isError)
    return (
      <ErrorState
        breadcrumb={crumb}
        error={invoicesQuery.error}
        onRetry={() => invoicesQuery.refetch()}
      />
    );
  if (invoicesQuery.data.items.length === 0)
    return (
      <EmptyState
        breadcrumb={crumb}
        title={t('buyerInvoices.empty.title')}
        subtitle={t('buyerInvoices.empty.subtitle')}
      />
    );
  return <BuyerInvoicesView invoices={invoicesQuery.data.items} />;
};

export default BuyerInvoices;
