// ─────────────────────────────────────────────────────────────────────────────
// CR-12 invoice price tolerance — BL-44 (owner decision 2026-09-21).
//
// The rule has two arms and the arm is chosen PER LINE by whether the PO line's
// price comes from a contract:
//   • contract price → 0%: any difference is held;
//   • no contract    → matched within 2% AND within the rupiah cap (BL-54
//     placeholder), so BOTH limits are probed, in both directions.
//
// Every boundary is asserted on both sides — at the limit and one rupiah past
// it — because a tolerance tested on one side is a tolerance whose edge nobody
// knows.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import { checkPrice, deriveMatchVerdict } from './invoiceRollup';
import { checkInvoicePrices, deriveInvoiceVerdict, linePriceRule } from './fulfilmentRules';
import { invoicePriceTolerance } from './fulfilmentConfig';
import type { InvoiceLine } from '../data/types';

const CAP = invoicePriceTolerance().standardCapIdr;

/** A line of 100 units at Rp 10,000 — expected Rp 1,000,000, where 2% (20,000) is well under the cap. */
const smallLine = (over: Partial<InvoiceLine> = {}): InvoiceLine => ({
  receiptId: 'gr-test-1',
  grNumber: 'GR-TEST-1',
  materialCode: 'PK-TEST-0001',
  description: 'Test material',
  quantity: 100,
  uom: 'PCS',
  unitPrice: 10_000,
  ...over,
});

/** A line of 10,000 units at Rp 10,000 — expected Rp 100,000,000, where 2% (2,000,000) is over the cap. */
const bigLine = (over: Partial<InvoiceLine> = {}): InvoiceLine =>
  smallLine({ quantity: 10_000, receiptId: 'gr-test-2', grNumber: 'GR-TEST-2', ...over });

describe('CR-12 · which rule applies', () => {
  it('a line with a contract number is checked at 0%; one without is the 2%-and-cap rule', () => {
    expect(linePriceRule(smallLine({ contractNumber: 'CTR-2025-018' }))).toBe('contract');
    expect(linePriceRule(smallLine())).toBe('standard');
  });

  it('the placeholder cap is the BL-54 value and the percentages are the owner decision', () => {
    // The numbers live in ONE place; this pins what that place holds today, so
    // changing the cap (BL-54's one-line change) is a visible, deliberate act.
    // BL-32: the ONE place is now the registry `hubSettings.ts`, changed on the
    // admin page; with nothing changed, the value in force is the default.
    expect(invoicePriceTolerance()).toEqual({ contractPricePct: 0, standardPct: 2, standardCapIdr: 500_000 });
  });
});

describe('CR-12 · contract price — 0%, both sides of the only boundary there is', () => {
  it('exactly the expected value passes; one rupiah either way is held', () => {
    expect(checkPrice('contract', 1_000_000, 1_000_000)).toMatchObject({ outcome: 'exact', held: false });
    expect(checkPrice('contract', 1_000_000, 1_000_001)).toMatchObject({ outcome: 'contractDiffers', held: true });
    expect(checkPrice('contract', 1_000_000, 999_999)).toMatchObject({ outcome: 'contractDiffers', held: true });
  });

  it('a difference far below the 2% a contract-free line would get is still held', () => {
    const c = checkPrice('contract', 1_000_000, 1_000_100); // 0.01%, and under the cap
    expect(c.outcome).toBe('contractDiffers');
    expect(c.held).toBe(true);
  });
});

describe('CR-12 · no contract price — 2% AND the cap, both limits, both sides', () => {
  it('the percentage decides when 2% is under the cap', () => {
    expect(checkPrice('standard', 1_000_000, 1_020_000)).toMatchObject({ outcome: 'withinTolerance', held: false });
    expect(checkPrice('standard', 1_000_000, 1_020_001)).toMatchObject({ outcome: 'overPercent', held: true });
    expect(checkPrice('standard', 1_000_000, 980_000)).toMatchObject({ outcome: 'withinTolerance', held: false });
    expect(checkPrice('standard', 1_000_000, 979_999)).toMatchObject({ outcome: 'overPercent', held: true });
  });

  it('the cap decides when 2% is over it — within 2% is not enough on its own', () => {
    expect(checkPrice('standard', 100_000_000, 100_000_000 + CAP)).toMatchObject({
      outcome: 'withinTolerance',
      held: false,
    });
    const overCap = checkPrice('standard', 100_000_000, 100_000_000 + CAP + 1);
    expect(overCap).toMatchObject({ outcome: 'overCap', held: true });
    // It is held by the CAP, not by the percentage: 500,001 of 100,000,000 is 0.5%.
    expect(overCap.percent!).toBeLessThan(invoicePriceTolerance().standardPct);
    expect(checkPrice('standard', 100_000_000, 100_000_000 - CAP - 1)).toMatchObject({ outcome: 'overCap', held: true });
  });

  it('no expected value is no basis, and is held rather than quietly matched', () => {
    expect(checkPrice('standard', 0, 1_000)).toMatchObject({ outcome: 'noBasis', held: true, percent: null });
  });
});

describe('CR-12 · the verdict, per line and for a whole invoice', () => {
  it('a lineless invoice takes the rule the caller resolves from the order', () => {
    expect(deriveMatchVerdict(1_000_000, 1_020_000, false, 'standard')).toBe('Matched');
    expect(deriveMatchVerdict(1_000_000, 1_020_000, false, 'contract')).toBe('Price Variance');
    // CR-13 first, whatever the price says.
    expect(deriveMatchVerdict(1_000_000, 1_000_000, true, 'standard')).toBe('Qty Mismatch');
  });

  it('each line is checked under its own rule, and the outcome names the reason', () => {
    const contract = smallLine({ contractNumber: 'CTR-2025-018', billedAmount: 1_000_100 });
    const standard = bigLine({ billedAmount: 100_000_000 + 400_000 });
    const checked = checkInvoicePrices({ amount: 1_000_100 + 100_400_000, lines: [contract, standard] });
    expect(checked.lines.map((l) => [l.materialCode, l.rule, l.outcome])).toEqual([
      ['PK-TEST-0001', 'contract', 'contractDiffers'],
      ['PK-TEST-0001', 'standard', 'withinTolerance'],
    ]);
    expect(checked.unsplit).toBeNull();
    expect(checked.held).toBe(true);
  });

  it('a passing invoice states the passing reason on every line, and the verdict is Matched', () => {
    const contract = smallLine({ contractNumber: 'CTR-2025-018' }); // billed at the expected value
    const standard = bigLine({ billedAmount: 100_000_000 + CAP });
    const inv = { amount: 1_000_000 + 100_000_000 + CAP, lines: [contract, standard] };
    expect(checkInvoicePrices(inv).lines.map((l) => l.outcome)).toEqual(['exact', 'withinTolerance']);
    expect(checkInvoicePrices(inv).held).toBe(false);
    expect(deriveInvoiceVerdict(inv, [])).toBe('Matched');
  });

  it('a total the lines do not account for is checked on its own, under the strictest rule present', () => {
    const lines = [smallLine({ contractNumber: 'CTR-2025-018' }), bigLine()];
    const expectedTotal = 1_000_000 + 100_000_000;
    // One rupiah more than the lines bill: a contract price is present, so 0% applies.
    const withContract = checkInvoicePrices({ amount: expectedTotal + 1, lines });
    expect(withContract.unsplit).toMatchObject({ rule: 'contract', outcome: 'contractDiffers', held: true });
    // Without a contract line the same difference is inside 2% and inside the cap.
    const noContract = checkInvoicePrices({ amount: expectedTotal + 1, lines: [smallLine(), bigLine()] });
    expect(noContract.unsplit).toMatchObject({ rule: 'standard', outcome: 'withinTolerance', held: false });
    expect(noContract.held).toBe(false);
  });
});
