import { describe, expect, it } from 'vitest';
import {
  combineWeeks,
  groupWeeksByMonth,
  isoWeeksInMonth,
  monthOfWeek,
  weekHeaderDate
} from './weekMonths';

// CAP-2 (BL-171), SC-HUB-CAPACITY-REQUIREMENTS-2026-10 §3 — weeks into months.

describe('monthOfWeek — BR-02, the month of the Thursday (ISO 8601)', () => {
  it('AC-01 — the week of Mon 28 Sep 2026 (3 days in Sep, 4 in Oct) counts in October', () => {
    expect(monthOfWeek('2026-09-28')).toBe('2026-10');
  });

  it('AC-01 — the week of Mon 31 Aug 2026 (1 day in Aug, 6 in Sep) counts in September', () => {
    expect(monthOfWeek('2026-08-31')).toBe('2026-09');
  });

  it('a week split 4–3 stays in the earlier month (Mon 26 Oct 2026: Thursday 29 Oct)', () => {
    expect(monthOfWeek('2026-10-26')).toBe('2026-10');
  });

  it('year boundary: Mon 28 Dec 2026 (Thursday 31 Dec) counts in December 2026', () => {
    expect(monthOfWeek('2026-12-28')).toBe('2026-12');
  });

  it('year boundary: Mon 29 Dec 2025 (Thursday 1 Jan 2026) counts in January 2026', () => {
    expect(monthOfWeek('2025-12-29')).toBe('2026-01');
  });

  it('any day of the week names the same month as its Monday', () => {
    for (const d of ['2026-09-28', '2026-09-30', '2026-10-01', '2026-10-04'])
      expect(monthOfWeek(d)).toBe('2026-10');
  });
});

describe('isoWeeksInMonth — the number of Thursdays', () => {
  it.each([
    ['2026-09', 4],
    ['2026-10', 5],
    ['2026-11', 4],
    ['2026-12', 5],
    ['2026-01', 5],
    ['2026-02', 4]
  ])('%s holds %i ISO weeks', (month, n) => {
    expect(isoWeeksInMonth(month)).toBe(n);
  });
});

describe('groupWeeksByMonth — BR-04 / BR-06', () => {
  /** @param {string} from @param {number} n */
  const mondays = (from, n) =>
    Array.from({ length: n }, (_, i) =>
      new Date(Date.parse(`${from}T00:00:00Z`) + i * 7 * 86_400_000).toISOString().slice(0, 10)
    );

  it('13 weeks from Mon 31 Aug 2026 are Sep (4), Oct (5), Nov (4), none partial', () => {
    const months = groupWeeksByMonth(mondays('2026-08-31', 13));
    expect(months.map((m) => [m.key, m.weeks.length, m.partial])).toEqual([
      ['2026-09', 4, false],
      ['2026-10', 5, false],
      ['2026-11', 4, false]
    ]);
    const oct = months[1];
    expect(oct.firstMonday).toBe('2026-09-28');
    expect(oct.lastMonday).toBe('2026-10-26');
    expect(oct.indexes).toEqual([4, 5, 6, 7, 8]);
  });

  it('a horizon that starts or ends inside a month marks those months partial', () => {
    // Mon 14 Sep 2026 … 6 weeks: Sep holds 14 and 21 (2 of 4); Oct holds all 4 shown of 5.
    const months = groupWeeksByMonth(mondays('2026-09-14', 6));
    expect(months.map((m) => [m.key, m.weeks.length, m.isoWeeks, m.partial])).toEqual([
      ['2026-09', 2, 4, true],
      ['2026-10', 4, 5, true]
    ]);
  });

  it('weeks across the year boundary keep their ISO months', () => {
    const months = groupWeeksByMonth(['2026-12-21', '2026-12-28', '2027-01-04']);
    expect(months.map((m) => [m.key, m.weeks])).toEqual([
      ['2026-12', ['2026-12-21', '2026-12-28']],
      ['2027-01', ['2027-01-04']]
    ]);
  });

  it('no weeks, no months', () => {
    expect(groupWeeksByMonth([])).toEqual([]);
  });
});

describe('combineWeeks — BR-03', () => {
  it('sum and min read the weeks that have a number; none gives null', () => {
    expect(combineWeeks('sum', [1, null, 2, undefined, 3])).toBe(6);
    expect(combineWeeks('sum', [null, null])).toBeNull();
    expect(combineWeeks('min', [4, null, 2, 9])).toBe(2);
    expect(combineWeeks('min', [])).toBeNull();
  });

  it('first and last are the end weeks, whatever they hold', () => {
    expect(combineWeeks('first', [7, 8, 9])).toBe(7);
    expect(combineWeeks('last', [7, 8, null])).toBeNull();
    expect(combineWeeks('last', [7, 8, 9])).toBe(9);
  });

  it('status is the worst week by severity, with how many weeks hold it', () => {
    /** @param {string} s */
    const sev = (s) => ({ within: 0, unconfirmed: 1, needsAdditional: 2, cannotSupply: 3 })[s] ?? 0;
    expect(
      combineWeeks('status', ['within', 'cannotSupply', 'unconfirmed', 'within', 'within'], sev)
    ).toEqual({ worst: 'cannotSupply', count: 1, of: 5 });
    expect(combineWeeks('status', ['within', 'within'], sev)).toEqual({
      worst: 'within',
      count: 2,
      of: 2
    });
    expect(combineWeeks('status', [null, null], sev)).toEqual({ worst: null, count: 0, of: 2 });
  });

  it('distinct keeps every distinct non-empty value, in order, from values or lists', () => {
    expect(combineWeeks('distinct', [['Payday'], [], ['Payday', 'Ramadan'], null])).toEqual([
      'Payday',
      'Ramadan'
    ]);
    expect(combineWeeks('distinct', ['Material', null, 'Labour', 'Material', ''])).toEqual([
      'Material',
      'Labour'
    ]);
  });
});

describe('weekHeaderDate — BL-186, the week header’s short date (G-03)', () => {
  const firsts = Array.from({ length: 12 }, (_, i) => `2026-${String(i + 1).padStart(2, '0')}-07`);

  it('EN: day and a 3-letter month for every month — "07 Sep", never "Sept"', () => {
    expect(firsts.map((d) => weekHeaderDate(d, 'en'))).toEqual(
      ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(
        (m) => `07 ${m}`
      )
    );
    // Known-good control against the portal formatter's en-GB form.
    expect(weekHeaderDate('2026-09-07')).toBe('07 Sep');
    expect(weekHeaderDate('2026-08-31T00:00:00Z', 'en-GB')).toBe('31 Aug');
  });

  it('ID: Indonesian months (Mei, Agu, Okt, Des), the date read as written', () => {
    expect(firsts.map((d) => weekHeaderDate(d, 'id'))).toEqual(
      ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'].map(
        (m) => `07 ${m}`
      )
    );
    expect(weekHeaderDate('2026-12-28', 'id-ID')).toBe('28 Des');
  });
});
