// ────────────────────────────────────────────────────────────────────────────
// Team answers 2026-10-28 (B3, B6, B7, B10, E2) — the ledger of OSIP values per
// material and per supplier (`osipParams.js`), one row per change.
//
// Append-only (MAT-R3): a change is a new row with the value before it, when
// and by whom. The latest row of a key is in force; with none, the default
// applies (`osipParamInForce`). Written by `t_osipparam_set` only.
//
// Held in memory like every other record in the prototype: lost on reload.
// Empty at start: no value is invented.
// ────────────────────────────────────────────────────────────────────────────

/** @import { ActorAttribution } from '@lib/enforcement' */
/** @import { OsipParam } from '../../../transitions/osipParams' */
import { osipParamInForce } from '../../../transitions/osipParams';

/**
 * `key`: `osipParamKey(param, …)`. `value` null: back to the default.
 * `previous`: the value in force before this row (null: the default).
 * @typedef {{
 *   readonly key: string;
 *   readonly param: OsipParam;
 *   readonly value: number | boolean | null;
 *   readonly previous: number | boolean | null;
 *   readonly setAt: string;
 *   readonly setBy: ActorAttribution;
 * }} OsipParamRow
 */

/** @type {OsipParamRow[]} */
let rows = [];

export const osipParamStore = {
  /** @returns {readonly OsipParamRow[]} */
  all() {
    return rows;
  },
  /**
   * One key's rows, oldest first.
   * @param {string} key
   * @returns {readonly OsipParamRow[]}
   */
  forKey(key) {
    return rows.filter((r) => r.key === key);
  },
  /**
   * The value in force for a key, or null (the default applies).
   * @param {string} key
   * @returns {number | boolean | null}
   */
  valueOf(key) {
    return osipParamInForce(rows.filter((r) => r.key === key));
  },
  /**
   * @param {OsipParamRow} row
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
