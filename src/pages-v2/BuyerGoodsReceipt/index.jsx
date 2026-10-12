/** @import React from 'react' */
import { useEffect, useMemo, useState } from 'react';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import { OrderNotFound, PoFilterBanner, usePoDrillFilter } from '../orders/PoDrillFilter';
import SapDataAgeBanner from '@components/ui-v2/SapDataAgeBanner';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import ProvenanceMarker from '@components/ui-v2/ProvenanceMarker';
import ReceiptDisputesSection from '../receipts/ReceiptDisputesSection';
import { compareReceipt } from '@services/transitions/fulfilmentRules';
import Data from '@components/ui-v2/Data';
/** @import { FailedSettle } from '@components/v2-features/GRInspectionWizard' */
import GRInspectionWizard from '@components/v2-features/GRInspectionWizard';
import { useToast } from '@hooks/useToast';
import { useTranslation } from 'react-i18next';
import { useEnumLabel } from '@hooks/useEnumLabel';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import EmptyState from '@components/ui-v2/EmptyState';
import { useVerbAvailabilities, useVerbAvailability, useNextAct } from '@hooks/useVerbAvailability';
import {
  useGoodsReceipts,
  useSuppliers,
  useShipments,
  useASNs,
  useEnforcementSettings,
  useComplianceRegistry
} from '@services/query/hooks';
/** @import { EnforcementSetting } from '@lib/enforcement' */
/** @import { GoodsReceipt, Supplier, Shipment, ASN, ComplianceRegistryEntry } from '@services/data/types' */
/** @import { DateFilter, GroupTab } from './const' */
import { TODAY } from './const';
import { formatDate } from './utils';
import { useGoodsReceiptCommands } from './hooks/useGoodsReceiptCommands';
import { useGoodsReceiptList } from './hooks/useGoodsReceiptList';
import { footerForStatus } from './components/footerForStatus';
import GoodsReceiptHeader from './components/GoodsReceiptHeader';
import GoodsReceiptKpis from './components/GoodsReceiptKpis';
import DiscrepancySection from './components/DiscrepancySection';
import GoodsReceiptFilters from './components/GoodsReceiptFilters';
import GoodsReceiptTable from './components/GoodsReceiptTable';
import GoodsReceiptPanel from './components/GoodsReceiptPanel';

// ────────────────────────────────────────────────────────────────────────────
// BuyerGoodsReceipt — the buyer's goods-receipt (QC command-center) page.
//
// Split into a folder by the Phase 5 page split (PAGE-SPLIT-GUIDE; no
// behaviour change). This file keeps the page wrapper (the four honest states)
// and the workspace that owns the list state and renders `<AppShellV2>`; the
// commands and their toasts sit in `hooks/useGoodsReceiptCommands.js`, the list
// derivations in `hooks/useGoodsReceiptList.js`, each section in `components/`.
// ────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {object} GoodsReceiptWorkspaceProps
 * @property {GoodsReceipt[]} goodsReceipts
 * @property {Supplier[]} suppliers
 * @property {Shipment[]} shipments
 * @property {ASN[]} asns
 * @property {readonly EnforcementSetting[]} enforcementSettings -  The append-only enforcement ledger (CP-3 · E4) — passed to the inspection
 *    wizard, which derives the mode in force with its own instant. Read here
 *    rather than in the wizard so the read shares the page's four honest states:
 *    the wizard never mounts against a pending or failed ledger.
 * @property {readonly ComplianceRegistryEntry[]} complianceRegistry -  The compliance registry (I3.1) — the certificate side of the halal
 *    three-fact split, passed to the wizard for the H4 NOTICE. Read here for the
 *    same reason as the ledger above: the wizard never mounts against a pending
 *    or failed read, so a notice can never be absent because a fetch was in
 *    flight. **A NOTICE THAT SOMETIMES DOES NOT RENDER IS WORSE THAN NONE** —
 *    it teaches a clerk that no banner means no problem.
 */

/** @type {React.FC<GoodsReceiptWorkspaceProps>} */
const GoodsReceiptWorkspace = ({
  goodsReceipts,
  suppliers,
  shipments,
  asns,
  enforcementSettings,
  complianceRegistry
}) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const el = useEnumLabel();
  const commands = useGoodsReceiptCommands();
  const supplierById = useMemo(() => new Map(suppliers.map((s) => [s.id, s])), [suppliers]);
  const [tab, setTab] = useState(/** @type {GroupTab} */ ('all'));
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState(/** @type {DateFilter} */ ('all'));
  const [selectedId, setSelectedId] = useState(/** @type {string | null} */ (null));
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardAsnId, setWizardAsnId] = useState(/** @type {string | undefined} */ (undefined));

  // §73 — THE SEAT'S AUTHORITY OVER THE WHOLE GR CHAIN, NOT OVER ITS FIRST
  // VERB. One click at the wizard's end fires `t_gr_create` ->
  // `t_gr_start_inspection` -> `t_gr_post`; a seat missing ANY of the three
  // cannot complete what the button starts, so the button is withheld unless
  // all three are held. The first WITHHELD one names the owner, in chain
  // order — never a merged list, because the three are one sequence and the
  // earliest blocker is the one a reader is waiting on.
  const grChain = useVerbAvailabilities(
    /** @type {const} */ ({
      receive: 'gr:receive',
      inspect: 'gr:inspect',
      post: 'gr:post'
    })
  );
  const grChainAvailability =
    [grChain.receive, grChain.inspect, grChain.post].find((a) => a.kind !== 'held') ??
    /** @type {const} */ ({ kind: 'held' });

  // ── ASN DISCREPANCY RECONCILIATION (`t_asn_resolve_discrepancy`) ───────────
  //
  // ⚠️ **ASKED SEPARATELY FROM `grChain`, NOT FOLDED INTO IT.** `asn:flag` and
  // the three GR atoms all sit in `receiving` today, so on the seeded seat the
  // two answers agree — and folding them would make this control's owner line
  // read off the GR chain's first blocker, which is a different verb. The GR
  // chain is ONE commit built from three atoms (hence one merged answer); this
  // is one verb with one atom, so it gets its own.
  const resolveAvailability = useVerbAvailability('asn:flag');

  // ⚠️ **THE ROW SET IS DERIVED FROM THE ASN'S OWN STATE, NEVER FROM THE GR'S.**
  // A GR that was rejected is not evidence that its ASN is still flagged —
  // reconciling clears the ASN and leaves the GR Rejected forever, which is
  // correct (the receipt really was rejected) and would make a GR-status-keyed
  // list keep offering an act the machine has already refused. `Discrepancy` is
  // the only legal from-state, so the list IS the legality.
  const discrepancyAsns = useMemo(() => asns.filter((a) => a.status === 'Discrepancy'), [asns]);

  const { drill, drilledPo, allGRs, counts, approvedToday, rejectionRate, filtered } =
    useGoodsReceiptList({ goodsReceipts, tab, dateFilter, search });

  // AC-03 — exactly one record behind the cell arrives OPEN, not as a list of one.
  const onlyGrId = drilledPo !== null && allGRs.length === 1 ? allGRs[0].id : null;
  useEffect(() => {
    if (onlyGrId !== null) setSelectedId(onlyGrId);
  }, [onlyGrId]);

  const selected = selectedId ? (allGRs.find((g) => g.id === selectedId) ?? null) : null;
  const selectedSupplier = selected ? supplierById.get(selected.supplierId) : undefined;
  // CR-25 (BL-45) — each line's quantity check, against the ASN when the hub
  // has it and the expected quantity when it does not (the supplier sees the
  // same comparison on its own receipts page).
  const selectedChecks = selected
    ? compareReceipt(selected, asns.find((a) => a.asnNumber === selected.asnNumber) ?? null)
    : [];

  // WHO ACTS NEXT (S2a). `GRStatus` matches the machine's states exactly, so
  // `status` IS the canonical state here — no projection member to fall through.
  const nextAct = useNextAct('goodsReceipt', selected?.status);

  const handleExport = () =>
    toast({
      variant: 'info',
      title: t('goodsReceipt.toast.export.title'),
      description: t('goodsReceipt.toast.export.desc')
    });

  const handleLabResults = () =>
    toast({
      variant: 'info',
      title: t('goodsReceipt.toast.labOverview.title'),
      description: t('goodsReceipt.toast.labOverview.desc')
    });

  const handleNewGR = () => {
    setWizardAsnId(undefined);
    setWizardOpen(true);
  };

  // §91e — the wizard sequences create → dispose → post → settle and then
  // CLOSES, so a settle it saw fail would take the correlationId with it and the
  // GR would land on this page parked, with the retry unreachable for the one
  // path most likely to produce it. The wizard hands the failure up; the page
  // watches it exactly as if it had issued the settle itself.
  /** @param {FailedSettle} [failed] */
  const handleWizardComplete = (failed) => {
    setWizardOpen(false);
    if (failed) commands.watchSettle(failed.grId, failed.correlationId, failed.fault);
  };

  return (
    <AppShellV2>
      <GoodsReceiptHeader
        t={t}
        grChainAvailability={grChainAvailability}
        onExport={handleExport}
        onLabResults={handleLabResults}
        onNewGR={handleNewGR}
      />

      <PageMetaLine className="mb-6">
        {counts.all === 1
          ? t('goodsReceipt.meta.count.one', { count: counts.all })
          : t('goodsReceipt.meta.count.other', { count: counts.all })}{' '}
        · {t('goodsReceipt.meta.lastPosted')} <Data>{formatDate(TODAY)}</Data>
        {/* D-CENSUS-8 — PARTLY REAL, both axes. `goodsReceipt` is wired: Post and
            Settle genuinely dispatch, run the E4 enforcement checks and write the
            DR-10 trail. The receipts listed are fixtures. */}
        <ProvenanceMarker capability="goodsReceipts" className="ml-3 align-middle" />
      </PageMetaLine>

      {/* REQ-E07-08 AC-03 — this page reads SAP data; say how old it is. */}
      <SapDataAgeBanner page="goodsReceipts" className="mb-4" />

      <GoodsReceiptKpis
        counts={counts}
        approvedToday={approvedToday}
        rejectionRate={rejectionRate}
        t={t}
      />

      {/* ── SHIPMENT DISCREPANCIES ────────────────────────────────────────────
          The exit from `Discrepancy`, on the desk that entered it.

          ⚠️ **IT IS ITS OWN SECTION RATHER THAN A CONTROL IN THE GR PANEL, AND
          THE REASON IS MEASURED, NOT STYLISTIC.** The GR panel already shows
          `selected.asnNumber`, which makes it the obvious anchor — but the GR
          fixtures reference `ASN-2026-0xx` and the ASN store holds
          `ASN-2025-002xx` / `ASN-2025-003xx`: **the intersection is EMPTY (14
          refs × 6 ASNs × 0 shared)**. A control hung off `selected.asnNumber`
          would therefore be reachable ONLY from a wizard-created GR and never
          from a seeded row — the seeded `ASN-2025-00201` would carry a
          discrepancy nobody could open. Keyed on the ASN instead, both the
          seeded row and the cascade's output are reachable on the same surface.

          ⚠️ **ABSENT WHEN EMPTY IS NOT THE WITHHELD-AS-ABSENT DEFECT.** Nothing
          is being hidden from a narrow seat here: with no flagged ASN there is
          no act for anyone, held or not. When a row EXISTS, a seat without
          `asn:flag` gets the notice in the same cell the button would occupy —
          which is the rule the grammar actually states. */}
      {discrepancyAsns.length > 0 && (
        <DiscrepancySection
          discrepancyAsns={discrepancyAsns}
          resolveAvailability={resolveAvailability}
          resolving={commands.resolveDiscrepancyMutation.isPending}
          onResolve={commands.handleResolveDiscrepancy}
          t={t}
        />
      )}

      {/* REQ-E07-03 BR-04 / AC-02 — the filter, and the way back. */}
      <PoFilterBanner drill={drill} persona="buyer" count={allGRs.length} />

      {/* REQ-E07-06 — supplier disputes of a receipt discrepancy, for the planner. */}
      <ReceiptDisputesSection goodsReceipts={goodsReceipts} />

      <GoodsReceiptFilters
        counts={counts}
        tab={tab}
        onTabChange={setTab}
        search={search}
        onSearchChange={setSearch}
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
        t={t}
      />

      <GoodsReceiptTable
        filtered={filtered}
        supplierById={supplierById}
        onSelect={setSelectedId}
        t={t}
        el={el}
      />

      <GoodsReceiptPanel
        selected={selected}
        selectedSupplier={selectedSupplier}
        selectedChecks={selectedChecks}
        nextAct={nextAct}
        footerActions={
          selected
            ? footerForStatus(selected, {
                t,
                toast,
                grChain,
                grChainAvailability,
                posting: commands.postMutation.isPending,
                retesting: commands.retestMutation.isPending,
                settleWatch: commands.settleWatch,
                setWizardAsnId,
                setSelectedId,
                setWizardOpen,
                handlePostToSap: commands.handlePostToSap,
                handleRequestRetest: commands.handleRequestRetest,
                retrySettle: commands.retrySettle
              })
            : null
        }
        onClose={() => setSelectedId(null)}
        t={t}
        el={el}
      />

      {wizardOpen && (
        <GRInspectionWizard
          onClose={() => setWizardOpen(false)}
          onComplete={handleWizardComplete}
          initialAsnId={wizardAsnId}
          shipments={shipments}
          asns={asns}
          enforcementSettings={enforcementSettings}
          complianceRegistry={complianceRegistry}
        />
      )}
    </AppShellV2>
  );
};

// Wrapper: reads the QC command-center data through the scoped hooks and renders
// the four honest states; the workspace inner holds the local (Phase-2′,
// non-persisting) inspection-wizard state seeded from the resolved reads.
/** @type {React.FC} */
const BuyerGoodsReceipt = () => {
  const { t } = useTranslation();
  const GR_CRUMB = [t('goodsReceipt.crumb.transact'), t('goodsReceipt.crumb.gr')];
  const grQuery = useGoodsReceipts();
  const suppliersQuery = useSuppliers();
  const shipmentsQuery = useShipments();
  const asnsQuery = useASNs();
  // CP-3 · E4 — the enforcement ledger joins the page's reads rather than being
  // fetched inside the wizard. A gate whose governing record is still loading
  // has no honest answer to give, and the page already owns the four states.
  const enforcementQuery = useEnforcementSettings();
  // CP-3 · H4 — the certificate side joins the same read set. Buyer scope reads
  // the superset; the service applies the scoping contract, not this page.
  const registryQuery = useComplianceRegistry();
  // REQ-E07-03 AC-08 — refused at the page's own gate, beside the other three
  // honest states, so the workspace below never renders for a PO it cannot show.
  const drill = usePoDrillFilter();

  if (drill.kind === 'pending') return <LoadingState breadcrumb={GR_CRUMB} />;
  if (drill.kind === 'notFound') return <OrderNotFound persona="buyer" breadcrumb={GR_CRUMB} />;
  if (
    grQuery.isPending ||
    suppliersQuery.isPending ||
    shipmentsQuery.isPending ||
    asnsQuery.isPending ||
    enforcementQuery.isPending ||
    registryQuery.isPending
  )
    return <LoadingState breadcrumb={GR_CRUMB} />;
  if (
    grQuery.isError ||
    suppliersQuery.isError ||
    shipmentsQuery.isError ||
    asnsQuery.isError ||
    enforcementQuery.isError ||
    registryQuery.isError
  )
    return (
      <ErrorState
        breadcrumb={GR_CRUMB}
        error={
          grQuery.error ??
          suppliersQuery.error ??
          shipmentsQuery.error ??
          asnsQuery.error ??
          enforcementQuery.error ??
          registryQuery.error
        }
        onRetry={() => {
          grQuery.refetch();
          suppliersQuery.refetch();
          shipmentsQuery.refetch();
          asnsQuery.refetch();
          enforcementQuery.refetch();
          registryQuery.refetch();
        }}
      />
    );

  const goodsReceipts = grQuery.data?.items ?? [];
  if (goodsReceipts.length === 0)
    return (
      <EmptyState
        breadcrumb={GR_CRUMB}
        title={t('goodsReceipt.empty.title')}
        subtitle={t('goodsReceipt.empty.subtitle')}
        message={t('goodsReceipt.empty.message')}
      />
    );

  return (
    <GoodsReceiptWorkspace
      goodsReceipts={goodsReceipts}
      suppliers={suppliersQuery.data?.items ?? []}
      shipments={shipmentsQuery.data?.items ?? []}
      asns={asnsQuery.data?.items ?? []}
      enforcementSettings={enforcementQuery.data?.items ?? []}
      complianceRegistry={registryQuery.data?.items ?? []}
    />
  );
};

export default BuyerGoodsReceipt;
