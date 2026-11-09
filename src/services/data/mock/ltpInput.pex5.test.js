// BL-267 (PEX-5) — `t_ltpinput_set` dispatched through the REAL MockCommandService
// and read back through the REAL service: the grid's LTP rows, DA reading the
// chosen LTP, ROP Order adding LTP B − LTP A, who may upload.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService } from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import { demandAnticipationToPublish } from './demandAnticipationReadModel';
import { ltpInputStore } from './stores/ltpInputStore';
import { demandAnticipationStore } from './stores/demandAnticipationStore';
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
const MAT = 'PK-PETB-8802';

beforeEach(() => {
  sdcClock.reset();
  ltpInputStore.reset();
  demandAnticipationStore.reset();
  demandAnticipationStore.all();
});
afterEach(() => {
  ltpInputStore.reset();
  sdcClock.reset();
});

/** @param {import('../types').QueryScope} scope @param {string} series @param {Record<string, number>} weeks */
const upload = (scope, series, weeks) =>
  cmd.dispatch(scope, {
    transitionId: 't_ltpinput_set',
    entity: 'ltpInput',
    entityId: `upload|${MAT}|${series}`,
    payload: { weeks, sourceFile: `${series}.csv` }
  });
/** @param {import('../types').QueryScope} scope @param {string} choice */
const choose = (scope, choice) =>
  cmd.dispatch(scope, {
    transitionId: 't_ltpinput_set',
    entity: 'ltpInput',
    entityId: `choice|${MAT}`,
    payload: { ltpChoice: choice }
  });
const rows = async () =>
  (await svc.getDemandAnticipation(planning)).items.filter((r) => r.materialCode === MAT);

describe('t_ltpinput_set', () => {
  it('the planner uploads and chooses; the grid carries the series and DA reads the choice', async () => {
    const before = await rows();
    expect(before.length).toBeGreaterThan(0);
    const w = before[0].weeks.slice(0, 3).map((x) => x.week);
    const all = Object.fromEntries(before[0].weeks.map((x) => [x.week, 100]));
    expect((await upload(planning, 'A', all)).status).toBe('done');
    expect(
      (await upload(planning, 'Festive', Object.fromEntries(Object.keys(all).map((k) => [k, 130]))))
        .status
    ).toBe('done');
    expect(
      (await upload(planning, 'B', Object.fromEntries(Object.keys(all).map((k) => [k, 115]))))
        .status
    ).toBe('done');
    expect((await choose(planning, 'Festive')).status).toBe('done');
    const after = await rows();
    const total = after.reduce((n, r) => n + r.share, 0);
    expect(total).toBeCloseTo(1, 5);
    for (const r of after) {
      const li = r.ltpInputs;
      expect(li?.choice).toBe('Festive');
      expect(li?.hasUpload).toBe(true);
      // The uploaded quantity is the material's; a supplier reads its share.
      expect(li?.byWeek[w[0]].a).toBe(Math.round(100 * r.share));
      expect(li?.byWeek[w[0]].used).toBe(Math.round(130 * r.share));
      // What a publication would store today (the page's published figure stays as published).
      const today = demandAnticipationToPublish([]).figures.find(
        (f) => f.supplierId === r.supplierId && f.materialCode === MAT
      );
      expect(today?.figure.weeks[0].ltp).toBe(Math.round(130 * r.share));
      expect(li?.strategicFromFestive).toBe(true);
      expect(li?.protectionFromB).toBe(true);
    }
    expect(ltpInputStore.all().map((x) => `${x.kind}:${x.series ?? x.choice}`)).toEqual([
      'upload:A',
      'upload:Festive',
      'upload:B',
      'choice:Festive'
    ]);
    expect(ltpInputStore.all()[0]).toMatchObject({ sourceFile: 'A.csv' });
    expect(ltpInputStore.all()[0].setAt).toBeTruthy();
  });

  it('LTP B adds its buffer to ROP Order only', async () => {
    const r0 = (await rows())[0];
    const keys = r0.weeks.map((x) => x.week);
    /** @param {string} supplierId */
    const figure = (supplierId) =>
      demandAnticipationToPublish([]).figures.find(
        (f) => f.supplierId === supplierId && f.materialCode === MAT
      )?.figure;
    await upload(planning, 'A', Object.fromEntries(keys.map((k) => [k, 100])));
    const base = figure(r0.supplierId);
    expect(base?.protectionBuffer).toBe(0);
    await upload(planning, 'B', Object.fromEntries(keys.map((k) => [k, 10_000])));
    const withB = figure(r0.supplierId);
    expect(withB?.protectionBuffer ?? 0).toBeGreaterThan(0);
    expect(withB?.ropOrder).toBe((base?.ropOrder ?? 0) + (withB?.protectionBuffer ?? 0));
    // Cycle stock and the safety order are untouched.
    expect(withB?.cycleStock).toBe(base?.cycleStock);
    expect(withB?.safetyOrder).toBe(base?.safetyOrder);
  });

  it('refuses a bad payload, an unknown material, and a supplier or a seat without the atom', async () => {
    const bad = await choose(planning, 'C');
    expect(bad.status).toBe('failed');
    expect(ltpInputStore.all()).toHaveLength(0);
    await expect(
      cmd.dispatch(planning, {
        transitionId: 't_ltpinput_set',
        entity: 'ltpInput',
        entityId: 'choice|NOT-A-MATERIAL',
        payload: { ltpChoice: 'A' }
      })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(choose(supplier, 'B')).rejects.toMatchObject({ code: 'SCOPE_DENIED' });
    expect((await choose(procurement, 'B')).status).toBe('failed');
    expect(ltpInputStore.all()).toHaveLength(0);
  });
});
