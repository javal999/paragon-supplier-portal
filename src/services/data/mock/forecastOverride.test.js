// ────────────────────────────────────────────────────────────────────────────
// REQ-E14-11 X-06 / BR-03 — the override verb, dispatched through the REAL
// MockCommandService against the real store and read back through the REAL
// service. Probed both ways: a Material Planning seat is allowed; a buyer seat
// without the planning lane is refused at the ROLE gate and a supplier at SCOPE,
// by name; an upward override without a reason code is refused by name while
// the same override with one goes through; the forecast shown on both pages
// then carries it, and material planning does not.
// ────────────────────────────────────────────────────────────────────────────

import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService } from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import { forecastOverrideStore } from './stores/forecastOverrideStore';
import { currentDemandForecast, currentForecastBias } from './demandForecastRun';
/** @import { QueryScope } from '../types' */
import { DataError } from '../types';
import { PERSONA_SYSTEM_ROLES, SYSTEM_ROLES } from '../../transitions/businessRoles';
import { POLICY_HOOKS } from '../../transitions/policyHooks';
import { refusedByPolicy } from '../../transitions/refusalMessage';
import { forecastOverrideFlow } from '../../transitions/flows/forecastOverride.flow';
import {
  STARTER_REASON_CODES,
  activeReasonCodes,
  reasonCodeStore
} from '../../transitions/reasonCodes';
import { NO_PERSON } from '@context/noPerson';

const cmd = new MockCommandService();
const svc = new MockProcurementService();
/** @type {QueryScope} */
const planning = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['planning'],
  actor: NO_PERSON
};
/** @type {QueryScope} */
const defaultBuyer = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer,
  actor: NO_PERSON
};
/** @type {QueryScope} */
const procurement = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['procurement'],
  actor: NO_PERSON
};
/** @type {QueryScope} */
const finance = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['finance'],
  actor: NO_PERSON
};
/** @type {QueryScope} */
const supplier = {
  personaType: 'supplier',
  supplierId: 'sup-007',
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON
};

const run = currentDemandForecast();
const sku = /** @type {import('../../engine/demandForecast').SkuForecast} */ (
  run.skus.find((s) => s.method === 'comb')
);
const W = run.weeks[2];
const engine = sku.forecast[2];

/**
 * @param {QueryScope} scope
 * @param {Record<string, unknown>} payload
 */
const override = (scope, payload) =>
  cmd.dispatch(scope, {
    transitionId: 't_forecastoverride_record',
    entity: 'forecastOverride',
    payload: { skuCode: sku.skuCode, weekStart: W, ...payload }
  });

// The bias replay (52 origins) runs once, outside the per-test clock; memoised after.
beforeAll(() => {
  currentForecastBias();
}, 60_000);
beforeEach(() => {
  forecastOverrideStore.reset();
  reasonCodeStore.reset();
});

describe('the verb', () => {
  it('is creation-only, one state, gated by forecastoverride:record and FORECAST_OVERRIDE_VALID', () => {
    const t = forecastOverrideFlow.transitions[0];
    expect(t).toMatchObject({
      id: 't_forecastoverride_record',
      trigger: 'creation',
      to: 'Recorded',
      requiredRole: 'forecastoverride:record'
    });
    expect(t.policyHooks).toEqual([POLICY_HOOKS.FORECAST_OVERRIDE_VALID]);
  });

  it('the atom is held by the planning lane (ENG-D11) and by no supplier lane, procurement or finance', () => {
    const holders = Object.entries(SYSTEM_ROLES)
      .filter(([, atoms]) =>
        /** @type {readonly string[]} */ (atoms).includes('forecastoverride:record')
      )
      .map(([id]) => id);
    expect(holders).toContain('planning');
    for (const not of [
      'procurement',
      'finance',
      'compliance',
      'receiving',
      'requisitioner',
      'supplier',
      'commercial',
      'fulfilment',
      'back_office'
    ]) {
      expect(holders).not.toContain(not);
    }
  });

  it('the override reason list is the starter list proposed (ENG-B104)', () => {
    expect(STARTER_REASON_CODES.forecastOverride).toEqual([
      'promotion',
      'customer-order',
      'listing-gain',
      'listing-loss',
      'market-info',
      'data-correction',
      'other'
    ]);
  });
});

describe('X-06 — who may override (probed both ways)', () => {
  it('known-good: a Material Planning seat records an override with who, when, old, new, engine value and reason', async () => {
    const res = await override(planning, {
      newValue: engine + 300,
      reasonCode: 'promotion',
      note: 'Ramadan display in Alfamart'
    });
    expect(res.status, res.reason).toBe('done');
    const [o] = forecastOverrideStore.all();
    expect(o).toMatchObject({
      skuCode: sku.skuCode,
      weekStart: W,
      engineValue: engine,
      oldValue: engine,
      newValue: engine + 300,
      reasonCode: 'promotion',
      note: 'Ramadan display in Alfamart',
      runWeek: run.weeks[0],
      recordedBy: NO_PERSON
    });
    expect(typeof o.recordedAt).toBe('string');
  });

  it('the default buyer seat (all buyer lanes) also holds it', async () => {
    expect((await override(defaultBuyer, { newValue: engine - 10 })).status).toBe('done');
  });

  it('known-bad: a procurement seat and a finance seat are refused at the ROLE gate by name; nothing recorded', async () => {
    for (const seat of [procurement, finance]) {
      const res = await override(seat, { newValue: engine + 300, reasonCode: 'promotion' });
      expect(res.status).toBe('failed');
      expect(res.reason).toMatch(/^ROLE_NOT_PERMITTED/);
      expect(res.reason).toMatch(/forecastoverride:record/);
    }
    expect(forecastOverrideStore.all()).toEqual([]);
  });

  it('known-bad: a supplier is refused at SCOPE (the override is PTI’s); nothing recorded', async () => {
    await expect(
      override(supplier, { newValue: engine + 300, reasonCode: 'promotion' })
    ).rejects.toBeInstanceOf(DataError);
    expect(forecastOverrideStore.all()).toEqual([]);
  });
});

describe('BR-03 — an upward override needs a reason code', () => {
  it('known-bad: upward without a reason is refused by name through the policy hook; the same with a reason goes through', async () => {
    const bad = await override(planning, { newValue: engine + 1 });
    expect(bad.status).toBe('failed');
    expect(refusedByPolicy(bad.reason, POLICY_HOOKS.FORECAST_OVERRIDE_VALID)).toBe(true);
    expect(bad.reason).toMatch(/REASON_REQUIRED/);
    expect(forecastOverrideStore.all()).toEqual([]);
    const good = await override(planning, { newValue: engine + 1, reasonCode: 'customer-order' });
    expect(good.status, good.reason).toBe('done');
  });

  it('a downward override may go without one; the second override of the cell records the first as its old value', async () => {
    expect((await override(planning, { newValue: engine - 100 })).status).toBe('done');
    expect((await override(planning, { newValue: engine - 200 })).status).toBe('done');
    const [, second] = forecastOverrideStore.all();
    expect(second).toMatchObject({
      oldValue: engine - 100,
      newValue: engine - 200,
      engineValue: engine,
      reasonCode: null
    });
  });

  it('the old and engine values are read from the run, never from the form', async () => {
    const res = await override(planning, { newValue: engine - 5, oldValue: 1, engineValue: 2 });
    expect(res.status).toBe('done');
    expect(forecastOverrideStore.all()[0]).toMatchObject({ oldValue: engine, engineValue: engine });
  });

  it('the administrator’s list is read at the act: a code added is accepted, a code retired is refused (BL-32)', async () => {
    /** @type {QueryScope} */
    const admin = {
      personaType: 'buyer',
      supplierId: null,
      businessRoles: ['compliance'],
      actor: NO_PERSON
    };
    /**
     * @param {string} code
     * @param {string} labelEn
     * @param {string} labelId
     * @param {boolean} active
     */
    const set = (code, labelEn, labelId, active) =>
      cmd.dispatch(admin, {
        transitionId: 't_reasoncode_set',
        entity: 'reasonCode',
        entityId: `forecastOverride:${code}`,
        payload: { labelEn, labelId, active, setBy: NO_PERSON }
      });
    expect(
      (await override(planning, { newValue: engine + 7, reasonCode: 'tender-win' })).reason
    ).toMatch(/UNKNOWN_REASON/);
    expect((await set('tender-win', 'Tender won', 'Menang tender', true)).status).toBe('done');
    expect(
      (await override(planning, { newValue: engine + 7, reasonCode: 'tender-win' })).status
    ).toBe('done');
    expect(
      (
        await set(
          'promotion',
          'Promotion or activity not in the history',
          'Promosi atau aktivitas yang tidak ada di riwayat',
          false
        )
      ).status
    ).toBe('done');
    expect(activeReasonCodes('forecastOverride')).not.toContain('promotion');
    expect(
      (await override(planning, { newValue: engine + 9, reasonCode: 'promotion' })).reason
    ).toMatch(/UNKNOWN_REASON/);
    reasonCodeStore.reset();
  });

  it('a code the list does not offer is refused by name', async () => {
    const res = await override(planning, { newValue: engine + 5, reasonCode: 'gut-feel' });
    expect(res.reason).toMatch(/UNKNOWN_REASON/);
  });
});

describe('the forecast shown carries it; material planning does not (ENG-B103, ENG-B66)', () => {
  it('Demand forecast: the SKU week, its brand and the total move by the difference; the engine’s values stay beside', async () => {
    const before = /** @type {import('../types').DemandForecastView} */ (
      await svc.getDemandForecast(planning)
    );
    expect(before.overrideCells).toBe(0);
    expect(before.total.forecast).toEqual(before.total.engineForecast);
    await override(planning, { newValue: engine + 400, reasonCode: 'promotion' });
    const after = /** @type {import('../types').DemandForecastView} */ (
      await svc.getDemandForecast(planning)
    );
    const s = /** @type {import('../types').DemandForecastSkuView} */ (
      after.skus.find((x) => x.skuCode === sku.skuCode)
    );
    expect(s.forecast[2]).toBe(engine + 400);
    expect(s.engineForecast[2]).toBe(engine);
    expect(s.overridden).toEqual([2]);
    const brand = /** @type {import('../types').DemandForecastLevelView} */ (
      after.brands.find((b) => b.key === sku.brand)
    );
    expect(brand.forecast[2] - brand.engineForecast[2]).toBe(400);
    expect(after.total.forecast[2] - before.total.forecast[2]).toBe(400);
    expect(after.overrideCells).toBe(1);
    expect(after.materialPlanningSource).toBe('sapPlan');
  });

  it('Forecast bias: the ledger (latest first) and the current run with the override applied', async () => {
    await override(planning, { newValue: engine - 50 });
    await override(planning, { newValue: engine + 60, reasonCode: 'market-info' });
    const view = /** @type {import('../types').ForecastBiasView} */ (
      await svc.getForecastBias(planning)
    );
    expect(view.overrides.map((o) => o.newValue)).toEqual([engine + 60, engine - 50]);
    expect(
      /** @type {import('../types').DemandForecastSkuView} */ (
        view.current.skus.find((x) => x.skuCode === sku.skuCode)
      ).forecast[2]
    ).toBe(engine + 60);
    // The weeks overridden have not sold yet: waiting, nothing measured, nothing invented.
    expect(view.value).toMatchObject({ recorded: 2, measured: 0, waiting: 1, months: [] });
    expect(view.serviceJudgement).toBe('awaitsBacktest');
  });

  it('X-03: a supplier gets nothing from either read', async () => {
    expect(await svc.getForecastBias(supplier)).toBeNull();
    expect(await svc.getDemandForecast(supplier)).toBeNull();
  });
});
