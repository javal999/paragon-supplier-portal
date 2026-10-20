// ─────────────────────────────────────────────────────────────────────────────
// The Safety stock targets read keeps each E14-04 engine run per input
// (MockProcurementService `engineSafetyStock`, perf 2026-10-19). A kept run
// must never be served once an input changed. Each probe changes one input
// through the normal path (a command, or the hub clock) and asserts the NEXT
// read shows the new figure, and that the figure equals a fresh, uncached run.
//
// What the cache keys on: the engine dataset (one object per hub present), the
// day, the service targets and the safety lead time percentile in force. The
// OSIP inputs (consumption, level, NPD) are not kept; their probes are here so
// a later cache over them has to pass the same test.
// ─────────────────────────────────────────────────────────────────────────────

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService, commandAuditSink } from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import { engineDataset } from './fixtures/engineDataset';
import { consumptionStore } from './stores/consumptionStore';
import { osipLevelStore } from './stores/osipLevelStore';
import { hubSettingsStore } from '../../transitions/hubSettingsStore';
import { engineServiceTargets, safetyLeadTimePercentile } from '../../transitions/forecastConfig';
import { DEFAULT_SAFETY_STOCK_OPTIONS, safetyStockRun } from '../../engine/safetyStock';
import { dayOf } from '../../engine/dates';
import { sdcClock } from '../../sdc';
import { NO_PERSON } from '@context/noPerson';
/** @import { QueryScope, SafetyStockView } from '../types' */

const cmd = new MockCommandService();
const svc = new MockProcurementService();
/** @param {string[]} roles @returns {QueryScope} */
const seat = (roles) => ({
  personaType: 'buyer',
  supplierId: null,
  businessRoles: roles,
  actor: NO_PERSON
});

/** @returns {Promise<SafetyStockView>} */
const read = async () =>
  /** @type {SafetyStockView} */ (await svc.getSafetyStock(seat(['planning'])));

/** The run computed now from scratch, with nothing kept. */
const freshRun = () =>
  safetyStockRun(engineDataset(), {
    ...DEFAULT_SAFETY_STOCK_OPTIONS,
    asOf: dayOf(sdcClock.now()),
    targets: engineServiceTargets(),
    safetyLeadTimePercentile: safetyLeadTimePercentile()
  });

/** @param {SafetyStockView} run */
const figures = (run) =>
  run.materials.map((m) => ({
    materialCode: m.materialCode,
    target: m.target,
    safetyStock: m.safetyStock,
    reorderPoint: m.reorderPoint,
    engineSafetyStock: m.engineSafetyStock
  }));

beforeEach(() => {
  sdcClock.reset();
  hubSettingsStore.reset();
  consumptionStore.reset();
  osipLevelStore.reset();
  commandAuditSink.clear();
});
afterEach(() => {
  sdcClock.reset();
  hubSettingsStore.reset();
  consumptionStore.reset();
  osipLevelStore.reset();
});

describe('the kept engine run equals a fresh one, and is never served stale', () => {
  it('known-good: two reads in a row give the same figures as an uncached run', async () => {
    const first = await read();
    const second = await read();
    expect(figures(second)).toEqual(figures(first));
    expect(second.materials).toMatchObject(freshRun().materials);
  });

  it('a kept run is frozen: a reader cannot change the next read', async () => {
    const run = await read();
    expect(Object.isFrozen(run.materials)).toBe(false); // the read's own copy
    const m = run.materials[0];
    expect(() => {
      /** @type {{ errors: unknown[] }} */ (/** @type {unknown} */ (m)).errors.push(1);
    }).toThrow(TypeError);
  });

  it('a changed service target (t_setting_set) shows on the next read', async () => {
    const before = await read();
    const standard = before.materials.filter((m) => m.tier === 'standard');
    expect(standard.map((m) => m.target)).toContain(0.9);
    const r = await cmd.dispatch(seat(['compliance']), {
      transitionId: 't_setting_set',
      entity: 'hubSetting',
      entityId: 'engine.fillRateStandardPct',
      payload: { value: 86, setBy: NO_PERSON }
    });
    expect(r.status, r.reason).toBe('done');
    const after = await read();
    for (const m of after.materials.filter((x) => x.tier === 'standard'))
      expect(m.target, m.materialCode).toBe(0.86);
    // The probe moves a figure, so it is not satisfied by a run that ignores it.
    expect(figures(after)).not.toEqual(figures(before));
    expect(after.materials).toMatchObject(freshRun().materials);
  });

  it('a changed safety lead time percentile (t_setting_set) shows on the next read', async () => {
    const before = await read();
    const r = await cmd.dispatch(seat(['compliance']), {
      transitionId: 't_setting_set',
      entity: 'hubSetting',
      entityId: 'engine.safetyLeadTimePercentile',
      payload: { value: 95, setBy: NO_PERSON }
    });
    expect(r.status, r.reason).toBe('done');
    const after = await read();
    expect(after.parameters.safetyLeadTimePercentile).toBe(0.95);
    expect(after.safetyLeadTimes).not.toEqual(before.safetyLeadTimes);
    expect(after.materials).toMatchObject(freshRun().materials);
  });

  it('the run is kept between reads at one present, and dropped when the clock moves within the day', async () => {
    // A material's `errors` array is the kept run's own (the read copies the
    // material, not its errors), so its identity shows a kept run.
    const first = await read();
    const second = await read();
    expect(second.materials[0].errors).toBe(first.materials[0].errors);
    // An hour later on the same day: a new engine dataset, so a new run.
    sdcClock.set(`${dayOf(sdcClock.now())}T13:00:00.000Z`);
    const later = await read();
    expect(later.asOf).toBe(first.asOf);
    expect(later.materials[0].errors).not.toBe(first.materials[0].errors);
    expect(later.materials).toMatchObject(freshRun().materials);
  });

  it('advancing the hub clock drops the kept runs; moving it back gives the first figures again', async () => {
    const before = await read();
    sdcClock.set('2026-09-14T12:00:00.000Z');
    const later = await read();
    expect(later.asOf).toBe('2026-09-14');
    expect(later.previousAsOf.packaging).not.toBe(before.previousAsOf.packaging);
    expect(figures(later)).not.toEqual(figures(before));
    expect(later.materials).toMatchObject(freshRun().materials);
    sdcClock.reset();
    const back = await read();
    expect(back.asOf).toBe(before.asOf);
    expect(figures(back)).toEqual(figures(before));
  });
});

describe('the OSIP inputs on the same read follow their stores', () => {
  it('recorded consumption (t_consumption_record) shows in the next read', async () => {
    const code = 'RM-STEAR-7300';
    const consumptionOf = (/** @type {SafetyStockView} */ run) =>
      run.materials
        .find((m) => m.materialCode === code)
        ?.osip.suppliers.map((s) => [s.supplierId, s.consumption.length]);
    const before = await read();
    const r = await cmd.dispatch(seat(['planning']), {
      transitionId: 't_consumption_record',
      entity: 'consumption',
      payload: {
        materialCode: code,
        week: '2026-08-31',
        qty: 1_000,
        unit: 'KG',
        source: 'manual'
      }
    });
    expect(r.status, r.reason).toBe('done');
    const after = await read();
    expect(consumptionOf(after)).not.toEqual(consumptionOf(before));
    const total = after.materials
      .find((m) => m.materialCode === code)
      ?.osip.suppliers.reduce((s, x) => s + x.consumption.reduce((a, q) => a + q, 0), 0);
    expect(total).toBeCloseTo(1_000, 6);
  });

  it('a level set by the planner (t_osiplevel_set) shows in the next read', async () => {
    const levelOf = async () =>
      (await read()).materials.find((m) => m.materialCode === 'RM-STEAR-7300')?.rop.level.level;
    expect(await levelOf()).toBe(4);
    const r = await cmd.dispatch(seat(['planning']), {
      transitionId: 't_osiplevel_set',
      entity: 'osipLevel',
      entityId: 'RM-STEAR-7300',
      payload: { osipLevel: 5 }
    });
    expect(r.status, r.reason).toBe('done');
    expect(await levelOf()).toBe(5);
  });
});
