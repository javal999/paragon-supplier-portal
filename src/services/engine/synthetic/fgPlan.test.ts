// ─────────────────────────────────────────────────────────────────────────────
// The synthetic stand-ins for SAP's finished-goods plan, open sales orders and
// SAP safety stock (E14-03, E14-04 inputs until E14-07 and the MDM feed).
//
// Derived from the generated rows, never restated. The plan must be (a) dated
// no later than the present, (b) snapshot-shaped — past origins plus this
// week's, each covering the declared horizon — and (c) IMPERFECT, or E14-04
// would have no errors to size safety stock from. Each property is probed both
// ways.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import { engineDataset, engineGeneratorInput, ENGINE_DATASET_SEED } from '../../data/mock/fixtures/engineDataset';
import { generateEngineDataset, DEFAULT_SIZES } from './generate';
import { addDays, mondayOf } from '../dates';
import { integrityViolations } from '../integrity';
import { isKnownMaterial } from '../../sdc/materialMaster';
import { mockSuppliers } from '@data/mockSuppliers';
import { SDC_SIMULATED_NOW } from '../../sdc/clock';
import type { EngineDataset } from '../types';

const data = engineDataset();
const present = data.provenance.present;
const thisMonday = mondayOf(present);

/** Mean |plan − actual| ÷ actual, at horizon 0, over SKU-weeks with actual sales. */
function planError(d: EngineDataset): { mape: number; bias: number; n: number } {
  const actual = new Map(d.sales.map((s) => [`${s.skuCode}|${s.weekStart}`, s.quantity]));
  let abs = 0;
  let signed = 0;
  let n = 0;
  for (const p of d.fgPlan) {
    if (p.weekStart !== p.madeAt) continue;
    const a = actual.get(`${p.skuCode}|${p.weekStart}`);
    if (!a) continue;
    abs += Math.abs(p.quantity - a) / a;
    signed += (p.quantity - a) / a;
    n += 1;
  }
  return { mape: abs / n, bias: signed / n, n };
}

describe('SAP finished-goods plan (stand-in) — shape', () => {
  it('snapshots at every past weekly origin plus this week, none made after the present', () => {
    const origins = [...new Set(data.fgPlan.map((p) => p.madeAt))].sort();
    expect(origins.length).toBe(DEFAULT_SIZES.fgPlanOrigins + 1);
    expect(origins[origins.length - 1]).toBe(thisMonday);
    expect(origins[0]).toBe(addDays(thisMonday, -7 * DEFAULT_SIZES.fgPlanOrigins));
    for (const o of origins) expect(mondayOf(o)).toBe(o);
    for (const p of data.fgPlan) {
      expect(p.weekStart >= p.madeAt).toBe(true);
      expect(p.weekStart < addDays(p.madeAt, 7 * DEFAULT_SIZES.fgPlanHorizonWeeks)).toBe(true);
    }
  });

  it('this week’s plan covers the next 26 weeks for every live SKU, and skips a discontinued one', () => {
    const current = data.fgPlan.filter((p) => p.madeAt === thisMonday);
    const weeks = [...new Set(current.map((p) => p.weekStart))].sort();
    expect(weeks.length).toBe(DEFAULT_SIZES.fgPlanHorizonWeeks);
    const gone = data.finishedGoods.find((f) => f.discontinueDate)!;
    expect(current.some((p) => p.skuCode === gone.skuCode)).toBe(false);
    const live = data.finishedGoods.filter((f) => !f.discontinueDate);
    for (const f of live) expect(current.some((p) => p.skuCode === f.skuCode)).toBe(true);
  });

  it('every SKU it names is a finished good; nothing in it is a material (integrity, both ways)', () => {
    const ctx = { isKnownMaterial, isKnownSupplier: (id: string) => mockSuppliers.some((s) => s.id === id) };
    expect(integrityViolations(data, ctx)).toEqual([]);
    const bad: EngineDataset = {
      ...data,
      fgPlan: [...data.fgPlan, { ...data.fgPlan[0], skuCode: 'PK-PETB-8801' }],
      sapSafetyStock: [...data.sapSafetyStock, { materialCode: 'RM-SAMPLE-0001', quantity: 1 }],
    };
    const rules = integrityViolations(bad, ctx).map((v) => `${v.rule}:${v.detail}`);
    expect(rules).toContain('UNKNOWN_FG:PK-PETB-8801');
    expect(rules).toContain('UNKNOWN_MATERIAL:RM-SAMPLE-0001');
  });
});

describe('SAP finished-goods plan (stand-in) — realistically imperfect', () => {
  it('its first-week error against what sold is real but bounded (5–40% MAPE) — and a plan equal to sales scores 0', () => {
    const e = planError(data);
    expect(e.n).toBeGreaterThan(500);
    expect(e.mape).toBeGreaterThan(0.05);
    expect(e.mape).toBeLessThan(0.4);
    const perfect: EngineDataset = {
      ...data,
      fgPlan: data.sales.map((s) => ({ skuCode: s.skuCode, madeAt: s.weekStart, weekStart: s.weekStart, quantity: s.quantity })),
    };
    expect(planError(perfect).mape).toBe(0);
  });

  it('SKUs lean different ways: some over-plan, some under-plan (per-SKU bias)', () => {
    const bySku = data.finishedGoods.map((f) => planError({ ...data, fgPlan: data.fgPlan.filter((p) => p.skuCode === f.skuCode) }));
    const withData = bySku.filter((b) => b.n > 10);
    expect(withData.some((b) => b.bias > 0.03)).toBe(true);
    expect(withData.some((b) => b.bias < -0.03)).toBe(true);
  });
});

describe('open sales orders and SAP safety stock (stand-ins)', () => {
  it('orders fall in this week and next only, and some exceed the plan (so consumption has work to do)', () => {
    const weeks = new Set(data.salesOrders.map((o) => o.weekStart));
    expect([...weeks].sort()).toEqual([thisMonday, addDays(thisMonday, 7)]);
    const plan = new Map(data.fgPlan.filter((p) => p.madeAt === thisMonday).map((p) => [`${p.skuCode}|${p.weekStart}`, p.quantity]));
    expect(data.salesOrders.some((o) => o.quantity > (plan.get(`${o.skuCode}|${o.weekStart}`) ?? 0))).toBe(true);
    expect(data.salesOrders.some((o) => o.quantity < (plan.get(`${o.skuCode}|${o.weekStart}`) ?? 0))).toBe(true);
  });

  it('SAP safety stock: one per master material, never negative', () => {
    expect(data.sapSafetyStock.map((s) => s.materialCode).sort()).toEqual(data.materials.map((m) => m.materialCode).sort());
    for (const s of data.sapSafetyStock) expect(s.quantity).toBeGreaterThanOrEqual(0);
    expect(data.sapSafetyStock.some((s) => s.quantity > 0)).toBe(true);
  });

  it('deterministic, and on its own stream: a different seed changes the plan', () => {
    const again = generateEngineDataset(engineGeneratorInput(SDC_SIMULATED_NOW, ENGINE_DATASET_SEED));
    expect(JSON.stringify(again.fgPlan)).toBe(JSON.stringify(data.fgPlan));
    const other = generateEngineDataset(engineGeneratorInput(SDC_SIMULATED_NOW, ENGINE_DATASET_SEED + 1));
    expect(JSON.stringify(other.fgPlan)).not.toBe(JSON.stringify(data.fgPlan));
  });
});
