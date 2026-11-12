// ────────────────────────────────────────────────────────────────────────────
// Mutable goods-receipt store (v2.2 Step 4 batch ii).
//
// Same contract as purchaseOrderStore / asnStore: reads resolve from here,
// commands mutate IMMUTABLY (new object + new arrays — never in place) so the
// invalidated query yields new references and every derivation re-derives
// together. Creation ADDS a new GR with a store-assigned number. Keyed by `id`.
//
// `nextMatDoc()` mints the SAP material-document reference — but ONLY the
// settlement calls it (Option B), representing SAP's async assignment. Before
// settle a posted GR carries NO sapMaterialDoc ("pending SAP assignment"); this
// is the honest replacement for the old client-side fabrication (GR-FABRICATION-01).
// ────────────────────────────────────────────────────────────────────────────

import { mockGoodsReceipts } from '@data/mockGoodsReceipts';
/** @import { GoodsReceipt } from '@data/mockGoodsReceipts' */
// BL-64 — the delivery history behind the compliance gate's OTIF boundary.
import { GATE_DEMO_GOODS_RECEIPTS } from '../fixtures/gateDemo';
// E2E walkthrough 2026-11-12 — the receipt of the pair's past call-off.
import { SSTP_GOODS_RECEIPTS } from '../fixtures/walkthroughSstp';

/** @type {readonly GoodsReceipt[]} */
const SEED = [...mockGoodsReceipts, ...GATE_DEMO_GOODS_RECEIPTS, ...SSTP_GOODS_RECEIPTS];

/**
 * @param {GoodsReceipt} g
 * @returns {GoodsReceipt}
 */
function clone(g) {
  return {
    ...g,
    inspectionResults: g.inspectionResults.map((r) => ({ ...r }))
  };
}

/** @type {GoodsReceipt[]} */
let rows = SEED.map(clone);
let seq = 0;
let matSeq = 0;

export const goodsReceiptStore = {
  /** @returns {readonly GoodsReceipt[]} */
  all() {
    return rows;
  },
  /**
   * @param {string} id
   * @returns {GoodsReceipt | undefined}
   */
  get(id) {
    return rows.find((g) => g.id === id);
  },
  /**
   * Immutable update — swap in a new GR + new array (see purchaseOrderStore).
   * @param {string} id
   * @param {(g: GoodsReceipt) => GoodsReceipt} next
   * @returns {void}
   */
  update(id, next) {
    rows = rows.map((g) => (g.id === id ? next(g) : g));
  },
  /**
   * Add a newly-created GR (creation). New array reference.
   * @param {GoodsReceipt} gr
   * @returns {void}
   */
  add(gr) {
    rows = [gr, ...rows];
  },
  /**
   * Store-assigned GR number for a creation.
   * @returns {string}
   */
  nextNumber() {
    seq += 1;
    return `GR-2026-${900 + seq}`;
  },
  /**
   * SAP-assigned material-document reference — minted only on settlement.
   * @returns {string}
   */
  nextMatDoc() {
    matSeq += 1;
    return `MAT-DOC-${600000 + matSeq}`;
  },
  /** @returns {void} */
  reset() {
    rows = SEED.map(clone);
    seq = 0;
    matSeq = 0;
  }
};
