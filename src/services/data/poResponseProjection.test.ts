import { describe, expect, it } from 'vitest';
import { POStatus, type PurchaseOrder } from './types';
import { mockPurchaseOrders } from '../../data/mockPurchaseOrders';
import { getFlow } from '../transitions';
import {
  foresightStatus,
  isEscalated,
  lifecycleSteps,
  poDisplayStatus,
  respondedLate,
  responseDeadline,
  responseStatus,
  shippingNoticeStatus,
} from './poResponseProjection';

// A Sent PO created Tuesday 15 Sep 2026 → due Wednesday 16 Sep 08:00 WIB.
const base = mockPurchaseOrders.find((p) => p.id === 'po-008')!;
const po = (over: Partial<PurchaseOrder> = {}): PurchaseOrder => ({
  ...base,
  orderDate: '2026-09-15',
  status: POStatus.SENT,
  ...over,
});
const DEADLINE = '2026-09-16T01:00:00.000Z';

describe('escalation is derived from the clock, never stored (law 0.5)', () => {
  it('the premise: Escalated is not a state of the PO machine', () => {
    const states = getFlow('purchaseOrder')!.states;
    expect(states).toContain(POStatus.SENT);
    expect(states).not.toContain('Escalated');
  });

  it('the deadline is 1 working day after creation', () => {
    expect(responseDeadline(po()).toISOString()).toBe(DEADLINE);
  });

  it('not escalated before the deadline; escalated after it', () => {
    expect(isEscalated(po(), '2026-09-16T00:59:00.000Z')).toBe(false);
    expect(isEscalated(po(), '2026-09-16T01:01:00.000Z')).toBe(true);
    expect(poDisplayStatus(po(), '2026-09-16T01:01:00.000Z')).toBe('Escalated');
    expect(responseStatus(po(), '2026-09-16T01:01:00.000Z')).toBe('escalated');
  });

  it('Acknowledged is not a response — it still escalates', () => {
    expect(isEscalated(po({ status: POStatus.ACKNOWLEDGED }), '2026-09-20T00:00:00.000Z')).toBe(true);
  });

  it('an answered PO never escalates, and a late answer stays visible as late', () => {
    const late = po({
      status: POStatus.CONFIRMED,
      response: { option: 'approve', respondedAt: '2026-09-17T03:00:00.000Z' },
    });
    expect(isEscalated(late, '2026-09-20T00:00:00.000Z')).toBe(false);
    expect(poDisplayStatus(late, '2026-09-20T00:00:00.000Z')).toBe(POStatus.CONFIRMED);
    expect(respondedLate(late)).toBe(true);
    expect(respondedLate({ ...late, response: { option: 'approve', respondedAt: '2026-09-15T05:00:00.000Z' } })).toBe(false);
  });

  it('a reopened PO counts its deadline from the reopening', () => {
    const reopened = po({ responseRequestedAt: '2026-09-18T03:00:00.000Z' }); // Fri 10:00 WIB
    expect(responseDeadline(reopened).toISOString()).toBe('2026-09-21T03:00:00.000Z'); // Mon 10:00 WIB
  });
});

describe('shipping notice status', () => {
  it('not started before confirmation, missing once confirmed, then confirmed or moved later', () => {
    expect(shippingNoticeStatus(po())).toBe('notStarted');
    expect(shippingNoticeStatus(po({ status: POStatus.CONFIRMED }))).toBe('missing');
    expect(
      shippingNoticeStatus(po({ status: POStatus.CONFIRMED, shippingNotice: { expectedCompletionDate: '2026-10-01' } })),
    ).toBe('confirmed');
    expect(
      shippingNoticeStatus(
        po({
          status: POStatus.CONFIRMED,
          shippingNotice: { expectedCompletionDate: '2026-10-05', previousCompletionDate: '2026-10-01' },
        }),
      ),
    ).toBe('delayed');
    // Moved EARLIER is not a delay.
    expect(
      shippingNoticeStatus(
        po({
          status: POStatus.CONFIRMED,
          shippingNotice: { expectedCompletionDate: '2026-09-28', previousCompletionDate: '2026-10-01' },
        }),
      ),
    ).toBe('confirmed');
  });
});

describe('foresight status reads only this PO’s supplier and materials', () => {
  const code = base.lineItems[0].materialCode;
  it('no matching forecast line → Not started', () => {
    expect(foresightStatus(po(), [{ supplierId: 'sup-999', materialCode: code, answer: 'gap' }])).toBe('notStarted');
  });
  it('a gap wins over confirmed; awaiting over confirmed', () => {
    const mk = (answer: 'awaiting' | 'confirmed' | 'gap') => ({ supplierId: base.supplierId, materialCode: code, answer });
    expect(foresightStatus(po(), [mk('confirmed')])).toBe('confirmed');
    expect(foresightStatus(po(), [mk('confirmed'), mk('awaiting')])).toBe('awaiting');
    expect(foresightStatus(po(), [mk('awaiting'), mk('gap')])).toBe('gap');
  });
});

describe('lifecycle steps (SC-02)', () => {
  const stateOf = (p: PurchaseOrder, asns = 0) =>
    Object.fromEntries(lifecycleSteps(p, asns).map((s) => [s.id, s.state]));

  it('a new PO is at Response', () => {
    expect(stateOf(po())).toEqual({
      response: 'current',
      confirmations: 'upcoming',
      asn: 'upcoming',
      goodsReceipt: 'upcoming',
      invoice: 'upcoming',
    });
  });

  it('a confirmed PO with no completion date is at Confirmations', () => {
    expect(stateOf(po({ status: POStatus.CONFIRMED })).confirmations).toBe('current');
  });

  it('a rejected PO is stopped at Response', () => {
    expect(stateOf(po({ status: POStatus.REJECTED })).response).toBe('blocked');
  });

  it('a closed PO has every step done', () => {
    expect(Object.values(stateOf(po({ status: POStatus.CLOSED })))).toEqual(Array(5).fill('done'));
  });
});
