// ────────────────────────────────────────────────────────────────────────────
// DA WEEKLY CONFIRMATION STORE — PSC-1 (BL-336).
//
// APPEND-ONLY: one record per confirmation a supplier sent, per supplier ×
// week. A changed week is a NEW record; no record is ever changed or removed.
// The one in force is the latest per supplier × week, derived at read
// (`daConfirmationReadModel.js`). Only the target's `create` writes here.
//
// A CARRIED-FORWARD WEEK WRITES NOTHING (PSC-1 BR-05): its state is the
// absence of a record for the week beside an earlier one. The store therefore
// never holds a row that says "carried forward".
// ────────────────────────────────────────────────────────────────────────────

/** @import { DaConfirmation } from '../../types' */

/** @type {DaConfirmation[]} */
let rows = [];
let seq = 0;
let version = 0;
const listeners = /** @type {Set<() => void>} */ (new Set());

/** @returns {void} */
function changed() {
  version += 1;
  listeners.forEach((l) => l());
}

export const daConfirmationStore = {
  /**
   * Every record, oldest first.
   * @returns {readonly DaConfirmation[]}
   */
  all() {
    return rows;
  },
  /**
   * @param {string} id
   * @returns {DaConfirmation | undefined}
   */
  get(id) {
    return rows.find((r) => r.id === id);
  },
  /**
   * A new record with a store-assigned id. Called by the target's `create` only.
   * @param {Omit<DaConfirmation, 'id'>} row
   * @returns {DaConfirmation}
   */
  insert(row) {
    seq += 1;
    /** @type {DaConfirmation} */
    const full = Object.freeze({ ...row, id: `dac-${String(seq).padStart(4, '0')}` });
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
