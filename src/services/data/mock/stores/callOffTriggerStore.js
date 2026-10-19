// ────────────────────────────────────────────────────────────────────────────
// BL-199 (DRC-13) — the call-off trigger ledger.
//
// One row each time a PTI SOH update changes what the trigger does for a
// material: a draft, a PR recommendation, SOH seen above ROP Fisik (which
// re-arms the trigger), or a drop that waits. Every row keeps its figures with
// their inputs and the rules version (DRC-D16). Append-only; held in memory
// like every record in the prototype.
//
// `seenSeq` is the last PTI SOH update the trigger processed, so an update is
// checked once however often the hub looks (the seed is update 0).
// ────────────────────────────────────────────────────────────────────────────

/** @import { TriggerRow } from '../../../transitions/callOffTriggerRules' */

/** @type {TriggerRow[]} */
let rows = [];
let seenSeq = 0;

export const callOffTriggerStore = {
  /** @returns {readonly TriggerRow[]} */
  all() {
    return rows;
  },
  /**
   * The material's latest row, if any.
   * @param {string} materialCode
   * @returns {TriggerRow | undefined}
   */
  lastFor(materialCode) {
    for (let i = rows.length - 1; i >= 0; i -= 1) {
      const row = /** @type {TriggerRow} */ (rows[i]);
      if (row.materialCode === materialCode) return row;
    }
    return undefined;
  },
  /**
   * @param {readonly TriggerRow[]} next
   * @returns {void}
   */
  append(next) {
    rows = [...rows, ...next];
  },
  /** The last PTI SOH update processed. */
  seenSeq() {
    return seenSeq;
  },
  /**
   * @param {number} seq
   * @returns {void}
   */
  markSeen(seq) {
    seenSeq = Math.max(seenSeq, seq);
  },
  /**
   * TEST SEAM — back to nothing observed.
   * @returns {void}
   */
  reset() {
    rows = [];
    seenSeq = 0;
  }
};
