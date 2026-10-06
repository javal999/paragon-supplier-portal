// ────────────────────────────────────────────────────────────────────────────
// SUPPLIER OVERLAY STORE — Material A1 (MR-1 BR-02, AC-06; plan AD-4, AR-03).
//
// The hub-mastered supplier fields, over the frozen supplier master. APPEND
// ONLY: every change of a supplier's stock update mode is a new row, and the
// latest row per supplier wins (MAT-R3). Nothing here is edited, so the history
// of who changed a supplier's mode, and when, is the store itself.
//
// Written by the `t_supplier_set_update_mode` target and nothing else. Read
// through the resolver (`supplierMaster.js`), never directly by a page.
// Held in memory like every other record in the prototype.
// ────────────────────────────────────────────────────────────────────────────

/** @import { SupplierUpdateModeChange } from '../../types' */

/** @type {SupplierUpdateModeChange[]} */
let rows = [];
let version = 0;
const listeners = /** @type {Set<() => void>} */ (new Set());

/** @returns {void} */
function changed() {
  version += 1;
  listeners.forEach((l) => l());
}

export const supplierOverlayStore = {
  /**
   * Every row, oldest first.
   * @returns {readonly SupplierUpdateModeChange[]}
   */
  all() {
    return rows;
  },
  /**
   * One supplier's rows, oldest first.
   * @param {string} supplierId
   * @returns {readonly SupplierUpdateModeChange[]}
   */
  historyFor(supplierId) {
    return rows.filter((r) => r.supplierId === supplierId);
  },
  /**
   * The row in force for a supplier: its latest.
   * @param {string} supplierId
   * @returns {SupplierUpdateModeChange | undefined}
   */
  latestFor(supplierId) {
    for (let i = rows.length - 1; i >= 0; i -= 1)
      if (rows[i].supplierId === supplierId) return rows[i];
    return undefined;
  },
  /**
   * APPEND ONLY — called by the `t_supplier_set_update_mode` target and nothing else.
   * @param {SupplierUpdateModeChange} row
   * @returns {void}
   */
  append(row) {
    rows = [...rows, row];
    changed();
  },
  /**
   * Back to no overlay rows — test isolation.
   * @returns {void}
   */
  reset() {
    rows = [];
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
