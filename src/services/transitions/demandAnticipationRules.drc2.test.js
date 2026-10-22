// ────────────────────────────────────────────────────────────────────────────
// DRC-2 (BL-188) and DRC-4 (BL-190) — the rolling demand anticipation read
// model's pure half, driven with the team's own examples (`osipGolden.json`,
// design rule 4):
//   · DRC-2 AC-03 / DRC-4 AC-01 — PPT 7 through `rollingDaFigure`;
//   · DRC-2 AC-01 / AC-02 — PPT 8 and 9 chained WEEK BY WEEK through stored
//     publications (`chainFor`), so the OSPO chain, the new PO and the carries
//     are read back from what was published, as the page reads them;
//   · the supplier's agreement (first week outside only with it), the
//     carry-over limit, the absorbing of a surplus, the switches A1, A2 and A9,
//     the stamp (DRC-D16), the publish refusals and the page's rows.
// ────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import golden from './__fixtures__/osipGolden.json';
import { NO_PERSON } from '@context/noPerson';
import { OSIP_RULES, RULES_VERSION } from './osipRules';
import {
  DEMAND_ANTICIPATION_RULES,
  DA_PROVISIONAL_QUESTIONS,
  chainFor,
  demandAnticipationPairs,
  demandAnticipationRows,
  entriesOf,
  pairKey,
  publicationOf,
  publishRefusal,
  rollingDaFigure,
  unabsorbedOf
} from './demandAnticipationRules';
/** @import { DemandAnticipationPublication, RollingDaInputs } from './demandAnticipationRules' */
/** @import { OsipRules } from './osipRules' */
/** @import { LtpLine } from './capacityRules' */

/** @param {Partial<OsipRules>} over */
const rulesWith = (over) => /** @type {OsipRules} */ ({ ...OSIP_RULES, ...over });

/** @type {RollingDaInputs} */
const BASE = {
  weeks: [],
  ltp: [],
  leadTimeWeeks: 4,
  mpq: 0,
  soh: 0,
  ospoOpen: 0,
  previous: null,
  callOffPrev: 0,
  carries: [],
  callOff: 0,
  agreedFirstOutside: false,
  salesOrderQty4w: null,
  ospr: 0
};

// PPT 8 and 9 name weeks W1…; the chain reads the previous planning week by
// date, so each Wn is a Monday here.
/** @param {number} n */
const Wk = (n) => {
  const d = new Date(Date.UTC(2026, 0, 5 + (n - 1) * 7));
  return d.toISOString().slice(0, 10);
};
/** @param {readonly string[]} ws */
const asDates = (ws) => ws.map((w) => Wk(Number(w.slice(1))));

const S = 'sup-x';
const M = 'MAT-1';
let seq = 0;
/**
 * A publication of one planning week holding one pair's figure.
 * @param {RollingDaInputs} inputs
 * @param {readonly string[]} [agreed]
 * @param {OsipRules} [rules]
 * @returns {DemandAnticipationPublication}
 */
const publish = (inputs, agreed = [], rules = OSIP_RULES) => {
  seq += 1;
  const figure = rollingDaFigure(inputs, rules);
  return {
    id: `dap-t${seq}`,
    publishedAt: `${inputs.weeks[0]}T03:00:00.000Z`,
    actor: NO_PERSON,
    source: 'publish',
    planningWeek: inputs.weeks[0],
    agreedFirstOutside: agreed,
    entries: entriesOf([{ supplierId: S, materialCode: M, inputs, figure }])
  };
};

describe('DRC-2 AC-03 / DRC-4 AC-01 — PPT 7, bottle 2000041501', () => {
  const g = golden.ppt7;
  const f = rollingDaFigure({
    ...BASE,
    weeks: g.weeks,
    ltp: g.ltp,
    leadTimeWeeks: g.leadTimeWeeks,
    mpq: g.mpq,
    soh: g.soh,
    ospoOpen: g.ospo,
    ospr: g.ospr
  });

  it('the horizon is the 5-week lead time and incoming demand anticipation is 438,768 then 129,248 and 64,624 × 3', () => {
    expect(f.horizonWeeks).toEqual(g.weeks.slice(0, 5));
    expect(f.leadTimeWeeks).toBe(5);
    expect(f.daInForce).toEqual(g.expected.incomingDa);
    expect(f.weeks[0]).toMatchObject({ ltp: 193872, safety: 244896, da: 438768 });
    expect(f.totalDa).toBe(g.expected.totalDa);
  });

  it('Total DA 761,888 = ROP Order 761,888; PR generated 645,559; gap 0', () => {
    expect(f.safetyOrder).toBe(g.expected.safetyOrder);
    expect(f.cycleStock).toBe(g.expected.cycleStock);
    expect(f.ropOrder).toBe(g.expected.ropOrder);
    expect(f.pr).toBe(-g.expected.prGenerated);
    expect(f.supply).toBe(g.soh + g.ospo + g.ospr - g.expected.prGenerated);
    expect(f.gap).toBe(g.expected.planCheckGap);
    expect(f).toMatchObject({ prRecommendation: 0, absorbedLastWeek: 0, unabsorbed: 0 });
  });

  it('[Default A2] alternative: without SOH the same plan shows a 116,329 shortfall as a PR recommendation', () => {
    const alt = rollingDaFigure(
      {
        ...BASE,
        weeks: g.weeks,
        ltp: g.ltp,
        leadTimeWeeks: 5,
        mpq: g.mpq,
        soh: g.soh,
        ospr: 0
      },
      rulesWith({ planCheckIncludesSoh: false })
    );
    expect(alt.gap).toBe(g.soh);
    expect(alt.prRecommendation).toBe(g.soh);
  });

  it('[Default A1] alternative: the safety order spread evenly over the horizon keeps the total', () => {
    const alt = rollingDaFigure(
      { ...BASE, weeks: g.weeks, ltp: g.ltp, leadTimeWeeks: 5, mpq: g.mpq, soh: g.soh, ospr: 0 },
      rulesWith({ daSafetyPlacement: 'spread' })
    );
    // Whole units, the odd unit first: 244,896 = 48,980 + 4 × 48,979.
    expect(alt.weeks.map((w) => w.safety)).toEqual([48980, 48979, 48979, 48979, 48979]);
    expect(alt.totalDa).toBe(g.expected.totalDa);
  });

  it('the MPQ default is the source’s order multiple (a named key, not a literal)', () => {
    expect(DEMAND_ANTICIPATION_RULES.mpqField).toBe('orderMultiple');
    // Known-bad control: rounding to no MPQ gives the unrounded figure, not 244,896.
    const unrounded = rollingDaFigure({
      ...BASE,
      weeks: g.weeks,
      ltp: g.ltp,
      leadTimeWeeks: 5,
      mpq: 0,
      ospr: 0
    });
    expect(unrounded.safetyOrder).not.toBe(g.expected.safetyOrder);
  });
});

describe('DRC-2 AC-01 / AC-02 — PPT 8 and 9 chained through publications', () => {
  const p8 = golden.ppt8;
  const p9 = golden.ppt9;
  const key = pairKey(S, M);
  // PPT 8 and 9 show the carry-over and the OSPO chain with no safety order
  // (their week 1 is the LTP alone). z = 0 [Default B3] takes it out; every
  // other key is the default.
  const NO_SAFETY = rulesWith({ z: 0 });
  // W1: the supplier agreed to take the remainder in the first week outside (PPT 8).
  const in1 = {
    ...BASE,
    weeks: asDates(p8.week1.weeks),
    ltp: p8.week1.ltp,
    leadTimeWeeks: p8.leadTimeWeeks,
    callOff: p8.week1.callOff,
    agreedFirstOutside: true
  };
  const pub1 = publish(in1, [key], NO_SAFETY);
  const f1 = pub1.entries[0].figure.value;

  /**
   * The planning week's inputs as the read model builds them: the chain and
   * the carries come from the stored publications.
   * @param {readonly DemandAnticipationPublication[]} pubs
   * @param {{ weeks: string[]; ltp: number[]; callOffPrev: number; callOff: number }} w
   */
  const next = (pubs, w) => {
    const weeks = asDates(w.weeks);
    const chain = chainFor(pubs, S, M, weeks[0]);
    return {
      ...BASE,
      weeks,
      ltp: w.ltp,
      leadTimeWeeks: p8.leadTimeWeeks,
      previous: chain.previous,
      carries: chain.carries,
      callOffPrev: w.callOffPrev,
      callOff: w.callOff,
      agreedFirstOutside: chain.agreedFirstOutside
    };
  };
  const in2 = next([pub1], p8.week2);
  const pub2 = publish(in2, [], NO_SAFETY);
  const f2 = pub2.entries[0].figure.value;
  const in3 = next([pub1, pub2], p9.week3);
  const pub3 = publish(in3, [], NO_SAFETY);
  const f3 = pub3.entries[0].figure.value;
  const in4 = next([pub1, pub2, pub3], p9.week4);
  const f4 = rollingDaFigure(in4, NO_SAFETY);

  it('AC-01 — W1: DA 10 × 4, PO 40, call-off 5, remainder 5 to W5 (supplier agreed)', () => {
    expect(f1.daInForce).toEqual(p8.week1.expected.da);
    expect(f1).toMatchObject({
      ospo: p8.week1.expected.ospo,
      additionalPo: p8.week1.expected.additionalPo,
      remainder: p8.week1.expected.remainder,
      carryTarget: 'firstOutside'
    });
    expect(f1.carry).toEqual({ ...p8.week1.expected.carry, week: Wk(5), fromWeek: Wk(1) });
  });

  it('AC-01 — W2 reads W1’s publication: OSPO 35, additional PO 5, W5 = 5 + 5', () => {
    expect(in2.previous).toEqual({ ospo: 0, additionalPo: 40 });
    expect(in2.carries).toEqual([{ week: Wk(5), qty: 5, fromWeek: Wk(1) }]);
    expect(f2.daInForce).toEqual(p8.week2.expected.da);
    expect(f2.weeks[3].carriedIn).toEqual([{ qty: 5, fromWeek: Wk(1) }]);
    expect(f2.ospo).toBe(p8.week2.expected.ospo);
    expect(f2.additionalPo).toBe(p8.week2.expected.additionalPo);
    expect(f2.remainder).toBe(p8.week2.expected.remainder);
    expect(f2.carry).toBeNull();
  });

  it('AC-02 — W3: OSPO 30 (35 − 10 + 5), remainder 5 carried to the last week W6', () => {
    expect(in3.previous).toEqual({ ospo: 35, additionalPo: 5 });
    expect(f3.daInForce).toEqual(p9.week3.expected.da);
    expect(f3.ospo).toBe(p9.week3.expected.ospo);
    expect(f3.additionalPo).toBe(p9.week3.expected.additionalPo);
    expect(f3.carry).toEqual({ week: Wk(6), qty: 5, fromWeek: Wk(3) });
    expect(f3.carryTarget).toBe('lastWeek');
  });

  it('AC-02 — W4: OSPO 25, W6 = 0 + 5, remainder 5 to W7', () => {
    expect(in4.previous).toEqual({ ospo: 30, additionalPo: 0 });
    expect(f4.daInForce).toEqual(p9.week4.expected.da);
    expect(f4.ospo).toBe(p9.week4.expected.ospo);
    expect(f4.additionalPo).toBe(p9.week4.expected.additionalPo);
    expect(f4.carry).toEqual({ week: Wk(7), qty: 5, fromWeek: Wk(4) });
  });

  it('[Default A9] alternative: OSPO without the new PO breaks the slides’ 35, 30, 25 chain', () => {
    const alt = rollingDaFigure(in2, rulesWith({ z: 0, ospoIncludesNewPo: false }));
    expect(alt.ospo).toBe(-5);
    expect(alt.ospo).not.toBe(p8.week2.expected.ospo);
  });

  it('a week the previous planning week did not publish starts OSPO from the open PO quantity, flagged', () => {
    expect(f1.flags).toContain('OSPO_FROM_STORE');
    expect(f2.flags).not.toContain('OSPO_FROM_STORE');
    const gap = chainFor([pub1], S, M, Wk(3));
    expect(gap.previous).toBeNull();
    // W1's carry into W5 is still read two weeks later.
    expect(gap.carries).toEqual([{ week: Wk(5), qty: 5, fromWeek: Wk(1) }]);
  });
});

describe('carry-over (DRC-2 BR-03, BR-04; Owner A8; DRC-B6)', () => {
  const weeks = [Wk(1), Wk(2), Wk(3), Wk(4), Wk(5)];
  const base = { ...BASE, weeks, ltp: [10, 10, 10, 10, 10], callOff: 4 };

  it('without the recorded agreement the remainder goes to the last week of the horizon', () => {
    const f = rollingDaFigure(base);
    expect(f.carry).toEqual({ week: Wk(4), qty: 6, fromWeek: Wk(1) });
    expect(f.carryTarget).toBe('lastWeek');
    expect(f.flags).not.toContain('CARRY_FIRST_OUTSIDE_NOT_AGREED');
  });

  it('with the agreement it goes to the first week outside the horizon', () => {
    const f = rollingDaFigure({ ...base, agreedFirstOutside: true });
    expect(f.carry).toEqual({ week: Wk(5), qty: 6, fromWeek: Wk(1) });
    expect(f.carryTarget).toBe('firstOutside');
    expect(f.firstOutsideWeek).toBe(Wk(5));
  });

  it('the agreement is read from the publication in force for that planning week only', () => {
    const pub = publish({ ...base, agreedFirstOutside: true }, [pairKey(S, M)]);
    expect(chainFor([pub], S, M, Wk(1)).agreedFirstOutside).toBe(true);
    expect(chainFor([pub], S, M, Wk(2)).agreedFirstOutside).toBe(false);
    expect(chainFor([pub], 'other', M, Wk(1)).agreedFirstOutside).toBe(false);
  });

  it('[Default A8b] with no sales-order quantity no limit applies, and the figure says so', () => {
    const f = rollingDaFigure(base);
    expect(f.uncarried).toBe(0);
    expect(f.flags).toContain('CARRY_LIMIT_NO_SALES_ORDERS');
  });

  it('[Default A8b] with a sales-order quantity the carry is capped and the excess left uncarried', () => {
    const f = rollingDaFigure({ ...base, salesOrderQty4w: 4 });
    expect(f.carry?.qty).toBe(4);
    expect(f.uncarried).toBe(2);
    expect(f.flags).toEqual(expect.arrayContaining(['CARRY_OVER_LIMIT']));
    expect(f.flags).not.toContain('CARRY_LIMIT_NO_SALES_ORDERS');
  });
});

describe('DRC-4 BR-02 — supply above the demand anticipation (DRC-B7)', () => {
  const weeks = [Wk(1), Wk(2), Wk(3)];
  const base = { ...BASE, weeks, ltp: [10, 10, 10], leadTimeWeeks: 2 };

  it('a surplus comes off the last week of the horizon, never below 0; the rest is unabsorbed', () => {
    const f = rollingDaFigure({ ...base, soh: 25 });
    expect(f.totalDa).toBe(20);
    expect(f.pr).toBe(0);
    expect(f.gap).toBe(-5);
    expect(f.daInForce).toEqual([10, 5]);
    expect(f.absorbedLastWeek).toBe(5);
    const big = rollingDaFigure({ ...base, soh: 35 });
    expect(big.daInForce).toEqual([10, 0]);
    expect(big.unabsorbed).toBe(5);
  });

  it('OSPR the hub does not hold counts 0 and is flagged; a known OSPR counts', () => {
    expect(rollingDaFigure({ ...base, ospr: null }).flags).toContain('OSPR_NOT_AVAILABLE');
    expect(rollingDaFigure({ ...base, ospr: 25 }).absorbedLastWeek).toBe(5);
  });

  it('a pair without a lead time uses the fallback horizon, flagged', () => {
    const f = rollingDaFigure({
      ...BASE,
      weeks: [Wk(1), Wk(2), Wk(3), Wk(4), Wk(5)],
      ltp: [1, 1, 1, 1, 1],
      leadTimeWeeks: null
    });
    expect(f.horizonWeeks).toHaveLength(DEMAND_ANTICIPATION_RULES.fallbackHorizonWeeks);
    expect(f.flags).toContain('LEAD_TIME_MISSING');
  });
});

describe('DRC-D16 — a publication is stamped', () => {
  it('each entry keeps the figure, its inputs and RULES_VERSION, frozen', () => {
    const inputs = { ...BASE, weeks: [Wk(1), Wk(2), Wk(3)], ltp: [3, 3, 3], leadTimeWeeks: 2 };
    const pub = publish(inputs);
    const e = pub.entries[0];
    expect(e.figure.rulesVersion).toBe(RULES_VERSION);
    expect(e.figure.inputs).toEqual(inputs);
    expect(e.figure.value).toEqual(rollingDaFigure(inputs));
    expect(Object.isFrozen(e.figure)).toBe(true);
  });
});

describe('the publish refusals', () => {
  const inputs = { ...BASE, weeks: [Wk(1), Wk(2), Wk(3)], ltp: [5, 5, 5], leadTimeWeeks: 2 };
  const figure = rollingDaFigure(inputs);
  const figures = [{ supplierId: S, materialCode: M, inputs, figure }];
  const ctx = {
    planningWeek: Wk(1),
    remainders: new Map([[pairKey(S, M), figure.remainder]]),
    inForce: null,
    figures
  };

  it('known-good: the current week with no agreement goes through', () => {
    expect(publishRefusal({ planningWeek: Wk(1) }, ctx)).toBeNull();
  });

  it('STALE_WEEK names another week than the current one', () => {
    expect(publishRefusal({ planningWeek: Wk(2) }, ctx)).toBe('STALE_WEEK');
  });

  it('BAD_AGREEMENT: an unknown pair, a pair with nothing to carry, or not a list', () => {
    expect(
      publishRefusal({ planningWeek: Wk(1), agreedFirstOutside: [pairKey(S, M)] }, ctx)
    ).toBeNull();
    expect(publishRefusal({ planningWeek: Wk(1), agreedFirstOutside: ['x|y'] }, ctx)).toBe(
      'BAD_AGREEMENT'
    );
    expect(
      publishRefusal(
        { planningWeek: Wk(1), agreedFirstOutside: [pairKey(S, M)] },
        { ...ctx, remainders: new Map([[pairKey(S, M), 0]]) }
      )
    ).toBe('BAD_AGREEMENT');
    expect(publishRefusal({ planningWeek: Wk(1), agreedFirstOutside: 'x' }, ctx)).toBe(
      'BAD_AGREEMENT'
    );
  });

  it('NOTHING_TO_PUBLISH with no pair; NOTHING_CHANGED when the week is published as is', () => {
    expect(publishRefusal({ planningWeek: Wk(1) }, { ...ctx, figures: [] })).toBe(
      'NOTHING_TO_PUBLISH'
    );
    const pub = publish(inputs);
    expect(publishRefusal({ planningWeek: Wk(1) }, { ...ctx, inForce: pub })).toBe(
      'NOTHING_CHANGED'
    );
    // A recorded agreement is a change.
    expect(
      publishRefusal(
        { planningWeek: Wk(1), agreedFirstOutside: [pairKey(S, M)] },
        { ...ctx, inForce: pub }
      )
    ).toBeNull();
  });
});

describe('the page’s rows', () => {
  const weeks = [Wk(1), Wk(2), Wk(3), Wk(4)];
  const pair = { supplierId: S, materialCode: M, share: 1, soh: 0, weeks, ltp: [8, 8, 8, 8] };
  const inputs = { ...BASE, weeks, ltp: pair.ltp, leadTimeWeeks: 2 };
  const pub = publish(inputs);

  it('a published week shows the published figure; a changed LTP shows would be and its delta', () => {
    const today = rollingDaFigure({ ...inputs, ltp: [8, 11, 8, 8] });
    const [row] = demandAnticipationRows([pub], [{ ...pair, today }], Wk(1));
    expect(row.planSource).toBe('published');
    expect(row.changed).toBe(true);
    expect(row.weeks[1]).toMatchObject({
      inHorizon: true,
      qty: 8,
      published: 8,
      wouldBe: 11,
      delta: 3
    });
    expect(row.weeks[2]).toMatchObject({ inHorizon: false, qty: null, published: null });
    expect(row.weeks[0].publishedBy?.publicationId).toBe(pub.id);
  });

  it('an unpublished week reads today’s figure; publicationOf takes the latest of the week', () => {
    const today = rollingDaFigure(inputs);
    const [row] = demandAnticipationRows([], [{ ...pair, today }], Wk(1));
    expect(row).toMatchObject({ planSource: 'today', changed: true, publishedBy: null });
    expect(row.weeks[0]).toMatchObject({ qty: 8, published: null, delta: null });
    const later = publish(inputs);
    expect(publicationOf([pub, later], Wk(1))).toBe(later);
    expect(publicationOf([pub, later], Wk(2))).toBeNull();
  });

  it('a surplus the last week cannot take is listed for the alert', () => {
    const today = rollingDaFigure({ ...inputs, soh: 40 });
    const rows = demandAnticipationRows([], [{ ...pair, soh: 40, today }], Wk(1));
    expect(rows[0].weeks[1].absorbed).toBe(8);
    expect(unabsorbedOf(rows)).toEqual([
      {
        supplierId: S,
        materialCode: M,
        fromWeeks: [Wk(1), Wk(2)],
        intoWeeks: [Wk(2)],
        excess: 24,
        remaining: 16
      }
    ]);
  });

  it('design rule 5 — the provisional questions are A1, A2, A8b and A9', () => {
    expect(DA_PROVISIONAL_QUESTIONS).toEqual(['A1', 'A2', 'A8b', 'A9']);
  });
});

// Ported from the retired CAP-10 suite: the share of PTI's stock (CAP-D11) and
// the weekly LTP are still the read's inputs (the SOH of DRC-4 and LTP(w)).
describe('the pairs: LTP per week and the SOH share (CAP-D11, kept)', () => {
  const NOW = '2026-08-31T12:00:00.000Z';
  const W = ['2026-08-31', '2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28'];
  /**
   * @param {string} supplierId
   * @param {string} materialCode
   * @param {string} monday
   * @param {number} qty
   * @returns {LtpLine}
   */
  const weekLine = (supplierId, materialCode, monday, qty) => ({
    supplierId,
    materialCode,
    periodStart: monday,
    periodEnd: new Date(Date.parse(`${monday}T00:00:00Z`) + 6 * 86_400_000)
      .toISOString()
      .slice(0, 10),
    forecastQty: qty
  });
  /** @param {string} materialCode @param {number} ptiSoh */
  const stock = (materialCode, ptiSoh) => ({ materialCode, ptiSoh, ptiRop: 0, consignment: false });

  it('two suppliers share the stock on hand by their LTP over the 4-week window', () => {
    const lines = W.slice(0, 4).flatMap((w) => [
      weekLine('sup-A', 'M-2', w, 300),
      weekLine('sup-B', 'M-2', w, 100)
    ]);
    const pairs = demandAnticipationPairs(
      { ltpLines: lines, ptiStock: [stock('M-2', 1200)] },
      NOW,
      4
    );
    expect(pairs.map((p) => [p.supplierId, p.share, p.soh])).toEqual([
      ['sup-A', 0.75, 900],
      ['sup-B', 0.25, 300]
    ]);
    expect(pairs[0].ltp).toEqual([300, 300, 300, 300]);
  });

  it('a monthly raw-material LTP is spread by day into its weeks; no stock record is null', () => {
    /** @type {LtpLine[]} */
    const lines = [
      {
        supplierId: 'sup-R',
        materialCode: 'RM-1',
        periodStart: '2026-09-01',
        periodEnd: '2026-09-30',
        forecastQty: 3000
      }
    ];
    const [p] = demandAnticipationPairs({ ltpLines: lines, ptiStock: [] }, NOW, 4);
    expect(p.ltp).toEqual([600, 700, 700, 700]);
    expect(p.soh).toBeNull();
    expect(rollingDaFigure({ ...BASE, weeks: p.weeks, ltp: p.ltp, soh: p.soh }).flags).toContain(
      'NO_STOCK_RECORD'
    );
  });

  it('a material with no LTP in the share window splits its stock evenly', () => {
    const lines = [weekLine('sup-A', 'M-3', W[4], 100), weekLine('sup-B', 'M-3', W[4], 300)];
    const pairs = demandAnticipationPairs(
      { ltpLines: lines, ptiStock: [stock('M-3', 1000)] },
      NOW,
      5
    );
    expect(pairs.map((p) => [p.share, p.soh])).toEqual([
      [0.5, 500],
      [0.5, 500]
    ]);
  });
});
