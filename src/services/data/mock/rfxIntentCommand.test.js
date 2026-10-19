// ────────────────────────────────────────────────────────────────────────────
// BL-132 (RFx UX S-13) — intent to respond, and a reasoned decline, on the RFI
// and the RFP, through the REAL dispatcher and read back through the REAL
// procurement service.
//
// ⚠️ EVERY REFUSAL IS PROBED BOTH WAYS: the known-bad refused BY NAME beside a
// known-good one field away that goes through. Each case runs for the RFI and
// for the RFP, so neither event type can lose a rule the other keeps.
// ────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService } from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import {
  resetRfxStores,
  rfiIntentStore,
  rfiResponseStore,
  rfpIntentStore,
  rfpResponseStore
} from './stores/rfxStores';
import { rfqStore } from './stores/rfqStore';
import { quotationStore } from './stores/quotationStore';
/** @import { QueryScope } from '../types' */
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { rfxNow } from './rfxReadModel';
import { sdcClock } from '../../sdc';
import { NO_PERSON } from '@context/noPerson';

const svc = new MockCommandService();
const reads = new MockProcurementService();

/**
 * @param {string} supplierId
 * @param {readonly import('../../transitions/businessRoles').SystemRoleId[]} [roles]
 * @returns {QueryScope}
 */
const supplier = (supplierId, roles = PERSONA_SYSTEM_ROLES.supplier) => ({
  personaType: 'supplier',
  supplierId,
  businessRoles: roles,
  actor: NO_PERSON
});
/** @type {QueryScope} */
const buyer = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer,
  actor: NO_PERSON
};
const sup007 = supplier('sup-007');
const sup015 = supplier('sup-015');

beforeEach(() => {
  resetRfxStores();
  rfqStore.reset();
  quotationStore.reset();
  sdcClock.reset();
});

const DAY_MS = 86_400_000;

/**
 * One event type, with the sample events each probe needs. sup-007 (the demo
 * supplier) is invited to all of them:
 *   · `open`       — Open, no response from sup-007
 *   · `draft`      — a Draft event (not Open)
 *   · `submitted`  — Open, sup-007's response already Submitted (`responseId`)
 * @typedef {{
 *   kind: 'rfi' | 'rfp';
 *   entity: 'rfiIntent' | 'rfpIntent';
 *   key: 'rfiId' | 'rfpId';
 *   open: string;
 *   draft: string;
 *   submitted: string;
 *   responseId: string;
 *   intents: typeof rfiIntentStore;
 * }} Kind
 */

/** @type {Kind[]} */
const KINDS = [
  {
    kind: 'rfi',
    entity: 'rfiIntent',
    key: 'rfiId',
    open: 'rfi-002',
    draft: 'rfi-003',
    submitted: 'rfi-001',
    responseId: 'rfi-resp-001',
    intents: rfiIntentStore
  },
  {
    kind: 'rfp',
    entity: 'rfpIntent',
    key: 'rfpId',
    open: 'rfp-003',
    draft: 'rfp-004',
    submitted: 'rfp-001',
    responseId: 'rfp-resp-001',
    intents: rfpIntentStore
  }
];

/**
 * @param {Kind} k
 * @param {QueryScope} scope
 * @param {'respond' | 'decline' | 'withdraw'} verb
 * @param {Record<string, unknown>} payload
 * @param {string} [entityId]
 */
const intent = (k, scope, verb, payload, entityId) =>
  svc.dispatch(scope, {
    transitionId: `t_${k.kind}intent_${verb}`,
    entity: k.entity,
    payload,
    ...(entityId ? { entityId } : {})
  });

/**
 * @param {Kind} k
 * @param {string} eventId
 * @param {Record<string, unknown>} [extra]
 */
const ev = (k, eventId, extra = {}) => ({ [k.key]: eventId, supplierId: 'sup-007', ...extra });

const DECLINE = { reason: 'noCapacity', text: 'Our line is full until next quarter.' };

describe('POPULATION — the seeded intents the rules are probed against', () => {
  it('sup-013 said it will respond on rfi-001; sup-015 declined rfp-003; sup-007 has said nothing', () => {
    expect(rfiIntentStore.all().map((r) => [r.eventId, r.supplierId, r.intent])).toEqual([
      ['rfi-001', 'sup-013', 'respond']
    ]);
    expect(
      rfpIntentStore.all().map((r) => [r.eventId, r.supplierId, r.intent === 'decline' && r.reason])
    ).toEqual([['rfp-003', 'sup-015', 'notOurProduct']]);
    expect(rfiResponseStore.get('rfi-resp-001')).toMatchObject({
      supplierId: 'sup-007',
      status: 'Submitted'
    });
    expect(rfpResponseStore.get('rfp-resp-001')).toMatchObject({
      supplierId: 'sup-007',
      status: 'Submitted'
    });
  });
});

describe.each(KINDS)('$entity — "I will respond" or a reasoned decline', (k) => {
  it('respond goes through, recorded with its time, and the buyer reads it', async () => {
    const res = await intent(k, sup007, 'respond', ev(k, k.open));
    expect(res.status, res.reason).toBe('done');
    const stored = k.intents.get(String(res.entityId));
    expect(stored).toMatchObject({ eventId: k.open, supplierId: 'sup-007', intent: 'respond' });
    expect(stored?.at).toBe(rfxNow());
  });

  it('INTENT_ALREADY_STATED — a second intent is refused; the first passes', async () => {
    const first = await intent(k, sup007, 'respond', ev(k, k.open));
    expect(first.status).toBe('done');
    const again = await intent(k, sup007, 'decline', ev(k, k.open, DECLINE));
    expect(again.status).toBe('failed');
    expect(again.reason).toMatch(/INTENT_ALREADY_STATED/);
  });

  it('DECLINE_REASON_UNKNOWN / DECLINE_TEXT_MISSING — refused by name; the sound decline passes', async () => {
    const unknown = await intent(
      k,
      sup007,
      'decline',
      ev(k, k.open, { ...DECLINE, reason: 'tooBusy' })
    );
    expect(unknown.reason).toMatch(/DECLINE_REASON_UNKNOWN/);
    const blank = await intent(k, sup007, 'decline', ev(k, k.open, { ...DECLINE, text: '   ' }));
    expect(blank.reason).toMatch(/DECLINE_TEXT_MISSING/);
    const good = await intent(k, sup007, 'decline', ev(k, k.open, DECLINE));
    expect(good.status, good.reason).toBe('done');
    expect(k.intents.get(String(good.entityId))).toMatchObject({
      intent: 'decline',
      reason: 'noCapacity',
      text: DECLINE.text
    });
  });

  it('EVENT_NOT_OPEN — a Draft event is refused; the Open one passes', async () => {
    const bad = await intent(k, sup007, 'respond', ev(k, k.draft));
    expect(bad.reason).toMatch(/EVENT_NOT_OPEN/);
    const good = await intent(k, sup007, 'respond', ev(k, k.open));
    expect(good.status).toBe('done');
  });

  it('PAST_DEADLINE — after the deadline the same act is refused', async () => {
    sdcClock.set(new Date(Date.parse(rfxNow()) + 40 * DAY_MS).toISOString());
    const bad = await intent(k, sup007, 'respond', ev(k, k.open));
    expect(bad.reason).toMatch(/PAST_DEADLINE/);
    sdcClock.reset();
    const good = await intent(k, sup007, 'respond', ev(k, k.open));
    expect(good.status).toBe('done');
  });

  it('RESPONSE_ALREADY_SENT — a supplier with a submitted response cannot decline; one without can', async () => {
    const bad = await intent(k, sup007, 'decline', ev(k, k.submitted, DECLINE));
    expect(bad.reason).toMatch(/RESPONSE_ALREADY_SENT/);
    const good = await intent(k, sup007, 'decline', ev(k, k.open, DECLINE));
    expect(good.status).toBe('done');
  });

  it('withdraw turns "respond" into a decline, keeping when it said yes; refused once the response is sent', async () => {
    const said = await intent(k, sup007, 'respond', ev(k, k.open));
    const respondedAt = k.intents.get(String(said.entityId))?.at;
    const w = await intent(k, sup007, 'withdraw', DECLINE, String(said.entityId));
    expect(w.status, w.reason).toBe('done');
    expect(k.intents.get(String(said.entityId))).toMatchObject({
      intent: 'decline',
      reason: 'noCapacity',
      respondedAt
    });
    // The submitted response: "respond" is allowed, its withdraw is not.
    const sent = await intent(k, sup007, 'respond', ev(k, k.submitted));
    expect(sent.status).toBe('done');
    const late = await intent(k, sup007, 'withdraw', DECLINE, String(sent.entityId));
    expect(late.reason).toMatch(/RESPONSE_ALREADY_SENT/);
  });

  it('a decline is final: no withdraw from Declined', async () => {
    const d = await intent(k, sup007, 'decline', ev(k, k.open, DECLINE));
    const again = await intent(k, sup007, 'withdraw', DECLINE, String(d.entityId));
    expect(again.status).toBe('failed');
    expect(k.intents.get(String(d.entityId))?.intent).toBe('decline');
  });

  it('an uninvited supplier, or one naming another supplier, is refused at scope', async () => {
    await expect(
      intent(k, supplier('sup-002'), 'respond', { [k.key]: k.open, supplierId: 'sup-002' })
    ).rejects.toMatchObject({ code: 'SCOPE_DENIED' });
    await expect(intent(k, sup015, 'respond', ev(k, k.open))).rejects.toMatchObject({
      code: 'SCOPE_DENIED'
    });
  });

  it('only the commercial seat declares intent; the buyer and a fulfilment seat are refused at role', async () => {
    const fulfilment = await intent(
      k,
      supplier('sup-007', ['fulfilment']),
      'respond',
      ev(k, k.open)
    );
    expect(fulfilment.reason).toMatch(/ROLE_NOT_PERMITTED/);
    const commercial = await intent(
      k,
      supplier('sup-007', ['commercial']),
      'respond',
      ev(k, k.open)
    );
    expect(commercial.status).toBe('done');
  });
});

// ── INTENT_DECLINED on the response verbs ───────────────────────────────────

describe('INTENT_DECLINED — a declined supplier cannot save, submit or revise (RFI)', () => {
  /** @param {Record<string, unknown>} [extra] */
  const save = (extra = {}) =>
    svc.dispatch(sup007, {
      transitionId: 't_rfiresponse_save',
      entity: 'rfiResponse',
      payload: { rfiId: 'rfi-002', supplierId: 'sup-007', answers: [], ...extra }
    });
  /** @param {string} id */
  const submit = (id) =>
    svc.dispatch(sup007, {
      transitionId: 't_rfiresponse_submit',
      entity: 'rfiResponse',
      entityId: id,
      payload: {}
    });

  it('save: refused after a decline, passes after "I will respond"', async () => {
    await intent(KINDS[0], sup007, 'decline', ev(KINDS[0], 'rfi-002', DECLINE));
    const bad = await save();
    expect(bad.reason).toMatch(/INTENT_DECLINED/);
    resetRfxStores();
    await intent(KINDS[0], sup007, 'respond', ev(KINDS[0], 'rfi-002'));
    const good = await save();
    expect(good.status, good.reason).toBe('done');
  });

  it('submit: a draft kept from before the decline is refused by name; with "respond" the next rule speaks', async () => {
    const draft = await save();
    await intent(KINDS[0], sup007, 'decline', ev(KINDS[0], 'rfi-002', DECLINE));
    const bad = await submit(String(draft.entityId));
    expect(bad.reason).toMatch(/INTENT_DECLINED/);
    resetRfxStores();
    const draft2 = await save();
    await intent(KINDS[0], sup007, 'respond', ev(KINDS[0], 'rfi-002'));
    const next = await submit(String(draft2.entityId));
    expect(next.reason).toMatch(/REQUIRED_UNANSWERED/);
    expect(next.reason).not.toMatch(/INTENT_DECLINED/);
  });

  it('revise: a submitted response under a decline is refused; without one it goes through', async () => {
    const answers = [...(rfiResponseStore.get('rfi-resp-001')?.answers ?? [])];
    /** @param {string} id */
    const revise = (id) =>
      svc.dispatch(sup007, {
        transitionId: 't_rfiresponse_revise',
        entity: 'rfiResponse',
        entityId: id,
        payload: { answers }
      });
    const good = await revise('rfi-resp-001');
    expect(good.status, good.reason).toBe('done');
    // The verbs cannot reach this state (RESPONSE_ALREADY_SENT); a hand-made
    // row stands in for it, so the guard is probed where it sits.
    rfiIntentStore.add({
      id: 'rfii-9999',
      eventId: 'rfi-001',
      supplierId: 'sup-007',
      intent: 'decline',
      reason: 'noCapacity',
      text: DECLINE.text,
      at: rfxNow()
    });
    const bad = await revise('rfi-resp-001');
    expect(bad.reason).toMatch(/INTENT_DECLINED/);
  });
});

describe('INTENT_DECLINED — a declined supplier cannot save, submit or revise (RFP)', () => {
  /** @param {Record<string, unknown>} [extra] */
  const save = (extra = {}) =>
    svc.dispatch(sup007, {
      transitionId: 't_rfpresponse_save',
      entity: 'rfpResponse',
      payload: { rfpId: 'rfp-003', supplierId: 'sup-007', acceptConfidentiality: true, ...extra }
    });
  /** @param {string} id */
  const submit = (id) =>
    svc.dispatch(sup007, {
      transitionId: 't_rfpresponse_submit',
      entity: 'rfpResponse',
      entityId: id,
      payload: {}
    });

  it('save: refused after a decline, passes after "I will respond"', async () => {
    await intent(KINDS[1], sup007, 'decline', ev(KINDS[1], 'rfp-003', DECLINE));
    const bad = await save();
    expect(bad.reason).toMatch(/INTENT_DECLINED/);
    resetRfxStores();
    await intent(KINDS[1], sup007, 'respond', ev(KINDS[1], 'rfp-003'));
    const good = await save();
    expect(good.status, good.reason).toBe('done');
  });

  it('submit: a draft kept from before the decline is refused by name; with "respond" the next rule speaks', async () => {
    const draft = await save();
    await intent(KINDS[1], sup007, 'decline', ev(KINDS[1], 'rfp-003', DECLINE));
    const bad = await submit(String(draft.entityId));
    expect(bad.reason).toMatch(/INTENT_DECLINED/);
    resetRfxStores();
    const draft2 = await save();
    await intent(KINDS[1], sup007, 'respond', ev(KINDS[1], 'rfp-003'));
    const next = await submit(String(draft2.entityId));
    expect(next.status).toBe('failed');
    expect(next.reason).not.toMatch(/INTENT_DECLINED/);
  });

  it('revise: a submitted proposal under a decline is refused; without one the guard passes', async () => {
    const stored = rfpResponseStore.get('rfp-resp-001');
    /** @param {string} id */
    const revise = (id) =>
      svc.dispatch(sup007, {
        transitionId: 't_rfpresponse_revise',
        entity: 'rfpResponse',
        entityId: id,
        payload: { answers: [...(stored?.answers ?? [])] }
      });
    const good = await revise('rfp-resp-001');
    expect(String(good.reason ?? '')).not.toMatch(/INTENT_DECLINED/);
    rfpIntentStore.add({
      id: 'rfpi-9999',
      eventId: 'rfp-001',
      supplierId: 'sup-007',
      intent: 'decline',
      reason: 'noCapacity',
      text: DECLINE.text,
      at: rfxNow()
    });
    const bad = await revise('rfp-resp-001');
    expect(bad.reason).toMatch(/INTENT_DECLINED/);
  });
});

// ── RFX-R4 — a supplier reads only its own intent ───────────────────────────

describe("the read: the buyer reads every invitee's intent, a supplier only its own", () => {
  it("rfp-003: the buyer sees sup-015's decline with reason and words; sup-007 does not", async () => {
    const buyerRow = (await reads.getRfpEvents(buyer)).items
      .find((e) => e.id === 'rfp-003')
      ?.invitedSuppliers.find((i) => i.supplierId === 'sup-015');
    expect(buyerRow?.intent).toMatchObject({
      intent: 'decline',
      reason: 'notOurProduct',
      text: expect.stringContaining('do not develop formulas')
    });
    const mine = (await reads.getRfpEvents(sup007)).items.find((e) => e.id === 'rfp-003');
    expect(mine?.invitedSuppliers.map((i) => i.supplierId)).toEqual(['sup-007']);
    expect(mine?.invitedSuppliers[0]?.intent).toBeNull();
    // KNOWN-GOOD — sup-015 reads its own decline.
    const own = (await reads.getRfpEvents(sup015)).items.find((e) => e.id === 'rfp-003');
    expect(own?.invitedSuppliers.map((i) => [i.supplierId, i.intent?.intent])).toEqual([
      ['sup-015', 'decline']
    ]);
  });

  it('rfi-001: sup-013\'s "respond" reaches the buyer and sup-013, never sup-007', async () => {
    const buyerRows = (await reads.getRfiEvents(buyer)).items.find(
      (e) => e.id === 'rfi-001'
    )?.invitedSuppliers;
    expect(buyerRows?.find((i) => i.supplierId === 'sup-013')?.intent?.intent).toBe('respond');
    const sup007Rows = (await reads.getRfiEvents(sup007)).items.find(
      (e) => e.id === 'rfi-001'
    )?.invitedSuppliers;
    expect(sup007Rows?.map((i) => i.supplierId)).toEqual(['sup-007']);
    expect(JSON.stringify(sup007Rows)).not.toContain('rfii-0001');
  });
});
