// ────────────────────────────────────────────────────────────────────────────
// BL-269 (PEX-4 BR-01) — the supplier's monthly capacity entries: months beyond
// the 13 weekly buckets are entered by month [Proposed]. One submission per
// supplier × planning group, append-only; the latest submission that states a
// month is the one in force (`capacityHeadsUpRules.monthlyEntry`).
//
// Held in memory like every other record in the prototype. Empty at start: no
// capacity is invented.
// ────────────────────────────────────────────────────────────────────────────

/** @import { CapacityMonthSubmission } from '../../../transitions/capacityHeadsUpRules' */

/** @type {CapacityMonthSubmission[]} */
let rows = [];
let seq = 0;

export const capacityMonthStore = {
  /** @returns {readonly CapacityMonthSubmission[]} oldest first */
  all() {
    return rows;
  },
  /**
   * @param {string} id
   * @returns {CapacityMonthSubmission | undefined}
   */
  get(id) {
    return rows.find((r) => r.id === id);
  },
  /** @returns {string} */
  nextId() {
    seq += 1;
    return `capm-${String(seq).padStart(4, '0')}`;
  },
  /**
   * @param {CapacityMonthSubmission} row
   * @returns {void}
   */
  add(row) {
    rows = [...rows, row];
  },
  /**
   * TEST SEAM — back to nothing entered.
   * @returns {void}
   */
  reset() {
    rows = [];
    seq = 0;
  }
};
