// ────────────────────────────────────────────────────────────────────────────
// Material C5 — planning groups at the COMMAND layer (MR-8 BR-01 to BR-07,
// AC-01 to AC-04), dispatched through the REAL MockCommandService and read
// back through the capacity plans and the planning group read service.
//
// AC-01 is pinned against the capacity plans `main` produced BEFORE this task
// (`__fixtures__/capacityPlansBeforeC5.json`, captured at e8db74a with the
// same clock and seed; re-captured at 2e42fe4, pre-C5 code carrying BL-77's
// two capacity samples, which changed only sup-005 MG-02 and sup-012 MG-20;
// and edited for PEX-D22, which moved sup-007 MG-20's short week from 14 Sep
// to 7 Sep, its two entries and nothing else; and edited for BL-282, which
// made raw material weekly: the LTP weeks of sup-002 MG-02 and MG-10 and
// sup-005 MG-02, and sup-005's two short weeks, 400 → 350 KG):
// with no split, the plans are today's, the SAP group key renamed to its
// default planning group and nothing else.
// ────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService } from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import { planningGroupStore } from './stores/planningGroupStore';
import { materialOverlayStore } from './stores/materialOverlayStore';
import { capacityStore, inventoryAlertLedger } from './stores/inventoryHubStores';
import { requirementResponseStore } from './stores/requirementResponseStore';
import { forecastVersionStore, forecastViewStore } from './stores/forecastHubStores';
import { allCapacityPlans } from './inventoryReadModel';
import { allPlanningGroups } from './planningGroupReadModel';
/** @import { CapacityPlan, QueryScope } from '../types' */
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { planStatus, reEntryWeeks } from '../../transitions/capacityRules';
import { materialEntry, sdcClock } from '../../sdc';
import { NO_PERSON } from '@context/noPerson';
import BEFORE from '../../transitions/__fixtures__/capacityPlansBeforeC5.json';

const svc = new MockCommandService();
const reads = new MockProcurementService();
/** @type {QueryScope} */
const planner = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['planning'],
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
const sup007 = {
  personaType: 'supplier',
  supplierId: 'sup-007',
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON
};

/**
 * @param {string} name
 * @param {string} sapMaterialGroup
 * @param {QueryScope} [scope]
 */
const create = (name, sapMaterialGroup, scope = planner) =>
  svc.dispatch(scope, {
    transitionId: 't_planninggroup_create',
    entity: 'planningGroup',
    payload: { name, sapMaterialGroup }
  });
/**
 * @param {string} groupId
 * @param {string} name
 */
const rename = (groupId, name) =>
  svc.dispatch(planner, {
    transitionId: 't_planninggroup_rename',
    entity: 'planningGroup',
    entityId: groupId,
    payload: { name }
  });
/**
 * @param {string} groupId
 * @param {string[]} materialCodes
 */
const move = (groupId, materialCodes) =>
  svc.dispatch(planner, {
    transitionId: 't_planninggroup_move_materials',
    entity: 'planningGroup',
    entityId: groupId,
    payload: { materialCodes }
  });
/** @param {string} groupId */
const retire = (groupId) =>
  svc.dispatch(planner, {
    transitionId: 't_planninggroup_retire',
    entity: 'planningGroup',
    entityId: groupId,
    payload: {}
  });
/**
 * @param {string} supplierId
 * @param {string} planningGroupId
 * @returns {CapacityPlan | undefined}
 */
const planOf = (supplierId, planningGroupId) =>
  allCapacityPlans().find(
    (p) => p.supplierId === supplierId && p.planningGroupId === planningGroupId
  );
/** @param {CapacityPlan} plan */
const submitCapacity = (plan) =>
  svc.dispatch(sup007, {
    transitionId: 't_capacity_submit',
    entity: 'capacitySubmission',
    payload: {
      supplierId: plan.supplierId,
      planningGroupId: plan.planningGroupId,
      weeks: plan.weeks.map((w) => ({ week: w.week, allocated: w.demand }))
    }
  });

beforeEach(() => {
  planningGroupStore.reset();
  materialOverlayStore.reset();
  capacityStore.reset();
  inventoryAlertLedger.reset();
  requirementResponseStore.reset();
  forecastVersionStore.reset();
  forecastViewStore.reset();
  sdcClock.reset();
});

describe('MR-8 AC-01 — with no split made, the capacity plans are today’s', () => {
  it('deep-equal the plans main produced before C5, keyed on each SAP group’s default planning group', () => {
    /**
     * @typedef {Omit<CapacityPlan, 'planningGroupId' | 'latest'> & {
     *     materialGroup: string;
     *     latest: (Omit<NonNullable<CapacityPlan['latest']>, 'planningGroupId'> & { materialGroup: string }) | null;
     *   }} Before
     */
    const expected = /** @type {Before[]} */ (/** @type {unknown} */ (BEFORE)).map(
      ({ materialGroup, latest, ...rest }) => ({
        ...rest,
        planningGroupId: `pg-${materialGroup}`,
        latest: latest
          ? (({ materialGroup: g, ...l }) => ({ ...l, planningGroupId: `pg-${g}` }))(latest)
          : null
      })
    );
    // Population control: the snapshot is the real one (a gap plan and a confirmed one are in it).
    expect(expected.map((p) => `${p.supplierId}-${p.planningGroupId}`)).toEqual(
      expect.arrayContaining([
        'sup-007-pg-MG-20',
        'sup-002-pg-MG-02',
        'sup-002-pg-MG-03',
        'sup-005-pg-MG-03'
      ])
    );
    expect(allCapacityPlans()).toEqual(expected);
  });

  it('every SAP group with materials has exactly its default group, and every material resolves to it', () => {
    const groups = allPlanningGroups();
    expect(groups.every((g) => g.isDefault && g.id === `pg-${g.sapMaterialGroup}`)).toBe(true);
    expect(
      /** @type {import('../types').PlanningGroupView} */ (groups.find((g) => g.id === 'pg-MG-03'))
        .materials
    ).toEqual(['RM-EMUL-3310', 'RM-HUMEC-3405']);
    expect(
      /** @type {import('../../sdc/types').MaterialMasterEntry} */ (materialEntry('RM-HUMEC-3405'))
        .planningGroupId
    ).toBe('pg-MG-03');
  });
});

describe('the four verbs (MR-8 BR-03), governed and logged', () => {
  it('create, rename, move and retire land; each is a row in the log with the session actor', async () => {
    const made = await create('Glycerin line', 'MG-03');
    expect(made.status, made.reason).toBe('done');
    const id = /** @type {NonNullable<typeof made.entityId>} */ (made.entityId);
    expect((await rename(id, 'Glycerin and glycol line')).status).toBe('done');
    expect((await move(id, ['RM-EMUL-3310', 'RM-HUMEC-3405'])).status).toBe('done');
    // MR-8 AC-02 — MG-03 is now split: its default group is empty, the new one holds both.
    const groups = new Map(allPlanningGroups().map((g) => [g.id, g]));
    expect(groups.get(id)).toMatchObject({
      name: 'Glycerin and glycol line',
      sapMaterialGroup: 'MG-03',
      materials: ['RM-EMUL-3310', 'RM-HUMEC-3405']
    });
    expect(
      /** @type {import('../types').PlanningGroupView} */ (groups.get('pg-MG-03')).materials
    ).toEqual([]);
    expect((await retire('pg-MG-03')).status).toBe('done');
    expect(
      /** @type {import('../types').PlanningGroupView} */ (
        allPlanningGroups().find((g) => g.id === 'pg-MG-03')
      ).state
    ).toBe('retired');
    expect(planningGroupStore.all().map((e) => e.kind)).toEqual([
      'created',
      'renamed',
      'moved',
      'retired'
    ]);
    expect(planningGroupStore.all().every((e) => e.by === NO_PERSON)).toBe(true);
  });

  it('AC-04 — a material cannot be in 2 groups: a move rewrites its one group, in the material overlay', async () => {
    const a = /** @type {NonNullable<(Awaited<ReturnType<typeof create>>)['entityId']>} */ (
      (await create('Line A', 'MG-03')).entityId
    );
    const b = /** @type {NonNullable<(Awaited<ReturnType<typeof create>>)['entityId']>} */ (
      (await create('Line B', 'MG-03')).entityId
    );
    await move(a, ['RM-EMUL-3310']);
    await move(b, ['RM-EMUL-3310']);
    expect(
      /** @type {import('../../sdc/types').MaterialMasterEntry} */ (materialEntry('RM-EMUL-3310'))
        .planningGroupId
    ).toBe(b);
    const holding = allPlanningGroups().filter((g) => g.materials.includes('RM-EMUL-3310'));
    expect(holding.map((g) => g.id)).toEqual([b]);
    expect(materialOverlayStore.forMaterial('RM-EMUL-3310').map((r) => r.planningGroupId)).toEqual([
      a,
      b
    ]);
  });

  it('AC-04 — a group mixing 2 SAP groups is refused (MIXED_SAP_GROUP), and nothing is written', async () => {
    const id = /** @type {NonNullable<(Awaited<ReturnType<typeof create>>)['entityId']>} */ (
      (await create('Line A', 'MG-03')).entityId
    );
    const res = await move(id, ['RM-EMUL-3310', 'PK-PETB-8810']);
    expect(res.status).toBe('failed');
    expect(res.reason).toContain('MIXED_SAP_GROUP');
    expect(materialOverlayStore.all()).toEqual([]);
    expect(
      /** @type {import('../../sdc/types').MaterialMasterEntry} */ (materialEntry('RM-EMUL-3310'))
        .planningGroupId
    ).toBe('pg-MG-03');
  });

  it('retiring a group with materials is refused (RETIRE_NOT_EMPTY); a retired group takes no move', async () => {
    const res = await retire('pg-MG-20');
    expect(res.status).toBe('failed');
    expect(res.reason).toContain('RETIRE_NOT_EMPTY');
    const empty = /** @type {NonNullable<(Awaited<ReturnType<typeof create>>)['entityId']>} */ (
      (await create('Spare', 'MG-20')).entityId
    );
    expect((await retire(empty)).status).toBe('done');
    expect((await move(empty, ['PK-PETB-8810'])).status).toBe('failed');
  });

  it('NAME_REQUIRED and UNKNOWN_SAP_GROUP are refused at the verb', async () => {
    expect((await create('   ', 'MG-03')).reason).toContain('NAME_REQUIRED');
    expect((await create('Line', 'MG-99')).reason).toContain('UNKNOWN_SAP_GROUP');
    expect((await rename('pg-MG-03', '')).status).toBe('failed');
    expect(planningGroupStore.all()).toEqual([]);
  });

  it('only the planning lane holds `planninggroup:manage`; a supplier seat is refused', async () => {
    expect((await create('Line', 'MG-03', procurement)).status).toBe('failed');
    await expect(
      svc.dispatch(sup007, {
        transitionId: 't_planninggroup_rename',
        entity: 'planningGroup',
        entityId: 'pg-MG-20',
        payload: { name: 'x' }
      })
    ).rejects.toMatchObject({ code: 'SCOPE_DENIED' });
    expect(planningGroupStore.all()).toEqual([]);
  });
});

describe('MR-8 BR-04 / AC-02 — capacity is kept per planning group after a split', () => {
  it('splitting MG-20 gives sup-007 2 plans, each over its own materials, and the supplier submits each', async () => {
    const before = /** @type {CapacityPlan} */ (planOf('sup-007', 'pg-MG-20'));
    const id = /** @type {NonNullable<(Awaited<ReturnType<typeof create>>)['entityId']>} */ (
      (await create('PET line B', 'MG-20')).entityId
    );
    await move(id, ['PK-PETB-8810']);
    const rest = /** @type {CapacityPlan} */ (planOf('sup-007', 'pg-MG-20'));
    const split = /** @type {CapacityPlan} */ (planOf('sup-007', id));
    expect(rest.materials).toEqual(['PK-PETB-8801', 'PK-PETB-8802']);
    expect(split.materials).toEqual(['PK-PETB-8810']);
    // Demand per group is the sum of its materials': the 2 add up to the group before.
    rest.weeks.forEach((w, i) =>
      expect(w.demand + split.weeks[i].demand).toBe(before.weeks[i].demand)
    );
    expect(planStatus(split)).toBe('notStarted');
    const res = await submitCapacity(split);
    expect(res.status, res.reason).toBe('done');
    const rows = capacityStore.all();
    expect(rows[rows.length - 1].planningGroupId).toBe(id);
    expect(planStatus(/** @type {CapacityPlan} */ (planOf('sup-007', id)))).toBe('confirmed');
  });
});

describe('MR-8 BR-05 / AC-03 — a move marks future weeks of both groups "Needs re-entry"', () => {
  it('both groups’ weeks from the move on are marked for the supplier, and a new submission clears them', async () => {
    const id = /** @type {NonNullable<(Awaited<ReturnType<typeof create>>)['entityId']>} */ (
      (await create('PET line B', 'MG-20')).entityId
    );
    await move(id, ['PK-PETB-8810']);
    // The default group's capacity (cap-0001) predates the move: its horizon is marked.
    const mg20 = /** @type {CapacityPlan} */ (planOf('sup-007', 'pg-MG-20'));
    expect(reEntryWeeks(mg20).map((w) => w.week)).toEqual(mg20.weeks.map((w) => w.week));
    expect(planStatus(mg20)).not.toBe('confirmed');
    // The supplier confirms the new group, then a second move touches both groups.
    expect((await submitCapacity(/** @type {CapacityPlan} */ (planOf('sup-007', id)))).status).toBe(
      'done'
    );
    expect(reEntryWeeks(/** @type {CapacityPlan} */ (planOf('sup-007', id)))).toEqual([]);
    sdcClock.set('2026-09-30T12:00:00.000Z');
    await move(id, ['PK-PETB-8802']);
    const newGroup = /** @type {CapacityPlan} */ (planOf('sup-007', id));
    const defaultGroup = /** @type {CapacityPlan} */ (planOf('sup-007', 'pg-MG-20'));
    // Past weeks keep their group: only weeks ending after the move are marked.
    const expectedWeeks = newGroup.weeks.filter((w) => w.week >= '2026-09-28').map((w) => w.week);
    expect(expectedWeeks.length).toBeGreaterThan(0);
    expect(reEntryWeeks(newGroup).map((w) => w.week)).toEqual(expectedWeeks);
    expect(reEntryWeeks(defaultGroup).map((w) => w.week)).toEqual(expectedWeeks);
    // Another supplier's plans are untouched (sup-002 supplies none of the moved materials).
    expect(
      allCapacityPlans()
        .filter((p) => p.supplierId === 'sup-002')
        .flatMap(reEntryWeeks)
    ).toEqual([]);
    // Re-entering the default group clears its marks.
    expect((await submitCapacity(defaultGroup)).status).toBe('done');
    expect(reEntryWeeks(/** @type {CapacityPlan} */ (planOf('sup-007', 'pg-MG-20')))).toEqual([]);
  });
});

describe('the planning group read (MAT-R4)', () => {
  it('PTI reads every group with its log; a supplier reads only its own materials’ groups, narrowed, with no log', async () => {
    const id = /** @type {NonNullable<(Awaited<ReturnType<typeof create>>)['entityId']>} */ (
      (await create('PET line B', 'MG-20')).entityId
    );
    await move(id, ['PK-PETB-8810']);
    const all = (await reads.getPlanningGroups(planner)).items;
    expect(
      /** @type {import('../types').PlanningGroupView} */ (all.find((g) => g.id === id)).history
        .length
    ).toBe(2);
    const mine = (await reads.getPlanningGroups(sup007)).items;
    expect(mine.map((g) => g.id).sort()).toEqual([id, 'pg-MG-20', 'pg-MG-21'].sort());
    expect(mine.every((g) => g.history.length === 0)).toBe(true);
    expect(mine.flatMap((g) => g.materials)).not.toContain('RM-EMUL-3310');
  });
});
