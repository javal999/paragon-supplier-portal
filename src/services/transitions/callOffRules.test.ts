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
import { callOffTolerance } from './callOffTolerance';
import {
  callOffOtif,
  callOffViews,
  checkTolerance,
  confirmationDeadline,
  confirmedShortfall,
  deliveryDrift,
  deliveryResults,
  exceedsRemaining,
  generateCallOffSeries,
  headsUpsFor,
  isAtRisk,
  isCallOffEscalated,
  isDueWithoutHeadsUp,
  proposedDeliveries,
  releaseBasis,
  releaseCheck,
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

  it('BL-49: a line with a quantity is checked on remaining QUANTITY, and says so', () => {
    const rows: CallOff[] = [{ ...base, id: 'a', quantity: 150000, status: 'Confirmed' }];
    const fits = releaseCheck(50000, LINE, rows);
    expect(fits).toMatchObject({ basis: 'quantity', exceeds: false, requestedQty: 50000 });
    expect(fits.remaining).toMatchObject({ basis: 'quantity', orderedQty: 200000, remainingQty: 50000 });
    const over = releaseCheck(50001, LINE, rows);
    expect(over).toMatchObject({ basis: 'quantity', exceeds: true });
    expect(releaseBasis(LINE)).toBe('quantity');
  });

  it('BL-49: value is the check ONLY on a line with no quantity — boundary both sides', () => {
    // A value-limit line: 100,000 of value at 1,000 a unit; 30 units released.
    const VALUE_LINE = { id: 'v-line', quantity: 0, unitPrice: 1000, valueLimit: 100000 };
    const rows: CallOff[] = [{ ...base, id: 'a', poLineId: 'v-line', quantity: 30, status: 'Confirmed' }];
    const r = umbrellaRemaining(VALUE_LINE, rows);
    expect(r).toEqual({
      basis: 'value',
      orderedQty: null,
      releasedQty: 30,
      remainingQty: null,
      orderedValue: 100000,
      releasedValue: 30000,
      remainingValue: 70000,
    });
    expect(releaseCheck(70, VALUE_LINE, rows)).toMatchObject({ basis: 'value', exceeds: false, requestedValue: 70000 });
    expect(releaseCheck(71, VALUE_LINE, rows)).toMatchObject({ basis: 'value', exceeds: true, requestedValue: 71000 });
    // The stored 0 quantity is never read as "0 remaining": without the value
    // basis, every release on this line would be refused.
    expect(exceedsRemaining(1, VALUE_LINE, rows)).toBe(false);
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

describe('REQ-E09-03 · confirmation answers and tolerance (CR-05 revised 2026-09-21; BL-47, BL-56)', () => {
  // ⚠️ PREMISE CHANGED AT BL-47. These specs pinned the pre-decision rule —
  // forecast 10% over, JIT no limit, and ANY shortfall to approval while PQ-08
  // was open. The owner decided CR-05 on 2026-09-21: 5% over for every type,
  // a shortfall is a visible partial (accepted), later always to approval,
  // earlier to approval until the warehouse answers (BL-56). Rewritten to the
  // decided rule, each boundary probed on BOTH sides.
  it('the defaults: 5% over for every type, early allowance the BL-56 placeholder of 0 days', () => {
    // BL-32: the values are read in force from the administrator's settings;
    // with nothing changed they are the decided defaults.
    expect(callOffTolerance()).toEqual({ overPct: 5, earlyDays: 0 });
  });

  it.each(['forecast', 'jit'] as const)('%s: exactly +5%% is accepted; one unit more waits for the planner', (type) => {
    const c = { ...base, type };
    const atLimit = checkTolerance(c, [{ quantity: 1050, date: base.needDate }]);
    expect(atLimit).toMatchObject({ within: true, overQty: false });
    expect(atLimit.findings).toEqual([{ kind: 'overWithin', needsApproval: false, qty: 50, pct: 5, limit: 5 }]);
    const beyond = checkTolerance(c, [{ quantity: 1051, date: base.needDate }]);
    expect(beyond).toMatchObject({ within: false, overQty: true });
    expect(beyond.findings).toEqual([{ kind: 'overBeyond', needsApproval: true, qty: 51, pct: 5.1, limit: 5 }]);
  });

  it('the 5% boundary is exact on quantities where 1.05 is not (no floating-point drift)', () => {
    // 15,000 × 1.05 in floating point is 15750.000000000002; the rule must not
    // depend on that.
    expect(checkTolerance({ ...base, quantity: 15000 }, [{ quantity: 15750, date: base.needDate }]).within).toBe(true);
    expect(checkTolerance({ ...base, quantity: 15000 }, [{ quantity: 15751, date: base.needDate }]).within).toBe(false);
  });

  it('any shortfall is a visible partial: accepted, flagged short, never a reason to wait', () => {
    const one = checkTolerance(base, [{ quantity: 999, date: base.needDate }]);
    expect(one).toMatchObject({ within: true, short: true, overQty: false });
    expect(one.findings).toEqual([{ kind: 'short', needsApproval: false, qty: 1, pct: 0.1 }]);
    const jit: CallOff = { ...base, type: 'jit' };
    const half = checkTolerance(jit, [{ quantity: 500, date: base.needDate }]);
    expect(half).toMatchObject({ within: true, short: true });
    // …and the requested quantity is not short.
    expect(checkTolerance(base, [{ quantity: 1000, date: base.needDate }]).short).toBe(false);
  });

  it('a later date ALWAYS goes to the planner — one day is enough', () => {
    const late = checkTolerance(base, [{ quantity: 1000, date: '2026-09-11' }]);
    expect(late).toMatchObject({ within: false, late: true });
    expect(late.findings).toEqual([{ kind: 'late', needsApproval: true, days: 1, date: '2026-09-11' }]);
    expect(checkTolerance(base, [{ quantity: 1000, date: base.needDate }])).toMatchObject({ within: true, late: false });
  });

  it('an earlier date goes to the planner while the early allowance is the placeholder 0 days (BL-56)', () => {
    const early = checkTolerance(base, [{ quantity: 1000, date: '2026-09-09' }]);
    expect(early).toMatchObject({ within: false, early: true });
    expect(early.findings).toEqual([{ kind: 'early', needsApproval: true, days: 1, date: '2026-09-09', limit: 0 }]);
  });

  it('the early allowance is honoured when BL-56 sets one: inside it accepted, one day past it not', () => {
    const tol = { ...callOffTolerance(), earlyDays: 2 };
    const inside = checkTolerance(base, [{ quantity: 1000, date: '2026-09-08' }], tol);
    expect(inside).toMatchObject({ within: true, early: false });
    expect(inside.findings).toEqual([{ kind: 'early', needsApproval: false, days: 2, date: '2026-09-08', limit: 2 }]);
    expect(checkTolerance(base, [{ quantity: 1000, date: '2026-09-07' }], tol)).toMatchObject({ within: false, early: true });
  });

  it('the requested quantity on the need date is accepted and says so', () => {
    const c = checkTolerance(base, [{ quantity: 1000, date: base.needDate }]);
    expect(c).toMatchObject({ within: true, overQty: false, short: false, early: false, late: false });
    expect(c.findings).toEqual([{ kind: 'asRequested', needsApproval: false }]);
  });

  it('a short split with one later delivery: partial AND later — the later date decides', () => {
    const c = checkTolerance(base, [
      { quantity: 600, date: '2026-09-10' },
      { quantity: 300, date: '2026-09-17' },
    ]);
    expect(c).toMatchObject({ within: false, short: true, late: true });
    expect(c.findings.map((f) => f.kind)).toEqual(['short', 'late']);
  });

  it('confirmedShortfall reads the answer against the released quantity; 0 before an answer', () => {
    const answered = (quantity: number): CallOff => ({
      ...base,
      status: 'Confirmed with Changes',
      confirmation: { kind: 'changes', deliveries: [{ quantity, date: base.needDate }], confirmedAt: 'x', approval: 'auto' },
    });
    expect(confirmedShortfall(answered(900))).toBe(100);
    expect(confirmedShortfall(answered(1050))).toBe(0);
    expect(confirmedShortfall(base)).toBe(0);
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

describe('BL-47 · every seeded confirmation stores the verdict CR-05 gives it today', () => {
  // A stored `approval` is decided once, when the supplier answers. A seed
  // written under the old rule would keep claiming `auto` for an answer the
  // revised rule sends to the planner — CO-2026-0005 did (+10% on a JIT
  // call-off) until BL-47. `approved` means the rule said "needs approval".
  const disagreeing = (rows: readonly CallOff[]) =>
    rows
      .filter((c) => c.confirmation)
      .filter((c) => (c.confirmation!.approval === 'auto') !== checkTolerance(c, c.confirmation!.deliveries).within)
      .map((c) => c.id);

  it('population control: named confirmations of both verdicts are in the seed', () => {
    const answered = CALL_OFF_SEED.filter((c) => c.confirmation).map((c) => c.id);
    expect(answered).toContain('co-0005'); // auto
    expect(answered).toContain('co-0004'); // awaiting
  });

  it('no seeded confirmation disagrees with the rule', () => {
    expect(disagreeing(CALL_OFF_SEED)).toEqual([]);
  });

  it('known-bad: the pre-BL-47 CO-2026-0005 (+10% stored as auto) is caught by name', () => {
    const stale = CALL_OFF_SEED.map((c) =>
      c.id === 'co-0005'
        ? { ...c, confirmation: { ...c.confirmation!, deliveries: [{ quantity: 11000, date: c.needDate }] } }
        : c,
    );
    expect(disagreeing(stale)).toEqual(['co-0005']);
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
    // ⚠️ GREW AT BL-47: 0014 (+5.1%) and 0016 (earlier date) are the demo rows
    // for the two CR-05 cases that wait for the planner and had no example.
    expect(views.filter((v) => v.confirmation === 'Awaiting Approval').map((v) => v.callOff.callOffNumber)).toEqual([
      'CO-2026-0004',
      'CO-2026-0010',
      'CO-2026-0014',
      'CO-2026-0016',
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

  // ── BL-47 · each CR-05 case, pinned by NAMED call-off through its derived rule
  it('exactly +5% is accepted on BOTH types: CO-2026-0005 (JIT) and CO-2026-0017 (forecast)', () => {
    for (const n of ['CO-2026-0005', 'CO-2026-0017']) {
      const v = byNumber(n);
      expect(v.tolerance?.findings).toEqual([expect.objectContaining({ kind: 'overWithin', pct: 5, needsApproval: false })]);
      expect(v.tolerance?.within).toBe(true);
      expect(v.callOff.confirmation?.approval).toBe('auto');
    }
    expect(byNumber('CO-2026-0005').callOff.type).toBe('jit');
    expect(byNumber('CO-2026-0017').callOff.type).toBe('forecast');
  });

  it('+5.1% waits for the planner: CO-2026-0014', () => {
    const v = byNumber('CO-2026-0014');
    expect(v.tolerance?.findings).toEqual([expect.objectContaining({ kind: 'overBeyond', pct: 5.1, needsApproval: true })]);
    expect(v.confirmation).toBe('Awaiting Approval');
  });

  it('a shortfall is a visible partial, accepted: CO-2026-0015', () => {
    const v = byNumber('CO-2026-0015');
    expect(v.tolerance?.findings).toEqual([expect.objectContaining({ kind: 'short', qty: 600, needsApproval: false })]);
    expect(v.shortfall).toBe(600);
    expect(v.confirmation).toBe('Confirmed with Changes');
  });

  it('a later date waits for the planner: CO-2026-0004; an earlier one too: CO-2026-0016', () => {
    expect(byNumber('CO-2026-0004').tolerance?.findings).toEqual([
      expect.objectContaining({ kind: 'late', days: 2, needsApproval: true }),
    ]);
    expect(byNumber('CO-2026-0016').tolerance?.findings).toEqual([
      expect.objectContaining({ kind: 'early', days: 4, limit: 0, needsApproval: true }),
    ]);
  });

  // ── BL-49 · release against remaining, on the seeded lines ─────────────────
  it('li-024a: draft CO-2026-0019 fits the remaining quantity exactly; draft CO-2026-0018 does not', () => {
    const line = { id: 'li-024a', quantity: 60000, unitPrice: 1600 };
    const all = views.map((v) => v.callOff);
    expect(umbrellaRemaining(line, all).remainingQty).toBe(37000);
    expect(releaseCheck(byNumber('CO-2026-0019').callOff.quantity, line, all, 'co-0019')).toMatchObject({
      basis: 'quantity',
      exceeds: false,
    });
    expect(releaseCheck(byNumber('CO-2026-0018').callOff.quantity, line, all, 'co-0018')).toMatchObject({
      basis: 'quantity',
      exceeds: true,
    });
  });

  it('li-028a has no quantity: released CO-2026-0020 counts against VALUE, and draft CO-2026-0021 is refused on value', () => {
    const line = { id: 'li-028a', quantity: 0, unitPrice: 2_200_000, valueLimit: 500_000_000 };
    const all = views.map((v) => v.callOff);
    expect(umbrellaRemaining(line, all)).toMatchObject({ basis: 'value', remainingQty: null, remainingValue: 280_000_000 });
    expect(releaseCheck(byNumber('CO-2026-0021').callOff.quantity, line, all, 'co-0021')).toMatchObject({
      basis: 'value',
      exceeds: true,
      requestedValue: 330_000_000,
    });
  });
});
