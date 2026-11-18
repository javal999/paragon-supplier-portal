// ─────────────────────────────────────────────────────────────────────────────
// BL-81 follow-up (BL-325) — the reopened quantity is computed ONCE PER ASN.
//
// GR-1 / BL-71: "a receipt kept open reopens the missing quantity for another
// shipment". The first build summed the missing quantity of every kept-open
// receipt, so two receipts against the same ASN reopened the same debt twice,
// and a receipt whose ASN is not on record reopened `qtyExpected − received`
// even though that shipment was never subtracted from `shipped`.
//
// The rule these specs pin: only an ASN that is active and counted in
// `shipped` may reopen, and what it reopens is
//   max(0, its shipped quantity for the material − Σ received of its
//          kept-open receipt lines for the material).
// A receipt with no matching ASN reopens nothing.
//
// The arithmetic guard is pinned too: a receipt line with a missing or
// non-numeric `qtyReceived` is read as 0, so the open quantity is finite and
// the over-ship refusal still fires (a NaN made `q > NaN` false and disabled
// the refusal).
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import { asnLineRefusal, openQtyForLine, reopenedQtyByMaterial } from './index';
/** @import { ASN, POLineItem, PurchaseOrder } from '../../data/types' */
/** @import { GoodsReceipt } from '@data/mockGoodsReceipts' */

const MAT = 'PK-PETB-8801';

/** @type {Pick<PurchaseOrder, 'poNumber'>} */
const PO = { poNumber: 'PO-2025-00107' };

/** @type {Pick<POLineItem, 'materialCode' | 'quantity' | 'confirmedQty'>} */
const LINE = { materialCode: MAT, quantity: 200_000, confirmedQty: 200_000 };

/** The PO as the line-refusal rule reads it (it needs the full line shape). */
/** @type {Pick<PurchaseOrder, 'poNumber' | 'lineItems'>} */
const PO_WITH_LINES = {
  poNumber: PO.poNumber,
  lineItems: [
    {
      id: 'li-007a',
      materialCode: MAT,
      description: 'PET bottle',
      quantity: 200_000,
      uom: 'PCS',
      unitPrice: 1_600,
      confirmedQty: 200_000
    }
  ]
};

/**
 * One ASN against the PO, shipping `shippedQty` of the material.
 * @param {string} asnNumber
 * @param {number} shippedQty
 * @param {ASN['status']} [status]
 * @returns {ASN}
 */
const asn = (asnNumber, shippedQty, status = 'Submitted') => ({
  asnNumber,
  supplierId: 'sup-007',
  poReference: PO.poNumber,
  status,
  carrier: 'Sample Courier',
  trackingNumber: 'SMPL-1',
  eta: '2026-09-30',
  details: {
    originCity: 'Surabaya, ID',
    destinationWarehouse: 'Paragon DC Cikarang (WH-04)',
    totalCartons: 1,
    grossWeightKg: 1,
    temperatureRequirement: 'Ambient (15–25°C)'
  },
  lineItems: [
    {
      materialCode: MAT,
      description: 'PET bottle',
      orderedQty: shippedQty,
      shippedQty,
      lotNumber: 'LOT-1'
    }
  ]
});

/**
 * One receipt line against `asnNumber`, with a deliberately loose
 * `qtyReceived` so a non-numeric row can be built.
 * @param {string} asnNumber
 * @param {number} qtyExpected
 * @param {unknown} qtyReceived
 * @param {{ status?: GoodsReceipt['status']; materialCode?: string }} [opts]
 * @returns {Pick<GoodsReceipt, 'poNumber' | 'asnNumber' | 'inspectionResults' | 'status'>}
 */
const receipt = (asnNumber, qtyExpected, qtyReceived, opts = {}) =>
  /** @type {Pick<GoodsReceipt, 'poNumber' | 'asnNumber' | 'inspectionResults' | 'status'>} */ ({
    poNumber: PO.poNumber,
    asnNumber,
    status: opts.status ?? 'Approved',
    inspectionResults: [
      {
        materialCode: opts.materialCode ?? MAT,
        description: 'PET bottle',
        qtyExpected,
        qtyReceived,
        qtyAccepted: qtyReceived,
        qtyRejected: 0,
        visualCheck: 'Pass',
        packagingCheck: 'Pass'
      }
    ]
  });

/**
 * @param {readonly ASN[]} asns
 * @param {readonly Pick<GoodsReceipt, 'poNumber' | 'asnNumber' | 'inspectionResults' | 'status'>[]} receipts
 * @param {string} [excludeAsn]
 * @returns {number}
 */
const openQty = (asns, receipts, excludeAsn) =>
  openQtyForLine(PO, LINE, asns, excludeAsn, receipts);

describe('BL-325 · a kept-open receipt reopens the missing quantity once per ASN', () => {
  it('a shipped ASN with NO receipt reopens nothing — its quantity stays subtracted', () => {
    expect(openQty([asn('ASN-1', 200_000)], [])).toBe(0);
  });

  it('one kept-open receipt reopens the missing quantity, exactly as GR-1 / BL-71 says', () => {
    const asns = [asn('ASN-1', 200_000)];
    const receipts = [receipt('ASN-1', 200_000, 190_000)];
    // Shipped 200,000 · received 190,000 → 10,000 still owed on this ASN.
    expect(openQty(asns, receipts)).toBe(10_000);
    expect(
      asnLineRefusal({ materialCode: MAT, shippedQty: 10_000 }, PO_WITH_LINES, asns, {
        requireBatch: false,
        receipts
      })
    ).toBeNull();
  });

  it('two receipts against the same ASN do not reopen the same debt twice', () => {
    // The worked example from the review: 200,000 shipped; GR1 received
    // 190,000 (kept open, 10,000 owed); GR2 received the last 10,000. Every
    // unit has now arrived, so nothing is open — NOT the 200,000 the summed
    // per-receipt arithmetic produced.
    const asns = [asn('ASN-1', 200_000)];
    const receipts = [receipt('ASN-1', 200_000, 190_000), receipt('ASN-1', 10_000, 10_000)];
    expect(openQty(asns, receipts)).toBe(0);
    expect(
      asnLineRefusal({ materialCode: MAT, shippedQty: 200_000 }, PO_WITH_LINES, asns, {
        requireBatch: false,
        receipts
      })
    ).toBe('overOpen');
  });

  it('two partially received kept-open receipts reopen only what the ASN still owes', () => {
    // 100,000 + 90,000 received on one 200,000 ASN → 10,000 owed. Summing each
    // receipt's own missing quantity would give 110,000 + 100,000 = 210,000.
    const asns = [asn('ASN-1', 200_000)];
    const receipts = [receipt('ASN-1', 200_000, 100_000), receipt('ASN-1', 200_000, 90_000)];
    expect(openQty(asns, receipts)).toBe(10_000);
  });

  it('a receipt with no ASN on record reopens nothing — that shipment was never subtracted', () => {
    // No ASN row at all: `shipped` is 0, so the whole committed quantity is
    // already open and reopening the receipt's shortfall would hand it out twice.
    expect(openQty([], [receipt('ASN-MISSING', 200_000, 190_000)])).toBe(200_000);
    // The control: the SAME receipt reopens when its ASN is on record.
    expect(openQty([asn('ASN-MISSING', 200_000)], [receipt('ASN-MISSING', 200_000, 190_000)])).toBe(
      10_000
    );
  });

  it('a receipt against a CANCELLED ASN reopens nothing — its quantity was never consumed', () => {
    const asns = [asn('ASN-1', 200_000, 'Cancelled')];
    expect(openQty(asns, [receipt('ASN-1', 200_000, 190_000)])).toBe(200_000);
  });

  it('the ASN being edited (excludeAsn) neither counts in shipped nor reopens', () => {
    const asns = [asn('ASN-1', 200_000), asn('ASN-2', 50_000)];
    const receipts = [receipt('ASN-1', 200_000, 190_000), receipt('ASN-2', 50_000, 40_000)];
    // Excluding ASN-2 removes its 50,000 from shipped; its receipt must not
    // reopen the 10,000 it owes, or the exclusion would add it back.
    expect(openQty(asns, receipts, 'ASN-2')).toBe(10_000);
  });
});

describe('BL-325 · a non-numeric quantity can never turn the open quantity into NaN', () => {
  it('a non-numeric qtyReceived reads as 0: a finite open quantity, and the over-ship refusal fires', () => {
    const asns = [asn('ASN-1', 200_000)];
    const malformed = receipt('ASN-1', 200_000, 'oops');
    // Read as "nothing received": the whole 200,000 is still owed on this ASN.
    const open = openQty(asns, [malformed]);
    expect(Number.isFinite(open)).toBe(true);
    expect(open).toBe(200_000);
    // NaN made `q > NaN` false and disabled this refusal entirely.
    expect(
      asnLineRefusal({ materialCode: MAT, shippedQty: 200_001 }, PO_WITH_LINES, asns, {
        requireBatch: false,
        receipts: [malformed]
      })
    ).toBe('overOpen');
  });

  it('a MISSING qtyReceived reads as 0 on the same terms', () => {
    const asns = [asn('ASN-1', 200_000)];
    const malformed = receipt('ASN-1', 200_000, undefined);
    expect(openQty(asns, [malformed])).toBe(200_000);
  });

  it('the per-receipt read stays finite too (difference and reopened quantity)', () => {
    const gr = receipt('ASN-1', 1_000, 'oops');
    expect(Number.isFinite(reopenedQtyByMaterial(gr, null)[MAT])).toBe(true);
    expect(reopenedQtyByMaterial(gr, null)).toEqual({ [MAT]: 1_000 });
    // A valid number is untouched — the guard must not rewrite real data.
    expect(reopenedQtyByMaterial(receipt('ASN-1', 1_000, 960), null)).toEqual({ [MAT]: 40 });
  });
});
