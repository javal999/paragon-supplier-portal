// Owner rulings 2026-11-12 (PEX-D25 / BL-293, PEX-D26 / BL-295), through the
// REAL read models:
//   · PEX-D25 — an uploaded LTP A / Festive / B splits to a material's
//     suppliers by the sourcing share on record (`MaterialSource.share`); the
//     MR !102 rule (LTP share over the first 4 hub weeks) only without one.
//   · PEX-D26 — the capacity heads-up's brand split is recomputed per month from
//     the engine's gross requirement pegs; group and per-material rows do not move.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ltpSplitShares, hubWeeks } from '../../transitions/demandAnticipationRules';
import { headsUpMonths } from '../../transitions/capacityHeadsUpRules';
import { ltpWeeksOf } from './demandAnticipationReadModel';
import { allCapacityHeadsUp, brandSharesAt } from './capacityHeadsUpReadModel';
import { allCommitmentLines } from './forecastReadModel';
import { ltpInputStore } from './stores/ltpInputStore';
import { sdcClock } from '../../sdc';
import { NO_PERSON } from '@context/noPerson';
import { MockCommandService } from './MockCommandService';

const cmd = new MockCommandService();
/** @type {import('../types').QueryScope} */
const planning = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['planning'],
  actor: NO_PERSON
};

beforeEach(() => {
  sdcClock.reset();
  ltpInputStore.reset();
});
afterEach(() => {
  ltpInputStore.reset();
  sdcClock.reset();
});

/** @param {string} supplierId @param {number} week @returns {import('../../transitions/capacityRules').LtpLine} */
const line = (supplierId, week) =>
  /** @type {any} */ ({
    supplierId,
    materialCode: 'M',
    forecastQty: supplierId === 'a' ? 100 : 300,
    periodStart: `2026-09-0${week}`,
    periodEnd: `2026-09-0${week}`
  });

describe('PEX-D25 ltpSplitShares', () => {
  const lines = [line('a', 7), line('b', 7)];
  const window = ['2026-09-07'];
  it('splits by the sourcing share on record, whatever the LTP says', () => {
    const r = ltpSplitShares(
      [
        { supplierId: 'a', materialCode: 'M', share: 0.7 },
        { supplierId: 'b', materialCode: 'M', share: 0.3 }
      ],
      lines,
      'M',
      ['a', 'b'],
      window
    );
    expect(r.from).toBe('sourcing');
    expect([...r.shares]).toEqual([
      ['a', 0.7],
      ['b', 0.3]
    ]);
  });
  it('a supplier with no share on record for a material that has one reads 0', () => {
    const r = ltpSplitShares(
      [{ supplierId: 'a', materialCode: 'M', share: 1 }],
      lines,
      'M',
      ['a', 'b'],
      window
    );
    expect(r.shares.get('b')).toBe(0);
  });
  it('no share on record (none, or 0): falls back to the LTP share over the window', () => {
    for (const sources of [[], [{ supplierId: 'a', materialCode: 'M', share: 0 }]]) {
      const r = ltpSplitShares(sources, lines, 'M', ['a', 'b'], window);
      expect(r.from).toBe('ltp');
      // MR !102: a's 100 and b's 300 in the window give 25% and 75%.
      expect([...r.shares]).toEqual([
        ['a', 0.25],
        ['b', 0.75]
      ]);
    }
  });
});

// BL-313, PEX-D29 [Proposed]: each recorded share is divided by the total of the
// material's recorded shares, so no part of a material's LTP is left unassigned
// when SAP shares do not add up to 1 (the SAP quota-arrangement rule: a source's
// share is its quota over the sum of the quotas in force).
describe('BL-313 sourcing shares that do not add up to 1', () => {
  const lines = [line('a', 7), line('b', 7)];
  const window = ['2026-09-07'];
  /** @param {Map<string, number>} m */
  const total = (m) => [...m.values()].reduce((n, v) => n + v, 0);

  it('0.6 and 0.2 on record read 0.75 and 0.25: the whole LTP is assigned', () => {
    const r = ltpSplitShares(
      [
        { supplierId: 'a', materialCode: 'M', share: 0.6 },
        { supplierId: 'b', materialCode: 'M', share: 0.2 }
      ],
      lines,
      'M',
      ['a', 'b'],
      window
    );
    expect(r.from).toBe('sourcing');
    expect(r.shares.get('a')).toBeCloseTo(0.75, 12);
    expect(r.shares.get('b')).toBeCloseTo(0.25, 12);
    expect(total(r.shares)).toBeCloseTo(1, 12);
  });

  it('0.7 and 0.7 on record read 0.5 and 0.5: shares over 1 are scaled down', () => {
    const r = ltpSplitShares(
      [
        { supplierId: 'a', materialCode: 'M', share: 0.7 },
        { supplierId: 'b', materialCode: 'M', share: 0.7 }
      ],
      lines,
      'M',
      ['a', 'b'],
      window
    );
    expect(r.shares.get('a')).toBeCloseTo(0.5, 12);
    expect(r.shares.get('b')).toBeCloseTo(0.5, 12);
    expect(total(r.shares)).toBeCloseTo(1, 12);
  });

  it('a sourced supplier the LTP does not name keeps its part: the others are not scaled up', () => {
    const r = ltpSplitShares(
      [
        { supplierId: 'a', materialCode: 'M', share: 0.5 },
        { supplierId: 'b', materialCode: 'M', share: 0.3 },
        { supplierId: 'c', materialCode: 'M', share: 0.2 }
      ],
      lines,
      'M',
      ['a', 'b'],
      window
    );
    expect(r.from).toBe('sourcing');
    expect(r.shares.get('a')).toBeCloseTo(0.5, 12);
    expect(r.shares.get('b')).toBeCloseTo(0.3, 12);
    expect(r.shares.has('c')).toBe(false);
  });
});

describe('PEX-D25 through the DA read model', () => {
  it('PK-PETB-8801: sup-007 reads 70% and sup-012 30% of the uploaded LTP A', async () => {
    const MAT = 'PK-PETB-8801';
    const weeks = hubWeeks(sdcClock.now(), 6);
    const res = await cmd.dispatch(planning, {
      transitionId: 't_ltpinput_set',
      entity: 'ltpInput',
      entityId: `upload|${MAT}|A`,
      payload: { weeks: Object.fromEntries(weeks.map((w) => [w, 1000])), sourceFile: 'A.csv' }
    });
    expect(res.status).toBe('done');
    const lines = allCommitmentLines(null);
    const s7 = ltpWeeksOf({ supplierId: 'sup-007', materialCode: MAT }, weeks, lines);
    const s12 = ltpWeeksOf({ supplierId: 'sup-012', materialCode: MAT }, weeks, lines);
    expect(s7.split).toEqual({ share: 0.7, from: 'sourcing' });
    expect(s12.split).toEqual({ share: 0.3, from: 'sourcing' });
    expect(s7.a[0]).toBe(700);
    expect(s12.a[0]).toBe(300);
  });
});

describe('PEX-D26 brand share per month', () => {
  it('PK-CART-9901: the Emina share moves month to month (named values)', () => {
    const now = sdcClock.now();
    const f = brandSharesAt(now);
    const [aug, , , nov] = headsUpMonths(now);
    expect(f('PK-CART-9901', aug).get('Emina')).toBeCloseTo(0.363, 3);
    expect(f('PK-CART-9901', nov).get('Emina')).toBeCloseTo(0.511, 3);
    for (const m of [aug, nov]) {
      const total = [...f('PK-CART-9901', m).values()].reduce((n, v) => n + v, 0);
      expect(total).toBeCloseTo(1, 9);
    }
    expect(f('NO-SUCH-MATERIAL', aug).size).toBe(0);
  });

  it('only the per-brand rows change: group and per-material rows equal a one-share run', () => {
    const now = sdcClock.now();
    const perMonth = allCapacityHeadsUp(now);
    expect(perMonth.length).toBeGreaterThan(0);
    for (const r of perMonth)
      r.months.forEach((m, i) => {
        const materialSum = r.byMaterial.reduce((n, x) => n + x.months[i].demand, 0);
        expect(materialSum).toBe(m.demand);
        // Brand demands are rounded one by one: within one unit per brand of the group.
        const brandSum = r.byBrand.reduce((n, b) => n + b.months[i].demand, 0);
        expect(Math.abs(brandSum - m.demand)).toBeLessThanOrEqual(r.byBrand.length);
      });
  });
});
