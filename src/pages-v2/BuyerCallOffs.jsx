/** @import React from 'react' */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import Tabs from '@components/ui-v2/Tabs';
import {
  OrderNotFound,
  PoFilterBanner,
  drilledPoId,
  usePoDrillFilter
} from './orders/PoDrillFilter';
import { callOffsForPo } from './orders/orderSummaryModel';
import { PO_PARAM } from './orders/orderSummaryDrill';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import SampleDataBadge from '@components/ui-v2/SampleDataBadge';
import StatusPill from '@components/ui-v2/StatusPill';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import Button from '@components/ui-v2/Button';
import SidePanel from '@components/ui-v2/SidePanel';
import Data from '@components/ui-v2/Data';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { useToast } from '@hooks/useToast';
import { useRefusalText } from '@hooks/useRefusalText';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { useUrlEnumParam } from '@hooks/useUrlEnumParam';
import { usePageTab } from '@hooks/usePageTab';
import { HIGHLIGHTED_ROW_CLASS, useRowHighlight } from '@hooks/useRowHighlight';
import { HIGHLIGHT_PARAM } from '@lib/deepLink';
import FilterChipsBar from '@components/ui-v2/FilterChipsBar';
import { isLive } from '@services/liveness';
import { refusedByPolicy } from '@services/transitions/refusalMessage';
import { POLICY_HOOKS } from '@services/transitions/policyHooks';
import { formatDate, formatDateTime, formatIDR } from '@lib/format';
import { useBlanketPoRunOuts, usePurchaseOrders } from '@services/query/hooks';
import { runningOut } from '@services/transitions/blanketPoRules';
import { RunOutFacts, RunningOutList } from './callOffs/blanketRunOutDisplay';
/** @import { CallOffCommandVars } from '@services/query/commandHooks' */
import { useCallOffCommand } from '@services/query/commandHooks';
/** @import { ASN, CallOffType, CallOffWarning, POLineItem, PurchaseOrder } from '@services/data/types' */
import { POStatus } from '@services/data/types';
import { callOffWarnings } from '@services/transitions/callOffRules';
import { isActiveAsn } from '@services/transitions/fulfilmentRules';
import { AsnPlannerMarkers } from './shipments/CallOffWarnings';
/** @import { CallOffView, ReleaseCheck } from '@services/transitions/callOffRules' */
import {
  CALL_OFF_CADENCES,
  CALL_OFF_TYPES,
  deliveryDrift,
  engineReleaseWithheld,
  generateCallOffSeries,
  isConfirmedAndAccepted,
  LTP_DROPPED_CODE,
  delayProposalRefusal,
  releaseCheck,
  umbrellaRemaining
} from '@services/transitions/callOffRules';
import { useActiveReasonCodes, useReasonLabel } from './admin/reasonCodeDisplay';
import CallOffDelays from './callOffs/CallOffDelays';
/** @import { ReleaseCadence } from '@services/delivery/types' */
import {
  callOffConfirmWorkingDays,
  callOffTolerance
} from '@services/transitions/callOffTolerance';
import { numberOf } from './callOffs/callOffDisplay';
import { RopFisikFigures, RopFisikMarker } from './callOffs/ropFisikTrigger';
import { PicCell, PicFilter, PicHeader, ptiPicOf, usePicFilter } from './materials/picDisplay';
import MaterialSearch, {
  MaterialMatchReason,
  useMaterialMatcher
} from '@components/ui-v2/MaterialSearch';
import { searchMaterials } from '@services/transitions/matchMaterial';
import {
  ConfirmationPill,
  DeliveryPill,
  ToleranceFindings,
  ToleranceTags,
  inputClass,
  labelClass,
  qty,
  useCallOffViews
} from './callOffs/callOffDisplay';

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
// ─────────────────────────────────────────────────────────────────────────────

/** P-12 — the page's tabs, in order; the first opens by default. */
export const CALL_OFF_TABS = /** @type {const} */ (['toAct', 'all', 'runOut']);
/** @typedef {(typeof CALL_OFF_TABS)[number]} CallOffTab */

/** The `?status=` values that name something on the To act tab. */
const TO_ACT_STATUSES = ['awaitingApproval', 'escalated', 'atRisk', 'drift'];

/**
 * The tab a link's other params imply when it names no `?tab=` (P-12), so
 * every link made before the split still opens the tab holding what it filters.
 * @param {URLSearchParams} params
 * @returns {CallOffTab | null}
 */
export const impliedCallOffTab = (params) => {
  const status = params.get('status');
  if (status !== null && TO_ACT_STATUSES.includes(status)) return 'toAct';
  if (
    status === 'all' ||
    params.get(PO_PARAM) !== null ||
    params.get(HIGHLIGHT_PARAM) !== null ||
    params.get('newFor') !== null
  )
    return 'all';
  return null;
};

/**
 * Whether one call-off is something the planner acts on (the banner's counts).
 * @param {CallOffView} v
 * @returns {boolean}
 */
const needsAction = (v) =>
  v.confirmation === 'Awaiting Approval' ||
  v.confirmation === 'Escalated' ||
  v.delivery === 'atRisk';

/**
 * @typedef {| { kind: 'new'; poId: string; lineId: string }
 *   | { kind: 'series'; poId: string; lineId: string }
 *   | { kind: 'callOff'; id: string }
 *   | null} Panel
 */

/**
 * The row action a planner is offered: review, open the draft, or view.
 * @param {CallOffView} v
 */
const actionKey = (v) =>
  v.confirmation === 'Awaiting Approval'
    ? 'co.action.review'
    : v.callOff.status === 'Draft'
      ? 'co.action.openDraft'
      : 'co.action.open';

/**
 * @typedef {object} SeriesRow
 * @property {string} id Row identity, used as the React key: `<preview number>-<n>`, minted in
 *   previewSeries. A new preview mints new ids, so its inputs start fresh
 *   instead of reusing the previous preview's DOM rows.
 * @property {string} quantity
 * @property {string} date
 */

/**
 * CR-04 / BL-49 — why a release is refused, with the figures: the requested
 * quantity against the remaining quantity, or, on a line with no quantity, the
 * requested value against the remaining value. The page never decides: this
 * mirrors the same `releaseCheck` the policy hook runs.
 * @type {React.FC<{ check: ReleaseCheck | null; uom: string; testId: string }>}
 */
const ExceedsNotice = ({ check, uom, testId }) => {
  const { t } = useTranslation();
  if (!check?.exceeds) return null;
  return (
    <p role="alert" className="mt-1 text-xs text-danger" data-testid={testId}>
      {check.basis === 'quantity'
        ? t('co.new.exceeds', {
            requested: qty(check.requestedQty),
            remaining: qty(check.remaining.remainingQty ?? 0),
            uom
          })
        : t('co.new.exceedsValue', {
            requested: formatIDR(check.requestedValue),
            remaining: formatIDR(check.remaining.remainingValue)
          })}
    </p>
  );
};

/**
 * X-03 (owner decision 2026-09-23) — a draft the Order plan made from an engine
 * recommendation, while the engine dataset is not live: it is marked, and its
 * release is withheld. The predicate is the one the release verb's policy runs,
 * fed the registry's own liveness at render.
 * @param {CallOffView['callOff']} c
 * @returns {boolean}
 */
const releaseWithheld = (c) => engineReleaseWithheld(c, isLive('engineDataset'));

/** @type {React.FC<{ testId: string }>} */
const EngineOriginMarker = ({ testId }) => {
  const { t } = useTranslation();
  return (
    <span data-testid={testId}>
      <StatusPill variant="warning">{t('co.origin.engine')}</StatusPill>
    </span>
  );
};

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
  const linkedAsns = useMemo(() => {
    const out = /** @type {Map<string, LinkedAsn[]>} */ (new Map());
    for (const v of views) {
      const mine = asns
        .filter((a) => a.callOffId === v.callOff.id && isActiveAsn(a))
        .map((a) => ({ asn: a, warnings: callOffWarnings(v.callOff, asns, a) }));
      if (mine.length > 0) out.set(v.callOff.id, mine);
    }
    return out;
  }, [views, asns]);
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
  const seriesPreview = useRef(0);
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
  /** @typedef {'all' | 'awaitingApproval' | 'escalated' | 'atRisk' | 'drift'} StatusFilter */
  const [statusFilter, setStatusFilter] = useState(/** @type {StatusFilter} */ ('all'));
  // Deep-link read: `?status=` narrows the My Tasks call-off tasks to the
  // umbrella rows that match.
  useUrlEnumParam(
    'status',
    /** @type {StatusFilter[]} */ (['all', 'awaitingApproval', 'escalated', 'atRisk', 'drift']),
    setStatusFilter
  );
  const driftKeys = useMemo(
    () => new Set(deliveryDrift(views).map((d) => `${d.supplierId}|${d.materialCode}`)),
    [views]
  );
  /** @param {CallOffView} v */
  const matchesStatusFilter = (v) =>
    statusFilter === 'awaitingApproval'
      ? v.confirmation === 'Awaiting Approval'
      : statusFilter === 'escalated'
        ? v.confirmation === 'Escalated'
        : v.delivery === 'atRisk';
  /**
   * ⚠️ **WHEN A PO FILTER IS IN PLAY THE PAGE LISTS WHAT THE SUMMARY COUNTED,
   * WHICH IS NARROWER THAN ITS OWN NORMAL POPULATION.** Unfiltered, a planner
   * sees its own drafts and dismissed drafts here — those are planning artefacts
   * it owns. BR-09 excludes them from the summary's count, so a drill-through
   * that still listed them would break AC-10 on the buyer side only. Same
   * predicate, one module.
   */
  const drilledViews = useMemo(
    () => (drilledPo === null ? null : callOffsForPo(views, drilledPo)),
    [views, drilledPo]
  );

  // Every umbrella line with every call-off on it (within a PO drill-through,
  // that PO's). The panels and the prefill look lines up here, so a line the
  // current tab or filter hides is still found.
  const allSections = useMemo(() => {
    /** @type {readonly PurchaseOrder[]} */
    const pos = posQuery.data?.items ?? [];
    const all = views.map((v) => v.callOff);
    return pos
      .flatMap((po) =>
        po.lineItems.map((line) => {
          const rows = (drilledViews ?? views)
            .filter((v) => v.callOff.poLineId === line.id)
            .sort((a, b) => a.callOff.needDate.localeCompare(b.callOff.needDate));
          return { po, line, remaining: umbrellaRemaining(line, all), rows };
        })
      )
      .filter((s) => drilledPo === null || s.po.id === drilledPo);
  }, [posQuery.data, views, drilledViews, drilledPo]);

  // P-12 — what the current tab lists. All call-offs: every line. To act: the
  // lines with a row to act on (only those rows) and the drifting lines (all
  // their rows), narrowed by the status chip.
  const sections = useMemo(
    () =>
      allSections
        .flatMap((s) => {
          if (!onToAct) return [s];
          const drifting = driftKeys.has(`${s.po.supplierId}|${s.line.materialCode}`);
          if (statusFilter === 'drift') return drifting ? [s] : [];
          const rows =
            statusFilter === 'all'
              ? drifting
                ? s.rows
                : s.rows.filter(needsAction)
              : s.rows.filter(matchesStatusFilter);
          return rows.length > 0 ? [{ ...s, rows }] : [];
        })
        .sort(
          (a, b) => b.rows.length - a.rows.length || a.po.poNumber.localeCompare(b.po.poNumber)
        ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allSections, onToAct, statusFilter, driftKeys]
  );

  // IA-B13 — a link naming one call-off opens its panel once, on arrival.
  const openedHighlight = useRef(/** @type {string | null} */ (null));
  useEffect(() => {
    const id = highlight.id;
    if (id === null || openedHighlight.current === id) return;
    const v = views.find((x) => x.callOff.id === id);
    if (!v) return;
    openedHighlight.current = id;
    setForm({
      quantity: String(v.callOff.quantity),
      needDate: v.callOff.needDate,
      type: v.callOff.type,
      reason: '',
      comment: ''
    });
    setPanel({ kind: 'callOff', id });
  }, [highlight.id, views]);

  // Material E2 (MR-7 step 6) — "Create call-off" from the stock simulation
  // lands here with `?newFor=<supplier>&material=<code>` and opens the new
  // call-off form on that supplier's agreement line for the material (the one
  // with the most left to release). It creates nothing: the planner still saves
  // the draft or releases. Consumed once, so closing the form does not reopen it.
  const [prefillParams, setPrefillParams] = useSearchParams();
  const prefillSupplier = prefillParams.get('newFor');
  const prefillMaterial = prefillParams.get('material');
  const [prefillMissing, setPrefillMissing] = useState(
    /** @type {{ supplier: string; material: string } | null} */ (null)
  );
  useEffect(() => {
    if (!prefillSupplier || !prefillMaterial || posQuery.isPending || isPending) return;
    const lines = allSections
      .filter((s) => s.po.supplierId === prefillSupplier && s.line.materialCode === prefillMaterial)
      .sort((a, b) => (b.remaining.remainingQty ?? 0) - (a.remaining.remainingQty ?? 0));
    const first = lines[0];
    if (first) {
      setForm({ quantity: '', needDate: '', type: 'forecast', reason: '', comment: '' });
      setPanel({ kind: 'new', poId: first.po.id, lineId: first.line.id });
      setPrefillMissing(null);
    } else {
      setPrefillMissing({ supplier: prefillSupplier, material: prefillMaterial });
    }
    const next = new URLSearchParams(prefillParams);
    next.delete('newFor');
    next.delete('material');
    setPrefillParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillSupplier, prefillMaterial, allSections, posQuery.isPending, isPending]);

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

  const resetForms = () => {
    setForm({ quantity: '', needDate: '', type: 'forecast', reason: '', comment: '' });
    setSeries({ total: '', perCallOff: '', cadence: 'weekly', firstDate: '' });
    setSeriesRows([]);
  };
  /** @param {Panel} next */
  const open = (next) => {
    resetForms();
    if (next?.kind === 'callOff') {
      const v = views.find((x) => x.callOff.id === next.id);
      if (v) {
        setForm({
          quantity: String(v.callOff.quantity),
          needDate: v.callOff.needDate,
          type: v.callOff.type,
          reason: '',
          comment: ''
        });
      }
    }
    setPanel(next);
  };

  /**
   * @param {CallOffCommandVars} vars
   * @param {string} success
   * @returns {Promise<boolean>}
   */
  const run = async (vars, success, close = true) => {
    try {
      const res = await command.mutateAsync(vars);
      if (res.status === 'failed') {
        // X-03 — the engine-data refusal is said in the reader's language, not as the hook's own text.
        const description = refusedByPolicy(res.reason, POLICY_HOOKS.CALLOFF_ENGINE_DATA_LIVE)
          ? t('co.refusal.engineDataSimulated')
          : (refusalText(res.reason) ?? res.reason ?? '');
        toast({ variant: 'warning', title: t('co.toast.refused'), description });
        return false;
      }
      toast({ variant: 'success', title: success });
      if (close) setPanel(null);
      return true;
    } catch {
      toast({ variant: 'error', title: t('co.toast.refused') });
      return false;
    }
  };

  /** @param {'release' | 'draft'} verb */
  const createOne = (verb) => {
    if (!panelLine) return;
    void run(
      {
        verb,
        poId: panelLine.po.id,
        poLineId: panelLine.line.id,
        quantity: numberOf(form.quantity),
        needDate: form.needDate,
        type: form.type
      },
      t(verb === 'release' ? 'co.toast.released' : 'co.toast.drafted')
    );
  };

  const previewSeries = () => {
    seriesPreview.current += 1;
    setSeriesRows(
      generateCallOffSeries({
        totalQty: numberOf(series.total),
        qtyPerCallOff: numberOf(series.perCallOff),
        cadence: series.cadence,
        firstNeedDate: series.firstDate
      }).map((d, n) => ({
        id: `${seriesPreview.current}-${n}`,
        quantity: String(d.quantity),
        date: d.date
      }))
    );
  };

  const createSeries = async () => {
    if (!panelLine) return;
    let created = 0;
    for (const row of seriesRows) {
      const ok = await run(
        {
          verb: 'draft',
          poId: panelLine.po.id,
          poLineId: panelLine.line.id,
          quantity: numberOf(row.quantity),
          needDate: row.date,
          type: form.type
        },
        t('co.toast.drafted'),
        false
      );
      if (!ok) break;
      created += 1;
    }
    if (created === seriesRows.length) {
      toast({ variant: 'success', title: t('co.toast.seriesCreated', { count: created }) });
      setPanel(null);
    }
  };

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

      {(awaitingApproval > 0 || escalated > 0 || atRisk > 0 || drift.length > 0) && (
        <div
          role="status"
          data-testid="pti-calloff-banner"
          className="bg-warning-soft border-l-2 border-warning rounded px-4 py-3 mb-4 text-sm text-warning-hover space-y-1"
        >
          {awaitingApproval > 0 && (
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} aria-hidden="true" />
              {t('co.pti.banner.approval', { count: awaitingApproval })}
            </div>
          )}
          {escalated > 0 && (
            <div>
              {t('co.pti.banner.escalated', {
                count: escalated,
                within: t('adminSet.unit.workingDays', { count: callOffConfirmWorkingDays() })
              })}
            </div>
          )}
          {atRisk > 0 && <div>{t('co.pti.banner.atRisk', { count: atRisk })}</div>}
          {drift.map((d) => (
            <div key={`${d.supplierId}-${d.materialCode}`} data-testid="pti-calloff-drift">
              {t('co.pti.banner.drift', {
                supplier: d.supplierName,
                material: d.materialCode,
                count: d.count
              })}
            </div>
          ))}
        </div>
      )}

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
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="flex-1 min-w-[240px]">
                <MaterialSearch
                  mode="filter"
                  query={search}
                  onQueryChange={setSearch}
                  testId="calloff-search"
                />
              </div>
              <PicFilter
                refs={sections.map((s) => ptiPicOf(s.line.materialCode))}
                persona="buyer"
                filter={pic.filter}
                setFilter={pic.setFilter}
                myCode={pic.myCode}
              />
            </div>

            {onToAct ? (
              <FilterChipsBar
                options={[
                  { id: 'all', label: t('co.toAct.filter.any') },
                  {
                    id: 'awaitingApproval',
                    label: t('co.pti.filter.awaitingApproval'),
                    count: awaitingApproval
                  },
                  { id: 'escalated', label: t('co.pti.filter.escalated'), count: escalated },
                  { id: 'atRisk', label: t('co.pti.filter.atRisk'), count: atRisk },
                  { id: 'drift', label: t('co.pti.filter.drift'), count: drift.length }
                ]}
                value={statusFilter}
                onChange={setStatusFilter}
                className="mb-4"
              />
            ) : null}

            {onToAct && statusFilter !== 'all' && sections.length === 0 && (
              <p
                className="text-sm text-text-tertiary py-8 text-center"
                data-testid="calloff-filter-empty"
              >
                {t('co.pti.filter.empty')}
              </p>
            )}

            {onToAct && statusFilter === 'all' && sections.length === 0 && (
              <p
                className="text-sm text-text-tertiary py-8 text-center"
                data-testid="calloff-toact-empty"
              >
                {t('co.toAct.empty')}
              </p>
            )}

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
                <section
                  key={`${po.id}-${line.id}`}
                  data-testid={`calloff-umbrella-${po.id}-${line.id}`}
                  className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm"
                >
                  <header className="px-4 py-3 border-b border-border-subtle flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div
                        id={`calloff-umbrella-title-${po.id}-${line.id}`}
                        className="flex items-center gap-2 flex-wrap"
                      >
                        <Data className="text-sm font-bold text-text-primary">{po.poNumber}</Data>
                        <span className="text-sm text-text-primary">{po.supplierName}</span>
                      </div>
                      <div className="text-xs text-text-secondary mt-0.5">
                        <Data className="text-text-tertiary">{line.materialCode}</Data> ·{' '}
                        {line.description}
                      </div>
                      <MaterialMatchReason match={match} testId={`calloff-match-${line.id}`} />
                      <div className="text-xs text-text-secondary mt-1 flex flex-wrap items-center gap-2">
                        <PicHeader />
                        <PicCell
                          value={ptiPicOf(line.materialCode)}
                          testId={`calloff-pic-${line.id}`}
                        />
                      </div>
                      {/* CR-04 / BL-49 — a line's own basis: quantity by default, value
                    only where the line carries no quantity. */}
                      <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs">
                        <div>
                          <dt className="inline text-text-tertiary">
                            {t(
                              remaining.basis === 'quantity'
                                ? 'co.umbrella.ordered'
                                : 'co.umbrella.orderedValue'
                            )}{' '}
                          </dt>
                          <dd className="inline">
                            <Data>
                              {remaining.orderedQty === null
                                ? formatIDR(remaining.orderedValue)
                                : `${qty(remaining.orderedQty)} ${line.uom}`}
                            </Data>
                          </dd>
                        </div>
                        <div>
                          <dt className="inline text-text-tertiary">
                            {t('co.umbrella.released')}{' '}
                          </dt>
                          <dd className="inline">
                            <Data>
                              {remaining.basis === 'quantity'
                                ? `${qty(remaining.releasedQty)} ${line.uom}`
                                : formatIDR(remaining.releasedValue)}
                            </Data>
                          </dd>
                        </div>
                        {remaining.remainingQty !== null && (
                          <div>
                            <dt className="inline text-text-tertiary">
                              {t('co.umbrella.remaining')}{' '}
                            </dt>
                            <dd className="inline" data-testid={`calloff-remaining-${line.id}`}>
                              <Data className="font-semibold">{`${qty(remaining.remainingQty)} ${line.uom}`}</Data>
                            </dd>
                          </div>
                        )}
                        <div>
                          <dt className="inline text-text-tertiary">
                            {t('co.umbrella.remainingValue')}{' '}
                          </dt>
                          <dd className="inline" data-testid={`calloff-remaining-value-${line.id}`}>
                            <Data
                              className={remaining.basis === 'value' ? 'font-semibold' : undefined}
                            >
                              {formatIDR(remaining.remainingValue)}
                            </Data>
                          </dd>
                        </div>
                      </dl>
                      <p
                        className="mt-1 text-[11px] text-text-tertiary"
                        data-testid={`calloff-basis-${line.id}`}
                      >
                        {t(
                          remaining.basis === 'quantity'
                            ? 'co.umbrella.byQuantity'
                            : 'co.umbrella.noQuantity'
                        )}
                      </p>
                      <RunOutFacts row={runOutByLine.get(line.id)} />
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {planHeld ? (
                        <>
                          {/* BL-31 (WCAG 2.4.6): these two buttons repeat on every agreement line;
                        describedby ties each to its PO and supplier. */}
                          <Button
                            variant="secondary"
                            aria-describedby={`calloff-umbrella-title-${po.id}-${line.id}`}
                            onClick={() => open({ kind: 'series', poId: po.id, lineId: line.id })}
                          >
                            {t('co.action.series')}
                          </Button>
                          <Button
                            variant="outline"
                            aria-describedby={`calloff-umbrella-title-${po.id}-${line.id}`}
                            onClick={() => open({ kind: 'new', poId: po.id, lineId: line.id })}
                          >
                            {t('co.action.new')}
                          </Button>
                        </>
                      ) : (
                        <HandoffNotice
                          availability={planAvailability}
                          testId="handoff-calloff-plan"
                        />
                      )}
                    </div>
                  </header>
                  {rows.length === 0 ? (
                    <p className="px-4 py-4 text-sm text-text-tertiary">{t('co.umbrella.none')}</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableHeaderCell>{t('co.col.callOff')}</TableHeaderCell>
                          <TableHeaderCell>{t('co.col.type')}</TableHeaderCell>
                          <TableHeaderCell className="text-right">
                            {t('co.col.quantity')}
                          </TableHeaderCell>
                          <TableHeaderCell>{t('co.col.needDate')}</TableHeaderCell>
                          <TableHeaderCell>{t('co.col.confirmation')}</TableHeaderCell>
                          <TableHeaderCell>{t('co.col.delivery')}</TableHeaderCell>
                          <TableHeaderCell className="text-right">
                            {t('co.col.action')}
                          </TableHeaderCell>
                        </TableHeader>
                        <tbody>
                          {rows.map((v) => (
                            <TableRow
                              key={v.callOff.id}
                              data-testid={`calloff-row-${v.callOff.id}`}
                              ref={highlight.id === v.callOff.id ? highlight.scrollRef : undefined}
                              aria-current={highlight.id === v.callOff.id ? 'true' : undefined}
                              className={
                                highlight.id === v.callOff.id ? HIGHLIGHTED_ROW_CLASS : undefined
                              }
                            >
                              <TableCell>
                                <Data className="text-xs font-bold text-text-primary whitespace-nowrap">
                                  {v.callOff.callOffNumber}
                                </Data>
                                {releaseWithheld(v.callOff) && (
                                  <div className="mt-1">
                                    <EngineOriginMarker
                                      testId={`calloff-origin-engine-${v.callOff.id}`}
                                    />
                                  </div>
                                )}
                                {/* BL-199 (DRC-13) — a draft the hub made at ROP Fisik. */}
                                {v.callOff.origin === 'ropFisik' && (
                                  <div className="mt-1">
                                    <RopFisikMarker
                                      testId={`calloff-origin-rop-fisik-${v.callOff.id}`}
                                    />
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="text-xs text-text-secondary whitespace-nowrap">
                                {t(`co.type.${v.callOff.type}`)}
                              </TableCell>
                              <TableCell className="text-right">
                                <Data>{qty(v.callOff.quantity)}</Data>
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                <Data className="text-xs">{formatDate(v.callOff.needDate)}</Data>
                              </TableCell>
                              <TableCell>
                                <ConfirmationPill status={v.confirmation} />
                                {/* CR-05 — the rule that decided this confirmation. */}
                                {v.tolerance && v.callOff.confirmation && (
                                  <ToleranceTags
                                    check={v.tolerance}
                                    uom={v.callOff.uom}
                                    approval={v.callOff.confirmation.approval}
                                    testId={`calloff-tol-${v.callOff.id}`}
                                  />
                                )}
                              </TableCell>
                              <TableCell>
                                <DeliveryPill status={v.delivery} />
                                {(linkedAsns.get(v.callOff.id) ?? []).some(
                                  (l) => l.warnings.length > 0
                                ) ? (
                                  <div
                                    className="mt-1"
                                    data-testid={`calloff-mismatch-${v.callOff.id}`}
                                  >
                                    <StatusPill variant="warning">
                                      {t('co.asn.mismatch')}
                                    </StatusPill>
                                  </div>
                                ) : null}
                              </TableCell>
                              <TableCell className="text-right whitespace-nowrap">
                                <Button
                                  variant={
                                    v.confirmation === 'Awaiting Approval' ||
                                    v.callOff.status === 'Draft'
                                      ? 'outline'
                                      : 'secondary'
                                  }
                                  onClick={() => open({ kind: 'callOff', id: v.callOff.id })}
                                  aria-label={`${t(actionKey(v))} ${v.callOff.callOffNumber}`}
                                >
                                  {t(actionKey(v))}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  )}
                </section>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── New call-off / series ─────────────────────────────────────────── */}
      <SidePanel
        open={panelLine !== null}
        onClose={() => setPanel(null)}
        title={
          panelLine
            ? t(panel?.kind === 'series' ? 'co.series.title' : 'co.new.title', {
                poNumber: panelLine.po.poNumber
              })
            : ''
        }
        footerActions={
          panelLine && planHeld ? (
            panel?.kind === 'series' ? (
              <Button
                variant="outline"
                disabled={command.isPending || seriesRows.length === 0}
                onClick={() => void createSeries()}
              >
                {t('co.series.create', { count: seriesRows.length })}
              </Button>
            ) : (
              <>
                <Button
                  variant="secondary"
                  disabled={command.isPending}
                  onClick={() => createOne('draft')}
                >
                  {t('co.new.saveDraft')}
                </Button>
                <Button
                  variant="outline"
                  disabled={command.isPending || (formRelease(panelLine.line)?.exceeds ?? false)}
                  onClick={() => createOne('release')}
                >
                  {t('co.new.release')}
                </Button>
              </>
            )
          ) : undefined
        }
      >
        {panelLine && (
          <div className="space-y-4">
            {/* BL-49 — what the release will be checked against, said before the
                planner types a quantity. */}
            <p className="text-sm text-text-secondary" data-testid="calloff-new-remaining">
              {panelLine.remaining.remainingQty === null
                ? t('co.new.remainingValue', {
                    value: formatIDR(panelLine.remaining.remainingValue)
                  })
                : t('co.new.remaining', {
                    quantity: qty(panelLine.remaining.remainingQty),
                    uom: panelLine.line.uom,
                    value: formatIDR(panelLine.remaining.remainingValue)
                  })}
            </p>
            <div>
              <label htmlFor="co-type" className={labelClass}>
                {t('co.field.type')}
              </label>
              <select
                id="co-type"
                className={inputClass}
                value={form.type}
                onChange={(e) =>
                  setForm({ ...form, type: /** @type {CallOffType} */ (e.target.value) })
                }
              >
                {CALL_OFF_TYPES.map((ty) => (
                  <option key={ty} value={ty}>
                    {t(`co.type.${ty}`)}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-text-tertiary">
                {t(`co.type.hint.${form.type}`, { pct: callOffTolerance().overPct })}
              </p>
            </div>
            {panel?.kind === 'new' ? (
              <>
                <div>
                  <label htmlFor="co-qty" className={labelClass}>
                    {t('co.field.quantity', { uom: panelLine.line.uom })}
                  </label>
                  <input
                    id="co-qty"
                    inputMode="numeric"
                    className={inputClass}
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  />
                  <ExceedsNotice
                    check={formRelease(panelLine.line)}
                    uom={panelLine.line.uom}
                    testId="calloff-exceeds-remaining"
                  />
                </div>
                <div>
                  <label htmlFor="co-date" className={labelClass}>
                    {t('co.field.needDate')}
                  </label>
                  <input
                    id="co-date"
                    type="date"
                    min={today}
                    className={inputClass}
                    value={form.needDate}
                    onChange={(e) => setForm({ ...form, needDate: e.target.value })}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="co-series-total" className={labelClass}>
                      {t('co.series.total')}
                    </label>
                    <input
                      id="co-series-total"
                      inputMode="numeric"
                      className={inputClass}
                      value={series.total}
                      onChange={(e) => setSeries({ ...series, total: e.target.value })}
                    />
                  </div>
                  <div>
                    <label htmlFor="co-series-per" className={labelClass}>
                      {t('co.series.perCallOff')}
                    </label>
                    <input
                      id="co-series-per"
                      inputMode="numeric"
                      className={inputClass}
                      value={series.perCallOff}
                      onChange={(e) => setSeries({ ...series, perCallOff: e.target.value })}
                    />
                  </div>
                  <div>
                    <label htmlFor="co-series-cadence" className={labelClass}>
                      {t('co.series.cadence')}
                    </label>
                    <select
                      id="co-series-cadence"
                      className={inputClass}
                      value={series.cadence}
                      onChange={(e) =>
                        setSeries({
                          ...series,
                          cadence: /** @type {ReleaseCadence} */ (e.target.value)
                        })
                      }
                    >
                      {CALL_OFF_CADENCES.map((c) => (
                        <option key={c} value={c}>
                          {t(`co.cadence.${c}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="co-series-first" className={labelClass}>
                      {t('co.series.firstDate')}
                    </label>
                    <input
                      id="co-series-first"
                      type="date"
                      min={today}
                      className={inputClass}
                      value={series.firstDate}
                      onChange={(e) => setSeries({ ...series, firstDate: e.target.value })}
                    />
                  </div>
                </div>
                <Button variant="secondary" onClick={previewSeries}>
                  {t('co.series.preview')}
                </Button>
                <p className="text-xs text-text-tertiary">{t('co.series.hint')}</p>
                {seriesRows.length > 0 && (
                  <table className="w-full text-xs" data-testid="calloff-series-preview">
                    <thead>
                      <tr className="text-text-tertiary uppercase">
                        <th className="text-left py-1">#</th>
                        <th className="text-left py-1">{t('co.col.quantity')}</th>
                        <th className="text-left py-1">{t('co.col.needDate')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {seriesRows.map((row, i) => (
                        <tr key={row.id} className="border-t border-border-subtle">
                          <td className="py-1.5 pr-2">
                            <Data>{i + 1}</Data>
                          </td>
                          <td className="py-1.5 pr-2">
                            <input
                              aria-label={t('co.series.rowQty', { n: i + 1 })}
                              className={inputClass}
                              value={row.quantity}
                              onChange={(e) =>
                                setSeriesRows(
                                  seriesRows.map((r, j) =>
                                    j === i ? { ...r, quantity: e.target.value } : r
                                  )
                                )
                              }
                            />
                          </td>
                          <td className="py-1.5">
                            <input
                              type="date"
                              aria-label={t('co.series.rowDate', { n: i + 1 })}
                              className={inputClass}
                              value={row.date}
                              onChange={(e) =>
                                setSeriesRows(
                                  seriesRows.map((r, j) =>
                                    j === i ? { ...r, date: e.target.value } : r
                                  )
                                )
                              }
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            )}
          </div>
        )}
      </SidePanel>

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

/** A call-off's ASN with its current call-off warnings (MR-6 BR-12). */
/**
 * @typedef {object} LinkedAsn
 * @property {ASN} asn
 * @property {CallOffWarning[]} warnings
 */

/**
 * @typedef {object} PanelBodyProps
 * @property {CallOffView} view
 * @property {readonly LinkedAsn[]} linkedAsns -  The call-off's ASNs, each with the current comparison (edge case 6).
 * @property {{ quantity: string; needDate: string; type: CallOffType; reason: string; comment: string }} form
 * @property {(f: PanelBodyProps['form']) => void} setForm
 * @property {boolean} busy
 * @property {boolean} planHeld
 * @property {boolean} reviewHeld
 * @property {ReturnType<typeof useVerbAvailability>} planAvailability
 * @property {ReturnType<typeof useVerbAvailability>} reviewAvailability
 * @property {string} today
 * @property {(vars: CallOffCommandVars, success: string, close?: boolean) => Promise<boolean>} run
 * @property {(raw: string) => number} numberOf
 * @property {(quantity: number) => ReleaseCheck | null} checkRelease -  The release check for this call-off's own PO line at a given quantity (CR-04 / BL-49).
 */

/**
 * MR-6 BR-12 / FU-7 — the planner's markers on one heads-up ASN.
 * @type {React.FC<{ asnNumber: string; linkedAsns: readonly LinkedAsn[] }>}
 */
const HeadsUpMarkers = ({ asnNumber, linkedAsns }) => {
  const linked = linkedAsns.find((l) => l.asn.asnNumber === asnNumber);
  return linked ? (
    <div className="mt-1">
      <AsnPlannerMarkers asn={linked.asn} warnings={linked.warnings} />
    </div>
  ) : null;
};

/** @type {React.FC<PanelBodyProps>} */
const CallOffPanelBody = ({
  view,
  form,
  setForm,
  busy,
  planHeld,
  reviewHeld,
  planAvailability,
  reviewAvailability,
  today,
  run,
  numberOf,
  checkRelease,
  linkedAsns
}) => {
  const { t } = useTranslation();
  // BL-32 / DRC-5 (BL-191) — the coded reason of a change; "LTP dropped" makes
  // a later need date a delay the supplier must approve.
  const changeCodes = useActiveReasonCodes('callOffChange');
  const reasonLabel = useReasonLabel();
  const [reasonCode, setReasonCode] = useState('');
  const c = view.callOff;
  const isDraft = c.status === 'Draft';
  const awaitingApproval = view.confirmation === 'Awaiting Approval';
  const changeable =
    !isDraft &&
    !awaitingApproval &&
    (isConfirmedAndAccepted(c) || c.status === 'Rejected') &&
    view.headsUps.length === 0;
  const reason = form.reason.trim();
  const changedQty = numberOf(form.quantity);
  // CR-04 / BL-49 — releasing a draft uses the draft's OWN quantity; changing a
  // released call-off uses the quantity being typed. Both run the same check.
  const draftRelease = isDraft ? checkRelease(c.quantity) : null;
  const withheld = releaseWithheld(c);
  const changeRelease = checkRelease(changedQty);
  const edits = {
    ...(Number.isFinite(changedQty) && changedQty !== c.quantity ? { quantity: changedQty } : {}),
    ...(form.needDate && form.needDate !== c.needDate ? { needDate: form.needDate } : {})
  };
  // DRC-5 — the verb's own rule, read as a courtesy before sending.
  const delay = reasonCode === LTP_DROPPED_CODE;
  const delayRefused = delay ? delayProposalRefusal(c, edits) : null;

  return (
    <div className="space-y-6">
      {withheld && <EngineOriginMarker testId="calloff-panel-origin-engine" />}
      {/* BL-199 (DRC-13) — the figures behind a draft the hub made at ROP Fisik. */}
      <RopFisikFigures callOff={c} />
      <dl className="grid grid-cols-[150px_1fr] gap-y-2 text-sm">
        <dt className="text-text-tertiary">{t('co.col.supplier')}</dt>
        <dd className="text-text-primary">{c.supplierName}</dd>
        <dt className="text-text-tertiary">{t('co.col.po')}</dt>
        <dd>
          <Data>{c.poNumber}</Data>
        </dd>
        <dt className="text-text-tertiary">{t('co.col.material')}</dt>
        <dd>
          <Data className="text-text-tertiary">{c.materialCode}</Data> {c.description}
        </dd>
        <dt className="text-text-tertiary">{t('co.col.type')}</dt>
        <dd>{t(`co.type.${c.type}`)}</dd>
        <dt className="text-text-tertiary">{t('co.col.quantity')}</dt>
        <dd>
          <Data>{`${qty(c.quantity)} ${c.uom}`}</Data>
        </dd>
        <dt className="text-text-tertiary">{t('co.col.needDate')}</dt>
        <dd>
          <Data>{formatDate(c.needDate)}</Data>
        </dd>
        <dt className="text-text-tertiary">{t('co.col.confirmation')}</dt>
        <dd>
          <ConfirmationPill status={view.confirmation} />
        </dd>
        {view.deadline && c.status === 'Awaiting Confirmation' && (
          <>
            <dt className="text-text-tertiary">{t('co.col.confirmBy')}</dt>
            <dd>
              <Data>{formatDateTime(view.deadline.toISOString())}</Data>
            </dd>
          </>
        )}
        <dt className="text-text-tertiary">{t('co.col.delivery')}</dt>
        <dd>
          <DeliveryPill status={view.delivery} />
        </dd>
        {view.otif !== null && (
          <>
            <dt className="text-text-tertiary">{t('co.col.otif')}</dt>
            <dd data-testid="calloff-otif">
              {t(view.otif === 1 ? 'co.otif.met' : 'co.otif.missed')}
            </dd>
          </>
        )}
      </dl>

      {c.confirmation && (
        <section>
          <h3 className="text-label text-text-tertiary uppercase mb-2">
            {t('co.panel.confirmation')}
          </h3>
          <ul className="text-sm space-y-1">
            {/* Key: the date — a split confirmation is refused when both
                deliveries share a date (proposedDeliveries, 'splitDates'). */}
            {c.confirmation.deliveries.map((d) => (
              <li key={d.date}>
                <Data>{`${qty(d.quantity)} ${c.uom}`}</Data> · <Data>{formatDate(d.date)}</Data>
              </li>
            ))}
          </ul>
          {c.confirmation.comment && (
            <p className="mt-1 text-sm text-text-secondary">“{c.confirmation.comment}”</p>
          )}
          <p className="mt-1 text-xs text-text-tertiary">
            {t(`co.approval.${c.confirmation.approval}`)}
          </p>
          {/* CR-05 — the rule that put this confirmation where it is, and why. */}
          {view.tolerance && (
            <div className="mt-2">
              <ToleranceFindings
                check={view.tolerance}
                uom={c.uom}
                needDate={c.needDate}
                testId="calloff-tolerance-applied"
              />
            </div>
          )}
        </section>
      )}

      {c.rejectionReason && (
        <section>
          <h3 className="text-label text-text-tertiary uppercase mb-2">
            {t('co.panel.rejection')}
          </h3>
          <p className="text-sm text-text-primary">{c.rejectionReason}</p>
        </section>
      )}

      {/* DRC-5 (BL-191) — delays proposed for an LTP drop, and the supplier's answers. */}
      <CallOffDelays callOff={c} testId="calloff-delays" />

      {view.headsUps.length > 0 && (
        <section>
          <h3 className="text-label text-text-tertiary uppercase mb-2">{t('co.panel.headsUps')}</h3>
          <ul className="text-sm space-y-1">
            {view.headsUps.map((h) => (
              <li key={h.ref}>
                <Data>{`${qty(h.quantity)} ${c.uom}`}</Data> ·{' '}
                {t('co.headsUp.line', {
                  shipped: formatDate(h.shippedDate),
                  arrival: formatDate(h.expectedArrival)
                })}
                {h.source === 'asn' && (
                  <>
                    {' '}
                    · <Data>{h.ref}</Data>
                  </>
                )}
                {h.source === 'asn' ? (
                  <HeadsUpMarkers asnNumber={h.ref} linkedAsns={linkedAsns} />
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      )}

      {c.notes.length > 0 && (
        <section>
          <h3 className="text-label text-text-tertiary uppercase mb-2">{t('co.panel.notes')}</h3>
          <ul className="text-sm space-y-1">
            {/* CallOffNote has no id and `at` can repeat. Notes are append-only,
                oldest first, so the index is the note's sequence number. */}
            {c.notes.map((n, i) => (
              // eslint-disable-next-line react/no-array-index-key -- append-only notes: index is the note's sequence number
              <li key={i}>
                <span className="text-text-tertiary">{t(`co.note.${n.action}`)}:</span> {n.text}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Planner review of a confirmation outside tolerance (BR-04). */}
      {awaitingApproval && (
        <section className="space-y-2" data-testid="calloff-review">
          <h3 className="text-label text-text-tertiary uppercase">{t('co.review.title')}</h3>
          {reviewHeld ? (
            <>
              <p className="text-sm text-text-secondary">{t('co.review.intro')}</p>
              <label htmlFor="co-review-comment" className={labelClass}>
                {t('co.review.comment')}
              </label>
              <textarea
                id="co-review-comment"
                rows={3}
                className={inputClass}
                value={form.comment}
                onChange={(e) => setForm({ ...form, comment: e.target.value })}
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="secondary"
                  disabled={busy || form.comment.trim() === ''}
                  onClick={() =>
                    void run(
                      { verb: 'rejectConfirmation', id: c.id, reviewComment: form.comment.trim() },
                      t('co.toast.confirmationRejected')
                    )
                  }
                >
                  {t('co.review.reject')}
                </Button>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => void run({ verb: 'approve', id: c.id }, t('co.toast.approved'))}
                >
                  {t('co.review.approve')}
                </Button>
              </div>
            </>
          ) : (
            <HandoffNotice availability={reviewAvailability} testId="handoff-calloff-review" />
          )}
        </section>
      )}

      {/* Draft: edit (with reason), release, dismiss (with reason). */}
      {isDraft && (
        <section className="space-y-3" data-testid="calloff-draft-actions">
          <h3 className="text-label text-text-tertiary uppercase">{t('co.draft.title')}</h3>
          {planHeld ? (
            <>
              <DraftFields form={form} setForm={setForm} uom={c.uom} today={today} withType />
              {/* BL-49 — releasing this draft is checked against what remains on
                  its own line, and refused with the figures when it does not fit. */}
              {draftRelease && (
                <>
                  <p className="text-xs text-text-secondary" data-testid="calloff-draft-remaining">
                    {draftRelease.remaining.remainingQty === null
                      ? t('co.new.remainingValue', {
                          value: formatIDR(draftRelease.remaining.remainingValue)
                        })
                      : t('co.new.remaining', {
                          quantity: qty(draftRelease.remaining.remainingQty),
                          uom: c.uom,
                          value: formatIDR(draftRelease.remaining.remainingValue)
                        })}
                  </p>
                  <ExceedsNotice
                    check={draftRelease}
                    uom={c.uom}
                    testId="calloff-draft-exceeds-remaining"
                  />
                </>
              )}
              <div className="flex flex-wrap gap-2 justify-end">
                <Button
                  variant="secondary"
                  disabled={busy || reason === ''}
                  onClick={() =>
                    void run({ verb: 'dismiss', id: c.id, reason }, t('co.toast.dismissed'))
                  }
                >
                  {t('co.draft.dismiss')}
                </Button>
                <Button
                  variant="secondary"
                  disabled={
                    busy ||
                    reason === '' ||
                    (Object.keys(edits).length === 0 && form.type === c.type)
                  }
                  onClick={() =>
                    void run(
                      {
                        verb: 'editDraft',
                        id: c.id,
                        reason,
                        ...edits,
                        ...(form.type !== c.type ? { type: form.type } : {})
                      },
                      t('co.toast.draftSaved'),
                      false
                    )
                  }
                >
                  {t('co.draft.save')}
                </Button>
                {/* X-03 — the release is withheld and says why, rather than acting
                    and being refused. Edit and dismiss above stay available. */}
                {withheld ? (
                  <p
                    role="note"
                    className="basis-full text-xs text-text-secondary text-right"
                    data-testid="calloff-draft-release-withheld"
                  >
                    {t('co.draft.releaseWithheld')}
                  </p>
                ) : (
                  <Button
                    variant="outline"
                    disabled={busy || (draftRelease?.exceeds ?? false)}
                    onClick={() =>
                      void run({ verb: 'releaseDraft', id: c.id }, t('co.toast.released'))
                    }
                  >
                    {t('co.draft.release')}
                  </Button>
                )}
              </div>
            </>
          ) : (
            <HandoffNotice availability={planAvailability} testId="handoff-calloff-draft" />
          )}
        </section>
      )}

      {/* Change a call-off the supplier already answered: back to Awaiting Confirmation. */}
      {changeable && (
        <section className="space-y-3" data-testid="calloff-change">
          <h3 className="text-label text-text-tertiary uppercase">{t('co.change.title')}</h3>
          {planHeld ? (
            <>
              <p className="text-sm text-text-secondary">{t('co.change.intro')}</p>
              <DraftFields form={form} setForm={setForm} uom={c.uom} today={today} />
              <div>
                <label htmlFor="co-change-reason-code" className={labelClass}>
                  {t('co.change.reasonCode')}
                </label>
                <select
                  id="co-change-reason-code"
                  className={inputClass}
                  value={reasonCode}
                  onChange={(e) => setReasonCode(e.target.value)}
                >
                  <option value="">{t('co.change.reasonCodeNone')}</option>
                  {changeCodes.map((code) => (
                    <option key={code} value={code}>
                      {reasonLabel('callOffChange', code)}
                    </option>
                  ))}
                </select>
                {delay ? (
                  <p className="mt-1 text-xs text-text-tertiary" data-testid="calloff-delay-hint">
                    {t('co.change.delayHint')}
                  </p>
                ) : null}
              </div>
              {/* The change verb runs the same remaining check as a release. */}
              <ExceedsNotice
                check={changeRelease}
                uom={c.uom}
                testId="calloff-change-exceeds-remaining"
              />
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  disabled={
                    busy ||
                    reason === '' ||
                    Object.keys(edits).length === 0 ||
                    (changeRelease?.exceeds ?? false) ||
                    delayRefused !== null
                  }
                  onClick={() =>
                    void run(
                      {
                        verb: 'change',
                        id: c.id,
                        reason,
                        ...(reasonCode ? { reasonCode } : {}),
                        ...edits
                      },
                      t('co.toast.changed')
                    )
                  }
                >
                  {t('co.change.submit')}
                </Button>
              </div>
            </>
          ) : (
            <HandoffNotice availability={planAvailability} testId="handoff-calloff-change" />
          )}
        </section>
      )}
    </div>
  );
};

/** @type {React.FC<{ form: PanelBodyProps['form']; setForm: PanelBodyProps['setForm']; uom: string; today: string; withType?: boolean; }>} */
const DraftFields = ({ form, setForm, uom, today, withType }) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="co-edit-qty" className={labelClass}>
            {t('co.field.quantity', { uom })}
          </label>
          <input
            id="co-edit-qty"
            inputMode="numeric"
            className={inputClass}
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="co-edit-date" className={labelClass}>
            {t('co.field.needDate')}
          </label>
          <input
            id="co-edit-date"
            type="date"
            min={today}
            className={inputClass}
            value={form.needDate}
            onChange={(e) => setForm({ ...form, needDate: e.target.value })}
          />
        </div>
      </div>
      {withType && (
        <div>
          <label htmlFor="co-edit-type" className={labelClass}>
            {t('co.field.type')}
          </label>
          <select
            id="co-edit-type"
            className={inputClass}
            value={form.type}
            onChange={(e) =>
              setForm({ ...form, type: /** @type {CallOffType} */ (e.target.value) })
            }
          >
            {CALL_OFF_TYPES.map((ty) => (
              <option key={ty} value={ty}>
                {t(`co.type.${ty}`)}
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label htmlFor="co-edit-reason" className={labelClass}>
          {t('co.field.reason')}
        </label>
        <textarea
          id="co-edit-reason"
          rows={2}
          className={inputClass}
          value={form.reason}
          onChange={(e) => setForm({ ...form, reason: e.target.value })}
        />
      </div>
    </div>
  );
};

export default BuyerCallOffs;
