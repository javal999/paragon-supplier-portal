// ────────────────────────────────────────────────────────────────────────────
// PO On Hold — an earlier "Suggest again" round counts against the room.
//
// RULING (Levi, 2026-11-17, in chat, on finding D1 of
// reviews/VERIFY-135-2026-11-16.md): asked "Should an earlier round's call-offs
// count against a week's DA room?" he answered "Count them: yes, count earlier
// rounds". Before it, FS + spread re-spread the same "DA not yet called off"
// every round: sup-007 PK-PETB-8801, week of 31 Aug 2026, DA 39,300, regular
// call-offs 35,000 and three rounds of 4,300 made 47,900, which is 8,600 above
// DA. The pure file promised "a week's call-offs never exceed its DA".
//
// [Proposed] (the build brief's readings, not Levi's words; listed for him in
// the MR): the same reading for FG, where what an earlier round absorbed counts
// against the cap; rounds stay unlimited, and a round with no room left places
// 0 and leaves the remainder on hold (no round cap, no refusal).
//
// KEPT (accepted MR !117 decision 4): the screen's "DA not yet called off" still
// leaves the execution call-offs out, so the quantity an execution took still
// leaves hold. Only the ROOM the spread uses counts them.
// ────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService, commandAuditSink } from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import { allDemandAnticipation } from './demandAnticipationReadModel';
import { poOnHoldStore } from './stores/poOnHoldStore';
import { osipParamStore } from './stores/osipParamStore';
import { callOffStore } from './stores/callOffStore';
import { consumptionStore } from './stores/consumptionStore';
import { maxStockStore } from '../../transitions/maxStock';
import { openSupplyIndex } from '../../transitions/supplyBelowDemandRules';
import {
  planExecution,
  planHasNoRoom,
  spreadAcrossWeeks
} from '../../transitions/poOnHoldExecution';
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

/** The line D1 was found on: OSPO 122,000, week of 31 Aug 2026 holds DA 39,300. */
const D1 = { supplierId: 'sup-007', materialCode: 'PK-PETB-8801' };
const W36 = '2026-08-31';
/** 300 on hold; the FG fixtures of `poOnHold.resuggest.test.js`. */
const SMALL = { supplierId: 'sup-003', materialCode: 'FR-EMIN-4420' };

/** @param {{supplierId: string; materialCode: string}} p */
const live = async (p) =>
  (await reads.getPoOnHold(planner)).items.find(
    (r) => !r.closed && r.supplierId === p.supplierId && r.materialCode === p.materialCode
  );
/** @param {{supplierId: string; materialCode: string}} p @param {string} option */
const suggest = (p, option) =>
  svc.dispatch(planner, {
    transitionId: 't_poonhold_suggest',
    entity: 'poOnHoldDecision',
    payload: { ...p, option }
  });
/** @param {string} param @param {{supplierId: string; materialCode: string}} p @param {number} value */
const setParam = (param, p, value) =>
  svc.dispatch(planner, {
    transitionId: 't_osipparam_set',
    entity: 'osipParam',
    entityId: `${param}|${p.supplierId}|${p.materialCode}`,
    payload: { osipParamValue: value }
  });
const made = () => callOffStore.all().filter((c) => c.origin === 'poOnHold');

/**
 * One week's DA and the call-offs released for it: the regular ones, and all of
 * them (the ones a PO On Hold round made too).
 * @param {{supplierId: string; materialCode: string}} p
 * @param {string} week
 */
function weekOf(p, week) {
  const da = allDemandAnticipation(sdcClock.now()).find(
    (r) => r.supplierId === p.supplierId && r.materialCode === p.materialCode
  );
  const i = da ? da.plan.horizonWeeks.indexOf(week) : -1;
  const key = `${p.supplierId}|${p.materialCode}|${week}`;
  return {
    da: da && i >= 0 ? (da.plan.daInForce[i] ?? 0) : 0,
    regular:
      openSupplyIndex(callOffStore.all().filter((c) => c.origin !== 'poOnHold')).get(key) ?? 0,
    all: openSupplyIndex(callOffStore.all()).get(key) ?? 0
  };
}

/** What every execution of a pair absorbed as FG, in all. @param {{supplierId: string; materialCode: string}} p */
const absorbedOn = (p) =>
  poOnHoldStore
    .executions()
    .filter((e) => e.supplierId === p.supplierId && e.materialCode === p.materialCode)
    .reduce((n, e) => n + e.plan.absorbed.reduce((m, a) => m + a.qty, 0), 0);

/** D1 round 1: FS + spread suggested, then the grace period set to 0 so the next command runs it. */
async function d1RoundOne() {
  expect((await suggest(D1, 'fsSpread')).status).not.toBe('failed');
  await setParam('grace', D1, 0);
  const r = await live(D1);
  expect(r?.execution.status).toBe('executed');
  return r;
}

/**
 * FG round 1: the cap is `cap` of the 300 on hold, executed at once (grace 0).
 * Returns the base the cap formula adds Max PTI to.
 * @param {number} cap
 */
async function fgRoundOne(cap) {
  maxStockStore.append({
    ...SMALL,
    quantity: 100,
    previous: null,
    setBy: NO_PERSON,
    setAt: sdcClock.now()
  });
  const probe = await live(SMALL);
  const base = Math.min(100, probe?.sohSupplier ?? 0) - (probe?.sohPti ?? 0);
  await setParam('maxPti', SMALL, cap - base);
  expect((await suggest(SMALL, 'fg')).status).not.toBe('failed');
  await setParam('grace', SMALL, 0);
  const r = await live(SMALL);
  expect(r?.execution.status).toBe('executed');
  return base;
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

const L1 = { poId: 'po1', poNumber: 'PO-1', lineId: 'l1', balance: 1000 };
/** A week of DA 100 with `calledOff` released for it, whoever made them. @param {number} calledOff */
const week = (calledOff) => ({ week: 'w1', da: 100, calledOff, needDate: '2026-12-01' });
/**
 * @param {'fsOnly' | 'fsSpread' | 'fg'} option
 * @param {number | null} cap
 * @param {readonly { week: string; da: number; calledOff: number; needDate: string | null }[]} weeks
 * @param {number | null} [leadTimeDays]  Null: no lead time on record.
 */
const plan = (option, cap, weeks, leadTimeDays = 14) =>
  planExecution({
    option,
    qty: 500,
    cap,
    graceEndDay: '2026-11-20',
    leadTimeDays,
    lines: [L1],
    weeks
  });

describe('the room of a week (pure)', () => {
  it('is the week’s DA less every call-off released for it, an earlier round’s call-off included', () => {
    // 60 regular + 40 from an earlier round = 100 released: no room, nothing placed.
    expect(spreadAcrossWeeks([week(100)], 50)).toEqual([]);
    // 60 regular + 10 from an earlier round = 70 released: 30 of room.
    expect(spreadAcrossWeeks([week(70)], 50).map((s) => [s.week.week, s.qty])).toEqual([
      ['w1', 30]
    ]);
    // Known good: with nothing released the week takes what it is given, up to its DA.
    expect(spreadAcrossWeeks([week(0)], 50).map((s) => s.qty)).toEqual([50]);
  });

  it('a plan with no room places 0, is not blocked, and leaves the whole remainder on hold', () => {
    expect(plan('fsSpread', null, [week(100)])).toMatchObject({
      blocked: null,
      callOffs: [],
      placedQty: 0,
      stayOnHoldQty: 500
    });
  });
});

describe('planHasNoRoom (pure)', () => {
  it('is true for FS + spread with every week full and for FG with the cap used up', () => {
    expect(planHasNoRoom(plan('fsSpread', null, [week(100)]))).toBe(true);
    expect(planHasNoRoom(plan('fsSpread', null, []))).toBe(true);
    expect(planHasNoRoom(plan('fg', 0, []))).toBe(true);
  });

  it('is false while something is placed, for FS only, and while a fact is missing', () => {
    expect(planHasNoRoom(plan('fsSpread', null, [week(70)]))).toBe(false);
    expect(planHasNoRoom(plan('fsSpread', null, [week(0)]))).toBe(false);
    expect(planHasNoRoom(plan('fg', 200, []))).toBe(false);
    // The cap is not on record: the execution waits (blocked), it does not "have no room".
    expect(plan('fg', null, []).blocked).toBe('noCap');
    expect(planHasNoRoom(plan('fg', null, []))).toBe(false);
    // FS only has no room to run out of: it places the whole remainder, or waits for a lead time.
    expect(planHasNoRoom(plan('fsOnly', null, []))).toBe(false);
    expect(plan('fsOnly', null, [], null).blocked).toBe('noLeadTime');
    expect(planHasNoRoom(plan('fsOnly', null, [], null))).toBe(false);
  });
});

describe('D1 replayed through the real services: sup-007 PK-PETB-8801, week of 31 Aug 2026', () => {
  it('round 1 places 4,300, rounds 2 and 3 place 0, and the week never goes above its DA', async () => {
    const start = await live(D1);
    expect(start).toMatchObject({ ospo: 122000, daNotCalledOff: 4300, qty: 117700 });
    // The numbers of the verify report, pinned by name: DA 39,300 = 35,000 called off + 4,300 not yet.
    expect(weekOf(D1, W36)).toEqual({ da: 39300, regular: 35000, all: 35000 });

    const r1 = await d1RoundOne();
    expect(r1?.execution.plan).toMatchObject({ placedQty: 4300, stayOnHoldQty: 113400 });
    expect(made().map((c) => c.quantity)).toEqual([4300]);
    // KEPT, !117 decision 4: OSPO fell by what the execution took; "DA not yet called off" did not move.
    expect(r1).toMatchObject({ ospo: 117700, daNotCalledOff: 4300, qty: 113400 });
    expect(weekOf(D1, W36)).toEqual({ da: 39300, regular: 35000, all: 39300 });

    for (const round of [2, 3]) {
      // No round cap and no refusal: the planner can suggest again, the round places 0.
      expect((await suggest(D1, 'fsSpread')).status).not.toBe('failed');
      const r = await live(D1);
      expect(r).toMatchObject({ round, ospo: 117700, daNotCalledOff: 4300, qty: 113400 });
      expect(r?.execution.status).toBe('executed');
      expect(r?.execution.plan).toMatchObject({
        callOffs: [],
        placedQty: 0,
        stayOnHoldQty: 113400
      });
      expect(weekOf(D1, W36).all).toBeLessThanOrEqual(39300);
    }
    expect(made()).toHaveLength(1);
    expect(weekOf(D1, W36)).toEqual({ da: 39300, regular: 35000, all: 39300 });
  });

  it('a round with no room is still a round: one execution per decision, a ledger row with no call-off, and a fourth round is not refused', async () => {
    await d1RoundOne();
    const roundOneRow = JSON.stringify(poOnHoldStore.executions()[0]);
    for (const round of [2, 3, 4]) {
      expect((await suggest(D1, 'fsSpread')).status, `round ${round}`).not.toBe('failed');
    }
    const ex = poOnHoldStore.executions();
    expect(ex).toHaveLength(4);
    expect(new Set(ex.map((e) => e.decisionId)).size).toBe(4);
    for (const e of ex.slice(1)) {
      expect(e.plan.placedQty).toBe(0);
      expect(e.callOffIds).toEqual([]);
      expect(e.lineKeys).toEqual([]);
    }
    expect(ex.every((e) => e.actor === 'system')).toBe(true);
    // Round 1's ledger row is byte-identical.
    expect(JSON.stringify(ex[0])).toBe(roundOneRow);
    expect(made()).toHaveLength(1);
    expect(weekOf(D1, W36).all).toBe(39300);
  });

  it('the preview of the next round says it has no room before it runs', async () => {
    await d1RoundOne();
    await setParam('grace', D1, 5); // round 2 gets a real grace period and stays scheduled
    expect((await suggest(D1, 'fsSpread')).status).not.toBe('failed');
    const r = await live(D1);
    expect(r?.execution.status).toBe('scheduled');
    expect(r?.execution.plan).toMatchObject({ callOffs: [], placedQty: 0, stayOnHoldQty: 113400 });
    expect(r?.execution.plan && planHasNoRoom(r.execution.plan)).toBe(true);
    expect(made()).toHaveLength(1);
  });

  it('a call-off of an earlier round that is dismissed gives its room back', async () => {
    await d1RoundOne();
    const first = made()[0];
    expect(first).toBeDefined();
    callOffStore.update(first?.id ?? '', (c) => ({ ...c, status: 'Dismissed' }));
    expect(weekOf(D1, W36)).toEqual({ da: 39300, regular: 35000, all: 35000 });
    // Round 2 (grace still 0) finds the 4,300 of room again and fills it once more.
    expect((await suggest(D1, 'fsSpread')).status).not.toBe('failed');
    expect(
      made()
        .filter((c) => c.status === 'Confirmed')
        .map((c) => c.quantity)
    ).toEqual([4300]);
    expect(weekOf(D1, W36)).toEqual({ da: 39300, regular: 35000, all: 39300 });
  });
});

describe('FG [Proposed]: what an earlier round absorbed counts against the cap', () => {
  it('a repeat round absorbs 0 and the total stays at the cap', async () => {
    await fgRoundOne(120);
    const r1 = await live(SMALL);
    // The cap the next round has left: 120 less the 120 round 1 absorbed.
    expect(r1).toMatchObject({ qty: 180, cap: 0 });
    expect(r1?.outcome).toMatchObject({ fgQty: 0, stayOnHoldQty: 180 });
    expect(absorbedOn(SMALL)).toBe(120);

    expect((await suggest(SMALL, 'fg')).status).not.toBe('failed'); // no refusal
    const r2 = await live(SMALL);
    expect(r2?.round).toBe(2);
    expect(r2?.execution.status).toBe('executed');
    expect(r2?.execution.plan).toMatchObject({ absorbed: [], placedQty: 0, stayOnHoldQty: 180 });
    expect(r2?.qty).toBe(180);
    expect(absorbedOn(SMALL)).toBe(120);
  });

  it('a cap raised between rounds opens only the extra room', async () => {
    const base = await fgRoundOne(120);
    await setParam('maxPti', SMALL, 200 - base); // the cap is 200 now: 80 more than round 1 took
    expect((await live(SMALL))?.cap).toBe(80);
    expect((await suggest(SMALL, 'fg')).status).not.toBe('failed');
    const r2 = await live(SMALL);
    expect(r2?.execution.plan?.absorbed.reduce((n, a) => n + a.qty, 0)).toBe(80);
    expect(r2?.qty).toBe(100);
    expect(absorbedOn(SMALL)).toBe(200);
  });

  it('the preview of the next round says it has no room before it runs', async () => {
    await fgRoundOne(120);
    await setParam('grace', SMALL, 5);
    expect((await suggest(SMALL, 'fg')).status).not.toBe('failed');
    const r = await live(SMALL);
    expect(r?.execution.status).toBe('scheduled');
    expect(r?.execution.plan && planHasNoRoom(r.execution.plan)).toBe(true);
    expect(absorbedOn(SMALL)).toBe(120);
  });
});
