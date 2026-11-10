// BL-269 (PEX-4) — the capacity heads-up rules: the doc's AC-01, the bands, the
// no-capacity month, per material and brand, and the treemap geometry.
import { describe, expect, it } from 'vitest';
import {
  buildHeadsUp,
  capacityMonthRefusal,
  headsUpBand,
  headsUpMonths,
  isMonthlyEntryMonth,
  mondaysOfMonth,
  monthlyEntry,
  treemapLayout,
  utilisationPct
} from './capacityHeadsUpRules';

// The hub's present is Monday 2026-08-31: the 13 weekly buckets run to 2026-11-23.
const NOW = '2026-08-31T12:00:00.000Z';
const HORIZON = Array.from({ length: 13 }, (_, i) => {
  const d = new Date(Date.UTC(2026, 7, 31 + i * 7));
  return d.toISOString().slice(0, 10);
});

describe('PEX-4 AC-01', () => {
  it('demand 700 on capacity 1,000 reads 70%, green; 690 reads 69%, under-used', () => {
    const cap = { capacity: 1000, be: 1000 };
    expect(utilisationPct(700, 1000)).toBe(70);
    expect(headsUpBand(700, cap)).toBe('within');
    expect(utilisationPct(690, 1000)).toBe(69);
    expect(headsUpBand(690, cap)).toBe('underUsed');
  });
  it('rounds down, so a month under 70% never reads 70%', () => {
    expect(utilisationPct(6996, 10000)).toBe(69);
    expect(headsUpBand(6996, { capacity: 10000, be: 10000 })).toBe('underUsed');
  });
});

describe('bands (BR-04) and no capacity (BR-06)', () => {
  it('keeps the built bands above the under-used line', () => {
    expect(headsUpBand(1100, { capacity: 1000, be: 1200 })).toBe('needsAdditional');
    expect(headsUpBand(1300, { capacity: 1000, be: 1200 })).toBe('cannotSupply');
  });
  it('a month with no capacity is unconfirmed and has no percentage, not 0%', () => {
    expect(headsUpBand(500, null)).toBe('unconfirmed');
    expect(utilisationPct(500, null)).toBeNull();
    expect(utilisationPct(500, 0)).toBeNull();
  });
});

describe('months and which are entered by month (BR-01)', () => {
  it('opens 12 months on the current month', () => {
    const m = headsUpMonths(NOW);
    expect(m).toHaveLength(12);
    expect(m[0]).toBe('2026-08');
    expect(m[11]).toBe('2027-07');
  });
  it('only the Mondays not yet past count; a month beyond the 13 weeks is entered by month', () => {
    expect(mondaysOfMonth('2026-08', '2026-08-31')).toEqual(['2026-08-31']);
    expect(isMonthlyEntryMonth('2026-08', HORIZON)).toBe(false);
    expect(isMonthlyEntryMonth('2026-10', HORIZON)).toBe(false);
    // November's last Monday (30th) is outside the horizon (it ends 2026-11-23).
    expect(isMonthlyEntryMonth('2026-11', HORIZON)).toBe(true);
    expect(isMonthlyEntryMonth('2027-03', HORIZON)).toBe(true);
  });
  it('refuses a monthly entry for a month the weekly entry covers, and bad numbers', () => {
    const allowed = ['2026-11', '2026-12'];
    expect(capacityMonthRefusal([{ month: '2026-12', allocated: 10 }], allowed)).toBeNull();
    expect(capacityMonthRefusal([{ month: '2026-09', allocated: 10 }], allowed)).toMatch(
      /NOT_ENTERED_BY_MONTH/
    );
    expect(capacityMonthRefusal([{ month: '2026-12', allocated: -1 }], allowed)).toMatch(
      /CAPACITY_INVALID/
    );
    expect(capacityMonthRefusal([{ month: '2026-12', allocated: 1, upside: -1 }], allowed)).toMatch(
      /UPSIDE_INVALID/
    );
    expect(capacityMonthRefusal([], allowed)).toMatch(/MONTHS_REQUIRED/);
    expect(
      capacityMonthRefusal(
        [
          { month: '2026-12', allocated: 1 },
          { month: '2026-12', allocated: 2 }
        ],
        allowed
      )
    ).toMatch(/MONTH_TWICE/);
  });
  it('the latest submission that states a month is in force', () => {
    const subs = [
      {
        id: 'a',
        supplierId: 's',
        planningGroupId: 'g',
        submittedAt: '1',
        months: [{ month: '2026-12', allocated: 5 }]
      },
      {
        id: 'b',
        supplierId: 's',
        planningGroupId: 'g',
        submittedAt: '2',
        months: [{ month: '2026-12', allocated: 9, upside: 3 }]
      }
    ];
    expect(monthlyEntry(subs, 's', 'g', '2026-12')).toEqual({ allocated: 9, upside: 3 });
    expect(monthlyEntry(subs, 's', 'g', '2027-01')).toBeNull();
    expect(monthlyEntry(subs, 'other', 'g', '2026-12')).toBeNull();
  });
});

describe('buildHeadsUp', () => {
  /** @type {any} */
  const plan = {
    supplierId: 's',
    supplierName: 'Supplier S',
    planningGroupId: 'g',
    materials: ['M1', 'M2'],
    uom: 'PCS',
    weeks: HORIZON.map((week) => ({ week, demand: 0, entry: { week, allocated: 100 } }))
  };
  const weeklyDemand = (
    /** @type {string} */ _s,
    /** @type {string} */ m,
    /** @type {string} */ _w
  ) => (m === 'M1' ? 60 : 20);
  const brandShares = (/** @type {string} */ m) =>
    m === 'M1'
      ? new Map([
          ['Wardah', 0.75],
          ['Emina', 0.25]
        ])
      : new Map();
  const rows = buildHeadsUp({
    plans: [plan],
    submissions: [
      {
        id: 'x',
        supplierId: 's',
        planningGroupId: 'g',
        submittedAt: '1',
        months: [{ month: '2026-12', allocated: 1000 }]
      }
    ],
    weeklyDemand,
    brandShares,
    nowIso: NOW
  });
  const [r] = rows;

  it('a weekly month sums the weeks: August has one Monday left', () => {
    const aug = r.months[0];
    expect(aug).toMatchObject({ month: '2026-08', source: 'weekly', capacity: 100, demand: 80 });
    expect(aug.utilisationPct).toBe(80);
    expect(aug.band).toBe('within');
  });
  it('September has 4 Mondays: capacity 400, demand 320', () => {
    expect(r.months[1]).toMatchObject({
      month: '2026-09',
      capacity: 400,
      demand: 320,
      utilisationPct: 80
    });
  });
  it('a monthly month reads the monthly entry; one with none is unconfirmed', () => {
    const dec = r.months.find((m) => m.month === '2026-12');
    // December has 4 Mondays (7, 14, 21, 28): demand 4 × 80 = 320 on capacity 1,000.
    expect(dec).toMatchObject({
      source: 'monthly',
      capacity: 1000,
      demand: 320,
      utilisationPct: 32,
      band: 'underUsed'
    });
    const jan = r.months.find((m) => m.month === '2027-01');
    expect(jan).toMatchObject({
      source: null,
      capacity: null,
      utilisationPct: null,
      band: 'unconfirmed'
    });
  });
  it('per material: demand ÷ the GROUP capacity, so the materials add up to the group (BR-07)', () => {
    const sep = r.months[1];
    const parts = r.byMaterial.map((m) => m.months[1]);
    expect(parts.map((p) => p.utilisationPct)).toEqual([60, 20]);
    expect(parts.reduce((n, p) => n + p.demand, 0)).toBe(sep.demand);
  });
  it('per brand: a material splits by its shares, one with none is "No brand on record"', () => {
    const sep = r.months[1];
    const byBrand = Object.fromEntries(r.byBrand.map((b) => [b.brand, b.months[1].demand]));
    expect(byBrand).toEqual({ Emina: 60, 'No brand on record': 80, Wardah: 180 });
    expect(Object.values(byBrand).reduce((n, v) => n + v, 0)).toBe(sep.demand);
  });
});

describe('treemapLayout (BR-05)', () => {
  it('areas are proportional to size and tile the box; sizeless items are left out', () => {
    const tiles = treemapLayout(
      [
        { id: 'a', size: 60 },
        { id: 'b', size: 30 },
        { id: 'c', size: 10 },
        { id: 'd', size: 0 }
      ],
      100,
      50
    );
    expect(tiles.map((t) => t.id).sort()).toEqual(['a', 'b', 'c']);
    const area = (/** @type {{ w: number; h: number }} */ t) => t.w * t.h;
    const total = 100 * 50;
    for (const t of tiles) expect(area(t) / total).toBeCloseTo(t.size / 100, 6);
    expect(tiles.reduce((n, t) => n + area(t), 0)).toBeCloseTo(total, 6);
  });
});
