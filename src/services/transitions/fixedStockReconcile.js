// ─────────────────────────────────────────────────────────────────────────────
// FIXED STOCK (FS) RECONCILE — REQ-E06-04 (ENG-D21, team review 2026-09-28;
// owner decisions 2026-09-29).
//
// PURE. No store, no clock: the read model hands in the standing commitments,
// the call-offs (already classified by the call-off rules), the supplier stock
// submissions, the maximum stock Procurement maintains, and the day to
// reconcile on, and gets rows back. Nothing here is stored.
//
// Per supplier × material × cycle:
//   · committed  — the supplier's Firm and Trade-off commitments (REQ-E06-02)
//                  for the periods in the cycle (BR-03);
//   · called off — the deliveries the supplier ACCEPTED on PTI's call-offs
//                  (REQ-E09-03), dated in the cycle; a call-off still awaiting
//                  the supplier, or a counter-offer awaiting PTI, is not
//                  counted and is shown as a note (BR-04, owner 2026-09-29);
//   · held       — the supplier's stock figure (REQ-E08-02): the current one
//                  while the cycle runs, the latest submitted by its end once
//                  it has ended; or "not reported" (BR-05);
//   · max stock  — the value Procurement maintains, or "no max stock agreed" (BR-06).
//
// not called off = max(0, committed − called off). Outcome (BR-08), first match wins:
//   1. not called off > 0, held not reported → stockNotReported
//   2. not called off > 0, held < it          → supplierShort
//   3. not called off > 0, held ≥ it          → underCalled
//   4. nothing committed, something called off → notCommitted
//   5. held above the max stock               → overHeld
//   6. otherwise                               → balanced
// Liability (BR-09, ENG-D17): min(not called off, held, max stock) for outcomes
// 2 and 3, flagged "liability — not priced", never priced.
// ─────────────────────────────────────────────────────────────────────────────

import { addDays, daysBetween } from '../engine/dates';
/** @import { ForecastStream } from '../sdc/types' */

/**
 * @typedef {| 'supplierShort'
 *   | 'underCalled'
 *   | 'stockNotReported'
 *   | 'notCommitted'
 *   | 'overHeld'
 *   | 'balanced'} FsOutcome
 */

/**
 * Most urgent first — the order the planner's list is sorted in (BR-11).
 * @type {readonly FsOutcome[]}
 */
export const FS_OUTCOME_ORDER = [
  'supplierShort',
  'underCalled',
  'stockNotReported',
  'notCommitted',
  'overHeld',
  'balanced'
];

/**
 * @typedef {object} FsFigures
 * @property {number} committed
 * @property {number} calledOff
 * @property {number | null} held -  Null when the supplier has no stock figure on or before the cycle end.
 * @property {number | null} maxStock -  Null when no maximum stock is agreed.
 */

/**
 * @typedef {object} FsResult
 * @property {FsOutcome} outcome
 * @property {number} uncalled -  max(0, committed − called off) — never negative (owner, 2026-09-29).
 * @property {number} calledBeyond -  What PTI called off beyond the commitment (0 when it did not).
 * @property {number} liabilityQty -  Quantity flagged "liability — not priced" (ENG-D17); 0 when none.
 * @property {number} shortQty -  Uncalled commitment the supplier does not hold (supplierShort only).
 * @property {number} aboveMaxQty -  Held above the agreed maximum; the supplier's own stock, outside the settlement.
 */

/**
 * BR-07 to BR-09 — compare the three figures for one supplier × material × cycle.
 * @param {FsFigures} f
 * @returns {FsResult}
 */
export function reconcileFigures(f) {
  const diff = f.committed - f.calledOff;
  const uncalled = Math.max(0, diff);
  const calledBeyond = Math.max(0, -diff);
  const aboveMaxQty =
    f.held !== null && f.maxStock !== null && f.held > f.maxStock ? f.held - f.maxStock : 0;
  const base = { uncalled, calledBeyond, aboveMaxQty };
  if (uncalled > 0) {
    if (f.held === null)
      return { ...base, outcome: 'stockNotReported', liabilityQty: 0, shortQty: 0 };
    const liabilityQty = Math.max(
      0,
      Math.min(uncalled, f.held, f.maxStock ?? Number.POSITIVE_INFINITY)
    );
    if (f.held < uncalled)
      return { ...base, outcome: 'supplierShort', liabilityQty, shortQty: uncalled - f.held };
    return { ...base, outcome: 'underCalled', liabilityQty, shortQty: 0 };
  }
  if (f.committed === 0 && f.calledOff > 0)
    return { ...base, outcome: 'notCommitted', liabilityQty: 0, shortQty: 0 };
  return {
    ...base,
    outcome: aboveMaxQty > 0 ? 'overHeld' : 'balanced',
    liabilityQty: 0,
    shortQty: 0
  };
}

// ─── Cycles (BR-01, BR-02) ───────────────────────────────────────────────────

/**
 * @typedef {object} FsCycleConfig
 * @property {string} anchor -  A Monday; packaging cycles run in blocks of `cycleWeeks` from it.
 * @property {number} cycleWeeks
 */

/**
 * @typedef {object} FsCycle
 * @property {ForecastStream} stream
 * @property {string} start
 * @property {string} end
 */

/**
 * The cycle a day belongs to. Packaging: blocks of `cycleWeeks` weeks from the
 * anchor Monday (W1 to W3 by default). Raw material: the calendar month, its
 * commitment period.
 * @param {ForecastStream} stream
 * @param {string} day
 * @param {FsCycleConfig} cfg
 * @returns {FsCycle}
 */
export function cycleOfDay(stream, day, cfg) {
  if (stream === 'rawMaterial') {
    const start = `${day.slice(0, 7)}-01`;
    const [y, m] = [Number(day.slice(0, 4)), Number(day.slice(5, 7))];
    const end = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
    return { stream, start, end };
  }
  const len = cfg.cycleWeeks * 7;
  const idx = Math.floor(daysBetween(cfg.anchor, day) / len);
  const start = addDays(cfg.anchor, idx * len);
  return { stream, start, end: addDays(start, len - 1) };
}

// ─── The reconcile (BR-03 to BR-11) ──────────────────────────────────────────

/**
 * @typedef {object} FsCommitmentInput
 * @property {ForecastStream} stream
 * @property {string} supplierId
 * @property {string} supplierName
 * @property {string} materialCode
 * @property {string} materialLabel
 * @property {string} uom
 * @property {string} periodBucket -  A week (`YYYY-MM-DD`, its Monday) or a month (`YYYY-MM`).
 * @property {string} periodStart
 * @property {'firm' | 'tradeOff' | 'forecast'} zone
 * @property {number | null} committedQty -  The submitted commitment standing for the period; null while awaiting.
 */

/**
 * A call-off as the reconcile reads it, classified by the call-off rules
 * (`callOffRules.js`) before it arrives here.
 */
/**
 * @typedef {object} FsCallOffInput
 * @property {string} supplierId
 * @property {string} materialCode
 * @property {string} callOffNumber
 * @property {readonly { readonly quantity: number; readonly date: string }[]} agreed The deliveries both sides agreed: the supplier's confirmation once
 *   accepted (automatically or by the planner), else what both last agreed.
 *   Empty when nothing is agreed yet — such a call-off is not counted.
 * @property {'supplier' | 'pti' | null} pending Why a released call-off is not (or not yet fully) counted: `supplier` —
 *   awaiting the supplier's confirmation; `pti` — a counter-offer awaiting the
 *   planner. Null otherwise (agreed, rejected, a draft, dismissed).
 * @property {string} needDate -  PTI's requested date — places a pending call-off in its cycle.
 */

/** A stock submission; the list is oldest first, so the last matching one is the latest. */
/**
 * @typedef {object} FsStockInput
 * @property {string} supplierId
 * @property {string} materialCode
 * @property {string} declaredAt
 * @property {number} totalQty
 */

/**
 * `asOf`:  The day the reconcile is read on (`YYYY-MM-DD`).
 *
 * @typedef {FsCycleConfig & {
 *     readonly commitments: readonly FsCommitmentInput[];
 *     readonly callOffs: readonly FsCallOffInput[];
 *     readonly stock: readonly FsStockInput[];
 *     readonly maxStock: (supplierId: string, materialCode: string) => number | null;
 *     readonly asOf: string;
 *   }} FsInputs
 */

/**
 * `key`:  stream | cycle start | supplier | material.
 * `final`:  True once the cycle has ended; before that the row is provisional (BR-10).
 * `periodsCommitted`:  Firm and Trade-off periods in the cycle with a submitted commitment.
 * `periodsAwaiting`:  Firm and Trade-off periods in the cycle still awaiting a commitment (counted as 0).
 * `calledOff`:  Accepted deliveries dated in the cycle (BR-04).
 * `callOffNumbers`:  The call-offs those deliveries belong to.
 * `awaitingSupplier`:  Call-offs needed in the cycle still awaiting the supplier's confirmation — not counted.
 * `awaitingPti`:  Counter-offers needed in the cycle still awaiting PTI's decision — not counted.
 * `heldAt`:  When the held figure was submitted; null when not reported.
 *
 * @typedef {FsResult & {
 *     readonly key: string;
 *     readonly stream: ForecastStream;
 *     readonly cycleStart: string;
 *     readonly cycleEnd: string;
 *     readonly final: boolean;
 *     readonly supplierId: string;
 *     readonly supplierName: string;
 *     readonly materialCode: string;
 *     readonly materialLabel: string;
 *     readonly uom: string;
 *     readonly committed: number;
 *     readonly periodsCommitted: number;
 *     readonly periodsAwaiting: number;
 *     readonly calledOff: number;
 *     readonly callOffNumbers: readonly string[];
 *     readonly awaitingSupplier: number;
 *     readonly awaitingPti: number;
 *     readonly held: number | null;
 *     readonly heldAt: string | null;
 *     readonly maxStock: number | null;
 *   }} FsRow
 */

/**
 * @param {string} supplierId
 * @param {string} materialCode
 */
const pairKey = (supplierId, materialCode) => `${supplierId}|${materialCode}`;

/**
 * @param {FsInputs} input
 * @returns {FsRow[]}
 */
export function buildFixedStockReconcile(input) {
  /**
   * @typedef {{
   *     cycle: FsCycle;
   *     head: FsCommitmentInput;
   *     committed: number;
   *     periodsCommitted: number;
   *     periodsAwaiting: number;
   *   }} Acc
   */
  const groups = /** @type {Map<string, Acc>} */ (new Map());
  for (const c of input.commitments) {
    // BR-03 — only Firm and Trade-off periods carry a quantity commitment; a
    // packaging month beyond the weekly horizon is re-cut into weeks before
    // its cycle starts, so only weekly packaging periods are read.
    if (c.zone === 'forecast') continue;
    if (c.stream === 'packaging' && !/^\d{4}-\d{2}-\d{2}$/.test(c.periodBucket)) continue;
    const cycle = cycleOfDay(c.stream, c.periodStart, input);
    if (cycle.start > input.asOf) continue; // BR-10 — a cycle is read once it has started
    const key = `${c.stream}|${cycle.start}|${pairKey(c.supplierId, c.materialCode)}`;
    const acc = groups.get(key) ?? {
      cycle,
      head: c,
      committed: 0,
      periodsCommitted: 0,
      periodsAwaiting: 0
    };
    if (c.committedQty === null) acc.periodsAwaiting += 1;
    else {
      acc.committed += c.committedQty;
      acc.periodsCommitted += 1;
    }
    groups.set(key, acc);
  }

  /** @type {FsRow[]} */
  const rows = [];
  for (const [key, g] of groups) {
    const { cycle, head } = g;
    /** @param {string} d */
    const inCycle = (d) => d >= cycle.start && d <= cycle.end;
    const mine = input.callOffs.filter(
      (o) => o.supplierId === head.supplierId && o.materialCode === head.materialCode
    );
    let calledOff = 0;
    const numbers = /** @type {Set<string>} */ (new Set());
    for (const o of mine) {
      for (const d of o.agreed) {
        if (!inCycle(d.date)) continue;
        calledOff += d.quantity;
        numbers.add(o.callOffNumber);
      }
    }
    /** @param {'supplier' | 'pti'} who */
    const pendingIn = (who) => mine.filter((o) => o.pending === who && inCycle(o.needDate)).length;
    // BR-02 — nothing to reconcile when nothing was committed and nothing called off.
    if (g.committed === 0 && calledOff === 0) continue;
    // BR-05 — an ended cycle reads the latest figure submitted by its end; a
    // cycle in progress reads the current figure, as the Stock page does.
    const final = input.asOf > cycle.end;
    const figures = input.stock.filter(
      (d) =>
        d.supplierId === head.supplierId &&
        d.materialCode === head.materialCode &&
        (!final || d.declaredAt.slice(0, 10) <= cycle.end)
    );
    const decl = figures.length > 0 ? figures[figures.length - 1] : undefined;
    const held = decl ? decl.totalQty : null;
    const maxStock = input.maxStock(head.supplierId, head.materialCode);
    rows.push({
      key,
      stream: cycle.stream,
      cycleStart: cycle.start,
      cycleEnd: cycle.end,
      final,
      supplierId: head.supplierId,
      supplierName: head.supplierName,
      materialCode: head.materialCode,
      materialLabel: head.materialLabel,
      uom: head.uom,
      committed: g.committed,
      periodsCommitted: g.periodsCommitted,
      periodsAwaiting: g.periodsAwaiting,
      calledOff,
      callOffNumbers: [...numbers].sort(),
      awaitingSupplier: pendingIn('supplier'),
      awaitingPti: pendingIn('pti'),
      held,
      heldAt: decl ? decl.declaredAt : null,
      maxStock,
      ...reconcileFigures({ committed: g.committed, calledOff, held, maxStock })
    });
  }
  // BR-11 — most urgent outcome first, then the latest cycle, then supplier and material.
  return rows.sort(
    (a, b) =>
      FS_OUTCOME_ORDER.indexOf(a.outcome) - FS_OUTCOME_ORDER.indexOf(b.outcome) ||
      b.cycleStart.localeCompare(a.cycleStart) ||
      a.supplierName.localeCompare(b.supplierName) ||
      a.materialCode.localeCompare(b.materialCode)
  );
}

/**
 * Rows per outcome, for the summary tiles.
 * @param {readonly Pick<FsRow, 'outcome'>[]} rows
 * @returns {Record<FsOutcome, number>}
 */
export function countByOutcome(rows) {
  const out = /** @type {Record<FsOutcome, number>} */ (
    Object.fromEntries(FS_OUTCOME_ORDER.map((o) => [o, 0]))
  );
  for (const r of rows) out[r.outcome] += 1;
  return out;
}
