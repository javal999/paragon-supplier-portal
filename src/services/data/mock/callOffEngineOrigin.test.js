// ────────────────────────────────────────────────────────────────────────────
// X-03 (owner decision 2026-09-23) — a call-off drafted from an engine
// recommendation is not released to a supplier while the engine runs on
// simulated data. Dispatched through the REAL MockCommandService against the
// real stores, probed both ways: an engine-origin draft is refused BY NAME
// while simulated, an ordinary draft still releases, and the same engine draft
// releases once the liveness flips — on the SAME service instance, which is
// what proves the hook reads the registry at call time rather than a copy.
//
// The flip: `engineDataset` is null-backed and harvest-gated, so no edit short
// of re-modelling the registry turns it green (see the control below). The
// registry's `isLive` is therefore wrapped, delegating to the real predicate
// unless a test sets the flip — the real answer is asserted first, so the
// wrapper cannot be mistaken for the registry.
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
import { callOffStore } from './stores/callOffStore';
import { purchaseOrderStore } from './stores/purchaseOrderStore';
/** @import { QueryScope } from '../types' */
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { POLICY_HOOKS } from '../../transitions/policyHooks';
import { engineReleaseWithheld } from '../../transitions/callOffRules';
import { refusedByPolicy } from '../../transitions/refusalMessage';
import { callOffFlow } from '../../transitions/flows/callOff.flow';
import {
  awaitsHarvest,
  capabilityBacking,
  isGreenFrom,
  isLive,
  readinessNote
} from '../../liveness/registry';
import { callOffsEn, callOffsId } from '@lib/i18n/callOffs';
import { orderPlanEn, orderPlanId } from '@lib/i18n/orderPlan';
import { NO_PERSON } from '@context/noPerson';

const svc = new MockCommandService();
/** @type {QueryScope} */
const planner = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer,
  actor: NO_PERSON
};
// po-007 / li-007a: 15,000 PCS remain, so 1,000 is well inside the umbrella.
const LINE = {
  poId: 'po-007',
  poLineId: 'li-007a',
  quantity: 1000,
  needDate: '2026-09-25',
  type: 'forecast'
};

/** @param {Record<string, unknown>} [extra] */
const draft = (extra = {}) =>
  svc.dispatch(planner, {
    transitionId: 't_calloff_draft',
    entity: 'callOff',
    payload: { ...LINE, ...extra }
  });
/** @param {string} id */
const releaseDraft = (id) =>
  svc.dispatch(planner, {
    transitionId: 't_calloff_release_draft',
    entity: 'callOff',
    entityId: id,
    payload: {}
  });
/**
 * @param {string} transitionId
 * @param {string} id
 * @param {Record<string, unknown>} payload
 */
const verb = (transitionId, id, payload) =>
  svc.dispatch(planner, { transitionId, entity: 'callOff', entityId: id, payload });

beforeEach(() => {
  callOffStore.reset();
  purchaseOrderStore.reset();
  flip.engineDataset = null;
});
afterEach(() => {
  flip.engineDataset = null;
});

describe('the flip control — the real registry says simulated, and cannot say otherwise today', () => {
  it('engineDataset is not live, awaits the MDM SAP feed, and is null-backed', () => {
    expect(isLive('engineDataset')).toBe(false);
    expect(awaitsHarvest('engineDataset')).toBe(true);
    expect(readinessNote('engineDataset')?.source).toBe('MDM SAP feed');
    // Gate-1 as well as gate-2: with no backing entity, even a landed feed does
    // not turn it green through the two-gate core (I3.3 flip harness shape).
    expect(capabilityBacking.engineDataset).toBeNull();
    expect(isGreenFrom(capabilityBacking.engineDataset, new Set(['anything']), false)).toBe(false);
  });
});

describe('the hook is registered and on both release verbs', () => {
  it('release-draft and direct release carry it; draft, edit and dismiss do not', () => {
    /** @param {string} id */
    const hooks = (id) =>
      /** @type {import('../../transitions/schema').TransitionDef} */ (
        callOffFlow.transitions.find((t) => t.id === id)
      ).policyHooks;
    expect(hooks('t_calloff_release_draft')).toContain(POLICY_HOOKS.CALLOFF_ENGINE_DATA_LIVE);
    expect(hooks('t_calloff_release')).toContain(POLICY_HOOKS.CALLOFF_ENGINE_DATA_LIVE);
    for (const id of ['t_calloff_draft', 't_calloff_edit_draft', 't_calloff_dismiss']) {
      expect(hooks(id)).not.toContain(POLICY_HOOKS.CALLOFF_ENGINE_DATA_LIVE);
    }
  });

  it('the shared predicate, both ways', () => {
    expect(engineReleaseWithheld({ origin: 'engine' }, false)).toBe(true);
    expect(engineReleaseWithheld({ origin: 'engine' }, true)).toBe(false);
    expect(engineReleaseWithheld({}, false)).toBe(false);
  });
});

describe('X-03 — an engine-origin draft is refused on release while simulated', () => {
  it('known-bad: the draft records its origin, release is refused by name, and it stays a draft', async () => {
    const made = await draft({ origin: 'engine' });
    expect(made.status).toBe('done');
    expect(
      callOffStore.get(/** @type {NonNullable<typeof made.entityId>} */ (made.entityId))
    ).toMatchObject({ status: 'Draft', origin: 'engine' });

    const res = await releaseDraft(
      /** @type {NonNullable<typeof made.entityId>} */ (made.entityId)
    );
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(
      new RegExp(
        `^POLICY_REJECTED:${POLICY_HOOKS.CALLOFF_ENGINE_DATA_LIVE}:ENGINE_DATA_SIMULATED: `
      )
    );
    expect(res.reason).toMatch(/simulated data/);
    expect(res.reason).toMatch(/Master Data Management team’s SAP feed is live/);
    expect(refusedByPolicy(res.reason, POLICY_HOOKS.CALLOFF_ENGINE_DATA_LIVE)).toBe(true);
    const row = /** @type {import('../types').CallOff} */ (
      callOffStore.get(/** @type {NonNullable<typeof made.entityId>} */ (made.entityId))
    );
    expect(row.status).toBe('Draft');
    expect(row.releasedAt).toBeUndefined();
  });

  it('editing and dismissing the engine draft stay allowed — and an edit keeps the origin', async () => {
    const made = await draft({ origin: 'engine' });
    expect(
      (
        await verb(
          't_calloff_edit_draft',
          /** @type {NonNullable<typeof made.entityId>} */ (made.entityId),
          { quantity: 1200, reason: 'Round to pallets' }
        )
      ).status
    ).toBe('done');
    expect(
      callOffStore.get(/** @type {NonNullable<typeof made.entityId>} */ (made.entityId))
    ).toMatchObject({ quantity: 1200, origin: 'engine', status: 'Draft' });
    expect(
      (await releaseDraft(/** @type {NonNullable<typeof made.entityId>} */ (made.entityId))).status
    ).toBe('failed');
    expect(
      (
        await verb(
          't_calloff_dismiss',
          /** @type {NonNullable<typeof made.entityId>} */ (made.entityId),
          { reason: 'Not needed' }
        )
      ).status
    ).toBe('done');
    expect(
      /** @type {import('../types').CallOff} */ (
        callOffStore.get(/** @type {NonNullable<typeof made.entityId>} */ (made.entityId))
      ).status
    ).toBe('Dismissed');
  });

  it('known-good: an ordinary draft on the same line still releases', async () => {
    const made = await draft();
    expect(
      /** @type {import('../types').CallOff} */ (
        callOffStore.get(/** @type {NonNullable<typeof made.entityId>} */ (made.entityId))
      ).origin
    ).toBeUndefined();
    const res = await releaseDraft(
      /** @type {NonNullable<typeof made.entityId>} */ (made.entityId)
    );
    expect(res.status).toBe('done');
    expect(
      /** @type {import('../types').CallOff} */ (
        callOffStore.get(/** @type {NonNullable<typeof made.entityId>} */ (made.entityId))
      ).status
    ).toBe('Awaiting Confirmation');
  });

  it('a direct release naming the engine is refused too, and stores nothing', async () => {
    const before = callOffStore.all().length;
    const res = await svc.dispatch(planner, {
      transitionId: 't_calloff_release',
      entity: 'callOff',
      payload: { ...LINE, origin: 'engine' }
    });
    expect(refusedByPolicy(res.reason, POLICY_HOOKS.CALLOFF_ENGINE_DATA_LIVE)).toBe(true);
    expect(callOffStore.all().length).toBe(before);
  });

  it('an origin the hub does not know is refused rather than dropped', async () => {
    const res = await draft({ origin: 'Engine' });
    expect(res.reason).toMatch(/calloff_line_valid:origin, when given, must be engine/);
  });
});

describe('X-03 — once the engine dataset is live, the same draft releases', () => {
  it('flipped between two dispatches on one service: refused, then released', async () => {
    const made = await draft({ origin: 'engine' });
    expect(
      (await releaseDraft(/** @type {NonNullable<typeof made.entityId>} */ (made.entityId))).status
    ).toBe('failed');

    flip.engineDataset = true;
    expect(isLive('engineDataset')).toBe(true);
    const res = await releaseDraft(
      /** @type {NonNullable<typeof made.entityId>} */ (made.entityId)
    );
    expect(res.status).toBe('done');
    expect(
      callOffStore.get(/** @type {NonNullable<typeof made.entityId>} */ (made.entityId))
    ).toMatchObject({ status: 'Awaiting Confirmation', origin: 'engine' });
  });

  it('a direct release naming the engine goes through when live', async () => {
    flip.engineDataset = true;
    const res = await svc.dispatch(planner, {
      transitionId: 't_calloff_release',
      entity: 'callOff',
      payload: { ...LINE, origin: 'engine' }
    });
    expect(res.status).toBe('done');
  });
});

describe('the refusal, in EN and ID', () => {
  it('the Call-offs refusal, withheld note and marker say simulated data and the MDM SAP feed, in both languages', () => {
    expect(callOffsEn['co.refusal.engineDataSimulated']).toMatch(/simulated data/);
    expect(callOffsEn['co.refusal.engineDataSimulated']).toMatch(
      /Master Data Management team’s SAP feed is live/
    );
    expect(callOffsId['co.refusal.engineDataSimulated']).toMatch(/data simulasi/);
    expect(callOffsId['co.refusal.engineDataSimulated']).toMatch(
      /data SAP dari tim Master Data Management/
    );
    expect(callOffsEn['co.origin.engine']).toBe('From the order plan — simulated data');
    expect(callOffsId['co.origin.engine']).toBe('Dari rencana pesanan — data simulasi');
    for (const k of [
      'co.refusal.engineDataSimulated',
      'co.draft.releaseWithheld',
      'co.origin.engine'
    ]) {
      expect(callOffsId[k]).toBeTruthy();
      expect(callOffsId[k]).not.toBe(callOffsEn[k]);
    }
  });

  it('the Order plan note, in both languages', () => {
    for (const k of ['op.action.releaseWithheld', 'op.toast.draftedDescWithheld']) {
      expect(orderPlanEn[k]).toMatch(/Master Data Management team’s SAP feed is live/);
      expect(orderPlanId[k]).toMatch(/Master Data Management/);
      expect(orderPlanId[k]).not.toBe(orderPlanEn[k]);
    }
  });
});
