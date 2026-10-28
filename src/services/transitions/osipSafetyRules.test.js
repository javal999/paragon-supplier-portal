// ─────────────────────────────────────────────────────────────────────────────
// BL-193 (DRC-7) and BL-197 (DRC-11) — the read side of the OSIP safety
// figures and CV. One material worked by hand, PPT 7 through the read, every
// switch the page offers, and CV for a two-SKU component.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import golden from './__fixtures__/osipGolden.json';
import { OSIP_RULES } from './osipRules';
import { fisikConsumptionWeeks, materialCvs, osipSafety } from './osipSafetyRules';

/**
 * @param {Partial<import('./osipRules').OsipRules>} over
 * @returns {import('./osipRules').OsipRules}
 */
const rulesWith = (over) =>
  /** @type {import('./osipRules').OsipRules} */ ({ ...OSIP_RULES, ...over });

/** [Team C1] the earlier weekly CV buckets, which the hand-worked CV cases use. */
const WEEKLY_CV = rulesWith({ cvBucket: 'week' });

/**
 * The hand-worked material. LTP 100, 200, 300 over a 3-week lead time, MPQ 50;
 * the supplier's share of recorded consumption 700, 1,400, 2,100 a week
 * (100, 200, 300 a day); a Jabodetabek supplier (f = 1 day).
 * @type {import('./osipSafetyRules').OsipSafetyInput}
 */
const HAND = Object.freeze({
  supplierId: 'sup-x',
  materialCode: 'MAT-HAND',
  ltp: [100, 200, 300],
  leadTimeWeeks: 3,
  mpq: 50,
  moq: 1000,
  koli: 400,
  consumption: [700, 1400, 2100],
  supplyArea: /** @type {const} */ ('jabodetabek')
});

describe('osipSafety — one material worked by hand, defaults on', () => {
  const r = osipSafety(HAND);

  it('safety order: 1.65 × √3 × SD(100, 200, 300) = 285.79, up to the MPQ 50 → 300 [B2–B4]', () => {
    // Sample SD of 100, 200, 300 is 100 — the LTP weeks there are, up to 13 [Team B2].
    expect(r.safetyOrder.sd).toBe(100);
    expect(r.safetyOrder.roundTo).toBe(50);
    expect(r.safetyOrder.value).toBe(300);
    expect(r.safetyOrder.unavailable).toBeNull();
  });

  it('ROP Fisik safety: min(300/day consumption, LTP 200/7 a day) → CEILING(1 × 28.57, 50) = 50 [B1, B5, B7]', () => {
    expect(r.fisik.consumptionPerDay).toBe(300);
    expect(r.fisik.ltpPerDay).toBeCloseTo(200 / 7, 9);
    expect(r.fisik.demandPerDay).toBeCloseTo(200 / 7, 9);
    expect(r.fisik.f).toBe(1);
    expect(r.fisik.value).toBe(50);
  });

  it('production capacity is not in the hub: left out of the min, and flagged', () => {
    expect(r.flags).toEqual(['PRODUCTION_CAPACITY_NOT_AVAILABLE']);
  });
});

describe('osipSafety — every switch the page offers, recomputed, nothing stored', () => {
  it("sdSource 'consumption12w': SD(700, 1,400, 2,100) = 700 → 1.65 × √3 × 700 = 2,000.5 → 2,050", () => {
    const r = osipSafety(HAND, rulesWith({ sdSource: 'consumption12w' }));
    expect(r.safetyOrder.sd).toBe(700);
    expect(r.safetyOrder.value).toBe(2050);
  });

  it("safetyRounding 'koli' (400) → 400; 'moq' (1,000) → 1,000", () => {
    expect(osipSafety(HAND, rulesWith({ safetyRounding: 'koli' })).safetyOrder.value).toBe(400);
    expect(osipSafety(HAND, rulesWith({ safetyRounding: 'moq' })).safetyOrder.value).toBe(1000);
  });

  it('fisikDemandIncludesLtp off: demand = 300/day → CEILING(300, 50) = 300', () => {
    const r = osipSafety(HAND, rulesWith({ fisikDemandIncludesLtp: false }));
    expect(r.fisik.demandPerDay).toBe(300);
    expect(r.fisik.value).toBe(300);
  });

  it("fisikSafety 'sheet': 1.65 × √f × SD(100, 200, 300) + 1 × 200 — f 1 → 365; import f 7 → 636.55", () => {
    expect(osipSafety(HAND, rulesWith({ fisikSafety: 'sheet' })).fisik.value).toBeCloseTo(365, 9);
    const imp = osipSafety({ ...HAND, supplyArea: 'import' }, rulesWith({ fisikSafety: 'sheet' }));
    expect(imp.fisik.f).toBe(7);
    expect(imp.fisik.value).toBeCloseTo(1.65 * Math.sqrt(7) * 100 + 200, 9);
  });

  it("[Team B2] the 13-week SD reads past the lead time; 'ltp' reads the lead-time weeks only", () => {
    const longer = { ...HAND, ltp: [100, 200, 300, 999] };
    // SD(100, 200, 300, 999) = 407.8 → 1.65 × √3 × 407.8 = 1,165.3 → 1,200.
    expect(osipSafety(longer).safetyOrder).toMatchObject({ value: 1200 });
    expect(osipSafety(longer).safetyOrder.sd).toBeCloseTo(407.76, 2);
    // Week 4 (999) is outside the lead time: SD 100 → 300.
    expect(osipSafety(longer, rulesWith({ sdSource: 'ltp' })).safetyOrder).toMatchObject({
      sd: 100,
      value: 300
    });
  });

  it('the default rules object is untouched by a variant run', () => {
    osipSafety(HAND, rulesWith({ sdSource: 'consumption12w', fisikSafety: 'sheet' }));
    expect(OSIP_RULES.sdSource).toBe('ltp13w');
    expect(OSIP_RULES.fisikSafety).toBe('deck');
  });
});

describe('osipSafety — missing inputs are said, never zeroed', () => {
  it('no LTP over the lead time: safety order unavailable; the LTP term leaves the Fisik min, flagged', () => {
    const r = osipSafety({ ...HAND, ltp: [0, 0, 0] });
    expect(r.safetyOrder).toMatchObject({ value: null, unavailable: 'NO_LTP' });
    expect(r.flags).toContain('LTP_NOT_AVAILABLE');
    expect(r.fisik.ltpPerDay).toBeNull();
    expect(r.fisik.demandPerDay).toBe(300);
    expect(r.fisik.value).toBe(300);
  });

  it('no consumption recorded: Fisik safety unavailable; the consumption SD variant too', () => {
    const r = osipSafety({ ...HAND, consumption: [] });
    expect(r.fisik).toMatchObject({ value: null, unavailable: 'NO_CONSUMPTION' });
    expect(r.safetyOrder.value).toBe(300);
    expect(
      osipSafety({ ...HAND, consumption: [700] }, rulesWith({ sdSource: 'consumption12w' }))
        .safetyOrder
    ).toMatchObject({ value: null, unavailable: 'NO_CONSUMPTION' });
  });

  it('the sheet variant without a supply area has no f: unavailable; the deck needs none', () => {
    const none = { ...HAND, supplyArea: null };
    expect(osipSafety(none).fisik.value).toBe(50);
    expect(osipSafety(none, rulesWith({ fisikSafety: 'sheet' })).fisik).toMatchObject({
      value: null,
      unavailable: 'NO_SUPPLY_AREA'
    });
  });

  it('koli rounding without a pallet size rounds to a unit, flagged', () => {
    const r = osipSafety({ ...HAND, koli: null }, rulesWith({ safetyRounding: 'koli' }));
    expect(r.safetyOrder.value).toBe(286);
    expect(r.flags).toContain('NO_ROUNDING_SIZE');
  });

  it('the Fisik window is the last 13 recorded weeks (3 months): an older peak is left out', () => {
    expect(fisikConsumptionWeeks()).toBe(13);
    const old = [99_999, ...Array.from({ length: 13 }, () => 700)];
    expect(osipSafety({ ...HAND, consumption: old }).fisik.consumptionPerDay).toBe(100);
  });
});

describe('BL-210 — the live function reads what the sandbox changes', () => {
  it('the consumption window comes from the rules passed in: 13 weeks → 500/day, 2 weeks → 100/day', () => {
    // Worked by hand: 3,500, 700, 700 a week; LTP left out of the min, so the
    // demand is the highest day of the window and ROP Fisik = CEILING(1 × it, 50).
    const input = { ...HAND, consumption: [3500, 700, 700] };
    const noLtp = { fisikDemandIncludesLtp: false };
    const wide = osipSafety(input, rulesWith(noLtp)).fisik;
    expect([wide.consumptionPerDay, wide.value]).toEqual([500, 500]);
    const narrow = osipSafety(input, rulesWith({ ...noLtp, consumptionMovingAvgWeeks: 2 })).fisik;
    expect([narrow.consumptionPerDay, narrow.value]).toEqual([100, 100]);
    expect(fisikConsumptionWeeks(rulesWith({ consumptionMovingAvgWeeks: 2 }))).toBe(2);
  });

  it('a typed SD replaces the computed one: 1.65 × √3 × 200 = 571.58 → 600; without it, 300', () => {
    const typed = osipSafety({ ...HAND, sd: 200 });
    expect(typed.safetyOrder).toMatchObject({ sd: 200, value: 600, unavailable: null });
    expect(osipSafety({ ...HAND, sd: null }).safetyOrder).toMatchObject({ sd: 100, value: 300 });
    expect(osipSafety(HAND).safetyOrder).toMatchObject({ sd: 100, value: 300 });
  });

  it('a typed SD needs no series: with no consumption under consumption12w it still gives a figure', () => {
    const rules = rulesWith({ sdSource: 'consumption12w' });
    expect(osipSafety({ ...HAND, consumption: [] }, rules).safetyOrder.unavailable).toBe(
      'NO_CONSUMPTION'
    );
    expect(osipSafety({ ...HAND, consumption: [], sd: 200 }, rules).safetyOrder).toMatchObject({
      value: 600,
      unavailable: null
    });
  });
});

describe('PPT 7 through the read (DRC-7 AC-01)', () => {
  it('LT 5, MPQ 61,224 and the deck’s LTP give a safety order of 244,896 on the lead-time SD; 183,672 on 13 weeks', () => {
    const g = golden.ppt7;
    const input = {
      supplierId: 'ppt7',
      materialCode: g.material,
      ltp: g.ltp,
      leadTimeWeeks: g.leadTimeWeeks,
      mpq: g.mpq,
      moq: 0,
      koli: null,
      consumption: [],
      supplyArea: null
    };
    const r = osipSafety(input, rulesWith({ sdSource: 'ltp' }));
    expect(r.safetyOrder.value).toBe(244896);
    expect(r.safetyOrder.value).toBe(g.expected.safetyOrder);
    // [Team B2] the default: SD of the 12 weeks the slide holds.
    expect(osipSafety(input).safetyOrder.value).toBe(183672);
  });
});

describe('materialCvs — DRC-11, weekly buckets (the earlier [Default C1])', () => {
  // SKU A: 10, 20, 30, 40 → mean 25, sample SD 12.91, CV 0.5164.
  // SKU B: 100 every week → CV 0, mean 100.
  const skuWeekly = new Map([
    ['SKU-A', [10, 20, 30, 40]],
    ['SKU-B', [100, 100, 100, 100]],
    ['SKU-C', [0, 0, 0, 0]]
  ]);
  const bomLinks = [
    { parentCode: 'SKU-A', componentCode: 'CMP-SHARED' },
    { parentCode: 'SKU-B', componentCode: 'CMP-SHARED' },
    { parentCode: 'SKU-A', componentCode: 'CMP-A' },
    { parentCode: 'SKU-C', componentCode: 'CMP-DEAD' }
  ];
  const out = materialCvs(
    {
      skuWeekly,
      bomLinks,
      materialCodes: ['CMP-SHARED', 'CMP-A', 'CMP-DEAD', 'CMP-NONE']
    },
    WEEKLY_CV
  );
  const cvA = Math.sqrt(((10 - 25) ** 2 + 5 ** 2 + 5 ** 2 + 15 ** 2) / 3) / 25;

  it('a 2-SKU component: (0.5164 × 25 + 0 × 100) ÷ 125 = 0.1033 → stable', () => {
    const shared = /** @type {import('./osipSafetyRules').MaterialCv} */ (out.get('CMP-SHARED'));
    expect(shared.cv).toBeCloseTo((cvA * 25) / 125, 12);
    expect(shared.cv).toBeCloseTo(0.1033, 4);
    expect(shared.category).toBe('stable');
    expect(shared.skus.map((s) => s.skuCode)).toEqual(['SKU-A', 'SKU-B']);
  });

  it('a 1-SKU component takes that SKU’s CV: 0.5164 → fluctuative (threshold 0.5)', () => {
    expect(out.get('CMP-A')).toMatchObject({ category: 'fluctuative' });
    expect(out.get('CMP-A')?.cv).toBeCloseTo(cvA, 12);
  });

  it('no demand behind it: no CV; no BOM line: said so', () => {
    expect(out.get('CMP-DEAD')).toMatchObject({ cv: null, category: null, noBom: false });
    expect(out.get('CMP-NONE')).toMatchObject({ cv: null, category: null, noBom: true });
  });

  it('only the last 26 weekly buckets count', () => {
    const series = [
      ...Array.from({ length: 4 }, () => 10_000),
      ...Array.from({ length: 26 }, () => 50)
    ];
    const r = materialCvs(
      {
        skuWeekly: new Map([['S', series]]),
        bomLinks: [{ parentCode: 'S', componentCode: 'C' }],
        materialCodes: ['C']
      },
      WEEKLY_CV
    );
    expect(r.get('C')).toMatchObject({ cv: 0, category: 'stable' });
    expect(r.get('C')?.skus[0].avgDemand).toBe(50);
  });
});

describe('materialCvs — DRC-11 [Team C1]: six full calendar months', () => {
  // asOfWeek Monday 2026-07-06: the series ends the week of 2026-06-29. 30
  // weeks back starts Monday 2025-12-08, so Jan–Jun 2026 are the full months.
  const asOfWeek = '2026-07-06';
  const bomLinks = [{ parentCode: 'S', componentCode: 'C' }];
  /** @param {number[]} weekly */
  const run = (weekly) =>
    materialCvs({ skuWeekly: new Map([['S', weekly]]), bomLinks, materialCodes: ['C'], asOfWeek });

  it('70 a week is 10 a day: months of 31, 28, 31, 30, 31, 30 days → CV 0.0388, stable', () => {
    const r = run(Array.from({ length: 30 }, () => 70));
    const months = [310, 280, 310, 300, 310, 300];
    const m = months.reduce((a, b) => a + b, 0) / 6;
    const sd = Math.sqrt(months.reduce((n, x) => n + (x - m) ** 2, 0) / 5);
    expect(r.get('C')?.cv).toBeCloseTo(sd / m, 9);
    expect(r.get('C')?.cv).toBeCloseTo(0.0388, 4);
    expect(r.get('C')).toMatchObject({ category: 'stable' });
    expect(r.get('C')?.skus[0].avgDemand).toBeCloseTo(m, 9);
  });

  it('a spike in one month: 0 every week but 7,000 in the week of 2 March → fluctuative', () => {
    const weekly = Array.from({ length: 30 }, () => 0);
    weekly[12] = 7000; // 2025-12-08 + 12 weeks = 2026-03-02
    expect(run(weekly).get('C')).toMatchObject({ category: 'fluctuative' });
  });

  it('[Proposed, owner 2026-10-28] fewer than six full months of history: no CV', () => {
    // 20 weeks back starts 2026-02-16: only Mar–Jun are full.
    expect(run(Array.from({ length: 20 }, () => 70)).get('C')).toMatchObject({
      cv: null,
      category: null,
      noBom: false
    });
  });

  it('monthly buckets need the current week', () => {
    expect(() => materialCvs({ skuWeekly: new Map(), bomLinks, materialCodes: ['C'] })).toThrow(
      RangeError
    );
  });
});
