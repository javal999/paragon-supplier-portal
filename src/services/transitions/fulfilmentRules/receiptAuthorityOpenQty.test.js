// ─────────────────────────────────────────────────────────────────────────────
// BL-139 — THE RECEIPT IS THE AUTHORITY, AND THE GOODS ARE SUBTRACTED ONCE.
//
// Owner ruling, 2026-11-19: "a Delivered ASN with a covering receipt does not
// reduce the open quantity a second time". This file pins the arithmetic on
// both sides of the rule:
//
//   · a Delivered ASN a receipt covers is accounted by what the receipt says
//     ARRIVED (Σ received), never by that figure AND its shipped quantity;
//   · a Delivered ASN with no covering receipt keeps its shipped quantity;
//   · a non-Delivered ASN keeps the BL-325 arithmetic (the known-good control,
//     so a change here cannot quietly alter the other lane);
//   · a short receipt's missing quantity stays open EXACTLY once — through the
//     received figure, never again through the BL-325 reopen.
//
// The fixtures that exercise this in the product are BL-139's Delivered ASNs
// (`fixtures/receivedAsns.js`), pinned separately in
// `fixtures/receiptAsnCoherence.test.js`.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import { asnLineRefusal, openQtyForLine } from './index';
/** @import { ASN, POLineItem, PurchaseOrder } from '../../data/types' */
/** @import { GoodsReceipt } from '@data/mockGoodsReceipts' */

const MAT = 'PK-PETB-8801';
const PO_NUMBER = 'PO-2025-00107';
const COMMITTED = 200_000;

/** @type {Pick<PurchaseOrder, 'poNumber'>} */
const PO = { poNumber: PO_NUMBER };

/** @type {Pick<POLineItem, 'materialCode' | 'quantity' | 'confirmedQty'>} */
const LINE = { materialCode: MAT, quantity: COMMITTED, confirmedQty: COMMITTED };

/** The PO as the line-refusal rule reads it (it needs the full line shape). */
/** @type {Pick<PurchaseOrder, 'poNumber' | 'lineItems'>} */
const PO_WITH_LINES = {
  poNumber: PO_NUMBER,
  lineItems: [
    {
      id: 'li-139a',
      materialCode: MAT,
      description: 'PET bottle',
      quantity: COMMITTED,
      uom: 'PCS',
      unitPrice: 1_600,
      confirmedQty: COMMITTED
    }
  ]
};

/**
 * One ASN against the PO, shipping `shippedQty` of the material.
 * @param {number} shippedQty
 * @param {ASN['status']} [status]
 * @returns {ASN}
 */
const asn = (shippedQty, status = 'Delivered') => ({
  asnNumber: 'ASN-139-1',
  supplierId: 'sup-007',
  poReference: PO_NUMBER,
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
 * One receipt line against `asnNumber`, received `qtyReceived`.
 * @param {number} qtyReceived
 * @param {{ asnNumber?: string; poNumber?: string; materialCode?: string }} [opts]
 * @returns {Pick<GoodsReceipt, 'poNumber' | 'asnNumber' | 'inspectionResults' | 'status'>}
 */
const receipt = (qtyReceived, opts = {}) =>
  /** @type {Pick<GoodsReceipt, 'poNumber' | 'asnNumber' | 'inspectionResults' | 'status'>} */ ({
    poNumber: opts.poNumber ?? PO_NUMBER,
    asnNumber: opts.asnNumber ?? 'ASN-139-1',
    status: 'Approved',
    inspectionResults: [
      {
        materialCode: opts.materialCode ?? MAT,
        description: 'PET bottle',
        qtyExpected: qtyReceived,
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
 * @returns {number}
 */
const openQty = (asns, receipts) => openQtyForLine(PO, LINE, asns, undefined, receipts);

describe('BL-139 · a Delivered ASN with a covering receipt is subtracted ONCE', () => {
  it('the open quantity falls by what arrived — not by the shipment and the receipt both', () => {
    // 200,000 committed − 120,000 arrived = 80,000 open. Adding the ASN's
    // shipped 120,000 on top of the receipt would take it to −40,000 (clamped
    // to 0), which is the double count the ruling forbids.
    expect(openQty([asn(120_000)], [receipt(120_000)])).toBe(80_000);
  });

  it('the RECEIPT is the authority, not the ASN’s shipped figure', () => {
    // The ASN says 120,000 shipped; the receipt counted 110,000 off the truck.
    // The open quantity follows the receipt.
    expect(openQty([asn(120_000)], [receipt(110_000)])).toBe(90_000);
  });

  it('an over-delivery is credited in full, once', () => {
    expect(openQty([asn(120_000)], [receipt(120_500)])).toBe(79_500);
  });

  it('two receipts covering one Delivered ASN sum, and are applied once', () => {
    // 100,000 + 90,000 arrived on one 120,000 ASN → 10,000 open.
    expect(openQty([asn(120_000)], [receipt(100_000), receipt(90_000)])).toBe(10_000);
  });

  it('a Delivered ASN with NO covering receipt keeps its shipped quantity', () => {
    // Nothing arrived to measure, so the ASN still stands for its shipment.
    expect(openQty([asn(120_000)], [])).toBe(80_000);
  });

  it('a receipt on ANOTHER PO does not cover this ASN', () => {
    // Same ASN number, different PO: this PO's read must not apply it.
    expect(openQty([asn(120_000)], [receipt(120_000, { poNumber: 'PO-2025-99880' })])).toBe(80_000);
  });

  it('a covering receipt with no line for this material does not account for it', () => {
    expect(openQty([asn(120_000)], [receipt(120_000, { materialCode: 'PK-PETB-9999' })])).toBe(
      80_000
    );
  });
});

describe('BL-139 · a short receipt keeps the missing quantity open EXACTLY once', () => {
  it('committed 200,000, shipped 200,000, received 190,000 → 10,000 open, not 20,000', () => {
    // The receipt's 190,000 is what was subtracted; the 10,000 it fell short by
    // is already open through that figure. Reopening it as well (the BL-325
    // arithmetic for a non-Delivered ASN) would hand the supplier 20,000.
    const asns = [asn(COMMITTED, 'Delivered')];
    const receipts = [receipt(190_000)];
    expect(openQty(asns, receipts)).toBe(10_000);
    // …and exactly 10,000 more may ship: the reopened hole is not doubled.
    expect(
      asnLineRefusal({ materialCode: MAT, shippedQty: 10_000 }, PO_WITH_LINES, asns, {
        requireBatch: false,
        receipts
      })
    ).toBeNull();
    expect(
      asnLineRefusal({ materialCode: MAT, shippedQty: 20_000 }, PO_WITH_LINES, asns, {
        requireBatch: false,
        receipts
      })
    ).toBe('overOpen');
  });

  it('CONTROL — a NON-Delivered ASN keeps the BL-325 reopen arithmetic', () => {
    // The known-good half: the receipt-as-authority lane must not change the
    // ASN still in flight. 200,000 shipped, 190,000 received on a kept-open
    // receipt → 10,000 owed, exactly as BL-325 pins it.
    expect(openQty([asn(COMMITTED, 'In Transit')], [receipt(190_000)])).toBe(10_000);
  });

  it('CONTROL — a Delivered ASN with no receipt still behaves as before', () => {
    expect(openQty([asn(COMMITTED, 'Delivered')], [])).toBe(0);
  });
});
