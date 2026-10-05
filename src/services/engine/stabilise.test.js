// ─────────────────────────────────────────────────────────────────────────────
// REQ-E14-06 — stabilise the plan before it is published. The requirement's
// worked examples verbatim, each acceptance criterion, the band limits probed
// both ways, the Firm freeze, the edge cases, the plan-change measures, and the
// run on the engine's own (synthetic) dataset.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
/** @import { SeriesInput, SeriesTerms, VersionInput } from './stabilise' */
import {
  DEFAULT_STABILISE_PARAMS,
  STABILISE_RULES,
  allowedRange,
  damp,
  lotForLotNeed,
  planChangeOf,
  reasonKey,
  stabilisePeriod,
  stabilisePlan,
  stabiliseSeries,
  zoneAt
} from './stabilise';
import { breachesToleranceBand, masc } from './reliability';
import { addDays } from './dates';
import { engineDataset } from '../data/mock/fixtures/engineDataset';
import { DEFAULT_SAFETY_STOCK_OPTIONS, safetyStockRun } from './safetyStock';
import { planHistoryInputs, stabiliseInputs, versionDays } from '../data/mock/stabiliseReadModel';
import { dayOf } from './dates';
import { SDC_SIMULATED_NOW } from '../sdc/clock';

const P = DEFAULT_STABILISE_PARAMS;
/**
 * @param {number} raw
 * @param {number | null} previous
 * @param {number | null} [first]
 * @param {string | null} [overrideReason]
 */
const tradeOff = (raw, previous, first = previous, overrideReason = null) =>
  stabilisePeriod(
    { period: '2026-10-12', zone: 'tradeOff', raw, previous, first, overrideReason },
    P
  );

describe('the worked example (REQ-E14-06), verbatim', () => {
  it('damping: previous 1,200, new 1,500, weight 0.5 → 1,350', () => {
    expect(P.tradeOffWeight).toBe(0.5);
    expect(damp(1200, 1500, 0.5)).toBe(1350);
  });

  it('band: 1,200 × 0.9 to 1,200 × 1.1 = 1,080 to 1,320; 1,350 is outside, so it is held at 1,320', () => {
    const r = tradeOff(1500, 1200);
    expect(r.damped).toBe(1350);
    expect(r.range).toMatchObject({ low: 1080, high: 1320, highBy: 'perVersion' });
    expect(r.beyondBand).toBe(true);
    expect(r.published).toBe(1320);
    expect(r.rule).toBe('bandHeld');
    expect(r.reason).toBeNull();
  });

  it('step 4, second branch: the planner publishes 1,350 with the reason "Promotion added"; the supplier sees the reason and the week asks for a new commitment', () => {
    const r = tradeOff(1500, 1200, 1200, 'Promotion added');
    expect(r.published).toBe(1350);
    expect(r.rule).toBe('override');
    expect(r.reason).toBe('Promotion added');
    expect(r.awaitingCommitment).toBe(true);
  });

  it('cumulative cap: first 1,000; v2 1,100 (+10%) and v3 1,200 (+9%) pass; v4 1,300 is +8% on v3 but +30% on the first — beyond 800 to 1,200, held at 1,200', () => {
    // The versions as published (the example's figures are the published values).
    expect(breachesToleranceBand(1000, 1100, 1000)).toBe(false);
    expect(breachesToleranceBand(1100, 1200, 1000)).toBe(false);
    expect(breachesToleranceBand(1200, 1300, 1000)).toBe(true);
    expect((1300 - 1200) / 1200).toBeLessThan(0.1);
    const range = allowedRange(1200, 1000);
    expect(range).toMatchObject({ low: 1080, high: 1200, highBy: 'cumulative' });
    // With no damping (weight 0), the proposed 1,300 is the value checked.
    const r = stabilisePeriod(
      { period: '2026-10-12', zone: 'tradeOff', raw: 1300, previous: 1200, first: 1000 },
      { ...P, tradeOffWeight: 0 }
    );
    expect(r.published).toBe(1200);
    expect(r.rule).toBe('cumulativeHeld');
    expect(r.beyondBand).toBe(true);
  });

  it('the cumulative cap catches drift per-version checks miss: 3 steps of +10% add up to +33%', () => {
    const steps = [1000, 1100, 1210, 1331];
    for (let i = 1; i < steps.length; i += 1)
      expect(Math.abs(steps[i] - steps[i - 1]) / steps[i - 1]).toBeLessThanOrEqual(0.1 + 1e-12);
    expect((1331 - 1000) / 1000).toBeCloseTo(0.331, 6);
    expect(breachesToleranceBand(1100, 1210, 1000)).toBe(true);
    // Run through the stabiliser with no damping: the third version is held at 1,200.
    /** @type {SeriesTerms} */
    const terms = { firmDays: 14, tradeOffDays: 42, leadTimeDays: 14 };
    const week = '2026-10-19';
    /** @type {VersionInput[]} */
    const versions = steps.map((q, i) => ({
      asOf: addDays('2026-09-07', 7 * i),
      raw: new Map([[week, q]])
    }));
    const out = stabiliseSeries(versions, terms, { ...P, tradeOffWeight: 0 });
    expect(out.map((v) => v.published.get(week))).toEqual([1000, 1100, 1200, 1200]);
    // The fourth version asks 1,331 again: still +33% on the first, held at 1,200 again.
    expect(out.map((v) => v.periods[0].rule)).toEqual([
      'new',
      'damped',
      'cumulativeHeld',
      'cumulativeHeld'
    ]);
  });
});

describe('the band limits, probed both ways (BR-05, ENG-D8)', () => {
  it('the damped value exactly on the per-version edge is inside; a hair beyond is held at the edge', () => {
    const on = tradeOff(1440, 1200); // damped 1,320
    expect(on.damped).toBe(1320);
    expect(on.rule).toBe('damped');
    expect(on.published).toBe(1320);
    const beyond = tradeOff(1442, 1200); // damped 1,321
    expect(beyond.rule).toBe('bandHeld');
    expect(beyond.published).toBe(1320);
  });

  it('the lower edge the same way: 1,080 is inside, below it is held at 1,080', () => {
    expect(tradeOff(960, 1200)).toMatchObject({ damped: 1080, rule: 'damped', published: 1080 });
    expect(tradeOff(900, 1200)).toMatchObject({ damped: 1050, rule: 'bandHeld', published: 1080 });
  });

  it('the cumulative band binds downward too (first 1,000, previous 850 → floor 800)', () => {
    const r = tradeOff(600, 850, 1000); // damped 725; per-version floor 765, cumulative 800
    expect(r.range).toMatchObject({ low: 800, lowBy: 'cumulative' });
    expect(r).toMatchObject({ rule: 'cumulativeHeld', published: 800 });
  });

  it('a previous value of 0 allows no move without a reason (±10% of nothing is nothing)', () => {
    expect(tradeOff(500, 0, 0)).toMatchObject({ rule: 'bandHeld', published: 0, beyondBand: true });
    expect(tradeOff(500, 0, 0, 'New launch')).toMatchObject({ rule: 'override', published: 250 });
  });

  it('ENG-B31 — a reasoned override re-anchors the cumulative cap at the value published with the reason', () => {
    /** @type {SeriesTerms} */
    const terms = { firmDays: 14, tradeOffDays: 42, leadTimeDays: 14 };
    const week = '2026-10-19';
    /**
     * @param {string} asOf
     * @param {number} q
     * @returns {VersionInput}
     */
    const at = (asOf, q) => ({ asOf, raw: new Map([[week, q]]) });
    // v1 1,000 (Trade-off); v2 asks 2,000 with a reason → 1,500 published; v3 asks 1,600.
    const withReason = stabiliseSeries(
      [at('2026-09-07', 1000), at('2026-09-14', 2000)],
      terms,
      P,
      new Map([[week, 'Promotion added']])
    );
    expect(withReason[1].periods[0]).toMatchObject({
      rule: 'override',
      published: 1500,
      first: 1000
    });
    const v3 = stabilisePeriod(
      { period: week, zone: 'tradeOff', raw: 1600, previous: 1500, first: 1500 },
      P
    );
    expect(v3).toMatchObject({ rule: 'damped', published: 1550 });
    // Were the cap still measured from 1,000, the two bands would not meet: held where it is.
    expect(allowedRange(1500, 1000)).toEqual({
      low: 1500,
      high: 1500,
      lowBy: 'perVersion',
      highBy: 'perVersion'
    });
  });

  it('ENG-B31 — the cap is measured from the value the supplier saw when the week entered Trade-off, not an earlier Forecast value', () => {
    /** @type {SeriesTerms} */
    const terms = { firmDays: 14, tradeOffDays: 42, leadTimeDays: 14 };
    const week = '2026-11-02';
    /**
     * @param {string} asOf
     * @param {number} q
     * @returns {VersionInput}
     */
    const at = (asOf, q) => ({ asOf, raw: new Map([[week, q]]) });
    // 70 and 63 days ahead: Forecast (moves freely, 1,000 → 500); 49 days: Trade-off from 500.
    const out = stabiliseSeries(
      [at('2026-08-24', 1000), at('2026-08-31', 500), at('2026-09-14', 520)],
      terms
    );
    expect(out.map((v) => v.periods[0].zone)).toEqual(['forecast', 'forecast', 'tradeOff']);
    expect(out[1].periods[0]).toMatchObject({ rule: 'forecast', published: 500 });
    expect(out[2].periods[0]).toMatchObject({ first: 500, rule: 'damped', published: 510 });
  });

  it('a blank reason is no reason', () => {
    expect(tradeOff(1500, 1200, 1200, '   ')).toMatchObject({
      rule: 'bandHeld',
      published: 1320,
      reason: null
    });
  });
});

describe('zones, the Firm freeze and the edge cases (BR-01 to BR-04)', () => {
  it('Firm: the published value is the previous one, whatever the engine says (BR-03)', () => {
    const r = stabilisePeriod(
      { period: '2026-09-14', zone: 'firm', raw: 9999, previous: 1200, first: 1000 },
      P
    );
    expect(r).toMatchObject({
      rule: 'firmFrozen',
      published: 1200,
      damped: null,
      range: null,
      awaitingCommitment: false
    });
  });

  it('Forecast: weight 0, no band — published as calculated (ENG-D9)', () => {
    const r = stabilisePeriod(
      { period: '2027-01-04', zone: 'forecast', raw: 5000, previous: 1000, first: 1000 },
      P
    );
    expect(r).toMatchObject({ rule: 'forecast', published: 5000, beyondBand: false, range: null });
  });

  it('a new period entering the horizon is not damped or band-checked, even in Trade-off', () => {
    expect(tradeOff(1500, null, null)).toMatchObject({
      rule: 'new',
      published: 1500,
      damped: null,
      awaitingCommitment: true
    });
  });

  it('an unchanged value needs nothing and asks for no new commitment', () => {
    expect(tradeOff(1200, 1200)).toMatchObject({
      rule: 'unchanged',
      published: 1200,
      awaitingCommitment: false
    });
  });

  it('zones by days from the version day: Firm under the Firm length, Trade-off to Firm + Trade-off, Forecast beyond', () => {
    const t = { firmDays: 14, tradeOffDays: 42 };
    expect(zoneAt('2026-08-31', '2026-08-31', t)).toBe('firm');
    expect(zoneAt('2026-08-31', '2026-09-07', t)).toBe('firm');
    expect(zoneAt('2026-08-31', '2026-09-14', t)).toBe('tradeOff');
    expect(zoneAt('2026-08-31', '2026-10-19', t)).toBe('tradeOff');
    expect(zoneAt('2026-08-31', '2026-10-26', t)).toBe('forecast');
  });

  it('the damping weight is a parameter: at 0 a Trade-off move inside the band is published as calculated', () => {
    const r = stabilisePeriod(
      { period: '2026-10-12', zone: 'tradeOff', raw: 1250, previous: 1200, first: 1200 },
      { ...P, tradeOffWeight: 0 }
    );
    expect(r).toMatchObject({ rule: 'damped', published: 1250 });
    expect(tradeOff(1250, 1200).published).toBe(1225);
  });
});

describe('a series of versions: each stabilised against what the one before PUBLISHED', () => {
  /** @type {SeriesTerms} */
  const terms = { firmDays: 14, tradeOffDays: 42, leadTimeDays: 14 };
  const weeks = Array.from({ length: 8 }, (_, i) => addDays('2026-09-07', 7 * i));
  // Noisy raw plan: every week moves ±30% each version.
  /** @type {VersionInput[]} */
  const versions = Array.from({ length: 6 }, (_, v) => ({
    asOf: addDays('2026-08-31', 7 * v),
    raw: new Map(
      weeks
        .filter((w) => w >= addDays('2026-08-31', 7 * v))
        .map((w, i) => /** @type {const} */ ([w, 1000 * (1 + 0.3 * (((v + i) % 3) - 1))]))
    )
  }));
  const out = stabiliseSeries(versions, terms);

  it('AC-01: no published Firm quantity differs from its previous publication', () => {
    let firmChecked = 0;
    out.forEach((v, i) => {
      if (i === 0) return;
      for (const p of v.periods) {
        if (p.zone !== 'firm' || p.previous === null) continue;
        firmChecked += 1;
        expect(p.published).toBe(out[i - 1].published.get(p.period));
      }
    });
    expect(firmChecked).toBeGreaterThan(0);
  });

  it('AC-02: no Trade-off week moves beyond the band without a recorded reason', () => {
    let tradeOffMoves = 0;
    const first = /** @type {Map<string, number>} */ (new Map());
    out.forEach((v, i) => {
      if (i > 0) {
        for (const p of v.periods) {
          if (p.zone !== 'tradeOff' || p.previous === null) continue;
          tradeOffMoves += 1;
          expect(
            breachesToleranceBand(
              p.previous,
              p.published,
              /** @type {NonNullable<ReturnType<typeof first.get>>} */ (first.get(p.period))
            ),
            p.period
          ).toBe(false);
        }
      }
      for (const [k, q] of v.published) if (!first.has(k)) first.set(k, q);
    });
    expect(tradeOffMoves).toBeGreaterThan(0);
  });

  it('AC-02 with a reason: only the latest version takes it, and the reason travels with the week', () => {
    const w = weeks[6];
    const withReason = stabiliseSeries(versions, terms, P, new Map([[w, 'Promotion added']]));
    const latest = /** @type {import('./stabilise').PeriodResult} */ (
      withReason[withReason.length - 1].periods.find((p) => p.period === w)
    );
    expect(latest.zone).toBe('tradeOff');
    if (latest.beyondBand)
      expect(latest).toMatchObject({ rule: 'override', reason: 'Promotion added' });
    else expect(latest.reason).toBeNull();
    // Earlier versions never saw it.
    expect(
      withReason
        .slice(0, -1)
        .flatMap((v) => v.periods)
        .every((p) => p.reason === null)
    ).toBe(true);
  });

  it('AC-03: every week of the version to publish carries the raw, damped (where damping applies) and published value', () => {
    const latest = out[out.length - 1].periods;
    for (const p of latest) {
      expect(typeof p.raw).toBe('number');
      expect(typeof p.published).toBe('number');
      if (p.zone === 'tradeOff' && p.previous !== null && p.rule !== 'unchanged')
        expect(p.damped).not.toBeNull();
    }
  });

  it('the first value is the one first PUBLISHED for the week', () => {
    const w = weeks[6];
    const firstVersion = out.findIndex((v) => v.published.has(w));
    const firstPublished = out[firstVersion].published.get(w);
    for (const v of out.slice(firstVersion + 1))
      expect(v.periods.find((p) => p.period === w)?.first).toBe(firstPublished);
  });
});

describe('the plan-change measures (E14-02, reliability.js)', () => {
  /** @type {SeriesTerms} */
  const terms = { firmDays: 14, tradeOffDays: 42, leadTimeDays: 14 };
  /**
   * @param {string} asOf
   * @param {[string, number][]} entries
   */
  const v = (asOf, entries) => ({ asOf, values: new Map(entries) });

  it('MASC per version pair is reliability.js’s own; the lead-time share and band share count what they say', () => {
    const a = v('2026-08-31', [
      ['2026-09-07', 100],
      ['2026-10-05', 100]
    ]);
    const b = v('2026-09-07', [
      ['2026-09-07', 130],
      ['2026-10-05', 150]
    ]);
    const e = planChangeOf([a, b], terms, 10);
    expect(e.masc).toEqual([masc(a.values, b.values, 10)]);
    expect(e.masc[0]).toBe(4); // (30 + 50) / 2 / 10
    // 2026-09-07 is 0 days ahead of b: inside the lead time, and it changed.
    expect(e.insideLeadTime).toEqual({ schedules: 1, changed: 1 });
    // 2026-10-05 is 28 days ahead: Trade-off; +50% is beyond the band.
    expect(e.tradeOff).toEqual({ revisions: 1, withinBand: 0 });
  });

  it('no scale → no MASC (never 0), as in E14-02', () => {
    expect(
      planChangeOf(
        [v('2026-08-31', [['2026-10-05', 1]]), v('2026-09-07', [['2026-10-05', 2]])],
        terms,
        null
      ).masc
    ).toEqual([]);
  });
});

describe('the quantity: net requirement lot-for-lot (ENG-B29)', () => {
  it('stock and receipts cover first; each shortfall is met in its own week, safety stock kept', () => {
    // start 500, SS 100, gross 200/week, a receipt of 300 in week 2.
    expect(lotForLotNeed(500, [200, 200, 200, 200, 200], [0, 300, 0, 0, 0], 100)).toEqual([
      0, 0, 0, 100, 200
    ]);
  });

  it('never negative, never more than needed: stock stays at or above safety stock, and lands on it in every week with a need', () => {
    const gross = [50, 400, 0, 300, 100];
    const receipts = [0, 0, 500, 0, 0];
    const need = lotForLotNeed(200, gross, receipts, 80);
    expect(need).toEqual([0, 330, 0, 0, 0]);
    let onHand = 200;
    need.forEach((n, t) => {
      onHand += receipts[t] + n - gross[t];
      expect(onHand).toBeGreaterThanOrEqual(80);
      if (n > 0) expect(onHand).toBe(80);
    });
  });
});

describe('X-01 — pure: no clock, no store, no setting', () => {
  it('the module reads no clock and imports nothing from the Hub', () => {
    const src = readFileSync(join(__dirname, 'stabilise.js'), 'utf8');
    expect(src).not.toMatch(/Date\.now|new Date\(/);
    expect(src).not.toMatch(/from '\.\.\/(data|transitions|sdc)\//);
    // …nor through an import alias (aliases.ts), which reaches the same folders.
    expect(src).not.toMatch(/from '@services\/(data|transitions|sdc)\//);
    // Control: the matcher finds an import that IS there.
    expect(src).toMatch(/from '\.\/reliability'/);
  });

  it('same inputs, same result', () => {
    /** @type {SeriesInput[]} */
    const series = [
      {
        supplierId: 's',
        materialCode: 'm',
        kind: 'packaging',
        terms: { firmDays: 14, tradeOffDays: 42, leadTimeDays: 14 },
        scale: 10,
        versions: [
          { asOf: '2026-08-31', raw: new Map([['2026-09-28', 100]]) },
          { asOf: '2026-09-07', raw: new Map([['2026-09-28', 200]]) }
        ]
      }
    ];
    expect(JSON.stringify(stabilisePlan(series))).toBe(JSON.stringify(stabilisePlan(series)));
    expect(
      /** @type {import('./stabilise').StabiliseRun} */ (
        stabilisePlan(series, P, new Map([[reasonKey('s', 'm', '2026-09-28'), 'Launch']]))
      ).series[0].latest[0]
    ).toMatchObject({
      rule: 'override',
      published: 150
    });
  });
});

describe('on the engine’s synthetic dataset', () => {
  const data = engineDataset();
  const asOf = dayOf(SDC_SIMULATED_NOW);
  /** @param {string} d */
  const ss = (d) => safetyStockRun(data, { ...DEFAULT_SAFETY_STOCK_OPTIONS, asOf: d });
  const { inputs } = stabiliseInputs(data, asOf, ss);
  const engine = stabilisePlan(inputs);
  const history = stabilisePlan(planHistoryInputs(data, SDC_SIMULATED_NOW, inputs));

  it('one series per supplier source of every planned material, versions at the stream’s cadence (weekly packaging, monthly raw material)', () => {
    expect(inputs.length).toBe(
      data.sources.filter((s) => data.materials.some((m) => m.materialCode === s.materialCode))
        .length
    );
    const pk = /** @type {SeriesInput} */ (inputs.find((s) => s.kind === 'packaging'));
    const rm = /** @type {SeriesInput} */ (inputs.find((s) => s.kind === 'rawMaterial'));
    expect(pk.versions.map((v) => v.asOf)).toEqual(versionDays(asOf, 'packaging'));
    expect(pk.versions.length).toBe(13);
    expect(rm.versions.map((v) => v.asOf)).toEqual([
      addDays(asOf, -84),
      addDays(asOf, -56),
      addDays(asOf, -28),
      asOf
    ]);
  });

  it('every Firm week of every replayed version is published as it was last time (AC-01), on both sources', () => {
    for (const run of [engine, history]) {
      for (const s of run.series) {
        for (const p of s.latest)
          if (p.zone === 'firm' && p.previous !== null) expect(p.published).toBe(p.previous);
      }
      expect(run.totals.stabilised.insideLeadTime.changed).toBe(0);
    }
  });

  it('every stabilised Trade-off revision is inside the band (AC-02: no reasons are given here)', () => {
    for (const run of [engine, history]) {
      expect(run.totals.stabilised.tradeOff.withinBand).toBe(
        run.totals.stabilised.tradeOff.revisions
      );
      expect(run.totals.counts.override).toBe(0);
    }
  });

  it('on SAP’s published plan history, stabilising lowers MASC and the share changed inside the lead time', () => {
    const { raw, stabilised } = history.totals;
    expect(raw.masc).not.toBeNull();
    expect(/** @type {NonNullable<typeof stabilised.masc>} */ (stabilised.masc)).toBeLessThan(
      /** @type {NonNullable<typeof raw.masc>} */ (raw.masc)
    );
    expect(
      /** @type {NonNullable<typeof raw.insideLeadTime.share>} */ (raw.insideLeadTime.share)
    ).toBeGreaterThan(0);
    expect(stabilised.insideLeadTime.share).toBe(0);
    // Named members, not only totals: each rule the requirement names fires somewhere.
    for (const r of /** @type {const} */ (['firmFrozen', 'damped', 'bandHeld', 'cumulativeHeld']))
      expect(history.totals.counts[r], r).toBeGreaterThan(0);
  });

  it('the rule counts partition the version to publish', () => {
    for (const run of [engine, history]) {
      const periods = run.series.reduce((n, s) => n + s.latest.length, 0);
      expect(STABILISE_RULES.reduce((n, r) => n + run.totals.counts[r], 0)).toBe(periods);
    }
  });
});
