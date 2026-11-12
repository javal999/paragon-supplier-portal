import { describe, expect, it } from 'vitest';
import { applyAmounts, defaultLineAmount, lineKey } from './utils';

/** @param {string} m @param {number} quantity @param {number} unitPrice */
const line = (m, quantity, unitPrice) => ({
  receiptId: 'gr-1',
  grNumber: 'GR-1',
  materialCode: m,
  description: m,
  quantity,
  unitPrice
});

describe('applyAmounts (BL-75, Proposed)', () => {
  it('bills an untouched line at quantity × PO unit price and sums the lines to the total', () => {
    const lines = [line('A', 10, 1500), line('B', 3, 2500.5)];
    const out = applyAmounts(lines, {});
    expect(out.valid).toBe(true);
    expect(out.total).toBe(22501.5);
    expect(out.lines.map((l) => l.billedAmount)).toEqual([15000, 7501.5]);
  });

  it('a typed amount replaces the default for that line only', () => {
    const lines = [line('A', 10, 1500), line('B', 3, 2500)];
    const out = applyAmounts(lines, { [lineKey(lines[0])]: '16000' });
    expect(out.lines.map((l) => l.billedAmount)).toEqual([16000, 7500]);
    expect(out.total).toBe(23500);
  });

  it('refuses a blank, an ambiguous token and a zero, naming no total from them', () => {
    const lines = [line('A', 10, 1500)];
    const k = lineKey(lines[0]);
    expect(applyAmounts(lines, { [k]: '' }).valid).toBe(false);
    expect(applyAmounts(lines, { [k]: '1.500' }).valid).toBe(false);
    expect(applyAmounts(lines, { [k]: '0' }).valid).toBe(false);
  });

  it('is not valid with no lines, or with an unreadable quantity', () => {
    expect(applyAmounts([], {}).valid).toBe(false);
    expect(applyAmounts([line('A', NaN, 1500)], {}).valid).toBe(false);
    expect(Number.isNaN(defaultLineAmount({ quantity: NaN, unitPrice: 1 }))).toBe(true);
  });
});
