// PEX-D10 — the strategic buffer from LTP Festive − LTP A beside the DRC-9a figure.
import { describe, expect, it } from 'vitest';
import { strategicBufferRows } from './drcBufferRules';
import { festiveBufferByMonth, withFestiveBuffer } from './strategicBufferInputs';

describe('festiveBufferByMonth', () => {
  it('sums the weekly buffers by the month of each Monday; a week with no Festive quantity does not count', () => {
    const weeks = ['2027-02-01', '2027-02-08', '2027-02-15', '2027-03-01', '2027-03-08'];
    expect(festiveBufferByMonth(weeks, [10, 20, null, 30, 40])).toEqual({
      '2027-02': { buffer: 30, weeks: 2 },
      '2027-03': { buffer: 70, weeks: 2 }
    });
    expect(festiveBufferByMonth([], [])).toEqual({});
  });
});

describe('withFestiveBuffer', () => {
  // A supplier × material with a monthly LTP from 2026-11 to 2027-03: Ramadan 1448 (2027-02-08 to 2027-03-10).
  /** @type {[string, string, number][]} */
  const periods = [
    ['2026-11-01', '2026-11-30', 1000],
    ['2026-12-01', '2026-12-31', 1000],
    ['2027-01-01', '2027-01-31', 1000],
    ['2027-02-01', '2027-02-28', 1500],
    ['2027-03-01', '2027-03-31', 1200]
  ];
  const lines = periods.map(([periodStart, periodEnd, forecastQty]) => ({
    supplierId: 's1',
    materialCode: 'M1',
    periodStart,
    periodEnd,
    forecastQty
  }));
  const rows = strategicBufferRows(lines);
  const monthOf = (
    /** @type {ReturnType<typeof withFestiveBuffer>} */ out,
    /** @type {string} */ month
  ) =>
    /** @type {NonNullable<ReturnType<typeof withFestiveBuffer>[number]['windows'][number]['months'][number]>} */ (
      out[0].windows.flatMap((w) => w.months).find((m) => m.month === month)
    );

  it('without a Festive upload every month keeps LTP − baseline (DRC-9a), marked drc9a', () => {
    const out = withFestiveBuffer(rows, new Map());
    const feb = monthOf(out, '2027-02');
    expect(feb).toMatchObject({ buffer: 500, source: 'drc9a' });
    expect(feb.source).toBe('drc9a');
    expect(out[0].windows.flatMap((w) => w.months).every((m) => m.source === 'drc9a')).toBe(true);
  });

  it('with a Festive upload, the months it covers read Festive − A; the others keep DRC-9a', () => {
    const festive = new Map([['s1|M1', { '2027-02': { buffer: 30, weeks: 4 } }]]);
    const out = withFestiveBuffer(rows, festive);
    expect(monthOf(out, '2027-02')).toMatchObject({ buffer: 30, source: 'festive' });
    // March has no Festive week: the DRC-9a figure stays.
    expect(monthOf(out, '2027-03')).toMatchObject({ buffer: 200, source: 'drc9a' });
  });

  it('another supplier × material is untouched', () => {
    const festive = new Map([['s2|M9', { '2027-02': { buffer: 999, weeks: 4 } }]]);
    expect(monthOf(withFestiveBuffer(rows, festive), '2027-02')).toMatchObject({
      buffer: 500,
      source: 'drc9a'
    });
  });
});
