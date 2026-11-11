// ────────────────────────────────────────────────────────────────────────────
// SAP interface rules (REQ-E07-08; CR-20) — the pure derivations.
//
// The retry rule is the load-bearing one and it is probed BOTH ways: a
// transport failure must be offered a retry AND a business refusal must not.
// The data-age threshold is asserted ON the 15-minute target and one minute
// either side, because that is the number the banner is read against.
// ────────────────────────────────────────────────────────────────────────────

import { describe, expect, it, beforeEach } from 'vitest';
/** @import { TransitionEvent } from '../transitions/events' */
/** @import { QueryScope } from './types' */
/** @import { SapFailedMessage } from './sapInterfaceRules' */
import {
  SAP_LATENCY_TARGET_MINUTES,
  SAP_OBJECTS,
  SAP_OBJECT_DIRECTION,
  SAP_PAGE_OBJECT,
  failuresFromEvents,
  isRetryable,
  newestInstant,
  objectForEntity,
  sapAgeParts,
  sapDataAge,
  sapMonitor
} from './sapInterfaceRules';
import { sapMessageStore, SAP_INBOUND_SEED } from './mock/stores/sapMessageStore';

const NOW = '2026-09-30T12:00:00.000Z';
/** @type {QueryScope} */
const SCOPE = { personaType: 'buyer', supplierId: null };

/**
 * @param {Partial<SapFailedMessage>} [over]
 * @returns {SapFailedMessage}
 */
const message = (over = {}) => ({
  id: 'm1',
  object: 'goodsReceipt',
  fault: 'TRANSPORT',
  errorText: 'SAP did not answer in time.',
  correlationId: 'SAP-1',
  timestamp: '2026-09-30T11:00:00.000Z',
  ...over
});

/**
 * @param {Partial<TransitionEvent>} [over]
 * @returns {TransitionEvent}
 */
const event = (over = {}) => ({
  event: 't_gr_post',
  actor: 'buyer:all',
  scope: SCOPE,
  correlationId: 'cmd-1',
  outcome: 'failed',
  reason: 'TRANSPORT:UPSTREAM',
  ts: '2026-09-30T11:30:00.000Z',
  ...over
});

/** @param {string} id */
const entityOf = (id) =>
  id.startsWith('t_gr_') ? 'goodsReceipt' : id.startsWith('t_invoice_') ? 'invoice' : null;

describe('REQ-E07-08 BR-01 / BR-02 · the objects and their direction', () => {
  it('the six objects the requirement names, each travelling the way it says', () => {
    expect([...SAP_OBJECTS]).toEqual([
      'umbrellaPo',
      'goodsReceipt',
      'invoiceStatus',
      'poResponse',
      'inboundDelivery',
      'invoiceOut'
    ]);
    expect(SAP_OBJECT_DIRECTION.umbrellaPo).toBe('inbound');
    expect(SAP_OBJECT_DIRECTION.goodsReceipt).toBe('inbound');
    expect(SAP_OBJECT_DIRECTION.invoiceStatus).toBe('inbound');
    expect(SAP_OBJECT_DIRECTION.poResponse).toBe('outbound');
    expect(SAP_OBJECT_DIRECTION.inboundDelivery).toBe('outbound');
    expect(SAP_OBJECT_DIRECTION.invoiceOut).toBe('outbound');
  });

  it('every screen that depends on SAP data names an object that exists', () => {
    for (const object of Object.values(SAP_PAGE_OBJECT)) {
      expect(SAP_OBJECTS).toContain(object);
    }
  });

  it('a settle failure is filed against the object its ENTITY belongs to', () => {
    expect(objectForEntity('goodsReceipt')).toBe('goodsReceipt');
    expect(objectForEntity('invoice')).toBe('invoiceOut');
    expect(objectForEntity('purchaseOrder')).toBeNull(); // not a SAP-boundary verb
  });
});

describe('CR-20 · only a transport failure is retryable', () => {
  it('a transport failure IS offered a retry; a business refusal is NOT', () => {
    expect(isRetryable(message({ fault: 'TRANSPORT' }))).toBe(true);
    expect(isRetryable(message({ fault: 'REFUSED' }))).toBe(false);
  });

  it('a failure that did not come through the governed channel is not retried either', () => {
    expect(isRetryable(message({ fault: 'UNGOVERNED' }))).toBe(false);
  });

  it('the monitor counts the retryable ones separately from the total', () => {
    const [gr] = sapMonitor({
      lastSeen: {},
      messages: [message({ id: 'a', fault: 'TRANSPORT' }), message({ id: 'b', fault: 'REFUSED' })]
    }).filter((o) => o.object === 'goodsReceipt');
    expect(gr.failureCount).toBe(2);
    expect(gr.retryableCount).toBe(1);
  });
});

describe('failures recovered from the command trail', () => {
  it('a failed settle becomes a message; a SUCCEEDED command does not', () => {
    expect(failuresFromEvents([event()], entityOf, NOW)).toHaveLength(1);
    expect(
      failuresFromEvents([event({ outcome: 'done', reason: undefined })], entityOf, NOW)
    ).toHaveLength(0);
  });

  it('A RETRY THAT SUCCEEDS CLEARS THE MESSAGE — the `done` under the same reference wins', () => {
    const failed = event();
    const settled = event({ outcome: 'done', reason: undefined, ts: '2026-09-30T11:45:00.000Z' });
    expect(failuresFromEvents([failed], entityOf, NOW)).toHaveLength(1);
    expect(failuresFromEvents([failed, settled], entityOf, NOW)).toHaveLength(0);
  });

  it('a refusal that is not a settle fault is not a SAP message at all', () => {
    expect(failuresFromEvents([event({ reason: 'NOT_LEGAL' })], entityOf, NOW)).toHaveLength(0);
  });

  it('a failure on a verb that never crosses the SAP boundary is not filed', () => {
    expect(failuresFromEvents([event({ event: 't_po_confirm' })], entityOf, NOW)).toHaveLength(0);
  });

  it('the recovered message carries the reference a retry needs', () => {
    const [m] = failuresFromEvents([event()], entityOf, NOW);
    expect(m.settleCorrelationId).toBe('cmd-1');
    expect(m.fault).toBe('TRANSPORT');
    expect(isRetryable(m)).toBe(true);
  });

  it("BL-141 — the row is stamped from the hub clock; the event's wall-clock ts is not shown", () => {
    const wall = '2031-01-01T00:00:00.000Z';
    const [m] = failuresFromEvents([event({ ts: wall })], entityOf, NOW);
    expect(m.timestamp).toBe(NOW);
    expect(m.timestamp).not.toBe(wall);
  });

  it('BL-141 — rows stay newest event first when every stamp is the same hub instant', () => {
    const older = event({ correlationId: 'cmd-old', ts: '2031-01-01T00:00:00.000Z' });
    const newer = event({ correlationId: 'cmd-new', ts: '2031-01-02T00:00:00.000Z' });
    const rows = sapMonitor({
      lastSeen: {},
      messages: failuresFromEvents([older, newer], entityOf, NOW)
    }).find((o) => o.object === 'goodsReceipt');
    expect(rows?.failures.map((f) => f.correlationId)).toEqual(['cmd-new', 'cmd-old']);
  });
});

describe('REQ-E07-08 BR-04 / AC-03 · the data-age threshold is 15 minutes', () => {
  /** @param {number} minutesAgo */
  const at = (minutesAgo) => new Date(Date.parse(NOW) - minutesAgo * 60_000).toISOString();

  it('the target is 15 minutes, and the banner fires ABOVE it rather than ON it', () => {
    expect(SAP_LATENCY_TARGET_MINUTES).toBe(15);
    expect(sapDataAge(at(14), NOW).stale).toBe(false);
    expect(sapDataAge(at(15), NOW).stale).toBe(false); // exactly on target
    expect(sapDataAge(at(16), NOW).stale).toBe(true);
  });

  it('the age is reported in whole minutes and never negative', () => {
    expect(sapDataAge(at(90), NOW).minutes).toBe(90);
    expect(sapDataAge('2026-10-01T00:00:00.000Z', NOW).minutes).toBe(0);
  });

  it('data that has NEVER arrived is stale with no age — not "0 minutes ago"', () => {
    const age = sapDataAge(null, NOW);
    expect(age.minutes).toBeNull();
    expect(age.stale).toBe(true);
  });

  it('the plain phrase steps up from minutes to hours to days', () => {
    expect(sapAgeParts(59)).toEqual({ unit: 'minutes', value: 59 });
    expect(sapAgeParts(60)).toEqual({ unit: 'hours', value: 1 });
    expect(sapAgeParts(60 * 24 - 1)).toEqual({ unit: 'hours', value: 23 });
    expect(sapAgeParts(60 * 24)).toEqual({ unit: 'days', value: 1 });
  });

  it('the newest instant wins, and an empty set has none', () => {
    expect(newestInstant(['2026-01-01T00:00:00.000Z', '2026-05-01T00:00:00.000Z'])).toBe(
      '2026-05-01T00:00:00.000Z'
    );
    expect(newestInstant([null, undefined, ''])).toBeNull();
  });
});

describe('the simulated inbound feed produces a failed record deterministically', () => {
  beforeEach(() => sapMessageStore.reset());

  it('the seed carries one retryable transport failure and one business refusal', () => {
    const open = sapMessageStore.open();
    expect(open).toHaveLength(SAP_INBOUND_SEED.length);
    expect(open.filter(isRetryable).map((m) => m.object)).toEqual(['goodsReceipt']);
    expect(open.filter((m) => !isRetryable(m)).map((m) => m.fault)).toEqual(['REFUSED']);
  });

  it('A RETRY THAT SUCCEEDS UPDATES THE MONITOR — the message clears and the arrival is recorded', () => {
    const cleared = sapMessageStore.retry('sapmsg-0001', NOW);
    expect(cleared?.id).toBe('sapmsg-0001');
    expect(sapMessageStore.open().map((m) => m.id)).toEqual(['sapmsg-0002']);
    expect(sapMessageStore.clearedAt()).toEqual([{ id: 'sapmsg-0001', at: NOW }]);

    const [gr] = sapMonitor({
      lastSeen: { goodsReceipt: sapMessageStore.clearedAt()[0].at },
      messages: sapMessageStore.open()
    }).filter((o) => o.object === 'goodsReceipt');
    expect(gr.failureCount).toBe(0);
    expect(sapDataAge(gr.lastSuccessAt, NOW).stale).toBe(false);
  });

  it('a business refusal REFUSES the retry and stays open (CR-20)', () => {
    expect(sapMessageStore.retry('sapmsg-0002', NOW)).toBeNull();
    expect(sapMessageStore.open().map((m) => m.id)).toContain('sapmsg-0002');
  });

  it('an unknown id retries nothing', () => {
    expect(sapMessageStore.retry('sapmsg-nope', NOW)).toBeNull();
    expect(sapMessageStore.open()).toHaveLength(SAP_INBOUND_SEED.length);
  });
});
