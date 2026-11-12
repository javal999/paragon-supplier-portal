// BL-235 (REQ-E14-08 BR-05) — `t_promotion_set` dispatched through the REAL
// MockCommandService and read back through the REAL service: a planner adds,
// changes and withdraws a promotion for one SKU; the forecast shown applies it
// to that week for that SKU only; who may enter; the history is kept.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService } from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import { promotionStore } from './stores/promotionStore';
import { forecastOverrideStore } from './stores/forecastOverrideStore';
import { currentDemandForecast } from './demandForecastRun';
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { sdcClock } from '../../sdc';
import { NO_PERSON } from '@context/noPerson';

const cmd = new MockCommandService();
const svc = new MockProcurementService();
/** @type {import('../types').QueryScope} */
const planning = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['planning'],
  actor: NO_PERSON
};
/** @type {import('../types').QueryScope} */
const procurement = { ...planning, businessRoles: ['procurement'] };
/** @type {import('../types').QueryScope} */
const supplier = {
  personaType: 'supplier',
  supplierId: 'sup-007',
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON
};

beforeEach(() => {
  sdcClock.reset();
  promotionStore.reset();
  forecastOverrideStore.reset();
});
afterEach(() => {
  promotionStore.reset();
  forecastOverrideStore.reset();
  sdcClock.reset();
});

const base = () => currentDemandForecast();
/** A SKU that takes a promotion in week index 3, and another to prove it stays alone. */
const pick = () => {
  const run = base();
  const live = run.skus.filter((s) => s.method !== 'discontinued' && s.endsOn === null);
  return { run, a: live[0], b: live[1], week: run.weeks[3] };
};
/** @param {import('../types').QueryScope} scope @param {string} sku @param {string} week @param {Record<string, unknown>} payload */
const set = (scope, sku, week, payload) =>
  cmd.dispatch(scope, {
    transitionId: 't_promotion_set',
    entity: 'promotion',
    entityId: `promo|${sku}|${week}`,
    payload
  });
/** A refusal is a failed result or a thrown DataError; both leave the ledger alone. */
const outcome = async (/** @type {() => Promise<{ status: string }>} */ run) => {
  try {
    return (await run()).status;
  } catch (e) {
    return `threw ${/** @type {{ code?: string }} */ (e).code}`;
  }
};
const shown = async () => {
  const v = await svc.getDemandForecast(planning);
  if (!v) throw new Error('no view');
  return v;
};

describe('t_promotion_set', () => {
  it('adds a percentage to that SKU and week only; brand and total follow', async () => {
    const { run, a, b, week } = pick();
    const i = run.weeks.indexOf(week);
    const before = await shown();
    expect((await set(planning, a.skuCode, week, { kind: 'percent', value: 50 })).status).toBe(
      'done'
    );
    const after = await shown();
    const sa = after.skus.find((s) => s.skuCode === a.skuCode);
    const sb = after.skus.find((s) => s.skuCode === b.skuCode);
    const lift = Math.round((a.forecast[i] * 50) / 100);
    expect(sa?.forecast[i]).toBe(a.forecast[i] + lift);
    expect(sa?.forecast.filter((_v, k) => k !== i)).toEqual(a.forecast.filter((_v, k) => k !== i));
    expect(sa?.promotions).toMatchObject([{ index: i, lift, kind: 'percent', value: 50 }]);
    expect(sb?.forecast).toEqual(b.forecast);
    expect(sb?.promotions).toEqual([]);
    expect(after.total.forecast[i]).toBe(before.total.forecast[i] + lift);
    const brand = after.brands.find((x) => x.key === a.brand);
    const brandBefore = before.brands.find((x) => x.key === a.brand);
    expect((brand?.forecast[i] ?? 0) - (brandBefore?.forecast[i] ?? 0)).toBe(lift);
    expect(after.promotionCells).toBe(1);
    expect(after.promotionsInForce).toBe(1);
  });

  it('adds units, then a change replaces it, then a withdrawal restores the forecast', async () => {
    const { run, a, week } = pick();
    const i = run.weeks.indexOf(week);
    expect((await set(planning, a.skuCode, week, { kind: 'units', value: 700 })).status).toBe(
      'done'
    );
    expect((await shown()).skus.find((s) => s.skuCode === a.skuCode)?.forecast[i]).toBe(
      a.forecast[i] + 700
    );
    expect((await set(planning, a.skuCode, week, { kind: 'units', value: 100 })).status).toBe(
      'done'
    );
    expect((await shown()).skus.find((s) => s.skuCode === a.skuCode)?.forecast[i]).toBe(
      a.forecast[i] + 100
    );
    expect((await set(planning, a.skuCode, week, { withdraw: true })).status).toBe('done');
    const end = await shown();
    expect(end.skus.find((s) => s.skuCode === a.skuCode)?.forecast[i]).toBe(a.forecast[i]);
    expect(end.promotionsInForce).toBe(0);
    // append-only: three rows, the change and the withdrawal say what they replaced
    const hist = end.promotionHistory;
    expect(hist.map((h) => h.status)).toEqual(['Withdrawn', 'Active', 'Active']);
    expect(hist[1].previous).toEqual({ kind: 'units', value: 700 });
    expect(hist[2].previous).toBeNull();
    expect(hist.every((h) => h.setAt && h.setBy)).toBe(true);
  });

  it('an override on the same cell wins; the engine value shown includes the promotion', async () => {
    const { run, a, week } = pick();
    const i = run.weeks.indexOf(week);
    await set(planning, a.skuCode, week, { kind: 'units', value: 50 });
    const view = await shown();
    const s = view.skus.find((x) => x.skuCode === a.skuCode);
    expect(s?.engineForecast[i]).toBe(a.forecast[i] + 50);
  });

  it('refuses what the rule refuses, and writes nothing', async () => {
    const { a, week } = pick();
    for (const payload of [
      { kind: 'percent', value: 0 },
      { kind: 'percent', value: 1000 },
      { kind: 'units', value: 1.5 },
      { withdraw: true }
    ]) {
      expect(await outcome(() => set(planning, a.skuCode, week, payload))).toBe('failed');
    }
    expect(
      await outcome(() => set(planning, a.skuCode, '2020-01-06', { kind: 'units', value: 5 }))
    ).toBe('threw NOT_FOUND');
    expect(promotionStore.all()).toHaveLength(0);
  });

  it('refuses a second identical entry (one active promotion per SKU per week)', async () => {
    const { a, week } = pick();
    expect((await set(planning, a.skuCode, week, { kind: 'percent', value: 10 })).status).toBe(
      'done'
    );
    expect((await set(planning, a.skuCode, week, { kind: 'percent', value: 10 })).status).toBe(
      'failed'
    );
    expect(promotionStore.all()).toHaveLength(1);
  });

  it('only the planning seat may enter; a supplier is denied', async () => {
    const { a, week } = pick();
    const payload = { kind: 'units', value: 5 };
    expect(await outcome(() => set(procurement, a.skuCode, week, payload))).not.toBe('done');
    expect(await outcome(() => set(supplier, a.skuCode, week, payload))).toBe('threw SCOPE_DENIED');
    expect(promotionStore.all()).toHaveLength(0);
  });

  it('a supplier gets no forecast at all', async () => {
    expect(await svc.getDemandForecast(supplier)).toBeNull();
  });
});
