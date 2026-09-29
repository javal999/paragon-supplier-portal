import { describe, it, expect } from 'vitest';
import { engineDataset } from '../data/mock/fixtures/engineDataset';
import { addDays } from './dates';
import { demandForecast, type MainModel } from './demandForecast';
import { DEFAULT_SERVICE_TARGETS, fillRateSafetyStock } from './safetyStock';
import { interimOrderSize, netMaterial, offsetWeeks } from './requirement';
import { wagnerWhitinPlan } from './orderSizing';
import {
  MIN_ERRORS,
  PLAN_WEEKS,
  REVIEW_WEEKS,
  accuracy,
  backtestOrigins,
  mainModelVerdicts,
  modelBacktest,
  prepareBacktest,
  replayItem,
  selectModel,
  skuService,
  type BacktestInput,
  type CandidateScore,
  type ReplayItem,
} from './modelBacktest';

// ─────────────────────────────────────────────────────────────────────────────
// REQ-E14-10 — choosing models by service, not accuracy (BL-112).
// ─────────────────────────────────────────────────────────────────────────────

const MONDAYS = (n: number, from = '2026-01-05') => Array.from({ length: n }, (_, i) => addDays(from, 7 * i));

/** A small item: one-week lead, lot-for-lot (MOQ 1, a cheap order), SAP's safety stock 0. */
const item = (actual: number[], over: Partial<ReplayItem> = {}): ReplayItem => ({
  materialCode: 'X-TEST',
  kind: 'packaging',
  weeks: MONDAYS(actual.length),
  actual,
  leadTimeDays: 7,
  moq: 1,
  orderMultiple: 1,
  palletsPerUnit: 0.01,
  holdingPerUnitWeek: 1,
  target: 0.9,
  fallbackSafetyStock: 0,
  ...over,
});

/** One version (origin 0) of a flat forecast, long enough for the replay and its look-ahead. */
const flat = (n: number, v: number) => [new Array<number>(n + 30).fill(v)];

const score = (candidate: CandidateScore['candidate'], fillRate: number, palletWeeks: number, masc: number | null = null): CandidateScore => ({
  candidate,
  fillRate,
  orderCompleteRate: fillRate,
  unitFillRate: fillRate,
  palletWeeks,
  counts: { lines: 100, fullLines: Math.round(fillRate * 100), orderWeeks: 100, completeWeeks: Math.round(fillRate * 100) },
  masc,
  wape: null,
  bias: null,
});

describe('E14-10 — the more accurate model can lose on service (Chin et al. 2026)', () => {
  // Demand swings around 105 a week. Model A forecasts 104 (close to the mean, a
  // little low); model B forecasts 125 (well above: less accurate, biased high).
  const demand = [100, 120, 80, 110, 90, 130, 100, 120, 80, 110, 90, 130];
  const A = replayItem(item(demand), flat(demand.length, 104), [0], 1);
  const B = replayItem(item(demand), flat(demand.length, 125), [0], 1);
  const accA = accuracy(demand, new Array(demand.length).fill(104));
  const accB = accuracy(demand, new Array(demand.length).fill(125));

  it('A is the more accurate forecast (lower WAPE, smaller bias)', () => {
    expect(accA.wape!).toBeLessThan(accB.wape!);
    expect(Math.abs(accA.bias!)).toBeLessThan(Math.abs(accB.bias!));
  });

  it('but B fills more weeks in full when PTI’s ordering is replayed on each', () => {
    const sA = skuService([A]);
    const sB = skuService([B]);
    expect(sA.fillRate!).toBeLessThan(sB.fillRate!);
    expect(sB.fillRate).toBe(1);
    // …at the cost of more stock: the space is the trade-off the selection weighs.
    expect(sB.palletWeeks).toBeGreaterThan(sA.palletWeeks);
  });

  it('so selection by service chooses B over the more accurate A (A the floor)', () => {
    const sA = skuService([A]);
    const sB = skuService([B]);
    const pick = selectModel(
      [
        { candidate: 'comb', ...sA, masc: null, ...accA },
        { candidate: 'theta', ...sB, masc: null, ...accB },
      ],
      'comb',
      null,
    );
    expect(pick.chosen).toBe('theta');
    expect(pick.reason).toBe('beatsFloor');
  });
});

describe('E14-10 BR-04 — the statistical fallback is the floor', () => {
  it('a candidate with a LOWER fill rate is never chosen, however little space it takes', () => {
    const s = selectModel([score('comb', 0.95, 1000), score('theta', 0.94, 10)], 'comb', null);
    expect(s.chosen).toBe('comb');
    expect(s.reason).toBe('floor');
    expect(s.beatsFloor).toEqual([]);
  });

  it('an equal fill rate needs less space to beat the floor; equal fill and more space does not', () => {
    expect(selectModel([score('comb', 0.95, 1000), score('theta', 0.95, 999)], 'comb', null).chosen).toBe('theta');
    expect(selectModel([score('comb', 0.95, 1000), score('theta', 0.95, 1001)], 'comb', null).chosen).toBe('comb');
    expect(selectModel([score('comb', 0.95, 1000), score('theta', 0.95, 1000)], 'comb', null).chosen).toBe('comb');
  });

  it('SAP’s plan is the benchmark and is never chosen, even when it beats the floor', () => {
    const s = selectModel([score('comb', 0.9, 1000), score('theta', 0.89, 900), score('sapPlan', 0.99, 10)], 'comb', null);
    expect(s.chosen).toBe('comb');
    expect(s.beatsFloor).toEqual([]);
  });

  it('among several that beat the floor: the best fill rate, then the least space', () => {
    const s = selectModel([score('comb', 0.9, 1000), score('theta', 0.95, 1200), score('main', 0.95, 1100)], 'comb', null);
    expect(s.chosen).toBe('main');
    expect(s.beatsFloor).toEqual(['theta', 'main']);
  });

  it('throws when the floor has no score (never silently picks something else)', () => {
    expect(() => selectModel([score('theta', 0.9, 1)], 'comb', null)).toThrow(/floor 'comb'/);
  });
});

describe('E14-10 BR-03 / ENG-D13 — the MASC limit', () => {
  const scores = [score('comb', 0.9, 1000, 0.4), score('theta', 0.97, 900, 1.8)];

  it('no limit set (null): not enforced — the unstable but better candidate is chosen', () => {
    const s = selectModel(scores, 'comb', null);
    expect(s.chosen).toBe('theta');
    expect(s.overMascLimit).toEqual([]);
  });

  it('a limit below the candidate’s MASC excludes it: the floor stays, and the reason says so', () => {
    const s = selectModel(scores, 'comb', 1.0);
    expect(s.chosen).toBe('comb');
    expect(s.reason).toBe('mascLimit');
    expect(s.overMascLimit).toEqual(['theta']);
  });

  it('a limit at or above its MASC lets it through (the guard probed both ways)', () => {
    expect(selectModel(scores, 'comb', 1.8).chosen).toBe('theta');
    expect(selectModel(scores, 'comb', 2).chosen).toBe('theta');
  });

  it('the floor is not removed by the limit, even when its own MASC is over it', () => {
    const s = selectModel([score('comb', 0.9, 1000, 5), score('theta', 0.8, 900, 0.1)], 'comb', 1);
    expect(s.chosen).toBe('comb');
  });
});

describe('E14-10 BR-02 — the replay runs PTI’s real E14-04 → E14-03 → E14-05 functions', () => {
  // Varying demand, a forecast a little high, a lead of two weeks, an MOQ and a
  // multiple, long enough that the safety stock comes from the plan's own errors.
  const demand = Array.from({ length: 20 }, (_, i) => 200 + ((i * 37) % 90) - 45);
  const it0 = item(demand, { leadTimeDays: 14, moq: 250, orderMultiple: 50, fallbackSafetyStock: 80 });
  const version = new Array<number>(60).fill(210);
  const r = replayItem(it0, [version], [0], 500);
  const L = offsetWeeks(14, 0);
  const W = L + REVIEW_WEEKS;

  it('uses SAP’s safety stock until MIN_ERRORS closed windows exist, then E14-04’s fill-rate rule on them', () => {
    const firstOwn = r.trace.findIndex((w) => w.safetyStockSource === 'errors');
    expect(firstOwn).toBe(W + MIN_ERRORS - 1);
    expect(r.trace.slice(0, firstOwn).every((w) => w.safetyStock === 80)).toBe(true);
    // Week t's safety stock, recomputed by hand with E14-04's own function.
    const t = 15;
    const errors: number[] = [];
    for (let u = 0; u <= t - W; u += 1) {
      let e = 0;
      for (let i = 0; i < W; i += 1) e += demand[u + i] - 210;
      errors.push(e);
    }
    const q = interimOrderSize(((210 * W) / W) * REVIEW_WEEKS, 250, 50);
    expect(r.trace[t].safetyStock).toBe(fillRateSafetyStock(errors, q, 0.9));
  });

  it('the lot released each week is E14-05’s sizing of E14-03’s netted projection', () => {
    for (const t of [3, 12]) {
      const before = r.trace[t - 1];
      const onHand = before.endStock;
      const span = it0.weeks.slice(t, t + L);
      // Receipts already on the way: what arrives in weeks t … t+L−1 (released L weeks earlier).
      const receipts = new Map(span.map((w, i) => [w, r.trace[t + i].received] as const));
      const netted = netMaterial({
        weeks: span,
        currentWeek: it0.weeks[t],
        startStock: onHand,
        gross: new Map(span.map((w) => [w, 210] as const)),
        receipts,
        safetyStock: r.trace[t].safetyStock,
        leadTimeDays: 14,
        safetyLeadTimeDays: 0,
        moq: 250,
        orderMultiple: 50,
        plannedReceipts: new Map(),
      });
      const plan = wagnerWhitinPlan(
        {
          materialCode: 'X-TEST',
          startStock: netted[netted.length - 1].projectedEnd,
          gross: new Array(PLAN_WEEKS).fill(210),
          receipts: new Array(PLAN_WEEKS).fill(0),
          safetyStock: r.trace[t].safetyStock,
          moq: 250,
          orderMultiple: 50,
          offsetWeeks: 0,
          palletsPerUnit: 0.01,
          holdingPerUnitWeek: 1,
        },
        500,
      );
      expect(r.trace[t].released, `week ${t}`).toBe(plan[0]);
      // …and it arrives after the lead time.
      if (t + L < demand.length) expect(r.trace[t + L].received).toBeGreaterThanOrEqual(plan[0]);
    }
  });

  it('every released lot respects the MOQ and the multiple; what cannot be served is lost, not back-ordered', () => {
    for (const w of r.trace) if (w.released > 0) expect(w.released >= 250 && w.released % 50 === 0).toBe(true);
    for (const w of r.trace) expect(w.served).toBeLessThanOrEqual(w.demand);
    // Only weeks an order could reach are measured.
    expect(r.trace.filter((w) => w.measured).length).toBe(demand.length - L);
  });
});

// ── On the synthetic dataset ────────────────────────────────────────────────

const data = engineDataset();
const input: BacktestInput = {
  data,
  asOf: data.provenance.present,
  targets: DEFAULT_SERVICE_TARGETS,
  costs: { orderCostIdr: 750_000, holdingRatePerYear: 0.25 },
};
const prep = prepareBacktest(input);
const run = modelBacktest(prep, null);

describe('E14-10 on the synthetic history', () => {
  it('BR-01 — the origins the two-year history allows: six, from SAP’s first snapshot, 11.11 and Ramadan 1447 covered', () => {
    expect(backtestOrigins(data, input.asOf)).toEqual(['2025-09-01', '2025-11-03', '2026-01-05', '2026-03-09', '2026-05-11', '2026-07-13']);
    const at = (o: string) => run.origins.find((x) => x.weekStart === o)!;
    // The 11.11 week (Mon 10 Nov 2025) is a double-date week driven by the 3 Nov version.
    expect(at('2025-11-03').events).toContain('doubleDate');
    // Ramadan 1447 (18 Feb – 19 Mar 2026) and Lebaran: forecast from 5 Jan, and from inside it on 9 Mar.
    expect(at('2026-01-05').ramadan).toBe('H1447');
    expect(at('2026-03-09').ramadan).toBe('H1447');
    expect(run.replay).toMatchObject({ from: '2025-09-01', to: '2026-08-24', historyFrom: '2024-09-02' });
  });

  it('compares the SKUs with a season of history; new SKUs stay on SAP’s plan (ENG-B63) and are named', () => {
    expect(run.excluded.map((e) => [e.skuCode, e.reason])).toEqual([
      ['SYN-FG-005', 'newSku'],
      ['SYN-FG-010', 'newSku'],
      ['SYN-FG-015', 'newSku'],
      ['SYN-FG-020', 'newSku'],
    ]);
    expect(run.skus.map((s) => s.skuCode)).toContain('SYN-FG-008'); // discontinued in July: compared while it sold
    expect(run.skus.every((s) => s.floor === 'comb' && s.skuClass === 'regular')).toBe(true);
    expect(run.mainModel).toBe('notBuilt');
    expect(run.skus.every((s) => !s.scores.some((x) => x.candidate === 'main'))).toBe(true);
  });

  it('AC-02 — the chosen model never has a lower simulated fill rate than the fallback; SAP’s plan is never chosen', () => {
    for (const s of run.skus) {
      const f = (c: string) => s.scores.find((x) => x.candidate === c)!.fillRate!;
      expect(f(s.selection.chosen), s.skuCode).toBeGreaterThanOrEqual(f(s.floor));
      expect(s.selection.chosen).not.toBe('sapPlan');
    }
    expect(run.summary.chosenCounts.sapPlan).toBe(0);
  });

  it('the Comb and Theta at an origin are exactly what E14-07 would have forecast that day', () => {
    const o = '2026-01-05';
    const k = prep.originWeeks.indexOf(o);
    const df = demandForecast({ finishedGoods: data.finishedGoods, sales: data.sales, asOf: o });
    for (const sku of ['SYN-FG-001', 'SYN-FG-013']) {
      const mine = prep.skuVersions.get(sku)!;
      const theirs = df.skus.find((s) => s.skuCode === sku)!;
      expect(mine.get('comb')![k]).toEqual(theirs.base);
      expect(mine.get('theta')![k]).toEqual(theirs.theta);
    }
    // SAP's plan candidate is the snapshot made on that Monday.
    const sap = data.fgPlan.find((p) => p.madeAt === o && p.skuCode === 'SYN-FG-001' && p.weekStart === o)!;
    expect(prep.skuVersions.get('SYN-FG-001')!.get('sapPlan')![k][0]).toBe(sap.quantity);
  });

  it('shows the MASC spread per candidate so the limit can be chosen (ENG-D13 not set: not enforced)', () => {
    expect(run.mascLimit).toBeNull();
    const theta = run.mascSpread.find((m) => m.candidate === 'theta')!;
    expect(theta.values).toBe(run.skus.length);
    expect(theta.min!).toBeLessThanOrEqual(theta.median!);
    expect(theta.median!).toBeLessThanOrEqual(theta.max!);
    // Setting a limit below every Theta MASC keeps every SKU on the floor.
    const strict = modelBacktest(prep, theta.min! / 2);
    expect(strict.summary.chosenCounts.theta).toBe(0);
    expect(strict.skus.filter((s) => s.selection.reason === 'mascLimit').length).toBe(run.summary.chosenCounts.theta);
  });

  it('is deterministic: the same inputs give the same result, to the last digit', () => {
    const again = modelBacktest(prepareBacktest(input), null);
    expect(again).toEqual(run);
  });

  it('replays every sourced material for the portfolio, and the three scenarios cover the same lines', () => {
    expect(run.materials.length).toBe(prep.terms.size);
    const lines = run.portfolio.map((p) => p.counts.lines);
    expect(new Set(lines).size).toBe(1);
    expect(run.portfolio.map((p) => p.scenario)).toEqual(['sapPlan', 'floor', 'chosen']);
  });
});

describe('E14-10 AC-03 — the main-model slot (ENG-B60)', () => {
  // A stand-in, not a model: 10% above the SKU's last 8 weeks, flat.
  const standIn: MainModel = {
    beatsFallback: () => false,
    forecast: (_sku, history, horizon) => {
      const last = history.slice(-8);
      const level = (last.reduce((a, b) => a + b, 0) / Math.max(1, last.length)) * 1.1;
      return { forecast: new Array(horizon).fill(level), fitted: history.map(() => NaN) };
    },
  };
  const withMain = modelBacktest(prepareBacktest({ ...input, mainModel: standIn }), null);

  it('is a candidate for every compared SKU when supplied, judged by the same rule', () => {
    expect(withMain.mainModel).toBe('supplied');
    for (const s of withMain.skus) {
      expect(s.scores.map((x) => x.candidate)).toEqual(['main', 'comb', 'theta', 'sapPlan']);
      if (s.selection.chosen === 'main') expect(s.selection.beatsFloor).toContain('main');
      // It was really replayed: its forecast is not the Comb's.
      const f = (c: string) => s.scores.find((x) => x.candidate === c)!;
      expect(f('main').wape).not.toBe(f('comb').wape);
    }
  });

  it('the verdicts E14-07 reads are true exactly where the backtest chose the main model', () => {
    const v = mainModelVerdicts(withMain);
    for (const s of withMain.skus) expect(v.get(s.skuCode)).toBe(s.selection.chosen === 'main');
  });
});
