// ────────────────────────────────────────────────────────────────────────────
// Mutable ASN store (v2.2 Step 4 batch i).
//
// Same contract as purchaseOrderStore: reads resolve from here, commands mutate
// IMMUTABLY (new object + new array — never in place), so the invalidated query
// yields new references and every derivation re-derives together. Creation ADDS
// a new ASN with a store-assigned number (no fabricated document id). Keyed by
// asnNumber (the ASN has no separate id).
// ────────────────────────────────────────────────────────────────────────────

import { MOCK_ASNS } from '../fixtures/supplierShipments';
// E2E walkthrough 2026-11-12 — the ASNs of the pair's two call-offs.
import { SSTP_ASNS } from '../fixtures/walkthroughSstp';
// BL-139 — the Delivered ASNs the sample goods receipts name. The RECEIPTS
// corpus and the ASN read now share one series; before this the receipts cited
// the shipments' numbers and no comparison could resolve.
import { RECEIVED_ASNS } from '../fixtures/receivedAsns';
/** @import { ASN } from '../../types' */

/**
 * @param {ASN} a
 * @returns {ASN}
 */
function clone(a) {
  return { ...a, details: { ...a.details }, lineItems: a.lineItems.map((li) => ({ ...li })) };
}

/** The seed set, built once so `reset` restores the same rows. */
const SEED = [...MOCK_ASNS, ...SSTP_ASNS, ...RECEIVED_ASNS];
/** @type {ASN[]} */
let rows = SEED.map(clone);
let seq = 0;

export const asnStore = {
  /** @returns {readonly ASN[]} */
  all() {
    return rows;
  },
  /**
   * @param {string} asnNumber
   * @returns {ASN | undefined}
   */
  get(asnNumber) {
    return rows.find((a) => a.asnNumber === asnNumber);
  },
  /**
   * Immutable update — swap in a new ASN + new array (see purchaseOrderStore).
   * @param {string} asnNumber
   * @param {(a: ASN) => ASN} next
   * @returns {void}
   */
  update(asnNumber, next) {
    rows = rows.map((a) => (a.asnNumber === asnNumber ? next(a) : a));
  },
  /**
   * Add a newly-created ASN (creation). New array reference.
   * @param {ASN} asn
   * @returns {void}
   */
  add(asn) {
    rows = [asn, ...rows];
  },
  /**
   * Store-assigned ASN number for a creation (the supplier's own document).
   * @returns {string}
   */
  nextNumber() {
    seq += 1;
    return `ASN-2026-${900 + seq}`;
  },
  /** @returns {void} */
  reset() {
    rows = SEED.map(clone);
    seq = 0;
  }
};
