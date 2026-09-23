// ─────────────────────────────────────────────────────────────────────────────
// REQ-E14-05 — order sizing within MOQ and warehouse space (METHOD-SPEC M5, M6).
//
// The requirement's worked example VERBATIM (no space limit, then 1,500 of
// room at 1.0 a unit-week); AC-01 (MOQ and multiple on every order), AC-02
// (weekly fill and costed rented space) and AC-03 (the plan cost equals a
// known optimum, found here by brute force); known-good / known-bad probes for
// the capacity constraint and the BR-03 change penalty; the BR-02 fallbacks,
// each marked; the E14-03 chain reconciling on E14-05's orders; determinism.
//
// Material codes are real MATERIAL_MASTER codes.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import {
  cumulativeNeed,
  interimPlan,
  itemCost,
  jointPlan,
  minimumOrder,
  orderPlan,
  plannedReceiptsOf,
  projectedStock,
  singleItemSolver,
  sizedRequirement,
  wagnerWhitinPlan,
  type OrderPlanRun,
  type SizingCosts,
  type SizingItem,
} from './orderSizing';
import { defaultRequirementOptions, materialRequirement, type MaterialRequirementOptions } from './requirement';
import { DEFAULT_SAFETY_STOCK_OPTIONS, requirementInputs, safetyStockRun } from './safetyStock';
import { engineDataset } from '../data/mock/fixtures/engineDataset';
import { isKnownMaterial } from '../sdc/materialMaster';
import type { EngineDataset } from './types';

const NO_SPACE = { capacityPallets: Infinity, rentIdrPerPalletWeek: 0 };

const item = (over: Partial<SizingItem> = {}): SizingItem => ({
  materialCode: 'PK-CART-9901',
  startStock: 0,
  gross: [1000, 1000, 1000],
  receipts: [0, 0, 0],
  safetyStock: 0,
  moq: 0,
  orderMultiple: 1,
  offsetWeeks: 0,
  palletsPerUnit: 1,
  holdingPerUnitWeek: 0.2,
  ...over,
});

const costs = (over: Partial<SizingCosts> = {}): SizingCosts => ({
  orderCostIdr: 500,
  holdingRatePerYear: 0.25,
  rentIdrPerPalletWeek: 1,
  changePenaltyIdrPerPallet: 0,
  ...over,
});

/** The objective, re-implemented independently: K per order, h per unit-week, p per pallet above capacity, λ per pallet changed. */
function objective(
  items: readonly SizingItem[],
  plans: readonly (readonly number[])[],
  capacity: number,
  c: SizingCosts,
): number {
  const T = items[0].gross.length;
  const pallets = new Array<number>(T).fill(0);
  let total = 0;
  items.forEach((it, i) => {
    let s = it.startStock;
    for (let t = 0; t < T; t += 1) {
      const x = plans[i][t];
      s += it.receipts[t] + x - it.gross[t];
      total += (x > 0 ? c.orderCostIdr : 0) + it.holdingPerUnitWeek * s;
      if (it.previous && t < it.offsetWeeks) total += c.changePenaltyIdrPerPallet * it.palletsPerUnit * Math.abs(x - it.previous[t]);
      pallets[t] += s * it.palletsPerUnit;
    }
  });
  return total + pallets.reduce((acc, p) => acc + c.rentIdrPerPalletWeek * Math.max(0, p - capacity), 0);
}

/** Every feasible plan of one item — including orders in weeks that do not need one (a true brute force). */
function allPlans(it: SizingItem): number[][] {
  const cn = cumulativeNeed(it);
  const T = cn.length;
  const step = it.orderMultiple > 0 ? it.orderMultiple : 1;
  const xmin = minimumOrder(it);
  const cap = Math.max(...cn, 0) + xmin + step;
  const out: number[][] = [];
  const walk = (t: number, q: number, acc: number[]) => {
    if (t === T) {
      out.push(acc);
      return;
    }
    const sizes = [0];
    for (let x = xmin; q + x <= cap; x += step) sizes.push(x);
    for (const x of sizes) if (q + x >= cn[t] - 1e-9) walk(t + 1, q + x, [...acc, x]);
  };
  walk(0, 0, []);
  return out;
}

// ── The worked example, verbatim ────────────────────────────────────────────

describe('REQ-E14-05 — the worked example, verbatim (1,000 a week × 3, K = 500, h = 0.2)', () => {
  const it0 = item();
  const c = costs();
  const own = (plan: number[]) => {
    const b = itemCost(it0, plan, c);
    return b.orderingIdr + b.holdingIdr;
  };

  it('the table: one order 1,100; 2,000 then 1,000 in week 3 costs 1,200; weekly costs 1,500', () => {
    expect(own([3000, 0, 0])).toBeCloseTo(1100, 9);
    expect(projectedStock(it0, [3000, 0, 0])).toEqual([2000, 1000, 0]);
    expect(own([2000, 0, 1000])).toBeCloseTo(1200, 9);
    expect(own([1000, 1000, 1000])).toBeCloseTo(1500, 9);
  });

  it('without space limits the engine picks the one big order (1,100)', () => {
    const solver = singleItemSolver(it0, [0, 0, 0], NO_SPACE, c);
    expect(solver.plan()).toEqual([3000, 0, 0]);
    expect(solver.best(0, 0)).toBeCloseTo(1100, 9);
  });

  it('with room for 1,500 at 1.0 a unit-week, the big order costs 1,600 and two orders (1,200) win', () => {
    expect(objective([it0], [[3000, 0, 0]], 1500, c)).toBeCloseTo(1600, 9);
    const res = jointPlan([it0], [0, 0, 0], 1500, c);
    expect(res.plans[0]).toEqual([2000, 0, 1000]);
    expect(res.totalIdr).toBeCloseTo(1200, 9);
    expect(res.plans[0].filter((x) => x > 0)).toHaveLength(2);
  });

  it('through orderPlan, the first order says warehouse space bound it and what it saved', () => {
    const run = exampleRun();
    const plan = orderPlan(run, EXAMPLE_MASTER(1500), { costs: c });
    const [r1, r2] = plan.warehouses[0].materials[0].recommendations;
    expect([r1.quantity, r2.quantity]).toEqual([2000, 1000]);
    expect(r1.binding).toBe('warehouse');
    // Against what unlimited space would order here (3,000, the single order: 1,600) it saves 400.
    expect(r1.alternativeQuantity).toBe(3000);
    expect(r1.savedIdr).toBeCloseTo(400, 9);
    // The last order has no other size to weigh: no saving is claimed.
    expect([r2.savedIdr, r2.alternativeQuantity]).toEqual([null, null]);
    expect(plan.warehouses[0].after.totalIdr).toBeCloseTo(1200, 9);
    expect(plan.warehouses[0].after.rentIdr).toBe(0);
  });

  it('known-good: with room for 3,000 the same run keeps the single order and uses no rented space', () => {
    const plan = orderPlan(exampleRun(), EXAMPLE_MASTER(3000), { costs: c });
    const m = plan.warehouses[0].materials[0];
    expect(m.plannedReceipts).toEqual([3000, 0, 0]);
    expect(m.recommendations[0].binding).toBe('costBalance');
    expect(plan.warehouses[0].after.rentedPalletWeeks).toBe(0);
  });
});

/** The worked example as a requirement run: one packaging material, 1,000 a week for 3 weeks, nothing on hand. */
function exampleRun() {
  const weeks = ['2027-01-04', '2027-01-11', '2027-01-18'];
  return {
    asOf: '2027-01-04',
    planMadeAt: '2027-01-04',
    weeks,
    method: { name: 'MRP gross-to-net', spec: 'METHOD-SPEC M1, M2, M7', version: 1 },
    sizing: 'interim',
    parameters: {} as never,
    materials: [
      {
        materialCode: 'PK-CART-9901',
        kind: 'packaging',
        uom: 'PCS',
        materialGroup: 'MG-23',
        supplierId: 'sup-008',
        leadTimeDays: 0,
        moq: 0,
        orderMultiple: 1,
        safetyStock: 0,
        safetyStockSource: 'engine',
        safetyLeadTimeDays: 0,
        safetyLeadTimeSource: 'none',
        startStock: 0,
        stockDate: '2027-01-04',
        stockFlagged: false,
        reviewRequired: false,
        receipts: [],
        weeks: weeks.map((w) => ({ weekStart: w, gross: 1000, receipts: 0 })),
        totals: {} as never,
      },
    ],
  } as unknown as Parameters<typeof orderPlan>[0];
}
/** Capacity in pallets; 1 unit a pallet; value chosen so h = 0.2 a unit-week at 25% a year. */
const EXAMPLE_MASTER = (capacity: number) => ({
  warehouses: [{ warehouseId: 'SYN-WH-PK', kind: 'packaging' as const, capacityPallets: capacity }],
  volumes: [{ materialCode: 'PK-CART-9901', unitsPerPallet: 1 }],
  materialValues: [{ materialCode: 'PK-CART-9901', unitValueIdr: (0.2 * 52) / 0.25 }],
});

// ── AC-03 · a known optimum ─────────────────────────────────────────────────

describe('REQ-E14-05 AC-03 — the plan cost equals a known optimum (brute force)', () => {
  // Two packaging materials sharing 8 pallets; MOQ and multiples on both; an order costs 1,500 and a rented pallet-week 400.
  const A = item({ materialCode: 'PK-PETB-8801', gross: [400, 400, 400, 400], receipts: [0, 0, 0, 0], moq: 300, orderMultiple: 100, palletsPerUnit: 1 / 100, holdingPerUnitWeek: 1 });
  const B = item({ materialCode: 'PK-CAPF-8820', gross: [300, 0, 300, 300], receipts: [0, 0, 0, 0], moq: 200, orderMultiple: 100, palletsPerUnit: 1 / 50, holdingPerUnitWeek: 1.5 });
  const c = costs({ orderCostIdr: 1500, rentIdrPerPalletWeek: 400 });
  const CAP = 8;

  const bruteForce = (items: SizingItem[], capacity: number, k: SizingCosts) => {
    const per = items.map(allPlans);
    let best = Infinity;
    const rec = (i: number, acc: number[][]) => {
      if (i === items.length) {
        best = Math.min(best, objective(items, acc, capacity, k));
        return;
      }
      for (const p of per[i]) rec(i + 1, [...acc, p]);
    };
    rec(0, []);
    return { best, enumerated: per.reduce((n, p) => n * p.length, 1) };
  };

  it('the published instance: two materials, 4 weeks, 8 pallets — the engine’s cost IS the optimum', () => {
    const brute = bruteForce([A, B], CAP, c);
    expect(brute.enumerated).toBeGreaterThan(1000); // the search was not trivial
    const res = jointPlan([A, B], [0, 0, 0, 0], CAP, c);
    expect(objective([A, B], res.plans, CAP, c)).toBeCloseTo(res.totalIdr, 6);
    expect(res.totalIdr).toBeCloseTo(brute.best, 6);
    expect(brute.best).toBeCloseTo(7650, 6);
    expect(res.plans).toEqual([
      [1200, 0, 0, 400],
      [300, 0, 600, 0],
    ]);
    // …and capacity really binds here: without the space term the plan would cost more.
    const free = [A, B].map((it) => singleItemSolver(it, [0, 0, 0, 0], NO_SPACE, c).plan());
    expect(objective([A, B], free, CAP, c)).toBeGreaterThan(brute.best + 1);
  });

  it('the single-material program is exact: 40 seeded instances, with and without space, match brute force', () => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
    for (let n = 0; n < 40; n += 1) {
      const it = item({
        gross: [0, 1, 2, 3].map(() => Math.floor(rnd() * 6) * 100),
        receipts: [0, 0, 0, 0],
        startStock: Math.floor(rnd() * 3) * 100,
        safetyStock: Math.floor(rnd() * 2) * 50,
        moq: Math.floor(rnd() * 4) * 100,
        orderMultiple: 100,
        palletsPerUnit: 1 / 100,
        holdingPerUnitWeek: 0.5 + rnd() * 2,
      });
      const k = costs({ orderCostIdr: 100 + rnd() * 400, rentIdrPerPalletWeek: 50 + rnd() * 100 });
      const others = [0, 1, 2, 3].map(() => rnd() * 4);
      const space = { capacityPallets: 5, rentIdrPerPalletWeek: k.rentIdrPerPalletWeek };
      const cost = (p: number[]) => {
        let s = it.startStock;
        return p.reduce((acc, x, t) => {
          s += x - it.gross[t];
          return acc + (x > 0 ? k.orderCostIdr : 0) + it.holdingPerUnitWeek * s + space.rentIdrPerPalletWeek * Math.max(0, others[t] + s / 100 - 5);
        }, 0);
      };
      const brute = Math.min(...allPlans(it).map(cost));
      expect(singleItemSolver(it, others, space, k).best(0, 0), `instance ${n}`).toBeCloseTo(brute, 6);
    }
  });

  it('the joint heuristic on 30 seeded two-material instances: never below the optimum, and its gap is measured', () => {
    let seed = 11;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
    let exact = 0;
    let worstGap = 0;
    for (let n = 0; n < 30; n += 1) {
      const mk = (code: string) =>
        item({
          materialCode: code,
          gross: [0, 1, 2, 3].map(() => Math.floor(rnd() * 5) * 100),
          receipts: [0, 0, 0, 0],
          moq: Math.floor(rnd() * 3) * 100,
          orderMultiple: 100,
          palletsPerUnit: 1 / (50 + Math.floor(rnd() * 3) * 50),
          holdingPerUnitWeek: 0.5 + rnd() * 2,
        });
      const items = [mk('PK-PETB-8801'), mk('PK-CAPF-8820')];
      const k = costs({ orderCostIdr: 150 + rnd() * 300, rentIdrPerPalletWeek: 40 + rnd() * 80 });
      const cap = 3 + Math.floor(rnd() * 6);
      const brute = bruteForce(items, cap, k).best;
      const got = jointPlan(items, [0, 0, 0, 0], cap, k).totalIdr;
      expect(got, `instance ${n}`).toBeGreaterThanOrEqual(brute - 1e-6);
      if (got <= brute + 1e-6) exact += 1;
      worstGap = Math.max(worstGap, (got - brute) / brute);
    }
    // Measured on these seeds (a heuristic, M5): recorded so a regression shows.
    expect(exact).toBeGreaterThanOrEqual(28);
    expect(worstGap).toBeLessThan(0.05);
  });
});

// ── Capacity probes ─────────────────────────────────────────────────────────

describe('REQ-E14-05 BR-01 — the warehouse limit, probed both ways', () => {
  const heavy = item({ gross: [500, 500, 500, 500], receipts: [0, 0, 0, 0], palletsPerUnit: 1 / 10, holdingPerUnitWeek: 0.1, moq: 0, orderMultiple: 100 });
  const c = costs({ orderCostIdr: 400, rentIdrPerPalletWeek: 20 });

  it('known-good: ample room — the joint plan IS each material’s free plan, and no rent', () => {
    const free = singleItemSolver(heavy, [0, 0, 0, 0], NO_SPACE, c).plan();
    const res = jointPlan([heavy], [0, 0, 0, 0], 1000, c);
    expect(res.plans[0]).toEqual(free);
    expect(free.filter((x) => x > 0)).toHaveLength(1); // one order of 2,000 when space is free
  });

  it('known-bad: 60 pallets already full of other stock — the lot is split, and rent falls against the free plan', () => {
    const fixed = [55, 55, 55, 55];
    const free = singleItemSolver(heavy, [0, 0, 0, 0], NO_SPACE, c).plan();
    const res = jointPlan([heavy], fixed, 60, c);
    const rent = (p: readonly number[]) => projectedStock(heavy, p).reduce((s, x, t) => s + Math.max(0, fixed[t] + x / 10 - 60), 0);
    expect(res.plans[0].filter((x) => x > 0).length).toBeGreaterThan(1);
    expect(rent(res.plans[0])).toBeLessThan(rent(free));
    expect(res.totalIdr).toBeLessThan(objective([heavy], [free], 60, c) - 1);
  });

  it('pallets that count against capacity are every material’s END-of-week stock, as E14-03 projects it', () => {
    expect(projectedStock(heavy, [2000, 0, 0, 0])).toEqual([1500, 1000, 500, 0]);
  });
});

// ── BR-03 · change penalty ──────────────────────────────────────────────────

describe('REQ-E14-05 BR-03 — the change penalty inside the lead time, probed both ways', () => {
  // Last run planned 1,000 a week; this run's cheapest plan is one order of 3,000.
  const previous = [1000, 1000, 1000];
  const c = (lambda: number) => costs({ changePenaltyIdrPerPallet: lambda });

  it('known-bad (churn): no penalty — the plan re-sizes inside the lead time', () => {
    const plan = singleItemSolver(item({ offsetWeeks: 3, previous }), [0, 0, 0], NO_SPACE, c(0)).plan();
    expect(plan).toEqual([3000, 0, 0]);
  });

  it('with a penalty that outweighs the saving, the planned orders are kept, and the reason says so', () => {
    const it0 = item({ offsetWeeks: 3, previous });
    expect(singleItemSolver(it0, [0, 0, 0], NO_SPACE, c(1)).plan()).toEqual([1000, 1000, 1000]);
    const run = exampleRun();
    const plan = orderPlan(run, EXAMPLE_MASTER(1e9), {
      costs: c(1),
      previous: new Map([['PK-CART-9901', new Map(run.weeks.map((w) => [w, 1000] as const))]]),
    });
    // The example run has a 0-day lead time: nothing is inside it, so nothing is kept.
    expect(plan.warehouses[0].materials[0].plannedReceipts).toEqual([3000, 0, 0]);
    const inside = { ...run, materials: [{ ...run.materials[0], leadTimeDays: 21 }] };
    const kept = orderPlan(inside, EXAMPLE_MASTER(1e9), {
      costs: c(1),
      previous: new Map([['PK-CART-9901', new Map(run.weeks.map((w) => [w, 1000] as const))]]),
    });
    const m = kept.warehouses[0].materials[0];
    expect(m.plannedReceipts).toEqual([1000, 1000, 1000]);
    expect(m.recommendations.every((r) => r.binding === 'changePenalty' && r.insideLeadTime && r.previousQuantity === 1000)).toBe(true);
    expect(kept.hasPreviousPlan).toBe(true);
  });

  it('outside the lead time the same penalty does not apply (it is a close-in rule only)', () => {
    const plan = singleItemSolver(item({ offsetWeeks: 0, previous }), [0, 0, 0], NO_SPACE, c(1_000_000)).plan();
    expect(plan).toEqual([3000, 0, 0]);
  });

  it('an unchanged plan costs no penalty (known-good)', () => {
    const it0 = item({ offsetWeeks: 3, previous: [3000, 0, 0] });
    expect(itemCost(it0, [3000, 0, 0], c(1_000)).changePenaltyIdr).toBe(0);
    expect(itemCost(it0, [2000, 0, 1000], c(1_000)).changePenaltyIdr).toBe(1_000 * 2000);
  });
});

// ── BR-02 · the fallbacks ───────────────────────────────────────────────────

describe('REQ-E14-05 BR-02 — the single-material fallback (Wagner–Whitin, then round up)', () => {
  it('Wagner–Whitin on the worked example gives the single order (1,100)', () => {
    const it0 = item();
    const p = wagnerWhitinPlan(it0, 500);
    expect(p).toEqual([3000, 0, 0]);
  });

  it('then rounded up to MOQ and multiple: a lot of 3,000 with MOQ 5,000 becomes 5,000, and later lots are absorbed', () => {
    const p = wagnerWhitinPlan(item({ gross: [1000, 1000, 1000, 1000, 1000, 1000], receipts: [0, 0, 0, 0, 0, 0], moq: 5000, orderMultiple: 1000, holdingPerUnitWeek: 0.2 }), 500);
    expect(p[0]).toBe(5000);
    expect(p.every((x) => x === 0 || (x >= 5000 && x % 1000 === 0))).toBe(true);
    expect(cumulativeNeed(item({ gross: [1000, 1000, 1000, 1000, 1000, 1000], receipts: [0, 0, 0, 0, 0, 0] })).every((n, t) => p.slice(0, t + 1).reduce((a, b) => a + b, 0) >= n)).toBe(true);
  });
});

// ── On the synthetic dataset ────────────────────────────────────────────────

const PLACEHOLDER_COSTS: SizingCosts = {
  orderCostIdr: 750_000,
  holdingRatePerYear: 0.25,
  rentIdrPerPalletWeek: 35_000,
  changePenaltyIdrPerPallet: 150_000,
};

function syntheticChain(data: EngineDataset = engineDataset(), joint = true) {
  const asOf = data.provenance.present;
  const ss = safetyStockRun(data, { ...DEFAULT_SAFETY_STOCK_OPTIONS, asOf });
  const options: MaterialRequirementOptions = { ...defaultRequirementOptions(asOf), ...requirementInputs(ss) };
  return { options, ...sizedRequirement(data, options, { costs: PLACEHOLDER_COSTS, joint }) };
}

describe('REQ-E14-05 — on the synthetic dataset', () => {
  const data = engineDataset();
  const { plan, sized, interim } = syntheticChain(data);
  const byKind = (p: OrderPlanRun, k: string) => p.warehouses.find((w) => w.kind === k)!;

  it('examined something: two separate warehouses (ENG-D7), every master material, joint sizing ran, orders placed', () => {
    expect(plan.warehouses.map((w) => [w.kind, w.warehouseId, w.capacityPallets, w.method])).toEqual([
      ['packaging', 'SYN-WH-PK', 1800, 'joint'],
      ['rawMaterial', 'SYN-WH-RM', 1200, 'joint'],
    ]);
    const codes = plan.warehouses.flatMap((w) => w.materials.map((m) => m.materialCode));
    expect(codes.sort()).toEqual(data.materials.map((m) => m.materialCode).sort());
    for (const c of codes) expect(isKnownMaterial(c)).toBe(true);
    expect(byKind(plan, 'packaging').after.orders).toBeGreaterThan(0);
    // The contract addition (MaterialValue): one positive value per master material, synthetic.
    expect(data.materialValues.map((v) => v.materialCode).sort()).toEqual(data.materials.map((m) => m.materialCode).sort());
    expect(data.materialValues.every((v) => v.unitValueIdr > 0)).toBe(true);
  });

  it('AC-01: every recommended order respects its MOQ and its multiple (and a tampered one would not)', () => {
    let n = 0;
    for (const w of plan.warehouses) {
      for (const m of w.materials) {
        for (const r of m.recommendations) {
          expect(r.quantity).toBeGreaterThanOrEqual(m.moq);
          expect(r.quantity % m.orderMultiple).toBe(0);
          n += 1;
        }
      }
    }
    expect(n).toBeGreaterThan(20);
    const m = byKind(plan, 'packaging').materials.find((x) => x.recommendations.length > 0)!;
    const tampered = m.recommendations[0].quantity + m.orderMultiple / 2;
    expect(tampered % m.orderMultiple).not.toBe(0);
  });

  it('AC-02: the fill is shown for every week, against owned capacity; rented space is the overflow, costed at the rate', () => {
    for (const w of plan.warehouses) {
      expect(w.weeks).toHaveLength(26);
      let rent = 0;
      w.weeks.forEach((wk, t) => {
        const pallets = w.materials.reduce((s, m) => s + m.projectedStock[t] / m.unitsPerPallet!, 0);
        expect(wk.pallets).toBeCloseTo(pallets, 6);
        expect(wk.fill).toBeCloseTo(pallets / w.capacityPallets!, 9);
        expect(wk.rentedPallets).toBeCloseTo(Math.max(0, pallets - w.capacityPallets!), 6);
        expect(wk.rentIdr).toBeCloseTo(wk.rentedPallets * PLACEHOLDER_COSTS.rentIdrPerPalletWeek, 3);
        rent += wk.rentIdr;
      });
      expect(w.after.rentIdr).toBeCloseTo(rent, 3);
    }
    // The packaging warehouse starts above capacity (BL-102 calibration), so rent is not zero.
    expect(byKind(plan, 'packaging').after.rentedPalletWeeks).toBeGreaterThan(0);
  });

  it('the joint plan never costs more than the interim round-up, and packaging needs fewer orders', () => {
    for (const w of plan.warehouses) expect(w.after.totalIdr).toBeLessThanOrEqual(w.before.totalIdr + 1e-3);
    const pk = byKind(plan, 'packaging');
    expect(pk.after.orders).toBeLessThan(pk.before.orders);
    expect(pk.before.orders).toBe(interim.materials.filter((m) => m.kind === 'packaging').reduce((s, m) => s + m.totals.plannedOrders, 0));
  });

  it('no plan can go below the lot-for-lot floor, and the E14-05 fill never does', () => {
    for (const w of plan.warehouses) for (const wk of w.weeks) expect(wk.pallets).toBeGreaterThanOrEqual(wk.lowestPallets - 1e-6);
  });

  it('E14-03 now takes its planned orders from E14-05 and still reconciles, week by week', () => {
    expect(sized.sizing).toBe('orderSizing');
    expect(interim.sizing).toBe('interim');
    const receipts = plannedReceiptsOf(plan);
    let checked = 0;
    for (const m of sized.materials) {
      let prevEnd = m.startStock;
      for (const w of m.weeks) {
        expect(w.plannedReceipt).toBe(receipts.get(m.materialCode)?.get(w.weekStart) ?? 0);
        expect(w.projectedStart).toBeCloseTo(prevEnd, 6);
        expect(w.net).toBeCloseTo(Math.max(0, w.gross + w.safetyStock - (w.projectedStart + w.receipts)), 6);
        expect(w.projectedEnd).toBeCloseTo(w.projectedStart + w.receipts + w.plannedReceipt - w.gross, 6);
        if (w.net > 0) expect(w.plannedReceipt).toBeGreaterThanOrEqual(w.net - 1e-6);
        expect(w.projectedEnd).toBeGreaterThanOrEqual(w.safetyStock - 1e-6);
        prevEnd = w.projectedEnd;
        checked += 1;
      }
    }
    expect(checked).toBe(sized.materials.length * 26);
  });

  it('each recommendation carries its reason: a binding constraint and, for joint sizing, the saving against the next-best size', () => {
    const recs = plan.warehouses.flatMap((w) => w.materials.flatMap((m) => m.recommendations));
    expect(recs.every((r) => r.method === 'joint')).toBe(true);
    // A saving is claimed wherever another size was possible, and is never negative.
    expect(recs.every((r) => r.savedIdr === null || r.savedIdr >= 0)).toBe(true);
    expect(recs.filter((r) => r.savedIdr !== null).length).toBeGreaterThan(recs.length / 2);
    // No saving is claimed only where the order covers every remaining week (no other size).
    for (const r of recs.filter((x) => x.savedIdr === null)) expect(r.weekStart).toBe(plan.weeks[plan.weeks.length - 1]);
    expect(new Set(recs.map((r) => r.binding)).size).toBeGreaterThan(1);
  });

  it('deterministic: the same inputs give an identical plan', () => {
    expect(syntheticChain(data).plan).toEqual(plan);
  });

  it('BR-02 marked: joint off → every material by Wagner–Whitin, the warehouse says why', () => {
    const off = syntheticChain(data, false).plan;
    for (const w of off.warehouses) {
      expect([w.method, w.fallbackReason]).toEqual(['fallback', 'JOINT_OFF']);
      for (const m of w.materials) {
        expect(m.method).toBe('wagnerWhitin');
        for (const r of m.recommendations) expect(r.quantity % m.orderMultiple === 0 && r.quantity >= m.moq).toBe(true);
      }
    }
  });

  it('BR-02 marked: a material with no value keeps the interim round-up; one with no pallet volume stops the joint run for its warehouse', () => {
    const noValue = syntheticChain({ ...data, materialValues: data.materialValues.filter((v) => v.materialCode !== 'PK-CART-9901') }).plan;
    const m = byKind(noValue, 'packaging').materials.find((x) => x.materialCode === 'PK-CART-9901')!;
    expect([m.method, m.fallbackReason]).toEqual(['interim', 'NO_VALUE: PK-CART-9901']);
    expect(m.plannedReceipts).toEqual(m.interimReceipts);
    expect(byKind(noValue, 'packaging').method).toBe('joint');
    const noVolume = syntheticChain({ ...data, volumes: data.volumes.filter((v) => v.materialCode !== 'PK-CART-9901') }).plan;
    expect(byKind(noVolume, 'packaging').fallbackReason).toBe('NO_VOLUME: PK-CART-9901');
    expect(byKind(noVolume, 'rawMaterial').method).toBe('joint');
  });
});

describe('REQ-E14-05 edge case — an MOQ larger than the horizon’s demand is flagged for the buyer', () => {
  it('known-bad flagged, known-good not', () => {
    const run = exampleRun();
    const big = { ...run, materials: [{ ...run.materials[0], moq: 5000, orderMultiple: 1000 }] };
    expect(orderPlan(big, EXAMPLE_MASTER(1e9), { costs: costs() }).warehouses[0].materials[0].moqExceedsHorizonDemand).toBe(true);
    expect(orderPlan(run, EXAMPLE_MASTER(1e9), { costs: costs() }).warehouses[0].materials[0].moqExceedsHorizonDemand).toBe(false);
  });
});

describe('REQ-E14-03 × E14-05 — the E14-03 worked example still sizes to 15,000', () => {
  it('12,400 net in week 10, MOQ 10,000, multiple 5,000 → one order of 15,000 (the only week of need)', () => {
    const gross = new Array(10).fill(0);
    gross[9] = 20_400;
    const receipts = new Array(10).fill(0);
    receipts[9] = 6000;
    const it0 = item({ gross, receipts, startStock: 5000, safetyStock: 3000, moq: 10_000, orderMultiple: 5_000, holdingPerUnitWeek: 1 });
    const plan = singleItemSolver(it0, new Array(10).fill(0), NO_SPACE, costs()).plan();
    expect(plan[9]).toBe(15_000);
    expect(plan.filter((x) => x > 0)).toHaveLength(1);
    expect(interimPlan(it0)[9]).toBe(15_000);
  });

  it('materialRequirement without E14-05 input stays interim (the fallback path is kept)', () => {
    const data = engineDataset();
    expect(materialRequirement(data, defaultRequirementOptions(data.provenance.present)).sizing).toBe('interim');
  });
});
