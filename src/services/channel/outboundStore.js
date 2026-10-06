// ─────────────────────────────────────────────────────────────────────────────
// C3 — the minimal outbound-request STORE (the persisted ask event, LAW 3).
//
// Same contract shape as `schedulingAgreementStore`: reads resolve FROM here; the
// ONE mutator is an IMMUTABLE APPEND (a new array with the new record — nothing is
// mutated in place); `reset()` restores the seed for test isolation. ONE mutator
// by design, so a command wrapper can front it later (C4) without touching C3 —
// this is deliberately NOT a transition machine (no 11th lifecycle) and NOT
// command-wrapped yet.
// ─────────────────────────────────────────────────────────────────────────────

/** @import { OutboundRequestRecord } from './outbound' */
import { OUTBOUND_REQUEST_SEED } from './outboundFixtures';

/** @type {OutboundRequestRecord[]} */
let rows = [...OUTBOUND_REQUEST_SEED];

export const outboundRequestStore = {
  /**
   * All ask events — the source `deriveOutboundQueue`'s `sentRecords` reads from.
   * @returns {readonly OutboundRequestRecord[]}
   */
  all() {
    return rows;
  },
  /**
   * This supplier's ask events (convenience own-scope read).
   * @param {string} supplierId
   * @returns {readonly OutboundRequestRecord[]}
   */
  forSupplier(supplierId) {
    return rows.filter((r) => r.supplierId === supplierId);
  },
  /**
   * IMMUTABLE APPEND — the ONE mutator. A new array; the record is never edited.
   * @param {OutboundRequestRecord} record
   * @returns {void}
   */
  append(record) {
    rows = [...rows, record];
  },
  /**
   * Restore the fixture seed (test isolation).
   * @returns {void}
   */
  reset() {
    rows = [...OUTBOUND_REQUEST_SEED];
  }
};
