// ────────────────────────────────────────────────────────────────────────────
// AIB-3 (BL-351) — the missing-ASN chase, PURE.
//
// The rule under test (SC-HUB-ASN-INBOUND-REQUIREMENTS-2026-11, AIB-3 BR-01 /
// AIB-D6, [Owner, 2026-11-18, BL-335]):
//   · the chase fires on the NEXT WORKING DAY after the call-off is sent, once;
//   · it clears when the supplier's ASNs cover the call-off — a partial ASN
//     keeps it (edge case, [Proposed]);
//   · a call-off never sent, or rejected, raises none;
//   · the planner's closure removes it and it never re-opens;
//   · receipts and missed deliveries close it by fact (this batch's call).
//
// Dates are chosen around the seeded hub-calendar ruling: ADM made Friday
// 4 September 2026 non-working, so the worked examples below use the following
// weeks, where no ruling applies.
// ────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
/** @import { ASN, CallOff, GoodsReceipt } from '../data/types' */
import {
  CHASE_WORKING_DAYS,
  callOffChaseRow,
  callOffChaseRows,
  chaseCoverage,
  chaseDueAt,
  chaseObligation
} from './callOffChase';
import { workingCalendarStore } from './workingCalendarStore';
import { NO_PERSON } from '@context/noPerson';

/** Friday 11 September 2026, 09:00 WIB — the sent instant of the base call-off. */
const SENT_FRI = '2026-09-11T02:00:00.000Z';
/** Monday 14 September 2026, 09:00 WIB — the chase fired. */
const DUE_MON = '2026-09-14T02:00:00.000Z';

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
  uom: 'KG',
  unitPrice: 1,
  currency: 'IDR',
  quantity: 1000,
  needDate: '2026-09-25',
  type: 'forecast',
  status: 'Confirmed',
  releasedAt: SENT_FRI,
  confirmation: {
    kind: 'confirm',
    deliveries: [{ quantity: 1000, date: '2026-09-25' }],
    confirmedAt: '2026-09-11T03:00:00.000Z',
    approval: 'auto'
  },
  dispatches: [],
  notes: [],
  ...over
});

/**
 * @param {Partial<ASN>} [over]
 * @returns {ASN}
 */
const asn = (over = {}) => ({
  asnNumber: 'ASN-T-1',
  supplierId: 'sup-t',
  poReference: 'PO-T-1',
  status: 'Submitted',
  carrier: 'Sample',
  trackingNumber: 'TRK-1',
  eta: '2026-09-24',
  callOffId: 'co-t1',
  details: {
    originCity: 'Bekasi, ID',
    destinationWarehouse: 'Paragon Plant J6',
    totalCartons: 1,
    grossWeightKg: 1,
    temperatureRequirement: 'Ambient'
  },
  lineItems: [
    {
      materialCode: 'MAT-A',
      description: 'Material A',
      orderedQty: 1000,
      shippedQty: 1000,
      lotNumber: 'LOT-1',
      uom: 'KG'
    }
  ],
  ...over
});

/**
 * @param {number} shippedQty
 * @param {Partial<ASN>} [over]
 * @returns {ASN}
 */
const asnOf = (shippedQty, over = {}) =>
  asn({
    lineItems: [
      {
        materialCode: 'MAT-A',
        description: 'Material A',
        orderedQty: shippedQty,
        shippedQty,
        lotNumber: 'LOT-1',
        uom: 'KG'
      }
    ],
    ...over
  });

/**
 * @param {Partial<GoodsReceipt>} [over]
 * @returns {GoodsReceipt}
 */
const receipt = (over = {}) => ({
  id: 'gr-t1',
  grNumber: 'GR-T-1',
  asnId: '',
  asnNumber: '',
  poNumber: 'PO-T-1',
  supplierId: 'sup-t',
  supplierName: 'Sample Supplier',
  receivedDate: '2026-09-25',
  receivedBy: 'Warehouse Supervisor',
  status: 'Posted to SAP',
  inspectionResults: [
    {
      materialCode: 'MAT-A',
      description: 'Material A',
      qtyExpected: 1000,
      qtyReceived: 1000,
      qtyAccepted: 1000,
      qtyRejected: 0,
      visualCheck: 'Pass',
      packagingCheck: 'Pass'
    }
  ],
  disposition: 'Accept',
  ...over
});

/**
 * @param {readonly CallOff[]} callOffs
 * @param {readonly ASN[]} [asns]
 * @param {readonly GoodsReceipt[]} [receipts]
 * @param {string} [nowIso]
 */
const rows = (callOffs, asns = [], receipts = [], nowIso = DUE_MON) =>
  callOffChaseRows(callOffs, asns, receipts, [], nowIso);

beforeEach(() => {
  workingCalendarStore.reset();
});

describe('AIB-3 BR-01 — when the chase fires', () => {
  it('one working day after the call-off is sent: Friday 09:00 → Monday 09:00 WIB', () => {
    expect(CHASE_WORKING_DAYS).toBe(1);
    expect(chaseDueAt(callOff())).toBe(DUE_MON);
    // Thursday 09:00 → Friday 09:00.
    expect(chaseDueAt(callOff({ releasedAt: '2026-09-10T02:00:00.000Z' }))).toBe(SENT_FRI);
  });

  it('reads the hub calendar the administrator maintains — a ruled non-working Friday moves the chase', () => {
    // ADM rules Friday 18 September non-working: Thursday's chase lands Monday.
    workingCalendarStore.append({
      date: '2026-09-18',
      kind: 'non-working',
      reason: 'Sample ruling',
      setBy: NO_PERSON,
      setAt: '2026-09-17T00:00:00.000Z'
    });
    expect(chaseDueAt(callOff({ releasedAt: '2026-09-17T02:00:00.000Z' }))).toBe(
      '2026-09-21T02:00:00.000Z'
    );
  });

  it('is not due before the firing day, and is open on it', () => {
    expect(rows([callOff()], [], [], '2026-09-11T10:00:00.000Z')[0].state).toBe('notDue');
    expect(rows([callOff()], [], [], '2026-09-14T01:59:00.000Z')[0].state).toBe('notDue');
    expect(rows([callOff()], [], [], DUE_MON)[0].state).toBe('open');
    expect(rows([callOff()], [], [], '2026-09-16T02:00:00.000Z')[0].state).toBe('open');
  });

  it('a call-off with no release raises no chase (never sent)', () => {
    expect(rows([callOff({ releasedAt: undefined, status: 'Draft' })])).toEqual([]);
  });

  it('a draft or a rejected call-off raises no chase — the supplier declined it', () => {
    expect(rows([callOff({ status: 'Draft' })])).toEqual([]);
    expect(
      rows([
        callOff({ status: 'Rejected', confirmation: undefined, rejectionReason: 'No capacity' })
      ])
    ).toEqual([]);
  });
});

describe('AIB-3 BR-04 — an ASN clears the chase; a partial one does not', () => {
  it('coverage counts the shipped quantity on LINKED, shipped ASNs only', () => {
    expect(chaseCoverage(callOff(), [asn()])).toBe(1000);
    // A draft never left; a cancelled one never will.
    expect(chaseCoverage(callOff(), [asn({ status: 'Draft' })])).toBe(0);
    expect(chaseCoverage(callOff(), [asn({ status: 'Cancelled' })])).toBe(0);
    // Linked to another call-off, or another material, is not this call-off's coverage.
    expect(chaseCoverage(callOff(), [asn({ callOffId: 'co-other' })])).toBe(0);
    expect(
      chaseCoverage(callOff(), [
        asn({
          lineItems: [
            {
              materialCode: 'MAT-B',
              description: 'B',
              orderedQty: 1000,
              shippedQty: 1000,
              lotNumber: 'L',
              uom: 'KG'
            }
          ]
        })
      ])
    ).toBe(0);
  });

  it('the obligation is the agreed total — the confirmed deliveries after an answer', () => {
    expect(chaseObligation(callOff())).toBe(1000);
    expect(
      chaseObligation(
        callOff({
          confirmation: {
            kind: 'changes',
            deliveries: [{ quantity: 10500, date: '2026-09-25' }],
            confirmedAt: '2026-09-11T03:00:00.000Z',
            approval: 'auto'
          }
        })
      )
    ).toBe(10500);
  });

  it('a full ASN covers it and the line clears; a partial ASN keeps the chase open', () => {
    const [open] = rows([callOff()], [asnOf(400)]);
    expect(open.state).toBe('open');
    expect(open.coverage).toBe(400);
    expect(open.obligation).toBe(1000);
    expect(rows([callOff()], [asn()])[0].state).toBe('covered');
    // Two ASNs that together cover it also clear it.
    expect(rows([callOff()], [asnOf(400), asnOf(600, { asnNumber: 'ASN-T-2' })])[0].state).toBe(
      'covered'
    );
  });

  it('a chase that fired stays visible once the ASN arrives, as `covered` — not as a second chase', () => {
    const [row] = rows([callOff()], [asn()], [], '2026-09-16T02:00:00.000Z');
    expect(row.state).toBe('covered');
  });
});

describe('UCX-P3 (BL-364) — a draft is not a shipment: the chase waits for the submit', () => {
  it('a Draft ASN leaves the call-off on the chase list; submitting it covers it', () => {
    const draft = asn({ status: 'Draft' });
    expect(chaseCoverage(callOff(), [draft])).toBe(0);
    expect(rows([callOff()], [draft], [], DUE_MON)[0].state).toBe('open');
    const submitted = asn({ status: 'Submitted' });
    expect(chaseCoverage(callOff(), [submitted])).toBe(1000);
    expect(rows([callOff()], [submitted], [], DUE_MON)[0].state).toBe('covered');
  });
});

describe('AIB-3 BR-01 — the planner closes it once', () => {
  it('a closure closes the row and it never re-opens, whatever the ASN does', () => {
    const closure = {
      callOffId: 'co-t1',
      reason: 'Supplier promised the ASN by phone',
      closedAt: '2026-09-15T02:00:00.000Z',
      closedBy: NO_PERSON
    };
    const all = callOffChaseRows([callOff()], [], [], [closure], DUE_MON);
    expect(all[0].state).toBe('closed');
    expect(all[0].closed?.reason).toBe('Supplier promised the ASN by phone');
    // An ASN after the closure does not re-open it.
    const after = callOffChaseRows(
      [callOff()],
      [asn({ status: 'Cancelled' })],
      [],
      [closure],
      DUE_MON
    );
    expect(after[0].state).toBe('closed');
  });

  it('one row per call-off — the chase is keyed by the call-off, not by a send', () => {
    const all = rows([callOff()]);
    expect(all).toHaveLength(1);
    expect(all[0].callOffId).toBe('co-t1');
  });
});

describe('this batch’s call — receipts and missed deliveries close it by fact', () => {
  it('a fully received delivery raises no chase: the goods arrived', () => {
    expect(rows([callOff()], [], [receipt()])).toEqual([]);
  });

  it('a partial receipt keeps the chase: one delivered slot, one still to come', () => {
    const partial = callOff({
      confirmation: {
        kind: 'partial',
        deliveries: [
          { quantity: 600, date: '2026-09-25' },
          { quantity: 400, date: '2026-10-02' }
        ],
        confirmedAt: '2026-09-11T03:00:00.000Z',
        approval: 'approved'
      }
    });
    const [row] = rows(
      [partial],
      [],
      [
        receipt({
          inspectionResults: [
            {
              materialCode: 'MAT-A',
              description: 'Material A',
              qtyExpected: 600,
              qtyReceived: 600,
              qtyAccepted: 600,
              qtyRejected: 0,
              visualCheck: 'Pass',
              packagingCheck: 'Pass'
            }
          ]
        })
      ],
      '2026-09-16T02:00:00.000Z'
    );
    expect(row.state).toBe('open');
    expect(row.coverage).toBe(0);
    expect(row.obligation).toBe(1000);
  });

  it('a missed delivery raises no chase — an ASN past the need date helps nobody', () => {
    const missed = callOff({
      needDate: '2026-08-20',
      releasedAt: '2026-08-14T02:00:00.000Z',
      confirmation: {
        kind: 'confirm',
        deliveries: [{ quantity: 1000, date: '2026-08-20' }],
        confirmedAt: '2026-08-14T03:00:00.000Z',
        approval: 'auto'
      }
    });
    expect(rows([missed], [], [], DUE_MON)).toEqual([]);
  });
});

describe('the list order and the single-row lookup', () => {
  it('oldest chase first, then call-off number', () => {
    const older = callOff({
      id: 'co-b',
      callOffNumber: 'CO-T-0002',
      releasedAt: '2026-09-07T02:00:00.000Z'
    });
    const newer = callOff({ id: 'co-a', callOffNumber: 'CO-T-0001' });
    expect(rows([newer, older]).map((r) => r.callOffId)).toEqual(['co-b', 'co-a']);
  });

  it('looks one call-off up by id, and answers null when it has no chase', () => {
    const one = callOffChaseRow('co-t1', [callOff()], [], [], [], DUE_MON);
    expect(one?.callOffNumber).toBe('CO-T-0001');
    expect(callOffChaseRow('co-nope', [callOff()], [], [], [], DUE_MON)).toBeNull();
  });
});
