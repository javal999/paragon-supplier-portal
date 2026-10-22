// ────────────────────────────────────────────────────────────────────────────
// DRC-12a (BL-198) — the NPD tag observation ledger.
//
// One row each time the hub sees a material's NPD tag change under the rule in
// force, plus a first baseline row per material. A row that records the tag
// dropping (NPD → not NPD) is what raises the planner's "Review ROP after first
// order" task, once. Every row keeps the tag's inputs and the rules version
// (DRC-D16). Append-only; held in memory like every record in the prototype.
// ────────────────────────────────────────────────────────────────────────────

/** @import { NpdObservation } from '../../../transitions/osipRopRules' */

/** @type {NpdObservation[]} */
let rows = [];

export const npdTagStore = {
  /** @returns {readonly NpdObservation[]} */
  all() {
    return rows;
  },
  /**
   * @param {readonly NpdObservation[]} next
   * @returns {void}
   */
  append(next) {
    rows = [...rows, ...next];
  },
  /**
   * TEST SEAM — back to nothing observed.
   * @returns {void}
   */
  reset() {
    rows = [];
  }
};
