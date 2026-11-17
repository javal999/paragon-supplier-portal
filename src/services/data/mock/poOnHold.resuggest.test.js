// ────────────────────────────────────────────────────────────────────────────
// PO On Hold — "Suggest again" [Proposed]. A remainder an execution left on
// hold takes a NEW decision (round 2) through `t_poonhold_suggest`: one
// execution per decision, the old rows never change, execution still waits for
// its grace period. Same fixtures as `poOnHold.exec.test.js`.
// ────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService, commandAuditSink } from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import { executePoOnHold } from './poOnHoldExecutor';
import { poOnHoldStore } from './stores/poOnHoldStore';
import { osipParamStore } from './stores/osipParamStore';
import { callOffStore } from './stores/callOffStore';
import { consumptionStore } from './stores/consumptionStore';
import { maxStockStore } from '../../transitions/maxStock';
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
const SMALL = { supplierId: 'sup-003', materialCode: 'FR-EMIN-4420' }; // 300 on hold

/** @param {{supplierId: string; materialCode: string}} p */
const live = async (p) =>
  (await reads.getPoOnHold(planner)).items.find(
    (r) => !r.closed && r.supplierId === p.supplierId && r.materialCode === p.materialCode
  );
/** @param {Record<string, unknown>} payload */
const suggest = (payload) =>
  svc.dispatch(planner, {
    transitionId: 't_poonhold_suggest',
    entity: 'poOnHoldDecision',
    payload
  });
/** @param {string} id */
const execute = (id) =>
  svc.dispatch(
    { ...planner, businessRoles: ['automation'] },
    { transitionId: 't_poonhold_execute', entity: 'poOnHoldDecision', entityId: id, payload: {} }
  );
/** @param {string} param @param {number | boolean | null} value */
const setParam = (param, value) =>
  svc.dispatch(planner, {
    transitionId: 't_osipparam_set',
    entity: 'osipParam',
    entityId: `${param}|${SMALL.supplierId}|${SMALL.materialCode}`,
    payload: { osipParamValue: value }
  });

/** Round 1: an FG absorb capped at 120 of 300, executed at once (grace 0). */
async function roundOne() {
  maxStockStore.append({
    supplierId: SMALL.supplierId,
    materialCode: SMALL.materialCode,
    quantity: 100,
    previous: null,
    setBy: NO_PERSON,
    setAt: sdcClock.now()
  });
  const probe = await live(SMALL);
  const base = Math.min(100, probe?.sohSupplier ?? 0) - (probe?.sohPti ?? 0);
  await setParam('maxPti', 120 - base);
  expect((await suggest({ ...SMALL, option: 'fg' })).status).not.toBe('failed');
  await setParam('grace', 0);
  const r = await live(SMALL);
  expect(r?.execution.status).toBe('executed');
  expect(r?.qty).toBe(180);
  return r;
}

beforeEach(() => {
  poOnHoldStore.reset();
  callOffStore.reset();
  osipParamStore.reset();
  consumptionStore.reset();
  maxStockStore.reset();
  commandAuditSink.clear();
  sdcClock.reset();
});

describe('Suggest again (PO On Hold remainder)', () => {
  it('a line with a decision that has not executed still refuses a second suggestion', async () => {
    expect((await suggest({ ...SMALL, option: 'fsOnly' })).status).not.toBe('failed');
    const second = await suggest({ ...SMALL, option: 'fg' });
    expect(second.status).toBe('failed');
    expect(second.reason).toContain('PO_ON_HOLD_ALREADY_SUGGESTED');
    expect(poOnHoldStore.all()).toHaveLength(1);
  });

  it('the remainder takes a new decision: round 2, naming round 1, which is left untouched', async () => {
    const first = await roundOne();
    const oldId = first?.decision?.id ?? '';
    const oldDecision = JSON.stringify(poOnHoldStore.get(oldId));
    const oldExecution = JSON.stringify(poOnHoldStore.executionOf(oldId));
    await setParam('grace', 5);

    const again = await suggest({ ...SMALL, option: 'fg' });
    expect(again.status).not.toBe('failed');
    expect(poOnHoldStore.all()).toHaveLength(2);
    const next = poOnHoldStore.all()[1];
    expect(next).toMatchObject({ round: 2, previousId: oldId, state: 'Suggested' });
    expect(next?.id).not.toBe(oldId);
    // The old decision and its ledger row are byte-identical.
    expect(JSON.stringify(poOnHoldStore.get(oldId))).toBe(oldDecision);
    expect(JSON.stringify(poOnHoldStore.executionOf(oldId))).toBe(oldExecution);

    // The new round has its own grace period (starts on the hub day) and is not executed.
    const r = await live(SMALL);
    expect(r).toMatchObject({ round: 2, qty: 180 });
    expect(r?.grace.firstDay).toBe(sdcClock.now().slice(0, 10));
    expect(r?.grace.ended).toBe(false);
    expect(r?.execution.status).toBe('scheduled');
    expect(poOnHoldStore.executions()).toHaveLength(1);
    // Round 1 stays on the panel as a closed row.
    const all = (await reads.getPoOnHold(planner)).items;
    expect(all.some((x) => x.closed && x.decision?.id === oldId)).toBe(true);
  });

  it('a closed round row keeps the quantity that stayed on hold after it (BL-318)', async () => {
    const first = await roundOne();
    const oldId = first?.decision?.id ?? '';
    await setParam('grace', 5);
    await suggest({ ...SMALL, option: 'fg' });

    const all = (await reads.getPoOnHold(planner)).items;
    const closed = all.find((x) => x.closed && x.decision?.id === oldId);
    expect(closed?.execution.plan?.stayOnHoldQty).toBe(180);
    expect(closed?.qty).toBe(180);
  });

  it('execution is still blocked early and never repeats: old decision refused, new one waits for its grace', async () => {
    const first = await roundOne();
    const oldId = first?.decision?.id ?? '';
    await setParam('grace', 5);
    await suggest({ ...SMALL, option: 'fg' });
    const newId = poOnHoldStore.all()[1]?.id ?? '';

    const early = await execute(newId);
    expect(early.status).toBe('failed');
    expect(early.reason).toContain('PO_ON_HOLD_GRACE_RUNNING');
    const repeat = await execute(oldId);
    expect(repeat.status).toBe('failed');
    expect(executePoOnHold(oldId)).toBeNull();
    expect(poOnHoldStore.executions()).toHaveLength(1);
  });

  it('one execution per decision: round 2 runs once, under its own key, and leaves round 1 alone', async () => {
    const first = await roundOne();
    const oldId = first?.decision?.id ?? '';
    // Round 1 used all of the FG cap (120), and what an earlier round absorbed counts
    // against it (owner ruling 2026-11-17), so a round 2 on the same cap would absorb 0
    // and write no key. Raise Max PTI by 80 so round 2 has room and its own key to test.
    await setParam(
      'maxPti',
      Number(osipParamStore.valueOf(`maxPti|${SMALL.supplierId}|${SMALL.materialCode}`)) + 80
    );
    // grace stays 0: round 2 is due the day it starts.
    await suggest({ ...SMALL, option: 'fg' });
    const newId = poOnHoldStore.all()[1]?.id ?? '';
    const r = await live(SMALL);
    expect(r?.execution.status).toBe('executed');
    expect(poOnHoldStore.executions().map((e) => e.decisionId)).toEqual([oldId, newId]);
    expect(poOnHoldStore.executions()[1]?.lineKeys.length).toBeGreaterThan(0);
    const keys = poOnHoldStore.executions().flatMap((e) => e.lineKeys);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.every((k) => k.startsWith(`${oldId}|`) || k.startsWith(`${newId}|`))).toBe(true);
    expect(executePoOnHold(newId)).toBeNull();
    expect(poOnHoldStore.executions().every((e) => e.actor === 'system')).toBe(true);
  });
});
