// ─────────────────────────────────────────────────────────────────────────────
// REQ-E07-02 / REQ-E07-05 — the PO response verbs through the real dispatcher.
//
// Every refusal is paired with a known-GOOD dispatch on the same PO, so a
// refusal that fires because the harness is broken cannot pass as a policy.
// ─────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService } from './MockCommandService';
import { purchaseOrderStore } from './stores/purchaseOrderStore';
import { asnStore } from './stores/asnStore';
/** @import { PoLineResponse, QueryScope } from '../types' */
import { POStatus } from '../types';
import { SEEDED_SEAT_ROLES, rolesHolding } from '../../transitions/businessRoles';
import { counterOfferRefusal, isIsoDate } from '../../transitions/policies';
import { getTransition } from '../../transitions';

const SENT_PO = 'po-008'; // PO-2025-00108, sup-007, one line of 150,000 PCS
const LINE = 'li-008a';
const CONFIRMED_PO = 'po-007'; // PO-2025-00107, sup-007

/** @type {QueryScope} */
const supplier = {
  personaType: 'supplier',
  supplierId: 'sup-007',
  businessRoles: SEEDED_SEAT_ROLES.supplier
};
/** @type {QueryScope} */
const otherSupplier = { ...supplier, supplierId: 'sup-008' };
/** @type {QueryScope} */
const buyer = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: SEEDED_SEAT_ROLES.buyer
};

/** @type {PoLineResponse} */
const goodLine = {
  lineId: LINE,
  reasonCode: 'capacity',
  counterQty: 120000,
  counterDate: '2025-05-10'
};

const svc = new MockCommandService();
/** @param {string} id */
const po = (id) => /** @type {import('../types').PurchaseOrder} */ (purchaseOrderStore.get(id));

beforeEach(() => {
  purchaseOrderStore.reset();
});

describe('premise — the fixtures and lanes these specs stand on', () => {
  it('the Sent PO and its line are what the specs assume', () => {
    expect(po(SENT_PO).status).toBe(POStatus.SENT);
    expect(po(SENT_PO).lineItems.map((l) => [l.id, l.quantity])).toEqual([[LINE, 150000]]);
    expect(po(CONFIRMED_PO).status).toBe(POStatus.CONFIRMED);
  });

  it('supplier answers are fulfilment atoms; the review is procurement’s', () => {
    expect(rolesHolding('po:adjust')).toEqual(['fulfilment']);
    expect(rolesHolding('po:reject')).toEqual(['fulfilment']);
    expect(rolesHolding('po:shipping-notice')).toEqual(['fulfilment']);
    expect(rolesHolding('po:review-response')).toEqual(['procurement']);
    expect(getTransition('t_po_adjust')?.to).toBe(POStatus.ADJUSTED);
    expect(getTransition('t_po_shipping_notice')?.statePreserving).toBe(true);
  });
});

describe('Approve keeps the confirmed delivery date (the form used to discard it)', () => {
  it('stores quantities, the date and a response record', async () => {
    const res = await svc.dispatch(supplier, {
      transitionId: 't_po_confirm',
      entity: 'purchaseOrder',
      entityId: SENT_PO,
      payload: { confirmedQuantities: [150000], confirmedDeliveryDate: '2025-04-28' }
    });
    expect(res.status).not.toBe('failed');
    expect(po(SENT_PO).status).toBe(POStatus.CONFIRMED);
    expect(po(SENT_PO).confirmedDeliveryDate).toBe('2025-04-28');
    expect(po(SENT_PO).response?.option).toBe('approve');
    expect(po(SENT_PO).response?.confirmedDeliveryDate).toBe('2025-04-28');
  });
});

describe('Adjust (AC-02): a reason, a quantity within CR-10 and a date, per line', () => {
  /** @param {unknown} lineResponses */
  const adjust = (lineResponses, scope = supplier) =>
    svc.dispatch(scope, {
      transitionId: 't_po_adjust',
      entity: 'purchaseOrder',
      entityId: SENT_PO,
      payload: { lineResponses }
    });

  it('KNOWN-GOOD — a complete counter-offer lands as Adjusted with its record', async () => {
    const res = await adjust([goodLine]);
    expect(res.status).not.toBe('failed');
    expect(po(SENT_PO).status).toBe(POStatus.ADJUSTED);
    expect(po(SENT_PO).response?.option).toBe('adjust');
    expect(po(SENT_PO).response?.lines).toEqual([goodLine]);
    expect(po(SENT_PO).response?.respondedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it.each([
    ['no lines', []],
    ['no reason', [{ ...goodLine, reasonCode: undefined }]],
    ['an off-list reason', [{ ...goodLine, reasonCode: 'weather' }]],
    ['Other without a note', [{ ...goodLine, reasonCode: 'other' }]],
    ['a zero quantity', [{ ...goodLine, counterQty: 0 }]],
    ['more than ordered', [{ ...goodLine, counterQty: 150001 }]],
    ['NaN quantity', [{ ...goodLine, counterQty: Number.NaN }]],
    ['no date', [{ ...goodLine, counterDate: '' }]],
    ['an impossible date', [{ ...goodLine, counterDate: '2025-02-30' }]],
    ['a line not on the PO', [{ ...goodLine, lineId: 'li-999' }]],
    ['the same line twice', [goodLine, goodLine]]
  ])('refuses %s, and the PO does not move', async (_name, lines) => {
    const res = await adjust(lines);
    expect(res.status).toBe('failed');
    expect(po(SENT_PO).status).toBe(POStatus.SENT);
    expect(po(SENT_PO).response).toBeUndefined();
  });

  it('Other WITH a note is accepted — the note rule is not a blanket refusal', async () => {
    const res = await adjust([{ ...goodLine, reasonCode: 'other', note: 'Plant shutdown' }]);
    expect(res.status).not.toBe('failed');
    expect(po(SENT_PO).response?.lines?.[0].note).toBe('Plant shutdown');
  });

  it('the quantity bound is inclusive at the ordered quantity', () => {
    expect(counterOfferRefusal({ ...goodLine, counterQty: 150000 }, po(SENT_PO))).toBeNull();
    expect(counterOfferRefusal({ ...goodLine, counterQty: 150000.5 }, po(SENT_PO))).toBe(
      'quantity'
    );
    expect(isIsoDate('2026-02-28')).toBe(true);
    expect(isIsoDate('28/02/2026')).toBe(false);
  });

  it('another supplier and a buyer seat are both refused', async () => {
    expect(
      (await adjust([goodLine], otherSupplier).catch(() => ({ status: 'failed' }))).status
    ).toBe('failed');
    expect((await adjust([goodLine], buyer)).status).toBe('failed');
    expect(po(SENT_PO).status).toBe(POStatus.SENT);
  });
});

describe('Reject (AC-03): at least one cause from date / quantity / quality', () => {
  /** @param {Record<string, unknown>} payload */
  const reject = (payload) =>
    svc.dispatch(supplier, {
      transitionId: 't_po_reject',
      entity: 'purchaseOrder',
      entityId: SENT_PO,
      payload
    });

  it('KNOWN-GOOD — causes and a comment are recorded, and the PO is Rejected', async () => {
    const res = await reject({
      rejectionCauses: ['date', 'quality'],
      comment: 'Line under maintenance'
    });
    expect(res.status).not.toBe('failed');
    expect(po(SENT_PO).status).toBe(POStatus.REJECTED);
    expect(po(SENT_PO).response).toMatchObject({
      option: 'reject',
      rejectionCauses: ['date', 'quality'],
      comment: 'Line under maintenance'
    });
  });

  it.each([
    ['no causes', { rejectionCauses: [] }],
    ['an off-list cause', { rejectionCauses: ['price'] }],
    ['a missing field', {}]
  ])('refuses %s', async (_name, payload) => {
    expect((await reject(payload)).status).toBe('failed');
    expect(po(SENT_PO).status).toBe(POStatus.SENT);
  });

  it('a rejected PO is terminal — no further answer is legal', async () => {
    await reject({ rejectionCauses: ['quantity'] });
    const again = await svc.dispatch(supplier, {
      transitionId: 't_po_confirm',
      entity: 'purchaseOrder',
      entityId: SENT_PO,
      payload: { confirmedQuantities: [150000] }
    });
    expect(again.status).toBe('failed');
  });
});

describe('the planner reviews a counter-offer', () => {
  beforeEach(async () => {
    await svc.dispatch(supplier, {
      transitionId: 't_po_adjust',
      entity: 'purchaseOrder',
      entityId: SENT_PO,
      payload: { lineResponses: [goodLine] }
    });
  });

  it('accept → Confirmed at the counter-offered quantity and date', async () => {
    const res = await svc.dispatch(buyer, {
      transitionId: 't_po_accept_counter',
      entity: 'purchaseOrder',
      entityId: SENT_PO
    });
    expect(res.status).not.toBe('failed');
    expect(po(SENT_PO).status).toBe(POStatus.CONFIRMED);
    expect(po(SENT_PO).lineItems[0].confirmedQty).toBe(120000);
    expect(po(SENT_PO).confirmedDeliveryDate).toBe('2025-05-10');
    expect(po(SENT_PO).response?.review?.decision).toBe('accepted');
  });

  it('reject with a comment → reopened for the supplier, deadline restarted', async () => {
    const res = await svc.dispatch(buyer, {
      transitionId: 't_po_reject_counter',
      entity: 'purchaseOrder',
      entityId: SENT_PO,
      payload: { reviewComment: 'We need the full quantity by May' }
    });
    expect(res.status).not.toBe('failed');
    expect(po(SENT_PO).status).toBe(POStatus.SENT);
    expect(po(SENT_PO).response?.review).toMatchObject({
      decision: 'rejected',
      comment: 'We need the full quantity by May'
    });
    expect(po(SENT_PO).responseRequestedAt).toBeDefined();
  });

  it.each([
    ['blank', '   '],
    ['missing', undefined]
  ])('refuses a %s review comment', async (_n, reviewComment) => {
    const res = await svc.dispatch(buyer, {
      transitionId: 't_po_reject_counter',
      entity: 'purchaseOrder',
      entityId: SENT_PO,
      payload: reviewComment === undefined ? {} : { reviewComment }
    });
    expect(res.status).toBe('failed');
    expect(po(SENT_PO).status).toBe(POStatus.ADJUSTED);
  });

  it('the supplier cannot accept its own counter-offer', async () => {
    const res = await svc.dispatch(supplier, {
      transitionId: 't_po_accept_counter',
      entity: 'purchaseOrder',
      entityId: SENT_PO
    });
    expect(res.status).toBe('failed');
    expect(po(SENT_PO).status).toBe(POStatus.ADJUSTED);
  });
});

describe('shipping notice (REQ-E07-05)', () => {
  /**
   * @param {string} entityId
   * @param {unknown} expectedCompletionDate
   */
  const notice = (entityId, expectedCompletionDate) =>
    svc.dispatch(supplier, {
      transitionId: 't_po_shipping_notice',
      entity: 'purchaseOrder',
      entityId,
      payload: { expectedCompletionDate }
    });

  it('records the date without moving the PO, and keeps the previous date when it moves', async () => {
    expect((await notice(CONFIRMED_PO, '2025-04-20')).status).not.toBe('failed');
    expect(po(CONFIRMED_PO).status).toBe(POStatus.CONFIRMED);
    expect(po(CONFIRMED_PO).shippingNotice?.expectedCompletionDate).toBe('2025-04-20');
    expect((await notice(CONFIRMED_PO, '2025-04-30')).status).not.toBe('failed');
    expect(po(CONFIRMED_PO).shippingNotice).toMatchObject({
      expectedCompletionDate: '2025-04-30',
      previousCompletionDate: '2025-04-20'
    });
  });

  it('refuses a malformed date and a PO that is not confirmed', async () => {
    expect((await notice(CONFIRMED_PO, 'next week')).status).toBe('failed');
    expect((await notice(SENT_PO, '2025-04-30')).status).toBe('failed');
  });

  // ⚠️ REQ-E07-04 CHANGED THIS TEST'S PREMISE: the ASN now carries its own ship
  // date and a batch per line (BR-04), and shipment started is recorded with
  // THAT date rather than the day of submission.
  it('BR-03 — submitting the first ASN records shipment started on its PO, with the ASN ship date', async () => {
    const created = await svc.dispatch(supplier, {
      transitionId: 't_asn_create',
      entity: 'advanceShipNotice',
      payload: { poReference: 'PO-2025-00107' }
    });
    expect(created.status).not.toBe('failed');
    const asnNumber = /** @type {NonNullable<typeof created.entityId>} */ (created.entityId);
    expect(po(CONFIRMED_PO).shippingNotice?.startedOn).toBeUndefined();
    const submitted = await svc.dispatch(supplier, {
      transitionId: 't_asn_submit',
      entity: 'advanceShipNotice',
      entityId: asnNumber,
      payload: {
        carrier: 'JNE',
        trackingNumber: 'TRK-1',
        eta: '2025-04-10',
        shipDate: '2025-04-08',
        // AIB-1 BR-03 / BR-04 (BL-348).
        sequence: '36',
        externalId: 'SJ-TEST-36',
        lines: /** @type {import('../types').ASN} */ (asnStore.get(asnNumber)).lineItems.map(
          (l) => ({
            materialCode: l.materialCode,
            shippedQty: l.shippedQty,
            batchNumber: 'BATCH-1'
          })
        )
      }
    });
    expect(submitted.status).not.toBe('failed');
    expect(po(CONFIRMED_PO).shippingNotice?.startedByAsn).toBe(asnNumber);
    expect(po(CONFIRMED_PO).shippingNotice?.startedOn).toBe('2025-04-08');
    expect(asnStore.get(asnNumber)?.status).toBe('Submitted');
  });
});
