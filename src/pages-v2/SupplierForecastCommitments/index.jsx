/** @import React from 'react' */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { OrderNotFound, PoFilterBanner, usePoDrillFilter } from '../orders/PoDrillFilter';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import SampleDataBadge from '@components/ui-v2/SampleDataBadge';
import SubTabs from '@components/ui-v2/SubTabs';
import Data from '@components/ui-v2/Data';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import EmptyState from '@components/ui-v2/EmptyState';
import NoSupplierIdentity from '@components/ui-v2/NoSupplierIdentity';
import SupplierReliabilityPanel from '../reliability/SupplierReliabilityPanel';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { useUrlEnumParam } from '@hooks/useUrlEnumParam';
import { useCurrentIdentity } from '@context/CurrentIdentityContext';
import { formatDate } from '@lib/format';
import {
  useCapacityPlans,
  useForecastCommitments,
  useForecastVersions
} from '@services/query/hooks';
import { horizonWeeks } from '@services/transitions/capacityRules';
import { usePlanningGroupLabel } from '../inventory/planningGroupDisplay';
/** @import { ForecastStream } from '@services/sdc/types' */
import { useActiveReasonCodes, useReasonLabel } from '../admin/reasonCodeDisplay';
import { deadlineState } from '@services/transitions/forecastRules';
import { forecastNow, useForecastRunner, usePeriodLabel } from '../forecasts/forecastDisplay';
/** @import { PageTab, ViewMode, WeekReason } from './const' */
import { PAGE_TABS } from './const';
import { buildPeriodRows } from './utils';
import { useCommitmentActions } from './hooks/useCommitmentActions';
import { useCommitmentDrafts } from './hooks/useCommitmentDrafts';
import { useCommitmentUpload } from './hooks/useCommitmentUpload';
import { useRecordView } from './hooks/useRecordView';
import ChangesTable from './components/ChangesTable';
import CommitmentsBanner from './components/CommitmentsBanner';
import DueRuleNote from './components/DueRuleNote';
import MaterialSection from './components/MaterialSection';
import PeriodSubmitSection from './components/PeriodSubmitSection';
import VersionSection from './components/VersionSection';
import ViewToolbar from './components/ViewToolbar';
import PageTabs from './components/PageTabs';
import SampleResponsesTab from './components/SampleResponsesTab';

// ─────────────────────────────────────────────────────────────────────────────
// SUPPLIER FORECAST & COMMITMENTS — REQ-E06-01 (SUP) and REQ-E06-02.
//
// The supplier's own materials only (BR-07), per forecast stream: the current
// version with each period's zone, what changed since the previous version
// (BR-06), a spreadsheet download (AC-03), and the commitment per period —
// quantity and date for Firm and Trade-off, acknowledgement for Forecast
// (BR-08), pre-filled with the forecast quantity (BR-09), a starter reason
// below forecast (BR-04), and an optional upside. Commitments can also come
// from the spreadsheet template, checked row by row (BR-06). Opening a version
// records the view PTI sees. The verbs' policies decide; the form mirrors them.
//
// BL-133 (ENG-D18, ENG-D19) — capacity before the LTP. Commitments are
// SUBMITTED one period at a time with "Submit all", every material of the
// period together (a row keeps only Save draft). A period cannot be submitted
// until the supplier has confirmed capacity for every horizon week it touches,
// and a period whose group LTP is above BE (capacity + additional capacity) needs a
// reason. The submit verb's policy (`rr_promote_capacity_confirmed`) refuses
// both by name; this panel mirrors it so the supplier sees why before trying.
//
// Split into a folder (frontend-standard Phase 5): the sections live in
// `components/`, the drafts, upload, acts and view record in `hooks/`, the
// pure helpers in `utils.js` and the shared typedefs in `const.js`. This file
// keeps the page's reads, its derived state and the render order.
//
// P-04 (IA-S03) — one commitments page: the content above is the first,
// default tab, and the earlier responses and incoming-shipment reports
// (SDC-2b/3b, which read the published sample plan) are the second,
// `?tab=responses`. The deep-link reads (`stream`, `material`, `po`) are made
// once, whichever tab opens.
// ─────────────────────────────────────────────────────────────────────────────

/** @type {React.FC} */
const SupplierForecastCommitments = () => {
  const { t, i18n } = useTranslation();
  // BL-32 — the administrator's list in force: only active codes are offered.
  const commitmentReasons = useActiveReasonCodes('commitmentShortfall');
  const reasonLabel = useReasonLabel();
  const groupLabel = usePlanningGroupLabel();
  const { identity } = useCurrentIdentity();
  const [params] = useSearchParams();
  // P-04 — the tab: read once on arrival, and again when the address changes.
  const [tab, setTab] = useState(
    /** @type {PageTab} */ (params.get('tab') === 'responses' ? 'responses' : 'commitments')
  );
  useUrlEnumParam('tab', PAGE_TABS, setTab);
  const linesQuery = useForecastCommitments();
  const plansQuery = useCapacityPlans();
  const [weekReasons, setWeekReasons] = useState(/** @type {Record<string, WeekReason>} */ ({}));
  const versionsQuery = useForecastVersions();
  const submitAvail = useVerbAvailability('requirementresponse:submit');
  const ackAvail = useVerbAvailability('requirementresponse:acknowledge');
  const viewAvail = useVerbAvailability('forecast:view');
  const { run, pending } = useForecastRunner();
  const periodLabel = usePeriodLabel();
  const nowIso = forecastNow();
  const crumb = [t('hub.nav.section.planning'), t('fc.sup.title')];

  // REQ-E07-03 BR-05 — a PO's foresight destination is its supplier's own
  // commitments for that PO's materials. A supplier addressing another
  // supplier's PO gets `notFound`: its PO read never returned it (BR-06).
  const drill = usePoDrillFilter();
  const drillMaterials = drill.kind === 'filtered' ? drill.materials : null;
  // Deep-link read: `?stream=` (one-shot, like `?material=` below) pre-selects
  // the stream. An unknown value is ignored by `activeStream`'s own
  // `streams.includes(stream)` check, so no separate whitelist is needed here.
  const [stream, setStream] = useState(/** @type {ForecastStream | null} */ (params.get('stream')));
  const [mode, setMode] = useState(/** @type {ViewMode} */ ('forecast'));
  const [material, setMaterial] = useState(/** @type {string} */ (params.get('material') ?? ''));
  const { drafts, setDrafts, rowDraft, setRow, readRow } = useCommitmentDrafts();

  const lines = useMemo(() => linesQuery.data?.items ?? [], [linesQuery.data]);
  const versions = useMemo(() => versionsQuery.data?.items ?? [], [versionsQuery.data]);
  const streams = [...new Set(lines.map((l) => l.stream))];
  /** @type {ForecastStream | null} */
  const activeStream =
    stream && streams.includes(stream)
      ? stream
      : (lines.find((l) => l.materialCode === material)?.stream ?? streams[0] ?? null);
  const streamLines = lines.filter((l) => l.stream === activeStream);
  const current = versions.find((v) => v.stream === activeStream && v.isCurrent) ?? null;
  const previous = current
    ? (versions.find((v) => v.stream === activeStream && v.version === current.version - 1) ?? null)
    : null;
  const supplierId = identity.supplierId;

  const { upload, fileError, busy, fileRef, handleFile } = useCommitmentUpload(run, streamLines);
  const { commitRow, acknowledge, submitAll } = useCommitmentActions({
    run,
    readRow,
    setDrafts,
    setWeekReasons
  });

  // REQ-E06-01 — opening a version is recorded once, for PTI to see who viewed it.
  // P-04 — only the Commitments tab shows the version, so only it records the view.
  useRecordView(tab === 'commitments' ? current : null, supplierId, viewAvail, run);

  if (!supplierId) return <NoSupplierIdentity />;
  // P-04 — the Responses & shipments tab reads its own stores, so it waits for none of the reads below.
  if (tab === 'responses')
    return (
      <AppShellV2>
        <PageHeader breadcrumb={crumb} title={t('fc.sup.title')} subtitle={t('fc.sup.subtitle')} />
        <PageMetaLine className="-mt-6 mb-4">
          {t('fc.asOf')} <Data>{formatDate(nowIso)}</Data>
          <SampleDataBadge className="ml-3 align-middle" />
        </PageMetaLine>
        <PageTabs value={tab} onChange={setTab} />
        <SampleResponsesTab />
      </AppShellV2>
    );
  if (linesQuery.isPending || versionsQuery.isPending || plansQuery.isPending)
    return <LoadingState breadcrumb={crumb} />;
  if (drill.kind === 'pending') return <LoadingState breadcrumb={crumb} />;
  // AC-07 / AC-08 — identical refusal for an unknown PO and another supplier's.
  if (drill.kind === 'notFound') return <OrderNotFound persona="supplier" breadcrumb={crumb} />;
  if (linesQuery.isError)
    return (
      <ErrorState
        breadcrumb={crumb}
        error={linesQuery.error}
        onRetry={() => linesQuery.refetch()}
      />
    );
  if (lines.length === 0 || !activeStream)
    return (
      <EmptyState
        breadcrumb={crumb}
        title={t('fc.sup.title')}
        subtitle={t('fc.sup.subtitle')}
        message={t('fc.sup.empty')}
      />
    );

  const materials = [...new Set(streamLines.map((l) => l.materialCode))];
  const shownMaterials = materials
    .filter((m) => material === '' || !materials.includes(material) || m === material)
    // A PO spanning several materials narrows to all of them at once.
    .filter(
      (m) => drillMaterials === null || drillMaterials.length === 0 || drillMaterials.includes(m)
    );
  const overdue = streamLines.filter((l) => deadlineState(l, nowIso) === 'overdue').length;
  const awaiting = streamLines.filter(
    (l) => l.state === 'awaiting' || l.state === 'revisionRequested'
  ).length;
  const changed = streamLines.filter(
    (l) => l.previousQty !== null && l.previousQty !== l.forecastQty
  );
  const added = previous ? streamLines.filter((l) => l.previousQty === null) : [];
  const language = i18n.language.startsWith('id') ? 'id' : 'en';

  const canCommit = submitAvail.kind === 'held';
  const canAck = ackAvail.kind === 'held';

  // ── BL-133 — Submit all, one period at a time ────────────────────────────
  const plans = plansQuery.data?.items ?? [];
  const horizon = horizonWeeks(nowIso);
  const commitLines = streamLines.filter((l) => l.zone !== 'forecast');
  const periodRows = buildPeriodRows({
    commitLines,
    lines,
    plans,
    supplierId,
    horizon,
    weekReasons,
    drafts,
    rowDraft,
    readRow
  });

  return (
    <AppShellV2>
      <PageHeader breadcrumb={crumb} title={t('fc.sup.title')} subtitle={t('fc.sup.subtitle')} />
      <PageMetaLine className="-mt-6 mb-4">
        {t('fc.asOf')} <Data>{formatDate(nowIso)}</Data>
        <SampleDataBadge className="ml-3 align-middle" />
      </PageMetaLine>
      <PageTabs value={tab} onChange={setTab} />

      {/* P-04 — everything below is the first tab's panel. */}
      <div
        role="tabpanel"
        aria-label={t('fc.sup.pageTab.commitments')}
        data-testid="fc-sup-commitments-tab"
      >
        {/* REQ-E07-03 BR-04 / BR-05 — the filter, why these rows, and the way back. */}
        <PoFilterBanner
          drill={drill}
          persona="supplier"
          count={shownMaterials.length}
          reason="foresight"
        />

        {awaiting > 0 && <CommitmentsBanner awaiting={awaiting} overdue={overdue} />}

        {streams.length > 1 && (
          <SubTabs
            options={streams.map((s) => ({ id: s, label: t(`fc.stream.${s}`) }))}
            value={activeStream}
            onChange={(s) => {
              setStream(s);
              setMaterial('');
            }}
            className="mb-4"
          />
        )}

        {current && (
          <VersionSection
            activeStream={activeStream}
            current={current}
            previous={previous}
            streamLines={streamLines}
            language={language}
            canCommit={canCommit}
            fileRef={fileRef}
            busy={busy}
            fileError={fileError}
            upload={upload}
            onFile={handleFile}
          />
        )}

        {/* REQ-E14-02 BR-07 — the supplier's own reliability and PTI's plan changes on its materials. */}
        <SupplierReliabilityPanel />

        {/* BL-133 (ENG-D19) — capacity before the LTP; one Submit all per period. */}
        {periodRows.length > 0 && (
          <PeriodSubmitSection
            periodRows={periodRows}
            periodLabel={periodLabel}
            canCommit={canCommit}
            pending={pending}
            submitAvail={submitAvail}
            commitmentReasons={commitmentReasons}
            reasonLabel={reasonLabel}
            groupLabel={groupLabel}
            setWeekReasons={setWeekReasons}
            onSubmitAll={submitAll}
          />
        )}

        <ViewToolbar
          mode={mode}
          onModeChange={setMode}
          changeCount={changed.length + added.length}
          material={material}
          onMaterialChange={setMaterial}
          materials={materials}
        />

        {mode === 'changes' ? (
          <ChangesTable
            previous={previous}
            current={current}
            changed={changed}
            added={added}
            shownMaterials={shownMaterials}
            periodLabel={periodLabel}
          />
        ) : (
          <div className="space-y-6">
            {/* A11y finding 19, supplier side — the Due column's rule, once and visible, above the material tables so it is not read in every cell. */}
            <DueRuleNote />
            {shownMaterials.map((code) => (
              <MaterialSection
                key={code}
                code={code}
                mine={streamLines.filter((l) => l.materialCode === code)}
                periodLabel={periodLabel}
                nowIso={nowIso}
                canCommit={canCommit}
                canAck={canAck}
                pending={pending}
                submitAvail={submitAvail}
                ackAvail={ackAvail}
                commitmentReasons={commitmentReasons}
                reasonLabel={reasonLabel}
                readRow={readRow}
                setRow={setRow}
                onCommitRow={commitRow}
                onAcknowledge={acknowledge}
              />
            ))}
          </div>
        )}
      </div>
    </AppShellV2>
  );
};

export default SupplierForecastCommitments;
