/** @import React from 'react' */
import { useMemo, useState } from 'react';
import { ClipboardList, Plus, Download, FileSpreadsheet } from 'lucide-react';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import ProvenanceMarker from '@components/ui-v2/ProvenanceMarker';
import BulkActionsBar from '@components/ui-v2/BulkActionsBar';
import SubTabs from '@components/ui-v2/SubTabs';
import SearchBar from '@components/ui-v2/SearchBar';
import SidePanel from '@components/ui-v2/SidePanel';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import EmptyState from '@components/ui-v2/EmptyState';
import { useTranslation } from 'react-i18next';
import { useRequisitions } from '@services/query/hooks';
import { useVerbAvailabilities, useNextAct } from '@hooks/useVerbAvailability';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { formatDate } from '@lib/format';
import { normalizeQty } from '@lib/localeNumber';
/** @import { PurchaseRequisition } from '@services/data/types' */
/** @import { GroupTab, NewPRForm, PanelMode } from './const' */
import { emptyForm } from './const';
import { countByStatus, filterRequisitions, latestCreatedDate } from './utils';
import useRequisitionActions from './hooks/useRequisitionActions';
import useRequisitionDeepLinks from './hooks/useRequisitionDeepLinks';
import ProcurementFlow from './components/ProcurementFlow';
import RequisitionKpis from './components/RequisitionKpis';
import RequisitionTable from './components/RequisitionTable';
import RequisitionPanelFooter from './components/RequisitionPanelFooter';
import RequisitionDetail from './components/RequisitionDetail';
import NewRequisitionPanel from './components/NewRequisitionPanel';

// ────────────────────────────────────────────────────────────────────────────
// BuyerRequisitions — the purchase-requisition lane (`/buyer/purchase-
// requisition`). Split into this folder by the Phase 5 page split (no
// behaviour change). This file holds the page's state, its verb gates and the
// layout; the sections live in `components/`, the dispatches and their toasts
// in `hooks/useRequisitionActions.js`, the URL entrances in
// `hooks/useRequisitionDeepLinks.js`.
// ────────────────────────────────────────────────────────────────────────────

/**
 * The purchase-requisition page: header (export, bulk download and the New-PR
 * button for a seat holding `pr:create`), meta line, procurement flow, KPI
 * tiles, status tabs, search, the requisition table, the detail panel and the
 * New-PR panel.
 * @type {React.FC}
 */
const BuyerRequisitions = () => {
  const { t } = useTranslation();
  const REQUISITIONS_CRUMB = [
    t('requisitions.crumb.acquire'),
    t('requisitions.crumb.requisitions')
  ];
  const [group, setGroup] = useState(/** @type {GroupTab} */ ('all'));
  const [search, setSearch] = useState('');
  const [selectedRow, setSelectedRow] = useState(/** @type {PurchaseRequisition | null} */ (null));
  // The detail panel's mode. `rejecting` swaps the footer for the reason
  // capture — the BuyerInvoices dispute precedent, one lane over.
  const [panelMode, setPanelMode] = useState(/** @type {PanelMode} */ ('view'));
  const [rejectReason, setRejectReason] = useState('');
  const [reviseNote, setReviseNote] = useState('');
  const [newOpen, setNewOpen] = useState(false);
  const [form, setForm] = useState(/** @type {NewPRForm} */ (emptyForm));

  const reqQuery = useRequisitions();
  const prs = reqQuery.data?.items ?? [];

  // ⚠️ **THE SELECTED ROW IS DERIVED FROM THE LIST, NOT HELD AS A SNAPSHOT.**
  // The row captured on click is the PRE-transition record; after an approve
  // invalidates and the list re-derives, a held snapshot would keep rendering
  // 'Pending Approval' with its Approve button intact over a document that is
  // already Approved — an affordance for an act the dispatcher would now refuse
  // as ILLEGAL_TRANSITION. Re-finding by id makes the panel a view of the store
  // rather than a copy of it. The fallback keeps the panel open for a row that
  // has genuinely left the list.
  const selectedPR = selectedRow ? (prs.find((p) => p.id === selectedRow.id) ?? selectedRow) : null;

  // WHO ACTS NEXT (S2a). Read off the LIVE row above, never off `selectedRow`'s
  // snapshot — the same reason that fallback exists. `useNextAct` answers `null`
  // for a closed panel, so the call stays unconditional and above every return.
  const nextAct = useNextAct('purchaseRequisition', selectedPR?.status);

  // The seat's authority over this page's five verbs, DERIVED per verb — never
  // authored as a status→owner map. `pr:approve` / `pr:reject` live in
  // `procurement` and `pr:create` / `pr:submit` / `pr:revise` in
  // `requisitioner` (businessRoles.js), two disjoint bundles, so each side
  // reads "Awaiting <the other>" rather than seeing nothing at all — and the
  // segregation is visible from BOTH sides of the machine instead of being a
  // property of the bundles that nothing exercised.
  //
  // ⚠️ **`create` IS NEW HERE AND IT IS THE ONE THIS PAGE WAS MISSING.** §67/§68
  // guarded the four verbs that act on a document ALREADY SELECTED, and left
  // the one that makes a document unguarded — so a procurement seat, which
  // holds no `pr:create`, saw a live "New PR" button, filled three steps, and
  // was refused at the dispatcher with nothing on screen naming the requester.
  // A page can be covered for every verb it has a row for and still ship a
  // false affordance in its header.
  const {
    create: createAvailability,
    submit: submitAvailability,
    revise: reviseAvailability,
    approve: approveAvailability,
    reject: rejectAvailability,
    sourcing: sourcingAvailability
  } = useVerbAvailabilities(
    /** @type {const} */ ({
      create: 'pr:create',
      submit: 'pr:submit',
      revise: 'pr:revise',
      approve: 'pr:approve',
      reject: 'pr:reject',
      // ⚠️ **`rfq:create`, NOT `pr:source` — AND THE DIFFERENCE IS THE WHOLE
      // AUTHORISATION MODEL OF THIS LANE.** Raising a sourcing event IS creating
      // an RFQ; the requisition's own advance is a CASCADE the dispatcher fires
      // afterwards under the automation grant. Derived, not assumed: `pr:source`
      // is held by NO seat (`SYSTEM_ROLES` → zero holders) and lives in
      // `AUTOMATION_ATOMS`, which is why `/buyer/process-flows` renders it
      // `NO PERSONA MAPPED`. Gating this control on `pr:source` would therefore
      // withhold it from EVERY seat that exists, and the handoff notice would name
      // an owner nobody can be.
      sourcing: 'rfq:create'
    })
  );

  useRequisitionDeepLinks({ prs, createAvailability, setSelectedRow, setForm, setNewOpen });

  const counts = useMemo(() => countByStatus(prs), [prs]);
  const maxCreatedDate = useMemo(() => latestCreatedDate(prs), [prs]);
  const filtered = useMemo(() => filterRequisitions(prs, group, search), [prs, group, search]);

  // The ONE parse. No hint: a buyer's own form carries no origin convention.
  const parsedQty = normalizeQty(form.qty);
  // A refused quantity is not a submittable form. `!!form.qty` used to be the
  // whole gate — presence, not readability — which is how "4.500" got through.
  const canSubmit = !!form.material && parsedQty.ok && !!form.date && !!form.costCenter;

  const closePanel = () => {
    setSelectedRow(null);
    setPanelMode('view');
    setRejectReason('');
    setReviseNote('');
  };

  const actions = useRequisitionActions({
    selectedPR,
    form,
    parsedQty,
    canSubmit,
    rejectReason,
    reviseNote,
    closePanel,
    setForm,
    setNewOpen
  });

  if (reqQuery.isPending) return <LoadingState breadcrumb={REQUISITIONS_CRUMB} />;
  if (reqQuery.isError)
    return (
      <ErrorState
        breadcrumb={REQUISITIONS_CRUMB}
        error={reqQuery.error}
        onRetry={() => reqQuery.refetch()}
      />
    );
  if (prs.length === 0)
    return (
      <EmptyState
        breadcrumb={REQUISITIONS_CRUMB}
        title={t('requisitions.empty.title')}
        subtitle={t('requisitions.empty.subtitle')}
        message={t('requisitions.empty.message')}
      />
    );

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={REQUISITIONS_CRUMB}
        title={t('requisitions.header.title')}
        subtitle={t('requisitions.header.subtitle')}
        actions={
          // ⚠️ THE CREATE AFFORDANCE IS WITHHELD, NOT DISABLED, AND THE WAIT IS
          // NAMED BESIDE IT. Omitting `primary` is what removes the false
          // affordance; the notice is what stops the removal from reading as a
          // gap. A disabled button would say "you may not" without saying who
          // may — the distinction `HandoffNotice`'s header sets out.
          //
          // Export / bulk-download stay: they are reads, they hold no atom, and
          // gating them on a verb the seat does not hold would be inventing an
          // authority the machine never asserted.
          <div className="flex items-center gap-3">
            <HandoffNotice availability={createAvailability} testId="handoff-pr-create" />
            <BulkActionsBar
              actions={[
                { label: t('requisitions.action.export'), icon: FileSpreadsheet },
                { label: t('requisitions.action.bulkDownload'), icon: Download }
              ]}
              {...(createAvailability.kind === 'held'
                ? {
                    primary: {
                      label: t('requisitions.action.newPr'),
                      icon: Plus,
                      onClick: () => setNewOpen(true)
                    }
                  }
                : {})}
            />
          </div>
        }
      />

      <PageMetaLine className="-mt-6 mb-6">
        {t(prs.length === 1 ? 'requisitions.meta.summary.one' : 'requisitions.meta.summary.other', {
          count: prs.length,
          date: formatDate(maxCreatedDate)
        })}
        {/* D-CENSUS-8 — PARTLY REAL, both axes. The PR CommandTarget is wired
            (G1.1) so a create genuinely dispatches; gate-2 still holds the feed
            SIMULATED (no live producer — SOMO F2 / Grid G1.2), which is why the
            feed axis reads the specific "awaiting live PR producer" text. */}
        <ProvenanceMarker capability="purchaseRequisitions" className="ml-3 align-middle" />
      </PageMetaLine>

      <ProcurementFlow />

      <RequisitionKpis counts={counts} t={t} />

      <SubTabs
        options={[
          { id: 'all', label: t('requisitions.tab.all'), count: counts.all },
          { id: 'Draft', label: t('requisitions.tab.draft'), count: counts.draft },
          { id: 'Pending Approval', label: t('requisitions.tab.pending'), count: counts.pending },
          { id: 'Approved', label: t('requisitions.tab.approved'), count: counts.approved },
          { id: 'Sourcing Event', label: t('requisitions.tab.sourcing'), count: counts.sourcing },
          { id: 'PO Created', label: t('requisitions.tab.po'), count: counts.po }
        ]}
        value={group}
        onChange={setGroup}
        className="mb-5"
      />

      <div className="mb-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={t('requisitions.search.placeholder')}
        />
      </div>

      <RequisitionTable filtered={filtered} onSelect={setSelectedRow} t={t} />

      <div className="mt-6 bg-info-soft border-l-2 border-info rounded px-4 py-3 text-sm text-text-primary flex items-start gap-2">
        <ClipboardList size={14} className="text-info shrink-0 mt-0.5" />
        <span>
          <strong className="text-info">{t('requisitions.footnote.title')}</strong>{' '}
          {t('requisitions.footnote.body')}
        </span>
      </div>

      <SidePanel
        open={selectedPR !== null}
        onClose={closePanel}
        title={selectedPR ? t('requisitions.panel.title', { number: selectedPR.prNumber }) : ''}
        footerActions={
          selectedPR && (
            <RequisitionPanelFooter
              selectedPR={selectedPR}
              panelMode={panelMode}
              setPanelMode={setPanelMode}
              setRejectReason={setRejectReason}
              setReviseNote={setReviseNote}
              availability={{
                submit: submitAvailability,
                revise: reviseAvailability,
                approve: approveAvailability,
                reject: rejectAvailability
              }}
              pending={actions.pending}
              canReject={actions.canReject}
              canRevise={actions.canRevise}
              closePanel={closePanel}
              submitSelected={actions.submitSelected}
              reviseSelected={actions.reviseSelected}
              approveSelected={actions.approveSelected}
              rejectSelected={actions.rejectSelected}
              t={t}
            />
          )
        }
      >
        {selectedPR && (
          <RequisitionDetail
            selectedPR={selectedPR}
            panelMode={panelMode}
            rejectReason={rejectReason}
            setRejectReason={setRejectReason}
            reviseNote={reviseNote}
            setReviseNote={setReviseNote}
            availability={{
              approve: approveAvailability,
              reject: rejectAvailability,
              sourcing: sourcingAvailability
            }}
            raiseSourcingEvent={actions.raiseSourcingEvent}
            nextAct={nextAct}
            t={t}
          />
        )}
      </SidePanel>

      <NewRequisitionPanel
        open={newOpen}
        onClose={() => setNewOpen(false)}
        form={form}
        setForm={setForm}
        parsedQty={parsedQty}
        canSubmit={canSubmit}
        onSubmit={actions.submitNewPR}
        t={t}
      />
    </AppShellV2>
  );
};

export default BuyerRequisitions;
