// ────────────────────────────────────────────────────────────────────────────
// Mutable purchase-order store (v2.2 Step 3.6).
//
// The canonical mutation pattern: commands mutate THIS in-memory store; reads
// (MockProcurementService.getPurchaseOrders) resolve FROM it; the page re-derives
// after a targeted invalidateQueries. No page holds a seeded local copy.
//
// Seeded from the fixture on load; `reset()` restores the seed for test
// isolation (the store is a process singleton).
// ────────────────────────────────────────────────────────────────────────────

import { mockPurchaseOrders } from '@data/mockPurchaseOrders';
/** @import { PurchaseOrder } from '../../types' */
// BL-64 — the umbrella orders behind the compliance gate's OTIF boundary.
import { GATE_DEMO_PURCHASE_ORDERS } from '../fixtures/gateDemo';

/** @type {readonly PurchaseOrder[]} */
const SEED = [...mockPurchaseOrders, ...GATE_DEMO_PURCHASE_ORDERS];

/**
 * @param {PurchaseOrder} po
 * @returns {PurchaseOrder}
 */
function clone(po) {
  return { ...po, lineItems: po.lineItems.map((li) => ({ ...li })) };
}

/** @type {PurchaseOrder[]} */
let rows = SEED.map(clone);

export const purchaseOrderStore = {
  /**
   * All POs (the mutable source reads resolve from).
   * @returns {readonly PurchaseOrder[]}
   */
  all() {
    return rows;
  },
  /**
   * One PO by id, or undefined.
   * @param {string} id
   * @returns {PurchaseOrder | undefined}
   */
  get(id) {
    return rows.find((p) => p.id === id);
  },
  /**
   * IMMUTABLE update: swap in a NEW PO object (and a new rows array). Never
   * mutate a PO in place — doing so retroactively corrupts the snapshot a prior
   * read already handed to TanStack Query, so structural sharing sees "no
   * change" on refetch and keeps the stale reference (memoized derivations then
   * never recompute). Returning new references is what lets EVERY consumer of
   * the invalidated query — table, KPI counts, banner — re-derive together.
   * @param {string} id
   * @param {(po: PurchaseOrder) => PurchaseOrder} next
   * @returns {void}
   */
  update(id, next) {
    rows = rows.map((p) => (p.id === id ? next(p) : p));
  },
  /**
   * Restore the fixture seed (test isolation).
   * @returns {void}
   */
  reset() {
    rows = SEED.map(clone);
  }
};
