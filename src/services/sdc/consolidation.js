// ─────────────────────────────────────────────────────────────────────────────
// SDC-1a — the P2 planner-consolidation READ-MODEL (pure selectors).
//
// The master-spreadsheet replacement's engine (design v2 §5): across all
// suppliers × materials × periods, demand (the published forecast) vs supplier
// confirmation vs fulfilment state — who responded, who confirmed in full,
// who's short, who's silent. READ-ONLY: every function here is pure (data in →
// view-model out, zero mutation, no new command); the fixture arrays arrive as
// ARGUMENTS (the whatIfScore pattern), so the SDC-4 useDataService repoint
// swaps the feed without touching a selector.
//
// THE BOUNDARY (design §5, addendum §6 — held):
//   · Response tracking = OURS. Line states, rollups, deficits, the chase list.
//   · Coverage PROJECTION (network netting, projected-shortage-date) = SOMO's.
//     Never computed here.
//   · The ONE projection that is ours: the supplier-coverage indicator
//     (addendum §6) — per-supplier sufficiency over OUR objects + published
//     lines only. It is MODELED (computed, not measured): the surface marks it
//     with ModelMarker Σ, never the DP-3 observed grammar.
//
// Design canon: docs/Supplier_Data_Collaboration_Design_v2.md §3.2/§5 +
// docs/SDC-0_Build_Freeze_Addendum.md §6/§7.
// ─────────────────────────────────────────────────────────────────────────────

/** @import { ForecastLine, ForecastPublication, IncomingShipment, InventoryDeclaration, RequirementResponse, SupplierMaterialRelationship, Uom } from './types' */
import { declarationGranularity, declarationRecency } from './inventory';
import { coverageThresholds } from '../transitions/inventoryConfig';

// ─── Policy constants (P2 display layer — NOT schema) ─────────────────────────

/**
 * SDC-1 ruling F-1: the response deadline is a NAMED POLICY CONSTANT in the P2
 * layer — days after `publishedAt` before an unanswered line counts as overdue.
 * PRE-SDC-5 INTERIM: deadline offsets are chase-RULE data (design §6, properties
 * of the publication + supplier relationship) and get a real data model when the
 * chase engine lands; per addendum §7 they are NOT backfilled into the SDC-0
 * objects now.
 */
export const RESPONSE_DUE_DAYS = 7;

/**
 * The supplier-coverage bands: ratio ≥ Covered is covered; ≥ At risk is
 * at-risk; below it is uncovered. ⚠️ **THESE ARE CR-03's, READ IN FORCE
 * (BL-32).** Until BL-32 this was a second constant (`COVERAGE_AT_RISK_FLOOR =
 * 0.8`, with `ratio >= 1` written inline) pinned equal to CR-03 by a test —
 * which held only while nobody could change CR-03. With the administrator able
 * to, a copy would have kept 0.8 while the inventory alerts moved: two
 * coverage rules. Found by deriving the readers of the CR-03 values, not by
 * the config module's import list (this file never imported it).
 * @returns {{ readonly coveredFrom: number; readonly atRiskFrom: number }}
 */
export function coverageBands() {
  return coverageThresholds();
}

// ─── Small pure date helpers (UTC, bucket-native) ─────────────────────────────

const DAY_MS = 86_400_000;

/**
 * ISO timestamp `days` after `iso`.
 * @param {string} iso
 * @param {number} days
 * @returns {string}
 */
function addDaysIso(iso, days) {
  return new Date(Date.parse(iso) + days * DAY_MS).toISOString();
}

/**
 * The last day (UTC ms) of a period bucket. A month bucket ('2026-08') ends on
 * its last day (2026-08-31); a week bucket is named by its Monday
 * ('2026-08-31') and ends on the Sunday six days later (REQ-E06-01 BR-03).
 * @param {string} bucket
 * @returns {number}
 */
export function bucketEndMs(bucket) {
  const [y, m, d] = bucket.split('-').map(Number);
  if (d !== undefined && !Number.isNaN(d)) return Date.UTC(y, m - 1, d + 6);
  // Day 0 of the NEXT month = the last day of this bucket's month.
  return Date.UTC(y, m, 0);
}

/**
 * Whole days from `nowIso` until `endMs` (negative when already past).
 * @param {string} nowIso
 * @param {number} endMs
 * @returns {number}
 */
function daysUntil(nowIso, endMs) {
  return Math.floor((endMs - Date.parse(nowIso)) / DAY_MS);
}

// ─── The current publication ──────────────────────────────────────────────────

/**
 * The publication the planner consolidates AGAINST: the latest governed snapshot
 * by `publishedAt`. Older publications stay in the input — they are the record
 * of what each supplier answered (we are the SoR for what the supplier saw,
 * design §3.2), which is exactly what staleness detection reads.
 * @param {readonly ForecastPublication[]} publications
 * @returns {ForecastPublication | null}
 */
export function currentPublication(publications) {
  /** @type {ForecastPublication | null} */
  let latest = null;
  for (const p of publications) {
    if (latest === null || Date.parse(p.publishedAt) > Date.parse(latest.publishedAt)) {
      latest = p;
    }
  }
  return latest;
}

// ─── Line response states (the discriminated union) ───────────────────────────

/**
 * The per-line collaboration state, derived by joining the CURRENT publication's
 * lines against the responses (supplier × material × period).
 *
 *  · awaiting — no SUBMITTED response. SDC-1 ruling F-2: a Draft is NOT a
 *    response (the planner never acts on an uncommitted supplier draft —
 *    own-facts discipline).
 *
 *    ⚠️ PF-1b — THE `draftInProgress` HINT IS GONE, and the FIELD went with
 *    it rather than only its render (operator ruling). It carried no response
 *    content, which is why it survived design review; what it carried was
 *    EXISTENCE. Once creation births every commitment at `Draft`, that flag
 *    became A NEAR-REAL-TIME SIGNAL THAT A NAMED SUPPLIER HAD STARTED
 *    COMPOSING AN ANSWER — disclosed by nobody's choice.
 *
 *      **EXISTENCE IS PART OF WHAT `Draft` MAKES INVISIBLE.** The supplier did
 *      not consent to being observed composing.
 *
 *    Deleting the render alone would have left the fact CROSSING THE SEAM in
 *    the buyer's payload, unrendered — a disclosure nobody can see and nobody
 *    removed. So the union member is gone: `awaiting` now says exactly what it
 *    means, which is that nothing has been submitted.
 *  · acknowledged — SDC-2b-EXT: a VISIBILITY response (the supplier saw the
 *    visibility-only line and answered with an acknowledgment + optional
 *    signal). Honestly DISTINCT from the commitment states: it never reads
 *    confirmed-full/short because there is no commitment to measure.
 *  · confirmed-full / short — a submitted confirmation against the current
 *    version, OR one carried forward from a superseded version whose line did
 *    NOT move (`carriedForward: true` — design §3.2: presumed-valid, not
 *    voided). `short` carries the deficit the planner chases.
 *  · stale-against-current — the response answered a SUPERSEDED planVersion and
 *    the line has MOVED since (or the answered snapshot can't be located, in
 *    which case `answeredQty` is null — flagged rather than presumed valid).
 *    Exact-match interim: the tolerance knob (re-confirm only beyond tolerance)
 *    is SDC-4's delta-on-read; until then any movement flags. Applies to
 *    acknowledgments the same way — "acknowledged 800, now 1 000" is flagged.
 */
/**
 *  The demand qty in the version the supplier answered (null: not found).
 *
 * @typedef {| { readonly kind: 'awaiting' }
 *   | {
 *       readonly kind: 'acknowledged';
 *       readonly response: RequirementResponse;
 *       readonly carriedForward: boolean;
 *     }
 *   | {
 *       readonly kind: 'confirmed-full';
 *       readonly response: RequirementResponse;
 *       readonly carriedForward: boolean;
 *     }
 *   | {
 *       readonly kind: 'short';
 *       readonly response: RequirementResponse;
 *       readonly deficitQty: number;
 *       readonly carriedForward: boolean;
 *     }
 *   | {
 *       readonly kind: 'stale-against-current';
 *       readonly response: RequirementResponse;
 *       readonly answeredQty: number | null;
 *       readonly currentQty: number;
 *     }} LineResponseState
 */

/** One consolidation row: a current published line + its collaboration state. */
/**
 * @typedef {object} ConsolidationRow
 * @property {string} id -  Stable row key (DSG rowKey): supplier|material|period.
 * @property {ForecastLine} line
 * @property {LineResponseState} state
 */

/**
 * @param {string} supplierId
 * @param {string} materialCode
 * @param {string} periodBucket
 * @returns {string}
 */
const lineKey = (supplierId, materialCode, periodBucket) =>
  `${supplierId}|${materialCode}|${periodBucket}`;

/**
 * The submitted (non-Draft) responses keyed by line, latest submission first.
 * @param {readonly RequirementResponse[]} responses
 * @returns {Map<string, RequirementResponse>}
 */
function latestSubmittedByLine(responses) {
  const byLine = /** @type {Map<string, RequirementResponse>} */ (new Map());
  for (const r of responses) {
    if (r.status === 'Draft') continue;
    const k = lineKey(r.supplierId, r.materialCode, r.periodBucket);
    const prev = byLine.get(k);
    if (!prev || r.submissionVersion > prev.submissionVersion) byLine.set(k, r);
  }
  return byLine;
}

/**
 * Fresh-or-carried: fold a response into its state against a demand qty.
 * An ACKNOWLEDGMENT (invariant #11: no forecastConfirmation) discriminates
 * FIRST — it is never measured as a commitment (SDC-2b-EXT honesty rule).
 * @param {RequirementResponse} response
 * @param {number} demandQty
 * @param {boolean} carriedForward
 * @returns {LineResponseState}
 */
function answeredState(response, demandQty, carriedForward) {
  if (response.acknowledgment) return { kind: 'acknowledged', response, carriedForward };
  const confirmed = /** @type {import('./types').ForecastConfirmation} */ (
    response.forecastConfirmation
  ).confirmedQty;
  return confirmed >= demandQty
    ? { kind: 'confirmed-full', response, carriedForward }
    : { kind: 'short', response, deficitQty: demandQty - confirmed, carriedForward };
}

/**
 * The consolidation join: every line of the CURRENT publication, each with its
 * derived response state. Pure; the inputs are never mutated.
 * @param {readonly ForecastPublication[]} publications
 * @param {readonly RequirementResponse[]} responses
 * @returns {readonly ConsolidationRow[]}
 */
export function consolidationRows(publications, responses) {
  const current = currentPublication(publications);
  if (current === null) return [];
  const submitted = latestSubmittedByLine(responses);

  return current.lines.map((line) => {
    const k = lineKey(line.supplierId, line.materialCode, line.periodBucket);
    const response = submitted.get(k);

    // ⚠️ PF-1b — NOTHING IS DERIVED FROM THE DRAFTS HERE. `awaiting` is the
    // whole answer: a line with no submitted response is unanswered, and whether
    // somebody is mid-draft is theirs to disclose by submitting.
    if (!response) return { id: k, line, state: { kind: 'awaiting' } };

    // Answered the current snapshot → fresh full/short.
    if (
      response.publicationId === current.publicationId &&
      response.planVersion === current.planVersion
    ) {
      return { id: k, line, state: answeredState(response, line.forecastQty, false) };
    }

    // Answered a superseded snapshot: carry forward presumed-valid when the line
    // did NOT move (design §3.2 — voiding forces re-confirmation churn); flag
    // stale when it moved or the answered snapshot can't be verified.
    const answeredPub = publications.find(
      (p) => p.publicationId === response.publicationId && p.planVersion === response.planVersion
    );
    const answeredLine = answeredPub?.lines.find(
      (l) =>
        l.supplierId === line.supplierId &&
        l.materialCode === line.materialCode &&
        l.periodBucket === line.periodBucket
    );
    if (answeredLine && answeredLine.forecastQty === line.forecastQty) {
      return { id: k, line, state: answeredState(response, line.forecastQty, true) };
    }
    return {
      id: k,
      line,
      state: {
        kind: 'stale-against-current',
        response,
        answeredQty: answeredLine?.forecastQty ?? null,
        currentQty: line.forecastQty
      }
    };
  });
}

// ─── Supplier rollup (responded / partial / silent) ───────────────────────────

/** @typedef {'responded' | 'partial' | 'silent'} SupplierRollupKind */

/**
 * @typedef {object} SupplierRollup
 * @property {string} supplierId
 * @property {number} totalLines
 * @property {number} answeredLines -  Lines with a submitted response — fresh, carried, or stale (a stale line
 *    WAS answered; calling that supplier silent would be false — the re-confirm
 *    request is a P3 trigger, not a chase-list fact).
 * @property {number} awaitingLines
 * @property {SupplierRollupKind} rollup
 */

/**
 * Per-supplier response rollup over the consolidation rows.
 * @param {readonly ConsolidationRow[]} rows
 * @returns {readonly SupplierRollup[]}
 */
export function supplierRollups(rows) {
  const bySupplier =
    /** @type {Map<string, { total: number; answered: number; awaiting: number }>} */ (new Map());
  for (const row of rows) {
    const s =
      bySupplier.get(row.line.supplierId) ??
      /** @type {NonNullable<ReturnType<(ReturnType<typeof bySupplier.set>)['get']>>} */ (
        bySupplier
          .set(row.line.supplierId, { total: 0, answered: 0, awaiting: 0 })
          .get(row.line.supplierId)
      );
    s.total += 1;
    if (row.state.kind === 'awaiting') s.awaiting += 1;
    else s.answered += 1;
  }
  return [...bySupplier.entries()].map(([supplierId, s]) => ({
    supplierId,
    totalLines: s.total,
    answeredLines: s.answered,
    awaitingLines: s.awaiting,
    rollup: s.answered === 0 ? 'silent' : s.awaiting === 0 ? 'responded' : 'partial'
  }));
}

// ─── The chase list (pre-scheduler, design §5) ────────────────────────────────

/**
 * Why a supplier is on the chase list:
 *  · overdue — the response deadline has passed and lines are still awaiting
 *    (covers silent AND partially-responded suppliers past the due date).
 *  · partial-response — started but incomplete, surfaced even before the
 *    deadline (a nudgeable state the planner may act on early).
 */
/** @typedef {'overdue' | 'partial-response'} ChaseReason */

/**
 * @typedef {object} ChaseEntry
 * @property {string} supplierId
 * @property {ChaseReason} reason
 * @property {number} awaitingLines
 * @property {string} dueAt -  The interim policy deadline: publishedAt + RESPONSE_DUE_DAYS.
 */

/**
 * The manual chase list the planner works via the existing WhatsApp chrome —
 * ~60% of the chase value at zero scheduler cost (design §5). `now` is injected
 * (pure; the page passes the clock in). Sorted overdue-first, then most
 * awaiting lines, then supplierId for stability.
 * @param {ForecastPublication} publication
 * @param {readonly ConsolidationRow[]} rows
 * @param {string} now
 * @returns {readonly ChaseEntry[]}
 */
export function chaseList(publication, rows, now) {
  const dueAt = addDaysIso(publication.publishedAt, RESPONSE_DUE_DAYS);
  const overdue = Date.parse(now) > Date.parse(dueAt);
  /** @type {ChaseEntry[]} */
  const entries = [];
  for (const r of supplierRollups(rows)) {
    if (r.awaitingLines === 0) continue;
    if (overdue)
      entries.push({
        supplierId: r.supplierId,
        reason: 'overdue',
        awaitingLines: r.awaitingLines,
        dueAt
      });
    else if (r.answeredLines > 0)
      entries.push({
        supplierId: r.supplierId,
        reason: 'partial-response',
        awaitingLines: r.awaitingLines,
        dueAt
      });
    // A silent supplier BEFORE the deadline is not chased yet.
  }
  return entries.sort(
    (a, b) =>
      Number(b.reason === 'overdue') - Number(a.reason === 'overdue') ||
      b.awaitingLines - a.awaitingLines ||
      a.supplierId.localeCompare(b.supplierId)
  );
}

// ─── The supplier-coverage indicator (addendum §6 — the ONE projection ours) ──

/**
 * The per-supplier sufficiency read: "does THIS supplier's declared SOH +
 * incoming cover THEIR firm/semi-firm horizon, given the principal lead time?"
 * Uses ONLY our objects + the published lines — no network netting, no
 * allocation-across-suppliers, no projected-shortage-date (those stay SOMO's).
 *
 *  · no-declaration — the supplier has not declared SOH: an HONEST BLANK. The
 *    indicator is never fabricated from a zero the supplier didn't state.
 *  · covered / at-risk / uncovered — banded coverage ratio (see
 *    COVERAGE_AT_RISK_FLOOR). `unbridgeable` is the principal-lead-time flag:
 *    a DISTRIBUTOR's shortfall that no principal replenishment ordered now can
 *    reach within the committed horizon (min principal lead time > days to the
 *    horizon end). For a manufacturer it stays false — we do not model their
 *    lead time yet (CapacityProfile is build-deferred), and we flag only what
 *    we can interpret.
 *
 * EXPIRY-BLINDNESS (SDC-3a total-first → SDC-3b): every banded status carries
 * `expiryBlind`, true when the SOH it read was a TOTAL-ONLY declaration (no
 * batch/expiry detail — `declarationGranularity` = 'total-only'). The ratio is
 * still honest (totalQty is the SOH floor), but the indicator CANNOT assess
 * whether stock expires before the committed horizon — so the surface must MARK
 * "batch/expiry detail not declared" and NEVER silently assume no-expiry-risk.
 * A batch-grain declaration feeds the full (expiry-aware) read (expiryBlind
 * false). `no-declaration` carries no flag — there is nothing to be blind about.
 *
 * MODELED, permanently: this is a computed sufficiency heuristic, not a
 * measured fact — the surface marks it Σ (ModelMarker), never DP-3 observed.
 */
/**
 * @typedef {| { readonly kind: 'no-declaration' }
 *   | { readonly kind: 'covered'; readonly ratio: number; readonly expiryBlind: boolean }
 *   | {
 *       readonly kind: 'at-risk';
 *       readonly ratio: number;
 *       readonly unbridgeable: boolean;
 *       readonly expiryBlind: boolean;
 *     }
 *   | {
 *       readonly kind: 'uncovered';
 *       readonly ratio: number;
 *       readonly unbridgeable: boolean;
 *       readonly expiryBlind: boolean;
 *     }} CoverageStatus
 */

/**
 * @typedef {object} SupplierCoverageEntry
 * @property {string} supplierId
 * @property {string} materialCode
 * @property {number} committedDemandQty -  Σ firm + semi-firm demand for the pair in the current publication.
 * @property {Uom} uom
 * @property {CoverageStatus} status
 */

/**
 * Coverage entries for every supplier × material pair carrying firm/semi-firm
 * demand in the CURRENT publication (visibility-only lines are forward
 * visibility, not commitment — no sufficiency read).
 *
 * Supply side: the latest InventoryDeclaration (by declaredAt, Σ batches) plus
 * Σ IncomingShipment in Booked|Shipped — BOTH directions (a to-paragon leg
 * fulfils the demand directly; a principal-to-distributor leg replenishes the
 * supplier's stock). Arrived and Cancelled legs never count. A deliberately
 * simple sufficiency heuristic — banded, Σ-marked, tuned at the real-planner
 * validation checkpoint.
 * @param {readonly ForecastPublication[]} publications
 * @param {readonly InventoryDeclaration[]} declarations
 * @param {readonly IncomingShipment[]} shipments
 * @param {readonly SupplierMaterialRelationship[]} relationships
 * @param {string} now
 * @returns {readonly SupplierCoverageEntry[]}
 */
export function supplierCoverageEntries(publications, declarations, shipments, relationships, now) {
  const current = currentPublication(publications);
  if (current === null) return [];

  // Group the pair's committed lines: demand total + the latest committed bucket.
  const pairs =
    /** @type {Map<string, { supplierId: string; materialCode: string; demand: number; uom: Uom; lastBucket: string }>} */ (
      new Map()
    );
  for (const line of current.lines) {
    if (line.commitmentClass === 'visibility-only') continue;
    const k = `${line.supplierId}|${line.materialCode}`;
    const p = pairs.get(k);
    if (!p) {
      pairs.set(k, {
        supplierId: line.supplierId,
        materialCode: line.materialCode,
        demand: line.forecastQty,
        uom: line.uom,
        lastBucket: line.periodBucket
      });
    } else {
      p.demand += line.forecastQty;
      if (line.periodBucket > p.lastBucket) p.lastBucket = line.periodBucket;
    }
  }

  return [...pairs.values()].map(({ supplierId, materialCode, demand, uom, lastBucket }) => {
    // Latest SOH declaration for the pair — absent ⇒ honest blank. "Latest" is
    // by store-insertion recency (SDC-4a ruling c), NOT declaredAt: a fresh
    // declare stamped with the simulated clock must win over a future-dated seed.
    /** @type {InventoryDeclaration | null} */
    let latestDecl = null;
    for (const d of declarations) {
      if (d.supplierId !== supplierId || d.materialCode !== materialCode) continue;
      if (latestDecl === null || declarationRecency(d) > declarationRecency(latestDecl)) {
        latestDecl = d;
      }
    }
    if (latestDecl === null) {
      return {
        supplierId,
        materialCode,
        committedDemandQty: demand,
        uom,
        status: /** @type {const} */ ({ kind: 'no-declaration' })
      };
    }

    // SDC-3a total-first: totalQty IS the SOH floor (Σ batches when detail is
    // present — invariant #6′ keeps them equal, so no second sum here).
    const soh = latestDecl.totalQty;
    // SDC-3b: a total-only declaration is EXPIRY-BLIND — the coverage read
    // cannot assess expiry bridgeability, so the surface must mark it (never
    // assume no-expiry-risk). Batch-grain feeds the full expiry-aware read.
    const expiryBlind = declarationGranularity(latestDecl) === 'total-only';
    const incoming = shipments.reduce(
      (s, sh) =>
        sh.supplierId === supplierId &&
        sh.materialCode === materialCode &&
        (sh.lifecycle === 'Booked' || sh.lifecycle === 'Shipped')
          ? s + sh.qty
          : s,
      0
    );
    const ratio = demand > 0 ? (soh + incoming) / demand : Infinity;
    const bands = coverageBands();

    if (ratio >= bands.coveredFrom) {
      return {
        supplierId,
        materialCode,
        committedDemandQty: demand,
        uom,
        status: /** @type {const} */ ({ kind: 'covered', ratio, expiryBlind })
      };
    }

    // Shortfall: can a principal replenishment ordered NOW still arrive inside
    // the committed horizon? Only interpretable for a distributor (design §7).
    const rel = relationships.find(
      (r) => r.supplierId === supplierId && r.materialCode === materialCode
    );
    const leadTimes = (rel?.supplierType === 'distributor' ? (rel.principals ?? []) : []).map(
      (p) => p.principalLeadTimeDays
    );
    const unbridgeable =
      leadTimes.length > 0 && Math.min(...leadTimes) > daysUntil(now, bucketEndMs(lastBucket));

    const kind =
      ratio >= bands.atRiskFrom
        ? /** @type {const} */ ('at-risk')
        : /** @type {const} */ ('uncovered');
    return {
      supplierId,
      materialCode,
      committedDemandQty: demand,
      uom,
      status: { kind, ratio, unbridgeable, expiryBlind }
    };
  });
}
