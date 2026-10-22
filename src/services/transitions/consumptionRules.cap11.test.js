// ────────────────────────────────────────────────────────────────────────────
// CAP-11 (BL-180) — the pure rules that stay under DRC-D13: the record in
// force, the split across suppliers (BL-211: by LTP share, CAP-D11; CAP-D14's
// split by demand anticipation kept as a variant), the verb's refusals and the
// upload template check.
//
// RETIRED with CAP-11 BR-02/03 (superseded by DRC-4 BR-02, BL-190, which
// absorbs a surplus in the last week of the rolling horizon): the excess of a
// frozen horizon, absorbing it into the next horizon, "a frozen week never
// changes", and `spreadExcess`. Their successors are in
// `demandAnticipationRules.drc2.test.js` ("DRC-4 BR-02 — supply above the
// demand anticipation"). The unabsorbed alert subject now reads DRC-4's
// surplus, tested below.
// ────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import { NO_PERSON } from '@context/noPerson';
import {
  consumptionInForce,
  consumptionRefusal,
  consumptionShares,
  consumptionTemplateCsv,
  validateConsumptionRows,
  withConsumption
} from './consumptionRules';
import { DEMAND_ANTICIPATION_RULES } from './demandAnticipationRules';
import { unabsorbedAlertSubjects } from './inventoryAlertRules';
import { parseCsv } from './inventoryRules';
/** @import { ConsumptionRecord } from './consumptionRules' */
/** @import { DemandAnticipationRowCore } from './demandAnticipationRules' */

const NOW = '2026-08-31T12:00:00.000Z';
const H1 = ['2026-08-31', '2026-09-07', '2026-09-14', '2026-09-21'];

/**
 * A page row holding `qty` in force every week of `weeks` and the LTP share
 * `share` (only the fields the split reads).
 * @param {string} supplierId
 * @param {number} qty
 * @param {readonly string[]} [weeks]
 * @param {number | null} [share]
 * @returns {DemandAnticipationRowCore}
 */
const row = (supplierId, qty, weeks = H1, share = 1) =>
  /** @type {DemandAnticipationRowCore} */ (
    /** @type {unknown} */ ({
      supplierId,
      materialCode: 'RM-1',
      share,
      weeks: weeks.map((week) => ({ week, qty, consumption: null, consumptionRecord: null }))
    })
  );

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

describe('the split across suppliers (BL-211, owner ruling 2026-10-19)', () => {
  // Worked by hand: 20,000 recorded; LTP shares 0.6 / 0.4; DA in force
  // 10,000 / 30,000 (the opposite way round, so the two splits disagree).
  const rows = () => [row('sup-A', 10_000, H1, 0.6), row('sup-B', 30_000, H1, 0.4)];

  it('the default is the LTP share: 20,000 × 0.6 = 12,000 and × 0.4 = 8,000', () => {
    expect(DEMAND_ANTICIPATION_RULES.consumptionSplit).toBe('ltpShare');
    const [a, b] = withConsumption(rows(), [rec(H1[0], 20_000)]);
    expect(a.weeks[0]).toMatchObject({ consumption: 12_000 });
    expect(b.weeks[0]).toMatchObject({ consumption: 8_000 });
    expect(a.weeks[0].consumptionRecord).toMatchObject({
      materialQty: 20_000,
      share: 0.6,
      source: 'manual'
    });
    // A week with no record reads null.
    expect(a.weeks[1].consumption).toBeNull();
  });

  it('variant demandAnticipation (CAP-D14): by the DA in force, 5,000 / 15,000', () => {
    const [a, b] = withConsumption(rows(), [rec(H1[0], 20_000)], 'demandAnticipation');
    expect(a.weeks[0]).toMatchObject({ consumption: 5_000 });
    expect(b.weeks[0]).toMatchObject({ consumption: 15_000 });
    expect(a.weeks[0].consumptionRecord?.share).toBe(0.25);
  });

  it('variant even: 10,000 each', () => {
    const [a, b] = withConsumption(rows(), [rec(H1[0], 20_000)], 'even');
    expect([a.weeks[0].consumption, b.weeks[0].consumption]).toEqual([10_000, 10_000]);
  });

  it('splits evenly when the weights add up to 0, under either weighted split', () => {
    const zero = [
      { supplierId: 'a', qty: 0, ltpShare: 0 },
      { supplierId: 'b', qty: 0, ltpShare: null }
    ];
    const half = new Map([
      ['a', 0.5],
      ['b', 0.5]
    ]);
    expect(consumptionShares(zero)).toEqual(half);
    expect(consumptionShares(zero, 'demandAnticipation')).toEqual(half);
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
    const [a] = withConsumption([row('sup-A', 20_000)], [first, later]);
    expect(a.weeks[0].consumption).toBe(18_000);
    expect(a.weeks[0].consumptionRecord?.recordId).toBe(later.id);
  });
});

describe('the unabsorbed alert subject (rewired to DRC-4 BR-02 / DRC-B7)', () => {
  const names = {
    supplierName: () => 'Supplier A',
    materialLabel: () => 'Material 1',
    uom: () => 'kg'
  };
  it('one subject per pair with the surplus the last week could not take', () => {
    const [s] = unabsorbedAlertSubjects(
      [
        {
          supplierId: 'sup-A',
          materialCode: 'RM-1',
          fromWeeks: H1.slice(0, 2),
          intoWeeks: [H1[1]],
          excess: 24,
          remaining: 16
        }
      ],
      NOW,
      names
    );
    expect(s).toMatchObject({ remaining: 16, intoWeeks: [H1[1]], uom: 'kg' });
    // Impact: from today to the end of that week (Sunday 13 Sep).
    expect(s.daysToImpact).toBe(13);
  });

  it('control — a surplus below the alert minimum raises no subject', () => {
    expect(
      unabsorbedAlertSubjects(
        [
          {
            supplierId: 'sup-A',
            materialCode: 'RM-1',
            fromWeeks: H1,
            intoWeeks: [H1[3]],
            excess: 0,
            remaining: 0
          }
        ],
        NOW,
        names
      )
    ).toEqual([]);
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
