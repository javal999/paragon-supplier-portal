import { describe, it, expect } from 'vitest';
import { addDays } from './dates';
/** @import { DemandEvent } from './eventCalendar' */
import {
  RAMADAN_TABLE,
  calendarIndex,
  estimateEventFactors,
  estimateLead,
  ramadanTableCoversUntil,
  tagWeek
} from './eventCalendar';

// ─────────────────────────────────────────────────────────────────────────────
// REQ-E14-07 — PTI's demand events (owner, 2026-09-29): the calendar on known
// dates, and each factor estimated from a hand-built history.
// ─────────────────────────────────────────────────────────────────────────────

describe('the event calendar on known dates', () => {
  it('the week containing 9 Sep 2026 is a double-date week (9.9)', () => {
    expect(tagWeek('2026-09-07', 0).events).toEqual(['doubleDate']);
    expect(tagWeek('2026-09-07', 0).occurrence.doubleDate).toBe('2026-09');
  });

  it('the week containing 25 Dec 2026 is a Christmas week (it holds 21–24 Dec) and a payday week', () => {
    expect(tagWeek('2026-12-21', 0).events).toEqual(['payday', 'christmas']);
    expect(tagWeek('2026-12-07', 0).events).toEqual(['doubleDate', 'christmas']); // 11 and 12 Dec
    expect(tagWeek('2026-11-30', 0).events).not.toContain('christmas'); // ends 6 Dec
  });

  it('payday is the week holding the 25th to month-end; a mid-month week has no event', () => {
    expect(tagWeek('2026-09-21', 0).events).toEqual(['payday']); // 25–27 Sep
    expect(tagWeek('2026-09-28', 0).events).toEqual(['payday']); // 28–30 Sep
    expect(tagWeek('2026-09-14', 0).events).toEqual([]);
  });

  it('Ramadan 1448 (≈ 8 Feb to 9 Mar 2027) is inside the 26-week horizon from 31 Aug 2026; the lead weeks come before it', () => {
    const horizonEnd = addDays('2026-08-31', 25 * 7);
    expect(horizonEnd).toBe('2027-02-22');
    expect(tagWeek('2027-02-08', 3).events).toContain('ramadan');
    expect(tagWeek('2027-02-08', 3).occurrence.ramadan).toBe('H1448');
    expect(tagWeek('2027-03-08', 3).events).toContain('ramadan'); // holds 8–9 Mar
    expect(tagWeek('2027-03-15', 3).events).not.toContain('ramadan'); // after Lebaran
    const pre = ['2027-01-18', '2027-01-25', '2027-02-01'];
    for (const w of pre) expect(tagWeek(w, 3).events).toContain('preRamadan');
    expect(tagWeek('2027-01-11', 3).events).not.toContain('preRamadan');
    expect(tagWeek('2027-02-01', 0).events).not.toContain('preRamadan'); // lead 0: none
  });

  it('the Ramadan table is approximate and says how far it reaches', () => {
    expect(RAMADAN_TABLE.map((r) => r.hijriYear)).toEqual([1445, 1446, 1447, 1448, 1449]);
    expect(ramadanTableCoversUntil()).toBe('2028-02-25');
    expect(tagWeek('2028-01-24', 0).occurrence.ramadan).toBe('H1449'); // holds 28 Jan 2028
  });

  it('a horizon past the table is flagged; the table as it stood before 1449 H would have been passed by a horizon into March 2027', () => {
    expect(ramadanTableCoversUntil(RAMADAN_TABLE.slice(0, 4))).toBe('2027-03-09');
    expect(ramadanTableCoversUntil() > addDays('2026-08-31', 25 * 7)).toBe(true);
  });
});

// A two-year weekly history from 2 Sep 2024 (Ramadan 1446 and 1447, two Decembers).
const WEEKS = Array.from({ length: 104 }, (_, t) => addDays('2024-09-02', t * 7));
/** @param {Partial<Record<DemandEvent, number>>} uplift */
const series = (uplift, lead = 0) =>
  WEEKS.map((w) => tagWeek(w, lead).events.reduce((v, e) => v * (uplift[e] ?? 1), 1000));
/**
 * @param {ReturnType<typeof estimateEventFactors>} fs
 * @param {DemandEvent} e
 */
const factor = (fs, e) =>
  /** @type {import('./eventCalendar').EventFactor} */ (fs.find((f) => f.event === e));

describe('estimating an event factor from history', () => {
  it('recovers a known uplift: payday ×1.3 over 24 months → raw 1.3, applied 1 + 0.3 × 24/25 = 1.288', () => {
    const fs = estimateEventFactors(series({ payday: 1.3 }), WEEKS, 0);
    const p = factor(fs, 'payday');
    expect(p.raw).toBeCloseTo(1.3, 10);
    expect(p.occurrences).toBe(24);
    expect(p.factor).toBeCloseTo(1 + (0.3 * 24) / 25, 10);
    expect(p.status).toBe('effect');
    // Overlapping events are not double-counted: double-date stays at 1.
    expect(factor(fs, 'doubleDate').raw).toBeCloseTo(1, 10);
  });

  it('a history without the event gives ≈ 1, reported as no clear effect — never an invented uplift', () => {
    for (const f of estimateEventFactors(series({}), WEEKS, 0)) {
      expect(f.factor).toBeCloseTo(1, 10);
      // With a lead of 0 there is no pre-Ramadan week at all.
      expect(f.status).toBe(f.event === 'preRamadan' ? 'notEstimable' : 'noClearEffect');
    }
  });

  it('shrinks toward 1 with few occurrences: Christmas ×1.3 in two Decembers → 1 + 0.3 × 2/3 = 1.2', () => {
    const c = factor(estimateEventFactors(series({ christmas: 1.3 }), WEEKS, 0), 'christmas');
    expect(c.occurrences).toBe(2);
    expect(c.raw).toBeCloseTo(1.3, 10);
    expect(c.factor).toBeCloseTo(1.2, 10);
  });

  it('caps the factor at 1.5: Ramadan ×3 → shrunk 2.33, applied 1.5', () => {
    const r = factor(estimateEventFactors(series({ ramadan: 3 }), WEEKS, 0), 'ramadan');
    expect(r.raw).toBeCloseTo(3, 10);
    expect(r.factor).toBe(1.5);
    expect(r.capped).toBe(true);
  });

  it('an event not in the history is not estimable and gets 1', () => {
    const w = Array.from({ length: 30 }, (_, t) => addDays('2025-04-07', t * 7)); // April to October 2025
    const fs = estimateEventFactors(
      w.map(() => 1000),
      w,
      0
    );
    expect(factor(fs, 'christmas')).toMatchObject({
      factor: 1,
      raw: null,
      status: 'notEstimable',
      occurrences: 0
    });
    expect(factor(fs, 'ramadan').status).toBe('notEstimable');
  });

  it('estimates the pre-Ramadan lead from history: a two-week uplift before Ramadan → lead 2', () => {
    const y = series({ preRamadan: 1.4 }, 2);
    expect(estimateLead(y, WEEKS)).toBe(2);
    expect(estimateLead(series({}), WEEKS)).toBe(0);
  });

  it('the index of a week is the product of the factors of its events', () => {
    const fs = estimateEventFactors(series({ payday: 1.3, christmas: 1.3 }), WEEKS, 0);
    const i = calendarIndex('2026-12-21', fs, 0);
    expect(i).toBeCloseTo(factor(fs, 'payday').factor * factor(fs, 'christmas').factor, 12);
    expect(calendarIndex('2026-09-14', fs, 0)).toBe(1);
  });
});
