// ────────────────────────────────────────────────────────────────────────────
// REQ-E14-08 BR-05 (BL-235) — the promotion ledger (`engine/promotions.js`).
//
// A planner's promotion for one SKU in one week: an entry, a change or a
// withdrawal is a new row, with who and when; the latest row of a key is in
// force when it is `Active`. Append-only: nothing is edited or deleted, so the
// history of a SKU's promotions is the rows. Written by `t_promotion_set` only.
// Empty at start: no promotion is invented. Held in memory like the other
// planner ledgers of the mock.
// ────────────────────────────────────────────────────────────────────────────

/** @import { PromotionRow } from '../../../engine/promotions' */

/** @type {readonly PromotionRow[]} */
let rows = [];

export const promotionStore = {
  /** @returns {readonly PromotionRow[]} oldest first; a new array on every write */
  all() {
    return rows;
  },
  /**
   * @param {PromotionRow} row
   * @returns {void}
   */
  append(row) {
    rows = [...rows, row];
  },
  /**
   * TEST SEAM — back to nothing entered.
   * @returns {void}
   */
  reset() {
    rows = [];
  }
};
