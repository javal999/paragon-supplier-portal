// ─────────────────────────────────────────────────────────────────────────────
// SDC-5c — the two-grain REDUCER (headless, pure).
//
// The step that binds the two chase families into `SupplierChaseView[]`. This is
// the risk-concentration point both consultants flagged — the join of a
// supplier-keyed family (sdc data chase) with a per-release family (delivery
// commitment chase) — so it is kept ISOLATED and PURE and proven alone.
//
// ── RESULTS-IN, JUST REDUCE (ratified) ───────────────────────────────────────
//   Takes the two ALREADY-DERIVED result arrays and only groups + composes. It
//   does NOT take publications/rows/agreements, does NOT re-derive, and imports
//   NEITHER sdc consolidation logic NOR delivery fulfillment logic — only the two
//   entry TYPES (`ChaseEntry`, `DeliveryChaseEntry`) + the 5b composition helpers.
//   Zero subsystem coupling. The wiring (call both source fns, pass results here)
//   is 5d's job, not this module's.
//
// ── ACYCLIC ───────────────────────────────────────────────────────────────────
//   `chase` reads the `ChaseEntry` TYPE from sdc (type-only) + `DeliveryChaseEntry`
//   from 5a. `sdc` imports neither `delivery` nor `chase`; `delivery` imports
//   neither. Held.
// ─────────────────────────────────────────────────────────────────────────────

/** @import { ChaseEntry, ChaseReason } from '../sdc/consolidation' */
/** @import { DeliveryChaseEntry } from './deliveryChase' */
/** @import { ChaseSeverityLevel, SupplierChaseView } from './unifiedChase' */
import { makeSupplierChaseView, worstSeverity } from './unifiedChase';

/**
 * Group a family's rows by supplierId, preserving input order within a supplier.
 * @template T
 * @param {readonly T[]} rows
 * @param {(row: T) => string} keyOf
 * @returns {Map<string, T[]>}
 */
function groupBy(rows, keyOf) {
  const out = /** @type {Map<string, T[]>} */ (new Map());
  for (const row of rows) {
    const key = keyOf(row);
    const list = out.get(key);
    if (list) list.push(row);
    else out.set(key, [row]);
  }
  return out;
}

/** Worst-first comparator over the 5b severity ordering (hard > soft > none),
 * @param {ChaseSeverityLevel} a
 * @param {ChaseSeverityLevel} b
 * @returns {number}
 *  derived from `worstSeverity` so the two never diverge. */
function bySeverityWorstFirst(a, b) {
  if (a === b) return 0;
  return worstSeverity(a, b) === a ? -1 : 1;
}

/**
 * Reduce the two chase families into ONE `SupplierChaseView` per supplier. PURE —
 * result arrays in, views out, zero mutation, no clock read (the source arrays are
 * already time-derived; `now` is not needed here, so none is taken).
 *
 *   · dataReasons — every `ChaseEntry.reason` for the supplier (chaseList emits one
 *     entry per supplier today, but ALL reasons are collected, so a future
 *     multi-reason emit composes without change).
 *   · commitmentEntries — every `DeliveryChaseEntry` for the supplier.
 *
 * UNION KEY SET: suppliers reachable from EITHER family (data-only, commitment-only,
 * or both). A supplier absent from both never appears — no phantom zero-zero view.
 *
 * DETERMINISTIC: the union has no guaranteed iteration order, so the output is
 * SORTED explicitly — worst `overallSeverity` first, then `chaseCount` desc, then
 * `supplierId` asc for stability. Never relies on Map/Set insertion order.
 * @param {readonly ChaseEntry[]} dataEntries
 * @param {readonly DeliveryChaseEntry[]} commitmentEntries
 * @returns {readonly SupplierChaseView[]}
 */
export function deriveUnifiedChase(dataEntries, commitmentEntries) {
  const dataBySupplier = groupBy(dataEntries, (e) => e.supplierId);
  const commitBySupplier = groupBy(commitmentEntries, (e) => e.supplierId);

  // Union of suppliers with ≥1 entry in either family (no phantom views).
  const supplierIds = /** @type {Set<string>} */ (
    new Set([...dataBySupplier.keys(), ...commitBySupplier.keys()])
  );

  /** @type {SupplierChaseView[]} */
  const views = [];
  for (const supplierId of supplierIds) {
    /** @type {readonly ChaseReason[]} */
    const reasons = (dataBySupplier.get(supplierId) ?? []).map((e) => e.reason);
    /** @type {readonly DeliveryChaseEntry[]} */
    const commitments = commitBySupplier.get(supplierId) ?? [];
    // severity + chaseCount come from 5b's helpers — never recomputed here.
    views.push(makeSupplierChaseView(supplierId, reasons, commitments));
  }

  return views.sort(
    (a, b) =>
      bySeverityWorstFirst(a.overallSeverity, b.overallSeverity) ||
      b.chaseCount - a.chaseCount ||
      a.supplierId.localeCompare(b.supplierId)
  );
}
