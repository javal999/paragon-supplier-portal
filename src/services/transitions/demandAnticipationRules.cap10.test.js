// ─────────────────────────────────────────────────────────────────────────────
// CAP-10 (BL-179) — the demand anticipation formula and the freeze rules,
// SC-HUB-DEMAND-ANTICIPATION-BRIEF-2026-10 §3 and §4. Pure functions, synthetic
// inputs: the brief's own example, a surplus that spills past week 1, two
// suppliers sharing one material's stock, and a monthly raw-material LTP
// spread by day.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import {
  DEMAND_ANTICIPATION_RULES,
  demandAnticipationFigures,
  demandAnticipationRows,
  demandAnticipationWeeks,
  entriesToFreeze,
  frozenEntryOf,
  nextHorizon,
  publishRefusal,
  publishedWeeks
} from './demandAnticipationRules';
/** @import { DemandAnticipationPublication } from './demandAnticipationRules' */
/** @import { LtpLine } from './capacityRules' */

// Monday 31 August 2026 (ISO week 36), 19:00 WIB.
const NOW = '2026-08-31T12:00:00.000Z';
const W = ['2026-08-31', '2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28'];

/**
 * A weekly LTP line.
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

/**
 * @param {string} materialCode
 * @param {number} ptiSoh
 * @param {number} ptiRop
 */
const stock = (materialCode, ptiSoh, ptiRop) => ({
  materialCode,
  ptiSoh,
  ptiRop,
  consignment: false
});

/** @param {readonly LtpLine[]} ltpLines @param {readonly ReturnType<typeof stock>[]} ptiStock */
const figuresOf = (ltpLines, ptiStock) =>
  demandAnticipationWeeks({ ltpLines, ptiStock }, NOW, 4).map((s) => ({
    supplierId: s.supplierId,
    qty: s.weeks.map((w) => w.qty)
  }));

const FOUR_WEEKS_OF_400 = W.slice(0, 4).map((w) => weekLine('sup-A', 'M-1', w, 400));

describe('CAP-10 · the formula (brief §3, CAP-D12)', () => {
  it('the brief example: share 100%, SOH 1,800, ROP 1,500, LTP 400 × 4 → 100, 400, 400, 400', () => {
    expect(figuresOf(FOUR_WEEKS_OF_400, [stock('M-1', 1800, 1500)])).toEqual([
      { supplierId: 'sup-A', qty: [100, 400, 400, 400] }
    ]);
  });

  it('below the reorder point: SOH 1,200 → week 1 is 400 + 300 = 700, later weeks the LTP', () => {
    expect(figuresOf(FOUR_WEEKS_OF_400, [stock('M-1', 1200, 1500)])).toEqual([
      { supplierId: 'sup-A', qty: [700, 400, 400, 400] }
    ]);
  });

  it('a surplus larger than week 1 spills into week 2 and is used up week by week', () => {
    // SOH 2,500 − ROP 1,500 = 1,000 above: week 1 takes 400, week 2 takes 400,
    // week 3 the last 200.
    expect(figuresOf(FOUR_WEEKS_OF_400, [stock('M-1', 2500, 1500)])).toEqual([
      { supplierId: 'sup-A', qty: [0, 0, 200, 400] }
    ]);
  });

  it('stock and reorder point count once: each week returns its inputs, the LTP every week', () => {
    const [s] = demandAnticipationWeeks(
      { ltpLines: FOUR_WEEKS_OF_400, ptiStock: [stock('M-1', 1200, 1500)] },
      NOW,
      4
    );
    expect(s.weeks.map((w) => w.inputs)).toEqual(
      W.slice(0, 4).map(() => ({ ltp: 400, stockShare: 1200, ropShare: 1500 }))
    );
    expect(s.weeks.map((w) => w.week)).toEqual(W.slice(0, 4));
  });

  it('two suppliers share the stock and the reorder point by their LTP share over the 4 weeks', () => {
    // sup-A 300/wk, sup-B 100/wk → 75% / 25%. SOH 1,200, ROP 2,000.
    const lines = W.slice(0, 4).flatMap((w) => [
      weekLine('sup-A', 'M-2', w, 300),
      weekLine('sup-B', 'M-2', w, 100)
    ]);
    const rows = demandAnticipationWeeks(
      { ltpLines: lines, ptiStock: [stock('M-2', 1200, 2000)] },
      NOW,
      4
    );
    expect(rows.map((r) => [r.supplierId, r.share])).toEqual([
      ['sup-A', 0.75],
      ['sup-B', 0.25]
    ]);
    // sup-A: 900 stock, 1,500 ROP → week 1 = 300 + 600; sup-B: 300 / 500 → 100 + 200.
    expect(rows.map((r) => r.weeks.map((w) => w.qty))).toEqual([
      [900, 300, 300, 300],
      [300, 100, 100, 100]
    ]);
    // Together week 1 tops PTI's stock back up to the reorder point: 400 + 800.
    expect(rows[0].weeks[0].qty + rows[1].weeks[0].qty).toBe(400 + (2000 - 1200));
  });

  it('a monthly raw-material LTP is spread by day into its weeks', () => {
    // September: 3,000 kg over 30 days = 100 a day. The week of 31 Aug holds 6
    // September days (1–6 Sep), the next weeks 7 each. No PTI stock record: the
    // figure is the LTP.
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
    const [s] = demandAnticipationWeeks({ ltpLines: lines, ptiStock: [] }, NOW, 4);
    expect(s.weeks.map((w) => w.inputs.ltp)).toEqual([600, 700, 700, 700]);
    expect(s.weeks.map((w) => w.qty)).toEqual([600, 700, 700, 700]);
    expect(s.stockOnRecord).toBe(false);
    expect(s.weeks[0].inputs.stockShare).toBeNull();
  });

  it('a material with no LTP in the share window splits its stock evenly', () => {
    const lines = [weekLine('sup-A', 'M-3', W[4], 100), weekLine('sup-B', 'M-3', W[4], 300)];
    const rows = demandAnticipationWeeks(
      { ltpLines: lines, ptiStock: [stock('M-3', 0, 1000)] },
      NOW,
      5
    );
    expect(rows.map((r) => r.share)).toEqual([0.5, 0.5]);
    expect(rows.map((r) => r.weeks[0].qty)).toEqual([500, 500]);
  });

  it('demandAnticipationFigures alone: no stock record means no stock adjustment', () => {
    expect(demandAnticipationFigures({ ltp: [5, 6], stockShare: null, ropShare: null })).toEqual([
      5, 6
    ]);
  });

  it('every placeholder value sits in the one config block (CAP-D16)', () => {
    expect(DEMAND_ANTICIPATION_RULES).toEqual({
      horizonWeeks: 4,
      shareWindowWeeks: 4,
      shownWeeks: 13
    });
    expect(Object.isFrozen(DEMAND_ANTICIPATION_RULES)).toBe(true);
  });
});

/**
 * @param {string} id
 * @param {readonly string[]} horizonWeeks
 * @param {readonly { supplierId: string; materialCode: string; week: string; qty: number }[]} entries
 * @returns {DemandAnticipationPublication}
 */
const pub = (id, horizonWeeks, entries) => ({
  id,
  publishedAt: NOW,
  actor: { kind: 'UNATTRIBUTED', reason: 'NO_PERSON_IN_SESSION' },
  source: 'publish',
  horizonStart: horizonWeeks[0],
  horizonWeeks,
  entries: entries.map((e) => ({ ...e, inputs: { ltp: e.qty, stockShare: null, ropShare: null } }))
});

describe('CAP-10 · freezing (brief §4, CAP-D13, BR-01 to BR-04)', () => {
  it('BR-01 — with nothing frozen a publication freezes the 4 weeks from the current hub week', () => {
    expect(nextHorizon([], NOW)).toEqual(W.slice(0, 4));
  });

  it('AC-02 shape — with weeks 1 to 4 frozen the next horizon is weeks 5 to 8, this week or a week later', () => {
    const frozen = W.slice(0, 4);
    const next = ['2026-09-28', '2026-10-05', '2026-10-12', '2026-10-19'];
    expect(nextHorizon(frozen, NOW)).toEqual(next);
    expect(nextHorizon(frozen, '2026-09-08T03:00:00.000Z')).toEqual(next);
    // Both horizons frozen: nothing more until the hub week reaches week 5.
    expect(nextHorizon([...frozen, ...next], NOW)).toBeNull();
    expect(nextHorizon([...frozen, ...next], '2026-09-28T03:00:00.000Z')?.[0]).toBe('2026-10-26');
  });

  it('BR-02 — the first publication that froze a week keeps it: a later one never wins at read', () => {
    const first = pub('dap-0001', W.slice(0, 4), [
      { supplierId: 'sup-A', materialCode: 'M-1', week: W[1], qty: 400 }
    ]);
    const later = pub('dap-0002', W.slice(1, 5), [
      { supplierId: 'sup-A', materialCode: 'M-1', week: W[1], qty: 10_400 }
    ]);
    expect(frozenEntryOf([first, later], 'sup-A', 'M-1', W[1])?.entry.qty).toBe(400);
    expect(frozenEntryOf([first, later], 'sup-A', 'M-1', W[1])?.publication.id).toBe('dap-0001');
    expect(frozenEntryOf([first, later], 'sup-A', 'M-1', W[2])).toBeNull();
  });

  it('BR-02 — a publication adds only the weeks of its horizon no earlier one froze', () => {
    const today = demandAnticipationWeeks(
      { ltpLines: FOUR_WEEKS_OF_400, ptiStock: [stock('M-1', 1800, 1500)] },
      NOW,
      4
    );
    const first = pub('dap-0001', W.slice(0, 2), [
      { supplierId: 'sup-A', materialCode: 'M-1', week: W[0], qty: 1 },
      { supplierId: 'sup-A', materialCode: 'M-1', week: W[1], qty: 2 }
    ]);
    expect(entriesToFreeze([first], today, W.slice(0, 4)).map((e) => [e.week, e.qty])).toEqual([
      [W[2], 400],
      [W[3], 400]
    ]);
    expect(entriesToFreeze([], today, W.slice(0, 4)).map((e) => e.qty)).toEqual([
      100, 400, 400, 400
    ]);
  });

  it('AC-01 — a new LTP raising week 2 by 10,000 leaves the frozen figure and shows would be +10,000', () => {
    const before = demandAnticipationWeeks(
      { ltpLines: FOUR_WEEKS_OF_400, ptiStock: [stock('M-1', 1200, 1500)] },
      NOW
    );
    const seeded = pub('dap-0001', W.slice(0, 4), entriesToFreeze([], before, W.slice(0, 4)));
    const raised = FOUR_WEEKS_OF_400.map((l) =>
      l.periodStart === W[1] ? { ...l, forecastQty: l.forecastQty + 10_000 } : l
    );
    const after = demandAnticipationWeeks(
      { ltpLines: raised, ptiStock: [stock('M-1', 1200, 1500)] },
      NOW
    );
    const [row] = demandAnticipationRows([seeded], after, NOW);
    const week2 = /** @type {(typeof row.weeks)[number]} */ (
      row.weeks.find((w) => w.week === W[1])
    );
    expect(week2).toMatchObject({
      frozen: true,
      published: 400,
      qty: 400,
      wouldBe: 10_400,
      delta: 10_000
    });
    // An open week shows today's figure, with no "would be" difference.
    const week5 = /** @type {(typeof row.weeks)[number]} */ (
      row.weeks.find((w) => w.week === W[4])
    );
    expect(week5).toMatchObject({ frozen: false, published: null, delta: null });
    expect(row.weeks).toHaveLength(DEMAND_ANTICIPATION_RULES.shownWeeks);
  });

  it('the publish refusals: nothing to freeze, and a confirm naming another horizon', () => {
    expect(publishRefusal(W[0], W.slice(0, 4), 3)).toBeNull();
    expect(publishRefusal(W[1], W.slice(0, 4), 3)).toBe('STALE_HORIZON');
    expect(publishRefusal(W[0], W.slice(0, 4), 0)).toBe('NOTHING_TO_FREEZE');
    expect(publishRefusal(W[0], null, 0)).toBe('NOTHING_TO_FREEZE');
  });

  it('publishedWeeks is the union of every publication horizon', () => {
    expect(
      publishedWeeks([pub('a', W.slice(0, 4), []), pub('b', W.slice(2, 5), [])]).sort()
    ).toEqual(W);
  });
});
