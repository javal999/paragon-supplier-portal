// ────────────────────────────────────────────────────────────────────────────
// MR-6 BR-10 / BR-11 — the ASN against its call-off (pure). Each warning is
// fired once and passed once; the figures are asserted, not only the kind.
// ────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
/** @import { ASN, CallOff } from '../data/types' */
/** @import { AsnForCallOffCheck } from './callOffRules' */
import { asnCallOffWarnings, callOffWarnings, unlinkedCallOffWarning } from './callOffRules';

const TOL = { overPct: 5, earlyDays: 0 };

/** @type {CallOff} */
const CALL_OFF = {
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
  unitPrice: 1,
  currency: 'IDR',
  quantity: 1000,
  needDate: '2026-10-10',
  type: 'forecast',
  status: 'Confirmed',
  confirmation: {
    kind: 'confirm',
    deliveries: [{ quantity: 1000, date: '2026-10-10' }],
    confirmedAt: '2026-10-01T03:00:00.000Z',
    approval: 'auto'
  },
  dispatches: [],
  notes: []
};

/**
 * @param {number} qty
 * @param {Partial<AsnForCallOffCheck>} [extra]
 * @returns {AsnForCallOffCheck}
 */
const asnOf = (qty, eta = '2026-10-10', extra = {}) => ({
  asnNumber: '',
  eta,
  shipDate: '2026-10-08',
  poReference: 'PO-T-1',
  callOffId: CALL_OFF.id,
  lineItems: [{ materialCode: 'MAT-A', shippedQty: qty }],
  ...extra
});

/**
 * @param {string} asnNumber
 * @param {number} qty
 * @param {string} shipDate
 * @param {ASN['status']} [status]
 * @returns {ASN}
 */
const shipped = (asnNumber, qty, shipDate, status = 'Submitted') => ({
  asnNumber,
  supplierId: 'sup-t',
  poReference: 'PO-T-1',
  status,
  carrier: 'c',
  trackingNumber: 't',
  eta: shipDate,
  shipDate,
  details: {
    originCity: '',
    destinationWarehouse: '',
    totalCartons: 0,
    grossWeightKg: 0,
    temperatureRequirement: ''
  },
  lineItems: [
    { materialCode: 'MAT-A', description: '', orderedQty: 0, shippedQty: qty, lotNumber: 'L' }
  ],
  callOffId: CALL_OFF.id
});

/** @param {readonly { kind: string }[]} ws */
const kinds = (ws) => ws.map((w) => w.kind);

describe('BR-10 quantity (AC-05) — over by more than callOff.overPct warns, with the figures', () => {
  it('fires: 1,100 against 1,000 is +10% over a 5% allowance', () => {
    const ws = callOffWarnings(CALL_OFF, [], asnOf(1100), TOL);
    expect(ws).toEqual([
      {
        kind: 'qtyOver',
        detail: { callOffNumber: 'CO-T-0001', shipped: 1100, agreed: 1000, pct: 10, limit: 5 }
      }
    ]);
  });

  it('passes: exactly +5% (1,050) is within the allowance', () => {
    expect(callOffWarnings(CALL_OFF, [], asnOf(1050), TOL)).toEqual([]);
  });

  it('earlier shipped ASNs of the call-off count; a cancelled or draft one does not', () => {
    const earlier = [
      shipped('ASN-1', 600, '2026-10-01'),
      shipped('ASN-2', 900, '2026-10-01', 'Cancelled'),
      shipped('ASN-3', 900, '2026-10-01', 'Draft')
    ];
    const ws = callOffWarnings(CALL_OFF, earlier, asnOf(500), TOL);
    expect(ws.find((w) => w.kind === 'qtyOver')?.detail).toMatchObject({
      shipped: 1100,
      agreed: 1000,
      pct: 10
    });
    // Known-good: the same 500 after 400 shipped makes 900, under the 1,000 agreed.
    expect(
      callOffWarnings(CALL_OFF, [shipped('ASN-1', 400, '2026-10-01')], asnOf(500), TOL)
    ).toEqual([]);
  });
});

describe('BR-10 quantity under — only once the ASN is marked final', () => {
  it('fires on the last ASN: 800 of 1,000', () => {
    const ws = callOffWarnings(CALL_OFF, [], asnOf(800, '2026-10-10', { callOffFinal: true }), TOL);
    expect(ws).toEqual([
      {
        kind: 'qtyUnder',
        detail: { callOffNumber: 'CO-T-0001', shipped: 800, agreed: 1000, pct: 20 }
      }
    ]);
  });

  it('passes when the ASN is not final: a part delivery is not a mismatch', () => {
    expect(callOffWarnings(CALL_OFF, [], asnOf(800), TOL)).toEqual([]);
  });
});

describe('BR-10 date — later than the agreed date, or earlier than it minus callOff.earlyAllowanceDays', () => {
  it('fires: an ETA 3 days after the agreed date is late', () => {
    const ws = callOffWarnings(CALL_OFF, [], asnOf(1000, '2026-10-13'), TOL);
    expect(ws).toEqual([
      {
        kind: 'late',
        detail: { callOffNumber: 'CO-T-0001', eta: '2026-10-13', agreedDate: '2026-10-10', days: 3 }
      }
    ]);
  });

  it('passes: an ETA on the agreed date', () => {
    expect(callOffWarnings(CALL_OFF, [], asnOf(1000, '2026-10-10'), TOL)).toEqual([]);
  });

  it('early fires beyond the allowance and passes inside it', () => {
    expect(kinds(callOffWarnings(CALL_OFF, [], asnOf(1000, '2026-10-08'), TOL))).toEqual(['early']);
    expect(
      callOffWarnings(CALL_OFF, [], asnOf(1000, '2026-10-08'), { overPct: 5, earlyDays: 2 })
    ).toEqual([]);
  });

  it('a second delivery is compared with the date of the delivery it fills', () => {
    /** @type {CallOff} */
    const split = {
      ...CALL_OFF,
      status: 'Partially Confirmed',
      confirmation: {
        kind: 'partial',
        deliveries: [
          { quantity: 500, date: '2026-10-10' },
          { quantity: 500, date: '2026-10-20' }
        ],
        confirmedAt: '2026-10-01T03:00:00.000Z',
        approval: 'auto'
      }
    };
    const first = [shipped('ASN-1', 500, '2026-10-08')];
    // ETA 2026-10-15 fills the second delivery (20th): early by 5, not late by 5.
    const ws = callOffWarnings(split, first, asnOf(500, '2026-10-15'), TOL);
    expect(ws).toEqual([
      {
        kind: 'early',
        detail: {
          callOffNumber: 'CO-T-0001',
          eta: '2026-10-15',
          agreedDate: '2026-10-20',
          days: 5,
          limit: 0
        }
      }
    ]);
  });
});

describe('edge case 5 — the agreed deliveries decide, not the original release', () => {
  it('a call-off confirmed with changes to 1,200 is compared with 1,200', () => {
    /** @type {CallOff} */
    const changed = {
      ...CALL_OFF,
      status: 'Confirmed with Changes',
      confirmation: {
        kind: 'changes',
        deliveries: [{ quantity: 1200, date: '2026-10-10' }],
        confirmedAt: '2026-10-01T03:00:00.000Z',
        approval: 'approved'
      }
    };
    // 1,200 against the original 1,000 would be +20%; against the agreed 1,200 it is exact.
    expect(callOffWarnings(changed, [], asnOf(1200), TOL)).toEqual([]);
    expect(callOffWarnings(changed, [], asnOf(1300), TOL)[0].detail).toMatchObject({
      shipped: 1300,
      agreed: 1200
    });
  });

  it('agreedDeliveries (last agreed by both sides) are used when present', () => {
    /** @type {CallOff} */
    const reagreed = {
      ...CALL_OFF,
      status: 'Awaiting Confirmation',
      confirmation: undefined,
      quantity: 2000,
      needDate: '2026-10-30',
      agreedDeliveries: [{ quantity: 1000, date: '2026-10-10' }]
    };
    expect(callOffWarnings(reagreed, [], asnOf(1000, '2026-10-10'), TOL)).toEqual([]);
    expect(kinds(callOffWarnings(reagreed, [], asnOf(1000, '2026-10-12'), TOL))).toEqual(['late']);
  });
});

describe('BR-10 material — an ASN line that is not the call-off material', () => {
  it('fires for the foreign line; passes for the call-off material', () => {
    const ws = callOffWarnings(
      CALL_OFF,
      [],
      asnOf(1000, '2026-10-10', {
        lineItems: [
          { materialCode: 'MAT-A', shippedQty: 1000 },
          { materialCode: 'MAT-B', shippedQty: 5 }
        ]
      }),
      TOL
    );
    expect(ws).toEqual([
      {
        kind: 'material',
        detail: { callOffNumber: 'CO-T-0001', materialCode: 'MAT-B', expectedMaterial: 'MAT-A' }
      }
    ]);
    expect(callOffWarnings(CALL_OFF, [], asnOf(1000), TOL)).toEqual([]);
  });
});

describe('BR-11 (AC-06) — an ASN naming no call-off on a PO line with an open confirmed call-off', () => {
  const line = { id: 'li-t1', materialCode: 'MAT-A' };
  const unlinked = asnOf(1000, '2026-10-10', { callOffId: undefined });

  it('fires: "This PO line has an open call-off; link it?"', () => {
    expect(unlinkedCallOffWarning(line, [CALL_OFF], unlinked)).toEqual({
      kind: 'unlinked',
      detail: { materialCode: 'MAT-A', callOffNumbers: ['CO-T-0001'] }
    });
  });

  it('passes: the ASN names the call-off, or the only call-off on the line is not confirmed', () => {
    expect(unlinkedCallOffWarning(line, [CALL_OFF], asnOf(1000))).toBeNull();
    expect(
      unlinkedCallOffWarning(line, [{ ...CALL_OFF, status: 'Awaiting Confirmation' }], unlinked)
    ).toBeNull();
  });

  it('asnCallOffWarnings reads "open" from the projection: a delivered call-off is not offered', () => {
    expect(
      kinds(asnCallOffWarnings(unlinked, [{ callOff: CALL_OFF, delivery: 'notDue' }], [], TOL))
    ).toEqual(['unlinked']);
    expect(
      asnCallOffWarnings(unlinked, [{ callOff: CALL_OFF, delivery: 'deliveredOnTime' }], [], TOL)
    ).toEqual([]);
  });

  it('a linked ASN is checked against its call-off, never for the unlinked warning', () => {
    expect(
      kinds(asnCallOffWarnings(asnOf(1100), [{ callOff: CALL_OFF, delivery: 'notDue' }], [], TOL))
    ).toEqual(['qtyOver']);
  });
});
