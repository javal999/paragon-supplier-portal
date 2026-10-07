// BuyerCommitments — pure helpers (no React). Moved out of the page file
// unchanged (frontend-standard Phase 5 split).
import { positionDays } from '@services/transitions/inventoryRules';
import { deadlineState, rankExceptions } from '@services/transitions/forecastRules';
/** @import { ForecastCommitmentLine, ForecastCoverageRow, InventoryPosition } from '@services/data/types' */
/** @import { ForecastStream } from '@services/sdc/types' */

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
 */

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
  nowIso
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
  const exceptions = rankExceptions(shown, nowIso, daysOfSupplyOf);
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
    missing,
    outside,
    periods,
    rows,
    coverage
  };
}
