// ─────────────────────────────────────────────────────────────────────────────
// BL-140 (owner ruling 2026-11-20) — an ASN against a value-limit PO line.
// Source: CR-04, value-limit line BL-49 (`valueLimit`, quantity 0 meaning "no
// quantity"). The ruling: the ASN is raised against the released call-off, and
// a standalone ASN on the value-limit line is refused with a reason. The
// quantity is bounded by the call-off's released quantity and the value by what
// the line has left of its limit.
//
// These specs pin the LINE RULE the policy hook and the form both call (AR-11),
// and its value axis. The verb-level reasons are pinned in
// `src/services/data/mock/asnValueLimit.test.js`.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import { asnLineRefusal, openValueForLine, valueLimitLocked } from './index';
/** @import { ASN, POLineItem, PurchaseOrder } from '../../data/types' */

const MAT = 'FR-WARD-4410';
const LIMIT = 500_000_000;
const PRICE = 2_200_000;

/** @type {Pick<PurchaseOrder, 'poNumber' | 'lineItems'>} */
const PO = {
  poNumber: 'PO-2026-00128',
  lineItems: [
    {
      id: 'li-028a',
      materialCode: MAT,
      description: 'Wardah Signature Floral Compound',
      quantity: 0,
      uom: 'KG',
      unitPrice: PRICE,
      confirmedQty: 0,
      valueLimit: LIMIT
    }
  ]
};

/** A PO whose one line carries a QUANTITY — the control this batch must not move. */
/** @type {Pick<PurchaseOrder, 'poNumber' | 'lineItems'>} */
const QTY_PO = {
  poNumber: 'PO-2025-00107',
  lineItems: [
    {
      id: 'li-007a',
      materialCode: MAT,
      description: 'PET bottle',
      quantity: 200_000,
      uom: 'PCS',
      unitPrice: 1_600,
      confirmedQty: 200_000
    }
  ]
};

/**
 * One ASN against a PO, shipping `shippedQty` of the material.
 * @param {string} asnNumber
 * @param {number} shippedQty
 * @param {ASN['status']} [status]
 * @returns {ASN}
 */
const asn = (asnNumber, shippedQty, status = 'Submitted') => ({
  asnNumber,
  supplierId: 'sup-003',
  poReference: PO.poNumber,
  status,
  carrier: 'Sample Courier',
  trackingNumber: 'SMPL-1',
  eta: '2026-12-31',
  details: {
    originCity: 'Jakarta, ID',
    destinationWarehouse: 'NDC Jatake 6, Tangerang',
    totalCartons: 1,
    grossWeightKg: 1,
    temperatureRequirement: 'Ambient (15–25°C)'
  },
  lineItems: [
    {
      materialCode: MAT,
      description: 'Wardah Signature Floral Compound',
      orderedQty: 0,
      shippedQty,
      lotNumber: 'LOT-1'
    }
  ]
});

/** The released call-off that covers the value-limit line. */
const CALL_OFF = { materialCode: MAT, quantity: 100 };

/**
 * Why one line on the value-limit PO would be refused.
 * @param {number} shippedQty
 * @param {{ callOff?: { materialCode: string; quantity: number }; asns?: readonly ASN[]; overShipReason?: string; excludeAsn?: string }} [opts]
 */
const refusal = (shippedQty, opts = {}) =>
  asnLineRefusal(
    // The material is shelf-life relevant, so the line is complete: an expiry
    // far beyond the ETA keeps the shelf-life rule silent, and this batch is
    // about the value-limit branch.
    {
      materialCode: MAT,
      shippedQty,
      lotNumber: 'LOT-1',
      expiryDate: '2028-12-31',
      eta: '2026-12-31'
    },
    PO,
    opts.asns ?? [],
    {
      requireBatch: true,
      ...(opts.callOff !== undefined ? { callOff: opts.callOff } : {}),
      ...(opts.overShipReason !== undefined ? { overShipReason: opts.overShipReason } : {}),
      ...(opts.excludeAsn !== undefined ? { excludeAsn: opts.excludeAsn } : {})
    }
  );

describe('BL-140 · a standalone ASN on the value-limit line is refused', () => {
  it('fires: no call-off named — the refusal is named, not the quantity axis', () => {
    // Without the ruling this line reads as `overOpen`: its open quantity is 0
    // because a value-limit line carries no quantity.
    expect(refusal(10)).toBe('valueLimitNoCallOff');
  });

  it('fires even when the supplier gives an over-ship reason: the bound is hard', () => {
    expect(refusal(10, { overShipReason: 'urgent' })).toBe('valueLimitNoCallOff');
  });

  it('fires when the named call-off is for another material', () => {
    expect(refusal(10, { callOff: { materialCode: 'RM-OTHER', quantity: 100 } })).toBe(
      'valueLimitNoCallOff'
    );
  });

  it('passes: the released call-off that covers the line, within its quantity', () => {
    expect(refusal(100, { callOff: CALL_OFF })).toBeNull();
  });
});

describe('BL-140 · the call-off bound', () => {
  it('fires: one unit above what the call-off released', () => {
    expect(refusal(101, { callOff: CALL_OFF })).toBe('overCallOff');
  });

  it('passes: exactly the released quantity', () => {
    expect(refusal(100, { callOff: CALL_OFF })).toBeNull();
  });
});

describe('BL-140 · the value bound (CR-04)', () => {
  it('fires: the shipped value is above what the PO line has left', () => {
    // 200 of 227.27 units already shipped: 500,000,000 − 440,000,000 = 60,000,000
    // left, and 50 × 2,200,000 = 110,000,000.
    const asns = [asn('ASN-OLD', 200)];
    expect(refusal(50, { callOff: CALL_OFF, asns })).toBe('overValueLimit');
  });

  it('passes: the same line one unit less, inside what is left', () => {
    const asns = [asn('ASN-OLD', 200)];
    // 27 × 2,200,000 = 59,400,000 ≤ 60,000,000.
    expect(refusal(27, { callOff: CALL_OFF, asns })).toBeNull();
  });

  it('known-good: an ASN being edited is left out of its own value sum', () => {
    const asns = [asn('ASN-EDIT', 100), asn('ASN-OLD', 100)];
    // Without the exclusion the second 100 would read 220,000,000 > 60,000,000.
    expect(refusal(100, { callOff: CALL_OFF, asns, excludeAsn: 'ASN-EDIT' })).toBeNull();
  });
});

describe('BL-140 · the value axis arithmetic', () => {
  it('openValueForLine = limit − what other active ASNs shipped × unit price', () => {
    const line = /** @type {POLineItem} */ (PO.lineItems[0]);
    expect(openValueForLine(PO, line, [])).toBe(LIMIT);
    expect(openValueForLine(PO, line, [asn('ASN-A', 100)])).toBe(LIMIT - 100 * PRICE);
  });

  it('a CANCELLED ASN gives its value back, and the result never goes below zero', () => {
    const line = /** @type {POLineItem} */ (PO.lineItems[0]);
    expect(openValueForLine(PO, line, [asn('ASN-C', 100, 'Cancelled')])).toBe(LIMIT);
    expect(openValueForLine(PO, line, [asn('ASN-B', 1000)])).toBe(0);
  });

  it('valueLimitLocked locks only a value-limit line without its call-off', () => {
    const valueLine = /** @type {POLineItem} */ (PO.lineItems[0]);
    const qtyLine = /** @type {POLineItem} */ (QTY_PO.lineItems[0]);
    expect(valueLimitLocked(valueLine, undefined)).toBe(true);
    expect(valueLimitLocked(valueLine, MAT)).toBe(false);
    expect(valueLimitLocked(qtyLine, undefined)).toBe(false);
  });
});

describe('BL-140 · the quantity line is unchanged (known-good control)', () => {
  it('a standalone ASN on a PO line that carries a quantity is accepted', () => {
    expect(
      asnLineRefusal(
        {
          materialCode: MAT,
          shippedQty: 1_000,
          lotNumber: 'LOT-1',
          expiryDate: '2028-12-31',
          eta: '2026-12-31'
        },
        QTY_PO,
        [],
        { requireBatch: true }
      )
    ).toBeNull();
  });

  it('above the open quantity it still refuses as overOpen, not a value-limit code', () => {
    expect(
      asnLineRefusal(
        {
          materialCode: MAT,
          shippedQty: 300_000,
          lotNumber: 'LOT-1',
          expiryDate: '2028-12-31',
          eta: '2026-12-31'
        },
        QTY_PO,
        [],
        { requireBatch: true }
      )
    ).toBe('overOpen');
  });
});
