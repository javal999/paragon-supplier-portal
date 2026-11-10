// ────────────────────────────────────────────────────────────────────────────
// BL-267 (PEX-5) — the ledger of LTP inputs per material (`ltpInputRules.js`):
// uploads of LTP A, LTP Festive and LTP B (a quantity per week, with the
// uploader, the date and the source file) and the LTP choice.
//
// Append-only: an upload or a choice is a new row; the latest of a key is in
// force. Written by `t_ltpinput_set` only. Held in memory like every other
// record in the prototype. Empty at start: no quantity is invented.
// ────────────────────────────────────────────────────────────────────────────

/** @import { LtpInputRow } from '../../../transitions/ltpInputRules' */

/** @type {LtpInputRow[]} */
let rows = [];

export const ltpInputStore = {
  /** @returns {readonly LtpInputRow[]} oldest first */
  all() {
    return rows;
  },
  /**
   * @param {LtpInputRow} row
   * @returns {void}
   */
  append(row) {
    rows = [...rows, row];
  },
  /**
   * TEST SEAM — back to nothing uploaded.
   * @returns {void}
   */
  reset() {
    rows = [];
  }
};
