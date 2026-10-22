/** @import React from 'react' */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { OrderNotFound, PoFilterBanner, usePoDrillFilter } from '../orders/PoDrillFilter';
import OrdersViewSwitch, { useOrdersView } from '../orders/OrdersViewSwitch';
import SupplierOrderSummary from '../SupplierOrderSummary';
import { AlertCircle } from 'lucide-react';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import SapDataAgeBanner from '@components/ui-v2/SapDataAgeBanner';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import ProvenanceMarker from '@components/ui-v2/ProvenanceMarker';
import SubTabs from '@components/ui-v2/SubTabs';
import SidePanel from '@components/ui-v2/SidePanel';
import Data from '@components/ui-v2/Data';
import { useTranslation } from 'react-i18next';
import { useCurrentIdentity } from '@context/CurrentIdentityContext';
import { useVerbAvailability, useNextAct } from '@hooks/useVerbAvailability';
import { useUrlEnumParam } from '@hooks/useUrlEnumParam';
import { POStatus } from '@services/data/types';
import NoSupplierIdentity from '@components/ui-v2/NoSupplierIdentity';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import EmptyState from '@components/ui-v2/EmptyState';
import { useASNs, useCurrentSupplier, usePurchaseOrders } from '@services/query/hooks';
/** @import { PoRejectionCause, PurchaseOrder } from '@services/data/types' */
import { ordersNow } from '../orders/PoCollaboration';
import { useActiveReasonCodes, useReasonLabel } from '../admin/reasonCodeDisplay';
import { seedConfirmQty } from '../orders/poConfirmModel';
import { createAsnHref, useAsnWizardAvailability } from '../shipments/asnWizardEntry';
/** @import { AdjustDraft, PanelMode, TabKey } from './const' */
import { ACTION_STATUSES, COMPLETED_STATUSES, PROGRESS_STATUSES } from './const';
import { filterByTab, fmtDate, readPanelDrafts } from './utils';
import { usePoCommands } from './hooks/usePoCommands';
import OrdersKpis from './components/OrdersKpis';
import OrdersTable from './components/OrdersTable';
import PanelFooter from './components/PanelFooter';
import KeyFacts from './components/KeyFacts';
import LineItemsSection from './components/LineItemsSection';
import DeliveryNotesSection from './components/DeliveryNotesSection';
import AdjustForm from './components/AdjustForm';
import RejectForm from './components/RejectForm';
import DetailSections from './components/DetailSections';
import ConfirmedSummary from './components/ConfirmedSummary';

/**
 * The List view of Purchase orders: the PO worklist and its panel.
 * Owns the tab, the seat's verb answers, the queries and the panel state
 * (selection, mode and the answer drafts), which must survive the loading /
 * empty early returns; the drafts are read by `readPanelDrafts` and the
 * commands come from `usePoCommands`. Split into a page folder by Phase 5 (no
 * behaviour change).
 * @type {React.FC}
 */
const SupplierOrdersList = () => {
  const { t } = useTranslation();
  // BL-32 — the administrator's lists in force: only active codes are offered.
  const adjustReasons = useActiveReasonCodes('poAdjust');
  const rejectCauseCodes = useActiveReasonCodes('poReject');
  const reasonLabel = useReasonLabel();
  const ORDERS_CRUMB = [t('supplierOrders.crumb.transact'), t('supplierOrders.crumb.myOrders')];
  const { identity } = useCurrentIdentity();
  const { supplierId } = identity;
  const confirmAvailability = useVerbAvailability('po:confirm');
  // ⚠️ **ASKED SEPARATELY FROM `po:confirm`, AND §76 REQUIRES IT RATHER THAN
  // MERELY PERMITTING IT.** The two verbs are CO-REACHABLE on the same document:
  // `t_po_acknowledge` is legal from `Sent | Viewed` and `t_po_confirm` from
  // `Sent | Viewed | Acknowledged`, so a `Sent` PO offers both at once, in two
  // slots, in the same footer. One collapsed notice would name an owner for an
  // act the reader was not looking at — which is exactly the case §76 retired
  // the group notice for. Both atoms sit in `fulfilment` today, so the two
  // answers agree on every seat that exists; they are asked apart so the answer
  // stays right if the lanes ever split.
  const acknowledgeAvailability = useVerbAvailability('po:acknowledge');
  // The other two answers and the shipping notice — each asked of its own atom.
  const adjustAvailability = useVerbAvailability('po:adjust');
  const rejectAvailability = useVerbAvailability('po:reject');
  const shippingAvailability = useVerbAvailability('po:shipping-notice');
  // IA-S01 — "Create ASN" opens the Create-ASN wizard started for this PO, so
  // it asks the wizard's own pair of atoms (create and submit).
  const asnWizard = useAsnWizardAvailability();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(/** @type {TabKey} */ ('all'));
  // Deep-link read: `?tab=action` lands "purchase orders to respond to" on
  // the Action tab.
  useUrlEnumParam(
    'tab',
    /** @type {TabKey[]} */ (['all', 'action', 'progress', 'completed']),
    setActiveTab
  );
  const [selected, setSelected] = useState(/** @type {PurchaseOrder | null} */ (null));
  const [panelMode, setPanelMode] = useState(/** @type {PanelMode} */ ('detail'));
  // ⚠️ **THE MODE IS DERIVED, NOT READ, AND THAT IS WHAT MAKES THE GUARD COVER
  // EVERY ENTRANCE INSTEAD OF ONE.** `po:confirm` is FULFILMENT's. The commit
  // lives in `panelMode === 'editing'`, and that mode is component STATE reached
  // THREE ways, only one of which passed the notice below:
  //   · `startEditing` — behind the `detail`-footer notice (the guarded door);
  //   · `openOrderPanel(po, 'editing')` from the table's row action — the
  //     PRIMARY path, and it walked straight past it;
  //   · the adjust / reject footers' back-button, re-entering from inside.
  // A seat can also be NARROWED while the panel already stands open, which is
  // reachable rather than a dead branch — `SupplierShipments` states the same
  // reason for gating its wizard TAB rather than the button that opens it.
  //
  // Collapsing 'editing' to 'detail' when the verb is not held answers all four
  // in ONE statement, and it keeps §76's one-notice-per-verb intact: an unheld
  // seat lands on the notice that is ALREADY THERE rather than meeting a second
  // one. `adjusting` and `rejecting` (REQ-E07-02) get the same arm on their own
  // atoms (`po:adjust`, `po:reject`); `confirmed` is only reachable after a
  // successful dispatch, which requires the verb held.
  /** @type {PanelMode} */
  const effectivePanelMode =
    (panelMode === 'editing' && confirmAvailability.kind !== 'held') ||
    (panelMode === 'adjusting' && adjustAvailability.kind !== 'held') ||
    (panelMode === 'rejecting' && rejectAvailability.kind !== 'held')
      ? 'detail'
      : panelMode;
  // CP-0 · W1 · 2f-c — RAW-BACKED (string[]), the 2f-a state-shape lesson:
  // `number[]` had no representation for a cleared cell, so `Number('')`
  // fabricated a 0 into state and left the policy to bounce it after the fact.
  const [confirmedQtyRaws, setConfirmedQtyRaws] = useState(/** @type {string[]} */ ([]));
  const [deliveryDate, setDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [confirmedAt, setConfirmedAt] = useState(/** @type {string} */ (''));
  const [adjustDrafts, setAdjustDrafts] = useState(/** @type {Record<string, AdjustDraft>} */ ({}));
  const [rejectCauses, setRejectCauses] = useState(/** @type {PoRejectionCause[]} */ ([]));
  const [responseComment, setResponseComment] = useState('');
  const [completionDate, setCompletionDate] = useState('');

  // The reads of the drafts, and the commands that dispatch them. Pure reads,
  // above the early returns because the commands hook needs them.
  const {
    lineReads,
    qtysRead,
    lineBounds,
    allBoundsOk,
    allQtysOk,
    adjustLines,
    adjustReady,
    totalConfirmedQty,
    hasQtyChange,
    hasDateChange
  } = readPanelDrafts(selected, confirmedQtyRaws, adjustDrafts, deliveryDate);
  const {
    confirmMutation,
    acknowledgeMutation,
    adjustMutation,
    rejectMutation,
    shippingMutation,
    confirmOrder,
    submitAdjust,
    submitReject,
    saveCompletionDate,
    acknowledgeOrder
  } = usePoCommands({
    selected,
    qtysRead,
    allBoundsOk,
    deliveryDate,
    notes,
    setConfirmedAt,
    setPanelMode,
    adjustLines,
    adjustReady,
    responseComment,
    rejectCauses,
    completionDate
  });

  const supplierQuery = useCurrentSupplier();
  const posQuery = usePurchaseOrders();
  const asnsQuery = useASNs();
  const nowIso = ordersNow();

  const mySupplier = supplierQuery.data ?? null;

  const MY_POS = useMemo(
    () => [...(posQuery.data?.items ?? [])].sort((a, b) => b.orderDate.localeCompare(a.orderDate)),
    [posQuery.data]
  );

  const counts = useMemo(
    () => ({
      all: MY_POS.length,
      action: MY_POS.filter((p) => ACTION_STATUSES.includes(p.status)).length,
      progress: MY_POS.filter((p) => PROGRESS_STATUSES.includes(p.status)).length,
      completed: MY_POS.filter((p) => COMPLETED_STATUSES.includes(p.status)).length
    }),
    [MY_POS]
  );

  const totalValuePending = useMemo(
    () =>
      MY_POS.filter((p) => !COMPLETED_STATUSES.includes(p.status)).reduce(
        (s, p) => s + p.totalValue,
        0
      ),
    [MY_POS]
  );

  const displayPOs = useMemo(() => filterByTab(activeTab, MY_POS), [activeTab, MY_POS]);

  const maxOrderDate = useMemo(
    () => MY_POS.reduce((a, p) => (p.orderDate > a ? p.orderDate : a), MY_POS[0]?.orderDate ?? ''),
    [MY_POS]
  );

  // WHO ACTS NEXT — read from the LIVE row for the same reason Key Facts is: a
  // line derived from the open-time snapshot would keep naming yesterday's
  // waiter after a confirm lands.
  //
  // ⚠️ **ABOVE EVERY EARLY RETURN, AND THAT PLACEMENT IS THE WHOLE OF IT.** This
  // component returns early five times (no identity, pending, error, no
  // supplier, empty), so a hook below them runs on some renders and not others —
  // "Rendered more hooks than during the previous render", which is how this was
  // caught. `selectedLive` is computed after those returns and cannot move; the
  // STATE STRING is all the hook needs, so it is derived here instead.
  const liveStatus = selected
    ? (MY_POS.find((p) => p.id === selected.id) ?? selected).status
    : undefined;
  const nextAct = useNextAct('purchaseOrder', liveStatus);

  // A link from the order summary opens that PO (`?po=<id>`). Above the early
  // returns for the same reason as the hook above.
  const linkedPoId = searchParams.get('po');
  // REQ-E07-03 — the drill-through filter. A supplier addressing another
  // supplier's PO lands in `notFound`: the PO read never returned it (BR-06).
  const drill = usePoDrillFilter();
  // IA F-3 — the panel follows the address: a new `?po=` opens that PO even
  // while another is open. Only a CHANGE of the parameter acts, so a refetch
  // never pulls the panel back from a PO the supplier picked in the table.
  const appliedPoId = useRef(/** @type {string | null} */ (null));
  useEffect(() => {
    if (!linkedPoId) {
      appliedPoId.current = null;
      return;
    }
    if (appliedPoId.current === linkedPoId) return;
    const po = MY_POS.find((p) => p.id === linkedPoId);
    if (po) {
      appliedPoId.current = linkedPoId;
      openOrderPanel(po, 'detail');
    }
  }, [linkedPoId, MY_POS]);

  if (!supplierId) return <NoSupplierIdentity />;
  if (supplierQuery.isPending || posQuery.isPending)
    return <LoadingState breadcrumb={ORDERS_CRUMB} />;
  if (supplierQuery.isError || posQuery.isError)
    return (
      <ErrorState
        breadcrumb={ORDERS_CRUMB}
        error={supplierQuery.error ?? posQuery.error}
        onRetry={() => {
          supplierQuery.refetch();
          posQuery.refetch();
        }}
      />
    );
  if (!mySupplier) return <NoSupplierIdentity />;
  // AC-07 / AC-08 — not found, identically, for an unknown PO and for one that
  // belongs to another supplier.
  if (drill.kind === 'pending') return <LoadingState breadcrumb={ORDERS_CRUMB} />;
  if (drill.kind === 'notFound')
    return <OrderNotFound persona="supplier" breadcrumb={ORDERS_CRUMB} />;
  if (MY_POS.length === 0)
    return (
      <EmptyState
        breadcrumb={ORDERS_CRUMB}
        title={t('supplierOrders.empty.title')}
        subtitle={t('supplierOrders.empty.subtitle', { supplier: mySupplier.name })}
        message={t('supplierOrders.empty.message')}
      />
    );

  // Riding fix: the drawer reads a LIVE PO from the invalidated query (not the
  // frozen open-time snapshot), so Key Facts reflects a post-command status —
  // same class as the KPI staleness. Falls back to the snapshot if the row left
  // the current view.
  const selectedLive = selected ? (MY_POS.find((p) => p.id === selected.id) ?? selected) : null;

  // A hoisted declaration, so the `?po=` effect above the early returns can call it.
  /**
   * @param {PurchaseOrder} po
   * @param {PanelMode} [mode]
   */
  function openOrderPanel(po, mode = 'detail') {
    setSelected(po);
    // Seeded CANONICAL (ungrouped) — these orders run to 150,000+ units, so a
    // display-formatter seed would open every line refusing its own default.
    setConfirmedQtyRaws(po.lineItems.map((li) => seedConfirmQty(li.quantity)));
    setDeliveryDate(po.requestedDeliveryDate);
    setNotes('');
    setConfirmedAt('');
    setAdjustDrafts(
      Object.fromEntries(
        po.lineItems.map((li) => [
          li.id,
          {
            on: false,
            reasonCode: '',
            note: '',
            qty: seedConfirmQty(li.quantity),
            date: po.requestedDeliveryDate
          }
        ])
      )
    );
    setRejectCauses([]);
    setResponseComment('');
    setCompletionDate(po.shippingNotice?.expectedCompletionDate ?? '');
    setPanelMode(mode);
  }

  const closePanel = () => {
    setSelected(null);
    setPanelMode('detail');
  };

  const startEditing = () => setPanelMode('editing');

  /**
   * @param {string} lineId
   * @param {Partial<AdjustDraft>} patch
   */
  const updateDraft = (lineId, patch) =>
    setAdjustDrafts((prev) => ({ ...prev, [lineId]: { ...prev[lineId], ...patch } }));

  /**
   * IA-S01 — open the Create-ASN wizard on Shipments & ASN, started for this
   * PO, with the way back to it.
   * @param {PurchaseOrder} po
   */
  const openAsnWizard = (po) => navigate(createAsnHref({ poId: po.id, fromPo: true }));

  const goToASN = () => {
    if (!selected) return;
    openAsnWizard(selected);
  };

  /**
   * @param {PurchaseOrder} po
   * @param {React.MouseEvent} e
   */
  const handleRowAction = (po, e) => {
    e.stopPropagation();
    if (ACTION_STATUSES.includes(po.status)) {
      openOrderPanel(po, 'editing');
    } else if (po.status === POStatus.CONFIRMED && asnWizard.held) {
      openAsnWizard(po);
    } else {
      openOrderPanel(po, 'detail');
    }
  };

  const panelTitle = selected
    ? t('supplierOrders.panel.title', { poNumber: selected.poNumber })
    : '';
  // ⚠️ **THE LABEL IS SEAT-DERIVED, BECAUSE THE ACT BEHIND IT ALREADY WAS.**
  // §84 made the ACT honest — `effectivePanelMode` collapses `editing` to
  // `detail` for a seat that does not hold `po:confirm`, so pressing this on an
  // actionable PO opens the order and renders the handoff notice. It did NOT
  // make the LABEL honest: the button still read "Confirm" / "Konfirmasi" and
  // still wore `outline`, DP-2's primary-action register. A control that says
  // Confirm and cannot confirm is the label-names-the-wrong-verb class, and a
  // handler-based census is blind to it — the handler is correct.
  //
  // ⚠️ **NO SECOND CONTROL AND NO SECOND NOTICE (§76 INTACT).** The unheld seat
  // falls back to `view`, a label this page already ships in both locales, which
  // names exactly what pressing it now does. The notice it lands on is the one
  // ALREADY THERE in the detail footer. `confirmAvailability` is seat-level, not
  // per-row, so this costs no per-row derivation.
  //
  // `createAsn` follows the same rule (IA-S01): it opens the Create-ASN wizard,
  // so a seat without `asn:create` and `asn:submit` reads View, and the row
  // opens the order, whose footer states the wait.
  const canConfirmHere = confirmAvailability.kind === 'held';

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={ORDERS_CRUMB}
        title={t('supplierOrders.header.title')}
        subtitle={t('supplierOrders.header.subtitle', { supplier: mySupplier.name })}
      />

      <PageMetaLine className="-mt-6 mb-6">
        {MY_POS.length === 1
          ? t('supplierOrders.meta.orders.one', { count: MY_POS.length })
          : t('supplierOrders.meta.orders.other', { count: MY_POS.length })}{' '}
        · {t('supplierOrders.meta.lastUpdated')} <Data>{fmtDate(maxOrderDate)}</Data>
        {/* D-CENSUS-8 — PARTLY REAL, both axes. This is the clearest case the census
            named: Confirm/Reject here genuinely dispatch through the wired
            `purchaseOrder` target, run the legality + role + field gates and write
            the DR-10 trail. A flat "Sample" would teach the reader to discount a
            true signal; a green "Live" would claim the orders are real. Both. */}
        <ProvenanceMarker capability="purchaseOrders" className="ml-3 align-middle" />
      </PageMetaLine>

      <OrdersViewSwitch persona="supplier" view="list" />

      {/* REQ-E07-08 AC-03 — this page reads SAP data; say how old it is. */}
      <SapDataAgeBanner page="purchaseOrders" className="mb-4" />

      {/* REQ-E07-03 BR-04 — which PO this was filtered by, and the way back. */}
      <PoFilterBanner drill={drill} persona="supplier" count={1} />

      <OrdersKpis counts={counts} totalValuePending={totalValuePending} t={t} />

      <SubTabs
        options={[
          { id: 'all', label: t('supplierOrders.tab.all'), count: counts.all },
          { id: 'action', label: t('supplierOrders.tab.action'), count: counts.action },
          { id: 'progress', label: t('supplierOrders.tab.progress'), count: counts.progress },
          { id: 'completed', label: t('supplierOrders.tab.completed'), count: counts.completed }
        ]}
        value={activeTab}
        onChange={setActiveTab}
        className="mb-5"
      />

      {counts.action > 0 && activeTab !== 'completed' && (
        <div className="bg-warning-soft border-l-2 border-warning rounded px-4 py-3 mb-4 flex items-start gap-2 text-sm text-warning-hover">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <div>
            <strong>
              {counts.action === 1
                ? t('supplierOrders.banner.needConfirmation.one', {
                    count: counts.action
                  })
                : t('supplierOrders.banner.needConfirmation.other', {
                    count: counts.action
                  })}{' '}
            </strong>
            {t('supplierOrders.banner.instruction')}
          </div>
        </div>
      )}

      <OrdersTable
        displayPOs={displayPOs}
        nowIso={nowIso}
        canConfirmHere={canConfirmHere}
        asnWizard={asnWizard}
        openOrderPanel={openOrderPanel}
        handleRowAction={handleRowAction}
        t={t}
      />

      <SidePanel
        open={selected !== null}
        onClose={closePanel}
        title={panelTitle}
        footerActions={
          selected && (
            <PanelFooter
              selected={selected}
              selectedLive={selectedLive}
              effectivePanelMode={effectivePanelMode}
              closePanel={closePanel}
              startEditing={startEditing}
              setPanelMode={setPanelMode}
              acknowledgeAvailability={acknowledgeAvailability}
              confirmAvailability={confirmAvailability}
              adjustAvailability={adjustAvailability}
              rejectAvailability={rejectAvailability}
              asnWizard={asnWizard}
              acknowledgeMutation={acknowledgeMutation}
              confirmMutation={confirmMutation}
              adjustMutation={adjustMutation}
              rejectMutation={rejectMutation}
              acknowledgeOrder={acknowledgeOrder}
              confirmOrder={confirmOrder}
              submitAdjust={submitAdjust}
              submitReject={submitReject}
              goToASN={goToASN}
              allQtysOk={allQtysOk}
              adjustReady={adjustReady}
              rejectCauses={rejectCauses}
              t={t}
            />
          )
        }
      >
        {selected && (
          <div className="space-y-6">
            <KeyFacts
              selected={selected}
              selectedLive={selectedLive}
              nowIso={nowIso}
              nextAct={nextAct}
              t={t}
            />

            <LineItemsSection
              selected={selected}
              effectivePanelMode={effectivePanelMode}
              confirmedQtyRaws={confirmedQtyRaws}
              setConfirmedQtyRaws={setConfirmedQtyRaws}
              lineReads={lineReads}
              lineBounds={lineBounds}
              t={t}
            />

            {effectivePanelMode === 'editing' && (
              <DeliveryNotesSection
                deliveryDate={deliveryDate}
                setDeliveryDate={setDeliveryDate}
                notes={notes}
                setNotes={setNotes}
                hasQtyChange={hasQtyChange}
                hasDateChange={hasDateChange}
                t={t}
              />
            )}

            {effectivePanelMode === 'adjusting' && (
              <AdjustForm
                selected={selected}
                adjustDrafts={adjustDrafts}
                adjustLines={adjustLines}
                updateDraft={updateDraft}
                adjustReasons={adjustReasons}
                reasonLabel={reasonLabel}
                responseComment={responseComment}
                setResponseComment={setResponseComment}
                t={t}
              />
            )}

            {effectivePanelMode === 'rejecting' && (
              <RejectForm
                rejectCauseCodes={rejectCauseCodes}
                rejectCauses={rejectCauses}
                setRejectCauses={setRejectCauses}
                reasonLabel={reasonLabel}
                responseComment={responseComment}
                setResponseComment={setResponseComment}
                t={t}
              />
            )}

            {effectivePanelMode === 'detail' && (
              <DetailSections
                selected={selected}
                selectedLive={selectedLive}
                shippingAvailability={shippingAvailability}
                completionDate={completionDate}
                setCompletionDate={setCompletionDate}
                saveCompletionDate={saveCompletionDate}
                shippingMutation={shippingMutation}
                asns={asnsQuery.data?.items ?? []}
                t={t}
              />
            )}

            {effectivePanelMode === 'confirmed' && (
              <ConfirmedSummary
                selected={selected}
                confirmedAt={confirmedAt}
                deliveryDate={deliveryDate}
                totalConfirmedQty={totalConfirmedQty}
                notes={notes}
                t={t}
              />
            )}
          </div>
        )}
      </SidePanel>
    </AppShellV2>
  );
};

/**
 * Purchase orders (P-02): the Summary view by default, the List view for
 * `?view=list` or any list parameter (`tab`, `po`, `focus`, …), so every link
 * written for the list still lands on it.
 * @type {React.FC}
 */
const SupplierOrders = () =>
  useOrdersView() === 'summary' ? <SupplierOrderSummary /> : <SupplierOrdersList />;

export default SupplierOrders;
