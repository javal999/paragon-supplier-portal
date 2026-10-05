// ────────────────────────────────────────────────────────────────────────────
// PLANNING GROUP STORE — Material C5 (MR-8 BR-01 to BR-05; plan AR-15, MAT-D12).
//
// The governed log of changes to the planning groups: created, renamed, moved,
// retired. APPEND ONLY (MAT-R3): nothing here is edited, so the log is the
// history of who changed what, and when. The groups themselves are derived
// from it (`resolvePlanningGroups`); the default group of each SAP material
// group needs no row. A material's membership is its `planningGroupId` in the
// material overlay, which the move verb writes beside its row here.
//
// Written by the `planningGroup` target and nothing else. Read through the
// planning group read model, never directly by a page. Empty at start.
// ────────────────────────────────────────────────────────────────────────────

/** @import { PlanningGroupEvent } from '../../types' */

/** @type {PlanningGroupEvent[]} */
let rows = [];
let seq = 0;

export const planningGroupStore = {
  /**
   * Every change, oldest first.
   * @returns {readonly PlanningGroupEvent[]}
   */
  all() {
    return rows;
  },
  /**
   * The id for the next group Material Planning creates (never a default id).
   * @returns {string}
   */
  nextId() {
    seq += 1;
    return `pg-${String(seq).padStart(4, '0')}`;
  },
  /**
   * APPEND ONLY — called by the `planningGroup` target and nothing else.
   * @param {PlanningGroupEvent} row
   * @returns {void}
   */
  append(row) {
    rows = [...rows, row];
  },
  /**
   * Back to no changes — test isolation.
   * @returns {void}
   */
  reset() {
    rows = [];
    seq = 0;
  }
};
