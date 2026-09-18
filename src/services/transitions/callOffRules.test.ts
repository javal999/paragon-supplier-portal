// ────────────────────────────────────────────────────────────────────────────
// Call-off rules (REQ-E09-01, REQ-E09-03, REQ-E09-04; CR-04 to CR-09) — the
// pure derivations, each probed with a known-good and a known-bad input, and
// the seeded demo pinned by NAMED call-offs reached through derived values.
// ────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import type { ASN, CallOff } from '../data/types';
import { CALL_OFF_SEED } from '../data/mock/fixtures/callOffs';
import { mockGoodsReceipts } from '../../data/mockGoodsReceipts';
import { MOCK_ASNS } from '../data/mock/fixtures/supplierShipments';
import { SDC_SIMULATED_NOW } from '../sdc/clock';
import { DECLARED_PRESENT } from '../data/fixturePresent';
import { CALL_OFF_TOLERANCE } from './callOffTolerance';
import {
  callOffOtif,
  callOffViews,
  checkTolerance,
  confirmationDeadline,
  deliveryDrift,
  deliveryResults,
  exceedsRemaining,
  generateCallOffSeries,
  headsUpsFor,
  isAtRisk,
  isCallOffEscalated,
  isDueWithoutHeadsUp,
  proposedDeliveries,
  umbrellaRemaining,
  type ReceiptEvent,
} from './callOffRules';

const base: CallOff = {
  id: 'co-t1',
  callOffNumber: 'CO-T-1',
  poId: 'po-007',
  poNumber: 'PO-2025-00107',
  poLineId: 'li-007a',
  supplierId: 'sup-007',
  supplierName: 'PT Sample Packaging Indonesia',
  materialCode: 'PK-PETB-8801',
  description: 'PET bottle',
  uom: 'PCS',
  unitPrice: 1600,
  currency: 'IDR',
  quantity: 1000,
  needDate: '2026-09-10',
  type: 'forecast',
  status: 'Awaiting Confirmation',
  releasedAt: '2026-09-07T02:00:00.000Z', // Monday 09:00 WIB
  dispatches: [],
  notes: [],
};
const LINE = { id: 'li-007a', quantity: 200000, unitPrice: 1600 };

describe('CR-04 · remaining on the umbrella PO', () => {
  it('counts released call-offs only — drafts, dismissed and rejected give their quantity back', () => {
    const rows: CallOff[] = [
      { ...base, id: 'a', quantity: 50000, status: 'Confirmed' },
      { ...base, id: 'b', quantity: 30000, status: 'Awaiting Confirmation' },
      { ...base, id: 'c', quantity: 99999, status: 'Draft' },
      { ...base, id: 'd', quantity: 99999, status: 'Dismissed' },
      { ...base, id: 'e', quantity: 99999, status: 'Rejected' },
      { ...base, id: 'f', quantity: 99999, poLineId: 'other-line', status: 'Confirmed' },
    ];
    const r = umbrellaRemaining(LINE, rows);
    expect(r.releasedQty).toBe(80000);
    expect(r.remainingQty).toBe(120000);
    expect(r.remainingValue).toBe(120000 * 1600);
  });

  it('release beyond remaining is refused; exactly the remainder is allowed', () => {
    const rows: CallOff[] = [{ ...base, id: 'a', quantity: 150000, status: 'Confirmed' }];
    expect(exceedsRemaining(50000, LINE, rows)).toBe(false);
    expect(exceedsRemaining(50001, LINE, rows)).toBe(true);
    // Changing a call-off leaves itself out of what is already released.
    expect(exceedsRemaining(200000, LINE, rows, 'a')).toBe(false);
  });
});

describe('CR-04 BR-05 · series generator (the delivery generator, reused)', () => {
  it('count = ceil(total ÷ per call-off); the last takes the remainder; weekly spacing', () => {
    const s = generateCallOffSeries({ totalQty: 10000, qtyPerCallOff: 3000, cadence: 'weekly', firstNeedDate: '2026-09-07' });
    expect(s.map((d) => d.quantity)).toEqual([3000, 3000, 3000, 1000]);
    expect(s.map((d) => d.date)).toEqual(['2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28']);
  });

  it('monthly and quarterly spacing; an even split has no short tail', () => {
    expect(
      generateCallOffSeries({ totalQty: 6000, qtyPerCallOff: 2000, cadence: 'monthly', firstNeedDate: '2026-09-01' }).map(
        (d) => d.date,
      ),
    ).toEqual(['2026-09-01', '2026-10-01', '2026-11-01']);
    expect(
      generateCallOffSeries({ totalQty: 4000, qtyPerCallOff: 2000, cadence: 'quarterly', firstNeedDate: '2026-09-01' }).map(
        (d) => d.date,
      ),
    ).toEqual(['2026-09-01', '2026-12-01']);
  });

  it('refuses nonsense input by returning nothing', () => {
    expect(generateCallOffSeries({ totalQty: 0, qtyPerCallOff: 10, cadence: 'weekly', firstNeedDate: '2026-09-01' })).toEqual([]);
    expect(generateCallOffSeries({ totalQty: 10, qtyPerCallOff: 10, cadence: 'weekly', firstNeedDate: 'soon' })).toEqual([]);
  });
});

describe('REQ-E09-03 · confirmation answers and tolerance (CR-05, PQ-08)', () => {
  it('the defaults: forecast 10% over, JIT no limit, 0 under, 0 days early or late', () => {
    expect(CALL_OFF_TOLERANCE).toMatchObject({ overPct: { forecast: 0.1, jit: null }, underPct: 0, earlyDays: 0, lateDays: 0 });
  });

  it('forecast-based over-quantity: within 10% is accepted, beyond it is not', () => {
    expect(checkTolerance(base, [{ quantity: 1100, date: base.needDate }]).within).toBe(true);
    const over = checkTolerance(base, [{ quantity: 1101, date: base.needDate }]);
    expect(over.within).toBe(false);
    expect(over.overQty).toBe(true);
  });

  it('JIT has no over-quantity limit', () => {
    expect(checkTolerance({ ...base, type: 'jit' }, [{ quantity: 50000, date: base.needDate }]).within).toBe(true);
  });

  it('ANY date change or shortfall goes to approval while PQ-08 is open', () => {
    expect(checkTolerance(base, [{ quantity: 1000, date: '2026-09-11' }])).toMatchObject({ within: false, late: true });
    expect(checkTolerance(base, [{ quantity: 1000, date: '2026-09-09' }])).toMatchObject({ within: false, early: true });
    expect(checkTolerance({ ...base, type: 'jit' }, [{ quantity: 999, date: base.needDate }])).toMatchObject({
      within: false,
      underQty: true,
    });
    expect(checkTolerance(base, [{ quantity: 1000, date: base.needDate }]).within).toBe(true);
  });

  it('each answer is well formed for its kind, or refused by name', () => {
    expect(proposedDeliveries(base, 'confirm', {})).toEqual({ deliveries: [{ quantity: 1000, date: '2026-09-10' }] });
    expect(proposedDeliveries(base, 'newDate', { confirmedDate: '2026-09-12' })).toEqual({
      deliveries: [{ quantity: 1000, date: '2026-09-12' }],
    });
    expect(proposedDeliveries(base, 'newDate', { confirmedDate: '2026-09-10' })).toEqual({ refusal: 'sameDate' });
    expect(proposedDeliveries(base, 'newDate', { confirmedDate: '2026-02-30' })).toEqual({ refusal: 'date' });
    expect(proposedDeliveries(base, 'changes', { confirmedQty: 1000 })).toEqual({ refusal: 'sameQuantity' });
    expect(proposedDeliveries(base, 'changes', { confirmedQty: -5 })).toEqual({ refusal: 'quantity' });
    expect(
      proposedDeliveries(base, 'partial', {
        deliveries: [
          { quantity: 400, date: '2026-09-17' },
          { quantity: 600, date: '2026-09-10' },
        ],
      }),
    ).toEqual({
      deliveries: [
        { quantity: 600, date: '2026-09-10' },
        { quantity: 400, date: '2026-09-17' },
      ],
    });
    expect(proposedDeliveries(base, 'partial', { deliveries: [{ quantity: 1000, date: '2026-09-10' }] })).toEqual({
      refusal: 'splitCount',
    });
    expect(
      proposedDeliveries(base, 'partial', {
        deliveries: [
          { quantity: 500, date: '2026-09-10' },
          { quantity: 500, date: '2026-09-10' },
        ],
      }),
    ).toEqual({ refusal: 'splitDates' });
  });
});

describe('BR-05 · confirmation deadline and Escalated, derived at read time', () => {
  it('due 1 working day after release; escalated only once that has passed and only while unanswered', () => {
    expect(confirmationDeadline(base)?.toISOString()).toBe('2026-09-08T02:00:00.000Z');
    expect(isCallOffEscalated(base, '2026-09-08T01:59:00.000Z')).toBe(false);
    expect(isCallOffEscalated(base, '2026-09-08T02:01:00.000Z')).toBe(true);
    expect(isCallOffEscalated({ ...base, status: 'Confirmed' }, '2026-09-20T00:00:00.000Z')).toBe(false);
  });

  it('a release on Friday evening is due on Monday, not Saturday', () => {
    const fri = { ...base, releasedAt: '2026-09-11T12:00:00.000Z' }; // Fri 19:00 WIB
    expect(confirmationDeadline(fri)?.toISOString()).toBe('2026-09-15T01:00:00.000Z'); // Tue 08:00 WIB
  });
});

describe('REQ-E09-04 · heads-ups and At Risk', () => {
  const confirmed: CallOff = {
    ...base,
    status: 'Confirmed',
    confirmation: { kind: 'confirm', deliveries: [{ quantity: 1000, date: '2026-09-10' }], confirmedAt: 'x', approval: 'auto' },
  };
  const asn = (over: Partial<ASN>): ASN =>
    ({
      asnNumber: 'ASN-T',
      supplierId: 'sup-007',
      poReference: 'PO-2025-00107',
      status: 'Submitted',
      carrier: 'c',
      trackingNumber: 't',
      eta: '2026-09-09',
      shipDate: '2026-09-08',
      details: {} as ASN['details'],
      lineItems: [{ materialCode: 'PK-PETB-8801', description: '', orderedQty: 1, shippedQty: 1000, lotNumber: 'L', uom: 'PCS' }],
      callOffId: 'co-t1',
      ...over,
    }) as ASN;

  it('an ASN linked to the call-off counts as a heads-up; a draft ASN and another call-off do not', () => {
    expect(headsUpsFor(confirmed, [asn({})]).map((h) => h.ref)).toEqual(['ASN-T']);
    expect(headsUpsFor(confirmed, [asn({ status: 'Draft' })])).toEqual([]);
    expect(headsUpsFor(confirmed, [asn({ callOffId: 'someone-else' })])).toEqual([]);
  });

  it('a notice that names the ASN is not counted twice', () => {
    const withNotice = {
      ...confirmed,
      dispatches: [{ id: 'd1', shippedDate: '2026-09-08', expectedArrival: '2026-09-09', quantity: 1000, asnNumber: 'ASN-T', recordedAt: 'x' }],
    };
    expect(headsUpsFor(withNotice, [asn({})]).map((h) => h.source)).toEqual(['notice']);
  });

  it('At Risk when expected arrival is after the need date, not on it', () => {
    expect(isAtRisk(confirmed, headsUpsFor(confirmed, [asn({ eta: '2026-09-10' })]))).toBe(false);
    expect(isAtRisk(confirmed, headsUpsFor(confirmed, [asn({ eta: '2026-09-11' })]))).toBe(true);
  });
});

describe('CR-06 to CR-08 · delivery result and OTIF (the function Phase 6 reuses)', () => {
  const confirmed: CallOff = {
    ...base,
    status: 'Confirmed',
    confirmation: { kind: 'confirm', deliveries: [{ quantity: 1000, date: '2026-09-10' }], confirmedAt: 'x', approval: 'auto' },
  };
  const receipt = (date: string, quantity: number, over: Partial<ReceiptEvent> = {}): ReceiptEvent => ({
    ref: `GR-${date}-${quantity}`,
    supplierId: 'sup-007',
    materialCode: 'PK-PETB-8801',
    date,
    quantity,
    ...over,
  });
  const otifOf = (c: CallOff, receipts: ReceiptEvent[], now = '2026-09-30T00:00:00.000Z') =>
    callOffOtif(c.id, deliveryResults([c], receipts, [], now));

  it('on time and in full → 1', () => {
    expect(otifOf(confirmed, [receipt('2026-09-10', 1000)])).toBe(1);
  });

  it('late → 0; short → 0', () => {
    expect(otifOf(confirmed, [receipt('2026-09-11', 1000)])).toBe(0);
    expect(otifOf(confirmed, [receipt('2026-09-09', 999)])).toBe(0);
  });

  it('measured against the APPROVED date and quantity, not the requested one', () => {
    const approvedLater: CallOff = {
      ...confirmed,
      status: 'Confirmed with New Date',
      confirmation: { kind: 'newDate', deliveries: [{ quantity: 1000, date: '2026-09-12' }], confirmedAt: 'x', approval: 'approved' },
    };
    expect(otifOf(approvedLater, [receipt('2026-09-12', 1000)])).toBe(1);
    // …while still awaiting approval, the requested date stands.
    const pending = { ...approvedLater, confirmation: { ...approvedLater.confirmation!, approval: 'awaiting' as const } };
    expect(otifOf(pending, [receipt('2026-09-12', 1000)])).toBe(0);
  });

  it('CR-06: outside 7 days, another supplier or another material is not a match; the closest date wins', () => {
    expect(otifOf(confirmed, [receipt('2026-09-18', 1000)])).toBe(0); // 8 days → missed
    expect(otifOf(confirmed, [receipt('2026-09-10', 1000, { supplierId: 'sup-008' })])).toBe(0);
    expect(otifOf(confirmed, [receipt('2026-09-10', 1000, { materialCode: 'X' })])).toBe(0);
    const [r] = deliveryResults([confirmed], [receipt('2026-09-13', 1000), receipt('2026-09-09', 1000)], [], '2026-09-30T00:00:00.000Z');
    expect(r.ref).toBe('GR-2026-09-09-1000');
  });

  it('CR-07: pending until 3 days after the need date, then missed; pending OTIF is null', () => {
    expect(deliveryResults([confirmed], [], [], '2026-09-13T12:00:00.000Z')[0].timing).toBe('pending');
    expect(otifOf(confirmed, [], '2026-09-13T12:00:00.000Z')).toBeNull();
    expect(deliveryResults([confirmed], [], [], '2026-09-14T12:00:00.000Z')[0].timing).toBe('missed');
    expect(otifOf(confirmed, [], '2026-09-14T12:00:00.000Z')).toBe(0);
  });

  it('a partial confirmation is measured per delivery: one late delivery makes the call-off 0', () => {
    const split: CallOff = {
      ...confirmed,
      status: 'Partially Confirmed',
      confirmation: {
        kind: 'partial',
        deliveries: [
          { quantity: 600, date: '2026-09-10' },
          { quantity: 400, date: '2026-09-20' },
        ],
        confirmedAt: 'x',
        approval: 'approved',
      },
    };
    const results = deliveryResults([split], [receipt('2026-09-10', 600), receipt('2026-09-20', 400)], [], '2026-09-30T00:00:00.000Z');
    expect(results.map((r) => r.timing)).toEqual(['onTime', 'onTime']);
    expect(callOffOtif(split.id, results)).toBe(1);
    expect(otifOf(split, [receipt('2026-09-10', 600), receipt('2026-09-22', 400)])).toBe(0);
  });

  it('draft, rejected and unconfirmed call-offs have no delivery to measure', () => {
    expect(deliveryResults([{ ...base, status: 'Draft' }, { ...base, id: 'r', status: 'Rejected' }], [], [], '2026-12-01T00:00:00.000Z')).toEqual([]);
  });
});

describe('the seeded demo at the declared present — named call-offs, derived states', () => {
  const views = callOffViews(CALL_OFF_SEED, MOCK_ASNS, mockGoodsReceipts, SDC_SIMULATED_NOW);
  const byNumber = (n: string) => views.find((v) => v.callOff.callOffNumber === n)!;

  it('the clock the pages read is the declared present', () => {
    expect(SDC_SIMULATED_NOW.slice(0, 10)).toBe(DECLARED_PRESENT);
  });

  it('shows every state the demo needs', () => {
    expect(views.filter((v) => v.delivery === 'late').map((v) => v.callOff.callOffNumber)).toEqual(['CO-2026-0001']);
    expect(byNumber('CO-2026-0001').results[0]).toMatchObject({ basis: 'receipt', ref: 'GR-2026-002', inFull: true });
    expect(views.filter((v) => v.delivery === 'dispatched').map((v) => v.callOff.callOffNumber)).toEqual(['CO-2026-0002']);
    expect(views.filter((v) => v.delivery === 'atRisk').map((v) => v.callOff.callOffNumber)).toEqual(['CO-2026-0005']);
    expect(views.filter((v) => v.confirmation === 'Awaiting Confirmation').map((v) => v.callOff.callOffNumber)).toEqual([
      'CO-2026-0003',
    ]);
    expect(views.filter((v) => v.confirmation === 'Escalated').map((v) => v.callOff.callOffNumber)).toEqual(['CO-2026-0009']);
    expect(views.filter((v) => v.confirmation === 'Awaiting Approval').map((v) => v.callOff.callOffNumber)).toEqual([
      'CO-2026-0004',
      'CO-2026-0010',
    ]);
    expect(views.filter((v) => v.delivery === 'missed').map((v) => v.callOff.callOffNumber)).toEqual([
      'CO-2026-0007',
      'CO-2026-0008',
    ]);
    expect(views.filter((v) => isDueWithoutHeadsUp(v, SDC_SIMULATED_NOW)).map((v) => v.callOff.callOffNumber)).toEqual([
      'CO-2026-0006',
    ]);
  });

  it('delivery drift names the supplier and material with 2 missed call-offs, and no other', () => {
    expect(deliveryDrift(views)).toEqual([
      { supplierId: 'sup-008', supplierName: 'PT Sample Carton Packaging', materialCode: 'PK-CART-9910', count: 2 },
    ]);
  });
});
