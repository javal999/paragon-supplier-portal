/** @import React from 'react' */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import Tabs from '@components/ui-v2/Tabs';
import {
  OrderNotFound,
  PoFilterBanner,
  drilledPoId,
  usePoDrillFilter
} from '../orders/PoDrillFilter';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import SampleDataBadge from '@components/ui-v2/SampleDataBadge';
import SidePanel from '@components/ui-v2/SidePanel';
import Data from '@components/ui-v2/Data';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import { useToast } from '@hooks/useToast';
import { useRefusalText } from '@hooks/useRefusalText';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { useUrlEnumParam } from '@hooks/useUrlEnumParam';
import { usePageTab } from '@hooks/usePageTab';
import { useRowHighlight } from '@hooks/useRowHighlight';
import { formatDate } from '@lib/format';
import { useBlanketPoRunOuts, usePurchaseOrders } from '@services/query/hooks';
import { runningOut } from '@services/transitions/blanketPoRules';
import { RunningOutList } from '../callOffs/blanketRunOutDisplay';
import { useCallOffCommand } from '@services/query/commandHooks';
/** @import { CallOffType, POLineItem } from '@services/data/types' */
import { POStatus } from '@services/data/types';
/** @import { CallOffView, ReleaseCheck } from '@services/transitions/callOffRules' */
import { deliveryDrift, releaseCheck } from '@services/transitions/callOffRules';
/** @import { ReleaseCadence } from '@services/delivery/types' */
import { numberOf, useCallOffViews } from '../callOffs/callOffDisplay';
import { ptiPicOf, usePicFilter } from '../materials/picDisplay';
import { useMaterialMatcher } from '@components/ui-v2/MaterialSearch';
import { searchMaterials } from '@services/transitions/matchMaterial';
import { CALL_OFF_TABS } from './const';
/** @import { CallOffTab } from './const' */
import { impliedCallOffTab } from './utils';
/** @import { Panel, SeriesRow, StatusFilter } from './utils' */
import CallOffBanner from './components/CallOffBanner';
import CallOffFilters from './components/CallOffFilters';
import CallOffPanelBody from './components/CallOffPanelBody';
import NewCallOffPanel from './components/NewCallOffPanel';
import UmbrellaSection from './components/UmbrellaSection';
import { callOffActions } from './hooks/callOffActions';
import { useCallOffSections } from './hooks/useCallOffSections';
import { useHighlightArrival } from './hooks/useHighlightArrival';
import { useLinkedAsns } from './hooks/useLinkedAsns';
import { usePrefillFromSimulation } from './hooks/usePrefillFromSimulation';
import { useSeriesPreview } from './hooks/useSeriesPreview';

export { CALL_OFF_TABS } from './const';
export { impliedCallOffTab } from './utils';

// ─────────────────────────────────────────────────────────────────────────────
// PTI CALL-OFFS — REQ-E09-01 (release, series), REQ-E09-03 (confirmation
// review), REQ-E09-04 (delivery follow-up).
//
// One section per umbrella PO line (supplier + material): remaining quantity
// and value (CR-04), its call-offs with confirmation and delivery status, and
// the planner's actions. Every rule the form mirrors is enforced again by the
// verb's policy — the page never decides what is allowed.
//
// P-12 (IA-B06) — TABS, THE DECISION FIRST. The header, the as-of line with
// the Sample data badge, the PO drill-through banner and the action banner
// stay above the tabs. "To act" holds what the banner counts: the umbrella
// lines with a call-off awaiting approval, escalated or at risk (only those
// rows), and the lines with delivery drift (all their rows), with the status
// chips that narrow it. "All call-offs" holds every umbrella line and every
// call-off. "Blanket POs running out" holds the run-out list (CAP-9). Search
// and the PIC filter work on both call-off tabs. The tab is
// `?tab=toAct|all|runOut`; without one, `?status=` opens To act (All for
// `status=all`), and `?po=`, `?newFor=` and `?highlight=` open All call-offs.
//
// IA-B13 — `?highlight=<call-off id>` (the link What to order and Make
// warehouse room show after a draft or a change) opens All call-offs on that
// row, marks it and opens its panel.
//
// Phase 5 page split: the sections live in `components/`, the derivations in
// `hooks/`, the helpers in `utils.js` and `const.js`. Every piece of state
// stays here, so it survives the loading and error returns and any section
// unmounting.
// ─────────────────────────────────────────────────────────────────────────────

/** @type {React.FC} */
const BuyerCallOffs = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const refusalText = useRefusalText();
  const posQuery = usePurchaseOrders({
    status: [POStatus.CONFIRMED, POStatus.PARTIALLY_DELIVERED]
  });
  const { views, nowIso, isPending, error, refetch, asns } = useCallOffViews();
  // CAP-9 — every blanket PO line's run-out, projected by the read model.
  const runOutQuery = useBlanketPoRunOuts();
  // MR-6 BR-12 (edge case 6) — each call-off's ASNs with the CURRENT comparison,
  // recomputed on read: the planner's "Mismatch" marker.
  const linkedAsns = useLinkedAsns(views, asns);
  const command = useCallOffCommand();
  const planAvailability = useVerbAvailability('calloff:plan');
  const reviewAvailability = useVerbAvailability('calloff:review');
  const [panel, setPanel] = useState(/** @type {Panel} */ (null));
  const [form, setForm] = useState({
    quantity: '',
    needDate: '',
    type: /** @type {CallOffType} */ ('forecast'),
    reason: '',
    comment: ''
  });
  const [series, setSeries] = useState({
    total: '',
    perCallOff: '',
    cadence: /** @type {ReleaseCadence} */ ('weekly'),
    firstDate: ''
  });
  const [seriesRows, setSeriesRows] = useState(/** @type {SeriesRow[]} */ ([]));
  // Counts previews, so each preview's rows get fresh ids (SeriesRow.id).
  const previewSeries = useSeriesPreview(series, setSeriesRows);
  const crumb = [t('hub.nav.section.calloffs'), t('co.pti.title')];
  const today = nowIso.slice(0, 10);
  // REQ-E07-03 — the drill-through filter from the order summary.
  const drill = usePoDrillFilter();
  // Material C4 — the PIC filter, kept in the page address (MR-5 BR-03).
  const pic = usePicFilter();
  // Material C3 — the one material search (MR-3 BR-04).
  const [search, setSearch] = useState('');
  const matchOf = useMaterialMatcher();
  const drilledPo = drilledPoId(drill);
  const [addressParams] = useSearchParams();
  const { tab, select } = usePageTab(CALL_OFF_TABS, impliedCallOffTab(addressParams));
  const onToAct = tab === 'toAct';
  // IA-B13 — the one call-off a link names, looked up in every call-off.
  const highlight = useRowHighlight((id) => views.some((v) => v.callOff.id === id));
  const [statusFilter, setStatusFilter] = useState(/** @type {StatusFilter} */ ('all'));
  // Deep-link read: `?status=` narrows the My Tasks call-off tasks to the
  // umbrella rows that match.
  useUrlEnumParam(
    'status',
    /** @type {StatusFilter[]} */ (['all', 'awaitingApproval', 'escalated', 'atRisk', 'drift']),
    setStatusFilter
  );
  const { drilledViews, allSections, sections } = useCallOffSections({
    views,
    posData: posQuery.data,
    drilledPo,
    onToAct,
    statusFilter
  });

  // IA-B13 — a link naming one call-off opens its panel once, on arrival.
  useHighlightArrival(highlight, views, setForm, setPanel);

  // Material E2 (MR-7 step 6) — "Create call-off" from the stock simulation
  // opens the new call-off form on the matching agreement line, once.
  const prefillMissing = usePrefillFromSimulation(
    allSections,
    posQuery.isPending,
    isPending,
    setForm,
    setPanel
  );

  if (posQuery.isPending || isPending || runOutQuery.isPending || drill.kind === 'pending')
    return <LoadingState breadcrumb={crumb} />;
  // AC-08 — an address naming a PO that does not exist, with a way back.
  if (drill.kind === 'notFound') return <OrderNotFound persona="buyer" breadcrumb={crumb} />;
  if (posQuery.isError || error || runOutQuery.isError)
    return (
      <ErrorState
        breadcrumb={crumb}
        error={posQuery.error ?? error ?? runOutQuery.error}
        onRetry={() => {
          posQuery.refetch();
          refetch();
          runOutQuery.refetch();
        }}
      />
    );

  const awaitingApproval = views.filter((v) => v.confirmation === 'Awaiting Approval').length;
  const escalated = views.filter((v) => v.confirmation === 'Escalated').length;
  const atRisk = views.filter((v) => v.delivery === 'atRisk').length;
  const drift = deliveryDrift(views);
  // CAP-9 BR-04 — the run-out per blanket PO line, and the supplier × material
  // groups running out (within a PO drill-through, the group that PO is in).
  const runOuts = runOutQuery.data?.items ?? [];
  const runOutByLine = new Map(runOuts.map((r) => [r.lineId, r]));
  const runOutGroups = runningOut(runOuts).filter(
    (g) => drilledPo === null || [g.last, ...g.earlier].some((r) => r.poId === drilledPo)
  );
  // Filtered at render only: `panelLine` below still finds a line the filter hides.
  // Material C3 — the search matches the line's code, PTI description and its
  // supplier's approved trade name; the best match comes first.
  const shownSections = searchMaterials(
    search,
    sections.filter((s) => pic.matches(ptiPicOf(s.line.materialCode))),
    (s) => ({
      code: s.line.materialCode,
      description: s.line.description,
      supplierId: s.po.supplierId
    }),
    matchOf
  );

  /** @type {CallOffView | null} */
  const selectedView =
    panel?.kind === 'callOff' ? (views.find((v) => v.callOff.id === panel.id) ?? null) : null;
  const panelLine =
    panel && panel.kind !== 'callOff'
      ? (allSections.find((s) => s.po.id === panel.poId && s.line.id === panel.lineId) ?? null)
      : null;

  const { open, run, createOne, createSeries } = callOffActions({
    t,
    toast,
    refusalText,
    command,
    views,
    panelLine,
    form,
    seriesRows,
    setForm,
    setSeries,
    setSeriesRows,
    setPanel
  });

  /**
   * CR-04 / BL-49 — the release check the VERB will run, mirrored on the form:
   * remaining quantity by default, remaining value only where the line has no
   * quantity. `null` while nothing readable has been typed.
   * @param {POLineItem} line
   * @param {number} quantity
   * @param {string} [excludeId]
   * @returns {ReleaseCheck | null}
   */
  const checkRelease = (line, quantity, excludeId) =>
    Number.isFinite(quantity) && quantity > 0
      ? releaseCheck(
          quantity,
          line,
          views.map((v) => v.callOff),
          excludeId
        )
      : null;

  /**
   * @param {POLineItem} line
   * @param {string} [excludeId]
   */
  const formRelease = (line, excludeId) => checkRelease(line, numberOf(form.quantity), excludeId);

  /** @type {POLineItem | null} */
  const selectedLine = selectedView
    ? (allSections.find((s) => s.line.id === selectedView.callOff.poLineId)?.line ?? null)
    : null;
  /**
   * @param {number} quantity
   * @returns {ReleaseCheck | null}
   */
  const checkForSelected = (quantity) =>
    selectedLine && selectedView
      ? checkRelease(selectedLine, quantity, selectedView.callOff.id)
      : null;

  const planHeld = planAvailability.kind === 'held';
  const reviewHeld = reviewAvailability.kind === 'held';

  return (
    <AppShellV2>
      <PageHeader breadcrumb={crumb} title={t('co.pti.title')} subtitle={t('co.pti.subtitle')} />
      <PageMetaLine className="-mt-6 mb-4">
        {t('co.asOf')} <Data>{formatDate(nowIso)}</Data>
        <SampleDataBadge className="ml-3 align-middle" />
      </PageMetaLine>

      {/* BR-04 / AC-02 — the filter is visible, and the way back is offered. */}
      <PoFilterBanner drill={drill} persona="buyer" count={drilledViews?.length} />

      {prefillMissing ? (
        <p
          role="status"
          className="text-sm text-text-secondary mb-4"
          data-testid="calloff-prefill-no-line"
        >
          {t('co.prefill.noLine', {
            supplier: prefillMissing.supplier,
            material: prefillMissing.material
          })}
        </p>
      ) : null}

      <CallOffBanner
        awaitingApproval={awaitingApproval}
        escalated={escalated}
        atRisk={atRisk}
        drift={drift}
      />

      {highlight.missing ? (
        <div
          role="status"
          data-testid="calloff-highlight-missing"
          className="bg-bg-hover border border-border-subtle rounded px-4 py-3 mb-4 text-sm text-text-secondary"
        >
          {t('co.highlight.missing')}
        </div>
      ) : null}

      <Tabs
        tabs={CALL_OFF_TABS.map((id) => ({ id, label: t(`co.tab.${id}`) }))}
        active={tab}
        onChange={(id) => {
          highlight.clear();
          select(/** @type {CallOffTab} */ (id));
        }}
        className="mb-4"
      />

      <div role="tabpanel" aria-label={t(`co.tab.${tab}`)} data-testid={`calloff-tabpanel-${tab}`}>
        {tab === 'runOut' ? (
          <RunningOutList groups={runOutGroups} />
        ) : (
          <>
            <CallOffFilters
              search={search}
              setSearch={setSearch}
              sections={sections}
              pic={pic}
              onToAct={onToAct}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              awaitingApproval={awaitingApproval}
              escalated={escalated}
              atRisk={atRisk}
              driftCount={drift.length}
            />

            <div className="space-y-6">
              {shownSections.length === 0 && !(onToAct && sections.length === 0) && (
                <p
                  className="text-sm text-text-tertiary py-8 text-center"
                  data-testid="calloff-pic-empty"
                >
                  {search.trim()
                    ? t('matSearch.noMatch', { query: search.trim() })
                    : t('pic.filter.empty')}
                </p>
              )}
              {shownSections.map(({ item: { po, line, remaining, rows }, match }) => (
                <UmbrellaSection
                  key={`${po.id}-${line.id}`}
                  po={po}
                  line={line}
                  remaining={remaining}
                  rows={rows}
                  match={match}
                  runOut={runOutByLine.get(line.id)}
                  planHeld={planHeld}
                  planAvailability={planAvailability}
                  open={open}
                  highlight={highlight}
                  linkedAsns={linkedAsns}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── New call-off / series ─────────────────────────────────────────── */}
      <NewCallOffPanel
        panel={panel}
        panelLine={panelLine}
        onClose={() => setPanel(null)}
        planHeld={planHeld}
        busy={command.isPending}
        form={form}
        setForm={setForm}
        series={series}
        setSeries={setSeries}
        seriesRows={seriesRows}
        setSeriesRows={setSeriesRows}
        today={today}
        previewSeries={previewSeries}
        createSeries={createSeries}
        createOne={createOne}
        formRelease={formRelease}
      />

      {/* ── One call-off ──────────────────────────────────────────────────── */}
      <SidePanel
        open={selectedView !== null}
        onClose={() => setPanel(null)}
        title={
          selectedView ? t('co.panel.title', { number: selectedView.callOff.callOffNumber }) : ''
        }
      >
        {selectedView && (
          <CallOffPanelBody
            view={selectedView}
            form={form}
            setForm={setForm}
            busy={command.isPending}
            planHeld={planHeld}
            reviewHeld={reviewHeld}
            planAvailability={planAvailability}
            reviewAvailability={reviewAvailability}
            today={today}
            run={run}
            numberOf={numberOf}
            checkRelease={checkForSelected}
            linkedAsns={linkedAsns.get(selectedView.callOff.id) ?? []}
          />
        )}
      </SidePanel>
    </AppShellV2>
  );
};

export default BuyerCallOffs;
