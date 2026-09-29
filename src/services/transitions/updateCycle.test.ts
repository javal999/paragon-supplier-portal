import { describe, expect, it } from 'vitest';
import { DEFAULT_WORKING_CALENDAR, withDayRulings } from '../../lib/workingCalendar';
import { cycleStatus, staleAtFor, updateCycleFor, type StaleAtInputs, type UpdateCycleSettings } from './updateCycle';
import { stockFreshness } from './inventoryRules';

// Material B1 — MR-1 BR-03 to BR-05, edge cases 1 to 5, AC-02 to AC-05.
// 2026-09-03 and 2026-09-10 are Thursdays; 23:59 WIB is 16:59 UTC.

const CAL = DEFAULT_WORKING_CALENDAR;
const THURSDAY_2359: UpdateCycleSettings = { cutoffDay: 4, cutoffTime: 1439 };
const cycleOf = (iso: string, settings = THURSDAY_2359, cal = CAL) => updateCycleFor(iso, cal, settings);

describe('updateCycleFor — MR-1 BR-03: (previous cutoff, Thursday 23:59 WIB]', () => {
  it('a Tuesday falls in the cycle that closes on Thursday 23:59 WIB', () => {
    expect(cycleOf('2026-09-01T03:00:00.000Z')).toEqual({
      start: '2026-08-27T16:59:00.000Z',
      cutoff: '2026-09-03T16:59:00.000Z',
    });
  });

  it('the cutoff instant itself belongs to the closing cycle; a second later is the next one', () => {
    expect(cycleOf('2026-09-03T16:59:00.000Z').cutoff).toBe('2026-09-03T16:59:00.000Z');
    expect(cycleOf('2026-09-03T16:59:01.000Z')).toEqual({
      start: '2026-09-03T16:59:00.000Z',
      cutoff: '2026-09-10T16:59:00.000Z',
    });
  });

  it('edge case 4 · an upload at Thursday 23:59:30 WIB counts in the next cycle', () => {
    const upload = '2026-09-03T16:59:30.000Z';
    expect(cycleOf(upload).cutoff).toBe('2026-09-10T16:59:00.000Z');
    const records = [{ supplierId: 'sup-x', materialCode: 'M1', declaredAt: upload, channel: 'template' as const }];
    const assigned = [{ supplierId: 'sup-x', materialCode: 'M1' }];
    expect(cycleStatus('sup-x', cycleOf('2026-09-01T03:00:00.000Z'), records, assigned)).toEqual([
      { materialCode: 'M1', status: 'missing' },
    ]);
    expect(cycleStatus('sup-x', cycleOf(upload), records, assigned)).toEqual([{ materialCode: 'M1', status: 'updated' }]);
  });

  it('AC-05 / edge case 5 · a Thursday holiday moves the cutoff to Wednesday 23:59 WIB', () => {
    const holiday = withDayRulings(CAL, [{ date: '2026-09-03', kind: 'non-working' }]);
    expect(cycleOf('2026-09-01T03:00:00.000Z', THURSDAY_2359, holiday).cutoff).toBe('2026-09-02T16:59:00.000Z');
    // Thursday morning is then already in the next cycle.
    expect(cycleOf('2026-09-03T02:00:00.000Z', THURSDAY_2359, holiday)).toEqual({
      start: '2026-09-02T16:59:00.000Z',
      cutoff: '2026-09-10T16:59:00.000Z',
    });
    // Known-good: the same week on the plain calendar keeps Thursday.
    expect(cycleOf('2026-09-01T03:00:00.000Z').cutoff).toBe('2026-09-03T16:59:00.000Z');
  });

  it('the cutoff day and time are the settings in force, not constants', () => {
    expect(cycleOf('2026-09-01T03:00:00.000Z', { cutoffDay: 5, cutoffTime: 1020 }).cutoff).toBe('2026-09-04T10:00:00.000Z');
  });
});

describe('cycleStatus — MR-1 BR-04, edge case 2', () => {
  const cycle = cycleOf('2026-09-01T03:00:00.000Z');
  const assigned = [
    { supplierId: 'sup-x', materialCode: 'M1' },
    { supplierId: 'sup-x', materialCode: 'M2' },
    { supplierId: 'sup-y', materialCode: 'M1' },
  ];

  it('AC-04 · a record entered by PTI counts as updated; a material with no record is missing', () => {
    const records = [{ supplierId: 'sup-x', materialCode: 'M1', declaredAt: '2026-09-02T04:00:00.000Z', channel: 'pti' as const }];
    expect(cycleStatus('sup-x', cycle, records, assigned)).toEqual([
      { materialCode: 'M1', status: 'updated' },
      { materialCode: 'M2', status: 'missing' },
    ]);
  });

  it('a record from before the cycle, or for another supplier, does not count', () => {
    const records = [
      { supplierId: 'sup-x', materialCode: 'M1', declaredAt: '2026-08-27T16:59:00.000Z', channel: 'manual' as const },
      { supplierId: 'sup-y', materialCode: 'M2', declaredAt: '2026-09-02T04:00:00.000Z', channel: 'api' as const },
    ];
    expect(cycleStatus('sup-x', cycle, records, assigned).map((r) => r.status)).toEqual(['missing', 'missing']);
  });

  it('edge case 2 · a material assigned during the cycle is not counted; one assigned before it is', () => {
    const withDates = [
      { supplierId: 'sup-x', materialCode: 'M1', assignedAt: '2026-08-01T00:00:00.000Z' },
      { supplierId: 'sup-x', materialCode: 'M2', assignedAt: '2026-09-01T00:00:00.000Z' },
      { supplierId: 'sup-x', materialCode: 'M3', assignedAt: '2026-09-05T00:00:00.000Z' },
    ];
    expect(cycleStatus('sup-x', cycle, [], withDates)).toEqual([
      { materialCode: 'M1', status: 'missing' },
      { materialCode: 'M2', status: 'notCounted' },
    ]);
  });
});

describe('staleness by mode — MR-1 BR-05 through stockFreshness (AR-07)', () => {
  const base: StaleAtInputs = {
    lastUpdatedAt: '2026-08-26T03:00:00.000Z',
    mode: 'manual',
    lastSuccessfulPullAt: null,
    overrideDays: null,
    calendar: CAL,
    cycle: THURSDAY_2359,
    apiHours: 24,
  };
  const freshness = (inputs: StaleAtInputs, now: string, lastSync: Parameters<typeof stockFreshness>[0]['lastSync'] = null) =>
    stockFreshness({ lastUpdatedAt: inputs.lastUpdatedAt, updateSla: 7, lastSync, staleAt: staleAtFor(inputs) }, now);

  it('AC-02 · manual: updated in the cycle to 27 Aug, current through the next cutoff, stale the moment it passes', () => {
    expect(staleAtFor(base)).toBe('2026-09-03T16:59:00.000Z');
    expect(freshness(base, '2026-09-03T16:59:00.000Z')).toBe('current');
    expect(freshness(base, '2026-09-03T16:59:00.001Z')).toBe('stale');
  });

  it('AC-02 · manual: a Thursday holiday brings the stale moment forward with the cutoff', () => {
    const holiday = withDayRulings(CAL, [{ date: '2026-09-03', kind: 'non-working' }]);
    expect(staleAtFor({ ...base, calendar: holiday })).toBe('2026-09-02T16:59:00.000Z');
  });

  it('AC-03 · API: stale 24 h after the last successful pull', () => {
    const api = { ...base, mode: 'api' as const, lastUpdatedAt: '2026-09-01T02:00:00.000Z', lastSuccessfulPullAt: '2026-09-01T02:00:00.000Z' };
    expect(freshness(api, '2026-09-02T02:00:00.000Z')).toBe('current');
    expect(freshness(api, '2026-09-02T02:00:00.001Z')).toBe('stale');
  });

  it('AC-03 / edge case 3 · API with failed pulls only: a failed pull is not an update, stale after 24 h', () => {
    // The figure was entered by PTI at 02:00 while every pull failed before it.
    const failedEarlier = { id: 's1', supplierId: 'sup-x', at: '2026-09-01T01:00:00.000Z', outcome: 'failed' as const, errorKey: 'timeout' };
    const api = { ...base, mode: 'api' as const, lastUpdatedAt: '2026-09-01T02:00:00.000Z', lastSuccessfulPullAt: null };
    expect(freshness(api, '2026-09-02T01:00:00.000Z', failedEarlier)).toBe('current');
    expect(freshness(api, '2026-09-02T03:00:00.000Z', failedEarlier)).toBe('stale');
    // Owner ruling 2026-09-29: a failed pull AFTER the figure does not make it stale either.
    const failedAfter = { ...failedEarlier, at: '2026-09-01T04:00:00.000Z' };
    expect(freshness(api, '2026-09-01T05:00:00.000Z', failedAfter)).toBe('current');
    expect(freshness(api, '2026-09-02T02:00:00.001Z', failedAfter)).toBe('stale');
  });

  it('the API threshold is the setting in force (stale.apiHours)', () => {
    const api = { ...base, mode: 'api' as const, lastUpdatedAt: '2026-09-01T02:00:00.000Z', lastSuccessfulPullAt: '2026-09-01T02:00:00.000Z' };
    expect(freshness({ ...api, apiHours: 48 }, '2026-09-02T03:00:00.000Z')).toBe('current');
  });

  it('a per-supplier × material override (BL-32) wins over both modes, as days from the last update', () => {
    const manual1 = { ...base, overrideDays: 1 };
    expect(staleAtFor(manual1)).toBe('2026-08-27T03:00:00.000Z');
    expect(freshness(manual1, '2026-08-27T03:00:00.001Z')).toBe('stale');
    const api3 = { ...base, mode: 'api' as const, lastSuccessfulPullAt: '2026-08-26T03:00:00.000Z', overrideDays: 3 };
    expect(freshness(api3, '2026-08-28T03:00:00.000Z')).toBe('current');
    expect(freshness(api3, '2026-08-29T03:00:00.001Z')).toBe('stale');
  });

  it('no figure is missing, never stale', () => {
    expect(staleAtFor({ ...base, lastUpdatedAt: null })).toBeNull();
    expect(freshness({ ...base, lastUpdatedAt: null }, '2026-12-01T00:00:00.000Z')).toBe('missing');
  });
});
