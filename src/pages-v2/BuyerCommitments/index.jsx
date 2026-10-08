/** @import React from 'react' */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useReasonLabel } from '../admin/reasonCodeDisplay';
import { useSearchParams } from 'react-router-dom';
import { OrderNotFound, PoFilterBanner, usePoDrillFilter } from '../orders/PoDrillFilter';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import PurposeHeader from '@components/forecast/PurposeHeader';
import CycleSteps from '@components/forecast/CycleSteps';
import SimulatedDataBanner from '@components/forecast/SimulatedDataBanner';
import AboutThisPage from '@components/forecast/AboutThisPage';
import DataAsOf from '@components/forecast/DataAsOf';
import { forecastCrumb, forecastTitle } from '@components/forecast/forecastPages';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { useForecastCommitments, useForecastCoverage, useInventory } from '@services/query/hooks';
/** @import { ForecastStream } from '@services/sdc/types' */
import { commitmentDeadlineWorkingDays } from '@services/transitions/forecastConfig';
import { forecastNow, useForecastRunner, usePeriodLabel } from '../forecasts/forecastDisplay';
import { commitmentView } from './utils';
import { useCommitmentAction } from './hooks/useCommitmentAction';
import CommitmentFilters from './components/CommitmentFilters';
import ExceptionsSection from './components/ExceptionsSection';
import CoverageDetails from './components/CoverageDetails';
import SupplierCoverage from './components/SupplierCoverage';
import ActionPanel from './components/ActionPanel';

// ─────────────────────────────────────────────────────────────────────────────
// PTI COMMITMENTS & GAPS — REQ-E06-03 (with REQ-E06-02 from the planner's side).
//
// Per stream: a ranked exception list (overdue first, then Firm, then lowest
// days of supply — BR-04) with the planner's three actions (accept, request
// revision with a note the supplier reads, move the period's demand to another
// qualified supplier with a note — BR-05); the material × period grid of
// commitment against forecast coloured per CR-22 (BR-01, BR-02); cumulative
// commitment against cumulative forecast per material (BR-03); and supplier
// coverage per material with distributor lead times, labelled an estimate
// (BR-07). Commitments within tolerance need no action (REQ-E06-02 BR-05), and
// drafts never appear (BR-10). The supplier follow-up list stays available.
//
// Split into a folder (frontend-standard Phase 5, PAGE-SPLIT-GUIDE): this file
// holds the page's state, queries and early returns; the sections live in
// `components/`, the action state and submit in `hooks/useCommitmentAction`,
// and the derived view in `utils.commitmentView`.
// ─────────────────────────────────────────────────────────────────────────────

/** @type {React.FC} */
const BuyerCommitments = () => {
  const { t } = useTranslation();
  const reasonLabel = useReasonLabel();
  // BL-32 — the rule texts state the administrator's values in force, never a
  // number written into the sentence.
  const dueDays = commitmentDeadlineWorkingDays();
  const dueRule = t('fc.col.dueRule', {
    firm: t('adminSet.unit.workingDays', { count: dueDays.firm }),
    other: t('adminSet.unit.workingDays', { count: dueDays.other })
  });
  const [params] = useSearchParams();
  const linesQuery = useForecastCommitments();
  const coverageQuery = useForecastCoverage();
  const inventory = useInventory();
  const review = useVerbAvailability('requirementresponse:dispute');
  const publish = useVerbAvailability('forecast:publish');
  const { run, pending } = useForecastRunner();
  const periodLabel = usePeriodLabel();
  const nowIso = forecastNow();
  const crumb = forecastCrumb(t, 'responses');

  // ── REQ-E07-03 BR-05 / AC-04 ──────────────────────────────────────────────
  // Foresight is agreed per material and period, not per order, so a PO's
  // destination is its SUPPLIER and its MATERIALS. The `material` parameter this
  // page already read is the singular case of that; `materials` carries the rest
  // when a PO spans several.
  const drill = usePoDrillFilter();
  const drillMaterials = drill.kind === 'filtered' ? drill.materials : null;
  const [stream, setStream] = useState(/** @type {ForecastStream | null} */ (null));
  const [supplier, setSupplier] = useState(drill.kind === 'filtered' ? drill.po.supplierId : '');
  const [material, setMaterial] = useState(params.get('material') ?? '');
  const { action, setAction, note, setNote, toSupplier, setToSupplier, openAction, submitAction } =
    useCommitmentAction(run, t);

  const lines = useMemo(() => linesQuery.data?.items ?? [], [linesQuery.data]);

  if (linesQuery.isPending || drill.kind === 'pending') return <LoadingState breadcrumb={crumb} />;
  // AC-08 — an address naming a PO that does not exist, with a way back.
  if (drill.kind === 'notFound') return <OrderNotFound persona="buyer" breadcrumb={crumb} />;
  if (linesQuery.isError)
    return (
      <ErrorState
        breadcrumb={crumb}
        error={linesQuery.error}
        onRetry={() => linesQuery.refetch()}
      />
    );

  const {
    activeStream,
    suppliers,
    materials,
    shown,
    daysOfSupplyOf,
    exceptions,
    missing,
    outside,
    periods,
    rows,
    coverage
  } = commitmentView({
    lines,
    stream,
    supplier,
    material,
    drillMaterials,
    positions: inventory.data?.items ?? [],
    coverageRows: coverageQuery.data?.items ?? [],
    nowIso
  });

  return (
    <AppShellV2>
      <PageHeader breadcrumb={crumb} title={forecastTitle(t, 'responses')} />
      <PurposeHeader page="responses" />
      <CycleSteps current="responses" />
      <SimulatedDataBanner capability="forecastPublications" />
      <DataAsOf date={nowIso} />

      {(missing > 0 || outside > 0) && (
        <div
          role="status"
          data-testid="fc-pti-gaps-banner"
          className="bg-danger-soft border-l-2 border-danger rounded px-4 py-3 mb-4 text-sm text-danger"
        >
          {t('fc.pti.gaps.banner', { exceptions: outside, missing })}
        </div>
      )}

      <CommitmentFilters
        activeStream={activeStream}
        onStreamChange={(s) => {
          setStream(s);
          setSupplier('');
          setMaterial('');
        }}
        supplier={supplier}
        onSupplierChange={setSupplier}
        suppliers={suppliers}
        material={material}
        onMaterialChange={setMaterial}
        materials={materials}
      />

      {/* REQ-E07-03 BR-04 / BR-05 — the filter, why these rows, and the way back. */}
      <PoFilterBanner drill={drill} persona="buyer" count={shown.length} reason="foresight" />

      {/* BR-04 / BR-05 — the ranked exception list and the planner's actions. */}
      <ExceptionsSection
        exceptions={exceptions}
        dueRule={dueRule}
        daysOfSupplyOf={daysOfSupplyOf}
        periodLabel={periodLabel}
        reasonLabel={reasonLabel}
        nowIso={nowIso}
        review={review}
        publish={publish}
        onAction={openAction}
      />

      {/* F-23 — the exceptions drive action; the grid and the cumulative chart
          are context, collapsed below them. Same data, same order inside. */}
      <CoverageDetails
        shown={shown}
        rows={rows}
        periods={periods}
        periodLabel={periodLabel}
        nowIso={nowIso}
      />

      {/* BR-07 — supplier coverage per material (CR-03), an estimate. */}
      <SupplierCoverage coverage={coverage} />

      <AboutThisPage>
        <p>{t('fc.pti.gaps.subtitle')}</p>
      </AboutThisPage>

      <ActionPanel
        action={action}
        onClose={() => setAction(null)}
        pending={pending}
        note={note}
        onNoteChange={setNote}
        toSupplier={toSupplier}
        onToSupplierChange={setToSupplier}
        onSubmit={submitAction}
        periodLabel={periodLabel}
      />
    </AppShellV2>
  );
};

export default BuyerCommitments;
