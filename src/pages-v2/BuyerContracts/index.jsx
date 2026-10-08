// ────────────────────────────────────────────────────────────────────────────
// BuyerContracts — the buyer's contract portfolio (`/buyer/contracts`).
//
// Phase 5 page split (frontend-standard, PAGE-SPLIT-GUIDE.md): this folder
// replaced the single `BuyerContracts.jsx`. This file is the page — the
// router's default export, the four honest states, and the workspace that owns
// the page-level state, the wizard's open/step/terminal state and the submit
// guard, and composes the sections in `components/`. The draft and its edits
// live in `hooks/useContractDraft.js`; everything derived from the read in
// `hooks/useContractPortfolio.js`; pure helpers in `utils.js`; constants and
// typedefs in `const.js`.
//
// `collectedSummary`, the four wizard step ids and the submit guard stay in
// this file: `contracts/contractRaisedElsewhere.test.jsx` reads them here.
// ────────────────────────────────────────────────────────────────────────────
/** @import React from 'react' */
/** @import { WizardStep } from '@components/ui-v2/Wizard' */
/** @import { ContractObligation } from '@data/mockObligations' */
/** @import { Contract, ContractType } from '@data/mockContracts' */
/** @import { Supplier } from '@services/data/types' */
/** @import { DraftContract, GroupTab } from './const' */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ScrollText, Plus, FileSpreadsheet } from 'lucide-react';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import ProvenanceMarker from '@components/ui-v2/ProvenanceMarker';
import { RaisedElsewhereNote, RaisedElsewherePanel } from '../contracts/RaisedElsewhere';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import BulkActionsBar from '@components/ui-v2/BulkActionsBar';
import SubTabs from '@components/ui-v2/SubTabs';
import Wizard from '@components/ui-v2/Wizard';
import ModalOverlay from '@components/ui-v2/ModalOverlay';
import { useToast } from '@hooks/useToast';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import EmptyState from '@components/ui-v2/EmptyState';
import { useContracts, useObligations, useSuppliers } from '@services/query/hooks';
import { daysUntil } from '@services/data/dayProjection';
import { DECLARED_PRESENT } from '@services/data/fixturePresent';
import ReviewSection from './components/ReviewSection';
import WizardBasicsStep from './components/WizardBasicsStep';
import WizardTermsStep, { contractRefusalKey } from './components/WizardTermsStep';
import WizardObligationsStep from './components/WizardObligationsStep';
import ContractsKpis from './components/ContractsKpis';
import ContractsFilters from './components/ContractsFilters';
import ContractsTable from './components/ContractsTable';
import RenewalPipeline from './components/RenewalPipeline';
import { useContractDraft } from './hooks/useContractDraft';
import { useContractPortfolio } from './hooks/useContractPortfolio';
import { EMPTY_DRAFT } from './const';
import { catLabel, formatDate, formatIDR, typeLabel } from './utils';

// ⚠️ ANCHORED — this surface rendered values derived from anchored
// fixture data against the WALL CLOCK, so what a reader saw moved every day
// with no commit involved. Module-scope `DECLARED_PRESENT`, the shipped
// pattern from `BuyerShipments` / `BuyerGoodsReceipt`, and behaviour-
// preserving for the same reason they are: this surface's families shift by
// `DECLARED_PRESENT - anchor` and so does this pin, so every rendered
// day-count is answered at the instant the fixtures were authored for.
//
// ⚠️ SESSION-WRITTEN STATE KEEPS THE WALL CLOCK. This constant is for READ
// projections only. A timestamp stamped onto something the user just did is a
// fact about this session, not about the fixture set, and anchoring one would
// tell the reader their own action happened weeks ago.
const TODAY = DECLARED_PRESENT;

/**
 * @typedef {object} ContractsWorkspaceProps
 * @property {Contract[]} baseContracts
 * @property {ContractObligation[]} obligations
 * @property {Supplier[]} suppliers
 */

/**
 * The resolved page: header, KPIs, status tabs, filters, the contract list,
 * the renewal pipeline, and the create-contract walkthrough with its terminal
 * panel. Owns the list filters, the wizard's open/step state and
 * `stoppedDraft`; the draft lives in `useContractDraft`, the derived figures in
 * `useContractPortfolio`.
 * @type {React.FC<ContractsWorkspaceProps>}
 */
const ContractsWorkspace = ({ baseContracts, obligations, suppliers }) => {
  // ONE clock read for the workspace, captured once so every expiry figure on
  // screen is answered against the SAME instant. ⚠️ It sits at the TOP of the
  // body on purpose: this component has no early return today, but a hook below
  // one is a conditional hook, and that is what took 44 specs down in #317.
  const nowIso = TODAY;
  /** This contract's days-to-expiry at that instant. `-Infinity`-free: a row
   * @param {Contract} c
   * @returns {number}
   *  with no readable end date sorts as "no expiry" rather than as overdue. */
  const expiryDays = (c) => daysUntil(c.endDate, nowIso) ?? 0;
  const supplierById = useMemo(() => new Map(suppliers.map((s) => [s.id, s])), [suppliers]);
  const [group, setGroup] = useState(/** @type {GroupTab} */ ('all'));
  const [selectedTypes, setSelectedTypes] = useState(/** @type {ContractType[]} */ ([]));
  const [search, setSearch] = useState('');
  /**
   * ⚠️ THE WALKTHROUGH'S TERMINAL STATE, AND IT REPLACES `extraContracts`.
   *
   * What stood here was `useState<Contract[]>([])` — the fabricated rows
   * `CTR-FABRICATION-01` names. The wizard minted a `Contract`, prepended it,
   * and the row then fed the tab counts, the header count and the renewal
   * pipeline, styled identically to the twelve real ones. Nothing distinguished
   * it, and its detail route 404'd.
   *
   * It now holds the COLLECTED DRAFT instead: the wizard still collects, the
   * terminal step states who owns the act, and no row is created anywhere.
   * `null` is "the walkthrough has not stopped".
   */
  const [stoppedDraft, setStoppedDraft] = useState(/** @type {DraftContract | null} */ (null));
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const {
    draft,
    setDraft,
    updateDraft,
    supplierSearch,
    setSupplierSearch,
    customObligationTitle,
    setCustomObligationTitle,
    contractNumbers,
    valueRead,
    noticeRead,
    toggleBrand,
    toggleSuggestedObligation,
    addCustomObligation,
    removeObligation,
    updateObligation,
    supplierTableFiltered,
    isStepValid
  } = useContractDraft(suppliers);

  /**
   * ⚠️ WHAT `contract:draft` GATES, NOW THAT THE ACT IS S/4HANA'S.
   *
   * Derived before wiring: the atom appeared in exactly two places — as
   * `requiredRole` on a `surfaced: false` transition, and in the `procurement`
   * lane bundle. **It gated nothing on any surface.** An atom gating nothing is
   * the shape retired at `obligation`, so it is given the one job left that is
   * honestly its: who may PREPARE a contract request. The ACT stays S/4HANA's
   * and the terminal panel says so; this decides only who may open the form.
   */
  const draftAvailability = useVerbAvailability('contract:draft');
  const { toast } = useToast();
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Open a contract → the nested full-page detail (/buyer/contracts/:id), where
  // the Delivery Agreements tab lives. Replaces the old in-page SidePanel drawer.
  /** @param {Contract} c */
  const openContract = (c) => navigate(`/buyer/contracts/${c.id}`);

  // ⚠️ ONE SOURCE. This used to be `[...extraContracts, ...baseContracts]`,
  // which is how a client-minted row reached every count on the page.
  const contracts = baseContracts;

  const openWizard = () => {
    setDraft(EMPTY_DRAFT);
    setWizardStep(0);
    setSupplierSearch('');
    setCustomObligationTitle('');
    setWizardOpen(true);
  };

  const closeWizard = () => setWizardOpen(false);

  const submitWizard = () => {
    // The step gate (`isStepValid`, in `useContractDraft`) already holds the wizard on step 2 under a refusal, so this
    // is unreachable through the UI. It is here because the alternative to an
    // honest refusal is a fabricated number: there is no dispatcher behind this
    // page to catch one (CTR-FABRICATION-01), so the check cannot be delegated.
    if (!contractNumbers.ok) {
      toast({
        variant: 'error',
        title: t('contracts.toast.numberRefused.title'),
        description: t(contractRefusalKey(contractNumbers.field, contractNumbers.reason))
      });
      return;
    }
    // ── ⚠️ THE TERMINAL ACT REFUSES, AND IT NAMES THE SYSTEM THAT OWNS IT ─
    //
    // What stood here MINTED TWO IDENTITIES CLIENT-SIDE —
    // `id: ctr-new-<Date.now()>` and `contractNumber: CTR-<yr>-<n>` — built a
    // whole `Contract`, prepended it with `setExtraContracts`, and toasted. SAP
    // owns contract identity; the business number is the one the SE Team reads
    // as spec, and it was being generated in a browser tab.
    // `CTR-FABRICATION-01`, and #311 had already declared the act S/4HANA's.
    //
    // ⚠️ **THE REFUSAL IS NOT A DECLINE.** "You cannot do this" leaves a buyer
    // with nowhere to go. The panel states WHERE an outline agreement is raised
    // and that it arrives here as a fact — which is the declaration's own
    // `why`, rendered instead of contradicted.
    //
    // ⚠️ **AND IT IS NOT A HANDOFF NOTICE.** This seat HOLDS `contract:draft`;
    // the LANE does not support the act. Naming a role-owner would say a
    // colleague is the obstacle when the obstacle is another system — Wave D's
    // distinction, argued in `contracts/contractRaisedElsewhere.ts` and probed
    // both ways in its spec.
    //
    // The parse above still runs and still refuses: a walkthrough must not
    // present a coerced reading back to the buyer as what they entered.
    setStoppedDraft(draft);
    setWizardOpen(false);
  };

  /**
   * WHAT THE BUYER ENTERED, rendered once and read twice — by the review step
   * and by the terminal panel.
   *
   * ⚠️ **ONE RENDERER, BECAUSE THE PANEL'S WHOLE CLAIM IS THAT IT SHOWS WHAT
   * WAS COLLECTED.** A second, shorter summary written for the stop screen
   * would be a second source for the same fact, free to drift from the one the
   * buyer just checked — and the row it dropped would be the row nobody
   * noticed. `editable` is the only difference: there is nothing to edit once
   * the act has been refused.
   *
   * ⚠️ **AND IT IS WHERE THE ORPHANED OBLIGATIONS LAND.** `draft.obligations`
   * had no consumer outside this wizard's own steps once `obligationCount` was
   * retired at #341. The terminal panel reads them, so the collection step is
   * no longer gathering data that reaches nothing — which is why they are NOT
   * retired here: trimming a fabrication's output is not how a fabrication gets
   * fixed.
   * @param {boolean} editable
   */
  const collectedSummary = (editable) => (
    <div className="space-y-5 text-sm">
      <ReviewSection
        label={t('contracts.wizard.review.section.basics')}
        onEdit={editable ? () => setWizardStep(0) : undefined}
        rows={[
          [t('contracts.wizard.review.row.title'), draft.title || '—'],
          [t('contracts.wizard.review.row.type'), draft.type ? typeLabel(t, draft.type) : '—'],
          [
            t('contracts.wizard.review.row.supplier'),
            draft.supplierId ? (supplierById.get(draft.supplierId)?.name ?? draft.supplierId) : '—'
          ],
          [
            t('contracts.wizard.review.row.category'),
            draft.category ? catLabel(t, draft.category) : '—'
          ],
          [t('contracts.wizard.review.row.brands'), draft.brands.join(', ') || '—']
        ]}
      />
      <ReviewSection
        label={t('contracts.wizard.review.section.terms')}
        onEdit={editable ? () => setWizardStep(1) : undefined}
        rows={[
          [t('contracts.wizard.review.row.startDate'), draft.startDate || '—'],
          [t('contracts.wizard.review.row.endDate'), draft.endDate || '—'],
          [
            t('contracts.wizard.review.row.autoRenewal'),
            draft.autoRenewal ? t('contracts.common.yes') : t('contracts.common.no')
          ],
          // Both rows read the ONE parse. A refusal renders an em dash rather
          // than a number: the review step is the last place a buyer checks
          // what they are about to commit to, so it must never be the place
          // that shows a coerced reading the gate would not accept.
          ...(draft.autoRenewal
            ? /** @type {[string, React.ReactNode][]} */ ([
                [
                  t('contracts.wizard.review.row.noticeRequired'),
                  noticeRead.ok
                    ? t(
                        noticeRead.value === 1
                          ? 'contracts.panel.noticeDays.one'
                          : 'contracts.panel.noticeDays.other',
                        { count: noticeRead.value }
                      )
                    : '—'
                ]
              ])
            : []),
          [t('contracts.wizard.review.row.value'), valueRead.ok ? formatIDR(valueRead.value) : '—'],
          [t('contracts.wizard.review.row.paymentTerms'), draft.paymentTerms],
          [t('contracts.wizard.review.row.incoterms'), draft.incoterms]
        ]}
      />
      <ReviewSection
        label={t('contracts.wizard.review.section.obligations')}
        onEdit={editable ? () => setWizardStep(2) : undefined}
        rows={[
          [
            t('contracts.wizard.review.row.count'),
            t(
              draft.obligations.length === 1
                ? 'contracts.wizard.review.oblCount.one'
                : 'contracts.wizard.review.oblCount.other',
              { count: draft.obligations.length }
            )
          ],
          [
            t('contracts.wizard.review.row.titles'),
            draft.obligations.map((o) => o.title).join(', ') || '—'
          ]
        ]}
      />
    </div>
  );

  /** @type {WizardStep[]} */
  const wizardSteps = [
    {
      id: 'basics',
      title: t('contracts.wizard.step.basics.title'),
      shortTitle: t('contracts.wizard.step.basics.title'),
      description: t('contracts.wizard.step.basics.desc'),
      content: (
        <WizardBasicsStep
          draft={draft}
          updateDraft={updateDraft}
          supplierSearch={supplierSearch}
          setSupplierSearch={setSupplierSearch}
          supplierTableFiltered={supplierTableFiltered}
          toggleBrand={toggleBrand}
          t={t}
        />
      )
    },
    {
      id: 'terms',
      title: t('contracts.wizard.step.terms.title'),
      shortTitle: t('contracts.wizard.step.terms.short'),
      description: t('contracts.wizard.step.terms.desc'),
      content: (
        <WizardTermsStep
          draft={draft}
          updateDraft={updateDraft}
          noticeRead={noticeRead}
          valueRead={valueRead}
          t={t}
        />
      )
    },
    {
      id: 'obligations',
      title: t('contracts.wizard.step.obligations.title'),
      shortTitle: t('contracts.wizard.step.obligations.title'),
      description: t('contracts.wizard.step.obligations.desc'),
      content: (
        <WizardObligationsStep
          draft={draft}
          customObligationTitle={customObligationTitle}
          setCustomObligationTitle={setCustomObligationTitle}
          toggleSuggestedObligation={toggleSuggestedObligation}
          addCustomObligation={addCustomObligation}
          removeObligation={removeObligation}
          updateObligation={updateObligation}
          t={t}
        />
      )
    },
    {
      id: 'review',
      title: t('contracts.wizard.step.review.title'),
      shortTitle: t('contracts.wizard.step.review.short'),
      description: t('contracts.wizard.step.review.desc'),
      content: (
        <div className="space-y-5 text-sm">
          {/* ⚠️ THE PRE-ACT LINE. Before this batch NOTHING in four wizard steps
              said where a contract is raised; the only honest sentence arrived
              in a toast, after the act, and was gone in seconds. */}
          <RaisedElsewhereNote />
          {collectedSummary(true)}
        </div>
      )
    }
  ];

  const { lastUpdated, displayOf, counts, kpis, overdueObligations, filtered, renewalPipeline } =
    useContractPortfolio({
      contracts,
      obligations,
      supplierById,
      nowIso,
      group,
      selectedTypes,
      search
    });

  /** @param {ContractType} t */
  const toggleType = (t) =>
    setSelectedTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={[t('contracts.crumb.acquire'), t('contracts.crumb.contracts')]}
        title={t('contracts.header.title')}
        subtitle={t('contracts.header.subtitle')}
        actions={
          <div className="flex flex-col items-end gap-1">
            <BulkActionsBar
              actions={[
                { label: t('contracts.action.export'), icon: FileSpreadsheet },
                { label: t('contracts.action.templates'), icon: ScrollText }
              ]}
              primary={
                draftAvailability.kind === 'held'
                  ? { label: t('contracts.action.newContract'), icon: Plus, onClick: openWizard }
                  : undefined
              }
            />
            {/* ⚠️ THE OTHER GRAMMAR, ON THE SAME SURFACE, AND THE CONTRAST IS
              DELIBERATE. Here a ROLE is the obstacle — a seat without
              `contract:draft` may not even collect — so the owner named is a
              role and `HandoffNotice` is exactly right. At the END of the
              walkthrough the seat HOLDS the atom and the act still cannot
              happen, because the LANE does not support it; that refusal names a
              SYSTEM and is never a handoff. Wave D's distinction, both halves
              visible on one page. */}
            <HandoffNotice availability={draftAvailability} testId="handoff-contract-draft" />
          </div>
        }
      />

      <PageMetaLine className="-mt-6 mb-6">
        {t(contracts.length === 1 ? 'contracts.meta.summary.one' : 'contracts.meta.summary.other', {
          count: contracts.length,
          date: formatDate(lastUpdated)
        })}
        {/* D-CENSUS-8 — `contracts` is null-backed: no contract lifecycle target is
            wired, and SAP owns contract identity. The create wizard on this page
            no longer mints one: its terminal act refuses (CTR-FABRICATION-01, closed
            in f5338c2, findings §103). The marker states the feed fact. */}
        <ProvenanceMarker capability="contracts" className="ml-3 align-middle" />
      </PageMetaLine>

      <ContractsKpis kpis={kpis} overdueObligations={overdueObligations} t={t} />

      <SubTabs
        options={[
          { id: 'all', label: t('contracts.tab.all'), count: counts.all },
          { id: 'active', label: t('contracts.tab.active'), count: counts.active },
          { id: 'expiring', label: t('contracts.tab.expiring'), count: counts.expiring },
          { id: 'expired', label: t('contracts.tab.expired'), count: counts.expired },
          { id: 'renewed', label: t('contracts.tab.renewed'), count: counts.renewed },
          { id: 'draft', label: t('contracts.tab.draft'), count: counts.draft },
          { id: 'terminated', label: t('contracts.tab.terminated'), count: counts.terminated }
        ]}
        value={group}
        onChange={setGroup}
        className="mb-5"
      />

      <ContractsFilters
        selectedTypes={selectedTypes}
        toggleType={toggleType}
        search={search}
        setSearch={setSearch}
        t={t}
      />

      <ContractsTable
        filtered={filtered}
        supplierById={supplierById}
        displayOf={displayOf}
        nowIso={nowIso}
        openContract={openContract}
        t={t}
      />

      {/* Renewal pipeline */}
      <RenewalPipeline
        renewalPipeline={renewalPipeline}
        supplierById={supplierById}
        displayOf={displayOf}
        expiryDays={expiryDays}
        openContract={openContract}
        t={t}
      />

      {/* ⚠️ THE WALKTHROUGH ENDS SOMEWHERE. `stoppedDraft` is what the buyer
          entered; the panel states who owns the act and shows it back to them.
          It deliberately reuses the wizard's own overlay — a flow that vanished
          on its last step is the failure mode this batch was told to stop for. */}
      {stoppedDraft && (
        <ModalOverlay onClose={() => setStoppedDraft(null)}>
          <RaisedElsewherePanel
            summary={collectedSummary(false)}
            onRestart={() => {
              setStoppedDraft(null);
              openWizard();
            }}
            onClose={() => setStoppedDraft(null)}
          />
        </ModalOverlay>
      )}
      {wizardOpen && (
        <ModalOverlay onClose={closeWizard}>
          <Wizard
            steps={wizardSteps}
            currentStep={wizardStep}
            onStepChange={setWizardStep}
            onCancel={closeWizard}
            onComplete={submitWizard}
            isStepValid={isStepValid}
            completeLabel={t('contracts.wizard.complete')}
          />
        </ModalOverlay>
      )}
    </AppShellV2>
  );
};

// Wrapper: reads the buyer-side contract portfolio (contracts + obligations
// scoped via parent contract) through the scoped hooks and renders the four
// honest states; the workspace inner keeps its local (Phase-2′, non-persisting)
// contract-creation wizard state seeded from the resolved reads.
/** @type {React.FC} */
const BuyerContracts = () => {
  const { t } = useTranslation();
  const contractsQuery = useContracts();
  const obligationsQuery = useObligations();
  const suppliersQuery = useSuppliers();
  const CONTRACTS_CRUMB = [t('contracts.crumb.acquire'), t('contracts.crumb.contracts')];

  if (contractsQuery.isPending || obligationsQuery.isPending || suppliersQuery.isPending)
    return <LoadingState breadcrumb={CONTRACTS_CRUMB} />;
  if (contractsQuery.isError || obligationsQuery.isError || suppliersQuery.isError)
    return (
      <ErrorState
        breadcrumb={CONTRACTS_CRUMB}
        error={contractsQuery.error ?? obligationsQuery.error ?? suppliersQuery.error}
        onRetry={() => {
          contractsQuery.refetch();
          obligationsQuery.refetch();
          suppliersQuery.refetch();
        }}
      />
    );

  const baseContracts = contractsQuery.data?.items ?? [];
  if (baseContracts.length === 0)
    return (
      <EmptyState
        breadcrumb={CONTRACTS_CRUMB}
        title={t('contracts.state.empty.title')}
        subtitle={t('contracts.state.empty.subtitle')}
        message={t('contracts.state.empty.message')}
      />
    );

  return (
    <ContractsWorkspace
      baseContracts={baseContracts}
      obligations={obligationsQuery.data?.items ?? []}
      suppliers={suppliersQuery.data?.items ?? []}
    />
  );
};

export default BuyerContracts;
