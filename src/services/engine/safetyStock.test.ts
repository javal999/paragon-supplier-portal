// ─────────────────────────────────────────────────────────────────────────────
// REQ-E14-04 — safety stock, safety lead time and reorder point (M3, M7).
//
// The requirement's worked examples verbatim (the 10-error quantile
// illustration, the safety-lead-time example, the ROP), and beside the first
// the FILL-RATE rule the engine actually uses on the same errors — so the
// difference between the two readings is measured, not described. Known-good
// and known-bad probes for both fallback rules (BR-05 and the <5-receipts edge
// case), the default tiers, the feed into E14-03, and AC-03: an independent
// recalculation from the stored history reproduces the safety stock.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SAFETY_STOCK_OPTIONS,
  defaultTiers,
  empiricalQuantile,
  expectedShortPerCycle,
  fillRateAt,
  fillRateSafetyStock,
  reorderPoint,
  requirementInputs,
  safetyLeadTimes,
  safetyStockRun,
  type SafetyStockOptions,
} from './safetyStock';
import { defaultRequirementOptions, materialRequirement, primarySource } from './requirement';
import { addDays, mondayOf } from './dates';
import type { EngineDataset } from './types';
import { engineDataset } from '../data/mock/fixtures/engineDataset';

// ── The worked examples ─────────────────────────────────────────────────────

/** REQ-E14-04 Calculation: the shortfalls at 10 past points, deliberately unsorted. */
const ERRORS = [600, -800, 2600, 0, -1200, 1500, 200, -300, 900, 400];

describe('REQ-E14-04 — the worked examples, verbatim', () => {
  it('safety stock, quantile reading: at 90%, the value 9 of the 10 are at or below — 1,500', () => {
    expect(empiricalQuantile(ERRORS, 0.9)).toBe(1500);
  });

  it('safety lead time: 0,0,0,1,1,2,2,3,5,9 days at 80% — the value 8 of 10 are at or below: 3 days', () => {
    expect(empiricalQuantile([0, 0, 0, 1, 1, 2, 2, 3, 5, 9], 0.8)).toBe(3);
    const [slt] = safetyLeadTimes(new Map([['sup-B|MG-20', [5, 0, 2, 9, 0, 1, 3, 0, 2, 1]]]), [{ supplierId: 'sup-B', materialGroup: 'MG-20' }], 0.8, 5);
    expect([slt.days, slt.source, slt.receipts]).toEqual([3, 'supplier', 10]);
  });

  it('reorder point: 5,000 a week × 5 weeks + 1,500 = 26,500', () => {
    expect(reorderPoint(5000 * 5, 1500)).toBe(26_500);
  });
});

describe('REQ-E14-04 BR-02 — the FILL-RATE rule on the same ten errors (how it differs from the quantile)', () => {
  // The example's material sells 5,000 a week and is reviewed weekly: the
  // expected order per cycle is one week's demand.
  const Q = 5000;

  it('at 90%: the smallest safety stock whose expected shortfall per cycle is ≤ 10% of Q is 200, not 1,500', () => {
    const ss = fillRateSafetyStock(ERRORS, Q, 0.9);
    expect(ss).toBe(200);
    // Exactly at the limit…
    expect(expectedShortPerCycle(ERRORS, 200)).toBe(500);
    expect(fillRateAt(ERRORS, 200, Q)).toBeCloseTo(0.9, 12);
    // …and one unit less is short of it (smallest, not merely sufficient).
    expect(expectedShortPerCycle(ERRORS, 199) / Q).toBeGreaterThan(0.1);
    // The quantile reading would hold 1,300 more units for the same errors.
    expect(empiricalQuantile(ERRORS, 0.9)! - ss).toBe(1300);
  });

  it('a higher target needs more stock (95% → 834); a large order needs less (Q = 20,000 at 90% → 0)', () => {
    // 95%: ≤ 250 short per cycle. (2,600 − 834) + (1,500 − 834) + (900 − 834) = 2,498 → 249.8; at 833, 250.1.
    expect(fillRateSafetyStock(ERRORS, Q, 0.95)).toBe(834);
    expect(expectedShortPerCycle(ERRORS, 834)).toBeCloseTo(249.8, 9);
    expect(expectedShortPerCycle(ERRORS, 833)).toBeCloseTo(250.1, 9);
    expect(fillRateSafetyStock(ERRORS, 20_000, 0.9)).toBe(0);
    // Known-bad: the rule is not a quantile in disguise.
    expect(fillRateSafetyStock(ERRORS, Q, 0.9)).not.toBe(empiricalQuantile(ERRORS, 0.9));
  });

  it('edge cases: no errors → 0; no expected order → the largest shortfall on record', () => {
    expect(fillRateSafetyStock([], Q, 0.9)).toBe(0);
    expect(fillRateSafetyStock(ERRORS, 0, 0.9)).toBe(2600);
    expect(fillRateSafetyStock([-5, -1], Q, 0.99)).toBe(0);
  });
});

// ── Fallback rules, both ways ───────────────────────────────────────────────

const data = engineDataset();
const asOf = data.provenance.present;
const opts = (over: Partial<SafetyStockOptions> = {}): SafetyStockOptions => ({ ...DEFAULT_SAFETY_STOCK_OPTIONS, asOf, ...over });
const run = safetyStockRun(data, opts());

describe('REQ-E14-04 BR-05 / AC-02 — too little history uses SAP’s value, marked', () => {
  const m = run.materials.find((x) => x.materialCode === 'PK-PETB-8801')!;
  const n = m.errors.length;

  it('examined something: a named material with a usable history', () => {
    expect(n).toBeGreaterThan(0);
    expect(m.method).toBe('empiricalFillRate');
  });

  it('known-good: at exactly the minimum it is the engine’s own figure', () => {
    const at = safetyStockRun(data, opts({ minOrigins: n })).materials.find((x) => x.materialCode === m.materialCode)!;
    expect([at.source, at.method, at.safetyStock]).toEqual(['engine', 'empiricalFillRate', at.engineSafetyStock]);
  });

  it('known-bad: one origin short, it is SAP’s value, marked — and the engine’s figure is still shown beside it', () => {
    const short = safetyStockRun(data, opts({ minOrigins: n + 1 })).materials.find((x) => x.materialCode === m.materialCode)!;
    expect([short.source, short.method]).toEqual(['sap', 'sapFallback']);
    expect(short.safetyStock).toBe(data.sapSafetyStock.find((s) => s.materialCode === m.materialCode)!.quantity);
    expect(short.engineSafetyStock).toBe(m.engineSafetyStock);
    expect(short.freedUnits).toBe(0);
  });

  it('on the shipped data with the rule at 30, the fallback set is exactly the materials with fewer than 30 origins', () => {
    const expected = run.materials.filter((x) => x.errors.length < 30).map((x) => x.materialCode);
    expect(run.materials.filter((x) => x.source === 'sap').map((x) => x.materialCode)).toEqual(expected);
  });
});

describe('REQ-E14-04 BR-03 edge case — a supplier with fewer than 5 receipts uses the material group’s default, marked', () => {
  const pairs = [
    { supplierId: 'sup-A', materialGroup: 'MG-20' },
    { supplierId: 'sup-B', materialGroup: 'MG-20' },
    { supplierId: 'sup-C', materialGroup: 'MG-99' },
  ];
  const delays = new Map<string, number[]>([
    ['sup-A|MG-20', Array.from({ length: 20 }, (_, i) => i)],
    ['sup-B|MG-20', [30, 30, 30, 30]],
    ['sup-C|MG-99', [1, 2]],
  ]);

  it('known-good: 20 receipts → its own quantile (the 16th of 20: 15 days)', () => {
    const [a] = safetyLeadTimes(delays, pairs, 0.8, 5);
    expect([a.days, a.source]).toEqual([15, 'supplier']);
  });

  it('known-bad: 4 receipts → the group’s pooled quantile (19 days), marked as the group default, not its own 30', () => {
    const [, b] = safetyLeadTimes(delays, pairs, 0.8, 5);
    expect(b.source).toBe('groupDefault');
    // Pooled: 0…19 and four 30s; the 20th of 24 is 19.
    expect(b.days).toBe(19);
    expect(b.receipts).toBe(4);
    // With a fifth receipt it becomes its own.
    const five = safetyLeadTimes(new Map([...delays, ['sup-B|MG-20', [30, 30, 30, 30, 30]]]), pairs, 0.8, 5)[1];
    expect([five.days, five.source]).toEqual([30, 'supplier']);
  });

  it('a group with fewer than 5 receipts in total has no default: 0, marked; early deliveries never give a negative lead time', () => {
    const [, , c] = safetyLeadTimes(delays, pairs, 0.8, 5);
    expect([c.days, c.source]).toEqual([0, 'groupDefault']);
    const [early] = safetyLeadTimes(new Map([['sup-A|MG-20', [-3, -2, -2, -1, -1]]]), pairs.slice(0, 1), 0.8, 5);
    expect(early.days).toBe(0);
  });

  it('on the synthetic data every supplier × group pair is read, and the percentile is the administrator’s (80% vs 50% differ)', () => {
    expect(run.safetyLeadTimes.length).toBeGreaterThan(10);
    const at50 = safetyStockRun(data, opts({ safetyLeadTimePercentile: 0.5 }));
    const sum = (r: typeof run) => r.safetyLeadTimes.reduce((s, x) => s + x.days, 0);
    expect(sum(at50)).toBeLessThan(sum(run));
  });
});

// ── Tiers (BR-02 default, ENG-D14 open) ─────────────────────────────────────

describe('REQ-E14-04 BR-02 — default tiers by volume, marked', () => {
  it('the top 20% of materials by pallet volume get the high target; every tier is marked as the default', () => {
    const high = run.materials.filter((m) => m.tier === 'high');
    expect(high.length).toBe(Math.ceil(0.2 * run.materials.length));
    const minHigh = Math.min(...high.map((m) => m.volumePallets));
    for (const m of run.materials.filter((x) => x.tier !== 'high')) expect(m.volumePallets).toBeLessThanOrEqual(minHigh);
    for (const m of run.materials) {
      expect(m.tierSource).toBe('defaultByVolume');
      expect(m.target).toBe(DEFAULT_SAFETY_STOCK_OPTIONS.targets[m.tier]);
    }
  });

  it('slow mover: needed in fewer than 3 of every 4 weeks — known-good and known-bad on a built dataset', () => {
    const monday = mondayOf(asOf);
    const weeks = Array.from({ length: 52 }, (_, i) => addDays(monday, -7 * (52 - i)));
    const d: Pick<EngineDataset, 'sales' | 'bom' | 'materials' | 'volumes'> = {
      materials: ['RM-EMUL-9410', 'RM-EMUL-9430', 'RM-EMUL-9440', 'RM-COCO-8200', 'RM-PALM-7100'].map((materialCode) => ({ materialCode, kind: 'rawMaterial', uom: 'KG' })),
      volumes: ['RM-EMUL-9410', 'RM-EMUL-9430', 'RM-EMUL-9440', 'RM-COCO-8200', 'RM-PALM-7100'].map((materialCode) => ({ materialCode, unitsPerPallet: 1000 })),
      bom: [
        { parentCode: 'SYN-FG-001', componentCode: 'RM-EMUL-9410', qtyPer: 1, uom: 'KG', scrapPct: 0, validFrom: '2020-01-06' },
        { parentCode: 'SYN-FG-002', componentCode: 'RM-EMUL-9430', qtyPer: 1, uom: 'KG', scrapPct: 0, validFrom: '2020-01-06' },
        { parentCode: 'SYN-FG-003', componentCode: 'RM-EMUL-9440', qtyPer: 1, uom: 'KG', scrapPct: 0, validFrom: '2020-01-06' },
      ],
      sales: [
        // Every week, large: the high tier.
        ...weeks.map((w) => ({ skuCode: 'SYN-FG-001', weekStart: w, quantity: 10_000, stockout: false })),
        // Every other week: average demand interval 2 → slow.
        ...weeks.filter((_, i) => i % 2 === 0).map((w) => ({ skuCode: 'SYN-FG-002', weekStart: w, quantity: 50, stockout: false })),
        // 40 of 52 weeks: interval 1.3 → standard (just under 4/3).
        ...weeks.slice(0, 40).map((w) => ({ skuCode: 'SYN-FG-003', weekStart: w, quantity: 50, stockout: false })),
      ],
    };
    const tiers = defaultTiers(d, asOf, DEFAULT_SAFETY_STOCK_OPTIONS);
    expect(tiers.get('RM-EMUL-9410')!.tier).toBe('high');
    expect(tiers.get('RM-EMUL-9430')!.tier).toBe('slow');
    expect(tiers.get('RM-EMUL-9430')!.averageDemandInterval).toBe(2);
    expect(tiers.get('RM-EMUL-9440')!.tier).toBe('standard');
    // Nothing needed at all: a slow mover, never the high tier.
    expect(tiers.get('RM-COCO-8200')!.tier).toBe('slow');
    expect(tiers.get('RM-PALM-7100')!.tier).toBe('slow');
  });
});

// ── The run on the synthetic data ───────────────────────────────────────────

describe('REQ-E14-04 AC-01 — every material shows its figures with target, window and method', () => {
  it('examined something: every master material, errors over complete windows only', () => {
    expect(run.materials.map((m) => m.materialCode)).toEqual(data.materials.map((m) => m.materialCode).sort());
    const lastSalesWeek = [...new Set(data.sales.map((s) => s.weekStart))].sort().pop()!;
    for (const m of run.materials) {
      for (const e of m.errors) {
        expect(addDays(e.origin, 7 * (m.riskWeeks - 1)) <= lastSalesWeek).toBe(true);
        expect(e.error).toBeCloseTo(e.actual - e.planned, 9);
      }
      expect(m.reorderPoint).toBeCloseTo(m.expectedDemandOverRisk + m.safetyStock, 9);
      expect(m.freedUnits).toBe(m.sapSafetyStock - m.safetyStock);
    }
  });

  it('where the engine’s figure is used, the history meets the target: fill rate on history ≥ target', () => {
    const engine = run.materials.filter((m) => m.source === 'engine' && m.orderQtyPerCycle > 0);
    expect(engine.length).toBeGreaterThan(20);
    for (const m of engine) expect(m.historicalFillRate!).toBeGreaterThanOrEqual(m.target - 1e-9);
  });

  it('the plan’s errors are real (the stand-in SAP plan is imperfect): both signs occur across materials', () => {
    const all = run.materials.flatMap((m) => m.errors.map((e) => e.error));
    expect(all.some((e) => e > 0)).toBe(true);
    expect(all.some((e) => e < 0)).toBe(true);
  });
});

describe('REQ-E14-04 → E14-03 — safety stock and safety lead time feed the netting and the release', () => {
  it('the requirement run nets against E14-04’s safety stock and releases earlier by its safety lead time', () => {
    const inputs = requirementInputs(run);
    const mrp = materialRequirement(data, { ...defaultRequirementOptions(asOf), ...inputs });
    for (const p of mrp.materials) {
      const s = run.materials.find((x) => x.materialCode === p.materialCode)!;
      expect(p.safetyStock).toBe(s.safetyStock);
      expect(p.safetyStockSource).toBe(s.source);
      expect(p.safetyLeadTimeDays).toBe(s.safetyLeadTimeDays);
      for (const w of p.weeks) if (w.releaseWeek) expect(w.releaseWeek).toBe(addDays(w.weekStart, -7 * Math.ceil((p.leadTimeDays + p.safetyLeadTimeDays) / 7)));
    }
    // Known-bad: without E14-04 the same run nets against no safety stock.
    const bare = materialRequirement(data, defaultRequirementOptions(asOf));
    expect(bare.materials.every((p) => p.safetyStock === 0 && p.safetyStockSource === 'none')).toBe(true);
  });
});

// ── AC-03 · an independent recalculation from the stored history ────────────

describe('REQ-E14-04 AC-03 — an independent recalculation from the stored history gives the same safety stock', () => {
  /**
   * Written from the requirement text alone, sharing no code with the module:
   * explode each stored plan snapshot and the sales through the BOM with plain
   * loops, sum the risk window, and search the integers for the smallest
   * safety stock meeting the fill-rate condition.
   */
  function recalc(materialCode: string): number {
    const src = primarySource(data.sources, materialCode)!;
    const W = Math.ceil(src.leadTimeDays / 7) + 1;
    const lines = data.bom.filter((b) => b.componentCode === materialCode);
    const perWeek = (rows: readonly { skuCode: string; weekStart: string; quantity: number }[]) => {
      const out = new Map<string, number>();
      for (const r of rows) {
        for (const b of lines) {
          if (b.parentCode !== r.skuCode) continue;
          if (r.weekStart < b.validFrom || (b.validTo && r.weekStart >= b.validTo)) continue;
          out.set(r.weekStart, (out.get(r.weekStart) ?? 0) + r.quantity * b.qtyPer * (1 + b.scrapPct));
        }
      }
      return out;
    };
    const actual = perWeek(data.sales);
    const monday = mondayOf(asOf);
    const errs: number[] = [];
    for (const o of [...new Set(data.fgPlan.map((p) => p.madeAt))].sort()) {
      if (o >= monday || addDays(o, 7 * (W - 1)) >= monday) continue;
      const plan = perWeek(data.fgPlan.filter((p) => p.madeAt === o));
      let pl = 0;
      let ac = 0;
      for (let i = 0; i < W; i += 1) {
        pl += plan.get(addDays(o, 7 * i)) ?? 0;
        ac += actual.get(addDays(o, 7 * i)) ?? 0;
      }
      if (pl === 0 && ac === 0) continue;
      errs.push(ac - pl);
    }
    const current = perWeek(data.fgPlan.filter((p) => p.madeAt === monday));
    let demand = 0;
    for (let i = 0; i < W; i += 1) demand += current.get(addDays(monday, 7 * i)) ?? 0;
    const weekly = demand / W;
    const Q = weekly > 0 ? Math.max(src.moq, Math.ceil(weekly / src.orderMultiple - 1e-9) * src.orderMultiple) : 0;
    const m = run.materials.find((x) => x.materialCode === materialCode)!;
    const short = (ss: number) => errs.reduce((s, e) => s + Math.max(0, e - ss), 0) / errs.length;
    // Integer search: the smallest ss with short(ss) ≤ (1 − β)·Q.
    let lo = 0;
    let hi = Math.ceil(Math.max(0, ...errs)) + 1;
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (short(mid) <= (1 - m.target) * Q + 1e-9) hi = mid;
      else lo = mid + 1;
    }
    expect(errs.length).toBe(m.errors.length);
    return lo;
  }

  const sample = ['PK-PETB-8801', 'PK-CART-9901', 'PK-CAPF-8820', 'RM-EMUL-9410', 'RM-PALM-7100', 'AI-NIAC-6612'];

  it.each(sample)('%s', (code) => {
    const m = run.materials.find((x) => x.materialCode === code)!;
    expect(m.source).toBe('engine');
    expect(recalc(code)).toBe(m.safetyStock);
  });

  it('the sample is not vacuous: at least half of it carries a positive safety stock', () => {
    expect(sample.filter((c) => run.materials.find((x) => x.materialCode === c)!.safetyStock > 0).length).toBeGreaterThanOrEqual(3);
  });
});

describe('REQ-E14-04 — a zero safety stock is flagged, not floored (owner, 2026-09-23)', () => {
  const flagged = run.materials.filter((m) => m.reliesOnOrderLot);

  it('examined something: at least one named material relies on its order lot alone', () => {
    expect(flagged.length).toBeGreaterThan(0);
    expect(flagged[0].materialCode).toMatch(/^[A-Z]{2}-/);
  });

  it('flags exactly the engine figures at zero with an order expected — and no others', () => {
    for (const m of run.materials) {
      const expected = m.source === 'engine' && m.safetyStock === 0 && m.orderQtyPerCycle > 0;
      expect(m.reliesOnOrderLot, m.materialCode).toBe(expected);
    }
  });

  it('known-good and known-bad: a material with a positive safety stock is never flagged, and no floor is applied', () => {
    const positive = run.materials.find((m) => m.safetyStock > 0)!;
    expect(positive.reliesOnOrderLot).toBe(false);
    for (const m of flagged) expect(m.safetyStock).toBe(0);
  });

  it('a SAP fallback at zero is not flagged — the flag is about the engine’s own result', () => {
    const fallback = safetyStockRun(data, opts({ minOrigins: 10_000 }));
    expect(fallback.materials.every((m) => m.source === 'sap')).toBe(true);
    expect(fallback.materials.some((m) => m.reliesOnOrderLot)).toBe(false);
  });
});
