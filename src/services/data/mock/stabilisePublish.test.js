// ────────────────────────────────────────────────────────────────────────────
// REQ-E14-06 (X-03, ENG-B35) — the stabilised engine plan never reaches a
// supplier on synthetic data. Dispatched through the REAL MockCommandService
// against the real forecast version store, probed both ways, and read back as
// the supplier: a publication that names the engine as its source is refused
// BY NAME while the engine dataset is simulated; after the liveness flips it is
// STILL refused, by name, until SOMO ratifies C8 §8; nothing is created either
// way; and the same verb without the engine (SAP's plan, as today) still
// publishes — the known-good half.
//
// The flip is the `rescheduleRelease.test.js` shape: `isLive` wrapped,
// delegating to the real predicate unless a test sets the flip, and the real
// answer asserted first.
// ────────────────────────────────────────────────────────────────────────────

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const flip = vi.hoisted(() => ({ engineDataset: /** @type {boolean | null} */ (null) }));
vi.mock('../../liveness/registry', async (importOriginal) => {
  const actual =
    await /** @type {typeof importOriginal<typeof import('../../liveness/registry')>} */ (
      importOriginal
    )();
  return {
    ...actual,
    /** @param {Parameters<typeof actual.isLive>[0]} c */
    isLive: (c) =>
      c === 'engineDataset' && flip.engineDataset !== null ? flip.engineDataset : actual.isLive(c)
  };
});

import { MockCommandService } from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import { forecastVersionStore, forecastViewStore } from './stores/forecastHubStores';
/** @import { QueryScope } from '../types' */
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { POLICY_HOOKS } from '../../transitions/policyHooks';
import { refusedByPolicy } from '../../transitions/refusalMessage';
import { forecastVersionFlow } from '../../transitions/flows/forecastVersion.flow';
import { isLive } from '../../liveness/registry';
import { stabiliseEn, stabiliseId } from '@lib/i18n/stabilise';
import { sdcClock } from '../../sdc';
import { NO_PERSON } from '@context/noPerson';

const cmd = new MockCommandService();
const reads = new MockProcurementService();
/** @type {QueryScope} */
const planner = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer,
  actor: NO_PERSON
};
/** @type {QueryScope} */
const supplier = {
  personaType: 'supplier',
  supplierId: 'sup-007',
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON
};

/**
 * @param {Record<string, unknown>} payload
 * @param {QueryScope} [scope]
 */
const publish = (payload, scope = planner) =>
  cmd.dispatch(scope, {
    transitionId: 't_forecastversion_publish',
    entity: 'forecastVersion',
    payload
  });

beforeEach(() => {
  forecastVersionStore.reset();
  forecastViewStore.reset();
  sdcClock.reset();
  flip.engineDataset = null;
});
afterEach(() => {
  flip.engineDataset = null;
});

describe('the verb carries the rule', () => {
  it('t_forecastversion_publish carries FORECAST_ENGINE_PUBLISH_ALLOWED beside its own validity hook', () => {
    const t = /** @type {import('../../transitions/schema').TransitionDef} */ (
      forecastVersionFlow.transitions.find((x) => x.id === 't_forecastversion_publish')
    );
    expect(t.policyHooks).toEqual([
      POLICY_HOOKS.FORECAST_PUBLISH_VALID,
      POLICY_HOOKS.FORECAST_ENGINE_PUBLISH_ALLOWED
    ]);
  });
});

describe('X-03 — refused while the engine dataset is simulated', () => {
  it('the real registry says simulated, and an engine publication is refused BY NAME; nothing is created', async () => {
    expect(isLive('engineDataset')).toBe(false);
    const before = forecastVersionStore.all().length;
    const supplierSawBefore = (await reads.getForecastVersions(supplier)).items.map(
      (v) => v.publicationId
    );
    for (const stream of ['packaging', 'rawMaterial']) {
      const res = await publish({ stream, source: 'engine' });
      expect(res.status).toBe('failed');
      if (res.status !== 'failed') continue;
      expect(refusedByPolicy(res.reason, POLICY_HOOKS.FORECAST_ENGINE_PUBLISH_ALLOWED)).toBe(true);
      expect(res.reason).toContain('ENGINE_DATA_SIMULATED');
    }
    expect(forecastVersionStore.all().length).toBe(before);
    expect((await reads.getForecastVersions(supplier)).items.map((v) => v.publicationId)).toEqual(
      supplierSawBefore
    );
  });

  it('the known-good half: the same verb without the engine publishes SAP’s plan, as today', async () => {
    const before = forecastVersionStore.all().length;
    const res = await publish({ stream: 'packaging' });
    expect(res.status).not.toBe('failed');
    expect(forecastVersionStore.all().length).toBe(before + 1);
  });

  it('an unknown source is refused by name, not treated as SAP', async () => {
    const res = await publish({ stream: 'packaging', source: 'spreadsheet' });
    expect(res.status).toBe('failed');
    if (res.status === 'failed') expect(res.reason).toContain('UNKNOWN_SOURCE');
  });

  it('a supplier cannot reach the verb at all', async () => {
    await expect(
      publish({ stream: 'packaging', source: 'engine' }, supplier)
    ).rejects.toMatchObject({ code: 'SCOPE_DENIED' });
  });
});

describe('ENG-B35 — once the data is live, still refused until SOMO ratifies C8 §8', () => {
  it('the flip moves the refusal from ENGINE_DATA_SIMULATED to C8_ENGINE_SOURCE_UNRATIFIED, on the same service instance; nothing is created', async () => {
    flip.engineDataset = true;
    expect(isLive('engineDataset')).toBe(true);
    const before = forecastVersionStore.all().length;
    const res = await publish({ stream: 'packaging', source: 'engine' });
    expect(res.status).toBe('failed');
    if (res.status === 'failed') {
      expect(refusedByPolicy(res.reason, POLICY_HOOKS.FORECAST_ENGINE_PUBLISH_ALLOWED)).toBe(true);
      expect(res.reason).toContain('C8_ENGINE_SOURCE_UNRATIFIED');
      expect(res.reason).not.toContain('ENGINE_DATA_SIMULATED');
    }
    expect(forecastVersionStore.all().length).toBe(before);
  });
});

describe('the page’s words for each refusal exist in both languages', () => {
  it('EN and ID', () => {
    for (const k of [
      'stb.refusal.simulated',
      'stb.refusal.c8',
      'stb.publish.withheld',
      'stb.withheld'
    ]) {
      expect(stabiliseEn[k], k).toBeTruthy();
      expect(stabiliseId[k], k).toBeTruthy();
    }
  });
});
