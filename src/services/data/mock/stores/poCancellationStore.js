// ────────────────────────────────────────────────────────────────────────────
// PO CANCELLATION REQUESTS — PEX-12 [Proposed]. One row per request; its
// history is append-only: the planner's request, then the supplier's
// acknowledgement, each with time and who. NOTHING here cancels a PO or goes to
// SAP. Written by the target `poCancellation` only. Empty at start; in memory.
// ────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {{
 *   readonly kind: 'requested' | 'acknowledged';
 *   readonly at: string;
 *   readonly actor: import('@lib/enforcement').ActorAttribution;
 *   readonly reason?: string;
 * }} PoCancellationEvent
 */

/**
 * @typedef {{
 *   readonly id: string;
 *   readonly supplierId: string;
 *   readonly poId: string;
 *   readonly poNumber: string;
 *   readonly state: 'Requested' | 'Acknowledged';
 *   readonly history: readonly PoCancellationEvent[];
 * }} PoCancellationRow
 */

/** @type {PoCancellationRow[]} */
let rows = [];
let counter = 0;

export const poCancellationStore = {
  /** @returns {readonly PoCancellationRow[]} */
  all() {
    return rows;
  },
  /**
   * @param {string} id
   * @returns {PoCancellationRow | undefined}
   */
  get(id) {
    return rows.find((r) => r.id === id);
  },
  /**
   * @param {string} poId
   * @returns {PoCancellationRow | undefined}
   */
  forPo(poId) {
    return rows.filter((r) => r.poId === poId).slice(-1)[0];
  },
  /**
   * @param {Omit<PoCancellationRow, 'id'>} row
   * @returns {PoCancellationRow}
   */
  insert(row) {
    counter += 1;
    const made = { ...row, id: `poc-${String(counter).padStart(4, '0')}` };
    rows = [...rows, made];
    return made;
  },
  /**
   * @param {string} id
   * @param {PoCancellationRow['state']} state
   * @param {PoCancellationEvent} event
   */
  append(id, state, event) {
    rows = rows.map((r) => (r.id === id ? { ...r, state, history: [...r.history, event] } : r));
  },
  /** TEST SEAM — back to nothing. */
  reset() {
    rows = [];
    counter = 0;
  }
};
