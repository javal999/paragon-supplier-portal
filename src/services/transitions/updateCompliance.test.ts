import { describe, expect, it } from 'vitest';
import { DEFAULT_WORKING_CALENDAR } from '../../lib/workingCalendar';
import type { StockUpdateMode } from '../data/types';
import {
  COMPLIANCE_WINDOW_WEEKS,
  complianceOver,
  cycleWorkingDays,
  type ComplianceSources,
  type ComplianceSyncAttempt,
} from './updateCompliance';
import { updateCycleFor, type CycleAssignment, type CycleStockRecord, type UpdateCycleSettings } from './updateCycle';

// Material B3 — MR-2 BR-01 to BR-03, edge cases 1 to 3, AC-01 and AC-02.
// The measure is taken on Friday 11 Sep 2026, so the last completed cycle
// closes on Thursday 10 Sep 23:59 WIB (16:59 UTC) and the window is the 13
// cycles closing 18 Jun to 10 Sep. Tuesday 25 Aug is a holiday on the default
// calendar.

const CAL = DEFAULT_WORKING_CALENDAR;
const CYCLE: UpdateCycleSettings = { cutoffDay: 4, cutoffTime: 1439 };
const AS_OF = '2026-09-11T03:00:00.000Z';
const SUP = 'sup-x';
const DAY_MS = 86_400_000;

/** The 13 cutoffs of the window, oldest first. */
const CUTOFFS = Array.from({ length: 13 }, (_, i) =>
  new Date(Date.parse('2026-09-10T16:59:00.000Z') - (12 - i) * 7 * DAY_MS).toISOString(),
);
/** Tuesday 10:00 WIB of the week whose cycle closes at `cutoff`. */
const tuesdayOf = (cutoff: string) => new Date(Date.parse(cutoff) - 2 * DAY_MS - 13 * 3_600_000).toISOString();

const weeklyRecords = (materials: readonly string[], skip: (cutoff: string, m: string) => boolean = () => false) =>
  CUTOFFS.flatMap((c) =>
    materials
      .filter((m) => !skip(c, m))
      .map((m): CycleStockRecord => ({ supplierId: SUP, materialCode: m, declaredAt: tuesdayOf(c), channel: 'template' })),
  );

/** A successful pull at 10:00 WIB on every working day of every cycle in the window. */
const dailyPulls = (skip: (day: string) => boolean = () => false): ComplianceSyncAttempt[] =>
  CUTOFFS.flatMap((c) =>
    cycleWorkingDays(updateCycleFor(c, CAL, CYCLE), CAL).map(
      (d): ComplianceSyncAttempt => ({
        supplierId: SUP,
        at: `${d}T03:00:00.000Z`,
        outcome: skip(d) ? 'failed' : 'success',
      }),
    ),
  );

const sources = (over: Partial<ComplianceSources> = {}): ComplianceSources => ({
  records: [],
  syncAttempts: [],
  assignments: [
    { supplierId: SUP, materialCode: 'M1' },
    { supplierId: SUP, materialCode: 'M2' },
  ],
  onboardedAt: () => '2024-01-10',
  modeAt: () => 'manual',
  calendar: CAL,
  cycle: CYCLE,
  ...over,
});


describe('updateCompliance — the window (MR-2 BR-01)', () => {
  it('13 cycles, oldest first, ending with the last completed cycle', () => {
    const r = complianceOver(sources(), SUP, AS_OF);
    expect(COMPLIANCE_WINDOW_WEEKS).toBe(13);
    expect(r.weeks.map((w) => w.cycle.cutoff)).toEqual(CUTOFFS);
    // The cycle still running on Friday 11 Sep is not judged.
    expect(r.weeks.some((w) => w.cycle.cutoff === '2026-09-17T16:59:00.000Z')).toBe(false);
  });

  it('every material updated every week reads 100%', () => {
    const r = complianceOver(sources({ records: weeklyRecords(['M1', 'M2']) }), SUP, AS_OF);
    expect(r.pct).toBe(100);
    expect(r.weeks.every((w) => w.state === 'compliant')).toBe(true);
  });
});

describe('updateCompliance — a manual week (MR-2 BR-02, MAT-D7)', () => {
  it('AC-01 · one material missing in a cycle makes that week red, and only that week', () => {
    const missed = '2026-09-03T16:59:00.000Z';
    const s = sources({ records: weeklyRecords(['M1', 'M2'], (c, m) => c === missed && m === 'M2') });
    const r = complianceOver(s, SUP, AS_OF);
    expect(r.weeks.find((w) => w.cycle.cutoff === missed)?.state).toBe('missed');
    expect(r.weeks.filter((w) => w.state === 'missed')).toHaveLength(1);
    expect(r.pct).toBe(Math.round((12 / 13) * 100));
  });

  it('a record accepted after the cutoff counts in the next cycle, not the one it was late for', () => {
    const late = '2026-09-03T16:59:30.000Z';
    const records = [
      ...weeklyRecords(['M1', 'M2'], (c, m) => c === '2026-09-03T16:59:00.000Z' && m === 'M2'),
      { supplierId: SUP, materialCode: 'M2', declaredAt: late, channel: 'manual' as const },
    ];
    const byCutoff = new Map(complianceOver(sources({ records }), SUP, AS_OF).weeks.map((w) => [w.cycle.cutoff, w.state]));
    expect(byCutoff.get('2026-09-03T16:59:00.000Z')).toBe('missed');
    expect(byCutoff.get('2026-09-10T16:59:00.000Z')).toBe('compliant');
  });

  it('edge case 3 · a material assigned during a cycle is left out of that cycle, counted from the next', () => {
    const assignments: CycleAssignment[] = [
      { supplierId: SUP, materialCode: 'M1' },
      { supplierId: SUP, materialCode: 'M2', assignedAt: '2026-09-01T03:00:00.000Z' },
    ];
    // M2 is never updated.
    const s = sources({ assignments, records: weeklyRecords(['M1']) });
    const byCutoff = new Map(complianceOver(s, SUP, AS_OF).weeks.map((w) => [w.cycle.cutoff, w.state]));
    expect(byCutoff.get('2026-09-03T16:59:00.000Z')).toBe('compliant');
    expect(byCutoff.get('2026-09-10T16:59:00.000Z')).toBe('missed');
  });
});

describe('updateCompliance — an API week (MR-2 BR-02; a failed pull is not an update)', () => {
  const api = { modeAt: (): StockUpdateMode => 'api' };

  it('a successful pull on every working day is compliant — the 25 Aug holiday needs none', () => {
    const r = complianceOver(sources({ ...api, syncAttempts: dailyPulls() }), SUP, AS_OF);
    expect(r.pct).toBe(100);
    const aug27 = updateCycleFor('2026-08-27T16:59:00.000Z', CAL, CYCLE);
    expect(cycleWorkingDays(aug27, CAL)).toEqual(['2026-08-21', '2026-08-24', '2026-08-26', '2026-08-27']);
  });

  it('one working day with only a failed pull makes the week missed', () => {
    const s = sources({ ...api, syncAttempts: dailyPulls((d) => d === '2026-09-09') });
    const byCutoff = new Map(complianceOver(s, SUP, AS_OF).weeks.map((w) => [w.cycle.cutoff, w.state]));
    expect(byCutoff.get('2026-09-10T16:59:00.000Z')).toBe('missed');
    expect(byCutoff.get('2026-09-03T16:59:00.000Z')).toBe('compliant');
    expect(complianceOver(s, SUP, AS_OF).pct).toBe(Math.round((12 / 13) * 100));
  });

  it('one working day with no pull at all makes the week missed; stock records do not stand in for pulls', () => {
    const syncAttempts = dailyPulls().filter((a) => !a.at.startsWith('2026-09-09'));
    const s = sources({ ...api, syncAttempts, records: weeklyRecords(['M1', 'M2']) });
    const weeks = complianceOver(s, SUP, AS_OF).weeks;
    expect(weeks[weeks.length - 1].state).toBe('missed');
  });
});

describe('updateCompliance — a mode change (MR-2 edge case 2)', () => {
  it('each week is judged by the mode at its cutoff', () => {
    const switchedAt = '2026-08-31T03:00:00.000Z';
    const modeAt = (_: string, at: string): StockUpdateMode => (Date.parse(at) >= Date.parse(switchedAt) ? 'api' : 'manual');
    // Weekly uploads all along, but no pull: the two API weeks fail.
    const r = complianceOver(sources({ modeAt, records: weeklyRecords(['M1', 'M2']) }), SUP, AS_OF);
    expect(r.weeks.slice(-2).map((w) => [w.mode, w.state])).toEqual([
      ['api', 'missed'],
      ['api', 'missed'],
    ]);
    expect(r.weeks.slice(0, -2).every((w) => w.mode === 'manual' && w.state === 'compliant')).toBe(true);
    expect(r.pct).toBe(Math.round((11 / 13) * 100));
  });
});

describe('updateCompliance — grace and "No history" (MR-2 BR-03, edge case 1)', () => {
  const records = weeklyRecords(['M1', 'M2']);

  it('AC-02 · a supplier onboarded 3 weeks ago reads "No history"', () => {
    const r = complianceOver(sources({ records, onboardedAt: () => '2026-08-21' }), SUP, AS_OF);
    expect(r.pct).toBeNull();
    expect(r.weeks.every((w) => w.state === 'notCounted')).toBe(true);
  });

  it('the first 4 cycles after the first assignment are not counted; 3 counted weeks is still "No history", 4 is a figure', () => {
    // Onboarded Thursday 30 Jul: grace cycles close 30 Jul, 6, 13 and 20 Aug.
    const three = complianceOver(sources({ records, onboardedAt: () => '2026-07-30' }), SUP, AS_OF);
    expect(three.weeks.filter((w) => w.state !== 'notCounted').map((w) => w.cycle.cutoff)).toEqual([
      '2026-08-27T16:59:00.000Z',
      '2026-09-03T16:59:00.000Z',
      '2026-09-10T16:59:00.000Z',
    ]);
    expect(three.pct).toBeNull();
    const four = complianceOver(sources({ records, onboardedAt: () => '2026-07-23' }), SUP, AS_OF);
    expect(four.weeks.filter((w) => w.state !== 'notCounted')).toHaveLength(4);
    expect(four.pct).toBe(100);
  });

  it('a dated assignment is the first assignment, whatever the onboarding date', () => {
    const assignments: CycleAssignment[] = [{ supplierId: SUP, materialCode: 'M1', assignedAt: '2026-08-19T03:00:00.000Z' }];
    const r = complianceOver(sources({ assignments, records: weeklyRecords(['M1']) }), SUP, AS_OF);
    expect(r.pct).toBeNull();
  });

  it('edge case 1 · a supplier with no materials assigned reads "No history"', () => {
    const r = complianceOver(sources({ assignments: [] }), SUP, AS_OF);
    expect(r.pct).toBeNull();
    expect(r.weeks).toHaveLength(13);
    expect(r.weeks.every((w) => w.state === 'notCounted')).toBe(true);
  });
});
