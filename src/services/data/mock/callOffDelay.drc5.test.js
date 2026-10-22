// ────────────────────────────────────────────────────────────────────────────
// DRC-5 (BL-191) — a call-off delayed by an LTP drop needs the supplier's
// approval, and the demand anticipation is adjusted only once it is given
// (SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10, [MoM 1B]).
//
// Dispatched through the REAL MockCommandService against the real stores, and
// read back through the REAL service: the planner's change with the coded
// reason `ltp-dropped` (BL-32 list `callOffChange`), the supplier's approve and
// reject on the existing confirm verb, the need date and the rolling demand
// anticipation moving only after approval, the audit trail (who proposed, who
// answered, when), the refusals by name, and tenancy.
//
// The subject is co-0006: sup-007 × PK-PETB-8801, 10,000 PCS confirmed for
// Thursday 3 Sep 2026, inside the hub's planning week W36 (Mon 31 Aug).
// ────────────────────────────────────────────────────────────────────────────

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService, commandAuditSink } from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import { callOffStore } from './stores/callOffStore';
import { asnStore } from './stores/asnStore';
import { purchaseOrderStore } from './stores/purchaseOrderStore';
import { demandAnticipationStore } from './stores/demandAnticipationStore';
/** @import { CallOff, QueryScope } from '../types' */
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { LTP_DROPPED_CODE, pendingDelay } from '../../transitions/callOffRules';
import {
  STARTER_REASON_CODES,
  builtInReasonLabels,
  reasonCodeStore
} from '../../transitions/reasonCodes';
import { openSupplyIndex } from '../../transitions/supplyBelowDemandRules';
import { sdcClock } from '../../sdc';
import { NO_PERSON } from '@context/noPerson';

const cmd = new MockCommandService();
const reads = new MockProcurementService();

/** @param {string} supplierId @returns {QueryScope} */
const supplier = (supplierId) => ({
  personaType: 'supplier',
  supplierId,
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON
});
const sup007 = supplier('sup-007');
const sup008 = supplier('sup-008');
/** @type {QueryScope} */
const planner = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['planning'],
  actor: NO_PERSON
};

const ID = 'co-0006';
const OLD = '2026-09-03';
const NEW = '2026-09-10';
const PAIR = { supplierId: 'sup-007', materialCode: 'PK-PETB-8801' };

/** @returns {CallOff} */
const row = () => /** @type {CallOff} */ (callOffStore.get(ID));

/**
 * @param {string} transitionId
 * @param {Record<string, unknown>} payload
 * @param {QueryScope} scope
 * @param {string} [entityId]
 */
const verb = (transitionId, payload, scope, entityId = ID) =>
  cmd.dispatch(scope, { transitionId, entity: 'callOff', entityId, payload });

/** @param {Record<string, unknown>} [extra] */
const propose = (extra = {}) =>
  verb(
    't_calloff_change',
    {
      reason: 'LTP for W36 dropped by 10,000',
      reasonCode: LTP_DROPPED_CODE,
      needDate: NEW,
      ...extra
    },
    planner
  );

/** @param {'approve' | 'reject'} delayAnswer */
const answer = (delayAnswer) => verb('t_calloff_confirm', { delayAnswer, comment: 'ok' }, sup007);

/** The planning week's figure for the pair, as the Demand anticipation page reads it. */
const daRow = async () => {
  const page = await reads.getDemandAnticipation(planner);
  const r = page.items.find(
    (x) => x.supplierId === PAIR.supplierId && x.materialCode === PAIR.materialCode
  );
  if (!r) throw new Error('no demand anticipation row for sup-007 × PK-PETB-8801');
  return r;
};

/** Open supply of the pair in the week of Monday `week` (CAP-12's own bucketing). */
const supplyIn = (/** @type {string} */ week) =>
  openSupplyIndex(callOffStore.all()).get(`${PAIR.supplierId}|${PAIR.materialCode}|${week}`) ?? 0;

beforeEach(() => {
  sdcClock.reset();
  callOffStore.reset();
  asnStore.reset();
  purchaseOrderStore.reset();
  demandAnticipationStore.reset();
  reasonCodeStore.reset();
  commandAuditSink.clear();
});
afterEach(() => sdcClock.reset());

describe('the subject (population control: a confirmed call-off in the planning week)', () => {
  it('co-0006 is sup-007 × PK-PETB-8801, 10,000 confirmed and accepted for 3 Sep (W36)', async () => {
    expect(row()).toMatchObject({
      ...PAIR,
      status: 'Confirmed',
      needDate: OLD,
      quantity: 10_000
    });
    expect(row().delays).toBeUndefined();
    // The planning week's call-offs for the pair include it (35,000 = co-0002 15,000
    // + co-0005 10,000 + co-0006 10,000).
    expect((await daRow()).today.callOff).toBe(35_000);
    expect(supplyIn('2026-08-31')).toBe(35_000);
    expect(supplyIn('2026-09-07')).toBe(38_000);
  });
});

describe('BL-32 — the coded reason "LTP dropped" (list callOffChange)', () => {
  it('is the starter code of the new list, with shipped labels in EN and ID', () => {
    expect(STARTER_REASON_CODES.callOffChange).toEqual([LTP_DROPPED_CODE]);
    expect(builtInReasonLabels('callOffChange', LTP_DROPPED_CODE)).toEqual({
      en: 'LTP dropped',
      id: 'LTP turun'
    });
  });

  it('a code the list does not offer is refused by name; a change with no code still works', async () => {
    const bad = await verb(
      't_calloff_change',
      { reason: 'x', reasonCode: 'weather', needDate: NEW },
      planner
    );
    expect(bad.status).toBe('failed');
    expect(bad.reason).toMatch(/REASON_CODE_UNKNOWN: 'weather'/);
    // Control: the uncoded change moves the need date at once, as it always did.
    const plain = await verb('t_calloff_change', { reason: 'moved', needDate: NEW }, planner);
    expect(plain.status).toBe('done');
    expect(row()).toMatchObject({ status: 'Awaiting Confirmation', needDate: NEW });
    expect(row().delays).toBeUndefined();
    expect(row().notes.slice(-1)[0]).toMatchObject({ action: 'change', text: 'moved' });
  });

  it('an added code records why and moves the date at once; a retired "LTP dropped" is refused', async () => {
    /** @param {string} code @param {string} en @param {string} id @param {boolean} active */
    const set = (code, en, id, active) =>
      cmd.dispatch(
        { ...planner, businessRoles: ['compliance'] },
        {
          transitionId: 't_reasoncode_set',
          entity: 'reasonCode',
          entityId: `callOffChange:${code}`,
          payload: { labelEn: en, labelId: id, active, setBy: NO_PERSON }
        }
      );
    const added = await set('supplier-request', 'Supplier request', 'Permintaan pemasok', true);
    expect(added.status, added.reason).toBe('done');
    // The last code cannot be retired; with a second one it can.
    const retire = await set(LTP_DROPPED_CODE, 'LTP dropped', 'LTP turun', false);
    expect(retire.status, retire.reason).toBe('done');
    const res = await propose();
    expect(res.reason).toMatch(/REASON_CODE_UNKNOWN: 'ltp-dropped'/);
    expect(row().delays).toBeUndefined();
    // The added code is no delay: the change applies at once, with its code noted.
    const coded = await propose({ reasonCode: 'supplier-request' });
    expect(coded.status).toBe('done');
    expect(row()).toMatchObject({ needDate: NEW, status: 'Awaiting Confirmation' });
    expect(row().delays).toBeUndefined();
    expect(row().notes.slice(-1)[0]).toMatchObject({ action: 'change', code: 'supplier-request' });
  });
});

describe('DRC-5 — propose: the need date does not move until the supplier answers', () => {
  it('records a pending delay with who proposed it and when; the need date and the DA stay', async () => {
    const res = await propose();
    expect(res.status).toBe('done');
    const c = row();
    expect(c.status).toBe('Awaiting Confirmation');
    expect(c.needDate).toBe(OLD);
    expect(c.confirmation).toBeUndefined();
    // What both sides agreed is kept (BL-66 (2)).
    expect(c.agreedDeliveries).toEqual([{ quantity: 10_000, date: OLD }]);
    expect(pendingDelay(c)).toEqual({
      fromNeedDate: OLD,
      toNeedDate: NEW,
      quantity: 10_000,
      reasonCode: LTP_DROPPED_CODE,
      reason: 'LTP for W36 dropped by 10,000',
      proposedAt: sdcClock.now(),
      proposedBy: NO_PERSON,
      answer: null
    });
    expect(c.notes.slice(-1)[0]).toMatchObject({ action: 'change', code: LTP_DROPPED_CODE });
    // Still released, still in its old week: the demand anticipation has not moved.
    expect((await daRow()).today.callOff).toBe(35_000);
    expect(supplyIn('2026-08-31')).toBe(35_000);
  });

  it('refusals, by name: not later, a resized call-off, no date, a call-off not confirmed', async () => {
    const earlier = await propose({ needDate: '2026-09-02' });
    expect(earlier.reason).toMatch(/DELAY_NOT_LATER/);
    const same = await propose({ needDate: OLD });
    expect(same.reason).toMatch(/DELAY_NOT_LATER/);
    const resized = await propose({ quantity: 9_000 });
    expect(resized.reason).toMatch(/DELAY_QUANTITY_CHANGED/);
    const noDate = await propose({ needDate: undefined });
    expect(noDate.reason).toMatch(/DELAY_NEED_DATE_REQUIRED/);
    // co-0011 is Rejected: a delay is proposed against what the supplier agreed.
    const rejected = await verb(
      't_calloff_change',
      { reason: 'LTP dropped', reasonCode: LTP_DROPPED_CODE, needDate: '2026-09-20' },
      planner,
      'co-0011'
    );
    expect(rejected.reason).toMatch(/DELAY_NOT_CONFIRMED/);
    // Nothing was recorded by any of them.
    expect(row().delays).toBeUndefined();
    expect(row().status).toBe('Confirmed');
    // Known-good beside them: the same call with a later date is accepted.
    expect((await propose()).status).toBe('done');
  });

  it('a supplier cannot propose it (calloff:plan is the planner’s)', async () => {
    const res = await verb(
      't_calloff_change',
      { reason: 'x', reasonCode: LTP_DROPPED_CODE, needDate: NEW },
      sup007
    );
    expect(res.status).toBe('failed');
    expect(row().delays).toBeUndefined();
  });
});

describe('DRC-5 — approve: the need date moves and the DA picks it up', () => {
  it('confirms the call-off on the new date; the delayed quantity leaves W36 and lands in W37', async () => {
    await propose();
    const before = await daRow();
    const res = await answer('approve');
    expect(res.status).toBe('done');
    const c = row();
    expect(c.status).toBe('Confirmed');
    expect(c.needDate).toBe(NEW);
    expect(c.confirmation).toMatchObject({
      kind: 'confirm',
      deliveries: [{ quantity: 10_000, date: NEW }],
      approval: 'auto'
    });
    expect(c.delays).toEqual([
      expect.objectContaining({
        fromNeedDate: OLD,
        toNeedDate: NEW,
        answer: 'approved',
        answeredAt: sdcClock.now(),
        answeredBy: NO_PERSON,
        comment: 'ok'
      })
    ]);
    expect(pendingDelay(c)).toBeNull();
    // The adjustment is free: `openSupplyIndex` buckets by need-date week.
    expect(supplyIn('2026-08-31')).toBe(25_000);
    expect(supplyIn('2026-09-07')).toBe(38_000 + 10_000);
    const after = await daRow();
    expect(after.today.callOff).toBe(before.today.callOff - 10_000);
    expect(after.today.remainder).toBe(before.today.remainder + 10_000);
  });
});

describe('DRC-5 — reject: the call-off stays on its old date', () => {
  it('confirms the call-off on the old date and records the rejection; the DA does not move', async () => {
    await propose();
    const before = await daRow();
    const res = await answer('reject');
    expect(res.status).toBe('done');
    const c = row();
    expect(c.status).toBe('Confirmed');
    expect(c.needDate).toBe(OLD);
    expect(c.confirmation).toMatchObject({
      deliveries: [{ quantity: 10_000, date: OLD }],
      approval: 'auto'
    });
    expect(c.delays?.[0]).toMatchObject({ answer: 'rejected', answeredBy: NO_PERSON });
    expect(supplyIn('2026-08-31')).toBe(35_000);
    expect((await daRow()).today.callOff).toBe(before.today.callOff);
  });
});

describe('DRC-5 — the supplier answers the delay, and only the delay', () => {
  it('while a delay is pending, the other answers are refused by name', async () => {
    await propose();
    const newDate = await verb(
      't_calloff_confirm_new_date',
      { confirmedDate: '2026-09-05' },
      sup007
    );
    expect(newDate.reason).toMatch(/DELAY_PENDING/);
    const plain = await verb('t_calloff_confirm', {}, sup007);
    expect(plain.reason).toMatch(/DELAY_PENDING/);
    const rejectAll = await verb('t_calloff_reject', { reason: 'no' }, sup007);
    expect(rejectAll.reason).toMatch(/DELAY_PENDING/);
    expect(row().status).toBe('Awaiting Confirmation');
    expect(pendingDelay(row())).not.toBeNull();
  });

  it('a delay answer with no delay pending is refused; a plain confirm still works', async () => {
    // co-0003 awaits an ordinary confirmation.
    const stray = await verb('t_calloff_confirm', { delayAnswer: 'approve' }, sup007, 'co-0003');
    expect(stray.reason).toMatch(/NO_DELAY_PENDING/);
    const ok = await verb('t_calloff_confirm', {}, sup007, 'co-0003');
    expect(ok.status).toBe('done');
  });
});

describe('DRC-5 — the supplier sees only its own call-offs', () => {
  it('another supplier neither reads the delay nor answers it', async () => {
    await propose();
    const own = await reads.getCallOffs(sup007);
    expect(own.items.find((c) => c.id === ID)?.delays?.[0]).toMatchObject({ toNeedDate: NEW });
    const other = await reads.getCallOffs(sup008);
    expect(other.items.map((c) => c.id)).not.toContain(ID);
    expect(other.items.every((c) => c.supplierId === 'sup-008')).toBe(true);
    // The dispatcher's tenancy gate throws SCOPE_DENIED (C1 return contract).
    await expect(verb('t_calloff_confirm', { delayAnswer: 'approve' }, sup008)).rejects.toThrow(
      /denied for scope/
    );
    expect(row().needDate).toBe(OLD);
    expect(pendingDelay(row())).not.toBeNull();
  });
});

describe('DRC-5 — the audit trail', () => {
  it('records the proposal and the answer as events, and on the call-off', async () => {
    await propose();
    await answer('approve');
    const change = commandAuditSink.byEvent('t_calloff_change');
    const confirm = commandAuditSink.byEvent('t_calloff_confirm');
    expect(change).toHaveLength(1);
    expect(confirm).toHaveLength(1);
    expect(change[0]).toMatchObject({ outcome: 'done' });
    expect(confirm[0]).toMatchObject({ outcome: 'done' });
    const [d] = row().delays ?? [];
    expect(d.proposedAt <= /** @type {string} */ (d.answeredAt)).toBe(true);
  });
});
