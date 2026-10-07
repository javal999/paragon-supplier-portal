// ────────────────────────────────────────────────────────────────────────────
// Mutable purchase-requisition store (G1.1 — C7 PR intake).
//
// Same contract as asnStore / invoiceStore: reads resolve from here, commands
// mutate IMMUTABLY (new object + new array — never in place), so the invalidated
// query yields new references and every derivation re-derives together. Creation
// (t_pr_create — the C7 intake verb) ADDS a new Draft PR with a store-assigned
// number (no fabricated document id). Keyed by id; a created PR uses its assigned
// prNumber as the id (the GR/invoice convention — id doubles as the number).
//
// This store is what makes the PR CommandTarget a REAL push-to-execute target:
// getRequisitions reads it (MockProcurementService), so a pushed intake line is
// list-visible — not honest-but-invisible.
// ────────────────────────────────────────────────────────────────────────────

import { REQUISITIONS } from '../fixtures/buyerRequisitions';
/** @import { PurchaseRequisition } from '../../types' */

/**
 * @param {PurchaseRequisition} pr
 * @returns {PurchaseRequisition}
 */
function clone(pr) {
  return { ...pr };
}

/** @type {PurchaseRequisition[]} */
let rows = REQUISITIONS.map(clone);
let seq = 0;

export const purchaseRequisitionStore = {
  /** @returns {readonly PurchaseRequisition[]} */
  all() {
    return rows;
  },
  /**
   * @param {string} id
   * @returns {PurchaseRequisition | undefined}
   */
  get(id) {
    return rows.find((r) => r.id === id);
  },
  /**
   * Immutable update — swap in a new PR + new array (see asnStore).
   * @param {string} id
   * @param {(r: PurchaseRequisition) => PurchaseRequisition} next
   * @returns {void}
   */
  update(id, next) {
    rows = rows.map((r) => (r.id === id ? next(r) : r));
  },
  /**
   * Add a newly-created PR (creation). New array reference.
   * @param {PurchaseRequisition} pr
   * @returns {void}
   */
  add(pr) {
    rows = [pr, ...rows];
  },
  /**
   * Store-assigned PR number for a creation (distinct 9xx range, as asnStore).
   * @returns {string}
   */
  nextNumber() {
    seq += 1;
    return `PR-2026-${900 + seq}`;
  },
  /** @returns {void} */
  reset() {
    rows = REQUISITIONS.map(clone);
    seq = 0;
  }
};
