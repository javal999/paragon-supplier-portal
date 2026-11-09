// PEX-15 (BL-277) — what-if sandbox by level: scenarios, the BOM constraint, supplier months.
import { describe, expect, it } from 'vitest';
import {
  LTP_SCENARIOS,
  SCENARIO_SERIES,
  bomConstraintRefusal,
  fgBomView,
  fgOptions,
  scenarioAvailability,
  scenarioLtp,
  supplierMonths
} from './whatIfLevels';

describe('PEX-15 BR-02 scenarios', () => {
  it('are Baseline, Festive and Protection buffer, reading LTP A, Festive and B; there is no LTP C', () => {
    expect(LTP_SCENARIOS).toEqual(['baseline', 'festive', 'protection']);
    expect(SCENARIO_SERIES).toEqual({ baseline: 'A', festive: 'Festive', protection: 'B' });
    expect(Object.values(SCENARIO_SERIES)).not.toContain('C');
  });
  it('a series the hub does not hold makes its scenario unavailable, never estimated', () => {
    const series = { A: [10, 20], Festive: null, B: null };
    expect(scenarioLtp('baseline', series)).toEqual([10, 20]);
    expect(scenarioLtp('festive', series)).toBeNull();
    expect(scenarioAvailability(series).map((a) => a.available)).toEqual([true, false, false]);
    const full = { A: [10], Festive: [13], B: [11] };
    expect(scenarioLtp('festive', full)).toEqual([13]);
    expect(scenarioLtp('protection', full)).toEqual([11]);
    expect(scenarioAvailability(full).every((a) => a.available)).toBe(true);
  });
});

/** @param {string} skuCode @param {string} fgWeek @param {number} fgQuantity @param {number} quantity */
const peg = (skuCode, fgWeek, fgQuantity, quantity) => ({ skuCode, fgWeek, fgQuantity, quantity });
const mat = (materialCode, pegs) => ({
  materialCode,
  materialLabel: materialCode,
  uom: 'KG',
  weeks: [{ pegs }]
});

describe('PEX-15 BR-03 FG and BOM, AC-01', () => {
  // FG demand 110 in one week; X needs 1 per unit, Y 2 per unit, Z 0.5 per unit (Y and Z with scrap in).
  const materials = [
    mat('X', [peg('FG1', '2026-11-09', 110, 110)]),
    mat('Y', [peg('FG1', '2026-11-09', 110, 220), peg('FG2', '2026-11-09', 50, 50)]),
    mat('Z', [peg('FG1', '2026-11-09', 110, 55)])
  ];
  it('lists the FGs behind the pegs with their names', () => {
    expect(fgOptions(materials, { FG1: 'Lipstick' })).toEqual([
      { skuCode: 'FG1', name: 'Lipstick' },
      { skuCode: 'FG2', name: 'FG2' }
    ]);
  });
  it('with no constraint the materials are the engine’s figures', () => {
    const v = fgBomView({ materials, skuCode: 'FG1' });
    expect(v.fgDemand).toEqual([110]);
    expect(v.fgProduced).toEqual([110]);
    expect(v.constrained).toBe(false);
    expect(v.materials.map((m) => [m.materialCode, m.baseTotal, m.recalculatedTotal])).toEqual([
      ['X', 110, 110],
      ['Y', 220, 220],
      ['Z', 55, 55]
    ]);
  });
  it('AC-01: FG demand 110, X supports 80: the FG drops to 80 and Y and Z are recalculated for 80 units', () => {
    const v = fgBomView({ materials, skuCode: 'FG1', units: 80, limitingMaterial: 'X' });
    expect(v.fgProduced).toEqual([80]);
    expect(v.constrained).toBe(true);
    const by = Object.fromEntries(v.materials.map((m) => [m.materialCode, m]));
    expect(by.X.recalculatedTotal).toBe(80);
    expect(by.Y.recalculatedTotal).toBe(160);
    expect(by.Z.recalculatedTotal).toBe(40);
    expect(by.X.limiting).toBe(true);
    expect(by.Y.limiting).toBe(false);
    // The other FG's part of Y is not touched by FG1's constraint.
    expect(by.Y.baseTotal).toBe(220);
  });
  it('a constraint above the demand changes nothing; the cap applies to each week', () => {
    expect(fgBomView({ materials, skuCode: 'FG1', units: 500 }).constrained).toBe(false);
    const two = [mat('X', [peg('FG1', '2026-11-09', 110, 110), peg('FG1', '2026-11-16', 60, 60)])];
    const v = fgBomView({ materials: two, skuCode: 'FG1', units: 80 });
    expect(v.fgProduced).toEqual([80, 60]);
    expect(v.materials[0].recalculated).toEqual([80, 60]);
  });
  it('refuses units that are not a whole number of 0 or more', () => {
    expect(bomConstraintRefusal(80)).toBeNull();
    expect(bomConstraintRefusal(0)).toBeNull();
    for (const bad of [-1, 1.5, '80', null, NaN])
      expect(bomConstraintRefusal(bad)).toMatch(/BOM_UNITS_INVALID/);
  });
});

describe('PEX-15 supplier level, PEX-4 BR-02 and BR-06', () => {
  const week = (w, demand, allocated) => ({
    week: w,
    demand,
    entry: allocated === null ? null : { allocated }
  });
  it('utilisation = demand ÷ confirmed capacity per month; a month with no confirmation is null, not 0%', () => {
    const plans = [
      {
        supplierId: 's',
        weeks: [
          week('2026-11-02', 700, 1000),
          week('2026-11-09', 690, 1000),
          week('2026-12-07', 50, null)
        ]
      },
      { supplierId: 's', weeks: [week('2026-11-02', 100, 1000)] },
      { supplierId: 'other', weeks: [week('2026-11-02', 9999, 1)] }
    ];
    const m = supplierMonths(plans, 's');
    expect(m.map((x) => x.month)).toEqual(['2026-11', '2026-12']);
    // Nov: demand 700+690+100 = 1,490 over capacity 3,000 = 49.7%.
    expect(m[0]).toMatchObject({
      demand: 1490,
      capacity: 3000,
      utilisation: 49.7,
      weeksConfirmed: 2
    });
    expect(m[1]).toMatchObject({
      demand: 50,
      capacity: null,
      utilisation: null,
      weeksConfirmed: 0
    });
  });
  it('PEX-4 AC-01: demand 700 over capacity 1,000 reads 70%', () => {
    expect(
      supplierMonths([{ supplierId: 's', weeks: [week('2026-11-02', 700, 1000)] }], 's')[0]
        .utilisation
    ).toBe(70);
    expect(
      supplierMonths([{ supplierId: 's', weeks: [week('2026-11-02', 690, 1000)] }], 's')[0]
        .utilisation
    ).toBe(69);
  });
  it('confirmed capacity 0 reads null, not a division', () => {
    expect(
      supplierMonths([{ supplierId: 's', weeks: [week('2026-11-02', 5, 0)] }], 's')[0].utilisation
    ).toBeNull();
  });
});
