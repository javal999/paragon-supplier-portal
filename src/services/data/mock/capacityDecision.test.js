// ────────────────────────────────────────────────────────────────────────────
// INV-D8 · PTI's capacity gap decision — "Accept additional capacity",
// dispatched through the REAL MockCommandService and read back through the
// REAL procurement service.
//
//   · legal transition: accept on an amber week, recorded on the supplier ×
//     planning group × week, with the hub time and the session's actor.
//   · every refusal code fires once and passes once (RFX-R8).
//   · scope: a supplier cannot accept (its own week: role; another's: scope);
//     supplier B cannot read A's decision; the buyer (control) reads all.
// ────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService, commandAuditSink } from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import { capacityDecisionStore } from './stores/capacityDecisionStore';
import { allCapacityPlans } from './inventoryReadModel';
import { capacityWeekLevel } from './targets/capacityDecision';
/** @import { QueryScope } from '../types' */
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { ltpCapacityWeeks } from '../../transitions/capacityRules';
import {
  capacityAcceptRefusal,
  capacityDecisionRefusalOf,
  uncoveredByAdditional
} from '../../transitions/capacityDecisionRules';
import { sdcClock } from '../../sdc';
import { NO_PERSON } from '@context/noPerson';

const svc = new MockCommandService();
const reads = new MockProcurementService();

/** @type {QueryScope} */
const planner = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['planning'],
  actor: NO_PERSON
};
/**
 * @param {string} supplierId
 * @returns {QueryScope}
 */
const supplierSeat = (supplierId) => ({
  personaType: 'supplier',
  supplierId,
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON
});
const sup5 = supplierSeat('sup-005');
const sup7 = supplierSeat('sup-007');

/** sup-005's second amber week on pg-MG-02, not accepted in the sample data. */
const AMBER = Object.freeze({
  supplierId: 'sup-005',
  planningGroupId: 'pg-MG-02',
  week: '2026-10-19'
});

/**
 * @param {Record<string, unknown>} payload
 * @param {QueryScope} [scope]
 */
const accept = (payload, scope = planner) =>
  svc.dispatch(scope, {
    transitionId: 't_capacitydecision_accept',
    entity: 'capacityDecision',
    payload
  });

beforeEach(() => {
  capacityDecisionStore.reset();
  commandAuditSink.clear();
  sdcClock.reset();
});

// PEX-D22 moved the sample's red week (sup-007 pg-MG-20) from 14 Sep to 7 Sep.
describe('the fixture cases this file rests on (population control)', () => {
  it('names the amber, red, within and unstated weeks the specs below use', () => {
    expect(capacityWeekLevel('sup-005', 'pg-MG-02', '2026-10-12')).toBe('needsAdditional');
    expect(capacityWeekLevel('sup-005', 'pg-MG-02', '2026-10-19')).toBe('needsAdditional');
    expect(capacityWeekLevel('sup-007', 'pg-MG-20', '2026-09-07')).toBe('cannotSupply');
    expect(capacityWeekLevel('sup-005', 'pg-MG-02', '2026-08-31')).toBe('within');
    expect(capacityWeekLevel('sup-005', 'pg-MG-03', '2026-08-31')).toBe('unconfirmed');
    expect(capacityWeekLevel('sup-005', 'pg-MG-02', '2030-01-07')).toBeNull();
  });

  it('the store opens with one sample acceptance: sup-005, pg-MG-02, week of 12 Oct', () => {
    expect(
      capacityDecisionStore
        .all()
        .map((d) => [d.id, d.supplierId, d.planningGroupId, d.week, d.decision, d.sample])
    ).toEqual([['capd-0001', 'sup-005', 'pg-MG-02', '2026-10-12', 'accepted', true]]);
  });
});

describe('legal transition', () => {
  it('PTI accepts an amber week: the decision is recorded on supplier × group × week', async () => {
    const r = await accept(AMBER);
    expect(r.status, r.reason).toBe('done');
    const row = capacityDecisionStore.get(/** @type {string} */ (r.entityId));
    expect(row).toMatchObject({ ...AMBER, decision: 'accepted', decidedAt: sdcClock.now() });
    expect(capacityDecisionStore.find('sup-005', 'pg-MG-02', '2026-10-19')?.id).toBe(r.entityId);
    expect(commandAuditSink.byEvent('t_capacitydecision_accept').map((e) => e.outcome)).toEqual([
      'done'
    ]);
  });

  it('the decision changes no capacity figure or state (the amber week stays amber)', async () => {
    const before = JSON.stringify(allCapacityPlans());
    await accept(AMBER);
    expect(JSON.stringify(allCapacityPlans())).toBe(before);
  });
});

describe('refusals — each code fires once and passes once (CODE: sentence)', () => {
  /** @type {[string, Record<string, unknown>][]} */
  const CASES = [
    ['WEEK_NOT_IN_PLAN', { ...AMBER, week: '2030-01-07' }],
    ['CAPACITY_NOT_STATED', { ...AMBER, planningGroupId: 'pg-MG-03', week: '2026-08-31' }],
    ['NOT_A_GAP_WEEK', { ...AMBER, week: '2026-08-31' }],
    [
      'ABOVE_ADDITIONAL_CAPACITY',
      { supplierId: 'sup-007', planningGroupId: 'pg-MG-20', week: '2026-09-07' }
    ],
    ['ALREADY_ACCEPTED', { ...AMBER, week: '2026-10-12' }]
  ];
  for (const [code, failing] of CASES) {
    it(`accept · ${code}: fires, and the amber week without the fault passes`, async () => {
      const bad = await accept(failing);
      expect(bad.status).toBe('failed');
      expect(bad.reason).toMatch(
        new RegExp(`^POLICY_REJECTED:capacity_decision_acceptable:${code}: \\S`)
      );
      expect(capacityDecisionRefusalOf(bad.reason)).toBe(code);
      const good = await accept(AMBER);
      expect(good.status, good.reason).toBe('done');
    });
  }

  it('the page pre-check calls the same rule: amber and not accepted is null', () => {
    expect(capacityAcceptRefusal({ level: 'needsAdditional', accepted: false })).toBeNull();
    expect(capacityAcceptRefusal({ level: 'needsAdditional', accepted: true })).toBe(
      'ALREADY_ACCEPTED'
    );
    expect(capacityAcceptRefusal({ level: 'cannotSupply', accepted: false })).toBe(
      'ABOVE_ADDITIONAL_CAPACITY'
    );
  });

  it('a red week says what its additional capacity cannot cover: LTP − BE', () => {
    const plan = allCapacityPlans().find(
      (p) => p.supplierId === 'sup-007' && p.planningGroupId === 'pg-MG-20'
    );
    const red = ltpCapacityWeeks(/** @type {NonNullable<typeof plan>} */ (plan)).find(
      (w) => w.week === '2026-09-07'
    );
    expect(red && uncoveredByAdditional(red)).toBe(12800);
    const amber = { level: /** @type {const} */ ('needsAdditional'), ltp: 497, be: 550 };
    expect(uncoveredByAdditional(amber)).toBeNull();
  });

  it('a second accept on the same week is refused, and only one record exists', async () => {
    await accept(AMBER);
    const again = await accept(AMBER);
    expect(capacityDecisionRefusalOf(again.reason)).toBe('ALREADY_ACCEPTED');
    expect(capacityDecisionStore.all().filter((d) => d.week === AMBER.week)).toHaveLength(1);
  });

  it('nobody can record a decision on a supplier that does not exist (creation owner)', async () => {
    await expect(accept({ ...AMBER, supplierId: 'sup-999' })).rejects.toMatchObject({
      code: 'SCOPE_DENIED'
    });
    await expect(accept(AMBER)).resolves.toMatchObject({ status: 'done' });
  });
});

describe('scope — PTI decides; a supplier reads only its own decisions', () => {
  it('a supplier cannot accept, even on its own week (ROLE_NOT_PERMITTED); PTI can (control)', async () => {
    const own = await accept(AMBER, sup5);
    expect(own.status).toBe('failed');
    expect(own.reason?.split(':')[0]).toBe('ROLE_NOT_PERMITTED');
    expect(capacityDecisionStore.find('sup-005', 'pg-MG-02', AMBER.week)).toBeUndefined();
    const pti = await accept(AMBER);
    expect(pti.status).toBe('done');
  });

  it('another supplier cannot accept on sup-005’s week (SCOPE_DENIED)', async () => {
    await expect(accept(AMBER, sup7)).rejects.toMatchObject({ code: 'SCOPE_DENIED' });
    expect(capacityDecisionStore.find('sup-005', 'pg-MG-02', AMBER.week)).toBeUndefined();
  });

  it('supplier B (sup-007) reads none of sup-005’s decisions; sup-005 reads its own; the buyer reads all', async () => {
    await accept(AMBER);
    const b = await reads.getCapacityDecisions(sup7);
    const a = await reads.getCapacityDecisions(sup5);
    const buyer = await reads.getCapacityDecisions(planner);
    expect(b.items).toEqual([]);
    expect(a.items.map((d) => d.week)).toEqual(['2026-10-12', '2026-10-19']);
    expect(buyer.items.map((d) => d.supplierId)).toEqual(['sup-005', 'sup-005']);
  });

  it('a supplier cannot read its way to another supplier’s decision by id (scope on the target)', async () => {
    const own = await accept(AMBER);
    const id = /** @type {string} */ (own.entityId);
    expect(capacityDecisionStore.get(id)?.supplierId).toBe('sup-005');
    // The target names the decision's supplier as scope owner (§86).
    const { capacityDecisionTarget } = await import('./targets/capacityDecision');
    expect(capacityDecisionTarget.readScopeOwner(id)).toBe('sup-005');
    expect(capacityDecisionTarget.readScopeOwner('capd-9999')).toBeNull();
  });
});

describe('BL-227 · PTI undoes an acceptance (t_capacitydecision_withdraw)', () => {
  /**
   * @param {string} decisionId
   * @param {QueryScope} [scope]
   */
  const withdraw = (decisionId, scope = planner) =>
    svc.dispatch(scope, {
      transitionId: 't_capacitydecision_withdraw',
      entity: 'capacityDecision',
      entityId: decisionId,
      payload: {}
    });

  it('withdraws: the row stays, marked withdrawn with time and actor; the week is open again', async () => {
    const r = await accept(AMBER);
    const id = /** @type {string} */ (r.entityId);
    const w = await withdraw(id);
    expect(w.status, w.reason).toBe('done');
    expect(capacityDecisionStore.get(id)).toMatchObject({
      ...AMBER,
      decision: 'withdrawn',
      withdrawnAt: sdcClock.now()
    });
    expect(capacityDecisionStore.find(AMBER.supplierId, AMBER.planningGroupId, AMBER.week)).toBe(
      undefined
    );
    expect(commandAuditSink.byEvent('t_capacitydecision_withdraw').map((e) => e.outcome)).toEqual([
      'done'
    ]);
  });

  it('a withdrawn acceptance is not read back; the sample one still is (control)', async () => {
    const r = await accept(AMBER);
    await withdraw(/** @type {string} */ (r.entityId));
    const buyer = await reads.getCapacityDecisions(planner);
    expect(buyer.items.map((d) => d.week)).toEqual(['2026-10-12']);
  });

  it('the week can be accepted again: a new decision, the withdrawn one kept', async () => {
    const first = await accept(AMBER);
    await withdraw(/** @type {string} */ (first.entityId));
    const again = await accept(AMBER);
    expect(again.status, again.reason).toBe('done');
    expect(again.entityId).not.toBe(first.entityId);
    expect(
      capacityDecisionStore
        .all()
        .filter((d) => d.week === AMBER.week)
        .map((d) => d.decision)
    ).toEqual(['withdrawn', 'accepted']);
  });

  it('a withdrawn acceptance cannot be withdrawn again (from-state); an accepted one can (control)', async () => {
    const r = await accept(AMBER);
    const id = /** @type {string} */ (r.entityId);
    expect((await withdraw(id)).status).toBe('done');
    const twice = await withdraw(id);
    expect(twice.status).toBe('failed');
    expect(capacityDecisionStore.get(id)?.decision).toBe('withdrawn');
  });

  it('a supplier cannot withdraw PTI’s acceptance on its own week (ROLE_NOT_PERMITTED); PTI can', async () => {
    const own = await withdraw('capd-0001', sup5);
    expect(own.status).toBe('failed');
    expect(own.reason?.split(':')[0]).toBe('ROLE_NOT_PERMITTED');
    expect(capacityDecisionStore.get('capd-0001')?.decision).toBe('accepted');
    expect((await withdraw('capd-0001')).status).toBe('done');
  });

  it('another supplier cannot reach sup-005’s decision (SCOPE_DENIED)', async () => {
    await expect(withdraw('capd-0001', sup7)).rejects.toMatchObject({ code: 'SCOPE_DENIED' });
    expect(capacityDecisionStore.get('capd-0001')?.decision).toBe('accepted');
  });
});
