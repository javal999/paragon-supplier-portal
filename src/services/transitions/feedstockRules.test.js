// ────────────────────────────────────────────────────────────────────────────
// BL-194 · the pure feedstock confirmation rules (DRC-8 BR-a, BR-b, BR-e).
// Every refusal code is fired once and a known-good entry passes, so the rule
// is probed both ways.
// ────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import {
  FEEDSTOCK_PROVISIONAL_QUESTIONS,
  FEEDSTOCK_REFUSALS,
  FEEDSTOCK_RULES,
  feedstockCycleStatus,
  feedstockEntryRefusal,
  feedstockRefusalOf,
  feedstockTarget,
  latestFeedstock
} from './feedstockRules';
import { updateCycleFor } from './updateCycle';
import { hubWorkingCalendar } from './workingCalendarStore';

const TODAY = '2026-10-15';
/** @param {Partial<import('./feedstockRules').FeedstockEntry>} over */
const entry = (over = {}) => ({
  assigned: true,
  feedstockQty: 120,
  confirmedOn: TODAY,
  today: TODAY,
  ...over
});

describe('[Default E1, E2] the rules block', () => {
  it('LT spare defaults to 0 and the cadence is the weekly stock cycle; the label names E1 and E2', () => {
    expect(FEEDSTOCK_RULES.ltSpareWeeks).toBe(0);
    expect(FEEDSTOCK_RULES.cadence).toBe('weeklyStockCycle');
    expect(Object.isFrozen(FEEDSTOCK_RULES)).toBe(true);
    expect([...FEEDSTOCK_PROVISIONAL_QUESTIONS]).toEqual(['E1', 'E2']);
  });
});

describe('DRC-8 BR-a · feedstockEntryRefusal', () => {
  it('a known-good entry passes, and 0 is allowed', () => {
    expect(feedstockEntryRefusal(entry())).toBeNull();
    expect(feedstockEntryRefusal(entry({ feedstockQty: 0 }))).toBeNull();
    expect(
      feedstockEntryRefusal(entry({ confirmedOn: '2026-10-01', note: 'drums at site' }))
    ).toBeNull();
  });

  it.each(
    /** @type {[string, Partial<import('./feedstockRules').FeedstockEntry>][]} */ ([
      ['NOT_ASSIGNED', { assigned: false }],
      ['QTY_INVALID', { feedstockQty: -1 }],
      ['QTY_INVALID', { feedstockQty: '12' }],
      ['QTY_INVALID', { feedstockQty: Number.NaN }],
      ['DATE_REQUIRED', { confirmedOn: '' }],
      ['DATE_REQUIRED', { confirmedOn: undefined }],
      ['DATE_INVALID', { confirmedOn: '15/10/2026' }],
      ['DATE_INVALID', { confirmedOn: '2026-02-30' }],
      ['DATE_IN_FUTURE', { confirmedOn: '2026-10-16' }],
      ['NOTE_INVALID', { note: 5 }],
      ['NOTE_TOO_LONG', { note: 'x'.repeat(FEEDSTOCK_RULES.noteMaxLength + 1) }]
    ])
  )('%s', (code, over) => {
    expect(feedstockEntryRefusal(entry(over))).toBe(code);
  });

  it('every code the rule can return is listed, and a dispatcher reason maps back to it', () => {
    expect(feedstockRefusalOf('POLICY_REJECTED:feedstock_confirmation_valid:DATE_IN_FUTURE')).toBe(
      'DATE_IN_FUTURE'
    );
    expect(feedstockRefusalOf('SCOPE_DENIED')).toBeNull();
    expect(feedstockRefusalOf(undefined)).toBeNull();
    expect(FEEDSTOCK_REFUSALS).toHaveLength(7);
  });
});

describe('DRC-8 BR-a · the latest record is in force', () => {
  it('the latest RECORDED wins, whatever its confirmation date; other pairs are ignored', () => {
    const rows = [
      {
        id: 'a',
        supplierId: 's1',
        materialCode: 'M',
        recordedAt: '2026-10-10T01:00:00.000Z',
        confirmedOn: '2026-10-10'
      },
      {
        id: 'b',
        supplierId: 's1',
        materialCode: 'M',
        recordedAt: '2026-10-12T01:00:00.000Z',
        confirmedOn: '2026-10-01'
      },
      {
        id: 'c',
        supplierId: 's2',
        materialCode: 'M',
        recordedAt: '2026-10-14T01:00:00.000Z',
        confirmedOn: '2026-10-14'
      }
    ];
    expect(latestFeedstock(rows, 's1', 'M')?.id).toBe('b');
    expect(latestFeedstock(rows, 's1', 'X')).toBeUndefined();
  });

  it('a tie on the recorded time resolves to the later-appended record', () => {
    const at = '2026-10-12T01:00:00.000Z';
    const rows = [
      { id: 'first', supplierId: 's1', materialCode: 'M', recordedAt: at },
      { id: 'second', supplierId: 's1', materialCode: 'M', recordedAt: at }
    ];
    expect(latestFeedstock(rows, 's1', 'M')?.id).toBe('second');
  });
});

describe('DRC-8 BR-b [Default E2] · due with the stock update cycle', () => {
  const calendar = hubWorkingCalendar();
  // Thursday 15:00 WIB cutoff, the MR-1 shape.
  const settings = { cutoffDay: 4, cutoffTime: 15 * 60 };
  const now = '2026-10-13T03:00:00.000Z'; // Tuesday

  it('a material confirmed inside the open cycle is confirmed; one never confirmed is due', () => {
    const cycle = updateCycleFor(now, calendar, settings);
    const inside = new Date(Date.parse(cycle.start) + 60_000).toISOString();
    const status = feedstockCycleStatus(
      's1',
      [
        { supplierId: 's1', materialCode: 'A', feedstockRecordedAt: inside },
        { supplierId: 's1', materialCode: 'B', feedstockRecordedAt: null },
        { supplierId: 's2', materialCode: 'C', feedstockRecordedAt: null }
      ],
      now,
      calendar,
      settings
    );
    expect(status.updated).toEqual(['A']);
    expect(status.missing).toEqual(['B']);
    expect(status.total).toBe(2);
    expect(status.cycle).toEqual(cycle);
  });

  it('a confirmation from before the open cycle leaves the material due, and missed last week', () => {
    const cycle = updateCycleFor(now, calendar, settings);
    const lastWeek = new Date(Date.parse(cycle.start) - 8 * 24 * 3_600_000).toISOString();
    const status = feedstockCycleStatus(
      's1',
      [{ supplierId: 's1', materialCode: 'A', feedstockRecordedAt: lastWeek }],
      now,
      calendar,
      settings
    );
    expect(status.missing).toEqual(['A']);
    expect(status.missed).toEqual(['A']);
  });
});

describe('DRC-8 BR-e [Default E1] · target feedstock = LT spare × weekly demand', () => {
  it('with LT spare 0 the target is 0, with or without a demand', () => {
    expect(feedstockTarget({ weeklyDemand: 700 })).toBe(0);
    expect(feedstockTarget({ weeklyDemand: null })).toBe(0);
  });

  it('with LT spare above 0 it is spare × demand, and null (not shown) when the demand is unknown', () => {
    const rules = { ...FEEDSTOCK_RULES, ltSpareWeeks: 2 };
    expect(feedstockTarget({ weeklyDemand: 700 }, rules)).toBe(1400);
    expect(feedstockTarget({ weeklyDemand: null }, rules)).toBeNull();
  });
});
