// BL-283 (PEX-1 BR-02 / BR-03, PEX-D22) — the read-only capacity left of a
// Zone Capacity period: confirmed capacity − (Zone Liability quantity + other
// open commitments), month entries spread to days by WORKING days.
import { describe, expect, it } from 'vitest';
import { DEFAULT_WORKING_CALENDAR } from '../../lib/workingCalendar';
import {
  capacityLeftOf,
  confirmedCapacityOfPeriod,
  usedInPeriod,
  workingDaysIn
} from './zoneCapacityLeftRules';

const cal = { ...DEFAULT_WORKING_CALENDAR, holidays: new Set(/** @type {string[]} */ ([])) };

/** @param {Record<string, unknown>} over */
const line = (over) =>
  /** @type {any} */ ({
    materialCode: 'M1',
    periodBucket: '2027-06-07',
    periodStart: '2027-06-07',
    periodEnd: '2027-06-13',
    zone: 'forecast',
    forecastQty: 1000,
    committedQty: null,
    uom: 'KG',
    ...over
  });

const plan = /** @type {any} */ ({
  supplierId: 's1',
  planningGroupId: 'pg-A',
  materials: ['M1', 'M2'],
  uom: 'KG',
  weeks: [
    { week: '2026-11-09', demand: 0, entry: { week: '2026-11-09', allocated: 500 } },
    { week: '2026-11-16', demand: 0, entry: null }
  ]
});
const headsUp = /** @type {any} */ ([
  {
    planningGroupId: 'pg-A',
    months: [{ month: '2027-06', source: 'monthly', capacity: 2200, be: 2200, demand: 0 }]
  }
]);

describe('confirmed capacity of a period', () => {
  it('a weekly period reads the weekly confirmation as it is', () => {
    expect(
      confirmedCapacityOfPeriod({
        plan,
        headsUp: null,
        periodStart: '2026-11-09',
        periodEnd: '2026-11-15',
        cal
      })
    ).toBe(500);
  });

  it('a week with no confirmation is not confirmed (null, never 0)', () => {
    expect(
      confirmedCapacityOfPeriod({
        plan,
        headsUp: null,
        periodStart: '2026-11-16',
        periodEnd: '2026-11-22',
        cal
      })
    ).toBeNull();
  });

  it('a whole month reads the monthly entry; a week inside it takes its working-day share', () => {
    const month = { plan, headsUp: headsUp[0], cal };
    expect(
      confirmedCapacityOfPeriod({ ...month, periodStart: '2027-06-01', periodEnd: '2027-06-30' })
    ).toBe(2200);
    // June 2027 has 22 working days; 7–13 June has 5.
    expect(workingDaysIn('2027-06-01', '2027-06-30', cal)).toHaveLength(22);
    expect(
      confirmedCapacityOfPeriod({ ...month, periodStart: '2027-06-07', periodEnd: '2027-06-13' })
    ).toBe(500);
  });

  it('a hub-calendar holiday changes the spread (the hub calendar, not calendar days)', () => {
    const holiday = { ...cal, holidays: new Set(['2027-06-09']) };
    // 21 working days in the month, 4 in the week: 2200 × 4 / 21.
    expect(
      confirmedCapacityOfPeriod({
        plan,
        headsUp: headsUp[0],
        periodStart: '2027-06-07',
        periodEnd: '2027-06-13',
        cal: holiday
      })
    ).toBe(Math.round((2200 * 4) / 21));
  });

  it('a month with no monthly entry is not confirmed', () => {
    expect(
      confirmedCapacityOfPeriod({
        plan,
        headsUp: headsUp[0],
        periodStart: '2027-07-01',
        periodEnd: '2027-07-31',
        cal
      })
    ).toBeNull();
  });
});

describe('what the period already takes', () => {
  it('counts a Zone Liability line at PTI demand and any other line at what was committed', () => {
    const lines = [
      line({ materialCode: 'M1', zone: 'forecast', committedQty: null }),
      line({ materialCode: 'M2', zone: 'firm', forecastQty: 120 }),
      line({
        materialCode: 'M2',
        zone: 'tradeOff',
        forecastQty: 90,
        committedQty: 40,
        periodBucket: 'x'
      }),
      line({ materialCode: 'M9', zone: 'firm', forecastQty: 999 })
    ];
    expect(usedInPeriod(lines, ['M1', 'M2'], '2027-06-07')).toBe(120);
    expect(usedInPeriod(lines, ['M1', 'M2'], 'x')).toBe(40);
  });
});

describe('capacity left of a line', () => {
  const master = () => /** @type {any} */ ({ materialGroup: 'A', planningGroupId: 'pg-A' });
  const ctx = (/** @type {any[]} */ lines, /** @type {any[]} */ plans = [plan]) => ({
    lines,
    plans,
    headsUp,
    supplierId: 's1',
    master,
    cal
  });

  it('is confirmed capacity − liabilities − other open commitments', () => {
    const l = line({});
    const other = line({ materialCode: 'M2', zone: 'firm', forecastQty: 120 });
    expect(capacityLeftOf(l, ctx([l, other]))).toEqual({ confirmed: 500, used: 120, left: 380 });
  });

  it('can go below zero when the period is over-committed', () => {
    const l = line({});
    const other = line({ materialCode: 'M2', zone: 'firm', forecastQty: 800 });
    expect(capacityLeftOf(l, ctx([l, other])).left).toBe(-300);
  });

  it('is null, not a number, with no plan or no confirmed capacity', () => {
    const l = line({});
    expect(capacityLeftOf(l, ctx([l], [])).left).toBeNull();
    const later = line({
      periodStart: '2027-07-01',
      periodEnd: '2027-07-31',
      periodBucket: '2027-07'
    });
    expect(capacityLeftOf(later, ctx([later])).left).toBeNull();
  });
});
