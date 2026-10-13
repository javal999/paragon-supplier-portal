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
  poLeadTimeWeeks,
  projectRunOut,
  projectionWeeks,
  runningOut
} from './blanketPoRules';
/** @import { BlanketPoInputs, BlanketPoRunOut, RunOutProjection } from './blanketPoRules' */
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
    supplierId: 'sup-x',
    supplierName: 'Sample',
    lineId,
    materialCode: 'PK-1',
    description: 'Bottle',
    uom: 'PCS',
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
    expect(runningOut(rows).map((r) => r.poNumber)).toEqual(['PO-2', 'PO-4', 'PO-5', 'PO-1']);
  });
});

describe('CAP-9 — the read: blanket PO lines, LTP and lead time, on the hub clock', () => {
  /** @type {BlanketPoInputs['pos']} */
  const pos = [
    /** @type {PurchaseOrder} */ ({
      id: 'po-x',
      poNumber: 'PO-X',
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
