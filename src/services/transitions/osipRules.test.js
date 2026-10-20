// ─────────────────────────────────────────────────────────────────────────────
// BL-187 / BL-200 — the OSIP calculation module. Golden fixtures first (design
// rule 4: PPT 7, 8, 9 under the defaults), then every function and every
// switch variant of `OSIP_RULES`.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import golden from './__fixtures__/osipGolden.json';
import { mockSuppliers } from '@data/mockSuppliers';
import {
  OSIP_RULES,
  RULES_VERSION,
  ceilingTo,
  componentCv,
  cv,
  cvCategory,
  cycleStock,
  fisikDemand,
  fisikSafety,
  horizonWeeksOf,
  maxStock,
  mean,
  planCheck,
  prGenerated,
  projectedSoh,
  replenishmentCycleDays,
  rollingDaWeek,
  ropFisik,
  ropOrder,
  safetyOrder,
  sampleStdev,
  stamp,
  strategicBuffer,
  supplyAreaOf
} from './osipRules';

/**
 * The rules with some keys changed, as the sandbox would pass them.
 * @param {Partial<import('./osipRules').OsipRules>} over
 * @returns {import('./osipRules').OsipRules}
 */
const rulesWith = (over) =>
  /** @type {import('./osipRules').OsipRules} */ ({ ...OSIP_RULES, ...over });

// ─── Golden fixtures ────────────────────────────────────────────────────────

describe('golden PPT 7 — bottle 2000041501', () => {
  const g = golden.ppt7;
  const e = g.expected;
  const cs = cycleStock(g.ltp, g.leadTimeWeeks);
  const ss = safetyOrder({ ltp: g.ltp, leadTimeWeeks: g.leadTimeWeeks, mpq: g.mpq }).value;
  const rop = ropOrder({ cycleStock: cs, safetyOrder: ss });
  const pr = prGenerated({ ropOrder: rop, soh: g.soh, ospo: g.ospo, ospr: g.ospr });
  const da = rollingDaWeek({
    weeks: g.weeks,
    ltp: g.ltp,
    leadTimeWeeks: g.leadTimeWeeks,
    safetyOrder: ss
  });

  it('cycle stock, safety order, ROP Order and PR generated', () => {
    expect(cs).toBe(e.cycleStock);
    expect(ss).toBe(e.safetyOrder);
    expect(rop).toBe(e.ropOrder);
    expect(pr).toBe(e.prGenerated);
  });

  it('incoming DA W33–W37 and its total equal ROP Order (DRC-2 AC-03)', () => {
    expect(da.weeks.map((w) => w.da)).toEqual(e.incomingDa);
    expect(da.weeks.map((w) => w.week)).toEqual(['W33', 'W34', 'W35', 'W36', 'W37']);
    expect(da.weeks[0]).toMatchObject({ ltp: 193872, safety: 244896, da: 438768 });
    expect(da.totalDa).toBe(e.totalDa);
    expect(da.totalDa).toBe(rop);
  });

  it('plan check gap is 0 (DRC-4 AC-01)', () => {
    const check = planCheck({
      daWeeks: da.weeks.map((w) => w.da),
      soh: g.soh,
      ospo: g.ospo,
      ospr: g.ospr,
      pr: -pr
    });
    expect(check.gap).toBe(e.planCheckGap);
    expect(check.prRecommendation).toBe(0);
    expect(check.absorbedLastWeek).toBe(0);
  });

  it('projected SOH with incoming is 361,225 every week', () => {
    expect(projectedSoh(g.soh, e.incomingDa, g.ltp)).toEqual(e.projectedSoh);
  });
});

describe('golden PPT 8 — DA adjustment (carry to first week outside, supplier agreed)', () => {
  const p = golden.ppt8;
  const carryTo = /** @type {'firstOutside'} */ (p.week1.carryTo);
  const w1 = rollingDaWeek({ ...p.week1, carryTo, leadTimeWeeks: p.leadTimeWeeks });
  const w2 = rollingDaWeek({ ...p.week2, leadTimeWeeks: p.leadTimeWeeks, carries: w1.carries });

  it('week 1: DA 10 × 4, PO 40, call-off 5, remainder 5 to W5', () => {
    expect(w1.weeks.map((w) => w.da)).toEqual(p.week1.expected.da);
    expect(w1.ospo).toBe(p.week1.expected.ospo);
    expect(w1.additionalPo).toBe(p.week1.expected.additionalPo);
    expect(w1.remainder).toBe(p.week1.expected.remainder);
    expect(w1.carry).toEqual(p.week1.expected.carry);
    expect(w1.flags).toEqual([]);
  });

  it('week 2: W5 = 5 + 5 = 10, OSPO 35, additional PO 5, remainder 0', () => {
    expect(w2.weeks.map((w) => w.da)).toEqual(p.week2.expected.da);
    expect(w2.weeks[3]).toEqual({
      week: 'W5',
      ltp: 5,
      safety: 0,
      carriedIn: [{ qty: 5, fromWeek: 'W1' }],
      da: 10
    });
    expect(w2.ospo).toBe(p.week2.expected.ospo);
    expect(w2.additionalPo).toBe(p.week2.expected.additionalPo);
    expect(w2.remainder).toBe(p.week2.expected.remainder);
    expect(w2.carry).toBe(p.week2.expected.carry);
  });
});

describe('golden PPT 9 — DA side of the feedstock reconcile (carry to last week)', () => {
  const p = golden.ppt9;
  const fromW1 = [{ week: 'W5', qty: 5, fromWeek: 'W1' }];
  const w3 = rollingDaWeek({ ...p.week3, leadTimeWeeks: p.leadTimeWeeks, carries: fromW1 });
  const w4 = rollingDaWeek({ ...p.week4, leadTimeWeeks: p.leadTimeWeeks, carries: w3.carries });

  it('week 3: DA 10, 10, 10, 0; OSPO 30; PO 0; remainder 5 to W6', () => {
    expect(w3.weeks.map((w) => w.da)).toEqual(p.week3.expected.da);
    expect(w3.ospo).toBe(p.week3.expected.ospo);
    expect(w3.additionalPo).toBe(p.week3.expected.additionalPo);
    expect(w3.remainder).toBe(p.week3.expected.remainder);
    expect(w3.carry).toEqual(p.week3.expected.carry);
  });

  it('week 4: W6 = 0 + 5; DA 10, 10, 5, 0; OSPO 25; PO 0; remainder 5', () => {
    expect(w4.weeks.map((w) => w.da)).toEqual(p.week4.expected.da);
    expect(w4.weeks.slice(0, 3).map((w) => w.da)).toEqual(p.week3.expected.daAfterCarry.slice(1));
    expect(w4.ospo).toBe(p.week4.expected.ospo);
    expect(w4.additionalPo).toBe(p.week4.expected.additionalPo);
    expect(w4.remainder).toBe(p.week4.expected.remainder);
    expect(w4.carry).toEqual(p.week4.expected.carry);
  });
});

describe('PPT 8 → 9 chained with the stated call-offs (5, 10, 5) and POs (40, 5, 0)', () => {
  // The slides' OSPO 35 → 30 → 25 follow from chaining only when the new PO
  // counts (week 2: 0 − 5 + 40; week 3: 35 − 10 + 5; week 4: 30 − 5 + 0).
  // Under the default (false) the same chain gives −5, −15, −20.
  /**
   * @param {import('./osipRules').OsipRules} rules
   * @returns {number[]}
   */
  const chain = (rules) => {
    const callOffs = [5, 10, 5];
    const pos = [40, 5, 0];
    let ospo = 0;
    return callOffs.map((c, i) => {
      ospo = rollingDaWeek(
        {
          weeks: ['A', 'B', 'C', 'D'],
          ltp: [10, 10, 10, 10],
          leadTimeWeeks: 4,
          ospoPrev: ospo,
          callOffPrev: c,
          newPoPrev: pos[i]
        },
        rules
      ).ospo;
      return ospo;
    });
  };

  it('ospoIncludesNewPo true reproduces 35, 30, 25', () => {
    expect(chain(rulesWith({ ospoIncludesNewPo: true }))).toEqual([35, 30, 25]);
  });

  it('ospoIncludesNewPo is on by default (owner, 2026-10-19); false does not chain', () => {
    expect(OSIP_RULES.ospoIncludesNewPo).toBe(true);
    expect(chain(OSIP_RULES)).toEqual([35, 30, 25]);
    expect(chain(rulesWith({ ospoIncludesNewPo: false }))).toEqual([-5, -15, -20]);
  });
});

// ─── Rules block and stamping ───────────────────────────────────────────────

describe('OSIP_RULES and stamp', () => {
  it('is frozen, nested map included, with the section 4 defaults', () => {
    expect(Object.isFrozen(OSIP_RULES)).toBe(true);
    expect(Object.isFrozen(OSIP_RULES.replenishmentCycleDays)).toBe(true);
    expect(OSIP_RULES).toMatchObject({
      z: 1.65,
      sdSource: 'ltp',
      safetyRounding: 'mpq',
      fisikSafety: 'deck',
      fisikDemandIncludesLtp: true,
      fixedSafetyDays: 1,
      maxRule: 'deck',
      replenishmentCycleDays: { import: 7, jabodetabek: 1, outsideJabodetabek: 2 },
      cvThreshold: 0.5,
      cvWindowWeeks: 26,
      defaultLevel: 4,
      daSafetyPlacement: 'week1',
      planCheckIncludesSoh: true,
      carryOverTarget: 'lastWeek',
      consumptionMovingAvgWeeks: 13,
      ospoIncludesNewPo: true
    });
  });

  it('stamp keeps the value, a frozen copy of the inputs and the rules version', () => {
    const inputs = { soh: 1 };
    const s = stamp(42, inputs);
    expect(s).toEqual({ value: 42, inputs: { soh: 1 }, rulesVersion: RULES_VERSION });
    expect(Object.isFrozen(s)).toBe(true);
    expect(Object.isFrozen(s.inputs)).toBe(true);
    inputs.soh = 2;
    expect(s.inputs.soh).toBe(1);
    expect(stamp(1, {}, 'osip-x').rulesVersion).toBe('osip-x');
  });
});

// ─── Helpers ────────────────────────────────────────────────────────────────

describe('arithmetic helpers', () => {
  it('ceilingTo rounds up to a multiple, tolerating float noise', () => {
    expect(ceilingTo(183672.1, 61224)).toBe(244896);
    expect(ceilingTo(61224, 61224)).toBe(61224);
    expect(ceilingTo(0.1 * 3, 0.1)).toBeCloseTo(0.3);
    expect(ceilingTo(4.2, 0)).toBe(5);
  });

  it('sampleStdev is the n − 1 deviation; mean of nothing is 0', () => {
    expect(sampleStdev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138, 3);
    expect(sampleStdev([5])).toBe(0);
    expect(mean([])).toBe(0);
  });

  it('horizon is the lead time rounded up, at least 1', () => {
    expect(horizonWeeksOf(5)).toBe(5);
    expect(horizonWeeksOf(4.2)).toBe(5);
    expect(horizonWeeksOf(0)).toBe(1);
  });
});

// ─── Safety order switches ──────────────────────────────────────────────────

describe('safetyOrder switches', () => {
  const ltp = golden.ppt7.ltp;
  const base = { ltp, leadTimeWeeks: 5, mpq: 61224, koli: 1000, moq: 100000 };

  it('sdSource ltp uses the sample SD of the lead-time LTP', () => {
    const r = safetyOrder(base);
    expect(r.sd).toBeCloseTo(57801.46, 1);
    expect(r.raw).toBeCloseTo(1.65 * Math.sqrt(5) * r.sd);
    expect(r.roundTo).toBe(61224);
  });

  it("sdSource 'consumption12w' uses the last 12 weeks of consumption", () => {
    const consumption = [999, 999, 10, 20, 10, 20, 10, 20, 10, 20, 10, 20, 10, 20];
    const r = safetyOrder({ ...base, consumption }, rulesWith({ sdSource: 'consumption12w' }));
    expect(r.sd).toBeCloseTo(sampleStdev(consumption.slice(-12)));
    expect(r.value).toBe(61224);
  });

  it('safetyRounding koli / moq round to those sizes', () => {
    const raw = safetyOrder(base).raw;
    expect(safetyOrder(base, rulesWith({ safetyRounding: 'koli' })).value).toBe(
      Math.ceil(raw / 1000) * 1000
    );
    expect(safetyOrder(base, rulesWith({ safetyRounding: 'moq' })).value).toBe(300000);
  });

  it('z is read from the rules', () => {
    expect(safetyOrder(base, rulesWith({ z: 0 })).value).toBe(0);
  });

  it('BL-210 — a typed sd replaces the computed SD; absent or null, nothing changes', () => {
    const computed = safetyOrder(base);
    expect(computed.value).toBe(golden.ppt7.expected.safetyOrder);
    expect(safetyOrder({ ...base, sd: null })).toEqual(computed);
    // The slide's own SD typed in reproduces the slide's safety order.
    expect(safetyOrder({ ...base, sd: 57801.5 }).value).toBe(golden.ppt7.expected.safetyOrder);
    // 1.65 × √5 × 10,000 = 36,894 → up to the MPQ 61,224.
    const typed = safetyOrder({ ...base, sd: 10000 });
    expect(typed.sd).toBe(10000);
    expect(typed.raw).toBeCloseTo(1.65 * Math.sqrt(5) * 10000, 6);
    expect(typed.value).toBe(61224);
    // The override wins over either source.
    expect(safetyOrder({ ...base, sd: 0 }, rulesWith({ sdSource: 'consumption12w' })).value).toBe(
      0
    );
  });
});

// ─── ROP Fisik, supply area, Max ────────────────────────────────────────────

describe('BL-200 supply area and replenishment cycle f', () => {
  it('resolves import / jabodetabek / outsideJabodetabek from country and city', () => {
    expect(supplyAreaOf({ country: 'DE', city: 'Frankfurt' })).toBe('import');
    expect(supplyAreaOf({ country: 'ID', city: 'Jakarta' })).toBe('jabodetabek');
    expect(supplyAreaOf({ country: 'id', city: ' Tangerang ' })).toBe('jabodetabek');
    expect(supplyAreaOf({ country: 'ID', city: 'Cikarang' })).toBe('jabodetabek');
    expect(supplyAreaOf({ country: 'ID', city: 'Karawang' })).toBe('outsideJabodetabek');
    expect(supplyAreaOf({ country: 'ID', city: 'Surabaya' })).toBe('outsideJabodetabek');
    expect(supplyAreaOf({ country: 'ID' })).toBe('outsideJabodetabek');
    expect(supplyAreaOf({ city: 'Jakarta' })).toBeNull();
  });

  it('resolves every supplier fixture to an area (country and city are on each)', () => {
    const areas = new Map(mockSuppliers.map((s) => [s.id, supplyAreaOf(s)]));
    expect(areas.get('sup-001')).toBe('outsideJabodetabek'); // Batam
    expect(areas.get('sup-003')).toBe('jabodetabek'); // Jakarta
    expect(areas.get('sup-005')).toBe('import'); // DE
    expect([...areas.values()].every((a) => a !== null)).toBe(true);
  });

  it('f per area from the rules (1 day / 2 days / 1 week)', () => {
    expect(replenishmentCycleDays('jabodetabek')).toBe(1);
    expect(replenishmentCycleDays('outsideJabodetabek')).toBe(2);
    expect(replenishmentCycleDays('import')).toBe(7);
    const custom = rulesWith({
      replenishmentCycleDays: Object.freeze({ import: 14, jabodetabek: 1, outsideJabodetabek: 3 })
    });
    expect(replenishmentCycleDays('import', custom)).toBe(14);
  });
});

describe('fisikDemand', () => {
  const existing = { highestConsumption3m: 120, productionCapacity: 200, ltp: 90 };

  it('existing: min(consumption, capacity, LTP) by default', () => {
    expect(fisikDemand(existing)).toBe(90);
  });

  it('existing without LTP when fisikDemandIncludesLtp is false', () => {
    expect(fisikDemand(existing, rulesWith({ fisikDemandIncludesLtp: false }))).toBe(120);
  });

  it('NPD: min(highest LTP next 3 months, capacity)', () => {
    expect(
      fisikDemand({ npd: true, highestLtpNext3m: 300, productionCapacity: 200, ltp: 10 })
    ).toBe(200);
    expect(fisikDemand({ npd: true, highestLtpNext3m: 50, productionCapacity: 200 })).toBe(50);
  });
});

describe('fisikSafety switches', () => {
  it('deck: CEILING(g × demand, MPQ)', () => {
    expect(fisikSafety({ demand: 90, mpq: 50, f: 2 })).toBe(100);
    expect(fisikSafety({ demand: 90, mpq: 50, f: 2 }, rulesWith({ fixedSafetyDays: 2 }))).toBe(200);
  });

  it('sheet: Z × √f × SD(consumption) + g × average demand', () => {
    const consumption = [80, 100, 120];
    const got = fisikSafety(
      { demand: 90, mpq: 50, f: 4, consumption, averageDemand: 100 },
      rulesWith({ fisikSafety: 'sheet' })
    );
    expect(got).toBeCloseTo(1.65 * 2 * 20 + 100);
  });
});

describe('ropFisik by level', () => {
  const input = {
    demand: 90,
    f: 2,
    mpq: 50,
    safety: 100,
    mdq: 400,
    jitRate: 70,
    jitDays: 2,
    palletQty: 60
  };

  it('levels 3 and 4: CEILING(demand × f, MPQ) + safety', () => {
    expect(ropFisik({ ...input, level: 4 })).toEqual({
      value: 300,
      cycle: 200,
      safety: 100,
      level: 4,
      levelFallback: false
    });
    expect(ropFisik({ ...input, level: 3 }).value).toBe(300);
  });

  it('no level uses defaultLevel (4) without a flag', () => {
    expect(ropFisik(input)).toMatchObject({ level: 4, levelFallback: false, value: 300 });
  });

  it('level 5: f and MDQ', () => {
    expect(ropFisik({ ...input, level: 5 })).toMatchObject({ cycle: 400, value: 500 });
  });

  it('level 6: c × d with pallet rounding, no safety', () => {
    expect(ropFisik({ ...input, level: 6 })).toMatchObject({ cycle: 180, safety: 0, value: 180 });
  });

  it('any other level falls back to the default with a flag', () => {
    expect(ropFisik({ ...input, level: 2 })).toMatchObject({
      level: 4,
      levelFallback: true,
      value: 300
    });
  });
});

describe('maxStock switches', () => {
  it('deck: local ceiling to koli, import ceiling to MOQ', () => {
    expect(maxStock({ rop: 1050, area: 'jabodetabek', koli: 100, moq: 1000 })).toBe(1100);
    expect(maxStock({ rop: 1050, area: 'outsideJabodetabek', koli: 100, moq: 1000 })).toBe(1100);
    expect(maxStock({ rop: 1050, area: 'import', koli: 100, moq: 1000 })).toBe(2000);
  });

  it('sheetGuidance: ROP + cycle stock', () => {
    expect(
      maxStock(
        { rop: 1050, area: 'import', koli: 100, moq: 1000, cycleStock: 500 },
        rulesWith({ maxRule: 'sheetGuidance' })
      )
    ).toBe(1550);
  });
});

// ─── CV and strategic buffer ────────────────────────────────────────────────

describe('CV', () => {
  it('SD ÷ mean over the last 26 weeks; null on a zero mean', () => {
    const old = Array.from({ length: 10 }, () => 1000);
    const recent = Array.from({ length: 26 }, (_, i) => (i % 2 ? 80 : 120));
    expect(cv([...old, ...recent])).toBeCloseTo(sampleStdev(recent) / 100);
    expect(cv([0, 0, 0])).toBeNull();
    expect(cv([...old, ...recent], rulesWith({ cvWindowWeeks: 36 }))).toBeGreaterThan(1);
  });

  it('component CV is demand-weighted; null with no demand', () => {
    expect(
      componentCv([
        { cv: 0.2, avgDemand: 300 },
        { cv: 0.8, avgDemand: 100 }
      ])
    ).toBeCloseTo(0.35);
    expect(componentCv([{ cv: 0.4, avgDemand: 0 }])).toBeNull();
  });

  it('stable below 0.5, fluctuative at or above', () => {
    expect(cvCategory(0.49)).toBe('stable');
    expect(cvCategory(0.5)).toBe('fluctuative');
    expect(cvCategory(0.49, rulesWith({ cvThreshold: 0.3 }))).toBe('fluctuative');
  });
});

describe('strategic buffer (DRC-9a, PPT 12)', () => {
  it('baseline 20: LTP 80 gives 60, LTP 120 gives 100', () => {
    expect(strategicBuffer({ ltp: 80, preFestiveLtp: [15, 20, 25] })).toEqual({
      value: 60,
      baseline: 20
    });
    expect(strategicBuffer({ ltp: 120, preFestiveLtp: [20, 20, 20] }).value).toBe(100);
  });

  it('never below 0', () => {
    expect(strategicBuffer({ ltp: 10, preFestiveLtp: [20] }).value).toBe(0);
  });
});

// ─── Rolling DA switches and edges ──────────────────────────────────────────

describe('rollingDaWeek switches and edges', () => {
  const base = {
    weeks: ['W1', 'W2', 'W3', 'W4', 'W5'],
    ltp: [10, 10, 10, 10, 5],
    leadTimeWeeks: 4
  };

  it("daSafetyPlacement 'spread' spreads the safety in whole units, sum kept", () => {
    const r = rollingDaWeek(
      { ...base, safetyOrder: 10 },
      rulesWith({ daSafetyPlacement: 'spread' })
    );
    expect(r.weeks.map((w) => w.safety)).toEqual([3, 3, 2, 2]);
    expect(r.totalDa).toBe(50);
    const ppt7 = rollingDaWeek(
      { weeks: golden.ppt7.weeks, ltp: golden.ppt7.ltp, leadTimeWeeks: 5, safetyOrder: 244896 },
      rulesWith({ daSafetyPlacement: 'spread' })
    );
    expect(ppt7.totalDa).toBe(761888);
    expect(ppt7.weeks[0].safety).toBe(48980);
  });

  it('default carry goes to the last week of the horizon', () => {
    const r = rollingDaWeek({ ...base, callOff: 4 });
    expect(r.carry).toEqual({ week: 'W4', qty: 6, fromWeek: 'W1' });
  });

  it('carryOverTarget firstOutside in the rules still needs the supplier', () => {
    const rules = rulesWith({ carryOverTarget: 'firstOutside' });
    const refused = rollingDaWeek({ ...base, callOff: 4 }, rules);
    expect(refused.carry?.week).toBe('W4');
    expect(refused.flags).toContain('CARRY_FIRST_OUTSIDE_NOT_AGREED');
    const agreed = rollingDaWeek({ ...base, callOff: 4, supplierAgreedFirstOutside: true }, rules);
    expect(agreed.carry?.week).toBe('W5');
    expect(agreed.flags).toEqual([]);
  });

  it('firstOutside with no week beyond the horizon falls back to the last week', () => {
    const r = rollingDaWeek({
      ...base,
      weeks: base.weeks.slice(0, 4),
      ltp: base.ltp.slice(0, 4),
      callOff: 4,
      carryTo: 'firstOutside',
      supplierAgreedFirstOutside: true
    });
    expect(r.carry?.week).toBe('W4');
    expect(r.flags).toContain('CARRY_FIRST_OUTSIDE_WEEK_MISSING');
  });

  it('the carry-over limit caps the carry; the rest is uncarried and flagged', () => {
    const r = rollingDaWeek({ ...base, callOff: 2, carryOverLimit: 5 });
    expect(r.remainder).toBe(8);
    expect(r.carry?.qty).toBe(5);
    expect(r.uncarried).toBe(3);
    expect(r.flags).toContain('CARRY_OVER_LIMIT');
  });

  it('a call-off above DA carries nothing; additional PO never below 0', () => {
    const r = rollingDaWeek({ ...base, callOff: 15, ospoPrev: 100 });
    expect(r.remainder).toBe(-5);
    expect(r.carry).toBeNull();
    expect(r.additionalPo).toBe(0);
  });

  it("the planning week's own carries are spent; later ones are kept", () => {
    const r = rollingDaWeek({
      ...base,
      carries: [
        { week: 'W1', qty: 2, fromWeek: 'W0' },
        { week: 'W3', qty: 1, fromWeek: 'W0' }
      ],
      callOff: 12
    });
    expect(r.weeks[0].da).toBe(12);
    expect(r.carries).toEqual([{ week: 'W3', qty: 1, fromWeek: 'W0' }]);
  });

  it('throws when fewer weeks than the horizon are given', () => {
    expect(() => rollingDaWeek({ weeks: ['W1'], ltp: [1], leadTimeWeeks: 3 })).toThrow(RangeError);
  });
});

// ─── Plan vs execution ──────────────────────────────────────────────────────

describe('planCheck', () => {
  const base = { daWeeks: [10, 10, 10, 10], soh: 5, ospo: 20, ospr: 0, pr: 0 };

  it('a shortfall raises a PR recommendation', () => {
    expect(planCheck(base)).toMatchObject({ gap: 15, prRecommendation: 15, absorbedLastWeek: 0 });
  });

  it('planCheckIncludesSoh false drops SOH from supply', () => {
    expect(planCheck(base, rulesWith({ planCheckIncludesSoh: false }))).toMatchObject({
      supply: 20,
      gap: 20
    });
  });

  it('a surplus is absorbed in the last week, never below 0', () => {
    expect(planCheck({ ...base, ospo: 38 })).toMatchObject({
      gap: -3,
      prRecommendation: 0,
      absorbedLastWeek: 3,
      unabsorbed: 0,
      daWeeks: [10, 10, 10, 7]
    });
    expect(planCheck({ ...base, ospo: 50 })).toMatchObject({
      absorbedLastWeek: 10,
      unabsorbed: 5,
      daWeeks: [10, 10, 10, 0]
    });
  });
});
