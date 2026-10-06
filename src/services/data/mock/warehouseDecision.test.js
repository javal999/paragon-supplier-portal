// ────────────────────────────────────────────────────────────────────────────
// FUX-D3 — the warehouse-week decision verb, dispatched through the REAL
// MockCommandService against the real store and read back through the REAL
// service. Probed both ways: a Material Planning seat records; a buyer seat
// without the planning lane is refused at the ROLE gate and a supplier at
// SCOPE; each refusal code fires once and passes once (MAT-R8). Each record is
// appended and the latest is in force; the plan version is the stream's
// current published version, read by the target; nothing else changes.
// ────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService } from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import { warehouseDecisionStore } from './stores/warehouseDecisionStore';
import { forecastVersionStore } from './stores/forecastHubStores';
import { callOffStore } from './stores/callOffStore';
import { purchaseOrderStore } from './stores/purchaseOrderStore';
import { currentPlanVersion, currentVersion } from './forecastReadModel';
/** @import { QueryScope } from '../types' */
import { DataError } from '../types';
import { PERSONA_SYSTEM_ROLES, SYSTEM_ROLES } from '../../transitions/businessRoles';
import { POLICY_HOOKS } from '../../transitions/policyHooks';
import { refusedByPolicy } from '../../transitions/refusalMessage';
import { warehouseDecisionFlow } from '../../transitions/flows/warehouseDecision.flow';
import {
  DECISION_CHOICE_UNKNOWN,
  DECISION_NOTE_REQUIRED,
  decisionInForce
} from '../../transitions/warehouseDecisionRules';
import { NO_PERSON } from '../../../context/noPerson';

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

const WEEK = '2026-10-12';
/**
 * @param {QueryScope} scope
 * @param {Record<string, unknown>} payload
 */
const decide = (scope, payload, entityId = `packaging|${WEEK}`) =>
  cmd.dispatch(scope, {
    transitionId: 't_warehousedecision_record',
    entity: 'warehouseDecision',
    entityId,
    payload
  });

beforeEach(() => {
  warehouseDecisionStore.reset();
  forecastVersionStore.reset();
});

describe('the verb', () => {
  it('is statePreserving on one state, gated by warehousedecision:record and WAREHOUSE_DECISION_VALID', () => {
    const [t] = warehouseDecisionFlow.transitions;
    expect(t).toMatchObject({
      id: 't_warehousedecision_record',
      from: ['Maintained'],
      to: 'Maintained',
      statePreserving: true,
      requiredRole: 'warehousedecision:record'
    });
    expect(t.policyHooks).toEqual([POLICY_HOOKS.WAREHOUSE_DECISION_VALID]);
  });

  it('the atom is in the Material Planning bundle and in no supplier lane, procurement or finance', () => {
    const holders = Object.entries(SYSTEM_ROLES)
      .filter(([, atoms]) =>
        /** @type {readonly string[]} */ (atoms).includes('warehousedecision:record')
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
});

describe('recording appends; the latest is in force; earlier records stay', () => {
  it('each of the four choices appends a record with stream, week, choice, note, plan version, time and actor', async () => {
    const version = currentPlanVersion('packaging');
    expect(version).not.toBeNull();
    const choices = [
      { choice: 'rent' },
      { choice: 'pushOut', note: 'Ask the cap supplier to ship W43' },
      { choice: 'reduce' },
      { choice: 'accept', note: 'Peak week; overflow on the dock is agreed with the warehouse' }
    ];
    for (const [i, payload] of choices.entries()) {
      const res = await decide(planning, payload);
      expect(res.status, res.reason).toBe('done');
      expect(warehouseDecisionStore.all()).toHaveLength(i + 1);
    }
    const ledger = warehouseDecisionStore.all();
    expect(ledger.map((r) => r.choice)).toEqual(['rent', 'pushOut', 'reduce', 'accept']);
    expect(ledger[1]).toMatchObject({
      stream: 'packaging',
      weekStart: WEEK,
      note: 'Ask the cap supplier to ship W43',
      planVersion: version,
      recordedBy: NO_PERSON
    });
    expect(ledger[0].note).toBeNull();
    expect(typeof ledger[0].recordedAt).toBe('string');
    expect(decisionInForce(ledger, 'packaging', WEEK)?.choice).toBe('accept');
    // The read the page uses carries the whole ledger and the version it is judged against.
    const view = /** @type {import('../types').RescheduleView} */ (
      await svc.getReschedule(defaultBuyer)
    );
    expect(view.warehouseDecisions.map((r) => r.id)).toEqual(ledger.map((r) => r.id));
    expect(view.planVersions.packaging).toBe(version);
  });

  it('a second stream and week are separate entities', async () => {
    await decide(planning, { choice: 'rent' });
    await decide(planning, { choice: 'reduce' }, `rawMaterial|${WEEK}`);
    const ledger = warehouseDecisionStore.all();
    expect(decisionInForce(ledger, 'packaging', WEEK)?.choice).toBe('rent');
    expect(decisionInForce(ledger, 'rawMaterial', WEEK)?.choice).toBe('reduce');
  });

  it('the plan version is read by the target, never from the payload; a newer published version makes the record older', async () => {
    const before = /** @type {NonNullable<ReturnType<typeof currentPlanVersion>>} */ (
      currentPlanVersion('packaging')
    );
    await decide(planning, { choice: 'rent', planVersion: 99 });
    expect(warehouseDecisionStore.all()[0].planVersion).toBe(before);
    const current = /** @type {import('../../sdc/types').ForecastPublication} */ (
      currentVersion('packaging')
    );
    forecastVersionStore.add({
      ...current,
      publicationId: 'fv-probe-newer',
      version: before + 1,
      publishedAt: '2026-10-06T00:00:00.000Z'
    });
    expect(currentPlanVersion('packaging')).toBe(before + 1);
    const view = /** @type {import('../types').RescheduleView} */ (
      await svc.getReschedule(defaultBuyer)
    );
    expect(view.planVersions.packaging).toBe(before + 1);
    expect(view.warehouseDecisions[0].planVersion).toBe(before);
  });

  it('survives a page reload within the session: the ledger is re-read from session storage', async () => {
    await decide(planning, { choice: 'rent' });
    await decide(planning, { choice: 'accept', note: 'agreed' });
    warehouseDecisionStore.reloadFromSession();
    expect(warehouseDecisionStore.all().map((r) => r.choice)).toEqual(['rent', 'accept']);
    // The next record continues the sequence rather than reusing an id.
    await decide(planning, { choice: 'reduce' });
    expect(new Set(warehouseDecisionStore.all().map((r) => r.id)).size).toBe(3);
  });

  it('changes no order and no call-off', async () => {
    const callOffs = callOffStore.all();
    const pos = purchaseOrderStore.all();
    await decide(planning, { choice: 'pushOut' });
    expect(callOffStore.all()).toBe(callOffs);
    expect(purchaseOrderStore.all()).toBe(pos);
  });
});

describe('who may record (probed both ways)', () => {
  it('known-good: the default buyer seat (all buyer lanes) records', async () => {
    expect((await decide(defaultBuyer, { choice: 'rent' })).status).toBe('done');
  });

  it('known-bad: a procurement seat and a finance seat are refused at the ROLE gate by name; nothing recorded', async () => {
    for (const seat of [procurement, finance]) {
      const res = await decide(seat, { choice: 'rent' });
      expect(res.status).toBe('failed');
      expect(res.reason).toMatch(/^ROLE_NOT_PERMITTED/);
      expect(res.reason).toMatch(/warehousedecision:record/);
    }
    expect(warehouseDecisionStore.all()).toEqual([]);
  });

  it('known-bad: a supplier is refused at SCOPE; nothing recorded', async () => {
    await expect(decide(supplier, { choice: 'rent' })).rejects.toBeInstanceOf(DataError);
    expect(warehouseDecisionStore.all()).toEqual([]);
  });

  it('a malformed id is NOT_FOUND for the planner', async () => {
    await expect(
      decide(planning, { choice: 'rent' }, 'finishedGoods|2026-10-12')
    ).rejects.toBeInstanceOf(DataError);
    expect(warehouseDecisionStore.all()).toEqual([]);
  });
});

describe('the refusal codes, through the policy hook (1 firing, 1 passing each)', () => {
  it(`${DECISION_CHOICE_UNKNOWN}: an unknown choice is refused by name; a known one goes through`, async () => {
    const bad = await decide(planning, { choice: 'cancel' });
    expect(bad.status).toBe('failed');
    expect(refusedByPolicy(bad.reason, POLICY_HOOKS.WAREHOUSE_DECISION_VALID)).toBe(true);
    expect(bad.reason).toMatch(DECISION_CHOICE_UNKNOWN);
    expect(warehouseDecisionStore.all()).toEqual([]);
    const good = await decide(planning, { choice: 'reduce' });
    expect(good.status, good.reason).toBe('done');
  });

  it(`${DECISION_NOTE_REQUIRED}: "accept" without a note is refused by name; with a note it goes through`, async () => {
    const bad = await decide(planning, { choice: 'accept' });
    expect(bad.status).toBe('failed');
    expect(refusedByPolicy(bad.reason, POLICY_HOOKS.WAREHOUSE_DECISION_VALID)).toBe(true);
    expect(bad.reason).toMatch(DECISION_NOTE_REQUIRED);
    expect(warehouseDecisionStore.all()).toEqual([]);
    const good = await decide(planning, {
      choice: 'accept',
      note: 'The 3PL has no more space that week'
    });
    expect(good.status, good.reason).toBe('done');
    expect(warehouseDecisionStore.all()[0].note).toBe('The 3PL has no more space that week');
  });
});
