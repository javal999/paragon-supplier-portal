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
/** @import { ASN } from '../../types' */

/**
 * @param {ASN} a
 * @returns {ASN}
 */
function clone(a) {
  return { ...a, details: { ...a.details }, lineItems: a.lineItems.map((li) => ({ ...li })) };
}

/** @type {ASN[]} */
let rows = MOCK_ASNS.map(clone);
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
    rows = MOCK_ASNS.map(clone);
    seq = 0;
  }
};
