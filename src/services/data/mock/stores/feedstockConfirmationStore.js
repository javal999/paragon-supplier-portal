// ────────────────────────────────────────────────────────────────────────────
// SUPPLIER FEEDSTOCK CONFIRMATION STORE — BL-194, DRC-8 BR-a (DRC-D17).
//
// APPEND-ONLY: one record per confirmation a supplier sent. A changed figure
// is a NEW record; no record is ever changed or removed. The one in force is
// the latest per supplier × material, derived at read
// (`feedstockReadModel.js`). Only the target's `create` writes here.
//
// Its own store on purpose (MoM 2B; MR-7 BR-01): the stock declarations behind
// supplier SOH, the stock simulation and "free to call off" never see it.
// Starts empty: every material is due until its supplier confirms.
// ────────────────────────────────────────────────────────────────────────────

/** @import { FeedstockConfirmation } from '../../types' */

/** @type {FeedstockConfirmation[]} */
let rows = [];
let seq = 0;
let version = 0;
const listeners = /** @type {Set<() => void>} */ (new Set());

/** @returns {void} */
function changed() {
  version += 1;
  listeners.forEach((l) => l());
}

export const feedstockConfirmationStore = {
  /**
   * Every record, oldest first.
   * @returns {readonly FeedstockConfirmation[]}
   */
  all() {
    return rows;
  },
  /**
   * @param {string} id
   * @returns {FeedstockConfirmation | undefined}
   */
  get(id) {
    return rows.find((r) => r.id === id);
  },
  /**
   * A new record with a store-assigned id. Called by the target's `create` only.
   * @param {Omit<FeedstockConfirmation, 'id'>} row
   * @returns {FeedstockConfirmation}
   */
  insert(row) {
    seq += 1;
    /** @type {FeedstockConfirmation} */
    const full = Object.freeze({ ...row, id: `fsc-${String(seq).padStart(4, '0')}` });
    rows = [...rows, full];
    changed();
    return full;
  },
  /**
   * Back to empty — test isolation.
   * @returns {void}
   */
  reset() {
    rows = [];
    seq = 0;
    changed();
  },
  /** @returns {number} */
  version() {
    return version;
  },
  /**
   * @param {() => void} listener
   * @returns {() => void}
   */
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
};
