// ────────────────────────────────────────────────────────────────────────────
// UCX-P3 (BL-364) — the one-step shipment notice, PURE.
//
// What the specs pin, and why each line exists:
//   · the values the step starts from are the CALL-OFF's (approved quantity and
//     need date), never the PO's open quantity — UCX-F9's defect (an ASN for
//     eight times the call-off) was a prefill from the open quantity;
//   · the sequence prefills the next free number and stays editable — UCX-D13,
//     and the SAP rules still run (they live in `asnSequenceRead` and are
//     pinned by `asnSequenceRules.test.js`);
//   · a draft is not a shipment: only a live ASN holds its sequence, and the
//     drawer offers one mark per open draft.
// ────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import { openQtyForLine } from './fulfilmentRules';
/** @import { ASN, CallOff, PurchaseOrder } from '../data/types' */
import {
  callOffShipment,
  draftForCallOff,
  markShippedDraft,
  nextFreeSequence,
  sequencesInUse
} from './shipmentNotice';

/**
 * @param {Partial<CallOff>} [over]
 * @returns {CallOff}
 */
const callOff = (over = {}) => ({
  id: 'co-t1',
  callOffNumber: 'CO-T-0001',
  poId: 'po-t',
  poNumber: 'PO-T-1',
  poLineId: 'li-t1',
  supplierId: 'sup-t',
  supplierName: 'Sample Supplier',
  materialCode: 'MAT-A',
  description: 'Material A',
  uom: 'PCS',
  unitPrice: 100,
  currency: 'IDR',
  quantity: 10_000,
  needDate: '2026-09-03',
  type: 'forecast',
  status: 'Confirmed',
  releasedAt: '2026-08-26T02:00:00.000Z',
  confirmation: {
    kind: 'confirm',
    deliveries: [{ quantity: 10_000, date: '2026-09-03' }],
    confirmedAt: '2026-08-26T03:00:00.000Z',
    approval: 'auto'
  },
  dispatches: [],
  notes: [],
  ...over
});

/**
 * A PO whose one line is open for 200,000 PCS — twenty times the call-off, so
 * a prefill from the open quantity is unmistakable.
 * @returns {PurchaseOrder}
 */
const widePo = () => ({
  id: 'po-t',
  poNumber: 'PO-T-1',
  prReference: 'PR-T',
  sourceOfSupply: 'Outline Agreement: OA-T',
  supplierId: 'sup-t',
  supplierName: 'Sample Supplier',
  status: /** @type {PurchaseOrder['status']} */ ('Confirmed'),
  channel: /** @type {PurchaseOrder['channel']} */ ('WhatsApp'),
  currency: 'IDR',
  totalValue: 20_000_000,
  orderDate: '2026-08-01',
  requestedDeliveryDate: '2026-09-03',
  confirmedDeliveryDate: '2026-09-03',
  daysOverdue: 0,
  acknowledgmentTimeHours: 1,
  lineItems: [
    {
      id: 'li-t1',
      materialCode: 'MAT-A',
      description: 'Material A',
      quantity: 200_000,
      uom: 'PCS',
      unitPrice: 100,
      confirmedQty: 200_000
    }
  ]
});

/**
 * @param {string} sequence
 * @param {Partial<ASN>} [over]
 * @returns {Pick<ASN, 'status' | 'sequence' | 'asnNumber' | 'callOffId'>}
 */
const asn = (sequence, over = {}) => ({
  asnNumber: `ASN-T-${sequence}`,
  status: 'Submitted',
  sequence,
  callOffId: 'co-other',
  ...over
});

describe('nextFreeSequence — UCX-D13: prefill the next free number', () => {
  it('starts at 1 when the supplier holds no numbered ASN', () => {
    expect(nextFreeSequence([])).toBe('1');
    // A blank sequence is not a number to count from.
    expect(nextFreeSequence([asn('')])).toBe('1');
  });

  it('is the highest live sequence plus one', () => {
    expect(nextFreeSequence([asn('1'), asn('2'), asn('3')])).toBe('4');
  });

  it('a CANCELLED ASN frees its sequence again', () => {
    // The live set is 1 and 2; the cancelled 9 must not push the counter.
    expect(nextFreeSequence([asn('1'), asn('2'), asn('9', { status: 'Cancelled' })])).toBe('3');
  });

  it('a non-numeric sequence is ignored by the counter', () => {
    expect(nextFreeSequence([asn('7'), asn('SJ-9')])).toBe('8');
  });

  it('names the sequences in use, ascending, for the hint under the field', () => {
    expect(sequencesInUse([asn('3'), asn('1'), asn('1'), asn('')])).toEqual(['1', '3']);
    expect(sequencesInUse([asn('9', { status: 'Cancelled' })])).toEqual([]);
  });
});

describe('callOffShipment — UCX-F9: the values come from the call-off', () => {
  it('reads the agreed quantity and the call-off need date', () => {
    expect(callOffShipment(callOff())).toEqual({
      quantity: 10_000,
      expectedArrival: '2026-09-03'
    });
  });

  it('an accepted confirmation with a changed quantity is what the step starts from', () => {
    const c = callOff({
      quantity: 10_000,
      confirmation: {
        kind: 'changes',
        deliveries: [{ quantity: 8_000, date: '2026-09-05' }],
        confirmedAt: '2026-08-26T03:00:00.000Z',
        approval: 'auto'
      }
    });
    expect(callOffShipment(c)).toEqual({ quantity: 8_000, expectedArrival: '2026-09-03' });
    // An overdue call-off defaults to the shipped day, never to a past arrival
    // the dispatch policy refuses (found in the browser pass, 2026-11-26).
    expect(callOffShipment(c, '2026-09-05').expectedArrival).toBe('2026-09-05');
    expect(callOffShipment(c, '2026-08-01').expectedArrival).toBe('2026-09-03');
  });
});

describe('markShippedDraft — the draft ASN the step opens', () => {
  it('carries the call-off line, its quantity and the need date — NOT the open quantity', () => {
    const c = callOff();
    const open = openQtyForLine(widePo(), widePo().lineItems[0], []);
    // The prefill the old wizard used, twenty times the call-off: the control.
    expect(open).toBe(200_000);
    const draft = markShippedDraft({
      callOff: c,
      sequence: '4',
      shippedDate: '2026-08-31',
      expectedArrival: '2026-09-03',
      quantity: 10_000
    });
    expect(draft).toEqual({
      poReference: 'PO-T-1',
      callOffId: 'co-t1',
      sequence: '4',
      shipDate: '2026-08-31',
      eta: '2026-09-03',
      lines: [{ materialCode: 'MAT-A', shippedQty: 10_000 }]
    });
    expect(draft.lines[0].shippedQty).not.toBe(open);
  });

  it('a shipment date is optional — the arrival is not', () => {
    const draft = markShippedDraft({
      callOff: callOff(),
      sequence: '1',
      expectedArrival: '2026-09-03',
      quantity: 10_000
    });
    expect(draft).not.toHaveProperty('shipDate');
    expect(draft.eta).toBe('2026-09-03');
  });
});

describe('draftForCallOff — one mark per open draft', () => {
  it('finds the Draft on the call-off and ignores a shipped one', () => {
    expect(
      draftForCallOff(
        [
          asn('1', { asnNumber: 'ASN-T-DRAFT', status: 'Draft', callOffId: 'co-t1' }),
          asn('2', { asnNumber: 'ASN-T-SHIPPED', status: 'Submitted', callOffId: 'co-t1' })
        ],
        'co-t1'
      )
    ).toBe('ASN-T-DRAFT');
    expect(draftForCallOff([asn('1', { callOffId: 'co-t1' })], 'co-t1')).toBeNull();
  });
});
