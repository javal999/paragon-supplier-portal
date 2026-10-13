// ────────────────────────────────────────────────────────────────────────────
// CAP-11 (BL-180) — the pure rules: the record in force, the split across
// suppliers by demand anticipation share (CAP-D14), the excess of a frozen
// horizon (BR-01), absorbing it into the next horizon (BR-02, BR-03,
// CAP-D17), what stays unabsorbed (BR-04), the figure in force on the page's
// rows, the verb's refusals and the upload template check.
//
// Every scenario is built by hand: one frozen horizon W36–W39 (anchor Monday
// 31 Aug 2026) and today's figures from W36, so each number is the brief's.
// ────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import { NO_PERSON } from '@context/noPerson';
import {
  absorptionPlan,
  consumptionInForce,
  consumptionRefusal,
  consumptionShares,
  consumptionTemplateCsv,
  rowsInForce,
  seriesInForce,
  spreadExcess,
  validateConsumptionRows
} from './consumptionRules';
import { demandAnticipationRows, entriesToFreeze } from './demandAnticipationRules';
import { unabsorbedAlertSubjects } from './inventoryAlertRules';
import { parseCsv } from './inventoryRules';
/** @import { ConsumptionRecord } from './consumptionRules' */
/** @import { DemandAnticipationPublication, DemandAnticipationSeries } from './demandAnticipationRules' */

const NOW = '2026-08-31T12:00:00.000Z';
const H1 = ['2026-08-31', '2026-09-07', '2026-09-14', '2026-09-21'];
const H2 = ['2026-09-28', '2026-10-05', '2026-10-12', '2026-10-19'];
const SHOWN = Array.from({ length: 13 }, (_, i) =>
  new Date(Date.parse('2026-08-31T00:00:00Z') + i * 7 * 86_400_000).toISOString().slice(0, 10)
);
const INPUTS = { ltp: 0, stockShare: null, ropShare: null };

/**
 * One publication freezing `weeks` per supplier at `qty`.
 * @param {Record<string, number>} bySupplier
 * @param {readonly string[]} [weeks]
 * @param {string} [material]
 * @returns {DemandAnticipationPublication}
 */
const publication = (bySupplier, weeks = H1, material = 'RM-1') => ({
  id: 'dap-0001',
  publishedAt: NOW,
  actor: NO_PERSON,
  source: 'sampleSeed',
  horizonStart: weeks[0],
  horizonWeeks: weeks,
  entries: Object.entries(bySupplier).flatMap(([supplierId, qty]) =>
    weeks.map((week) => ({ supplierId, materialCode: material, week, qty, inputs: INPUTS }))
  )
});

/**
 * Today's figures: `qty` every shown week per supplier.
 * @param {Record<string, number>} bySupplier
 * @returns {DemandAnticipationSeries[]}
 */
const today = (bySupplier) =>
  Object.entries(bySupplier).map(([supplierId, qty]) => ({
    supplierId,
    materialCode: 'RM-1',
    share: 1,
    stockOnRecord: false,
    weeks: SHOWN.map((week) => ({ week, qty, inputs: { ...INPUTS, ltp: qty } }))
  }));

let n = 0;
/**
 * @param {string} week
 * @param {number} qty
 * @param {string} [material]
 * @returns {ConsumptionRecord}
 */
const rec = (week, qty, material = 'RM-1') => {
  n += 1;
  return {
    id: `con-${n}`,
    materialCode: material,
    week,
    qty,
    unit: 'kg',
    source: 'manual',
    recordedAt: NOW,
    actor: NO_PERSON
  };
};

/** @param {ReturnType<typeof absorptionPlan>} plan @param {string} s @param {string} w */
const absorbedOf = (plan, s, w) => plan.absorbed.get(`${s}|RM-1|${w}`)?.qty ?? 0;

describe('AC-01 (spec) — an excess of 12,000 over 20,000/wk in the next horizon', () => {
  it('takes 3,000 off each of W40–W43, so each reads 17,000', () => {
    const pubs = [publication({ 'sup-A': 20_000 })];
    // W36 frozen at 20,000, consumption 8,000 → excess 12,000.
    const plan = absorptionPlan(
      { publications: pubs, today: today({ 'sup-A': 20_000 }), records: [rec(H1[0], 8_000)] },
      NOW
    );
    expect(H2.map((w) => absorbedOf(plan, 'sup-A', w))).toEqual([3_000, 3_000, 3_000, 3_000]);
    expect(plan.unabsorbed).toEqual([]);
    const rows = rowsInForce(demandAnticipationRows(pubs, today({ 'sup-A': 20_000 }), NOW), plan);
    const weeks = rows[0].weeks;
    expect(H2.map((w) => weeks.find((x) => x.week === w)?.qty)).toEqual([
      17_000, 17_000, 17_000, 17_000
    ]);
    expect(weeks.find((x) => x.week === H2[0])?.absorbed).toEqual({
      qty: 3_000,
      fromHorizonStart: H1[0],
      fromWeeks: H1
    });
    expect(weeks.find((x) => x.week === H1[0])?.consumption).toBe(8_000);
  });
});

describe('AC-02 — an excess of 90,000 over 20,000/wk', () => {
  const pubs = [publication({ 'sup-A': 30_000 })];
  // 4 × (30,000 − 7,500) = 90,000.
  const records = H1.map((w) => rec(w, 7_500));
  const plan = absorptionPlan(
    { publications: pubs, today: today({ 'sup-A': 20_000 }), records },
    NOW
  );

  it('absorbs 20,000 in each week, never below 0, and leaves 10,000 unabsorbed', () => {
    expect(H2.map((w) => absorbedOf(plan, 'sup-A', w))).toEqual([20_000, 20_000, 20_000, 20_000]);
    expect(plan.unabsorbed).toEqual([
      {
        supplierId: 'sup-A',
        materialCode: 'RM-1',
        fromWeeks: H1,
        intoWeeks: H2,
        excess: 90_000,
        remaining: 10_000
      }
    ]);
    const rows = rowsInForce(demandAnticipationRows(pubs, today({ 'sup-A': 20_000 }), NOW), plan);
    for (const w of H2) expect(rows[0].weeks.find((x) => x.week === w)?.qty).toBe(0);
  });

  it('raises the alert subject with the remaining 10,000', () => {
    const subjects = unabsorbedAlertSubjects(plan.unabsorbed, NOW, {
      supplierName: () => 'Supplier A',
      materialLabel: () => 'Raw one',
      uom: () => 'kg'
    });
    expect(subjects).toEqual([
      expect.objectContaining({
        supplierId: 'sup-A',
        materialCode: 'RM-1',
        remaining: 10_000,
        uom: 'kg',
        fromWeeks: H1,
        intoWeeks: H2
      })
    ]);
  });

  it('control — an excess within the next horizon raises no alert subject', () => {
    const within = absorptionPlan(
      { publications: pubs, today: today({ 'sup-A': 30_000 }), records },
      NOW
    );
    expect(within.unabsorbed).toEqual([]);
    expect(
      unabsorbedAlertSubjects(within.unabsorbed, NOW, {
        supplierName: String,
        materialLabel: String,
        uom: String
      })
    ).toEqual([]);
  });
});

describe('AC-03 — no consumption recorded', () => {
  it('means no excess and no adjustment: the rows are exactly the CAP-10 rows', () => {
    const pubs = [publication({ 'sup-A': 20_000 })];
    const plan = absorptionPlan(
      { publications: pubs, today: today({ 'sup-A': 20_000 }), records: [] },
      NOW
    );
    expect(plan.absorbed.size).toBe(0);
    expect(plan.unabsorbed).toEqual([]);
    const base = demandAnticipationRows(pubs, today({ 'sup-A': 20_000 }), NOW);
    expect(rowsInForce(base, plan)).toEqual(base);
  });

  it('a week with consumption at or above the frozen figure adds nothing', () => {
    const pubs = [publication({ 'sup-A': 20_000 })];
    const plan = absorptionPlan(
      {
        publications: pubs,
        today: today({ 'sup-A': 20_000 }),
        records: [rec(H1[0], 25_000), rec(H1[1], 20_000)]
      },
      NOW
    );
    expect(plan.absorbed.size).toBe(0);
  });
});

describe('a frozen week never changes', () => {
  it('absorbs only into the next horizon’s weeks no publication froze, and keeps a frozen figure', () => {
    // W40 is already frozen at 20,000 (a partial later publication); W41–W43 are open.
    const pubs = [
      publication({ 'sup-A': 20_000 }),
      { ...publication({ 'sup-A': 20_000 }, [H2[0]]), id: 'dap-0002' }
    ];
    const plan = absorptionPlan(
      { publications: pubs, today: today({ 'sup-A': 20_000 }), records: [rec(H1[0], 8_000)] },
      NOW
    );
    expect(H2.map((w) => absorbedOf(plan, 'sup-A', w))).toEqual([0, 4_000, 4_000, 4_000]);
    const rows = rowsInForce(demandAnticipationRows(pubs, today({ 'sup-A': 20_000 }), NOW), plan);
    const w40 = rows[0].weeks.find((x) => x.week === H2[0]);
    expect(w40?.frozen).toBe(true);
    expect(w40?.qty).toBe(20_000);
    expect(w40?.absorbed).toBeNull();
    // And the frozen horizon the excess arose in keeps its figure too.
    expect(rows[0].weeks.find((x) => x.week === H1[0])?.qty).toBe(20_000);
  });

  it('a horizon frozen WITH its absorption is not absorbed twice, and "would be" compares like for like', () => {
    const plan0 = absorptionPlan(
      {
        publications: [publication({ 'sup-A': 20_000 })],
        today: today({ 'sup-A': 20_000 }),
        records: [rec(H1[0], 8_000)]
      },
      NOW
    );
    // Publishing W40–W43 now freezes the figure in force, carrying the absorption.
    const entries = entriesToFreeze(
      [publication({ 'sup-A': 20_000 })],
      seriesInForce(today({ 'sup-A': 20_000 }), plan0),
      H2
    );
    expect(entries.map((e) => e.qty)).toEqual([17_000, 17_000, 17_000, 17_000]);
    expect(entries[0].absorbed).toEqual({ qty: 3_000, fromHorizonStart: H1[0] });
    const pubs = [
      publication({ 'sup-A': 20_000 }),
      { ...publication({ 'sup-A': 0 }, H2), id: 'dap-0002', entries }
    ];
    const plan = absorptionPlan(
      { publications: pubs, today: today({ 'sup-A': 20_000 }), records: [rec(H1[0], 8_000)] },
      NOW
    );
    expect(plan.unabsorbed).toEqual([]);
    const rows = rowsInForce(demandAnticipationRows(pubs, today({ 'sup-A': 20_000 }), NOW), plan);
    const w40 = rows[0].weeks.find((x) => x.week === H2[0]);
    expect(w40?.qty).toBe(17_000);
    expect(w40?.absorbed?.qty).toBe(3_000);
    expect(w40?.wouldBe).toBe(17_000);
    expect(w40?.delta).toBe(0);
  });

  it('a larger excess found after the next horizon froze cannot be absorbed: it is unabsorbed', () => {
    const entries = H2.map((week) => ({
      supplierId: 'sup-A',
      materialCode: 'RM-1',
      week,
      qty: 17_000,
      inputs: INPUTS,
      absorbed: { qty: 3_000, fromHorizonStart: H1[0] }
    }));
    const pubs = [
      publication({ 'sup-A': 20_000 }),
      { ...publication({ 'sup-A': 0 }, H2), id: 'dap-0002', entries }
    ];
    // A later record lowers W36 to 5,000: the excess is now 15,000, 12,000 was absorbed.
    const plan = absorptionPlan(
      {
        publications: pubs,
        today: today({ 'sup-A': 20_000 }),
        records: [rec(H1[0], 8_000), rec(H1[0], 5_000)]
      },
      NOW
    );
    expect(plan.unabsorbed.map((u) => u.remaining)).toEqual([3_000]);
  });
});

describe('the split across suppliers (CAP-D14)', () => {
  it('shares a material’s week by each supplier’s frozen demand anticipation', () => {
    const pubs = [publication({ 'sup-A': 30_000, 'sup-B': 10_000 })];
    const plan = absorptionPlan(
      {
        publications: pubs,
        today: today({ 'sup-A': 30_000, 'sup-B': 10_000 }),
        records: [rec(H1[0], 20_000)]
      },
      NOW
    );
    expect(plan.consumption.get(`sup-A|RM-1|${H1[0]}`)?.qty).toBe(15_000);
    expect(plan.consumption.get(`sup-B|RM-1|${H1[0]}`)?.qty).toBe(5_000);
    // Excess 15,000 and 5,000 → 3,750 and 1,250 a week.
    expect(absorbedOf(plan, 'sup-A', H2[0])).toBe(3_750);
    expect(absorbedOf(plan, 'sup-B', H2[0])).toBe(1_250);
  });

  it('splits evenly when the week’s demand anticipation is 0', () => {
    expect(
      consumptionShares([
        { supplierId: 'a', qty: 0 },
        { supplierId: 'b', qty: 0 }
      ])
    ).toEqual(
      new Map([
        ['a', 0.5],
        ['b', 0.5]
      ])
    );
  });
});

describe('a later record supersedes the earlier one at read', () => {
  it('keeps the latest per material × week; both stay in the list given', () => {
    const first = rec(H1[0], 8_000);
    const later = rec(H1[0], 18_000);
    const other = rec(H1[1], 1);
    const inForce = consumptionInForce([first, later, other]);
    expect(inForce.get(`RM-1|${H1[0]}`)).toBe(later);
    expect(inForce.size).toBe(2);
    const plan = absorptionPlan(
      {
        publications: [publication({ 'sup-A': 20_000 })],
        today: today({ 'sup-A': 20_000 }),
        records: [first, later]
      },
      NOW
    );
    // 20,000 − 18,000 = 2,000 → 500 a week.
    expect(absorbedOf(plan, 'sup-A', H2[0])).toBe(500);
  });
});

describe('spreadExcess — evenly, never below 0, what a week cannot take moves on', () => {
  it('puts the remainder on the earliest weeks', () => {
    expect(spreadExcess(10, [100, 100, 100, 100])).toEqual({ takes: [3, 3, 2, 2], left: 0 });
  });
  it('carries what a small week cannot take to the next one', () => {
    expect(spreadExcess(12_000, [1_000, 20_000, 20_000, 20_000])).toEqual({
      takes: [1_000, 5_000, 3_000, 3_000],
      left: 0
    });
  });
  it('never takes a week below 0, and returns what is left after the last week', () => {
    expect(spreadExcess(8_000, [1_000, 1_000, 1_000, 3_000])).toEqual({
      takes: [1_000, 1_000, 1_000, 3_000],
      left: 2_000
    });
    expect(spreadExcess(400, [-50, 100, 100, 100]).takes[0]).toBe(0);
  });
  it('with no week to take it, everything is left', () => {
    expect(spreadExcess(5, [])).toEqual({ takes: [], left: 5 });
  });
});

describe('the record verb’s rule', () => {
  const ctx = { uomOf: (/** @type {string} */ c) => (c === 'RM-1' ? 'kg' : null), nowIso: NOW };
  const ok = { materialCode: 'RM-1', week: H1[0], qty: 10, unit: 'kg', source: 'manual' };
  it('accepts a known material, a Monday up to the current week, a positive quantity', () => {
    expect(consumptionRefusal(ok, ctx)).toBeNull();
    // Zero is a real week with no use, not a refusal.
    expect(consumptionRefusal({ ...ok, qty: 0 }, ctx)).toBeNull();
    expect(consumptionRefusal({ ...ok, week: '2026-08-24', source: 'upload' }, ctx)).toBeNull();
  });
  it.each([
    [{ materialCode: 'RM-X' }, 'UNKNOWN_MATERIAL'],
    [{ week: '2026-09-01' }, 'NOT_A_WEEK'],
    [{ week: '2026-02-30' }, 'NOT_A_WEEK'],
    [{ week: H1[1] }, 'FUTURE_WEEK'],
    [{ qty: -5 }, 'NOT_A_QUANTITY'],
    [{ qty: -1 }, 'NOT_A_QUANTITY'],
    [{ qty: NaN }, 'NOT_A_QUANTITY'],
    [{ qty: '10' }, 'NOT_A_QUANTITY'],
    [{ unit: 'pcs' }, 'UNIT_MISMATCH'],
    [{ source: 'sap' }, 'BAD_SOURCE']
  ])('refuses %o as %s', (patch, code) => {
    expect(consumptionRefusal({ ...ok, ...patch }, ctx)).toBe(code);
  });
});

describe('the upload template', () => {
  const ctx = { uomOf: (/** @type {string} */ c) => (c === 'RM-1' ? 'kg' : null), nowIso: NOW };

  it('downloads with one prefilled row per material × week, and reads back clean once filled', () => {
    const csv = consumptionTemplateCsv([{ materialCode: 'RM-1', uom: 'kg' }], [H1[0]], 'en');
    expect(csv).toBe('Material code,Week (Monday),Consumption,Unit\nRM-1,2026-08-31,,kg\n');
    const filled = parseCsv(csv.replace(',,kg', ',8000,kg'));
    expect(validateConsumptionRows(filled.headers, filled.rows, ctx)).toEqual({
      ok: true,
      accepted: [{ row: 2, materialCode: 'RM-1', week: H1[0], qty: 8_000, unit: 'kg' }],
      refused: []
    });
  });

  it('reads the Indonesian headers, and a date inside the week counts as its Monday', () => {
    const f = parseCsv(
      'Kode material;Minggu (Senin);Pemakaian;Satuan\nRM-1;2026-08-27;1500;kg\nRM-1;2026-08-31;1.500;kg\n'
    );
    const out = validateConsumptionRows(f.headers, f.rows, ctx);
    expect(out.ok && out.accepted).toEqual([
      { row: 2, materialCode: 'RM-1', week: '2026-08-24', qty: 1_500, unit: 'kg' }
    ]);
    // "1.500" reads 1.5 in English and 1,500 in Indonesian: refused, never guessed.
    expect(out.ok && out.refused).toEqual([
      { row: 3, materialCode: 'RM-1', reason: 'ambiguousNumber' }
    ]);
  });

  it('accepts a row of 0: a week with no use', () => {
    const f = parseCsv('Material code,Week (Monday),Consumption,Unit\nRM-1,2026-08-31,0,kg\n');
    expect(validateConsumptionRows(f.headers, f.rows, ctx)).toEqual({
      ok: true,
      accepted: [{ row: 2, materialCode: 'RM-1', week: H1[0], qty: 0, unit: 'kg' }],
      refused: []
    });
  });

  it('refuses an old or unrelated file whole, naming the missing columns', () => {
    const f = parseCsv('Material code,SOH,Unit\nRM-1,100,kg\n');
    expect(validateConsumptionRows(f.headers, f.rows, ctx)).toEqual({
      ok: false,
      missing: ['week', 'qty']
    });
  });

  it('refuses each bad row on its own, and both rows of a material × week given twice', () => {
    const f = parseCsv(
      [
        'Material code,Week (Monday),Consumption,Unit',
        'RM-X,2026-08-31,10,kg',
        'RM-1,2026-09-07,10,kg',
        'RM-1,2026-08-31,abc,kg',
        'RM-1,2026-08-31,-3,kg',
        'RM-1,2026-08-31,10,pcs',
        'RM-1,not a date,10,kg',
        'RM-1,2026-08-24,5,kg',
        'RM-1,2026-08-25,6,kg',
        'RM-1,2026-08-17,,kg'
      ].join('\n')
    );
    const out = validateConsumptionRows(f.headers, f.rows, ctx);
    expect(out.ok && out.refused.map((r) => [r.row, r.reason])).toEqual([
      [2, 'unknownMaterial'],
      [3, 'futureWeek'],
      [4, 'notANumber'],
      [5, 'notANumber'],
      [6, 'unitMismatch'],
      [7, 'notAWeek'],
      [8, 'duplicateRow'],
      [9, 'duplicateRow']
    ]);
    // The blank row 10 is the prefilled template left empty: skipped, not refused.
    expect(out.ok && out.accepted).toEqual([]);
  });
});
