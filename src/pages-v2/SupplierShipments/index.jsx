/** @import React from 'react' */
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import ProvenanceMarker from '@components/ui-v2/ProvenanceMarker';
import SubTabs from '@components/ui-v2/SubTabs';
/** @import { WizardStep } from '@components/ui-v2/Wizard' */
import Wizard from '@components/ui-v2/Wizard';
import { useUrlEnumParam } from '@hooks/useUrlEnumParam';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { useTranslation } from 'react-i18next';
import { useCurrentIdentity } from '@context/CurrentIdentityContext';
import {
  useAdvanceShipNoticeCancel,
  useAdvanceShipNoticeCreate,
  useAdvanceShipNoticeRequestException,
  useAdvanceShipNoticeSubmit
} from '@services/query/commandHooks';
import NoSupplierIdentity from '@components/ui-v2/NoSupplierIdentity';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import EmptyState from '@components/ui-v2/EmptyState';
/** @import { AsnStatus } from '@services/data/types' */
/** @import { StatusFilter, TabKey } from './const' */
import { OrderNotFound, PoFilterBanner, drilledPoId } from '../orders/PoDrillFilter';
import { isConfirmedAndAccepted } from '@services/transitions/callOffRules';
import { CALL_OFF_PARAM, useAsnWizardAvailability } from '../shipments/asnWizardEntry';
import { poSelection, readWizard } from './utils';
import { useShipmentsData } from './hooks/useShipmentsData';
import { useExpandedAsns } from './hooks/useExpandedAsns';
import { useAsnSubmitDrawer } from './hooks/useAsnSubmitDrawer';
import { useAsnRowCommands } from './hooks/useAsnRowCommands';
import { useAsnWizard } from './hooks/useAsnWizard';
import ShipmentsKpiRow from './components/ShipmentsKpiRow';
import ShipmentsList from './components/ShipmentsList';
import WizardSelectStep from './components/WizardSelectStep';
import WizardDetailsStep from './components/WizardDetailsStep';
import WizardReviewStep from './components/WizardReviewStep';
import SubmitAsnPanel from './components/SubmitAsnPanel';
import CancelAsnPanel from './components/CancelAsnPanel';

/**
 * The supplier's shipments page (`/supplier/shipments`): KPI tiles by ASN
 * status, the PO drill-through banner, and two tabs — the ASN list and the
 * Create-ASN wizard — plus the Submit and Cancel drawers. It owns the tab, the
 * status filter and the one instance of each ASN mutation; the sections live
 * in `components/` and their state and handlers in `hooks/`.
 * @type {React.FC}
 */
const SupplierShipments = () => {
  const { t } = useTranslation();
  const SHIPMENTS_CRUMB = [
    t('supplierShipments.crumb.transact'),
    t('supplierShipments.crumb.shipments')
  ];
  const { identity } = useCurrentIdentity();
  const { supplierId } = identity;
  const createAsnMutation = useAdvanceShipNoticeCreate();
  const submitAsnMutation = useAdvanceShipNoticeSubmit();
  const requestExceptionMutation = useAdvanceShipNoticeRequestException();
  const cancelAsnMutation = useAdvanceShipNoticeCancel();
  // ⚠️ **THE WIZARD TAB IS A SECOND ENTRY TO THE SAME VERBS, AND THE FIRST PASS
  // OF THIS BATCH MISSED IT** — `IMPORTER-PRESENCE-IS-NOT-VERB-COVERAGE-01` for
  // the third time, on the seat that was applying the rule. The row-level create
  // inside `ShipmentsList` was gated; this tab opens a three-step wizard that
  // dispatches `t_asn_create` AND `t_asn_submit` at `onComplete`, and it stayed
  // live for a seat holding neither. **The unit suite could not see it** — no
  // spec drove the tab — and it was found by walking a narrowed seat across the
  // built bundle, which is exactly what that QA bar exists for.
  //
  // BOTH atoms, because the wizard fires both: offering it on a seat that can
  // create but not submit would strand a draft at the last click. The PO and
  // call-off pages that open this wizard ask the same pair through the same hook.
  const wizardEntry = useAsnWizardAvailability();
  const wizardHeld = wizardEntry.held;
  const [tab, setTab] = useState(/** @type {TabKey} */ ('shipments'));
  // Deep-link read: `?tab=create` lands "confirmed orders ready to ship" on
  // the create-ASN tab.
  useUrlEnumParam('tab', /** @type {TabKey[]} */ (['shipments', 'create']), setTab);
  const [statusFilter, setStatusFilter] = useState(/** @type {StatusFilter} */ ('All'));
  const wizard = useAsnWizard({
    setTab,
    createAsnMutation,
    submitAsnMutation,
    requestExceptionMutation
  });

  const {
    supplierQuery,
    asnsQuery,
    callOffsQuery,
    callOffViewList,
    posQuery,
    mySupplier,
    asns,
    declaredBatches,
    drill,
    drilledPo,
    visibleAsns,
    SHIPPABLE_POS,
    CONFIRMED_POS,
    counts
  } = useShipmentsData(supplierId);
  const { expanded, toggleExpand } = useExpandedAsns(drilledPo, visibleAsns);

  // IA-S01 / IA-S04 — `?tab=create&po=<id>` (and `&callOff=<id>`) starts the
  // wizard for that PO, as if its card had been picked, and for that call-off
  // when it is a confirmed one on the PO. Applied once per address, so a
  // supplier who then picks another PO is not overruled; a PO that is not
  // shippable, or a call-off that is not confirmed, leaves the choice open.
  const [searchParams] = useSearchParams();
  const startedFor = useRef('');
  const startPoId = searchParams.get('tab') === 'create' ? drilledPoId(drill) : null;
  const startCallOffId = searchParams.get(CALL_OFF_PARAM);
  useEffect(() => {
    if (startPoId === null) return;
    if (startCallOffId !== null && callOffsQuery.isPending) return;
    const key = `${startPoId}|${startCallOffId ?? ''}`;
    if (startedFor.current === key) return;
    const po = SHIPPABLE_POS.find((p) => p.id === startPoId);
    if (!po) return;
    startedFor.current = key;
    const callOff = (callOffsQuery.data?.items ?? []).find(
      (c) => c.id === startCallOffId && c.poId === po.id && isConfirmedAndAccepted(c)
    );
    wizard.updateForm({ ...poSelection(po, asns), ...(callOff ? { callOffId: callOff.id } : {}) });
    // `wizard.updateForm` is a fresh closure each render over a state setter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startPoId, startCallOffId, SHIPPABLE_POS, asns, callOffsQuery.isPending, callOffsQuery.data]);
  const drawer = useAsnSubmitDrawer({
    asns,
    shippablePos: SHIPPABLE_POS,
    declaredBatches,
    submitAsnMutation,
    requestExceptionMutation
  });
  const { cancelTarget, setCancelTarget, doCancelAsn, createAsnForPO } = useAsnRowCommands({
    confirmedPos: CONFIRMED_POS,
    setStatusFilter,
    setTab,
    createAsnMutation,
    cancelAsnMutation
  });

  /** @param {AsnStatus} s */
  const setKpiFilter = (s) => {
    setStatusFilter((prev) => (prev === s ? 'All' : s));
    setTab('shipments');
  };

  if (!supplierId) return <NoSupplierIdentity />;
  if (supplierQuery.isPending || asnsQuery.isPending || posQuery.isPending)
    return <LoadingState breadcrumb={SHIPMENTS_CRUMB} />;
  if (supplierQuery.isError || asnsQuery.isError || posQuery.isError)
    return (
      <ErrorState
        breadcrumb={SHIPMENTS_CRUMB}
        error={supplierQuery.error ?? asnsQuery.error ?? posQuery.error}
        onRetry={() => {
          supplierQuery.refetch();
          asnsQuery.refetch();
          posQuery.refetch();
        }}
      />
    );
  if (!mySupplier) return <NoSupplierIdentity />;
  // AC-07 / AC-08 — identical refusal for an unknown PO and another supplier's.
  if (drill.kind === 'pending') return <LoadingState breadcrumb={SHIPMENTS_CRUMB} />;
  if (drill.kind === 'notFound')
    return <OrderNotFound persona="supplier" breadcrumb={SHIPMENTS_CRUMB} />;
  if (asns.length === 0 && SHIPPABLE_POS.length === 0)
    return (
      <EmptyState
        breadcrumb={SHIPMENTS_CRUMB}
        title={t('supplierShipments.empty.title')}
        subtitle={t('supplierShipments.empty.subtitle')}
        message={t('supplierShipments.empty.message')}
      />
    );

  const { form, updateForm } = wizard;
  const { selectedPO, wizardOpenLines, wizardRead, wizardWarnings, isStepValid } = readWizard({
    form,
    shippablePos: SHIPPABLE_POS,
    asns,
    declaredBatches,
    callOffViewList
  });

  /** @type {WizardStep[]} */
  const wizardSteps = [
    {
      id: 'select',
      title: t('supplierShipments.wizard.select.title'),
      shortTitle: t('supplierShipments.wizard.select.short'),
      description: t('supplierShipments.wizard.select.desc'),
      content: (
        <WizardSelectStep
          shippablePos={SHIPPABLE_POS}
          asns={asns}
          form={form}
          updateForm={updateForm}
          selectedPO={selectedPO}
          callOffs={callOffsQuery.data?.items ?? []}
        />
      )
    },
    {
      id: 'details',
      title: t('supplierShipments.wizard.details.title'),
      shortTitle: t('supplierShipments.wizard.details.short'),
      description: t('supplierShipments.wizard.details.desc'),
      content: (
        <WizardDetailsStep
          form={form}
          updateForm={updateForm}
          onLineChange={wizard.setLine}
          wizardOpenLines={wizardOpenLines}
          wizardRead={wizardRead}
          declaredBatches={declaredBatches}
        />
      )
    },
    {
      id: 'review',
      title: t('supplierShipments.wizard.review.title'),
      shortTitle: t('supplierShipments.wizard.review.short'),
      description: t('supplierShipments.wizard.review.desc'),
      content: (
        <WizardReviewStep
          form={form}
          updateForm={updateForm}
          selectedPO={selectedPO}
          wizardRead={wizardRead}
          wizardWarnings={wizardWarnings}
        />
      )
    }
  ];

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={SHIPMENTS_CRUMB}
        title={t('supplierShipments.header.title')}
        subtitle={t('supplierShipments.header.subtitle', { name: mySupplier.name })}
      />

      <PageMetaLine className="-mt-6 mb-6">
        {t('supplierShipments.meta.summary', {
          shipments: asns.length,
          pos: SHIPPABLE_POS.length
        })}
        {/* D-CENSUS-8 — PARTLY REAL, both axes. ASN create + submit dispatch through
            the wired `advanceShipNotice` target and cascade into goods receipt; the
            POs being shipped against are fixtures. */}
        <ProvenanceMarker capability="advanceShipNotices" className="ml-3 align-middle" />
      </PageMetaLine>

      <ShipmentsKpiRow counts={counts} statusFilter={statusFilter} onSelect={setKpiFilter} />

      {/* BR-04 / AC-02 — the filter is visible, and the way back is offered.
        IA F-4 — the count is the shipment list's, so it shows on that tab only;
        on the ASN form it would read "No record on this order" before one exists. */}
      <PoFilterBanner
        drill={drill}
        persona="supplier"
        count={tab === 'shipments' ? visibleAsns.length : undefined}
      />

      <SubTabs
        options={[
          {
            id: 'shipments',
            label: t('supplierShipments.tab.myShipments'),
            count: visibleAsns.length
          },
          // Withheld rather than disabled — §73's rule, applied to a tab: a seat
          // that cannot finish the wizard is not offered its first step.
          ...(wizardHeld
            ? [
                {
                  id: /** @type {TabKey} */ ('create'),
                  label: t('supplierShipments.tab.createAsn')
                }
              ]
            : [])
        ]}
        value={tab}
        onChange={setTab}
        className="mb-5"
      />

      {tab === 'shipments' && (
        <ShipmentsList
          asns={visibleAsns}
          statusFilter={statusFilter}
          expanded={expanded}
          onToggleExpand={toggleExpand}
          onSubmitAsn={drawer.openSubmitForm}
          onCancelAsn={setCancelTarget}
          onCreateAsnForPO={createAsnForPO}
          confirmedPOs={CONFIRMED_POS}
        />
      )}

      {tab === 'create' && !wizardHeld && (
        // Belt AND braces here, unlike the dead-branch cases elsewhere: `tab` is
        // component STATE, so a seat narrowed WHILE the wizard is open lands
        // here with the tab already selected. That is reachable, so it is not a
        // dead branch — it is the one place on this page where the notice has to
        // answer in the body rather than in the tab row.
        <HandoffNotice availability={wizardEntry.notice} testId="handoff-asn-wizard" />
      )}

      {tab === 'create' && wizardHeld && (
        <Wizard
          steps={wizardSteps}
          currentStep={wizard.step}
          onStepChange={wizard.setStep}
          onCancel={wizard.resetWizard}
          onComplete={() => wizard.completeWizard(selectedPO, wizardRead)}
          isStepValid={isStepValid}
          completeLabel={
            wizardRead.onlyShelfLife
              ? t('fc.asn.shelfLife.request.action')
              : t('asn.submit.confirm')
          }
        />
      )}

      <SubmitAsnPanel
        submitTarget={drawer.submitTarget}
        submitForm={drawer.submitForm}
        setSubmitForm={drawer.setSubmitForm}
        onClose={() => drawer.setSubmitTarget(null)}
        onSubmit={drawer.doSubmitAsn}
        submitLinesFor={drawer.submitLinesForAsn}
        readSubmitLines={drawer.readSubmitLines}
        declaredBatches={declaredBatches}
        callOffViewList={callOffViewList}
        asns={asns}
        submitPending={submitAsnMutation.isPending}
        requestPending={requestExceptionMutation.isPending}
      />

      <CancelAsnPanel
        cancelTarget={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={doCancelAsn}
        pending={cancelAsnMutation.isPending}
      />
    </AppShellV2>
  );
};

export default SupplierShipments;
