// ────────────────────────────────────────────────────────────────────────────
// PO On Hold — the room each option has left BEFORE the planner sends a round
// (BL-323, accepted as a follow-up on 2026-11-17, MR !145 call 5).
//
// The read exposes `noRoomByOption`, derived at read and never stored: the plan
// each option would run, judged by the one `planHasNoRoom` predicate, so the
// line the picker shows before the send and the line the preview shows after it
// cannot disagree. The line informs; it does not block — a no-room round still
// runs and places 0.
//
// Fixtures replayed by name (D1, 2026-11-17): sup-007 PK-PETB-8801, week of
// 31 Aug 2026 holds DA 39,300, of which 35,000 is regular call-offs; round 1
// fills the 4,300 left, so FS + spread has no room from round 2 on. FG:
// sup-003 FR-EMIN-4420, 300 on hold, the cap set to 120.
// ────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService, commandAuditSink } from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import { poOnHoldStore } from './stores/poOnHoldStore';
import { osipParamStore } from './stores/osipParamStore';
import { callOffStore } from './stores/callOffStore';
import { consumptionStore } from './stores/consumptionStore';
import { maxStockStore } from '../../transitions/maxStock';
import { planHasNoRoom } from '../../transitions/poOnHoldExecution';
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

/** The line D1 was found on: OSPO 122,000, the week of 31 Aug 2026 holds DA 39,300. */
const D1 = { supplierId: 'sup-007', materialCode: 'PK-PETB-8801' };
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

/** D1 round 1: FS + spread suggested, grace 0 so it runs at once; it takes the week's 4,300. */
async function d1RoundOne() {
  expect((await suggest(D1, 'fsSpread')).status).not.toBe('failed');
  await setParam('grace', D1, 0);
  const r = await live(D1);
  expect(r?.execution.status).toBe('executed');
  expect(r?.execution.plan).toMatchObject({ placedQty: 4300 });
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

describe('the room per option before the send (BL-323)', () => {
  it('known good: a line with room says FS + spread can run, and the preview agrees at the same instant', async () => {
    const start = await live(D1);
    expect(start?.noRoomByOption).toEqual({ fsOnly: false, fsSpread: false, fg: false });

    // The same figures through the preview of the round just suggested: the
    // predicate the post-send line uses says the same thing as the pre-send flag.
    expect((await suggest(D1, 'fsSpread')).status).not.toBe('failed');
    const suggested = await live(D1);
    const plan = suggested?.execution.plan;
    if (!plan) throw new Error('no preview plan for the suggested round');
    expect(planHasNoRoom(plan)).toBe(false);
    expect(suggested?.noRoomByOption.fsSpread).toBe(false);
  });

  it('known bad FS + spread: once an earlier round filled the week, the picker is told before any send', async () => {
    await d1RoundOne();
    // Round 2 gets a grace period, so it stays suggested and its preview exists.
    await setParam('grace', D1, 5);
    const beforeSend = await live(D1);
    expect(beforeSend?.noRoomByOption).toEqual({ fsOnly: false, fsSpread: true, fg: false });
    // Known-good arm in the same state: FS only places the whole remainder.
    expect(beforeSend?.noRoomByOption.fsOnly).toBe(false);

    // What the picker says before the send is what the round does after it:
    // still sent, placed 0, the remainder stays on hold (nothing is refused).
    expect((await suggest(D1, 'fsSpread')).status).not.toBe('failed');
    const preview = await live(D1);
    const plan = preview?.execution.plan;
    if (!plan) throw new Error('no preview plan for round 2');
    expect(planHasNoRoom(plan)).toBe(true);
    expect(preview?.noRoomByOption.fsSpread).toBe(true);

    await setParam('grace', D1, 0);
    const executed = await live(D1);
    expect(executed?.execution.status).toBe('executed');
    expect(executed?.execution.plan).toMatchObject({ placedQty: 0, stayOnHoldQty: 113400 });
    // And the next round is told the same thing.
    expect(executed?.noRoomByOption.fsSpread).toBe(true);
  });

  it('known bad FG: with the cap used up by an earlier round, fg has no room before the send', async () => {
    maxStockStore.append({
      ...SMALL,
      quantity: 100,
      previous: null,
      setBy: NO_PERSON,
      setAt: sdcClock.now()
    });
    const probe = await live(SMALL);
    const base = Math.min(100, probe?.sohSupplier ?? 0) - (probe?.sohPti ?? 0);
    await setParam('maxPti', SMALL, 120 - base);
    const before = await live(SMALL);
    expect(before?.cap).toBe(120);
    expect(before?.noRoomByOption.fg).toBe(false);

    expect((await suggest(SMALL, 'fg')).status).not.toBe('failed');
    await setParam('grace', SMALL, 0);
    const after = await live(SMALL);
    expect(after?.execution.status).toBe('executed');
    expect(after?.cap).toBe(0);
    expect(after?.noRoomByOption.fg).toBe(true);
    // FS only is never out of room: it places the whole remainder.
    expect(after?.noRoomByOption.fsOnly).toBe(false);
  });
});
