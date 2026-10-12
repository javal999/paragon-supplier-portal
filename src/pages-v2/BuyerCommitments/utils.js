// BuyerCommitments — pure helpers (no React). Moved out of the page file
// unchanged (frontend-standard Phase 5 split).
import { positionDays } from '@services/transitions/inventoryRules';
import {
  deadlineState,
  moveDemandRefusal,
  moveShortfall,
  rankExceptions,
  readCommitmentNumber
} from '@services/transitions/forecastRules';
import { reasonFilterOptions, reasonMatches } from '../inventory/reasonFilterRules';
/** @import { ForecastCommitmentLine, ForecastCoverageRow, InventoryPosition } from '@services/data/types' */
/** @import { ForecastStream } from '@services/sdc/types' */
/** @import { DemandAllocation, MoveDemandRefusal } from '@services/transitions/forecastRules' */

/**
 * `shortfall`:  Forecast − commitment: the most the planner may move (BR-03).
 * `allocations`:  The rows with a quantity, as the verb receives them.
 * `remaining`:  What stays on the line as an open exception after the move.
 * `refused`:  The verb's own refusal for these allocations (`moveDemandRefusal`), or an unreadable number (`ambiguous` when it reads differently in ID and EN); null when the move can be sent.
 * @typedef {{
 *   readonly shortfall: number;
 *   readonly allocations: readonly DemandAllocation[];
 *   readonly total: number;
 *   readonly remaining: number;
 *   readonly refused: { readonly refusal: MoveDemandRefusal | 'ambiguous'; readonly supplierId?: string } | null;
 * }} MoveView
 */

/**
 * CAP-8 — the Move demand panel's reading of what the planner typed, checked
 * by the same rule the verb's policy calls, so the page refuses what the verb
 * would refuse. An empty row, or 0, moves nothing to that supplier.
 * @param {ForecastCommitmentLine} line
 * @param {Readonly<Record<string, string>>} qtys  Raw input per target supplier id.
 * @returns {MoveView}
 */
export function moveView(line, qtys) {
  const shortfall = moveShortfall(line);
  /** @type {DemandAllocation[]} */
  const allocations = [];
  /** @type {MoveView['refused']} */
  let unreadable = null;
  for (const q of line.otherQualifiedSuppliers) {
    const read = readCommitmentNumber(qtys[q.supplierId]);
    if (!read.ok) {
      if (unreadable === null)
        unreadable = {
          refusal: read.reason === 'ambiguousNumber' ? 'ambiguous' : 'badQty',
          supplierId: q.supplierId
        };
      continue;
    }
    if (read.value !== null && read.value !== 0)
      allocations.push({ supplierId: q.supplierId, qty: read.value });
  }
  const total = allocations.reduce((sum, a) => sum + a.qty, 0);
  const refused =
    unreadable ??
    moveDemandRefusal(shortfall, allocations, {
      fromSupplierId: line.supplierId,
      qualified: line.otherQualifiedSuppliers.map((q) => q.supplierId)
    });
  return { shortfall, allocations, total, remaining: Math.max(0, shortfall - total), refused };
}

/**
 * A threshold held as a fraction, shown as a percentage without rounding it away.
 * @param {number} ratio
 * @returns {string}
 */
export const thresholdPct = (ratio) => String(Math.round(ratio * 100_000) / 1000);

/**
 * @typedef {object} CommitmentViewInput
 * @property {readonly ForecastCommitmentLine[]} lines  Every published commitment line.
 * @property {ForecastStream | null} stream  The stream tab the planner picked, or null before a pick.
 * @property {string} supplier  The supplier filter ('' for all).
 * @property {string} material  The material filter ('' for all).
 * @property {readonly string[] | null} drillMaterials  A PO drill-through's materials, or null without one.
 * @property {readonly InventoryPosition[]} positions  The inventory positions (days of supply, CR-01).
 * @property {readonly ForecastCoverageRow[]} coverageRows  Supplier coverage rows (CR-03).
 * @property {string} nowIso  The forecast clock.
 * @property {readonly string[]} [reasons]  CAP-5 — the chosen shortfall reasons ([] for all).
 * @property {readonly string[]} [activeReasons]  CAP-5 — the active `commitmentShortfall` codes, in order.
 */

/**
 * The shortfall reason a line's standing commitment gives, if any.
 * @param {ForecastCommitmentLine} l
 * @returns {string | undefined}
 */
export const lineReason = (l) => l.response?.rootCause?.level1 || undefined;

/**
 * Everything the page shows, derived from the loaded lines and the filters:
 * the active stream, the filter options, the shown lines, the ranked exception
 * list (BR-04), the banner counts, the grid's periods and rows, and the
 * coverage rows. Pure — the page calls it on every render, as it computed
 * these inline before the split.
 * @param {CommitmentViewInput} input
 */
export function commitmentView({
  lines,
  stream,
  supplier,
  material,
  drillMaterials,
  positions,
  coverageRows,
  nowIso,
  reasons = [],
  activeReasons = []
}) {
  /** @type {ForecastStream} */
  const activeStream =
    stream ?? lines.find((l) => l.materialCode === material)?.stream ?? 'packaging';
  const streamLines = lines.filter((l) => l.stream === activeStream);
  const suppliers = [...new Map(streamLines.map((l) => [l.supplierId, l.supplierName])).entries()];
  const materials = [...new Set(streamLines.map((l) => l.materialCode))];
  const shown = streamLines.filter(
    (l) =>
      (supplier === '' || l.supplierId === supplier) &&
      (material === '' || !materials.includes(material) || l.materialCode === material) &&
      // A PO spanning several materials narrows to all of them at once.
      (drillMaterials === null ||
        drillMaterials.length === 0 ||
        drillMaterials.includes(l.materialCode))
  );

  // CR-01 — the lowest days of supply across the material's positions.
  /**
   * @param {string} code
   * @returns {number | null}
   */
  const daysOfSupplyOf = (code) => {
    const days = positions
      .filter((p) => p.materialCode === code)
      .map(positionDays)
      .filter(/** @returns {d is number} */ (d) => d !== null);
    return days.length > 0 ? Math.min(...days) : null;
  };
  // CAP-5 BR-01 / BR-03 — the reason filter narrows the exception list only;
  // its counts are over the exceptions the other filters leave.
  const ranked = rankExceptions(shown, nowIso, daysOfSupplyOf);
  const reasonOptions = reasonFilterOptions(activeReasons, ranked.map(lineReason));
  const exceptions = ranked.filter((l) => reasonMatches(lineReason(l), reasons));
  const missing = streamLines.filter((l) => deadlineState(l, nowIso) === 'overdue').length;
  const outside = streamLines.filter((l) => l.state === 'exception').length;
  const periods = [...new Map(shown.map((l) => [l.periodBucket, l.periodStart])).entries()].sort(
    (a, b) => a[1].localeCompare(b[1])
  );
  const rows = [...new Map(shown.map((l) => [`${l.supplierId}|${l.materialCode}`, l])).values()];
  const coverage = coverageRows.filter(
    (c) =>
      c.stream === activeStream &&
      (supplier === '' || c.supplierId === supplier) &&
      (material === '' || !materials.includes(material) || c.materialCode === material)
  );

  return {
    activeStream,
    suppliers,
    materials,
    shown,
    daysOfSupplyOf,
    exceptions,
    reasonOptions,
    missing,
    outside,
    periods,
    rows,
    coverage
  };
}
