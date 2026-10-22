/** @import React from 'react' */
import { Fragment, useMemo, useState } from 'react';
import 'react-datasheet-grid/dist/style.css';
import '../plan-grid/planGrid.css';
import { useTranslation } from 'react-i18next';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import {
  useResolveRequirementDispute,
  useReviewRequirementResponse,
  useAcceptRequirementResponse,
  useDisputeRequirementResponse
} from '@services/query/sdcBuyerHooks';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
/** @import { CoverageRow } from './const' */
import ConsolidationHeader from './components/ConsolidationHeader';
import PeriodBar from './components/PeriodBar';
import ConsolidationGrid from './components/ConsolidationGrid';
import ChaseList from './components/ChaseList';
import AwaitingReviewSection from './components/AwaitingReviewSection';
import UnderReviewSection from './components/UnderReviewSection';
import DisputesSection from './components/DisputesSection';
import ResolveCapture from './components/ResolveCapture';
import DisputeCapture from './components/DisputeCapture';
import { useConsolidationColumns } from './hooks/useConsolidationColumns';
import { useConsolidationData } from './hooks/useConsolidationData';
import { useOutcomeOf } from './hooks/useOutcomeOf';

// ────────────────────────────────────────────────────────────────────────────
// BuyerCollaboration (SDC-1b) — the P2 planner consolidation view: the
// master-spreadsheet replacement (RFP p.13) on screen.
//
// (WAS: read-only end-to-end.) NO LONGER TRUE AS OF R1b, and the sentence that
// stood here is corrected rather than deleted. ONE action writes: a planner
// resolves a supplier's dispute, firing `t_requirementresponse_resolve` with the
// required authored answer. Everything else still renders no mutation, no
// command and no dispatch. The honesty BANNER copy changed in the same batch —
// a banner still promising read-only is an unbacked affordance run backwards.
// SDC-4d — the consolidation reads are now buyer-scoped `useServiceQuery` over
// the LIVE stores (via svc.collaboration.*), fed by the shared sdcClock, so a P1
// supplier declare / confirm is reflected here (the P1→P2 loop, closed on
// fixtures). Buyer-gated: a supplier persona resolves []. The DSG engine ships in
// this page's async chunk (lazy route, shared with PlanGrid — see AppRouter);
// every honest marker still derives from the registry (`forecastPublications`:
// gate-2 shut on the SOMO C8 feed → green structurally unreachable, the pill
// reads "Sample — awaiting SOMO C8 feed" — this is live-on-fixtures, NOT a live
// feed, so the registry / gate-2 / Sample pills are untouched).
//
// THE BOUNDARY (design §5, addendum §6): response tracking is OURS; network
// coverage-projection stays SOMO's. The ONE projection rendered here is the
// per-supplier coverage indicator — MODELED, Σ-marked (ModelMarker), never
// wearing the DP-3 observed grammar; a missing declaration renders an HONEST
// BLANK, never a fabricated zero (the CI-2 honest-silence pattern).
// ────────────────────────────────────────────────────────────────────────────
//
// PHASE 5 PAGE SPLIT — this folder replaces `BuyerCollaboration.jsx` with no
// behaviour change. The page keeps the period filter, both captures' state and
// the four verb availabilities; `const.js` / `utils.js` hold the module-scope
// constants and pure helpers, `hooks/` the reads, the grid columns and the
// shared outcome handling, and `components/` one section or panel per file.

/**
 * P-04 (IA-B05) — `embedded` renders the view inside another page's shell: the
 * Foresight commitments page's Consolidation tab. It drops the shell and the
 * page header (the host page owns both) and keeps everything else, the
 * subtitle and the liveness pill included.
 * @type {React.FC<{ embedded?: boolean }>}
 */
const BuyerCollaboration = ({ embedded = false }) => {
  const { t } = useTranslation();

  // The period filter — 'all' or one horizon bucket of the current publication.
  const [period, setPeriod] = useState(/** @type {string} */ ('all'));

  // R1b - the resolve capture. `answer` is deliberately NOT seeded from
  // anything: a resolution is AUTHORED, and pre-filling it with the dispute text
  // would let somebody resolve by pressing a button on a sentence they did not
  // write.
  const [resolving, setResolving] = useState(/** @type {CoverageRow | null} */ (null));
  const [answer, setAnswer] = useState('');
  const resolveMutation = useResolveRequirementDispute();

  // §74 — `t_requirementresponse_resolve` (atom
  // `requirementresponse:dispute`, held by `planning`).
  //
  // ⚠️ THE NOTICE SITS ON THE SECTION, NOT ON EACH ROW. The CTA is per
  // dispute and the list is unbounded; the same owner repeated down it is
  // noise, and the atom does not vary by row. `offersResolve` still decides
  // whether a row's STATE offers the verb at all — legality, asked of the
  // machine — and this decides whether the SEAT may fire it. Two different
  // questions; neither substitutes for the other.
  const resolveAvailability = useVerbAvailability('requirementresponse:dispute');

  // WAVE C — the review lane's capture. Same discipline as `answer` above: a
  // dispute is AUTHORED, so nothing seeds it.
  const [disputing, setDisputing] = useState(/** @type {CoverageRow | null} */ (null));
  const [objection, setObjection] = useState('');
  const reviewMutation = useReviewRequirementResponse();
  const acceptMutation = useAcceptRequirementResponse();
  const disputeMutation = useDisputeRequirementResponse();

  // ⚠️ THREE ATOMS, THREE AVAILABILITIES, THREE NOTICES — never one gate over
  // three controls. `requirementresponse:review`, `:accept` and `:dispute` are
  // DISTINCT atoms that happen to sit in the same lane today; collapsing them
  // onto one check would be asserting that co-residence is permanent, and the
  // day a role catalogue splits the lane the surface would offer an act the
  // dispatcher refuses. `:dispute` is deliberately resolved a second time here
  // rather than reusing `resolveAvailability`: same atom, different verb, and
  // §76 puts one notice in each verb's own slot.
  const reviewAvailability = useVerbAvailability('requirementresponse:review');
  const acceptAvailability = useVerbAvailability('requirementresponse:accept');
  const disputeAvailability = useVerbAvailability('requirementresponse:dispute');

  const closeDispute = () => {
    setDisputing(null);
    setObjection('');
  };

  const closeResolve = () => {
    setResolving(null);
    setAnswer('');
  };

  const outcomeOf = useOutcomeOf(t);

  const {
    rows,
    chase,
    rollups,
    disputedRows,
    awaitingReviewRows,
    underReviewRows,
    rowsWithCoverage
  } = useConsolidationData();

  const visibleRows = useMemo(
    () =>
      period === 'all'
        ? rowsWithCoverage
        : rowsWithCoverage.filter((r) => r.line.periodBucket === period),
    [period, rowsWithCoverage]
  );

  const columns = useConsolidationColumns(t);

  const Shell = embedded ? Fragment : AppShellV2;

  return (
    <Shell>
      <ConsolidationHeader embedded={embedded} rows={rows} rollups={rollups} />

      {/* ── Period filter bar — the PERIOD owns the commitment class ───────── */}
      <PeriodBar period={period} setPeriod={setPeriod} />

      {/* ── The consolidation grid (read-only DSG, full-screen-capable) ────── */}
      <ConsolidationGrid visibleRows={visibleRows} columns={columns} />

      {/* ── Chase list — the pre-scheduler manual WhatsApp interim ─────────── */}
      <ChaseList chase={chase} rollups={rollups} />

      {/* WAVE C - RESPONSES AWAITING REVIEW (`t_requirementresponse_review`).
          Plain DOM beside the chase list, deliberately NOT an action cell in the
          DSG: that grid's body is virtualized and lays out NO ROWS under jsdom's
          zero-height viewport, so an action placed there ships with browser QA
          and nothing else behind it. The disputes section below learned that the
          hard way; this copies the shape rather than rediscovering it. */}
      <AwaitingReviewSection
        awaitingReviewRows={awaitingReviewRows}
        reviewAvailability={reviewAvailability}
        reviewMutation={reviewMutation}
        outcomeOf={outcomeOf}
      />

      {/* WAVE C - UNDER REVIEW: accept or dispute. TWO verbs on ONE row, and
          they are CO-REACHABLE (both declare `from: ['UnderReview']`), which is
          precisely why each gets its own notice in its own slot rather than one
          notice for the section. §76 retired the group collapse for verbs that
          were NOT co-reachable on any one document; these are, and the rule
          lands the same way from the other side. */}
      <UnderReviewSection
        underReviewRows={underReviewRows}
        acceptAvailability={acceptAvailability}
        disputeAvailability={disputeAvailability}
        acceptMutation={acceptMutation}
        outcomeOf={outcomeOf}
        setDisputing={setDisputing}
        setObjection={setObjection}
      />

      {/* R1b - DISPUTES AWAITING RESOLUTION.
          ⚠️ THIS IS NOT WHERE THE ACTION WAS FIRST BUILT, and the move is a
          finding rather than a preference. It was an action cell in the DSG,
          which is where "the buyer's action on the disputed row" naturally
          lands - and the grid BODY is virtualized and lays out NO ROWS under
          jsdom's zero-height viewport (this page's own test header has said so
          since SDC-1b). The page's one and only write would have shipped with
          zero spec coverage and nothing but browser QA behind it.
          Plain DOM, beside the chase list, which is the shape this page already
          uses for work a planner has to act on. The population is DERIVED from
          the machine, never filtered on a status literal, so the section empties
          itself the moment a dispute is answered. */}
      <DisputesSection
        disputedRows={disputedRows}
        resolveAvailability={resolveAvailability}
        setResolving={setResolving}
        setAnswer={setAnswer}
      />

      {/* R1b - the resolve capture, in the invoice dispute panel's shape.
          WAVE C - and now ONE component, shared with the dispute capture below.

          ⚠️ EACH PANEL IS MOUNTED ONLY WHILE ITS OWN ROW IS OPEN. The reason
          RECORDED here has been superseded and is restated rather than left to
          rot: it said `SidePanel` "renders its DOM unconditionally and merely
          translates it off-screen", so a second always-mounted panel put a
          duplicate of every control - two Cancels, two commits, two textareas -
          permanently in the tree, and `aria-hidden` hid them from a screen
          reader and from nothing else. **That was true, it cost ten red tests
          the day the second panel landed, and it is now FIXED AT THE COMPONENT**
          (`SidePanel` returns null when closed; see its contract note). So this
          guard is no longer what stands between the page and a duplicated
          control.

          It stays anyway, and not from inertia: the guard means the panel's
          props - titles, translated copy, the row lookups behind them - are not
          computed for a row nobody opened. That is a smaller reason than the one
          it replaces, and it is the honest one.

          The two panels differ in their verb, their words and their atom;
          everything they have in common lives in `ReasonPanel` rather than in
          two files that agree today. */}
      {resolving && (
        <ResolveCapture
          resolving={resolving}
          answer={answer}
          setAnswer={setAnswer}
          resolveMutation={resolveMutation}
          closeResolve={closeResolve}
          resolveAvailability={resolveAvailability}
          outcomeOf={outcomeOf}
        />
      )}

      {/* WAVE C - the dispute capture. The SAME panel, the SAME policy guard,
          the SAME ledger - only the verb, its atom and its words differ. */}
      {disputing && (
        <DisputeCapture
          disputing={disputing}
          objection={objection}
          setObjection={setObjection}
          disputeMutation={disputeMutation}
          closeDispute={closeDispute}
          disputeAvailability={disputeAvailability}
          outcomeOf={outcomeOf}
        />
      )}
    </Shell>
  );
};

export default BuyerCollaboration;
