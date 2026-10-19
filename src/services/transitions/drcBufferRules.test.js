// BL-195 — strategic buffer (DRC-9a, [Default C4]) and production limit
// (DRC-9b, [Default E3]). The PPT 12 example is the golden fixture.

import { describe, expect, it } from 'vitest';
import {
  BUFFER_RULES,
  addMonths,
  allocatedIsProductionLimit,
  festiveWindows,
  monthLtp,
  productionLimitFor,
  strategicBufferRows,
  windowBuffer
} from './drcBufferRules';
import { RAMADAN_TABLE } from '../engine/eventCalendar';
import { allCapacityPlans } from '../data/mock/inventoryReadModel';
import { allCommitmentLines } from '../data/mock/forecastReadModel';
import { materialEntry } from '../sdc/materialMaster';
/** @import { CapacityPlan } from '../data/types' */
/** @import { NamedLtpLine } from './drcBufferRules' */

/**
 * A monthly LTP line.
 * @param {string} month YYYY-MM
 * @param {number} qty
 * @param {string} [materialCode]
 * @returns {NamedLtpLine}
 */
const monthly = (month, qty, materialCode = 'RM-X') => {
  const last = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0))
    .toISOString()
    .slice(0, 10);
  return {
    supplierId: 'sup-A',
    supplierName: 'Supplier A',
    materialCode,
    materialLabel: materialCode,
    uom: 'KG',
    periodStart: `${month}-01`,
    periodEnd: last,
    forecastQty: qty
  };
};

// PPT 12 — a festive window over Jan and Feb; baseline = mean(Oct, Nov, Dec) = 20.
const PPT12_TABLE = [{ hijriYear: 9001, start: '2027-01-10', eid: '2027-02-12' }];
const PPT12_LINES = [
  monthly('2026-10', 10),
  monthly('2026-11', 20),
  monthly('2026-12', 30),
  monthly('2027-01', 80),
  monthly('2027-02', 120)
];

describe('DRC-9a strategic buffer [Default C4]', () => {
  it('reproduces PPT 12: baseline 20, Jan 80 → 60, Feb 120 → 100', () => {
    const rows = strategicBufferRows(PPT12_LINES, { table: PPT12_TABLE });
    expect(rows).toHaveLength(1);
    const [w] = rows[0].windows;
    expect(w.window.months).toEqual(['2027-01', '2027-02']);
    expect(w.baselineMonths.map((m) => m.month)).toEqual(['2026-10', '2026-11', '2026-12']);
    expect(w.baseline).toBe(20);
    expect(w.status).toBe('ok');
    expect(w.months.map((m) => [m.month, m.qty, m.buffer])).toEqual([
      ['2027-01', 80, 60],
      ['2027-02', 120, 100]
    ]);
  });

  it('a month with LTP below the baseline reads 0, never negative', () => {
    const lines = [...PPT12_LINES.slice(0, 3), monthly('2027-01', 15), monthly('2027-02', 20)];
    const [w] = strategicBufferRows(lines, { table: PPT12_TABLE })[0].windows;
    expect(w.months.map((m) => m.buffer)).toEqual([0, 0]);
  });

  it('a material with no festive window in its LTP months has no window', () => {
    const lines = [monthly('2026-09', 10, 'RM-Y'), monthly('2026-10', 10, 'RM-Y')];
    const [row] = strategicBufferRows(lines, { table: PPT12_TABLE });
    expect(row.materialCode).toBe('RM-Y');
    expect(row.ltpMonths).toEqual(['2026-09', '2026-10']);
    expect(row.windows).toEqual([]);
  });

  it('a baseline month with no LTP leaves the buffer unknown, not computed on zeros', () => {
    const lines = PPT12_LINES.slice(1); // no October
    const [w] = strategicBufferRows(lines, { table: PPT12_TABLE })[0].windows;
    expect(w.status).toBe('baselineIncomplete');
    expect(w.baseline).toBeNull();
    expect(w.months.map((m) => m.buffer)).toEqual([null, null]);
    // Known-good control: the festive LTP itself is still shown.
    expect(w.months.map((m) => m.qty)).toEqual([80, 120]);
  });

  it('a festive month past the LTP reads no LTP and no buffer', () => {
    const table = [{ hijriYear: 9002, start: '2027-02-10', eid: '2027-03-12' }];
    const lines = [
      monthly('2026-11', 20),
      monthly('2026-12', 20),
      monthly('2027-01', 20),
      monthly('2027-02', 50)
    ];
    const [w] = strategicBufferRows(lines, { table })[0].windows;
    expect(w.months.map((m) => [m.month, m.qty, m.buffer])).toEqual([
      ['2027-02', 50, 30],
      ['2027-03', null, null]
    ]);
  });

  it('the baseline length is the rules key, not a literal', () => {
    const w = windowBuffer(PPT12_LINES, 'sup-A', 'RM-X', festiveWindows(PPT12_TABLE)[0], {
      ...BUFFER_RULES,
      strategicBufferBaselineMonths: 2
    });
    expect(w.baselineMonths.map((m) => m.month)).toEqual(['2026-11', '2026-12']);
    expect(w.baseline).toBe(25);
    expect(w.months.map((m) => m.buffer)).toEqual([55, 95]);
  });

  it('festive windows are the calendar Ramadan rows, Ramadan start to Lebaran', () => {
    const windows = festiveWindows();
    expect(windows).toHaveLength(RAMADAN_TABLE.length);
    expect(windows.find((w) => w.id === 'H1448')?.months).toEqual(['2027-02', '2027-03']);
    expect(windows.find((w) => w.id === 'H1449')?.months).toEqual(['2028-01', '2028-02']);
  });

  it('spreads a weekly line across a month boundary by day, and flags a partly covered month', () => {
    /** @type {NamedLtpLine[]} */
    const lines = [
      {
        ...monthly('2026-11', 0),
        periodStart: '2026-10-26',
        periodEnd: '2026-11-01',
        forecastQty: 700
      },
      {
        ...monthly('2026-11', 0),
        periodStart: '2026-11-02',
        periodEnd: '2026-11-29',
        forecastQty: 2800
      }
    ];
    const nov = monthLtp(lines, 'sup-A', 'RM-X', '2026-11');
    expect(nov.qty).toBe(100 + 2800);
    expect(nov.coveredDays).toBe(29);
    expect(nov.partial).toBe(true);
    const oct = monthLtp(lines, 'sup-A', 'RM-X', '2026-10');
    expect(oct.qty).toBe(600);
  });

  it('addMonths crosses years both ways', () => {
    expect(addMonths('2027-01', -3)).toBe('2026-10');
    expect(addMonths('2026-12', 1)).toBe('2027-01');
  });

  it('on the sample LTP, sup-002 RM-STEAR-7300 reads Ramadan 1448 from its own lines', () => {
    const lines = allCommitmentLines(null);
    const row = strategicBufferRows(lines).find(
      (r) => r.supplierId === 'sup-002' && r.materialCode === 'RM-STEAR-7300'
    );
    const w = row?.windows.find((x) => x.window.id === 'H1448');
    expect(w?.baselineMonths.map((m) => [m.month, m.qty])).toEqual([
      ['2026-11', 10700],
      ['2026-12', 13000],
      ['2027-01', 14300]
    ]);
    expect(w?.baseline).toBe(12666.666666666666);
    // Feb 11,800 is below the baseline: 0. March has no LTP yet.
    expect(w?.months.map((m) => [m.month, m.qty, m.buffer])).toEqual([
      ['2027-02', 11800, 0],
      ['2027-03', null, null]
    ]);
  });
});

describe('DRC-9b production limit [Default E3]', () => {
  const plans = allCapacityPlans();
  const plan = /** @type {CapacityPlan} */ (
    plans.find((p) => p.supplierId === 'sup-007' && p.planningGroupId === 'pg-MG-20')
  );
  const stated = /** @type {CapacityPlan['weeks'][number]} */ (plan.weeks.find((w) => w.entry));

  it('is the allocated capacity of the planning group for the week', () => {
    expect(productionLimitFor(plans, 'sup-007', 'pg-MG-20', stated.week)).toEqual({
      status: 'available',
      value: stated.entry?.allocated,
      source: 'allocatedCapacity',
      planningGroupId: 'pg-MG-20',
      uom: plan.uom
    });
  });

  it('resolves a material to its planning group, through the master or the plan', () => {
    const viaMaster = productionLimitFor(plans, 'sup-007', 'PK-PETB-8802', stated.week, {
      master: materialEntry
    });
    const viaPlan = productionLimitFor(plans, 'sup-007', 'PK-PETB-8802', stated.week);
    expect(viaMaster).toEqual(productionLimitFor(plans, 'sup-007', 'pg-MG-20', stated.week));
    expect(viaPlan).toEqual(viaMaster);
  });

  it('a week with no stated capacity is notStated; no plan or a week off the horizon is noPlan', () => {
    const blank = /** @type {CapacityPlan} */ (
      plans.find((p) => p.supplierId === 'sup-008' && p.planningGroupId === 'pg-MG-23')
    );
    expect(productionLimitFor(plans, 'sup-008', 'pg-MG-23', blank.weeks[0].week).status).toBe(
      'notStated'
    );
    expect(productionLimitFor(plans, 'sup-999', 'pg-MG-20', stated.week).status).toBe('noPlan');
    expect(productionLimitFor(plans, 'sup-007', 'pg-MG-20', '1999-01-04').status).toBe('noPlan');
  });

  it("the 'sadrFeed' source reads not available until a feed exists", () => {
    const rules = { ...BUFFER_RULES, productionLimitSource: /** @type {const} */ ('sadrFeed') };
    expect(productionLimitFor(plans, 'sup-007', 'pg-MG-20', stated.week, { rules })).toEqual({
      status: 'notAvailable',
      source: 'sadrFeed'
    });
    expect(allocatedIsProductionLimit(rules)).toBe(false);
    expect(allocatedIsProductionLimit()).toBe(true);
  });

  it('the default source is allocated capacity', () => {
    expect(BUFFER_RULES.productionLimitSource).toBe('allocatedCapacity');
    expect(Object.isFrozen(BUFFER_RULES)).toBe(true);
  });
});
