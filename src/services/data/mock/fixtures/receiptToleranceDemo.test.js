// ─────────────────────────────────────────────────────────────────────────────
// BL-45 demo data — one receipt per CR-25 case, pinned BY NAME.
//
// Each case is reached through the outcome the rule computes over the WHOLE
// receipt corpus, and must return the named members — so a receipt that drifts
// into a case (or out of one) turns this red, where a count would not notice a
// swap. All four demo receipts are sup-007's, so both personas see them.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import { mockGoodsReceipts } from '@data/mockGoodsReceipts';
import { MOCK_ASNS } from './supplierShipments';
/** @import { ReceiptQtyOutcome } from '../../../transitions/fulfilmentRules' */
import {
  compareReceipt,
  hasReceiptDiscrepancy,
  receiptKeptOpen
} from '../../../transitions/fulfilmentRules';

/** @param {string} asnNumber */
const asnFor = (asnNumber) => MOCK_ASNS.find((a) => a.asnNumber === asnNumber) ?? null;
/** @param {string} id */
const lines = (id) => {
  const gr = /** @type {import('@data/mockGoodsReceipts').GoodsReceipt} */ (
    mockGoodsReceipts.find((g) => g.id === id)
  );
  return compareReceipt(gr, asnFor(gr.asnNumber));
};
/** @param {ReceiptQtyOutcome} outcome */
const withOutcome = (outcome) =>
  mockGoodsReceipts
    .filter((gr) => compareReceipt(gr, asnFor(gr.asnNumber)).some((l) => l.qtyOutcome === outcome))
    .map((gr) => gr.id)
    .sort();

describe('BL-45 demo — every CR-25 case is present, by name', () => {
  it('exact: gr-002 received 120,000 of 120,000 and is not flagged', () => {
    expect(lines('gr-002')[0]).toMatchObject({
      shipped: 120_000,
      received: 120_000,
      qtyOutcome: 'exact',
      flagged: false
    });
    // exact is the common case, so the control is membership, not equality.
    expect(withOutcome('exact')).toContain('gr-002');
    expect(withOutcome('exact')).not.toContain('gr-003');
  });

  it('over by one unit: gr-003 is the only over-delivery, and it is flagged but not kept open', () => {
    expect(withOutcome('over')).toEqual(['gr-003']);
    expect(lines('gr-003')[0]).toMatchObject({ difference: 1, qtyOutcome: 'over', flagged: true });
    const gr = /** @type {import('@data/mockGoodsReceipts').GoodsReceipt} */ (
      mockGoodsReceipts.find((g) => g.id === 'gr-003')
    );
    expect(hasReceiptDiscrepancy(gr, asnFor(gr.asnNumber))).toBe(true);
    expect(receiptKeptOpen(gr, asnFor(gr.asnNumber))).toBe(false);
  });

  it('short by exactly 2%: gr-017 closes — not flagged, not open', () => {
    expect(withOutcome('shortWithin')).toEqual(['gr-017']);
    expect(lines('gr-017')[0]).toMatchObject({
      shipped: 40_000,
      received: 39_200,
      differencePct: 2,
      flagged: false
    });
    const gr = /** @type {import('@data/mockGoodsReceipts').GoodsReceipt} */ (
      mockGoodsReceipts.find((g) => g.id === 'gr-017')
    );
    expect(receiptKeptOpen(gr, asnFor(gr.asnNumber))).toBe(false);
  });

  it('short just over 2%: gr-015 (2.1%) is flagged and kept open; gr-016 (2.4%) is the other member', () => {
    expect(withOutcome('shortOver')).toEqual(['gr-015', 'gr-016']);
    expect(lines('gr-015')[0]).toMatchObject({
      shipped: 50_000,
      received: 48_950,
      qtyOutcome: 'shortOver',
      flagged: true
    });
    expect(
      /** @type {NonNullable<((ReturnType<typeof lines>)[number])['differencePct']>} */ (
        lines('gr-015')[0].differencePct
      )
    ).toBeCloseTo(2.1, 10);
    const open = mockGoodsReceipts
      .filter((gr) => receiptKeptOpen(gr, asnFor(gr.asnNumber)))
      .map((gr) => gr.id)
      .sort();
    expect(open).toEqual(['gr-015', 'gr-016']);
  });
});
