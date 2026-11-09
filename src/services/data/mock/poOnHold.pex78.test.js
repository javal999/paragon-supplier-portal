// ────────────────────────────────────────────────────────────────────────────
// PEX-7 / PEX-8 (BL-270, BL-271, BL-272) — PO On Hold, dispatched through the
// REAL MockCommandService and read back through the REAL procurement service.
// ────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService, commandAuditSink } from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import { poOnHoldStore } from './stores/poOnHoldStore';
import { osipParamStore } from './stores/osipParamStore';
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { sdcClock } from '../../sdc';
import { NO_PERSON } from '@context/noPerson';

const svc = new MockCommandService();
const reads = new MockProcurementService();

/** @type {import('../types').QueryScope} */
const planner = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['planning'],
  actor: NO_PERSON
};
/** @param {string} supplierId @returns {import('../types').QueryScope} */
const supplierSeat = (supplierId) => ({
  personaType: 'supplier',
  supplierId,
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON
});
const sup2 = supplierSeat('sup-002');
const sup3 = supplierSeat('sup-003');

// Sample data on the hub's declared day: no DA at all for RM-MYRST-7310 (all of
// OSPO on hold → FS only), DA above 0 for RM-EMUL-9410 (→ FS + spread).
const NO_DEMAND = { supplierId: 'sup-002', materialCode: 'RM-MYRST-7310' };
const SOME_DEMAND = { supplierId: 'sup-002', materialCode: 'RM-EMUL-9410' };
const keyOf = (/** @type {{supplierId: string; materialCode: string}} */ p) =>
  `${p.supplierId}|${p.materialCode}`;

/** @param {import('../types').QueryScope} scope */
const lines = async (scope) => (await reads.getPoOnHold(scope)).items;
/** @param {Record<string, unknown>} payload @param {import('../types').QueryScope} [scope] */
const suggest = (payload, scope = planner) =>
  svc.dispatch(scope, { transitionId: 't_poonhold_suggest', entity: 'poOnHoldDecision', payload });
/** @param {string} id @param {unknown} option @param {import('../types').QueryScope} scope */
const choose = (id, option, scope) =>
  svc.dispatch(scope, {
    transitionId: 't_poonhold_choose',
    entity: 'poOnHoldDecision',
    entityId: id,
    payload: { option }
  });
/** @param {'grace' | 'noMove'} param @param {number | null} value */
const setParam = (param, value) =>
  svc.dispatch(planner, {
    transitionId: 't_osipparam_set',
    entity: 'osipParam',
    entityId: `${param}|${NO_DEMAND.supplierId}|${NO_DEMAND.materialCode}`,
    payload: { osipParamValue: value }
  });

beforeEach(() => {
  poOnHoldStore.reset();
  osipParamStore.reset();
  commandAuditSink.clear();
  sdcClock.reset();
});

describe('the read (PEX-7)', () => {
  it('lists the pairs DA does not absorb, with OSPO, DA not yet called off and the quantity', async () => {
    const rows = await lines(planner);
    const none = rows.find((r) => r.key === keyOf(NO_DEMAND));
    expect(none).toMatchObject({ ospo: 10000, daNotCalledOff: 0, qty: 10000, demand: 0 });
    const some = rows.find((r) => r.key === keyOf(SOME_DEMAND));
    expect(some?.qty).toBe((some?.ospo ?? 0) - (some?.daNotCalledOff ?? 0));
    expect(some?.qty).toBeGreaterThan(0);
  });

  it('BR-02/BR-05: the grace period starts on the first day and is 14 days by default', async () => {
    const r = (await lines(planner)).find((x) => x.key === keyOf(NO_DEMAND));
    expect(r?.grace.firstDay).toBe(sdcClock.now().slice(0, 10));
    expect(r?.grace.graceDays).toBe(14);
    expect(r?.graceIsDefault).toBe(true);
    expect(r?.noMoveDays).toBe(14);
    expect(r?.grace.ended).toBe(false);
    expect(r?.grace.daysLeft).toBe(14);
  });

  it('the first day stays when read again later (it is stored, not recomputed)', async () => {
    const first = (await lines(planner)).find((x) => x.key === keyOf(NO_DEMAND));
    sdcClock.set('2026-09-03T12:00:00.000Z');
    const later = (await lines(planner)).find((x) => x.key === keyOf(NO_DEMAND));
    expect(later?.grace.firstDay).toBe(first?.grace.firstDay);
    // Working days: 4 Sep and 2 Sep are hub holidays in the sample calendar, due 22 Sep.
    expect(later?.grace.dueDay).toBe(first?.grace.dueDay);
    expect(later?.grace.daysLeft).toBe(12);
  });

  it('BR-03/BR-04: grace and no-movement days are set with t_osipparam_set and read back', async () => {
    await lines(planner);
    expect((await setParam('grace', 21)).status).not.toBe('failed');
    expect((await setParam('noMove', 30)).status).not.toBe('failed');
    const r = (await lines(planner)).find((x) => x.key === keyOf(NO_DEMAND));
    expect(r).toMatchObject({ noMoveDays: 30, graceIsDefault: false, noMoveIsDefault: false });
    expect(r?.grace.graceDays).toBe(21);
    expect(osipParamStore.valueOf('grace|sup-002|RM-MYRST-7310')).toBe(21);
  });

  it('refuses a fractional or out-of-range period at the verb', async () => {
    expect((await setParam('grace', 2.5)).status).toBe('failed');
    expect((await setParam('grace', 400)).status).toBe('failed');
  });

  it('a supplier reads only its own lines', async () => {
    const own = await lines(sup3);
    expect(own.length).toBeGreaterThan(0);
    expect(own.every((r) => r.supplierId === 'sup-003')).toBe(true);
    const all = await lines(planner);
    expect(new Set(all.map((r) => r.supplierId)).size).toBeGreaterThan(1);
  });

  it('the hub holds no PIPO flag, Max PTI or movement record: they read null, and FG is not suggested', async () => {
    const r = (await lines(planner)).find((x) => x.key === keyOf(NO_DEMAND));
    expect(r).toMatchObject({ pipo: null, maxPti: null, cap: null, daysSinceMovement: null });
    expect(r?.conditions.fg).toBe(false);
    expect(r?.suggestion).toBe('fsOnly');
    const s = (await lines(planner)).find((x) => x.key === keyOf(SOME_DEMAND));
    expect(s?.suggestion).toBe('fsSpread');
  });
});

describe('the decision (PEX-8)', () => {
  it('the planner suggests; the line then reads awaiting the supplier, with the history', async () => {
    const res = await suggest({ ...NO_DEMAND, option: 'fsOnly' });
    expect(res.status).not.toBe('failed');
    const r = (await lines(planner)).find((x) => x.key === keyOf(NO_DEMAND));
    expect(r?.status).toBe('awaitingSupplier');
    expect(r?.decision?.suggested).toBe('fsOnly');
    expect(r?.decision?.history.map((h) => h.kind)).toEqual(['suggested']);
    expect(r?.effective).toBeNull();
  });

  it('a supplier cannot suggest, and a second suggestion on the same line is refused', async () => {
    expect((await suggest({ ...NO_DEMAND, option: 'fsOnly' }, sup2)).status).toBe('failed');
    await suggest({ ...NO_DEMAND, option: 'fsOnly' });
    const again = await suggest({ ...NO_DEMAND, option: 'fsSpread' });
    expect(again.status).toBe('failed');
    expect(again.reason).toContain('PO_ON_HOLD_ALREADY_SUGGESTED');
  });

  it('refuses an invalid option and a pair with nothing on hold', async () => {
    expect((await suggest({ ...NO_DEMAND, option: 'cancel' })).reason).toContain(
      'PO_ON_HOLD_OPTION_INVALID'
    );
    expect(
      (await suggest({ supplierId: 'sup-002', materialCode: 'NOPE', option: 'fsOnly' })).status
    ).toBe('failed');
  });

  it('AC-01: the supplier chooses FS + spread over the suggested FS only; the choice is final', async () => {
    await suggest({ ...NO_DEMAND, option: 'fsOnly' });
    const id = (await lines(planner)).find((x) => x.key === keyOf(NO_DEMAND))?.decision?.id ?? '';
    const res = await choose(id, 'fsSpread', sup2);
    expect(res.status).not.toBe('failed');
    const r = (await lines(planner)).find((x) => x.key === keyOf(NO_DEMAND));
    expect(r).toMatchObject({ status: 'chosen', effective: 'fsSpread' });
    expect(r?.outcome).toMatchObject({ spreadQty: r?.qty, feedstockQty: 0 });
    expect(r?.decision?.history.map((h) => h.kind)).toEqual(['suggested', 'chosen']);
    // Final: a second choice is not a legal transition.
    expect((await choose(id, 'fsOnly', sup2)).status).toBe('failed');
  });

  it('another supplier cannot choose on the line (scope); the planner holds no choose verb', async () => {
    await suggest({ ...NO_DEMAND, option: 'fsOnly' });
    const id = (await lines(planner)).find((x) => x.key === keyOf(NO_DEMAND))?.decision?.id ?? '';
    await expect(choose(id, 'fsOnly', sup3)).rejects.toThrow(/denied for scope/);
    expect((await choose(id, 'fsOnly', planner)).status).toBe('failed');
    const r = (await lines(planner)).find((x) => x.key === keyOf(NO_DEMAND));
    expect(r?.status).toBe('awaitingSupplier');
  });

  it('a supplier does not see another supplier’s decision', async () => {
    await suggest({ ...NO_DEMAND, option: 'fsOnly' });
    expect((await lines(sup3)).some((r) => r.key === keyOf(NO_DEMAND))).toBe(false);
  });

  it('BR-06 / PEX-D14: silence at the end of the grace period applies the suggestion, marked no supplier response', async () => {
    await lines(planner);
    await setParam('grace', 0);
    // Grace 0 is over at once, so a suggestion made now is the one that applies.
    await suggest({ ...NO_DEMAND, option: 'fsOnly' });
    const r = (await lines(planner)).find((x) => x.key === keyOf(NO_DEMAND));
    expect(r).toMatchObject({ status: 'noSupplierResponse', effective: 'fsOnly' });
    expect(r?.outcome).toMatchObject({ feedstockQty: r?.qty });
  });

  it('a choice after the grace period ended is refused (the suggestion already applies)', async () => {
    await suggest({ ...NO_DEMAND, option: 'fsOnly' });
    const id = (await lines(planner)).find((x) => x.key === keyOf(NO_DEMAND))?.decision?.id ?? '';
    await setParam('grace', 0);
    const res = await choose(id, 'fsSpread', sup2);
    expect(res.status).toBe('failed');
    expect(res.reason).toContain('PO_ON_HOLD_GRACE_ENDED');
  });

  it('the grace period ended with no suggestion: back to the planner', async () => {
    await lines(planner);
    await setParam('grace', 0);
    const r = (await lines(planner)).find((x) => x.key === keyOf(NO_DEMAND));
    expect(r).toMatchObject({ status: 'backToPlanner', effective: null });
  });

  it('PEX-10 BR-01: the choice carries the lead time for the fulfil-by line', async () => {
    const r = (await lines(planner)).find((x) => x.key === keyOf(NO_DEMAND));
    expect(typeof r?.leadTimeDays).toBe('number');
  });
});
