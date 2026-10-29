/** @import React from 'react' */
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useModeLabel } from '@hooks/useModeLabel';
import { FileSpreadsheet, Plus } from 'lucide-react';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import {
  OrderNotFound,
  PoFilterBanner,
  drilledPoNumber,
  usePoDrillFilter
} from '../orders/PoDrillFilter';
import { asnsForPo } from '../orders/orderSummaryModel';
import { pendingAsns } from '../widgets/buyerDerivations';
import { useASNs } from '@services/query/hooks';
import { useCallOffViews } from '../callOffs/callOffDisplay';
import { asnCallOffWarnings } from '@services/transitions/callOffRules';
import { isActiveAsn } from '@services/transitions/fulfilmentRules';
import AsnShelfLifeExceptions from '../shipments/AsnShelfLifeExceptions';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import ProvenanceMarker from '@components/ui-v2/ProvenanceMarker';
import BulkActionsBar from '@components/ui-v2/BulkActionsBar';
import SubTabs from '@components/ui-v2/SubTabs';
import { useNextAct } from '@hooks/useVerbAvailability';
import { useToast } from '@hooks/useToast';
/** @import { Shipment, ShipmentStatus, ShipmentMode } from '@data/mockShipments' */
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import EmptyState from '@components/ui-v2/EmptyState';
import { useShipments, useSuppliers } from '@services/query/hooks';
/** @import { ShipmentDisplayState } from '@services/data/shipmentDisplayState' */
import { shipmentDisplayState } from '@services/data/shipmentDisplayState';
/** @import { GroupTab } from './const' */
import { AT_DOCK_STATUSES, IN_TRANSIT_STATUSES, PENDING_STATUSES, TODAY } from './const';
import { formatDate, isToday, matchesGroup } from './utils';
import { footerForStatus } from './components/footerForStatus';
import DrilledAsnSection from './components/DrilledAsnSection';
import ShipmentPanel from './components/ShipmentPanel';
import ShipmentsKpis from './components/ShipmentsKpis';
import ShipmentsTable from './components/ShipmentsTable';
import ShipmentsToolbar from './components/ShipmentsToolbar';

// The buyer's view of inbound shipments ("Shipments & ASN"). Split into a page
// folder by the Phase 5 page split (no behaviour change): constants in
// `const.js`, pure helpers and the timeline in `utils.js`, one section per file
// in `components/`. Every piece of state stays here, above the loading / empty
// early returns, so none of it resets when a section unmounts.

/** @type {React.FC} */
const BuyerShipments = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const ml = useModeLabel();
  const { toast } = useToast();
  // Breadcrumb is built from t() inside the component (mirrors BuyerDiscovery).
  const SHIPMENTS_CRUMB = [t('shipments.crumb.transact'), t('shipments.crumb.shipments')];
  const shipmentsQuery = useShipments();
  const suppliersQuery = useSuppliers();
  // ── REQ-E07-03 · the ASN half of "Shipments & ASN" ────────────────────────
  // ⚠️ **THE SUMMARY'S ASN COUNT IS A COUNT OF *ASNs*, SO THIS PAGE HAS TO SHOW
  // ASNs FOR AC-10 TO MEAN ANYTHING.** This page's own list is the SHIPMENT
  // family (`useShipments`), which is a different population from the supplier's
  // ASN records (`useASNs`) — and the summary counts the latter, because that is
  // the family whose `Cancelled` state BR-09 speaks about. Rather than make the
  // count agree by changing what it counts, the destination gains the ASN list
  // it was always named for, filtered by the SAME predicate the summary counted
  // with (`asnsForPo`). Both halves are then filtered to the PO.
  const asnsQuery = useASNs();
  // MR-6 BR-12 (edge case 6) — the planner's "Mismatch" marker is the CURRENT
  // comparison with the call-off, recomputed on read, never the stored copy.
  const { views: callOffViewList } = useCallOffViews();
  const asnByNumber = useMemo(() => {
    const all = asnsQuery.data?.items ?? [];
    return new Map(
      all.map((a) => [
        a.asnNumber,
        { asn: a, warnings: isActiveAsn(a) ? asnCallOffWarnings(a, callOffViewList, all) : [] }
      ])
    );
  }, [asnsQuery.data, callOffViewList]);
  const drill = usePoDrillFilter();
  const shipments = useMemo(() => shipmentsQuery.data?.items ?? [], [shipmentsQuery.data]);
  const supplierById = useMemo(
    () => new Map((suppliersQuery.data?.items ?? []).map((s) => [s.id, s])),
    [suppliersQuery.data]
  );
  const [tab, setTab] = useState(/** @type {GroupTab} */ ('all'));
  const [search, setSearch] = useState('');
  const [selectedModes, setSelectedModes] = useState(/** @type {ShipmentMode[]} */ ([]));
  const [selectedId, setSelectedId] = useState(/** @type {string | null} */ (null));

  // ⚠️ ONE CLASSIFICATION, CAPTURED ONCE, HANDED TO EVERY SITE. `TODAY` is
  // `DECLARED_PRESENT`, so this page renders identically at horizons nine
  // hundred days apart — asserted, not assumed. A second `shipmentDisplayState`
  // call with a different instant would be a second clock on one page, which is
  // the defect `GRInspectionWizard`'s `inspectionInstant` note names.
  const displayOf = useMemo(() => {
    const m = /** @type {Map<string, ShipmentDisplayState>} */ (new Map());
    for (const s of shipments) m.set(s.id, shipmentDisplayState(s, TODAY));
    return /** @param {Shipment} s @returns {ShipmentDisplayState} */ (s) =>
      m.get(s.id) ?? s.status;
  }, [shipments]);

  const counts = useMemo(() => {
    let pending = 0;
    let transit = 0;
    let dock = 0;
    let delivered = 0;
    let delayed = 0;
    for (const s of shipments) {
      const d = displayOf(s);
      if (PENDING_STATUSES.includes(/** @type {ShipmentStatus} */ (d))) pending++;
      if (IN_TRANSIT_STATUSES.includes(/** @type {ShipmentStatus} */ (d))) transit++;
      if (AT_DOCK_STATUSES.includes(/** @type {ShipmentStatus} */ (d))) dock++;
      if (d === 'Delivered') delivered++;
      if (d === 'Delayed') delayed++;
    }
    return {
      all: shipments.length,
      pending,
      transit,
      dock,
      delivered,
      delayed
    };
  }, [shipments, displayOf]);

  const arrivingToday = useMemo(
    () => shipments.filter((s) => isToday(s.estimatedArrival)).length,
    [shipments]
  );

  const drilledPo = drilledPoNumber(drill);
  const filtered = useMemo(() => {
    return shipments.filter((s) => {
      if (drilledPo !== null && s.poNumber !== drilledPo) return false;
      if (!matchesGroup(displayOf(s), tab)) return false;
      if (selectedModes.length > 0 && !selectedModes.includes(s.mode)) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !s.asnNumber.toLowerCase().includes(q) &&
          !s.poNumber.toLowerCase().includes(q) &&
          !s.supplierName.toLowerCase().includes(q) &&
          !s.trackingNumber.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [shipments, tab, selectedModes, search, drilledPo]);

  // IA P-08 — Home's "Inbound shipments to receive" counts ASNs, not shipment
  // rows, so `?asns=toReceive` lists exactly those ASNs (the same predicate,
  // `pendingAsns`). One ASN arrives open, as a drilled PO's single ASN does.
  const [linkParams] = useSearchParams();
  const asnsToReceive = useMemo(
    () =>
      linkParams.get('asns') === 'toReceive' ? pendingAsns(asnsQuery.data?.items ?? []) : null,
    [linkParams, asnsQuery.data]
  );

  /** The PO's ASNs — the records the summary's ASN cell counted (BR-09). */
  const drilledAsns = useMemo(
    () => (drilledPo === null ? [] : asnsForPo(asnsQuery.data?.items ?? [], drilledPo)),
    [asnsQuery.data, drilledPo]
  );

  /** @param {ShipmentMode} m */
  const toggleMode = (m) => {
    setSelectedModes((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  };

  const selected = selectedId ? (shipments.find((s) => s.id === selectedId) ?? null) : null;
  const selectedSupplier = selected ? supplierById.get(selected.supplierId) : undefined;

  // WHO ACTS NEXT (S2a) — asked of the STORED state, deliberately, because it
  // is a question about the MACHINE and `Delayed` is not a state the machine
  // has. Handing it `displayOf(selected)` would re-create the defect below.
  //
  // ⚠️ **THE COMMENT THAT STOOD HERE IS RETIRED, AND ITS SECOND SENTENCE WAS
  // FALSE.** It read: *"a delayed shipment resolves `silent` and this line
  // renders nothing for it. That silence is honest — the machine has no edge to
  // report — and its LEGIBILITY is the measurement this batch reports rather
  // than repairs."* Derived over every state:
  //
  //     nextActFor('shipment', 'Delayed')           -> silent / no-exit
  //     nextActFor('shipment', 'Customs Clearance') -> external, owners:['tms']
  //
  // The machine HAD an edge; it could not be asked, because the cursor held a
  // display literal. `shp-018` now stores `Customs Clearance` and this line
  // reports that the TMS owns its next move — **a line that did not render
  // before, and the one rendered change this batch makes on purpose.**
  const nextAct = useNextAct('shipment', selected?.status);

  const handleExport = () =>
    toast({
      variant: 'info',
      title: t('shipments.toast.export.title'),
      description: t('shipments.toast.export.desc')
    });

  const handleManualASN = () =>
    toast({
      variant: 'info',
      title: t('shipments.toast.manualAsn.title'),
      description: t('shipments.toast.manualAsn.desc')
    });

  if (shipmentsQuery.isPending || suppliersQuery.isPending)
    return <LoadingState breadcrumb={SHIPMENTS_CRUMB} />;
  if (shipmentsQuery.isError || suppliersQuery.isError)
    return (
      <ErrorState
        breadcrumb={SHIPMENTS_CRUMB}
        error={shipmentsQuery.error ?? suppliersQuery.error}
        onRetry={() => {
          shipmentsQuery.refetch();
          suppliersQuery.refetch();
        }}
      />
    );
  if (drill.kind === 'pending') return <LoadingState breadcrumb={SHIPMENTS_CRUMB} />;
  if (drill.kind === 'notFound')
    return <OrderNotFound persona="buyer" breadcrumb={SHIPMENTS_CRUMB} />;
  if (shipments.length === 0)
    return (
      <EmptyState
        breadcrumb={SHIPMENTS_CRUMB}
        title={t('shipments.empty.title')}
        subtitle={t('shipments.empty.subtitle')}
        message={t('shipments.empty.message')}
      />
    );

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={SHIPMENTS_CRUMB}
        title={t('shipments.header.title')}
        subtitle={t('shipments.header.subtitle')}
        actions={
          <BulkActionsBar
            actions={[
              {
                label: t('shipments.action.export'),
                icon: FileSpreadsheet,
                onClick: handleExport
              }
            ]}
            primary={{
              label: t('shipments.action.manualAsn'),
              icon: Plus,
              onClick: handleManualASN
            }}
          />
        }
      />

      <PageMetaLine className="mb-6">
        {counts.all === 1
          ? t('shipments.meta.summary.one', {
              count: counts.all,
              date: formatDate(TODAY)
            })
          : t('shipments.meta.summary.other', {
              count: counts.all,
              date: formatDate(TODAY)
            })}
        {/* D-CENSUS-8 — `shipments` is null-backed: the in-transit / at-dock view is
            a frozen fixture with no logistics feed behind it. This page's toasts
            claimed "Reminder sent" and "Carrier alerted" over zero write capability;
            those are retracted in this batch. */}
        <ProvenanceMarker capability="shipments" className="ml-3 align-middle" />
      </PageMetaLine>

      <ShipmentsKpis counts={counts} arrivingToday={arrivingToday} t={t} />

      {/* MR-6 d "Approver" — ASNs awaiting Quality's shelf-life decision. */}
      <div className="mb-6">
        <AsnShelfLifeExceptions asns={asnsQuery.data?.items ?? []} />
      </div>

      {/* BR-04 / AC-02 — the filter is visible, and the way back is offered. */}
      <PoFilterBanner drill={drill} persona="buyer" count={drilledAsns.length} />

      {drill.kind === 'filtered' && (
        <DrilledAsnSection drilledAsns={drilledAsns} asnByNumber={asnByNumber} t={t} />
      )}

      {asnsToReceive !== null && (
        <DrilledAsnSection
          drilledAsns={asnsToReceive}
          asnByNumber={asnByNumber}
          t={t}
          title={t('shipments.toReceive.title')}
          emptyText={t('shipments.toReceive.empty')}
          testId="asns-to-receive"
        />
      )}

      <SubTabs
        options={[
          { id: 'all', label: t('shipments.tab.all'), count: counts.all },
          { id: 'pending', label: t('shipments.tab.pending'), count: counts.pending },
          { id: 'in-transit', label: t('shipments.tab.inTransit'), count: counts.transit },
          { id: 'at-dock', label: t('shipments.tab.atDock'), count: counts.dock },
          { id: 'delivered', label: t('shipments.tab.delivered'), count: counts.delivered },
          { id: 'delayed', label: t('shipments.tab.delayed'), count: counts.delayed }
        ]}
        value={tab}
        onChange={setTab}
        className="mb-6"
      />

      <ShipmentsToolbar
        search={search}
        onSearchChange={setSearch}
        selectedModes={selectedModes}
        onToggleMode={toggleMode}
        ml={ml}
        t={t}
      />

      <ShipmentsTable
        filtered={filtered}
        supplierById={supplierById}
        asnByNumber={asnByNumber}
        displayOf={displayOf}
        onSelect={setSelectedId}
        ml={ml}
        t={t}
      />

      <ShipmentPanel
        selected={selected}
        selectedSupplier={selectedSupplier}
        asns={asnsQuery.data?.items ?? []}
        nextAct={nextAct}
        footerActions={
          selected ? footerForStatus(selected, { t, toast, navigate, displayOf }) : null
        }
        onClose={() => setSelectedId(null)}
        displayOf={displayOf}
        ml={ml}
        t={t}
      />
    </AppShellV2>
  );
};

export default BuyerShipments;
