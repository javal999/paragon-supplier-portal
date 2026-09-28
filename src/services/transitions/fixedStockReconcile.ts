// ─────────────────────────────────────────────────────────────────────────────
// FIXED STOCK (FS) RECONCILE — REQ-E06-04 (ENG-D21, team review 2026-09-28).
//
// PURE. No store, no clock: the read model hands in the standing commitments,
// the call-offs, the supplier stock submissions, the agreed maximum stock and
// the day to reconcile on, and gets rows back. Nothing here is stored.
//
// Per supplier × material × cycle:
//   · committed  — the supplier's Firm and Trade-off commitments (REQ-E06-02)
//                  for the periods in the cycle (BR-03);
//   · called off — the quantity PTI released on call-offs whose need date
//                  falls in the cycle (REQ-E09-03), drafts and dismissed
//                  drafts excluded (BR-04);
//   · held       — the supplier's stock figure (REQ-E08-02): the current one
//                  while the cycle runs, the latest submitted by its end once
//                  it has ended; or "not reported" (BR-05);
//   · max stock  — the agreed maximum, or "no max stock agreed" (BR-06).
//
// uncalled = committed − called off. Outcome (BR-08), first match wins:
//   1. uncalled > 0, held not reported → stockNotReported
//   2. uncalled > 0, held < uncalled   → supplierShort
//   3. uncalled > 0, held ≥ uncalled   → underCalled
//   4. held above the agreed max       → overHeld
//   5. otherwise                       → balanced
// Liability (BR-09, ENG-D17): min(uncalled, held, max stock) for outcomes 2
// and 3, flagged "liability — not priced", never priced.
// ─────────────────────────────────────────────────────────────────────────────

import { addDays, daysBetween } from '../engine/dates';
import type { ForecastStream } from '../sdc/types';

export type FsOutcome = 'supplierShort' | 'underCalled' | 'stockNotReported' | 'overHeld' | 'balanced';

/** Most urgent first — the order the planner's list is sorted in (BR-11). */
export const FS_OUTCOME_ORDER: readonly FsOutcome[] = [
  'supplierShort',
  'underCalled',
  'stockNotReported',
  'overHeld',
  'balanced',
];

export interface FsFigures {
  readonly committed: number;
  readonly calledOff: number;
  /** Null when the supplier has no stock figure on or before the cycle end. */
  readonly held: number | null;
  /** Null when no maximum stock is agreed. */
  readonly maxStock: number | null;
}

export interface FsResult {
  readonly outcome: FsOutcome;
  /** committed − called off; negative when PTI called off beyond the commitment. */
  readonly uncalled: number;
  /** What PTI called off beyond the commitment (0 when it did not). */
  readonly calledBeyond: number;
  /** Quantity flagged "liability — not priced" (ENG-D17); 0 when none. */
  readonly liabilityQty: number;
  /** Uncalled commitment the supplier does not hold (supplierShort only). */
  readonly shortQty: number;
  /** Held above the agreed maximum; the supplier's own stock, outside the settlement. */
  readonly aboveMaxQty: number;
}

/** BR-07 to BR-09 — compare the three figures for one supplier × material × cycle. */
export function reconcileFigures(f: FsFigures): FsResult {
  const uncalled = f.committed - f.calledOff;
  const calledBeyond = Math.max(0, -uncalled);
  const aboveMaxQty = f.held !== null && f.maxStock !== null && f.held > f.maxStock ? f.held - f.maxStock : 0;
  const base = { uncalled, calledBeyond, aboveMaxQty };
  if (uncalled > 0) {
    if (f.held === null) return { ...base, outcome: 'stockNotReported', liabilityQty: 0, shortQty: 0 };
    const liabilityQty = Math.max(0, Math.min(uncalled, f.held, f.maxStock ?? Number.POSITIVE_INFINITY));
    if (f.held < uncalled) return { ...base, outcome: 'supplierShort', liabilityQty, shortQty: uncalled - f.held };
    return { ...base, outcome: 'underCalled', liabilityQty, shortQty: 0 };
  }
  return { ...base, outcome: aboveMaxQty > 0 ? 'overHeld' : 'balanced', liabilityQty: 0, shortQty: 0 };
}

// ─── Cycles (BR-01, BR-02) ───────────────────────────────────────────────────

export interface FsCycleConfig {
  /** A Monday; packaging cycles run in blocks of `cycleWeeks` from it. */
  readonly anchor: string;
  readonly cycleWeeks: number;
}

export interface FsCycle {
  readonly stream: ForecastStream;
  readonly start: string;
  readonly end: string;
}

/**
 * The cycle a day belongs to. Packaging: blocks of `cycleWeeks` weeks from the
 * anchor Monday (W1 to W3 by default). Raw material: the calendar month, its
 * commitment period.
 */
export function cycleOfDay(stream: ForecastStream, day: string, cfg: FsCycleConfig): FsCycle {
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

export interface FsCommitmentInput {
  readonly stream: ForecastStream;
  readonly supplierId: string;
  readonly supplierName: string;
  readonly materialCode: string;
  readonly materialLabel: string;
  readonly uom: string;
  /** A week (`YYYY-MM-DD`, its Monday) or a month (`YYYY-MM`). */
  readonly periodBucket: string;
  readonly periodStart: string;
  readonly zone: 'firm' | 'tradeOff' | 'forecast';
  /** The submitted commitment standing for the period; null while awaiting. */
  readonly committedQty: number | null;
}

export interface FsCallOffInput {
  readonly supplierId: string;
  readonly materialCode: string;
  readonly callOffNumber: string;
  readonly quantity: number;
  readonly needDate: string;
  readonly status: string;
}

/** A stock submission; the list is oldest first, so the last matching one is the latest. */
export interface FsStockInput {
  readonly supplierId: string;
  readonly materialCode: string;
  readonly declaredAt: string;
  readonly totalQty: number;
}

export interface FsInputs extends FsCycleConfig {
  readonly commitments: readonly FsCommitmentInput[];
  readonly callOffs: readonly FsCallOffInput[];
  readonly stock: readonly FsStockInput[];
  readonly maxStock: (supplierId: string, materialCode: string) => number | null;
  /** The day the reconcile is read on (`YYYY-MM-DD`). */
  readonly asOf: string;
}

export interface FsRow extends FsResult {
  /** stream | cycle start | supplier | material. */
  readonly key: string;
  readonly stream: ForecastStream;
  readonly cycleStart: string;
  readonly cycleEnd: string;
  /** True once the cycle has ended; before that the row is provisional (BR-10). */
  readonly final: boolean;
  readonly supplierId: string;
  readonly supplierName: string;
  readonly materialCode: string;
  readonly materialLabel: string;
  readonly uom: string;
  readonly committed: number;
  /** Firm and Trade-off periods in the cycle with a submitted commitment. */
  readonly periodsCommitted: number;
  /** Firm and Trade-off periods in the cycle still awaiting a commitment (counted as 0). */
  readonly periodsAwaiting: number;
  readonly calledOff: number;
  readonly callOffNumbers: readonly string[];
  readonly held: number | null;
  /** When the held figure was submitted; null when not reported. */
  readonly heldAt: string | null;
  readonly maxStock: number | null;
}

/** Call-off states that are not a release: the planner's own draft and a dismissed draft. */
const NOT_RELEASED = new Set(['Draft', 'Dismissed']);

const pairKey = (supplierId: string, materialCode: string) => `${supplierId}|${materialCode}`;

export function buildFixedStockReconcile(input: FsInputs): FsRow[] {
  type Acc = {
    cycle: FsCycle;
    head: FsCommitmentInput;
    committed: number;
    periodsCommitted: number;
    periodsAwaiting: number;
  };
  const groups = new Map<string, Acc>();
  for (const c of input.commitments) {
    // BR-03 — only Firm and Trade-off periods carry a quantity commitment; a
    // packaging month beyond the weekly horizon is re-cut into weeks before
    // its cycle starts, so only weekly packaging periods are read.
    if (c.zone === 'forecast') continue;
    if (c.stream === 'packaging' && !/^\d{4}-\d{2}-\d{2}$/.test(c.periodBucket)) continue;
    const cycle = cycleOfDay(c.stream, c.periodStart, input);
    if (cycle.start > input.asOf) continue; // BR-10 — a cycle is read once it has started
    const key = `${c.stream}|${cycle.start}|${pairKey(c.supplierId, c.materialCode)}`;
    const acc = groups.get(key) ?? { cycle, head: c, committed: 0, periodsCommitted: 0, periodsAwaiting: 0 };
    if (c.committedQty === null) acc.periodsAwaiting += 1;
    else {
      acc.committed += c.committedQty;
      acc.periodsCommitted += 1;
    }
    groups.set(key, acc);
  }

  const rows: FsRow[] = [];
  for (const [key, g] of groups) {
    const { cycle, head } = g;
    const calls = input.callOffs.filter(
      (o) =>
        o.supplierId === head.supplierId &&
        o.materialCode === head.materialCode &&
        !NOT_RELEASED.has(o.status) &&
        o.needDate >= cycle.start &&
        o.needDate <= cycle.end,
    );
    const calledOff = calls.reduce((s, o) => s + o.quantity, 0);
    // BR-02 — nothing to reconcile when nothing was committed and nothing called off.
    if (g.committed === 0 && calledOff === 0) continue;
    // BR-05 — an ended cycle reads the latest figure submitted by its end; a
    // cycle in progress reads the current figure, as the Stock page does.
    const final = input.asOf > cycle.end;
    const figures = input.stock.filter(
      (d) =>
        d.supplierId === head.supplierId &&
        d.materialCode === head.materialCode &&
        (!final || d.declaredAt.slice(0, 10) <= cycle.end),
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
      callOffNumbers: calls.map((o) => o.callOffNumber).sort(),
      held,
      heldAt: decl ? decl.declaredAt : null,
      maxStock,
      ...reconcileFigures({ committed: g.committed, calledOff, held, maxStock }),
    });
  }
  // BR-11 — most urgent outcome first, then the latest cycle, then supplier and material.
  return rows.sort(
    (a, b) =>
      FS_OUTCOME_ORDER.indexOf(a.outcome) - FS_OUTCOME_ORDER.indexOf(b.outcome) ||
      b.cycleStart.localeCompare(a.cycleStart) ||
      a.supplierName.localeCompare(b.supplierName) ||
      a.materialCode.localeCompare(b.materialCode),
  );
}

/** Rows per outcome, for the summary tiles. */
export function countByOutcome(rows: readonly Pick<FsRow, 'outcome'>[]): Record<FsOutcome, number> {
  const out = Object.fromEntries(FS_OUTCOME_ORDER.map((o) => [o, 0])) as Record<FsOutcome, number>;
  for (const r of rows) out[r.outcome] += 1;
  return out;
}
