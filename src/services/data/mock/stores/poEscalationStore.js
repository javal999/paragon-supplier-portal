// ────────────────────────────────────────────────────────────────────────────
// PO ESCALATION RECORDS — UCX-P7 (BL-368) · UCX-D22. One row per act PTI
// takes on an escalated PO: the ask, and the four decisions. Append-only: a
// record is never changed (a new act is a new row). Written by the target
// `poEscalation` only. Empty at start; in memory.
//
// ⚠️ **THE PO STORE IS NOT TOUCHED HERE.** The three ending decisions cascade a
// PO move through the dispatcher (`cascades.js`); "still waiting" moves
// nothing. This store holds the record — who acted, when, and what was chosen —
// which is exactly the half the portal was missing (UCX-F1).
// ────────────────────────────────────────────────────────────────────────────

/** @import { PoEscalationDecision } from '../../../transitions/poEscalationRules' */

/**
 * @typedef {{
 *   readonly id: string;
 *   readonly poId: string;
 *   readonly poNumber: string;
 *   readonly supplierId: string;
 *   readonly kind: 'ask' | 'decision';
 *   readonly decision: PoEscalationDecision | null;
 *   readonly at: string;
 *   readonly actor: import('@lib/enforcement').ActorAttribution;
 *   readonly note?: string;
 * }} PoEscalationRecord
 */

/** @type {PoEscalationRecord[]} */
let rows = [];
let counter = 0;

export const poEscalationStore = {
  /** @returns {readonly PoEscalationRecord[]} oldest first */
  all() {
    return rows;
  },
  /**
   * @param {string} id
   * @returns {PoEscalationRecord | undefined}
   */
  get(id) {
    return rows.find((r) => r.id === id);
  },
  /**
   * Every record made against one PO, oldest first.
   * @param {string} poId
   * @returns {PoEscalationRecord[]}
   */
  forPo(poId) {
    return rows.filter((r) => r.poId === poId);
  },
  /**
   * The latest record against one PO, or undefined.
   * @param {string} poId
   * @returns {PoEscalationRecord | undefined}
   */
  latestForPo(poId) {
    return rows.filter((r) => r.poId === poId).slice(-1)[0];
  },
  /**
   * @param {Omit<PoEscalationRecord, 'id'>} row
   * @returns {PoEscalationRecord}
   */
  insert(row) {
    counter += 1;
    const made = { ...row, id: `esc-${String(counter).padStart(4, '0')}` };
    rows = [...rows, made];
    return made;
  },
  /** TEST SEAM — back to nothing. */
  reset() {
    rows = [];
    counter = 0;
  }
};
