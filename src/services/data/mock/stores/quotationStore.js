// ────────────────────────────────────────────────────────────────────────────
// Mutable Quotation store (v2.2 Step 4 batch iv).
//
// Same contract as purchaseOrderStore: reads (getQuotations) resolve FROM here;
// commands mutate IMMUTABLY (new object + new array). The award cascade fans out
// onto these: the winning quotation → Awarded (`t_quotation_award`), every other
// on the same RFQ → Rejected (`t_quotation_reject`). `forRfq` gives the cascade
// resolver the sibling set (winner + losers). Keyed by id; seeded from the
// fixture; `reset()` restores it (test isolation).
// ────────────────────────────────────────────────────────────────────────────

import { mockQuotations } from '@data/mockQuotations';
/** @import { Quotation } from '@data/mockQuotations' */
// REQ-E03-03 / REQ-E03-05 — the priced bids on the present-relative events,
// including the round-1 revision that supersedes one of them.
import { RFX_QUOTATION_SEED } from '../fixtures/rfxHub';
// BL-64 — the compliance gate demo quotes (CR-23), in the same store.
import { GATE_DEMO_QUOTATION_SEED } from '../fixtures/gateDemo';

// RFx spec 2026-09-21 — two tiered quotes on Oslo (rfq-021), for the
// comparison and the split award to work against.
import {
  RFQ_SAMPLE_HISTORY_QUOTATION_SEED,
  RFQ_SAMPLE_QUOTATION_SEED
} from '../fixtures/rfqSamples';

/** @type {readonly Quotation[]} */
const SEED = [
  ...RFX_QUOTATION_SEED,
  ...GATE_DEMO_QUOTATION_SEED,
  ...mockQuotations,
  ...RFQ_SAMPLE_QUOTATION_SEED,
  // The Amplify split award's two winning quotes (rfq-024).
  ...RFQ_SAMPLE_HISTORY_QUOTATION_SEED
];

/**
 * @param {Quotation} q
 * @returns {Quotation}
 */
function clone(q) {
  return { ...q };
}

/** @type {Quotation[]} */
let rows = SEED.map(clone);
let seq = 0;

export const quotationStore = {
  /**
   * All quotations (the mutable source reads resolve from).
   * @returns {readonly Quotation[]}
   */
  all() {
    return rows;
  },
  /**
   * One quotation by id, or undefined.
   * @param {string} id
   * @returns {Quotation | undefined}
   */
  get(id) {
    return rows.find((q) => q.id === id);
  },
  /**
   * Every quotation on an RFQ (the cascade's winner + loser set).
   * @param {string} rfqId
   * @returns {readonly Quotation[]}
   */
  forRfq(rfqId) {
    return rows.filter((q) => q.rfqId === rfqId);
  },
  /**
   * IMMUTABLE update — swap in a new quotation + new array.
   * @param {string} id
   * @param {(q: Quotation) => Quotation} next
   * @returns {void}
   */
  update(id, next) {
    rows = rows.map((q) => (q.id === id ? next(q) : q));
  },
  /**
   * Add a newly-submitted quotation (creation). New array reference.
   * @param {Quotation} quotation
   * @returns {void}
   */
  add(quotation) {
    rows = [quotation, ...rows];
  },
  /**
   * Store-assigned quotation number for a submit (distinct 9xx range, as rfqStore).
   * @returns {string}
   */
  nextNumber() {
    seq += 1;
    return `QUO-2026-${900 + seq}`;
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
