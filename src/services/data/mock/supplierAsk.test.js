// ────────────────────────────────────────────────────────────────────────────
// INV-D9 · "Ask supplier" — the hub ask, dispatched through the REAL
// MockCommandService and read back through the REAL procurement service.
//
//   · legal transitions: raise → answer → close; raise → withdraw; nothing
//     leaves Closed or Withdrawn.
//   · every refusal code fires once and passes once (RFX-R8).
//   · scope: supplier B can neither read nor answer supplier A's ask; the
//     buyer (control) reads both.
//   · the store: the history is appended, never overwritten; sample rows.
// ────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService, commandAuditSink } from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import { supplierAskStore } from './stores/supplierAskStore';
import { isAssignedMaterial } from './inventoryReadModel';
/** @import { QueryScope } from '../types' */
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { addDays, dayOf } from '../../transitions/inventoryRules';
import {
  supplierAskAnswerRefusal,
  supplierAskRaiseRefusal,
  supplierAskRefusalOf
} from '../../transitions/supplierAskRules';
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
const sup7 = supplierSeat('sup-007');
const sup2 = supplierSeat('sup-002');

const today = () => dayOf(sdcClock.now());

/** A valid raise on a material with no sample ask (PK-PETB-8801). */
const RAISE = Object.freeze({
  supplierId: 'sup-007',
  materialCode: 'PK-PETB-8801',
  topic: 'stockFigures',
  question: 'Please send this week’s stock figure.'
});

/**
 * @param {Record<string, unknown>} payload
 * @param {QueryScope} [scope]
 */
const raise = (payload, scope = planner) =>
  svc.dispatch(scope, { transitionId: 't_supplierask_raise', entity: 'supplierAsk', payload });

/**
 * @param {'t_supplierask_answer' | 't_supplierask_close' | 't_supplierask_withdraw'} transitionId
 * @param {string} entityId
 * @param {QueryScope} scope
 * @param {Record<string, unknown>} [payload]
 */
const act = (transitionId, entityId, scope, payload = {}) =>
  svc.dispatch(scope, { transitionId, entity: 'supplierAsk', entityId, payload });

/** @param {string | undefined} reason */
const codeOf = (reason) => reason?.split(':')[2];

beforeEach(() => {
  supplierAskStore.reset();
  commandAuditSink.clear();
  sdcClock.reset();
});

describe('the fixture cases this file rests on (population control)', () => {
  it('the store opens with the two sample asks to sup-007, both Open, both marked sample', () => {
    const rows = supplierAskStore.all();
    expect(rows.map((r) => [r.id, r.supplierId, r.state, r.sample])).toEqual([
      ['ask-0001', 'sup-007', 'Open', true],
      ['ask-0002', 'sup-007', 'Open', true]
    ]);
    expect(rows[0]?.materialCode).toBe('PK-PETB-8802');
    expect(rows[1]?.planningGroupId).toBe('pg-MG-20');
    expect(isAssignedMaterial('sup-007', 'PK-PETB-8801')).toBe(true);
    expect(isAssignedMaterial('sup-007', 'RM-EMUL-3310')).toBe(false);
  });
});

describe('legal transitions', () => {
  it('raise → answer → close, with every step appended to the history', async () => {
    const r = await raise({ ...RAISE, dueDate: addDays(today(), 3) });
    expect(r.status).toBe('done');
    const id = /** @type {string} */ (r.entityId);
    expect(supplierAskStore.get(id)?.state).toBe('Open');

    const a = await act('t_supplierask_answer', id, sup7, {
      answer: 'Sent on Thursday.',
      answerDate: addDays(today(), 1)
    });
    expect(a.status).toBe('done');
    const c = await act('t_supplierask_close', id, planner);
    expect(c.status).toBe('done');

    const row = supplierAskStore.get(id);
    expect(row?.state).toBe('Closed');
    expect(row?.history.map((h) => h.kind)).toEqual(['raised', 'answered', 'closed']);
    // RFX-R3 — the question stays as raised; the answer is its own step.
    expect(row?.history[0]?.text).toBe(RAISE.question);
    expect(row?.history[1]).toMatchObject({ text: 'Sent on Thursday.', date: addDays(today(), 1) });
    expect(row?.question).toBe(RAISE.question);
  });

  it('raise → withdraw while Open', async () => {
    const r = await raise(RAISE);
    const w = await act('t_supplierask_withdraw', /** @type {string} */ (r.entityId), planner);
    expect(w.status).toBe('done');
    expect(supplierAskStore.get(/** @type {string} */ (r.entityId))?.state).toBe('Withdrawn');
  });

  it('a capacity ask names the planning group and week', async () => {
    const r = await raise({
      supplierId: 'sup-007',
      planningGroupId: 'pg-MG-20',
      week: '2026-09-21',
      topic: 'capacityGap',
      question: 'Can you add capacity this week?'
    });
    expect(r.status).toBe('done');
    expect(supplierAskStore.get(/** @type {string} */ (r.entityId))).toMatchObject({
      planningGroupId: 'pg-MG-20',
      week: '2026-09-21',
      topic: 'capacityGap'
    });
  });

  it('nothing leaves Closed or Withdrawn: an answer on a closed ask is refused, an answered ask cannot be withdrawn', async () => {
    const r = await raise(RAISE);
    const id = /** @type {string} */ (r.entityId);
    await act('t_supplierask_answer', id, sup7, { answer: 'Yes.' });
    const w = await act('t_supplierask_withdraw', id, planner);
    expect(w.status).toBe('failed');
    expect(w.reason?.split(':')[0]).toBe('ILLEGAL_TRANSITION');
    await act('t_supplierask_close', id, planner);
    const again = await act('t_supplierask_answer', id, sup7, { answer: 'Again.' });
    expect(again.status).toBe('failed');
    expect(again.reason?.split(':')[0]).toBe('ILLEGAL_TRANSITION');
    expect(supplierAskStore.get(id)?.history.map((h) => h.kind)).toEqual([
      'raised',
      'answered',
      'closed'
    ]);
  });

  it('roles: a supplier cannot raise or close; PTI cannot answer', async () => {
    const supRaise = await raise(RAISE, sup7);
    expect(supRaise.reason?.split(':')[0]).toBe('ROLE_NOT_PERMITTED');
    const ptiAnswer = await act('t_supplierask_answer', 'ask-0001', planner, { answer: 'x' });
    expect(ptiAnswer.reason?.split(':')[0]).toBe('ROLE_NOT_PERMITTED');
    const supWithdraw = await act('t_supplierask_withdraw', 'ask-0001', sup7);
    expect(supWithdraw.reason?.split(':')[0]).toBe('ROLE_NOT_PERMITTED');
  });

  it('every outcome is in the audit trail: the accepted one and the refused one', async () => {
    await raise(RAISE);
    await raise({ ...RAISE, question: '' });
    expect(commandAuditSink.byEvent('t_supplierask_raise').map((e) => e.outcome)).toEqual([
      'done',
      'failed'
    ]);
  });
});

describe('refusals — each code fires once and passes once (CODE: sentence)', () => {
  /** @type {[string, Record<string, unknown>, Record<string, unknown>][]} */
  const RAISE_CASES = [
    ['TOPIC_UNKNOWN', { topic: 'price' }, { topic: 'other' }],
    [
      'SUBJECT_REQUIRED',
      { materialCode: undefined },
      { materialCode: undefined, planningGroupId: 'pg-MG-20', week: '2026-09-28' }
    ],
    ['NOT_SUPPLIED', { materialCode: 'RM-EMUL-3310' }, { materialCode: 'PK-PETB-8801' }],
    ['QUESTION_REQUIRED', { question: '   ' }, { question: 'When?' }],
    ['TEXT_TOO_LONG', { question: 'x'.repeat(1001) }, { question: 'x'.repeat(1000) }],
    ['DUE_DATE_INVALID', { dueDate: '2026-08-01' }, { dueDate: '2026-09-30' }],
    ['ASK_ALREADY_OPEN', { materialCode: 'PK-PETB-8802' }, { materialCode: 'PK-PETB-8801' }]
  ];
  for (const [code, failing, passing] of RAISE_CASES) {
    it(`raise · ${code}: fires, and the same raise without the fault passes`, async () => {
      const bad = await raise({ ...RAISE, ...failing });
      expect(bad.status).toBe('failed');
      expect(bad.reason).toMatch(new RegExp(`^POLICY_REJECTED:supplier_ask_raisable:${code}: \\S`));
      expect(supplierAskRefusalOf(bad.reason)).toBe(code);
      const good = await raise({ ...RAISE, ...passing });
      expect(good.status, good.reason).toBe('done');
    });
  }

  /** @type {[string, Record<string, unknown>, Record<string, unknown>][]} */
  const ANSWER_CASES = [
    ['ANSWER_REQUIRED', { answer: ' ' }, { answer: 'Production starts 4 Sept.' }],
    ['TEXT_TOO_LONG', { answer: 'y'.repeat(1001) }, { answer: 'y'.repeat(1000) }],
    [
      'ANSWER_DATE_INVALID',
      { answer: 'On this date.', answerDate: '2026-02-30' },
      { answer: 'On this date.', answerDate: '2026-09-04' }
    ]
  ];
  for (const [code, failing, passing] of ANSWER_CASES) {
    it(`answer · ${code}: fires, and the answer without the fault passes`, async () => {
      const bad = await act('t_supplierask_answer', 'ask-0001', sup7, failing);
      expect(codeOf(bad.reason)).toBe(code);
      expect(supplierAskStore.get('ask-0001')?.state).toBe('Open');
      const good = await act('t_supplierask_answer', 'ask-0001', sup7, passing);
      expect(good.status, good.reason).toBe('done');
    });
  }

  it('the page pre-checks call the same rules: a clean form is null, a fault is its code', () => {
    const base = {
      topic: 'other',
      subject: { materialCode: 'PK-PETB-8801' },
      question: 'When?',
      today: '2026-08-31',
      supplied: true,
      openOnSubject: false
    };
    expect(supplierAskRaiseRefusal(base)).toBeNull();
    expect(supplierAskRaiseRefusal({ ...base, question: '' })).toBe('QUESTION_REQUIRED');
    expect(supplierAskAnswerRefusal({ answer: 'Yes' })).toBeNull();
    expect(supplierAskAnswerRefusal({ answer: '' })).toBe('ANSWER_REQUIRED');
  });

  it('nobody can ask a supplier that does not exist (creation owner)', async () => {
    await expect(raise({ ...RAISE, supplierId: 'sup-999' })).rejects.toMatchObject({
      code: 'SCOPE_DENIED'
    });
    await expect(raise(RAISE)).resolves.toMatchObject({ status: 'done' });
  });
});

describe('scope — a supplier reads and answers only its own asks', () => {
  it('supplier B (sup-002) reads none of sup-007’s asks; sup-007 reads its own; the buyer reads all', async () => {
    await raise({
      supplierId: 'sup-002',
      materialCode: 'RM-EMUL-3310',
      topic: 'other',
      question: 'Any delay?'
    });
    const b = await reads.getSupplierAsks(sup2);
    const a = await reads.getSupplierAsks(sup7);
    const buyer = await reads.getSupplierAsks(planner);
    expect(b.items.map((x) => x.supplierId)).toEqual(['sup-002']);
    expect(a.items.map((x) => x.id)).toEqual(['ask-0002', 'ask-0001']);
    expect(buyer.items.map((x) => x.supplierId).sort()).toEqual(['sup-002', 'sup-007', 'sup-007']);
  });

  it('supplier B cannot answer supplier A’s ask (SCOPE_DENIED); A can (control)', async () => {
    await expect(
      act('t_supplierask_answer', 'ask-0001', sup2, { answer: 'Not mine.' })
    ).rejects.toMatchObject({ code: 'SCOPE_DENIED' });
    expect(supplierAskStore.get('ask-0001')?.state).toBe('Open');
    const own = await act('t_supplierask_answer', 'ask-0001', sup7, { answer: 'Mine.' });
    expect(own.status).toBe('done');
  });
});
