// ─────────────────────────────────────────────────────────────────────────────
// CR-25 goods receipt quantity tolerance — BL-45 (owner decision 2026-09-21).
//
//   • over-delivery: 0% — ANY quantity above what was shipped is flagged;
//   • shortfall above 2%: flagged, and the receipt stays open;
//   • shortfall at or below 2%: closes, not flagged.
//
// Each boundary is pinned on both sides, on a round quantity and on the
// 50,000-unit shipments the demo data uses, so "exactly 2%" is proven to be
// decided exactly rather than by a float that happens to round the right way.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import {
  compareReceipt,
  hasReceiptDiscrepancy,
  receiptKeptOpen,
  receiptQtyOutcome,
  reopenedQtyByMaterial
} from './fulfilmentRules';
import {
  RECEIPT_QTY_TOLERANCE_BY_MATERIAL,
  receiptQtyToleranceDefault,
  receiptQtyToleranceFor
} from './fulfilmentConfig';
/** @import { GoodsReceipt } from '@data/mockGoodsReceipts' */

const MAT = 'PK-PETB-8801';

/**
 * @param {number} qtyExpected
 * @param {number} qtyReceived
 */
const receipt = (qtyExpected, qtyReceived, qtyRejected = 0) =>
  /** @type {Pick<GoodsReceipt, 'inspectionResults' | 'status'>} */ ({
    status: 'Approved',
    inspectionResults: [
      {
        materialCode: MAT,
        description: 'PET bottle',
        qtyExpected,
        qtyReceived,
        qtyAccepted: qtyReceived - qtyRejected,
        qtyRejected,
        visualCheck: 'Pass',
        packagingCheck: 'Pass'
      }
    ]
  });

describe('CR-25 · the values', () => {
  it('0% over and 2% short by default, and no material overrides the default yet', () => {
    expect(receiptQtyToleranceDefault()).toEqual({ overPct: 0, shortPct: 2 }); // the defaults (BL-32: read in force)
    expect(Object.keys(RECEIPT_QTY_TOLERANCE_BY_MATERIAL)).toEqual([]);
    expect(receiptQtyToleranceFor(MAT)).toEqual(receiptQtyToleranceDefault());
  });
});

describe('CR-25 · over-delivery — any quantity above is flagged', () => {
  it('exact is not flagged; one unit over is', () => {
    expect(receiptQtyOutcome(MAT, 1_000, 1_000)).toBe('exact');
    expect(receiptQtyOutcome(MAT, 1_000, 1_001)).toBe('over');
    expect(receiptQtyOutcome(MAT, 120_000, 120_001)).toBe('over');
    expect(compareReceipt(receipt(1_000, 1_001))[0]).toMatchObject({
      difference: 1,
      flagged: true
    });
  });

  it('an over-delivery is flagged but does not keep the receipt open — nothing more is owed', () => {
    expect(hasReceiptDiscrepancy(receipt(1_000, 1_001))).toBe(true);
    expect(receiptKeptOpen(receipt(1_000, 1_001))).toBe(false);
  });
});

describe('CR-25 · shortfall — 2% closes, anything beyond is flagged and kept open', () => {
  it('exactly 2% short closes; one unit more is flagged (1,000 shipped)', () => {
    expect(receiptQtyOutcome(MAT, 1_000, 980)).toBe('shortWithin');
    expect(receiptQtyOutcome(MAT, 1_000, 979)).toBe('shortOver');
  });

  it('exactly 2% short closes; one unit more is flagged (50,000 shipped)', () => {
    expect(receiptQtyOutcome(MAT, 50_000, 49_000)).toBe('shortWithin');
    expect(receiptQtyOutcome(MAT, 50_000, 48_999)).toBe('shortOver');
  });

  it('within tolerance: not flagged, not open; beyond it: flagged and open', () => {
    expect(hasReceiptDiscrepancy(receipt(50_000, 49_000))).toBe(false);
    expect(receiptKeptOpen(receipt(50_000, 49_000))).toBe(false);
    expect(hasReceiptDiscrepancy(receipt(50_000, 48_999))).toBe(true);
    expect(receiptKeptOpen(receipt(50_000, 48_999))).toBe(true);
  });

  it('a shortfall within tolerance is still flagged when inspection rejected something (BR-05)', () => {
    const line = compareReceipt(receipt(50_000, 49_000, 10))[0];
    expect(line.qtyOutcome).toBe('shortWithin');
    expect(line.flagged).toBe(true);
  });

  it('the percentage is reported for the screens', () => {
    expect(compareReceipt(receipt(50_000, 49_000))[0].differencePct).toBe(2);
    expect(compareReceipt(receipt(0, 0))[0].differencePct).toBeNull();
  });
});

describe('GR-1 / BL-71 — the missing quantity a kept-open receipt reopens', () => {
  it('short beyond tolerance reopens the WHOLE missing quantity; within tolerance and over reopen nothing', () => {
    // 4% short (1,000 shipped, 960 received) → kept open, 40 missing.
    expect(receiptKeptOpen(receipt(1_000, 960))).toBe(true);
    expect(reopenedQtyByMaterial(receipt(1_000, 960))).toEqual({ [MAT]: 40 });
    // Exactly 2% short closes the receipt (CR-25): nothing is owed.
    expect(receiptKeptOpen(receipt(1_000, 980))).toBe(false);
    expect(reopenedQtyByMaterial(receipt(1_000, 980))).toEqual({});
    // An over-delivery is a decision, not a debt: nothing reopens.
    expect(reopenedQtyByMaterial(receipt(1_000, 1_001))).toEqual({});
  });

  it('compares against the ASN line when the ASN is on record, exactly as the kept-open label does', () => {
    const gr = { ...receipt(1_000, 960), poNumber: 'PO-T-1', asnNumber: 'ASN-T-1' };
    const asn = {
      lineItems: [
        {
          materialCode: MAT,
          description: 'PET bottle',
          orderedQty: 1_200,
          shippedQty: 1_200,
          lotNumber: 'B-1'
        }
      ]
    };
    // The ASN shipped 1,200; 960 arrived → 240 missing (the receipt's own
    // expected quantity of 1,000 is not what the label compares against).
    expect(reopenedQtyByMaterial(gr, asn)).toEqual({ [MAT]: 240 });
    // No ASN on record → the receipt's expected quantity is the comparison.
    expect(reopenedQtyByMaterial(gr, null)).toEqual({ [MAT]: 40 });
  });

  it('is derived from the quantities alone: a receipt still under inspection reopens on the same terms as its label', () => {
    const underInspection = {
      ...receipt(1_000, 960),
      status: /** @type {const} */ ('Under Inspection')
    };
    expect(receiptKeptOpen(underInspection)).toBe(true);
    expect(reopenedQtyByMaterial(underInspection)).toEqual({ [MAT]: 40 });
  });
});
