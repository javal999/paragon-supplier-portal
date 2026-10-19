// ─────────────────────────────────────────────────────────────────────────────
// DRC-18 (BL-203) — LTP vs FG demand and the consumption moving average
// [Default A11]: the average over 13 weeks, fewer than 13 weeks of history
// (average what exists, and say how many), a later record replacing an
// earlier one, and the week fields added to the demand anticipation rows.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import { NO_PERSON } from '@context/noPerson';
import { addDays } from './inventoryRules';
import { LTP_FG_DEMAND_RULES, consumptionMovingAverage, withLtpFgDemand } from './ltpFgDemandRules';
/** @import { ConsumptionRecord } from './consumptionRules' */
/** @import { DemandAnticipationRow, DemandAnticipationWeekView } from './demandAnticipationRules' */

const MAT = 'RM-TEST-0001';
const NOW_WEEK = '2026-08-31'; // a Monday
const NOW = `${NOW_WEEK}T03:00:00.000Z`;

let seq = 0;
/**
 * @param {string} week
 * @param {number} qty
 * @param {string} [materialCode]
 * @returns {ConsumptionRecord}
 */
const rec = (week, qty, materialCode = MAT) => ({
  id: `con-${++seq}`,
  materialCode,
  week,
  qty,
  unit: 'KG',
  source: 'manual',
  recordedAt: NOW,
  actor: NO_PERSON
});

/** The 13 Mondays ending at NOW_WEEK, oldest first. */
const last13 = Array.from({ length: 13 }, (_, i) => addDays(NOW_WEEK, -7 * (12 - i)));

describe('[Default A11] the window', () => {
  it('is 13 weeks, in the one named key', () => {
    expect(LTP_FG_DEMAND_RULES).toEqual({ consumptionAverageWeeks: 13 });
    expect(Object.isFrozen(LTP_FG_DEMAND_RULES)).toBe(true);
  });
});

describe('consumptionMovingAverage', () => {
  it('averages the 13 weeks ending at the window end when all have a record', () => {
    const records = last13.map((w, i) => rec(w, (i + 1) * 10)); // 10 … 130
    const avg = consumptionMovingAverage(records, MAT, NOW_WEEK);
    expect(avg).toEqual({
      average: 70,
      weeksWithRecords: 13,
      windowWeeks: 13,
      windowEnd: NOW_WEEK,
      partial: false
    });
  });

  it('a week outside the window does not count (the 14th week back)', () => {
    const records = [...last13.map((w) => rec(w, 100)), rec(addDays(NOW_WEEK, -7 * 13), 9_999)];
    expect(consumptionMovingAverage(records, MAT, NOW_WEEK).average).toBe(100);
  });

  it('with fewer than 13 weeks of history, averages what exists and says how many', () => {
    const records = [rec(last13[12], 300), rec(last13[11], 100), rec(last13[3], 200)];
    expect(consumptionMovingAverage(records, MAT, NOW_WEEK)).toEqual({
      average: 200,
      weeksWithRecords: 3,
      windowWeeks: 13,
      windowEnd: NOW_WEEK,
      partial: true
    });
  });

  it('with no record, the average is null', () => {
    const avg = consumptionMovingAverage([rec(NOW_WEEK, 5, 'RM-OTHER')], MAT, NOW_WEEK);
    expect(avg.average).toBeNull();
    expect(avg.weeksWithRecords).toBe(0);
    expect(avg.partial).toBe(true);
  });

  it('a later record for the same week replaces the earlier one (CAP-11 in force)', () => {
    const records = [rec(NOW_WEEK, 100), rec(NOW_WEEK, 40)];
    expect(consumptionMovingAverage(records, MAT, NOW_WEEK)).toMatchObject({
      average: 40,
      weeksWithRecords: 1
    });
  });
});

describe('withLtpFgDemand', () => {
  /**
   * @param {string} week
   * @param {number | undefined} ltp
   * @returns {DemandAnticipationWeekView}
   */
  const wk = (week, ltp) => ({
    week,
    qty: ltp ?? null,
    frozen: false,
    published: null,
    wouldBe: ltp ?? null,
    delta: null,
    inputs: ltp === undefined ? null : { ltp, stockShare: null, ropShare: null },
    horizonStart: week,
    horizonFrozen: false,
    frozenBy: null,
    consumption: null,
    consumptionRecord: null,
    absorbed: null
  });
  const W2 = addDays(NOW_WEEK, 7);
  /** @param {number | null} share @returns {DemandAnticipationRow} */
  const row = (share) => ({
    supplierId: 'sup-x',
    materialCode: MAT,
    share,
    stockOnRecord: true,
    supplierName: 'X',
    materialLabel: 'Test',
    uom: 'KG',
    weeks: [wk(NOW_WEEK, 500), wk(W2, 300)]
  });
  const fg = new Map([[MAT, new Map([[NOW_WEEK, 800]])]]);
  const records = [rec(NOW_WEEK, 200), rec(last13[11], 100)];

  it('FG demand is the supplier share of the material gross requirement; LTP − FG demand beside it', () => {
    const [r] = withLtpFgDemand([row(0.5)], { fgDemand: fg, records, nowIso: NOW });
    expect(r.fgDemandAvailable).toBe(true);
    expect(r.weeks[0]).toMatchObject({
      fgDemand: 400,
      fgDemandMaterial: 800,
      ltpLessFgDemand: 100
    });
    // A week the engine holds no requirement for is a requirement of 0.
    expect(r.weeks[1]).toMatchObject({ fgDemand: 0, fgDemandMaterial: 0, ltpLessFgDemand: 300 });
  });

  it('the consumption average is the supplier share of the material average; a later week reads the window ending at the current week', () => {
    const [r] = withLtpFgDemand([row(0.5)], { fgDemand: fg, records, nowIso: NOW });
    expect(r.weeks[0].consumptionAverage).toBe(75); // (200 + 100) / 2 × 0.5
    expect(r.weeks[0].consumptionAverageBasis).toMatchObject({
      weeksWithRecords: 2,
      partial: true,
      windowEnd: NOW_WEEK
    });
    expect(r.weeks[1].consumptionAverageBasis.windowEnd).toBe(NOW_WEEK);
    expect(r.weeks[1].consumptionAverage).toBe(75);
  });

  it('no engine figures for the material: FG demand not available, nothing invented', () => {
    const [r] = withLtpFgDemand([row(0.5)], { fgDemand: new Map(), records, nowIso: NOW });
    expect(r.fgDemandAvailable).toBe(false);
    expect(r.weeks[0]).toMatchObject({ fgDemand: null, ltpLessFgDemand: null });
    const [n] = withLtpFgDemand([row(0.5)], { fgDemand: null, records, nowIso: NOW });
    expect(n.fgDemandAvailable).toBe(false);
  });

  it('a row with no share (only a frozen figure left) shows no split figure', () => {
    const [r] = withLtpFgDemand([row(null)], { fgDemand: fg, records, nowIso: NOW });
    expect(r.weeks[0]).toMatchObject({ fgDemand: null, consumptionAverage: null });
    expect(r.weeks[0].fgDemandMaterial).toBe(800);
  });

  it('leaves the demand anticipation fields untouched', () => {
    const input = row(0.5);
    const [r] = withLtpFgDemand([input], { fgDemand: fg, records, nowIso: NOW });
    r.weeks.forEach((w, i) => expect(w).toMatchObject(input.weeks[i]));
  });
});
