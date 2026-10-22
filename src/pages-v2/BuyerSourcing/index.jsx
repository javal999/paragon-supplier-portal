// ────────────────────────────────────────────────────────────────────────────
// BuyerSourcing — the buyer's RFQ board (`/buyer/rfq`).
//
// Phase 5 page split (frontend-standard, PAGE-SPLIT-GUIDE.md): this folder
// replaced the single `BuyerSourcing.jsx`. This file is the page — the router's
// default export, the four honest states, and the workspace that owns the
// page-level state and composes the sections in `components/`. State and
// handlers a section needs live in `hooks/`; pure helpers in `utils.js`;
// constants and typedefs in `const.js`.
//
// Every name other modules imported from `./BuyerSourcing` is re-exported
// below, so `@pages-v2/BuyerSourcing` resolves exactly as before.
// ────────────────────────────────────────────────────────────────────────────
/** @import React from 'react' */
/** @import { RFQ } from '@data/mockRfqs' */
/** @import { Quotation } from '@data/mockQuotations' */
/** @import { PurchaseRequisition, PRStatus } from '@services/data/types' */
/** @import { Supplier } from '@services/data/types' */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import EmptyState from '@components/ui-v2/EmptyState';
import { useVerbAvailability, useVerbAvailabilities } from '@hooks/useVerbAvailability';
import { useToast } from '@hooks/useToast';
import {
  useRFQs,
  useQuotations,
  useSuppliers,
  useRequisitions,
  useAwards,
  useNegotiationRounds
} from '@services/query/hooks';
import { requisitionSourcingStates } from '../sourcing/requisitionPrefill';
import { TemplatePicker, SaveTemplateDialog } from '../sourcing/RfqAuthoring';
import { downloadComparison } from '../rfx/comparisonExport';
import { useRfqBoard } from './hooks/useRfqBoard';
import { useRfqWizard } from './hooks/useRfqWizard';
import { useRfqPanelActions } from './hooks/useRfqPanelActions';
import { usePanelQuotes } from './hooks/usePanelQuotes';
import { useWizardDeepLinks } from './hooks/useWizardDeepLinks';
import { useInviteeSearch } from './hooks/useInviteeSearch';
import SourcingHeader from './components/SourcingHeader';
import SourcingKpis from './components/SourcingKpis';
import RfqBoardFilters from './components/RfqBoardFilters';
import RfqBoardTable from './components/RfqBoardTable';
import AwardsHistory from './components/AwardsHistory';
import RfqSidePanel from './components/RfqSidePanel';
import RfqWizardModal from './components/RfqWizardModal';

// The names other modules import from this page (the footer spec, the 2e-c
// i18n sweep), re-exported from where they now live.
export { FOOTER_ACTION, FOOTER_LABEL, FOOTER_VARIANT } from './utils';
// RFx UX B-02 — the FX and spread maps moved to the event page with the
// comparison they render on; re-exported here so their importers resolve.
export { FX_REFUSAL_KEY } from '../BuyerSourcingEvent/components/FxRefusalBanner';
export {
  FX_RATE_REFUSAL_KEY,
  FX_VINTAGE_REFUSAL_KEY
} from '../BuyerSourcingEvent/components/FxPinDialog';
export { FX_PIN_SOURCE_KEY } from '../BuyerSourcingEvent/components/FxBasisPanel';
export { SPREAD_SILENT_KEY } from '../BuyerSourcingEvent/components/ComparisonParts';

/**
 * @typedef {object} SourcingWorkspaceProps
 * @property {RFQ[]} baseRfqs
 * @property {Quotation[]} quotations
 * @property {Supplier[]} suppliers
 * @property {PurchaseRequisition[]} sourceableRequisitions C.2 — the requisitions a sourcing event may be raised FROM, already
 *   narrowed at the seam to `t_pr_source`'s from-states. May be EMPTY, and the
 *   picker renders that honestly rather than as a blank control.
 */

/**
 * The workspace: the board, the side panel on the selected RFQ, the template
 * picker and save dialog, and the RFQ wizard. (RFx UX B-02 moved the FX-pin
 * dialog to the event page with the comparison.)
 *
 * Section map (render order): SourcingHeader · SourcingKpis · RfqBoardFilters ·
 * RfqBoardTable · AwardsHistory · RfqSidePanel · TemplatePicker ·
 * SaveTemplateDialog · RfqWizardModal.
 * @type {React.FC<SourcingWorkspaceProps>}
 */
const SourcingWorkspace = ({
  baseRfqs,
  quotations,
  suppliers,
  sourceableRequisitions: sourceablePrs
}) => {
  const supplierNameById = useMemo(
    () => new Map(suppliers.map((s) => [s.id, s.name])),
    [suppliers]
  );
  // The board reads the seam list ALONE. A created RFQ arrives here through
  // getRFQs after the create dispatch invalidates — never a client-fabricated
  // peer spread in (the retired `extraRfqs` anti-pattern, C6 §1).
  const rfqs = baseRfqs;
  // BL-37 — the award records, so the history can name EVERY supplier of a split.
  const awardsQuery = useAwards();
  // RFx UX 1D (B-04) — the rounds and awards feed each row's next step. Like the
  // award history, they are not part of the page's loading gate: until they
  // arrive a row reads as having no round and no award.
  const roundsQuery = useNegotiationRounds();
  const board = useRfqBoard(rfqs, {
    quotations,
    rounds: roundsQuery.data?.items ?? [],
    awards: awardsQuery.data?.items ?? []
  });
  // 2e-c-4 — the panel holds the selected RFQ's ID, and the RFQ itself is
  // DERIVED from the live query result. It used to hold the RFQ OBJECT, which
  // was a snapshot taken when the row was clicked: a command that mutated the
  // RFQ invalidated the query and re-fetched, but the open panel kept rendering
  // the stale copy. Award masked it (the panel closes on award), and the FX pin
  // exposed it — a buyer recorded a rate and the comparison went on refusing,
  // because the panel was still reading an RFQ with no `fxPins` on it.
  const [selectedRfqId, setSelectedRfqId] = useState(/** @type {string | null} */ (null));
  // DERIVED from the live list, so a command that mutates this RFQ is reflected
  // in the OPEN panel — the whole point of holding the id rather than the row.
  const selectedRfq = useMemo(
    () => (selectedRfqId ? (baseRfqs.find((r) => r.id === selectedRfqId) ?? null) : null),
    [baseRfqs, selectedRfqId]
  );

  // WHAT COMES NEXT (RFx UX B-15). The panel reads the same derivation as the
  // board's Next column and the event page's stage bar (`rfqStageOf`), so the
  // three agree. It replaced the S2a role line ("Your move"), which read the
  // status alone and called an RFQ still waiting on quotes the buyer's move.
  const panelStage = selectedRfq ? board.stageOf(selectedRfq) : null;
  const wizard = useRfqWizard({ baseRfqs, sourceablePrs });

  // §73 — the seat's authority over `t_rfq_create` (atom `rfq:create`,
  // held by `procurement`). One verb, one notice, one placement.
  const rfqCreateAvailability = useVerbAvailability('rfq:create');

  // §76 — THE SIX NON-CREATE VERBS, ONE NOTICE PER ACT. THE GROUPING IS GONE.
  //
  // §74 collapsed these into two group notices — one per ADJACENT action
  // group, naming the first withheld atom — on the reading that the RFQ side
  // panel is a CONTROL, so a seat withheld from the group should read the
  // owner once. **The panel is not a control; it is a WORKSPACE** (operator
  // ruling, §76): four separable acts on the selected RFQ, four dispatches,
  // four confirmations, each with its own from-state. A notice that spans them
  // answers about a group nobody performs.
  //
  // ⚠️ **AND THE COLLAPSE COST INFORMATION THAT THE HOOK ALREADY HAD.**
  // `firstWithheld(publish, reopen, cancel)` renders ONE line for a seat that
  // may hold one of the three and not the others: the notice names the first
  // withheld owner and the held verb's button renders beside it, so the reader
  // cannot tell WHICH act the line is about. Per-verb, a partially-held seat
  // reads its own controls and the owner of each act it lacks — which is the
  // constraint working, not an exception to it. Today every one of the six is
  // held by `procurement` and by nothing else, so the strings coincide; the
  // day a bundle splits, the surface is already right and no grouping has to
  // be re-taken.
  //
  // `useVerbAvailabilities` needed no change to carry this: it is already one
  // independent resolution per atom, and the group was imposed on top of it.
  //
  // RFx UX B-02 (owner ruling 2026-10-19) — `quotation:review` and
  // `rfq:fx-pin` left this surface with their acts: the event page resolves
  // them, one notice per verb in the act's own slot, as here.
  const rfqVerbs = useVerbAvailabilities(
    /** @type {const} */ ({
      publish: 'rfq:publish',
      reopen: 'rfq:reopen',
      cancel: 'rfq:cancel',
      award: 'rfq:award'
    })
  );
  const { toast } = useToast();
  const { t } = useTranslation();
  const awardByRfq = useMemo(
    () =>
      new Map((awardsQuery.data?.items ?? []).map((a) => /** @type {const} */ ([a.eventId, a]))),
    [awardsQuery.data]
  );
  /**
   * B1 review fix (c) — the comparison as CSV (items × suppliers × breaks),
   * built in the browser. Says so when there is nothing to export rather than
   * handing over an empty file.
   * @param {readonly RFQ[]} scope
   * @param {string} filename
   */
  const exportComparison = (scope, filename) => {
    const rows = downloadComparison(
      filename,
      scope,
      quotations,
      (id) => supplierNameById.get(id) ?? id,
      t
    );
    toast(
      rows > 0
        ? { variant: 'success', title: t('rfqCompare.export.done') }
        : { variant: 'info', title: t('rfqCompare.export.empty') }
    );
  };

  function closePanel() {
    setSelectedRfqId(null);
  }

  const actions = useRfqPanelActions({ selectedRfq, closePanel });

  /** @param {RFQ} r */
  const openRfq = (r) => {
    setSelectedRfqId(r.id);
  };

  const panelQuotes = usePanelQuotes({ selectedRfq, quotations });

  useWizardDeepLinks({
    sourceablePrs,
    openWizard: wizard.openWizard,
    openWizardFromSeed: wizard.openWizardFromSeed,
    rfqCreateAvailability
  });

  const invitees = useInviteeSearch({
    draft: wizard.draft,
    supplierSearch: wizard.supplierSearch,
    setSupplierSearch: wizard.setSupplierSearch
  });

  return (
    <AppShellV2>
      <SourcingHeader
        rfqs={rfqs}
        activeCount={board.kpis.active}
        nowIso={board.nowIso}
        rfqCreateAvailability={rfqCreateAvailability}
        exportComparison={exportComparison}
        onNewRfq={() => wizard.openWizard()}
        onTemplates={() => wizard.setPickerOpen(true)}
        t={t}
      />

      <SourcingKpis kpis={board.kpis} kpi={board.kpi} onKpi={board.toggleKpi} t={t} />

      <RfqBoardFilters board={board} t={t} />

      <RfqBoardTable
        rows={board.activeFiltered}
        nowIso={board.nowIso}
        nextOf={board.nextOf}
        quotedOf={board.quotedOf}
        // The queue's own empty line only when the queue itself is empty; a
        // category or search that hides its rows reads the filter line.
        emptyText={
          board.kpi === null && board.group === 'action' && board.counts.action === 0
            ? t('sourcing.table.emptyAction')
            : t('sourcing.table.empty')
        }
        onOpen={openRfq}
        t={t}
      />

      {/* Awards history */}
      <AwardsHistory
        awarded={board.awarded}
        awardByRfq={awardByRfq}
        supplierNameById={supplierNameById}
        onOpen={openRfq}
        t={t}
      />

      <RfqSidePanel
        selectedRfq={selectedRfq}
        closePanel={closePanel}
        supplierNameById={supplierNameById}
        stage={panelStage}
        rfqCreateAvailability={rfqCreateAvailability}
        rfqVerbs={rfqVerbs}
        actions={actions}
        panelQuotes={panelQuotes}
        awards={awardsQuery.data?.items ?? []}
        openWizardForEdit={wizard.openWizardForEdit}
        setTemplateToSave={wizard.setTemplateToSave}
        t={t}
      />

      {wizard.pickerOpen && rfqCreateAvailability.kind === 'held' && (
        <TemplatePicker
          rfqs={rfqs}
          onClose={() => wizard.setPickerOpen(false)}
          onStart={wizard.openWizardFromSeed}
        />
      )}
      {wizard.templateToSave && (
        <SaveTemplateDialog
          content={wizard.templateToSave.content}
          defaultName={wizard.templateToSave.name}
          onClose={() => wizard.setTemplateToSave(null)}
        />
      )}

      {wizard.wizardOpen && rfqCreateAvailability.kind === 'held' && (
        <RfqWizardModal
          wizard={wizard}
          invitees={invitees}
          rfqs={rfqs}
          sourceablePrs={sourceablePrs}
          supplierNameById={supplierNameById}
          publishAvailability={rfqVerbs.publish}
          t={t}
        />
      )}
    </AppShellV2>
  );
};

// Wrapper: reads the buyer-side sourcing aggregates through the scoped hooks and
// renders the four honest states; the workspace inner keeps its local (Phase-2′,
// non-persisting) RFQ-creation wizard state seeded from the resolved reads.
/** @type {React.FC} */
const BuyerSourcing = () => {
  const { t } = useTranslation();
  const sourcingCrumb = [t('hub.nav.section.sourcing')];
  const rfqsQuery = useRFQs();
  const quotationsQuery = useQuotations();
  const suppliersQuery = useSuppliers();
  // ⚠️ **THE ELIGIBLE STATES ARE DERIVED FROM THE MACHINE, NOT TYPED HERE.** A
  // literal `'Approved'` would be a second copy of the flow and would go stale
  // the day it gains an edge — offering a requisition the dispatcher then
  // refuses, or withholding one it would have accepted. The filter runs at the
  // SEAM (`PRFilter`), not over a list in this component.
  const requisitionsQuery = useRequisitions({
    status: /** @type {PRStatus[]} */ (requisitionSourcingStates())
  });

  if (rfqsQuery.isPending || quotationsQuery.isPending || suppliersQuery.isPending)
    return <LoadingState breadcrumb={sourcingCrumb} />;
  if (rfqsQuery.isError || quotationsQuery.isError || suppliersQuery.isError)
    return (
      <ErrorState
        breadcrumb={sourcingCrumb}
        error={rfqsQuery.error ?? quotationsQuery.error ?? suppliersQuery.error}
        onRetry={() => {
          rfqsQuery.refetch();
          quotationsQuery.refetch();
          suppliersQuery.refetch();
        }}
      />
    );

  const baseRfqs = rfqsQuery.data?.items ?? [];
  if (baseRfqs.length === 0)
    return (
      <EmptyState
        breadcrumb={sourcingCrumb}
        title={t('sourcing.state.empty.title')}
        subtitle={t('sourcing.state.empty.subtitle')}
        message={t('sourcing.state.empty.message')}
      />
    );

  return (
    <SourcingWorkspace
      baseRfqs={baseRfqs}
      quotations={quotationsQuery.data?.items ?? []}
      suppliers={suppliersQuery.data?.items ?? []}
      // ⚠️ NOT part of the page's loading/error gate, deliberately. The
      // requisition picker is an OPTIONAL entrance; a sourcing board that
      // refused to render because the requisition read failed would take the
      // whole page down for a convenience. An unavailable read yields an empty
      // set, which the picker states honestly as "none available" — the same
      // rendering as "none qualifies", because from the buyer's side both mean
      // there is nothing here to start from.
      sourceableRequisitions={requisitionsQuery.data?.items ?? []}
    />
  );
};

export default BuyerSourcing;
