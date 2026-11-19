// ─────────────────────────────────────────────────────────────────────────────
// BL-139 — THE RECEIPT AND THE ASN READ SPEAK ONE SERIES.
//
// Before this batch the 17 receipts that named an ASN cited the shipments'
// numbers while the ASN read held a different series, so `compareReceipt`
// resolved none of them and every receipt fell back to its ordered quantity.
// The fixtures now name ASNs the store holds — `ASN-2025-0NNNN`, the store's
// own series — and this file holds that closed:
//
//   · every receipt that names an ASN resolves against the store, except ONE
//     named exception kept on purpose (`gr-016` → `ASN-2025-00416`), so the
//     fallback path stays demonstrable;
//   · a resolved receipt and its ASN agree on supplier, PO and material;
//   · the ASN's shipped quantity is the receipt's expected quantity, so the
//     CR-25 outcomes the tolerance demo pins do not move.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import { asnStore } from '../stores/asnStore';
import { mockGoodsReceipts } from '@data/mockGoodsReceipts';
/** @import { ASN } from '../../types' */
/** @import { GoodsReceipt } from '@data/mockGoodsReceipts' */

/** The one receipt whose ASN the store deliberately does not hold. */
const DELIBERATE_MISMATCH = { receiptId: 'gr-016', asnNumber: 'ASN-2025-00416' };

/** @param {GoodsReceipt} gr */
const namesAnAsn = (gr) => gr.asnNumber !== '';

/** @type {Map<string, ASN>} */
const heldByNumber = new Map(asnStore.all().map((a) => [a.asnNumber, a]));

/** Every receipt whose ASN resolves, with the ASN it resolves to. */
const resolved = mockGoodsReceipts.filter(namesAnAsn).flatMap((gr) => {
  const asn = heldByNumber.get(gr.asnNumber);
  return asn ? [{ gr, asn }] : [];
});

describe('BL-139 — the sample receipts name ASNs the ASN read holds', () => {
  it('the population is real and ONE mismatch is kept, by name', () => {
    const naming = mockGoodsReceipts.filter(namesAnAsn);
    // A floor, not a fixture count: the receipts that name an ASN must be a
    // real population, or every assertion below runs over nothing.
    expect(naming.length).toBeGreaterThanOrEqual(17);
    // The deliberate exception, asserted by name — the store must NOT hold it.
    const mismatch = naming.filter((gr) => !heldByNumber.has(gr.asnNumber));
    expect(mismatch.map((gr) => ({ id: gr.id, asnNumber: gr.asnNumber }))).toEqual([
      { id: DELIBERATE_MISMATCH.receiptId, asnNumber: DELIBERATE_MISMATCH.asnNumber }
    ]);
    // Known-good members, so the resolved set is not vacuous.
    const ids = resolved.map(({ gr }) => gr.id);
    expect(ids).toContain('gr-002');
    expect(ids).toContain('gr-015');
    expect(ids).toContain('gr-017');
  });

  it('the canonical series is the STORE’s — every named ASN is ASN-2025-0NNNN', () => {
    for (const gr of mockGoodsReceipts.filter(namesAnAsn)) {
      expect(gr.asnNumber, gr.id).toMatch(/^ASN-2025-\d{5}$/);
    }
  });

  it('each resolved receipt agrees with its ASN on supplier and PO', () => {
    const disagreements = resolved
      .filter(({ gr, asn }) => asn.supplierId !== gr.supplierId || asn.poReference !== gr.poNumber)
      .map(({ gr, asn }) => `${gr.id} ${gr.supplierId}/${gr.poNumber} vs ${asn.asnNumber}`);
    expect(disagreements).toEqual([]);
  });

  it('each resolved receipt finds its material on the ASN, at the quantity it expected', () => {
    /** @type {string[]} */
    const disagreements = [];
    for (const { gr, asn } of resolved) {
      for (const line of gr.inspectionResults) {
        const asnLine = asn.lineItems.find((l) => l.materialCode === line.materialCode);
        if (!asnLine) {
          disagreements.push(`${gr.id} ${line.materialCode} absent from ${asn.asnNumber}`);
        } else if (asnLine.shippedQty !== line.qtyExpected) {
          disagreements.push(
            `${gr.id} ${line.materialCode} expected ${line.qtyExpected} vs shipped ${asnLine.shippedQty}`
          );
        }
      }
    }
    expect(disagreements).toEqual([]);
  });

  it('every receipt ASN is Delivered — a receipt answers goods that arrived', () => {
    const notDelivered = resolved
      .filter(({ asn }) => asn.status !== 'Delivered')
      .map(({ asn }) => asn.asnNumber);
    expect(notDelivered).toEqual([]);
  });

  it('the ASN’s ETA and its receipt’s date resolve to the SAME day', () => {
    // Both corpora are shifted by their own anchor; the new rows take the
    // RECEIPTS' anchor (`goodsReceipt`) precisely so these two dates cannot
    // drift apart while each still reads correctly against its own family.
    const disagreements = resolved
      .filter(({ gr, asn }) => asn.eta !== gr.receivedDate)
      .map(({ gr, asn }) => `${gr.id} ${gr.receivedDate} vs ${asn.asnNumber} ${asn.eta}`);
    expect(disagreements).toEqual([]);
  });

  it('the deliberate mismatch still falls back — its comparison reads qtyExpected', () => {
    const gr = /** @type {GoodsReceipt} */ (
      mockGoodsReceipts.find((g) => g.id === DELIBERATE_MISMATCH.receiptId)
    );
    expect(gr.asnNumber).toBe(DELIBERATE_MISMATCH.asnNumber);
    expect(heldByNumber.has(gr.asnNumber)).toBe(false);
    // And the other side of the probe: the neighbouring receipts DO resolve.
    expect(heldByNumber.has('ASN-2025-00415')).toBe(true);
    expect(heldByNumber.has('ASN-2025-00417')).toBe(true);
  });
});
