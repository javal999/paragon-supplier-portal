// ────────────────────────────────────────────────────────────────────────────
// PEX-8 BR-02/BR-05, PEX-10 BR-01 — the END-OF-GRACE EXECUTION of PO On Hold,
// and the FG data (PIPO flag, Max PTI, stock movement). The pure plan first,
// then the real command and read services. Every rule is [Proposed].
// ────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import {
  MockCommandService,
  commandAuditSink,
  runDuePoOnHoldExecutions
} from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import { executePoOnHold } from './poOnHoldExecutor';
import { poOnHoldStore } from './stores/poOnHoldStore';
import { osipParamStore } from './stores/osipParamStore';
import { callOffStore } from './stores/callOffStore';
import { consumptionStore } from './stores/consumptionStore';
import { maxStockStore } from '../../transitions/maxStock';
import { fgCap, optionConditions, suggestOption, outcomeOf } from '../../transitions/poOnHold';
import { planExecution, spreadAcrossWeeks } from '../../transitions/poOnHoldExecution';
import { fulfilmentWindow } from '../../transitions/fulfilmentWindow';
import { lastMovementDay } from '../../transitions/stockMovement';
import { sdcClock } from '../../sdc';
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
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

const LINE = { supplierId: 'sup-002', materialCode: 'RM-MYRST-7310' }; // no DA: all 10000 on hold
const SMALL = { supplierId: 'sup-003', materialCode: 'FR-EMIN-4420' }; // 300 on hold

/** @param {{supplierId: string; materialCode: string}} p */
const find = async (p) =>
  (await reads.getPoOnHold(planner)).items.find(
    (r) => r.supplierId === p.supplierId && r.materialCode === p.materialCode
  );
/** @param {Record<string, unknown>} payload */
const suggest = (payload) =>
  svc.dispatch(planner, {
    transitionId: 't_poonhold_suggest',
    entity: 'poOnHoldDecision',
    payload
  });
/** @param {string} param @param {{supplierId: string; materialCode: string}} p @param {number | boolean | null} value */
const setParam = (param, p, value) =>
  svc.dispatch(planner, {
    transitionId: 't_osipparam_set',
    entity: 'osipParam',
    entityId:
      param === 'pipo' ? `pipo|${p.materialCode}` : `${param}|${p.supplierId}|${p.materialCode}`,
    payload: { osipParamValue: value }
  });
const made = () => callOffStore.all().filter((c) => c.origin === 'poOnHold');

beforeEach(() => {
  poOnHoldStore.reset();
  callOffStore.reset();
  osipParamStore.reset();
  consumptionStore.reset();
  maxStockStore.reset();
  commandAuditSink.clear();
  sdcClock.reset();
});

const L1 = { poId: 'po1', poNumber: 'PO-1', lineId: 'l1', balance: 300 };
const L2 = { poId: 'po2', poNumber: 'PO-2', lineId: 'l2', balance: 500 };

describe('the plan (pure)', () => {
  it('FS only: one call-off per PO line, oldest first, needed by the PEX-10 fulfil-by date', () => {
    const plan = planExecution({
      option: 'fsOnly',
      qty: 500,
      cap: null,
      graceEndDay: '2026-11-20',
      leadTimeDays: 14,
      lines: [L1, L2],
      weeks: []
    });
    expect(plan.confirmedOn).toBe('2026-11-20');
    expect(plan.callOffs.map((c) => [c.lineId, c.qty, c.needDate])).toEqual([
      ['l1', 300, fulfilmentWindow('2026-11-20', 14)?.by],
      ['l2', 200, fulfilmentWindow('2026-11-20', 14)?.by]
    ]);
    expect(plan.stayOnHoldQty).toBe(0);
  });

  it('FS only with no lead time on record is blocked, not guessed', () => {
    const plan = planExecution({
      option: 'fsOnly',
      qty: 10,
      cap: null,
      graceEndDay: '2026-11-20',
      leadTimeDays: undefined,
      lines: [L1],
      weeks: []
    });
    expect(plan.blocked).toBe('noLeadTime');
  });

  it('AC-01: PIPO material, remainder 500: FS only is suggested; FS + spread spreads the 500 over next weeks', () => {
    expect(suggestOption({ pipo: true, demand: 100, daysSinceMovement: 0, noMoveDays: 14 })).toBe(
      'fsOnly'
    );
    const weeks = [
      { week: '2026-12-07', da: 200, calledOff: 0, needDate: '2026-12-08' },
      { week: '2026-12-14', da: 300, calledOff: 0, needDate: '2026-12-15' }
    ];
    const plan = planExecution({
      option: 'fsSpread',
      qty: 500,
      cap: null,
      graceEndDay: '2026-11-20',
      leadTimeDays: 14,
      lines: [{ ...L1, balance: 1000 }],
      weeks
    });
    expect(plan.callOffs.map((c) => [c.week, c.qty, c.needDate])).toEqual([
      ['2026-12-07', 200, '2026-12-08'],
      ['2026-12-14', 300, '2026-12-15']
    ]);
    expect(plan.stayOnHoldQty).toBe(0);
  });

  it('spread is in proportion to DA', () => {
    const s = spreadAcrossWeeks(
      [
        { week: 'a', da: 100, calledOff: 0, needDate: '2026-12-01' },
        { week: 'b', da: 300, calledOff: 0, needDate: '2026-12-08' }
      ],
      80
    );
    expect(s.map((x) => x.qty)).toEqual([20, 60]);
  });

  it('spread never goes above DA not yet called off in a week; the rest stays on hold', () => {
    const weeks = [
      { week: 'a', da: 100, calledOff: 90, needDate: '2026-12-01' },
      { week: 'b', da: 100, calledOff: 0, needDate: '2026-12-08' }
    ];
    expect(spreadAcrossWeeks(weeks, 150).map((x) => [x.week.week, x.qty])).toEqual([
      ['a', 10],
      ['b', 100]
    ]);
    const plan = planExecution({
      option: 'fsSpread',
      qty: 150,
      cap: null,
      graceEndDay: '2026-11-20',
      leadTimeDays: 14,
      lines: [{ ...L1, balance: 1000 }],
      weeks
    });
    expect(plan.placedQty).toBe(110);
    expect(plan.stayOnHoldQty).toBe(40);
  });

  it('a week with no call-off to take a need date from takes nothing', () => {
    expect(spreadAcrossWeeks([{ week: 'a', da: 100, calledOff: 0, needDate: null }], 50)).toEqual(
      []
    );
  });

  it('AC-02: cap = 1,000 + min(400, 300) − 900 = 400; remainder 600: 400 absorbed, 200 stays on hold', () => {
    const cap = fgCap({ maxPti: 1000, maxSupplier: 400, sohSupplier: 300, sohPti: 900 });
    expect(cap).toBe(400);
    const plan = planExecution({
      option: 'fg',
      qty: 600,
      cap,
      graceEndDay: '2026-11-20',
      leadTimeDays: 14,
      lines: [{ ...L1, balance: 600 }],
      weeks: []
    });
    expect(plan.absorbed.map((a) => a.qty)).toEqual([400]);
    expect(plan.callOffs).toEqual([]);
    expect(plan.stayOnHoldQty).toBe(200);
    expect(outcomeOf('fg', 600, cap)).toMatchObject({ fgQty: 400, stayOnHoldQty: 200 });
  });

  it('FG with no cap waits (blocked) instead of spending its one run on missing data', () => {
    expect(
      planExecution({
        option: 'fg',
        qty: 600,
        cap: null,
        graceEndDay: '2026-11-20',
        leadTimeDays: 14,
        lines: [L1],
        weeks: []
      }).blocked
    ).toBe('noCap');
  });

  it('AC-03: non-PIPO, zero demand, stock moved 5 days ago: FG is not suggested', () => {
    const f = { pipo: false, demand: 0, daysSinceMovement: 5, noMoveDays: 14, capKnown: true };
    expect(optionConditions(f).fg).toBe(false);
    expect(suggestOption(f)).toBe('fsOnly');
    expect(suggestOption({ ...f, daysSinceMovement: 14 })).toBe('fg');
    expect(optionConditions({ ...f, daysSinceMovement: 14, capKnown: false }).fg).toBe(false);
  });
});

describe('stock movement is a receipt or an issue posting, not a balance change', () => {
  it('takes the latest posted receipt or recorded issue week on or before today', () => {
    expect(
      lastMovementDay({
        receiptDays: ['2026-09-01', '2026-09-10', '2027-01-01'],
        consumptionWeeks: [],
        today: '2026-09-20'
      })
    ).toBe('2026-09-10');
    expect(
      lastMovementDay({ receiptDays: [], consumptionWeeks: [], today: '2026-09-20' })
    ).toBeNull();
    // A week still running counts as today.
    expect(
      lastMovementDay({ receiptDays: [], consumptionWeeks: ['2026-09-14'], today: '2026-09-16' })
    ).toBe('2026-09-16');
  });

  it('a consumption record recorded on the material moves its days-since-movement to the recent past', async () => {
    const before = await find(LINE);
    expect((before?.daysSinceMovement ?? 99) >= 14).toBe(true);
    consumptionStore.add({
      materialCode: LINE.materialCode,
      week: sdcClock.now().slice(0, 10),
      qty: 5,
      unit: before?.uom ?? 'KG',
      source: 'manual',
      recordedAt: sdcClock.now(),
      actor: NO_PERSON
    });
    const after = await find(LINE);
    expect(after?.daysSinceMovement).toBeLessThan(14);
    expect(after?.conditions.fg).toBe(false);
  });
});

describe('FG data settings', () => {
  it('PIPO is a per-material flag in t_osipparam_set, default no', async () => {
    expect(await find(LINE)).toMatchObject({ pipo: false, pipoIsDefault: true });
    expect((await setParam('pipo', LINE, true)).status).not.toBe('failed');
    expect(osipParamStore.valueOf('pipo|RM-MYRST-7310')).toBe(true);
    expect(await find(LINE)).toMatchObject({ pipo: true, pipoIsDefault: false });
    expect((await setParam('pipo', LINE, 3)).status).toBe('failed');
  });

  it('Max PTI is per supplier × material; until set the cap is not computable', async () => {
    expect((await find(SMALL))?.maxPti).toBeNull();
    expect((await setParam('maxPti', SMALL, 200)).status).not.toBe('failed');
    expect(osipParamStore.valueOf('maxPti|sup-003|FR-EMIN-4420')).toBe(200);
    expect((await find(SMALL))?.maxPti).toBe(200);
    expect((await setParam('maxPti', SMALL, -1)).status).toBe('failed');
  });
});

describe('the execution through the real services', () => {
  it('schedules before the date, then the system executes FS only once: one call-off, fulfil-by from the grace end', async () => {
    await suggest({ ...LINE, option: 'fsOnly' });
    const before = await find(LINE);
    expect(before?.execution).toMatchObject({ status: 'scheduled', runsOn: before?.grace.dueDay });
    expect(before?.execution.plan?.callOffs[0]?.qty).toBe(10000); // the planner's preview
    expect(made()).toHaveLength(0);

    await setParam('grace', LINE, 0); // the grace period is over: the next command runs it
    const after = await find(LINE);
    expect(after?.execution.status).toBe('executed');
    expect(after?.execution.record).toMatchObject({
      actor: 'system',
      standing: 'noSupplierResponse'
    });
    expect(after?.decision?.history.map((h) => h.kind)).toEqual(['suggested', 'executed']);
    expect(made().map((c) => c.quantity)).toEqual([10000]);
    const c = made()[0];
    expect(c?.status).toBe('Confirmed');
    expect(c?.confirmation?.confirmedAt.slice(0, 10)).toBe(after?.grace.dueDay);
    expect(c?.needDate).toBe(fulfilmentWindow(after?.grace.dueDay ?? '', after?.leadTimeDays)?.by);
  });

  it('a second run does nothing (the idempotency key)', async () => {
    await suggest({ ...LINE, option: 'fsOnly' });
    await setParam('grace', LINE, 0);
    const count = made().length;
    expect(count).toBeGreaterThan(0);
    expect(await runDuePoOnHoldExecutions()).toBe(0);
    await find(LINE);
    const id = poOnHoldStore.all()[0]?.id ?? '';
    expect(executePoOnHold(id)).toBeNull();
    expect(made()).toHaveLength(count);
    expect(poOnHoldStore.executions()).toHaveLength(1);
    expect(
      poOnHoldStore.hasKey(`${id}|${poOnHoldStore.executions()[0]?.plan.callOffs[0]?.lineId}`)
    ).toBe(true);
  });

  it('the executed line stays on the panel with what it created, after the quantity left hold', async () => {
    await suggest({ ...LINE, option: 'fsOnly' });
    await setParam('grace', LINE, 0);
    const rows = (await reads.getPoOnHold(planner)).items.filter(
      (r) => r.supplierId === LINE.supplierId && r.materialCode === LINE.materialCode
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ closed: true, qty: 0 });
    expect(rows[0]?.execution.record?.callOffIds).toHaveLength(made().length);
  });

  it('PSC-6 BR-09: a rejected execution call-off does not restart the grace', async () => {
    await suggest({ ...LINE, option: 'fsOnly' });
    const episode = (await find(LINE))?.grace.firstDay;
    await setParam('grace', LINE, 0); // the call-off takes the whole quantity
    const co = made()[0];
    expect(co).toBeDefined();
    // A read while the quantity is out of hold drops the pair's recorded first day.
    expect((await find(LINE))?.execution.status).toBe('executed');
    // Days later the call-off is rejected: the planner returns it for confirmation
    // (a Confirmed call-off is not changed in place), the supplier rejects it.
    sdcClock.set('2026-09-10T12:00:00.000Z');
    const changed = await svc.dispatch(planner, {
      transitionId: 't_calloff_change',
      entity: 'callOff',
      entityId: co?.id,
      payload: { reason: 'Need it back: supplier cannot ship' }
    });
    expect(changed.status).not.toBe('failed');
    const rejected = await svc.dispatch(supplierSeat(LINE.supplierId), {
      transitionId: 't_calloff_reject',
      entity: 'callOff',
      entityId: co?.id,
      payload: { reason: 'Cannot ship this quantity' }
    });
    expect(rejected.status).not.toBe('failed');
    const back = await find(LINE);
    // The quantity returns to the open PO, and the grace keeps its episode's start:
    // had it restarted, firstDay would be the later hub day.
    expect(back?.qty).toBe(10000);
    expect(back?.grace.firstDay).toBe(episode);
    expect(back?.grace.firstDay).not.toBe('2026-09-10');
  });

  it('FG: absorbed up to the cap, recorded on the PO line, no call-off; the rest stays on hold', async () => {
    maxStockStore.append({
      supplierId: SMALL.supplierId,
      materialCode: SMALL.materialCode,
      quantity: 100,
      previous: null,
      setBy: NO_PERSON,
      setAt: sdcClock.now()
    });
    const probe = await find(SMALL);
    // cap = maxPti + min(100, sohSupplier) − sohPti; pick maxPti for a cap of 120 (< 300).
    const base = Math.min(100, probe?.sohSupplier ?? 0) - (probe?.sohPti ?? 0);
    await setParam('maxPti', SMALL, 120 - base);
    expect((await find(SMALL))?.cap).toBe(120);
    await suggest({ ...SMALL, option: 'fg' });
    await setParam('grace', SMALL, 0);
    const r = await find(SMALL);
    expect(r?.execution.status).toBe('executed');
    expect(made()).toHaveLength(0);
    expect(r?.execution.plan?.absorbed.reduce((n, a) => n + a.qty, 0)).toBe(120);
    expect(r?.qty).toBe(180); // 300 − 120: stays on hold, back to the planner
    expect(r?.closed).toBe(false);
    expect(r?.execution.plan?.stayOnHoldQty).toBe(180);
  });

  it('FG with no Max PTI waits: nothing is absorbed and it is not spent', async () => {
    await suggest({ ...SMALL, option: 'fg' });
    await setParam('grace', SMALL, 0);
    const r = await find(SMALL);
    expect(r?.execution.status).toBe('blocked');
    expect(poOnHoldStore.executions()).toHaveLength(0);
  });
});
