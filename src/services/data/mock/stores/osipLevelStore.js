// ────────────────────────────────────────────────────────────────────────────
// DRC-D11 (BL-196) — the OSIP level ledger, one row per change.
//
// Append-only (MAT-R3): a change is a new row with the level before it, its
// source, when and by whom. The latest row of a material is in force; with
// none, the material is at [Default C2] (`osipLevelInForce`). Written by
// `t_osiplevel_set` (source `planner`); DRC-19's automatic classification, on
// hold, appends `classification` rows to the same ledger.
//
// Held in memory like every other record in the prototype: lost on reload.
// Empty at start: no level history is invented.
// ────────────────────────────────────────────────────────────────────────────

/** @import { ActorAttribution } from '@lib/enforcement' */
/** @import { OsipLevelSource } from '../../../transitions/osipRopRules' */

/**
 * `previous`: the level in force before this row (the default when none was set).
 * @typedef {{
 *   readonly materialCode: string;
 *   readonly level: number;
 *   readonly previous: number;
 *   readonly source: OsipLevelSource;
 *   readonly setAt: string;
 *   readonly setBy: ActorAttribution;
 * }} OsipLevelRow
 */

/** @type {OsipLevelRow[]} */
let rows = [];

export const osipLevelStore = {
  /** @returns {readonly OsipLevelRow[]} */
  all() {
    return rows;
  },
  /**
   * One material's rows, oldest first.
   * @param {string} materialCode
   * @returns {readonly OsipLevelRow[]}
   */
  forMaterial(materialCode) {
    return rows.filter((r) => r.materialCode === materialCode);
  },
  /**
   * How many rows the planner recorded for a material (the NPD review reads it).
   * @param {string} materialCode
   * @returns {number}
   */
  plannerCount(materialCode) {
    return rows.filter((r) => r.materialCode === materialCode && r.source === 'planner').length;
  },
  /**
   * @param {OsipLevelRow} row
   * @returns {void}
   */
  append(row) {
    rows = [...rows, row];
  },
  /**
   * TEST SEAM — back to nothing set.
   * @returns {void}
   */
  reset() {
    rows = [];
  }
};
