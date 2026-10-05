// MR-6 BR-01 to BR-04 and AR-11 — the ASN line rule and the batches a supplier
// can still ship from. Pure: every input is handed in.

import { describe, expect, it } from 'vitest';
/** @import { DeclaredBatches } from './fulfilmentRules' */
import { asnLineRefusal, availableBatches, batchAboveAvailable } from './fulfilmentRules';
/** @import { ASN, AsnStatus, PurchaseOrder } from '../data/types' */

const SUP = 'sup-002';
const MAT = 'RM-EMUL-3310';

// The shape of the seeded batch-grain stock record (inv-0001).
/** @type {DeclaredBatches} */
const DECLARED = {
  declaredAt: '2026-08-03T08:15:00.000Z',
  batches: [
    { batchNumber: 'GLY-24A', qty: 1800, expiryDate: '2027-06-30' },
    { batchNumber: 'GLY-24B', qty: 2200, expiryDate: '2027-09-30' }
  ]
};

/**
 * @param {string} asnNumber
 * @param {AsnStatus} status
 * @param {string} lot
 * @param {number} qty
 * @param {Partial<Pick<ASN, 'supplierId' | 'shipDate'>> & { materialCode?: string }} [over]
 * @returns {ASN}
 */
const asn = (asnNumber, status, lot, qty, over = {}) => ({
  asnNumber,
  supplierId: over.supplierId ?? SUP,
  poReference: 'PO-X',
  status,
  carrier: '',
  trackingNumber: '',
  eta: '2026-08-20',
  ...(over.shipDate === undefined
    ? { shipDate: '2026-08-10' }
    : over.shipDate
      ? { shipDate: over.shipDate }
      : {}),
  details: {
    originCity: '',
    destinationWarehouse: '',
    totalCartons: 0,
    grossWeightKg: 0,
    temperatureRequirement: ''
  },
  lineItems: [
    {
      materialCode: over.materialCode ?? MAT,
      description: '',
      orderedQty: 0,
      shippedQty: qty,
      lotNumber: lot
    }
  ]
});

describe('availableBatches (MR-6 BR-01, BR-02)', () => {
  it("AC-01 — declared quantity minus this supplier's Submitted, In Transit and Delivered ASNs shipped since the record", () => {
    const asns = [
      asn('A1', 'Submitted', 'GLY-24A', 500),
      asn('A2', 'In Transit', 'GLY-24A', 300),
      asn('A3', 'Delivered', 'GLY-24B', 200),
      // Not counted: a draft, a cancelled ASN, another supplier, another
      // material, one shipped before the record, and one with no ship date.
      asn('N1', 'Draft', 'GLY-24A', 900),
      asn('N2', 'Cancelled', 'GLY-24A', 900),
      asn('N3', 'Submitted', 'GLY-24A', 900, { supplierId: 'sup-005' }),
      asn('N4', 'Submitted', 'GLY-24A', 900, { materialCode: 'RM-OTHER' }),
      asn('N5', 'Submitted', 'GLY-24A', 900, { shipDate: '2026-08-02' }),
      asn('N6', 'Submitted', 'GLY-24A', 900, { shipDate: '' })
    ];
    expect(availableBatches(SUP, MAT, asns, DECLARED)).toEqual([
      { batchNumber: 'GLY-24A', available: 1000, expiryDate: '2027-06-30' },
      { batchNumber: 'GLY-24B', available: 2000, expiryDate: '2027-09-30' }
    ]);
  });

  it('an ASN shipped on the day of the record counts (on or after)', () => {
    const asns = [asn('A1', 'Submitted', 'GLY-24A', 800, { shipDate: '2026-08-03' })];
    expect(availableBatches(SUP, MAT, asns, DECLARED)[0].available).toBe(1000);
  });

  it('edge case 4 — a batch used up by another ASN is left out', () => {
    const asns = [asn('A1', 'Submitted', 'GLY-24A', 1800)];
    expect(availableBatches(SUP, MAT, asns, DECLARED).map((b) => b.batchNumber)).toEqual([
      'GLY-24B'
    ]);
  });

  it('a total-only record, or no record, offers no batches', () => {
    expect(availableBatches(SUP, MAT, [], { declaredAt: '2026-08-05T09:20:00.000Z' })).toEqual([]);
    expect(availableBatches(SUP, MAT, [], undefined)).toEqual([]);
  });
});

describe('batchAboveAvailable (MR-6 BR-03)', () => {
  const offered = availableBatches(SUP, MAT, [], DECLARED);
  it('fires above the available quantity of the picked batch, and not at it', () => {
    expect(batchAboveAvailable({ shippedQty: 1801, lotNumber: 'GLY-24A' }, offered)).toBe(true);
    expect(batchAboveAvailable({ shippedQty: 1800, lotNumber: 'GLY-24A' }, offered)).toBe(false);
  });
  it('a batch not on offer carries no warning', () => {
    expect(batchAboveAvailable({ shippedQty: 99_999, lotNumber: 'TYPED-1' }, offered)).toBe(false);
  });
});

describe('asnLineRefusal carries batch, expiry and ETA (AR-11)', () => {
  /** @type {Pick<PurchaseOrder, 'poNumber' | 'lineItems'>} */
  const po = {
    poNumber: 'PO-X',
    lineItems: [
      /** @type {PurchaseOrder['lineItems'][number]} */ ({
        id: 'li-1',
        materialCode: MAT,
        description: '',
        quantity: 1000,
        confirmedQty: 1000,
        uom: 'KG',
        unitPrice: 0
      })
    ]
  };
  const line = {
    materialCode: MAT,
    shippedQty: 100,
    lotNumber: '',
    expiryDate: '2027-06-30',
    eta: '2026-10-01'
  };

  it('`batch` fires at submission when the batch is missing, and passes when it is given', () => {
    expect(asnLineRefusal(line, po, [], { requireBatch: true })).toBe('batch');
    expect(
      asnLineRefusal({ ...line, lotNumber: 'GLY-24A' }, po, [], { requireBatch: true })
    ).toBeNull();
  });

  it('a draft may leave the batch out', () => {
    expect(asnLineRefusal(line, po, [], { requireBatch: false })).toBeNull();
  });

  it('`expiry` fires on a date that is not a calendar date, and passes on one that is', () => {
    expect(
      asnLineRefusal({ ...line, lotNumber: 'B', expiryDate: '2027-02-30' }, po, [], {
        requireBatch: true
      })
    ).toBe('expiry');
    expect(
      asnLineRefusal(
        { ...line, lotNumber: 'B', expiryDate: '2027-02-28', eta: '2026-08-01' },
        po,
        [],
        { requireBatch: true }
      )
    ).toBeNull();
  });
});
