// ────────────────────────────────────────────────────────────────────────────
// Mutable missing-ASN chase store (AIB-3, BL-351).
//
// The chase itself is DERIVED at read (`transitions/callOffChase.js`): a
// call-off sent with no ASN, one working day after it was sent. The ONE stored
// fact is the planner's closure — who closed it, when, and why — appended and
// never edited (the `inventoryAlertLedger` shape). One row per call-off: the
// chase "fires once" (AIB-3 BR-01), so a closed chase never re-opens.
// ────────────────────────────────────────────────────────────────────────────

/** @import { ChaseClosure } from '../../../transitions/callOffChase' */

/** @type {ChaseClosure[]} */
let rows = [];

export const callOffChaseStore = {
  /** @returns {readonly ChaseClosure[]} */
  all() {
    return rows;
  },
  /**
   * @param {string} callOffId
   * @returns {ChaseClosure | undefined}
   */
  forCallOff(callOffId) {
    return rows.find((c) => c.callOffId === callOffId);
  },
  /**
   * @param {ChaseClosure} closure
   * @returns {void}
   */
  append(closure) {
    rows = [...rows, closure];
  },
  /** @returns {void} */
  reset() {
    rows = [];
  }
};
