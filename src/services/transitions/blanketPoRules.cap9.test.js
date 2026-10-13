// ─────────────────────────────────────────────────────────────────────────────
// CAP-9 (BL-178) — blanket PO run-out and "new PO needed by", the pure rules
// (SC-HUB-CAPACITY-REQUIREMENTS-2026-10 §7, BR-01 to BR-06, AC-01; CAP-D8).
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import { FORECAST_HORIZON_WEEKS } from '../engine/demandForecast';
import { POStatus } from '../data/types';
import { addDays } from './inventoryRules';
import {
  BLANKET_PO_ALERT_WEEKS,
  BLANKET_PO_FALLBACK_LEAD_WEEKS,
  BLANKET_PO_HORIZON_WEEKS,
  blanketPoAlertSubjects,
  blanketPoRunOuts,
  isNewPoDue,
  oldestFirst,
  poLeadTimeWeeks,
  projectGroup,
  projectRunOut,
  projectionWeeks,
  runningOut
} from './blanketPoRules';
/** @import { BlanketPoInputs, BlanketPoRunOut, GroupLine, RunOutProjection } from './blanketPoRules' */
/** @import { PurchaseOrder } from '../data/types' */

const NOW = '2026-08-31T12:00:00.000Z'; // a Monday
const WEEKS = projectionWeeks(NOW);

/**
 * A quantity line with `remaining` left, an LTP of `ltp` every week.
 * @param {number} remaining
 * @param {number} ltp
 * @param {number | null} leadTimeDays
 */
const qtyLine = (remaining, ltp, leadTimeDays) =>
  projectRunOut({
    remaining: { basis: 'quantity', remainingQty: remaining, remainingValue: remaining * 1600 },
    unitPrice: 1600,
    weeks: WEEKS,
    ltpPerWeek: WEEKS.map(() => ltp),
    leadTimeDays
  });

describe('CAP-9 AC-01 — 200,000 pcs remaining against LTP 72,800/wk', () => {
  it('runs out in week 3; with a 2-week lead time a new PO is needed by week 1', () => {
    const p = qtyLine(200_000, 72_800, 14);
    expect(p.basis).toBe('quantity');
    expect(p.weeks.slice(0, 3).map((w) => w.balance)).toEqual([127_200, 54_400, -18_400]);
    expect(p.runOut).toEqual({ index: 3, week: '2026-09-14' });
    expect(p.leadTime).toEqual({ weeks: 2, onRecord: true });
    expect(p.newPoBy).toEqual({ index: 1, week: '2026-08-31' });
  });
});

describe('CAP-9 BR-01 / BR-03 — the projection and the two weeks', () => {
  it('starts at the current hub week and runs the forecast horizon, whose value is 26', () => {
    expect(BLANKET_PO_HORIZON_WEEKS).toBe(FORECAST_HORIZON_WEEKS);
    expect(BLANKET_PO_HORIZON_WEEKS).toBe(26);
    expect(WEEKS).toHaveLength(26);
    expect(WEEKS[0]).toBe('2026-08-31');
    // Mid-week: still the Monday of the current week.
    expect(projectionWeeks('2026-09-03T08:00:00.000Z')[0]).toBe('2026-08-31');
  });

  it('a balance of exactly zero has not run out; the first week BELOW zero has', () => {
    const p = qtyLine(100, 50, 7);
    expect(p.weeks.slice(0, 3).map((w) => w.balance)).toEqual([50, 0, -50]);
    expect(p.runOut?.index).toBe(3);
  });

  it('lead time in whole weeks, rounded up: 15 days is 3 weeks', () => {
    expect(poLeadTimeWeeks(15)).toEqual({ weeks: 3, onRecord: true });
    expect(poLeadTimeWeeks(21)).toEqual({ weeks: 3, onRecord: true });
    expect(qtyLine(200_000, 72_800, 15).newPoBy).toEqual({ index: 0, week: '2026-08-24' });
  });

  it('a needed-by week before the current week is reported as passed (index below 1)', () => {
    const p = qtyLine(10_000, 72_800, 21);
    expect(p.runOut?.index).toBe(1);
    expect(p.newPoBy).toEqual({ index: -2, week: '2026-08-10' });
  });
});

describe('CAP-9 BR-02 — a value-only line draws LTP × the unit price', () => {
  it('500 M IDR at 2.2 M/kg against 100 kg/wk: runs out in week 3', () => {
    const p = projectRunOut({
      remaining: { basis: 'value', remainingQty: null, remainingValue: 500_000_000 },
      unitPrice: 2_200_000,
      weeks: WEEKS,
      ltpPerWeek: WEEKS.map(() => 100),
      leadTimeDays: 30
    });
    expect(p.basis).toBe('value');
    expect(p.start).toBe(500_000_000);
    expect(p.weeks[0]).toEqual({
      week: '2026-08-31',
      ltp: 100,
      draw: 220_000_000,
      balance: 280_000_000
    });
    expect(p.weeks.slice(0, 3).map((w) => w.balance)).toEqual([
      280_000_000, 60_000_000, -160_000_000
    ]);
    expect(p.runOut?.index).toBe(3);
    // 30 days → 5 weeks: needed two weeks before the current one.
    expect(p.newPoBy?.index).toBe(-2);
  });
});

describe('CAP-9 BR-03 [CAP-D8] — no lead time on record: 2 weeks', () => {
  it.each([[null], [undefined], [0], [Number.NaN]])('lead time %s → the 2-week default', (lt) => {
    expect(poLeadTimeWeeks(lt)).toEqual({ weeks: BLANKET_PO_FALLBACK_LEAD_WEEKS, onRecord: false });
    expect(BLANKET_PO_FALLBACK_LEAD_WEEKS).toBe(2);
    const p = qtyLine(200_000, 72_800, lt ?? null);
    expect(p.newPoBy?.index).toBe(1);
    expect(p.leadTime.onRecord).toBe(false);
  });
});

describe('CAP-9 BR-06 — never below zero: it covers the horizon', () => {
  it('no run-out and no needed-by week; it still has an LTP', () => {
    const p = qtyLine(1_000_000, 30_000, 14);
    expect(p.weeks[p.weeks.length - 1]?.balance).toBe(1_000_000 - 26 * 30_000);
    expect(p.runOut).toBeNull();
    expect(p.newPoBy).toBeNull();
    expect(p.hasLtp).toBe(true);
    expect(p.horizonWeeks).toBe(26);
    expect(isNewPoDue(p)).toBe(false);
  });

  it('no LTP in any week: covers the horizon, and says nothing draws it down', () => {
    const p = qtyLine(5_000, 0, 14);
    expect(p.runOut).toBeNull();
    expect(p.hasLtp).toBe(false);
  });
});

describe('CAP-9 BR-05 — the alert: "new PO needed by" within 4 weeks', () => {
  /** @param {number} index */
  const at = (index) => ({ newPoBy: { index, week: '' } });

  it('weeks 1 to 4 (from the current week) and any passed week are due; week 5 is not', () => {
    expect(BLANKET_PO_ALERT_WEEKS).toBe(4);
    expect([-3, 0, 1, 2, 3, 4].map((i) => isNewPoDue(at(i)))).toEqual(Array(6).fill(true));
    expect([5, 6, 26].map((i) => isNewPoDue(at(i)))).toEqual([false, false, false]);
    expect(isNewPoDue({ newPoBy: null })).toBe(false);
  });

  it('raises one subject per blanket PO within the window, and none beyond it', () => {
    // Remaining 7 weeks of LTP: run-out week 8; lead 2 → needed by week 6 (not due).
    // Remaining 5 weeks of LTP: run-out week 6; lead 2 → needed by week 4 (due).
    const rows = [
      row('po-a', 'PO-A', 'li-a', qtyLine(7 * 1000, 1000, 14)),
      row('po-b', 'PO-B', 'li-b', qtyLine(5 * 1000, 1000, 14)),
      row('po-c', 'PO-C', 'li-c', qtyLine(500, 1000, 14))
    ];
    expect(rows.map((r) => r.projection.newPoBy?.index)).toEqual([6, 4, -1]);
    const subjects = blanketPoAlertSubjects(rows, NOW);
    expect(subjects.map((s) => s.poId)).toEqual(['po-c', 'po-b']);
    expect(subjects.map((s) => s.riskClass)).toEqual(['high', 'medium']);
    // Impact: days to the needed-by Monday, 0 once passed.
    expect(subjects.map((s) => s.daysToImpact)).toEqual([0, 21]);
    expect(subjects[1]?.label).toBe('PO-B · PK-1 Bottle');
  });
});

/**
 * @param {string} poId
 * @param {string} poNumber
 * @param {string} lineId
 * @param {RunOutProjection} projection
 * @returns {BlanketPoRunOut}
 */
function row(poId, poNumber, lineId, projection) {
  return {
    poId,
    poNumber,
    orderDate: '2026-01-01',
    supplierId: 'sup-x',
    supplierName: 'Sample',
    lineId,
    materialCode: 'PK-1',
    description: 'Bottle',
    uom: 'PCS',
    nextInLine: null,
    projection
  };
}

describe('CAP-9 BR-04 — "Blanket POs running out", soonest "new PO needed by" first', () => {
  it('sorts by needed-by, then run-out week, then PO number; a line that covers is left out', () => {
    const rows = [
      row('po-1', 'PO-1', 'l1', qtyLine(9_000, 1000, 7)), // run-out 10, by 9
      row('po-2', 'PO-2', 'l2', qtyLine(3_000, 1000, 21)), // run-out 4, by 1
      row('po-3', 'PO-3', 'l3', qtyLine(1_000_000, 1000, 7)), // covers
      row('po-5', 'PO-5', 'l5', qtyLine(4_000, 1000, 28)), // run-out 5, by 1
      row('po-4', 'PO-4', 'l4', qtyLine(4_000, 1000, 28)) // run-out 5, by 1 — PO-4 before PO-5
    ];
    expect(runningOut(rows).map((g) => g.last.poNumber)).toEqual(['PO-2', 'PO-4', 'PO-5', 'PO-1']);
  });
});

describe('CAP-9 — the read: blanket PO lines, LTP and lead time, on the hub clock', () => {
  /** @type {BlanketPoInputs['pos']} */
  const pos = [
    /** @type {PurchaseOrder} */ ({
      id: 'po-x',
      poNumber: 'PO-X',
      orderDate: '2026-03-01',
      supplierId: 'sup-x',
      supplierName: 'Sample',
      status: POStatus.CONFIRMED,
      lineItems: [
        {
          id: 'li-x',
          materialCode: 'PK-1',
          description: 'Bottle',
          quantity: 200_000,
          uom: 'PCS',
          unitPrice: 1600,
          confirmedQty: 200_000
        }
      ]
    }),
    // Not open for call-offs: never projected.
    /** @type {PurchaseOrder} */ ({
      id: 'po-y',
      poNumber: 'PO-Y',
      orderDate: '2026-02-01',
      supplierId: 'sup-x',
      supplierName: 'Sample',
      status: POStatus.DELIVERED,
      lineItems: [
        {
          id: 'li-y',
          materialCode: 'PK-1',
          description: 'Bottle',
          quantity: 1,
          uom: 'PCS',
          unitPrice: 1,
          confirmedQty: 1
        }
      ]
    })
  ];
  /** @type {BlanketPoInputs} */
  const input = {
    pos,
    callOffs: [],
    // 72,800 a week: one weekly LTP line per week for 26 weeks from 2026-08-31,
    // for sup-x × PK-1, and another supplier's line that must not count.
    ltpLines: [
      ...WEEKS.map((w) => ({
        supplierId: 'sup-x',
        materialCode: 'PK-1',
        periodStart: w,
        periodEnd: addDays(w, 6),
        forecastQty: 72_800
      })),
      {
        supplierId: 'sup-z',
        materialCode: 'PK-1',
        periodStart: '2026-08-31',
        periodEnd: '2026-09-06',
        forecastQty: 1e9
      }
    ],
    leadTimeDays: () => null
  };

  it('AC-01 through the read: run-out week 3, new PO needed by week 1 (2-week default)', () => {
    const rows = blanketPoRunOuts(input, NOW);
    expect(rows.map((r) => r.lineId)).toEqual(['li-x']);
    const p = /** @type {BlanketPoRunOut} */ (rows[0]).projection;
    expect(p.weeks[0]?.ltp).toBe(72_800);
    expect(p.runOut).toEqual({ index: 3, week: '2026-09-14' });
    expect(p.newPoBy).toEqual({ index: 1, week: '2026-08-31' });
    expect(p.leadTime.onRecord).toBe(false);
  });

  it('the projection moves when the hub clock moves: a week later it starts a week later', () => {
    const later = blanketPoRunOuts(input, '2026-09-07T12:00:00.000Z');
    const p = /** @type {BlanketPoRunOut} */ (later[0]).projection;
    expect(p.weeks[0]?.week).toBe('2026-09-07');
    // Nothing was called off, so the same remaining meets the LTP a week later.
    expect(p.runOut).toEqual({ index: 3, week: '2026-09-21' });
    expect(p.newPoBy).toEqual({ index: 1, week: '2026-09-07' });
  });
});

// ── Owner ruling 2026-10-13 — one supplier × material: one after another, oldest first ──

/**
 * @param {number} remainingQty
 * @returns {GroupLine}
 */
const qtyOf = (remainingQty) => ({
  remaining: { basis: 'quantity', remainingQty, remainingValue: remainingQty * 1600 },
  unitPrice: 1600
});

describe('CAP-9 groups — several blanket POs for one supplier × material draw down oldest first', () => {
  it('sup-007 × PK-PETB-8801 shape: 15,000 → 37,000 → 70,000 at 34,300/wk, lead 14 days', () => {
    const [p007, p024, p027] = projectGroup({
      lines: [qtyOf(15_000), qtyOf(37_000), qtyOf(70_000)],
      weeks: WEEKS,
      ltpPerWeek: WEEKS.map(() => 34_300),
      leadTimeDays: 14
    }).map((p) => /** @type {RunOutProjection} */ (p));
    // Week 1 uses up po-007 (15,000) and 19,300 of po-024.
    expect(p007?.weeks[0]).toMatchObject({ draw: 15_000, balance: 0 });
    expect(p024?.weeks[0]).toMatchObject({ draw: 19_300, balance: 17_700 });
    expect(p027?.weeks[0]).toMatchObject({ draw: 0, balance: 70_000 });
    // Week 2 uses up po-024 and 16,600 of po-027.
    expect(p024?.weeks[1]).toMatchObject({ draw: 17_700, balance: 0 });
    expect(p027?.weeks[1]).toMatchObject({ draw: 16_600, balance: 53_400 });
    expect([p007?.runOut?.index, p024?.runOut?.index, p027?.runOut?.index]).toEqual([1, 2, 4]);
    // Only the last line needs a new PO: week 4 − 2 weeks = week 2.
    expect([p007?.newPoBy, p024?.newPoBy]).toEqual([null, null]);
    expect(p027?.newPoBy).toEqual({ index: 2, week: '2026-09-07' });
    expect([p007?.lastInLine, p024?.lastInLine, p027?.lastInLine]).toEqual([false, false, true]);
  });

  it('spill-over: what the older line cannot give in a week comes from the next line that week', () => {
    const [a, b] = projectGroup({
      lines: [qtyOf(10_000), qtyOf(5_000)],
      weeks: WEEKS,
      ltpPerWeek: WEEKS.map(() => 12_000),
      leadTimeDays: 14
    });
    expect(a?.weeks[0]).toMatchObject({ ltp: 12_000, draw: 10_000, balance: 0 });
    expect(b?.weeks[0]).toMatchObject({ ltp: 12_000, draw: 2_000, balance: 3_000 });
    expect(b?.weeks[1]).toMatchObject({ draw: 12_000, balance: -9_000 });
    expect([a?.runOut?.index, b?.runOut?.index]).toEqual([1, 2]);
    expect(b?.newPoBy?.index).toBe(0);
    // An older line used up EXACTLY in a week has not run out until demand spills past it.
    const [c] = projectGroup({
      lines: [qtyOf(12_000), qtyOf(5_000)],
      weeks: WEEKS,
      ltpPerWeek: WEEKS.map(() => 12_000),
      leadTimeDays: 14
    });
    expect(c?.weeks[0]?.balance).toBe(0);
    expect(c?.runOut?.index).toBe(2);
  });

  it('a value-only line in a group holds remaining value ÷ its unit price, and shows IDR', () => {
    const [kg, value] = projectGroup({
      lines: [
        qtyOf(1_000),
        {
          remaining: { basis: 'value', remainingQty: null, remainingValue: 2_200_000_000 },
          unitPrice: 2_200_000
        }
      ],
      weeks: WEEKS,
      ltpPerWeek: WEEKS.map(() => 600),
      leadTimeDays: 7
    });
    // Week 2: the kg line gives its last 400 and is used up; the value line gives 200 kg.
    expect(kg?.weeks[1]).toMatchObject({ draw: 400, balance: 0 });
    expect(kg?.runOut?.index).toBe(2);
    expect(value?.weeks[1]).toMatchObject({ draw: 440_000_000, balance: 1_760_000_000 });
    // 1,000 kg + 1,000 kg against 600 kg/wk: the group runs out in week 4.
    expect(value?.runOut?.index).toBe(4);
    expect(value?.newPoBy?.index).toBe(3);
  });
});

describe('CAP-9 groups — the read: oldest PO first by order date, one alert per group', () => {
  /**
   * @param {string} id
   * @param {string} poNumber
   * @param {string} orderDate
   * @param {number} quantity
   * @returns {PurchaseOrder}
   */
  const po = (id, poNumber, orderDate, quantity) =>
    /** @type {PurchaseOrder} */ ({
      id,
      poNumber,
      orderDate,
      supplierId: 'sup-x',
      supplierName: 'Sample',
      status: POStatus.CONFIRMED,
      lineItems: [
        {
          id: `li-${id}`,
          materialCode: 'PK-1',
          description: 'Bottle',
          quantity,
          uom: 'PCS',
          unitPrice: 1600,
          confirmedQty: quantity
        }
      ]
    });
  /** @type {BlanketPoInputs} */
  const input = {
    // PO-A is the NEWER order: the order date decides, not the PO number.
    pos: [po('a', 'PO-A', '2026-05-01', 70_000), po('b', 'PO-B', '2026-04-01', 15_000)],
    callOffs: [],
    ltpLines: WEEKS.map((w) => ({
      supplierId: 'sup-x',
      materialCode: 'PK-1',
      periodStart: w,
      periodEnd: addDays(w, 6),
      forecastQty: 34_300
    })),
    leadTimeDays: () => 14
  };

  it('orders a group by order date, then PO number; each older line names the next in line', () => {
    const rows = blanketPoRunOuts(input, NOW);
    expect(rows.map((r) => r.poNumber)).toEqual(['PO-B', 'PO-A']);
    expect(rows[0]?.nextInLine).toEqual({ poId: 'a', poNumber: 'PO-A', lineId: 'li-a' });
    expect(rows[1]?.nextInLine).toBeNull();
    // PO-B (15,000) is used up in week 1; PO-A runs out in week 3: 85,000 against 34,300/wk.
    expect(rows.map((r) => r.projection.runOut?.index)).toEqual([1, 3]);
    expect(rows.map((r) => r.projection.newPoBy?.index ?? null)).toEqual([null, 1]);
    // Same date: the PO number breaks the tie.
    expect(
      oldestFirst(
        { orderDate: '2026-04-01', poNumber: 'PO-2', lineId: 'l' },
        { orderDate: '2026-04-01', poNumber: 'PO-1', lineId: 'l' }
      )
    ).toBeGreaterThan(0);
  });

  it('one group, one alert — on the last line’s PO; the list reads per group', () => {
    const rows = blanketPoRunOuts(input, NOW);
    expect(blanketPoAlertSubjects(rows, NOW).map((s) => s.poId)).toEqual(['a']);
    const groups = runningOut(rows);
    expect(groups.map((g) => [g.last.poNumber, g.earlier.map((r) => r.poNumber)])).toEqual([
      ['PO-A', ['PO-B']]
    ]);
  });
});
