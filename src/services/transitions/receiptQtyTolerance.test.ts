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
} from './fulfilmentRules';
import {
  RECEIPT_QTY_TOLERANCE_BY_MATERIAL,
  receiptQtyToleranceDefault,
  receiptQtyToleranceFor,
} from './fulfilmentConfig';
import type { GoodsReceipt } from '../../data/mockGoodsReceipts';

const MAT = 'PK-PETB-8801';

const receipt = (qtyExpected: number, qtyReceived: number, qtyRejected = 0) =>
  ({
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
        packagingCheck: 'Pass',
      },
    ],
  }) as Pick<GoodsReceipt, 'inspectionResults' | 'status'>;

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
    expect(compareReceipt(receipt(1_000, 1_001))[0]).toMatchObject({ difference: 1, flagged: true });
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
