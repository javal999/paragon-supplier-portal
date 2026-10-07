// ────────────────────────────────────────────────────────────────────────────
// REQ-E14-11 X-06 — the forecast override ledger.
//
// A Material Planning team member's override of one SKU × week of the demand
// forecast: who, when, the old value, the new value, the engine's value and
// the reason code. Append-only; the latest override of a cell is in force.
// Empty at start: the synthetic dataset carries no override history and none
// is invented, so the override-value report is empty until overrides are
// entered and their weeks have sold. Held for the session, like the other
// planner ledgers of the mock (ENG-B106).
// ────────────────────────────────────────────────────────────────────────────

/** @import { ForecastOverride } from '../../types' */

/** @type {ForecastOverride[]} */
let rows = [];
let seq = 0;

export const forecastOverrideStore = {
  /** @returns {readonly ForecastOverride[]} */
  all() {
    return rows;
  },
  /**
   * @param {string} id
   * @returns {ForecastOverride | undefined}
   */
  get(id) {
    return rows.find((r) => r.id === id);
  },
  /**
   * @param {Omit<ForecastOverride, 'id'>} row
   * @returns {ForecastOverride}
   */
  add(row) {
    seq += 1;
    /** @type {ForecastOverride} */
    const made = { ...row, id: `fo-${String(seq).padStart(4, '0')}` };
    rows = [...rows, made];
    return made;
  },
  /** @returns {void} */
  reset() {
    rows = [];
    seq = 0;
  }
};
