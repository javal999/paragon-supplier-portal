/** @import React from 'react' */
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import SubTabs from '@components/ui-v2/SubTabs';
import LivenessPill from '@components/ui-v2/LivenessPill';
import NoSupplierIdentity from '@components/ui-v2/NoSupplierIdentity';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import EmptyState from '@components/ui-v2/EmptyState';
import { useToast } from '@hooks/useToast';
import { useCurrentIdentity } from '@context/CurrentIdentityContext';
import { useCurrentSupplier } from '@services/query/hooks';
/** @import { CollaboratedMaterialView, IncomingShipmentView } from '@services/query/sdcSupplierHooks' */
import {
  useOwnForecastLines,
  useOwnRequirementResponses,
  useRequirementResponsePromote,
  useOwnCollaboratedMaterials,
  useOwnIncomingShipments,
  useOwnSupplierAsns
} from '@services/query/sdcSupplierHooks';
/** @import { ForecastLine, ForecastPublication, RequirementResponse, SdcObjectKind, SubmissionSessionRecorder } from '@services/sdc' */
import { openSubmissionSession } from '@services/sdc';
/** @import { ASN, CommandResult } from '@services/data/types' */
import { useRefusalText } from '@hooks/useRefusalText';
import { sdcClock } from '@services/sdc/clock';
/** @import { ConfirmForm, ShipmentForm, TabKey } from './const' */
import { emptyForm, emptyShipmentForm } from './const';
import LinesTab from './components/LinesTab';
import StockMovedNotice from './components/StockMovedNotice';
import ResponsesTab from './components/ResponsesTab';
import ShipmentsTab from './components/ShipmentsTab';
import ConfirmPanel from './components/ConfirmPanel';
import AcknowledgePanel from './components/AcknowledgePanel';
import ShipmentReportPanel from './components/ShipmentReportPanel';

// ────────────────────────────────────────────────────────────────────────────
// SupplierForecasts (SDC-2b → SDC-3b) — the P1 supplier SUBMISSION HUB. One
// supplier visit, three declarable object kinds, all riding ONE
// SubmissionSession envelope (addendum §5) with PER-OBJECT partial success:
//   · Forecast lines   — confirm / acknowledge a published line
//                        (t_requirementresponse_submit / _acknowledge, SDC-2b).
//   · Stock (SOH)      — RETIRED as an entry point (BL-60, REQ-E08-02 BR-09):
//                        a signpost to the Stock page, the ONE stock entry.
//   · Shipments        — report an incoming leg, direction-guarded
//                        (t_incomingshipment_report, SDC-3a).
//
// SESSION + causationId (SDC-3a seam, now DRIVEN): the FIRST dispatch of a visit
// becomes the audit anchor; every later dispatch passes `causationAnchor()` as
// its causationId, so a visit's DR-10 events group WITHOUT collapsing their own
// correlationIds. Each object validates independently — a forecast confirm can
// land while a shipment report fails, each reporting its own toast.
//
// HONESTY (FLAG-2, all three layers) — unchanged from SDC-2b:
//   1+2 (structural) — the forecast read comes through supplierVisiblePublications()
//       (LIVE-only); the governed lane is empty, so the page renders the SIMULATED
//       sample ONLY under the explicit sample banner + registry LivenessPill.
//   3   (vocabulary) — the supplier-facing class vocabulary is commitmentClass
//       ONLY; no internal liveness / plan-state grammar reaches a supplier.
//   The Stock tab no longer shows stock, so it no longer carries the `inventory`
//   registry pill; the Stock page carries its own sample marker.
//
// OWN-FACTS-ONLY (FORK-3b-C): own lines / own submissions / own declarations /
// own shipments, STATUS-or-STATE only — never another supplier's data, never a
// rank or score. Page-level own-filtering today; service-level scoping = SDC-4.
//
// uom is NEVER typed — every qty field inherits its material's canonical uom
// from the master (invariant #2); the surface shows it read-only.
//
// THE FOLDER (frontend-standard Phase 5, PAGE-SPLIT-GUIDE): this file keeps the
// identity gate (`SupplierForecasts`) and the workspace that renders
// `<AppShellV2>` and owns the visit's SubmissionSession; each tab and panel is
// in `components/`, constants in `const.js`, pure helpers in `utils.js`.
// ────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {object} WorkspaceProps
 * @property {string} supplierId
 * @property {string} supplierName
 * @property {ForecastPublication} publication
 * @property {readonly ForecastLine[]} lines
 * @property {boolean} liveFeed
 * @property {readonly RequirementResponse[]} responses
 * @property {readonly CollaboratedMaterialView[]} materials
 * @property {readonly IncomingShipmentView[]} shipments
 * @property {readonly ASN[]} asns
 */

/**
 * The submission hub itself: header, sample banner, the four tabs, and the
 * three panels (confirm, acknowledge, shipment report). It owns which tab and
 * which panel is open, the panels' form state, the draft promotion, and the
 * visit's ONE SubmissionSession, which every panel's dispatch records on.
 * @type {React.FC<WorkspaceProps>}
 */
const ForecastWorkspace = ({
  supplierId,
  supplierName,
  publication,
  lines,
  liveFeed,
  responses,
  materials,
  shipments,
  asns
}) => {
  const { t } = useTranslation();
  const refusalText = useRefusalText();
  const { toast } = useToast();
  const crumb = [t('sdcSup.crumb.section'), t('sdcSup.crumb.page')];
  // PF-1b — the promotion of a saved draft into a real submission.
  const promoteMutation = useRequirementResponsePromote();
  const [promotingId, setPromotingId] = useState(/** @type {string | null} */ (null));

  const [activeTab, setActiveTab] = useState(/** @type {TabKey} */ ('lines'));
  const [panelLine, setPanelLine] = useState(/** @type {ForecastLine | null} */ (null));
  const [form, setForm] = useState(/** @type {ConfirmForm} */ (emptyForm));
  // SDC-2b-EXT — the visibility-response panel (acknowledge + optional note).
  const [ackPanelLine, setAckPanelLine] = useState(/** @type {ForecastLine | null} */ (null));
  const [ackNote, setAckNote] = useState('');
  // SDC-3b — the shipment report panel.
  const [shipOpen, setShipOpen] = useState(false);
  const [shipForm, setShipForm] = useState(/** @type {ShipmentForm} */ (emptyShipmentForm));

  // ONE SubmissionSession envelope per supplier visit (addendum §5): each
  // dispatched object records an attempt on it, and every dispatch AFTER the
  // first passes the anchor correlationId as its causationId (the SDC-3a seam,
  // now driven). Degenerate no longer — two object kinds share this recorder.
  const sessionRef = useRef(/** @type {SubmissionSessionRecorder | null | null} */ (null));
  /** The visit's audit anchor for the NEXT dispatch — undefined for the first
   * @returns {string | undefined}
   *  (which becomes the anchor once recorded). */
  const causationId = () => sessionRef.current?.causationAnchor() ?? undefined;
  /**
   * Record a settled dispatch on the visit envelope (opening it on first use).
   * @param {SdcObjectKind} kind
   * @param {CommandResult} res
   */
  const recordAttempt = (kind, res) => {
    if (!sessionRef.current) {
      sessionRef.current = openSubmissionSession(
        `ss-p1-${Date.now().toString(36)}`,
        supplierId,
        sdcClock.now()
      );
    }
    sessionRef.current.attempt(kind, res.entityId ?? '', res.correlationId);
  };

  /** @param {ForecastLine} line */
  const openConfirm = (line) => {
    setPanelLine(line);
    setForm(emptyForm);
  };
  /** @param {ForecastLine} line */
  const openAcknowledge = (line) => {
    setAckPanelLine(line);
    setAckNote('');
  };
  const openShip = () => {
    setShipForm(emptyShipmentForm);
    setShipOpen(true);
  };

  const failToast = () =>
    toast({
      variant: 'error',
      title: t('sdcSup.toast.failed.title'),
      description: t('sdcSup.toast.failed.body')
    });

  // PF-1b — SUBMIT A DRAFT (t_requirementresponse_promote, Draft → Submitted).
  // The store stamps `submittedAt` on this crossing, and the buyer's
  // consolidation starts counting the line as answered only now.
  /** @param {string} responseId */
  const submitDraft = async (responseId) => {
    setPromotingId(responseId);
    try {
      const res = await promoteMutation.mutateAsync({ responseId });
      if (res.status === 'failed') {
        toast({
          variant: 'error',
          title: t('sdcSup.toast.failed.title'),
          description: refusalText(res.reason) ?? res.reason ?? t('sdcSup.toast.failed.body')
        });
        return;
      }
      recordAttempt('RequirementResponse', res);
      toast({
        variant: 'success',
        title: t('sdcSup.toast.promoted.title', { responseId }),
        description: t('sdcSup.toast.promoted.body')
      });
    } catch {
      failToast();
    } finally {
      setPromotingId(null);
    }
  };

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={crumb}
        title={t('sdcSup.header.title')}
        subtitle={t('sdcSup.header.subtitle', { supplier: supplierName })}
        actions={<LivenessPill capability="forecastPublications" />}
      />

      <PageMetaLine className="-mt-6 mb-6">
        {t('sdcSup.meta.summary', {
          lines: lines.length,
          responses: responses.length,
          planVersion: publication.planVersion
        })}
      </PageMetaLine>

      {/* FLAG-2: the governed LIVE lane is empty — the sample renders ONLY under
          this explicit banner (the honest empty state of the live lane, stated). */}
      {!liveFeed && (
        <div className="mb-6 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-text-primary">
          <Info size={16} className="mt-0.5 shrink-0 text-warning-hover" />
          <div>
            <div className="font-semibold text-warning-hover">{t('sdcSup.honesty.title')}</div>
            <p className="mt-0.5 text-text-secondary">{t('sdcSup.honesty.body')}</p>
          </div>
        </div>
      )}

      <SubTabs
        options={[
          { id: 'lines', label: t('sdcSup.tab.lines'), count: lines.length },
          { id: 'stock', label: t('sdcSup.tab.stock') },
          { id: 'shipments', label: t('sdcSup.tab.shipments'), count: shipments.length },
          { id: 'responses', label: t('sdcSup.tab.responses'), count: responses.length }
        ]}
        value={activeTab}
        onChange={setActiveTab}
        className="mb-5"
      />

      {activeTab === 'lines' && (
        <LinesTab
          lines={lines}
          responses={responses}
          publication={publication}
          onConfirm={openConfirm}
          onAcknowledge={openAcknowledge}
        />
      )}
      {/* REQ-E08-02 BR-09 (BL-60) — the Stock tab is a signpost, not an entry point. */}
      {activeTab === 'stock' && <StockMovedNotice />}
      {activeTab === 'shipments' && <ShipmentsTab shipments={shipments} onReport={openShip} />}
      {activeTab === 'responses' && (
        <ResponsesTab
          responses={responses}
          onSubmitDraft={submitDraft}
          submittingId={promoteMutation.isPending ? promotingId : null}
        />
      )}

      {/* ── Forecast confirm panel (SDC-2b) ─────────────────────────────────── */}
      <ConfirmPanel
        line={panelLine}
        form={form}
        setForm={setForm}
        onClose={() => setPanelLine(null)}
        onSaved={() => {
          setPanelLine(null);
          setForm(emptyForm);
          setActiveTab('responses');
        }}
        publication={publication}
        supplierId={supplierId}
        causationId={causationId}
        recordAttempt={recordAttempt}
        failToast={failToast}
      />

      {/* ── Acknowledge panel (SDC-2b-EXT — the visibility response) ─────────── */}
      <AcknowledgePanel
        line={ackPanelLine}
        note={ackNote}
        setNote={setAckNote}
        onClose={() => setAckPanelLine(null)}
        onAcknowledged={() => {
          setAckPanelLine(null);
          setAckNote('');
          setActiveTab('responses');
        }}
        publication={publication}
        supplierId={supplierId}
        causationId={causationId}
        recordAttempt={recordAttempt}
        failToast={failToast}
      />

      {/* ── SDC-3b — shipment report panel (direction-guarded) ──────────────── */}
      <ShipmentReportPanel
        open={shipOpen}
        form={shipForm}
        setForm={setShipForm}
        onClose={() => setShipOpen(false)}
        onReported={() => {
          setShipOpen(false);
          setShipForm(emptyShipmentForm);
          setActiveTab('shipments');
        }}
        materials={materials}
        asns={asns}
        supplierId={supplierId}
        causationId={causationId}
        recordAttempt={recordAttempt}
        failToast={failToast}
      />
    </AppShellV2>
  );
};

// Wrapper: identity gate + the scoped reads + the honest states, exactly the
// SupplierRFQs shape. The four SDC-3b reads carry own-facts-only data into the
// hub; they resolve fast (store reads), so they pass through with [] fallbacks
// rather than gating the whole page.
/** @type {React.FC} */
const SupplierForecasts = () => {
  const { t } = useTranslation();
  const crumb = [t('sdcSup.crumb.section'), t('sdcSup.crumb.page')];
  const { identity } = useCurrentIdentity();
  const { supplierId } = identity;
  const supplierQuery = useCurrentSupplier();
  const linesQuery = useOwnForecastLines();
  const responsesQuery = useOwnRequirementResponses();
  const materialsQuery = useOwnCollaboratedMaterials();
  const shipmentsQuery = useOwnIncomingShipments();
  const asnsQuery = useOwnSupplierAsns();

  if (!supplierId) return <NoSupplierIdentity />;
  if (supplierQuery.isPending || linesQuery.isPending || responsesQuery.isPending)
    return <LoadingState breadcrumb={crumb} />;
  if (supplierQuery.isError || linesQuery.isError || responsesQuery.isError)
    return (
      <ErrorState
        breadcrumb={crumb}
        error={supplierQuery.error ?? linesQuery.error ?? responsesQuery.error}
        onRetry={() => {
          supplierQuery.refetch();
          linesQuery.refetch();
          responsesQuery.refetch();
        }}
      />
    );

  const mySupplier = supplierQuery.data ?? null;
  if (!mySupplier) return <NoSupplierIdentity />;

  const read = linesQuery.data;
  const responses = responsesQuery.data ?? [];
  if (!read?.publication)
    return (
      <EmptyState
        breadcrumb={crumb}
        title={t('sdcSup.empty.title')}
        subtitle={t('sdcSup.empty.subtitle', { supplier: mySupplier.name })}
        message={t('sdcSup.empty.message')}
      />
    );

  return (
    <ForecastWorkspace
      supplierId={supplierId}
      supplierName={mySupplier.name}
      publication={read.publication}
      lines={read.lines}
      liveFeed={read.liveFeed}
      responses={responses}
      materials={materialsQuery.data ?? []}
      shipments={shipmentsQuery.data ?? []}
      asns={asnsQuery.data ?? []}
    />
  );
};

export default SupplierForecasts;
