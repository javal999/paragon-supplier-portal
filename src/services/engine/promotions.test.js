// REQ-E14-08 BR-05 (BL-235) — a promotion for one SKU: how it is applied to the
// forecast, and when an entry is refused. The run is hand-built: the rule is
// arithmetic on a run, not on the engine.
import { describe, expect, it } from 'vitest';
/** @import { PromotionRow } from './promotions' */
import {
  PROMOTION_PERCENT_MAX,
  applyPromotions,
  liftOf,
  parsePromotionKey,
  promotionKey,
  promotionRefusal,
  promotionsInForce
} from './promotions';

const WEEKS = ['2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30'];
/** @param {string} skuCode @param {number[]} forecast @param {object} [extra] */
const sku = (skuCode, forecast, extra = {}) => ({
  skuCode,
  brand: 'Wardah',
  method: /** @type {const} */ ('comb'),
  endsOn: /** @type {string | null} */ (null),
  forecast,
  ...extra
});
const run = {
  weeks: WEEKS,
  excludedOem: [{ skuCode: 'OEM-1', name: 'oem', brand: 'Wardah' }],
  skus: [
    sku('A', [100, 200, 300, 400]),
    sku('B', [10, 20, 30, 40]),
    sku('END', [5, 5, 5, 5], { endsOn: '2026-11-23' }),
    sku('GONE', [0, 0, 0, 0], { method: 'discontinued' })
  ],
  brands: [{ key: 'Wardah', skuCodes: ['A', 'B', 'END', 'GONE'] }]
};
/** @param {string} skuCode @param {string} week @param {Partial<PromotionRow>} x @returns {PromotionRow} */
const row = (skuCode, week, x) => ({
  key: promotionKey(skuCode, week),
  skuCode,
  weekStart: week,
  status: 'Active',
  kind: 'percent',
  value: 20,
  previous: null,
  setAt: '2026-11-10T00:00:00Z',
  setBy: null,
  ...x
});
// The refusal reads only weeks, skus and excludedOem.
const refuse = (
  /** @type {string} */ id,
  /** @type {object} */ payload,
  /** @type {any[]} */ rows = []
) => promotionRefusal(/** @type {any} */ (run), rows, id, payload);

describe('applyPromotions', () => {
  it('adds a percentage to that week for that SKU only', () => {
    const out = applyPromotions(/** @type {any} */ (run), [row('A', WEEKS[1], {})]);
    expect(out.skus[0].forecast).toEqual([100, 240, 300, 400]);
    expect(out.skus[1].forecast).toEqual([10, 20, 30, 40]);
    expect(out.skus[0].promotions).toMatchObject([{ index: 1, forecast: 200, lift: 40 }]);
    expect(out.cells).toBe(1);
  });

  it('adds units, and re-sums brand and total from the SKUs', () => {
    const out = applyPromotions(/** @type {any} */ (run), [
      row('B', WEEKS[0], { kind: 'units', value: 15 })
    ]);
    expect(out.skus[1].forecast[0]).toBe(25);
    expect(out.brands[0].forecast[0]).toBe(100 + 25 + 5 + 0);
    expect(out.total[0]).toBe(130);
    expect(out.total[1]).toBe(225);
  });

  it('uses the latest row of a key: a change replaces, a withdrawal ends', () => {
    const rows = [
      row('A', WEEKS[1], {}),
      row('A', WEEKS[1], { value: 50, previous: { kind: 'percent', value: 20 } })
    ];
    expect(applyPromotions(/** @type {any} */ (run), rows).skus[0].forecast[1]).toBe(300);
    const ended = [...rows, row('A', WEEKS[1], { status: 'Withdrawn', kind: null, value: null })];
    expect(applyPromotions(/** @type {any} */ (run), ended).skus[0].forecast[1]).toBe(200);
    expect(promotionsInForce(ended).size).toBe(0);
  });

  it('leaves a discontinued SKU and an ended week at zero', () => {
    const out = applyPromotions(/** @type {any} */ (run), [
      row('GONE', WEEKS[0], { kind: 'units', value: 9 }),
      row('END', WEEKS[2], { kind: 'units', value: 9 }),
      row('END', WEEKS[1], { kind: 'units', value: 9 })
    ]);
    expect(out.skus[3].forecast).toEqual([0, 0, 0, 0]);
    expect(out.skus[2].forecast).toEqual([5, 14, 5, 5]);
    expect(out.cells).toBe(1);
  });

  it('is unchanged with no promotion', () => {
    const out = applyPromotions(/** @type {any} */ (run), []);
    expect(out.skus[0].forecast).toEqual([100, 200, 300, 400]);
    expect(out.cells).toBe(0);
  });

  it('rounds a percentage lift to whole units', () => {
    expect(liftOf(33, { kind: 'percent', value: 10 })).toBe(3);
    expect(liftOf(33, { kind: 'units', value: 7 })).toBe(7);
    expect(liftOf(33, { kind: null, value: null })).toBe(0);
  });
});

describe('promotionRefusal', () => {
  const id = promotionKey('A', WEEKS[1]);
  it('accepts a percentage and units, and a withdrawal of one in force', () => {
    expect(refuse(id, { kind: 'percent', value: 20 })).toBeNull();
    expect(refuse(id, { kind: 'percent', value: PROMOTION_PERCENT_MAX })).toBeNull();
    expect(refuse(id, { kind: 'units', value: 500 })).toBeNull();
    expect(
      refuse(id, { withdraw: true }, /** @type {any} */ ([row('A', WEEKS[1], {})]))
    ).toBeNull();
  });

  it.each([
    ['percent 0', { kind: 'percent', value: 0 }, 'PROMOTION_PERCENT_INVALID'],
    ['percent negative', { kind: 'percent', value: -5 }, 'PROMOTION_PERCENT_INVALID'],
    ['percent above the cap', { kind: 'percent', value: 301 }, 'PROMOTION_PERCENT_INVALID'],
    ['units fraction', { kind: 'units', value: 2.5 }, 'PROMOTION_UNITS_INVALID'],
    ['units zero', { kind: 'units', value: 0 }, 'PROMOTION_UNITS_INVALID'],
    ['no kind', { value: 5 }, 'PROMOTION_KIND_INVALID'],
    ['value not a number', { kind: 'units', value: '5' }, 'PROMOTION_VALUE_INVALID'],
    ['withdraw with none in force', { withdraw: true }, 'PROMOTION_NOT_FOUND']
  ])('refuses %s', (_n, payload, code) => {
    expect(refuse(id, payload)).toContain(code);
  });

  it('refuses an unchanged entry', () => {
    expect(
      refuse(id, { kind: 'percent', value: 20 }, /** @type {any} */ ([row('A', WEEKS[1], {})]))
    ).toContain('NO_CHANGE');
  });

  it('refuses a week outside the horizon, an unknown, OEM, discontinued or ended SKU', () => {
    const ok = { kind: 'units', value: 5 };
    expect(refuse(promotionKey('A', '2027-01-04'), ok)).toContain('WEEK_NOT_IN_HORIZON');
    expect(refuse(promotionKey('A', '2026-11-10'), ok)).toContain('WEEK_NOT_IN_HORIZON');
    expect(refuse(promotionKey('ZZ', WEEKS[0]), ok)).toContain('UNKNOWN_SKU');
    expect(refuse(promotionKey('OEM-1', WEEKS[0]), ok)).toContain('OEM_NOT_FORECAST');
    expect(refuse(promotionKey('GONE', WEEKS[0]), ok)).toContain('SKU_DISCONTINUED');
    expect(refuse(promotionKey('END', WEEKS[2]), ok)).toContain('SKU_ENDED');
    expect(refuse('nonsense', ok)).toContain('PROMOTION_KEY_INVALID');
  });

  it('round-trips the key', () => {
    expect(parsePromotionKey(id)).toEqual({ skuCode: 'A', weekStart: WEEKS[1] });
    expect(parsePromotionKey('promo|A')).toBeNull();
  });
});
