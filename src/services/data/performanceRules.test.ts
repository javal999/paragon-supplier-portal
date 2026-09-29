// ────────────────────────────────────────────────────────────────────────────
// Performance rules (REQ-E10-01; CR-06 to CR-08, CR-17; REQ-E07-02 BR-07) —
// the pure derivations, each probed with a known-good AND a known-bad input.
//
// The boundaries are asserted ON the boundary and one step either side, because
// every one of them is a threshold somebody will read back off the screen: the
// grade bands at 90 / 80 / 70, the target status at 90 and at 80, and the
// period edge at its first and last day.
// ────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import type { ASN, CallOff, PurchaseOrder } from './types';
import { ChannelType, POStatus } from './types';
import type { GoodsReceipt } from '../../data/mockGoodsReceipts';
import { callOffViews } from '../transitions/callOffRules';
import {
  GRADE_BANDS,
  OTIF_TARGET_PCT,
  REJECTION_PENALTY_POINTS,
  assessmentScore,
  cfotAggregate,
  gradeFor,
  inPeriod,
  otifAggregate,
  performanceStatus,
  periodStart,
  poCfot,
  rejectionCounts,
  supplierMeasure,
  type PerformanceInput,
} from './performanceRules';

const NOW = '2026-09-30T12:00:00.000Z';

const callOff = (over: Partial<CallOff> = {}): CallOff => ({
  id: 'co-t1',
  callOffNumber: 'CO-T-1',
  poId: 'po-t',
  poNumber: 'PO-T',
  poLineId: 'li-t',
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
  status: 'Confirmed',
  releasedAt: '2026-09-07T02:00:00.000Z',
  confirmation: {
    kind: 'confirm',
    deliveries: [{ quantity: 1000, date: '2026-09-10' }],
    confirmedAt: '2026-09-07T03:00:00.000Z',
    approval: 'auto',
  },
  dispatches: [],
  notes: [],
  ...over,
});

const receipt = (
  date: string,
  quantity: number,
  over: Partial<GoodsReceipt> = {},
  materialCode = 'PK-PETB-8801',
): GoodsReceipt => ({
  id: `gr-${date}-${quantity}`,
  grNumber: `GR-${date}-${quantity}`,
  asnId: 'shp-t',
  asnNumber: 'ASN-T',
  poNumber: 'PO-T',
  supplierId: 'sup-007',
  supplierName: 'PT Sample Packaging Indonesia',
  receivedDate: date,
  receivedBy: 'Warehouse',
  status: 'Approved',
  inspectionResults: [
    {
      materialCode,
      description: 'PET bottle',
      qtyExpected: quantity,
      qtyReceived: quantity,
      qtyAccepted: quantity,
      qtyRejected: 0,
      visualCheck: 'Pass',
      packagingCheck: 'Pass',
    },
  ],
  disposition: 'Accept',
  ...over,
});

const po = (over: Partial<PurchaseOrder> = {}): PurchaseOrder => ({
  id: 'po-t',
  poNumber: 'PO-T',
  supplierId: 'sup-007',
  supplierName: 'PT Sample Packaging Indonesia',
  status: POStatus.CONFIRMED,
  channel: ChannelType.WEB,
  currency: 'IDR',
  totalValue: 1_600_000,
  orderDate: '2026-09-01',
  requestedDeliveryDate: '2026-09-10',
  confirmedDeliveryDate: '2026-09-10',
  daysOverdue: 0,
  acknowledgmentTimeHours: 2,
  lineItems: [
    {
      id: 'li-t',
      materialCode: 'PK-PETB-8801',
      description: 'PET bottle',
      quantity: 1000,
      uom: 'PCS',
      unitPrice: 1600,
      confirmedQty: 1000,
    },
  ],
  ...over,
});

const input = (over: Partial<PerformanceInput> = {}): PerformanceInput => ({
  callOffs: [],
  asns: [] as ASN[],
  receipts: [],
  purchaseOrders: [],
  ...over,
});

const otifOf = (callOffs: CallOff[], receipts: GoodsReceipt[], period: '30d' | '90d' | 'ytd' = '90d') =>
  otifAggregate(callOffViews(callOffs, [], receipts, NOW), period, NOW);

describe('REQ-E10-01 BR-08 · the period is a real window', () => {
  it('30d, 90d and YTD start where they say they do, and the window ends today', () => {
    expect(periodStart('30d', NOW)).toBe('2026-08-31');
    expect(periodStart('90d', NOW)).toBe('2026-07-02');
    expect(periodStart('ytd', NOW)).toBe('2026-01-01');
  });

  it('the first and last day are INSIDE; the day before and a future day are not', () => {
    expect(inPeriod('2026-08-31', '30d', NOW)).toBe(true); // first day
    expect(inPeriod('2026-09-30', '30d', NOW)).toBe(true); // today
    expect(inPeriod('2026-08-30', '30d', NOW)).toBe(false); // one day too early
    expect(inPeriod('2026-10-01', '30d', NOW)).toBe(false); // still in the future
    expect(inPeriod('', '30d', NOW)).toBe(false);
  });
});

describe('CR-17 · target status and the grade bands', () => {
  it('the target is 90 and the near band reaches down to 80', () => {
    expect(OTIF_TARGET_PCT).toBe(90);
    expect(performanceStatus(90)).toBe('meeting'); // ON the target
    expect(performanceStatus(89)).toBe('near');
    expect(performanceStatus(80)).toBe('near'); // ON the near edge
    expect(performanceStatus(79)).toBe('missing');
  });

  it('nothing measured has NO status — never "missing"', () => {
    expect(performanceStatus(null)).toBeNull();
  });

  it('the band table is A 90 · B 80 · C 70 · D, and the letters land ON each edge', () => {
    expect(GRADE_BANDS.map((b) => `${b.grade}${b.min}`)).toEqual(['A90', 'B80', 'C70', 'D0']);
    expect(gradeFor(90)).toBe('A');
    expect(gradeFor(89)).toBe('B');
    expect(gradeFor(80)).toBe('B');
    expect(gradeFor(79)).toBe('C');
    expect(gradeFor(70)).toBe('C');
    expect(gradeFor(69)).toBe('D');
    expect(gradeFor(0)).toBe('D');
  });

  it('no score means no grade — "No history", never a D', () => {
    expect(gradeFor(null)).toBeNull();
  });
});

describe('REQ-E10-01 BR-06 · OTIF aggregated over the call-offs due in the period', () => {
  it('on time and in full is 100%; late is 0%; short is 0%', () => {
    expect(otifOf([callOff()], [receipt('2026-09-10', 1000)]).pct).toBe(100);
    expect(otifOf([callOff()], [receipt('2026-09-11', 1000)]).pct).toBe(0);
    expect(otifOf([callOff()], [receipt('2026-09-09', 999)]).pct).toBe(0);
  });

  it('one of two met is 50%, and the denominator is what was MEASURED', () => {
    const rows = [
      callOff(),
      callOff({
        id: 'co-t2',
        callOffNumber: 'CO-T-2',
        needDate: '2026-09-12',
        confirmation: {
          kind: 'confirm',
          deliveries: [{ quantity: 1000, date: '2026-09-12' }],
          confirmedAt: 'x',
          approval: 'auto',
        },
      }),
    ];
    const agg = otifOf(rows, [receipt('2026-09-10', 1000), receipt('2026-09-13', 1000)]);
    expect(agg.pct).toBe(50);
    expect(agg.measured).toBe(2);
    expect(agg.met).toBe(1);
  });

  it('NO DATA IS NULL, NOT ZERO — and a still-open delivery is counted as pending, not as a miss', () => {
    expect(otifOf([], []).pct).toBeNull();
    const notYetDue = callOff({
      needDate: '2026-09-29',
      confirmation: {
        kind: 'confirm',
        deliveries: [{ quantity: 1000, date: '2026-09-29' }],
        confirmedAt: 'x',
        approval: 'auto',
      },
    });
    const agg = otifOf([notYetDue], []);
    expect(agg.pct).toBeNull();
    expect(agg.pending).toBe(1);
    expect(agg.measured).toBe(0);
  });

  it('a call-off due OUTSIDE the period is excluded — the same data reads differently per period', () => {
    const rows = [callOff()]; // due 2026-09-10
    expect(otifOf(rows, [receipt('2026-09-10', 1000)], '90d').measured).toBe(1);
    // 30d starts 2026-08-31, so this one is still in. Push it out of the window:
    const old = callOff({
      needDate: '2026-07-10',
      confirmation: {
        kind: 'confirm',
        deliveries: [{ quantity: 1000, date: '2026-07-10' }],
        confirmedAt: 'x',
        approval: 'auto',
      },
    });
    expect(otifOf([old], [receipt('2026-07-10', 1000)], '90d').measured).toBe(1);
    expect(otifOf([old], [receipt('2026-07-10', 1000)], '30d').measured).toBe(0);
    expect(otifOf([old], [receipt('2026-07-10', 1000)], '30d').pct).toBeNull();
  });
});

describe('REQ-E10-01 BR-05 · CFOT per purchase order', () => {
  it('everything confirmed and received by the confirmed date is 100%', () => {
    expect(poCfot(po(), [receipt('2026-09-10', 1000)])!.pct).toBe(100);
  });

  it('a PARTIAL delivery scores the share that arrived', () => {
    const r = poCfot(po(), [receipt('2026-09-10', 400)])!;
    expect(r.deliveredOnTimeQty).toBe(400);
    expect(r.pct).toBe(40);
  });

  it('a LATE delivery scores nothing — it did not arrive BY the confirmed date', () => {
    expect(poCfot(po(), [receipt('2026-09-11', 1000)])!.pct).toBe(0);
  });

  it('an over-delivery cannot score above what was confirmed', () => {
    const r = poCfot(po(), [receipt('2026-09-10', 5000)])!;
    expect(r.deliveredOnTimeQty).toBe(1000);
    expect(r.pct).toBe(100);
  });

  it('another material on the same order does not fill this line', () => {
    expect(poCfot(po(), [receipt('2026-09-10', 1000, {}, 'RM-OTHER')])!.pct).toBe(0);
  });

  it('a REJECTED order confirms nothing, so its CFOT is 0', () => {
    const rejected = po({
      status: POStatus.REJECTED,
      response: { option: 'reject', respondedAt: '2026-09-02T02:00:00.000Z', rejectionCauses: ['date'] },
    });
    const r = poCfot(rejected, [receipt('2026-09-10', 1000)])!;
    expect(r.confirmedQty).toBe(0);
    expect(r.pct).toBe(0);
  });

  it('an ACCEPTED counter-offer moves both the date and the quantity CFOT is measured against', () => {
    const adjusted = po({
      status: POStatus.CONFIRMED,
      response: {
        option: 'adjust',
        respondedAt: '2026-09-02T02:00:00.000Z',
        lines: [{ lineId: 'li-t', reasonCode: 'capacity', counterQty: 600, counterDate: '2026-09-14' }],
        review: { decision: 'accepted', reviewedAt: '2026-09-03T02:00:00.000Z' },
      },
    });
    const r = poCfot(adjusted, [receipt('2026-09-14', 600)])!;
    expect(r.confirmedQty).toBe(600);
    expect(r.deliveredOnTimeQty).toBe(600);
    expect(r.pct).toBe(60); // 600 of the 1000 ORDERED (BR-05 divides by PO quantity)
  });

  it('an order with no quantity is not measurable at all', () => {
    expect(poCfot(po({ lineItems: [] }), [])).toBeNull();
  });

  it('aggregated: only orders due in the period, and NO orders means null rather than 0%', () => {
    const inWindow = po();
    const outOfWindow = po({ id: 'po-old', poNumber: 'PO-OLD', confirmedDeliveryDate: '2026-02-10' });
    expect(cfotAggregate([inWindow], [receipt('2026-09-10', 1000)], '90d', NOW).measured).toBe(1);
    expect(cfotAggregate([outOfWindow], [], '90d', NOW).measured).toBe(0);
    expect(cfotAggregate([outOfWindow], [], '90d', NOW).pct).toBeNull();
    expect(cfotAggregate([outOfWindow], [], 'ytd', NOW).measured).toBe(1);
  });
});

describe('REQ-E10-01 BR-04 / REQ-E07-02 BR-07 · rejections count in the assessment', () => {
  it('order rejections and call-off rejections are counted separately and together', () => {
    const rejectedPo = po({
      status: POStatus.REJECTED,
      response: { option: 'reject', respondedAt: '2026-09-02T02:00:00.000Z', rejectionCauses: ['quantity'] },
    });
    const rejectedCallOff = callOff({ id: 'co-r', status: 'Rejected', confirmation: undefined });
    const counts = rejectionCounts([rejectedPo], [rejectedCallOff], '90d', NOW);
    expect(counts).toEqual({ purchaseOrders: 1, callOffs: 1, total: 2 });
  });

  it('a rejection outside the period does not count', () => {
    const oldRejection = po({
      status: POStatus.REJECTED,
      response: { option: 'reject', respondedAt: '2026-02-02T02:00:00.000Z', rejectionCauses: ['quantity'] },
    });
    expect(rejectionCounts([oldRejection], [], '90d', NOW).total).toBe(0);
    expect(rejectionCounts([oldRejection], [], 'ytd', NOW).total).toBe(1);
  });

  it('an approved order is not a rejection', () => {
    const approved = po({
      response: { option: 'approve', respondedAt: '2026-09-02T02:00:00.000Z' },
    });
    expect(rejectionCounts([approved], [callOff()], '90d', NOW).total).toBe(0);
  });
});

describe('the assessment score and the supplier measure', () => {
  it('the score is the mean of what was measured, less the stated penalty per rejection', () => {
    expect(assessmentScore(100, 80, 0)).toBe(90);
    expect(assessmentScore(100, 80, 1)).toBe(90 - REJECTION_PENALTY_POINTS);
    expect(assessmentScore(100, null, 0)).toBe(100); // only OTIF measured
    expect(assessmentScore(null, 60, 0)).toBe(60); // only CFOT measured
  });

  it('Material B3 · AC-03: weight 0.10, a delivery score of 90 and 50% update compliance give 86', () => {
    expect(assessmentScore(90, 90, 0, 50, 0.1)).toBe(86);
    // The weight in force is `compliance.scoreWeight` (0.10 at release).
    expect(assessmentScore(90, 90, 0, 50)).toBe(86);
  });

  it('Material B3 · BR-05: "No history" for compliance weighs 0; edge case 4: weight 0 leaves the score as it was', () => {
    expect(assessmentScore(90, 90, 0, null)).toBe(90);
    expect(assessmentScore(90, 90, 0, 0, 0)).toBe(90);
    // Compliance alone never makes a score.
    expect(assessmentScore(null, null, 0, 100)).toBeNull();
  });

  it('Material B3 · supplierMeasure blends the compliance the input carries, and carries it on the measure', () => {
    const compliance = { supplierId: 'sup-007', pct: 50, weeks: [] };
    const base = input({ callOffs: [callOff()], receipts: [receipt('2026-09-10', 1000)], purchaseOrders: [po()] });
    const m = supplierMeasure('sup-007', { ...base, updateCompliance: () => compliance }, '90d', NOW);
    expect(m.score).toBe(95); // 0.9 × 100 + 0.1 × 50
    expect(m.updateCompliance).toBe(compliance);
    expect(supplierMeasure('sup-007', base, '90d', NOW).score).toBe(100);
  });

  it('the score never goes below 0 or above 100', () => {
    expect(assessmentScore(10, 10, 20)).toBe(0);
    expect(assessmentScore(100, 100, 0)).toBe(100);
  });

  it('NOTHING MEASURED IS NULL — that is what every surface renders as "No history"', () => {
    expect(assessmentScore(null, null, 3)).toBeNull();
    const m = supplierMeasure('sup-nobody', input(), '90d', NOW);
    expect(m.otif.pct).toBeNull();
    expect(m.cfot.pct).toBeNull();
    expect(m.score).toBeNull();
    expect(m.grade).toBeNull();
    expect(m.noHistory).toBe(true);
  });

  it('a supplier with a perfect delivery and a perfect order grades A, and a rejection pulls it down', () => {
    const clean = supplierMeasure(
      'sup-007',
      input({ callOffs: [callOff()], receipts: [receipt('2026-09-10', 1000)], purchaseOrders: [po()] }),
      '90d',
      NOW,
    );
    expect(clean.otif.pct).toBe(100);
    expect(clean.cfot.pct).toBe(100);
    expect(clean.score).toBe(100);
    expect(clean.grade).toBe('A');
    expect(clean.noHistory).toBe(false);

    const withRejections = supplierMeasure(
      'sup-007',
      input({
        callOffs: [callOff(), callOff({ id: 'co-r', status: 'Rejected', confirmation: undefined })],
        receipts: [receipt('2026-09-10', 1000)],
        purchaseOrders: [po()],
      }),
      '90d',
      NOW,
    );
    expect(withRejections.rejections.callOffs).toBe(1);
    expect(withRejections.score).toBe(100 - REJECTION_PENALTY_POINTS);
    expect(withRejections.grade).toBe('A'); // 95 is still inside the A band
  });

  it('another supplier’s deliveries never reach this supplier’s measure', () => {
    const m = supplierMeasure(
      'sup-999',
      input({ callOffs: [callOff()], receipts: [receipt('2026-09-10', 1000)], purchaseOrders: [po()] }),
      '90d',
      NOW,
    );
    expect(m.noHistory).toBe(true);
  });
});
