// ────────────────────────────────────────────────────────────────────────────
// Mutable RFQ store (v2.2 Step 4 batch iv).
//
// Same contract as purchaseOrderStore: reads (getRFQs) resolve FROM here;
// commands mutate IMMUTABLY (new object + new array, never in place) so the
// invalidated query yields new references and every derivation re-derives. The
// award verb (`t_rfq_award`) flips status → Awarded and records the award
// metadata (awardedSupplierId / awardedQuotationId) — no PO/contract minted.
// Creation (`t_rfq_create` — Phase A/2, retires extraRfqs) ADDS a new DRAFT RFQ
// (PF-1a · D-1 — it minted Open under FORK-2B; the buyer now publishes)
// with a store-assigned number (distinct 9xx range, as asnStore/PR): a real
// push-to-execute target, so getRFQs reflects it — never a fabricated peer.
// Keyed by id. Seeded from the fixture; `reset()` restores it (test isolation).
// ────────────────────────────────────────────────────────────────────────────

import { mockRfqs } from '@data/mockRfqs';
/** @import { RFQ } from '@data/mockRfqs' */
// REQ-E03-03 / REQ-E03-05 — the present-relative sourcing events the RFx demo
// needs. They join the SAME list rather than a second one: a buyer looking at
// sourcing events sees one board, and a read that had to union two sources is a
// read that will one day union only one.
import { RFX_RFQ_SEED } from '../fixtures/rfxHub';
// BL-64 — the compliance gate demo RFQs (CR-23), on the same board.
import { GATE_DEMO_RFQ_SEED } from '../fixtures/gateDemo';

// RFx spec 2026-09-21 — the tiered RFQs shaped like the real samples (Oslo,
// Iron, Redwood 2.0). LAST, so no existing row's position on the board moves.
import {
  RFQ_SAMPLE_DRAFT_SEED,
  RFQ_SAMPLE_HISTORY_SEED,
  RFQ_SAMPLE_SEED
} from '../fixtures/rfqSamples';

/** @type {readonly RFQ[]} */
const SEED = [
  ...RFX_RFQ_SEED,
  ...GATE_DEMO_RFQ_SEED,
  ...mockRfqs,
  ...RFQ_SAMPLE_SEED,
  // The Amplify split award (rfq-024), last so no existing row moves.
  ...RFQ_SAMPLE_HISTORY_SEED,
  // BL-93 — the Iron-shaped draft "Edit draft" opens (rfq-025), last again.
  ...RFQ_SAMPLE_DRAFT_SEED
];

/**
 * @param {RFQ} r
 * @returns {RFQ}
 */
function clone(r) {
  return {
    ...r,
    materialIds: [...r.materialIds],
    invitedSupplierIds: [...r.invitedSupplierIds],
    respondedSupplierIds: [...r.respondedSupplierIds]
  };
}

/** @type {RFQ[]} */
let rows = SEED.map(clone);
let seq = 0;

export const rfqStore = {
  /**
   * All RFQs (the mutable source reads resolve from).
   * @returns {readonly RFQ[]}
   */
  all() {
    return rows;
  },
  /**
   * One RFQ by id, or undefined.
   * @param {string} id
   * @returns {RFQ | undefined}
   */
  get(id) {
    return rows.find((r) => r.id === id);
  },
  /**
   * IMMUTABLE update — swap in a new RFQ + new array (see purchaseOrderStore).
   * @param {string} id
   * @param {(r: RFQ) => RFQ} next
   * @returns {void}
   */
  update(id, next) {
    rows = rows.map((r) => (r.id === id ? next(r) : r));
  },
  /**
   * Add a newly-created RFQ (creation). New array reference.
   * @param {RFQ} rfq
   * @returns {void}
   */
  add(rfq) {
    rows = [rfq, ...rows];
  },
  /**
   * Store-assigned RFQ number for a creation (distinct 9xx range, as asnStore).
   * @returns {string}
   */
  nextNumber() {
    seq += 1;
    return `RFQ-2026-${900 + seq}`;
  },
  /**
   * Restore the fixture seed (test isolation).
   * @returns {void}
   */
  reset() {
    rows = SEED.map(clone);
    seq = 0;
  }
};
