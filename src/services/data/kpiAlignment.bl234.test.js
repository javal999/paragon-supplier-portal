// ─────────────────────────────────────────────────────────────────────────────
// BL-234 · KPI-2 AMENDED (owner, 2026-11-02): an early receipt on a date the
// Material Planner team confirmed counts as on time in OTIF and CFOT; an early
// receipt with no confirmation keeps the 7-day window.
//
// The three cases are fired through the REAL measures (`deliveryResults` /
// `callOffOtif` for OTIF, `poCfot` for the Hub CFOT); nothing is re-implemented.
// The confirmed earlier date is recorded as the hub records it: a call-off
// confirmation proposing that date, approved by the planner (CR-05, BL-56: the
// early allowance is 0 days, so every earlier date waits for the planner), and
// for a PO a counter-offer date the planner accepted (BL-66 (1)).
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
/** @import { ReceiptEvent } from '../transitions/callOffRules' */
import { callOffOtif, deliveryResults } from '../transitions/callOffRules';
import { poCfot } from './performanceRules';
import { EARLY_DELIVERY_WINDOW_DAYS } from './kpiWindow';
/** @import { CallOff, PurchaseOrder } from './types' */
/** @import { GoodsReceipt } from '@data/mockGoodsReceipts' */

const DAY = 86_400_000;
const NEED = '2026-06-10';
const E = EARLY_DELIVERY_WINDOW_DAYS;
/**
 * @param {string} d
 * @param {number} days
 */
const shift = (d, days) =>
  new Date(Date.parse(`${d}T00:00:00.000Z`) + days * DAY).toISOString().slice(0, 10);
const NOW = `${shift(NEED, 10)}T12:00:00.000Z`;
/** Well beyond the window: the planner-confirmed earlier date. */
const EARLY = shift(NEED, -(E + 7));

/**
 * @param {'approved' | 'awaiting' | null} approval null = the supplier confirmed the need date.
 * @returns {CallOff}
 */
const callOff = (approval) => ({
  id: 'co-bl234',
  callOffNumber: 'CO-BL234',
  poId: 'po-bl234',
  poNumber: 'PO-BL234',
  poLineId: 'li-bl234',
  supplierId: 'sup-bl234',
  supplierName: 'Sample BL-234 Supplier (illustrative)',
  materialCode: 'MAT-BL234',
  description: 'Sample material',
  uom: 'PCS',
  unitPrice: 1,
  currency: 'IDR',
  quantity: 100,
  needDate: NEED,
  type: 'forecast',
  status: approval ? 'Confirmed with New Date' : 'Confirmed',
  confirmation: {
    kind: approval ? 'newDate' : 'confirm',
    deliveries: [{ quantity: 100, date: approval ? EARLY : NEED }],
    confirmedAt: `${shift(NEED, -40)}T03:00:00.000Z`,
    approval: approval ?? 'auto',
    ...(approval === 'approved' ? { reviewedAt: `${shift(NEED, -39)}T03:00:00.000Z` } : {})
  },
  dispatches: [],
  notes: []
});
/**
 * @param {string} date
 * @returns {ReceiptEvent}
 */
const receipt = (date) => ({
  ref: 'GR-BL234',
  supplierId: 'sup-bl234',
  materialCode: 'MAT-BL234',
  date,
  quantity: 100
});
/**
 * @param {CallOff} c
 * @param {string} date
 */
const otif = (c, date) => {
  const r = deliveryResults([c], [receipt(date)], [], NOW);
  return { timing: r[0].timing, otif: callOffOtif(c.id, r) };
};

/**
 * @param {'accepted' | null} decision null = the counter-offer still waits for the planner.
 * @returns {PurchaseOrder}
 */
const po = (decision) =>
  /** @type {PurchaseOrder} */ (
    /** @type {unknown} */ ({
      id: 'po-bl234',
      poNumber: 'PO-BL234',
      supplierId: 'sup-bl234',
      confirmedDeliveryDate: NEED,
      lineItems: [
        {
          id: 'li-1',
          materialCode: 'MAT-BL234',
          description: 'x',
          quantity: 100,
          uom: 'PCS',
          unitPrice: 1,
          confirmedQty: 100
        }
      ],
      response: {
        option: 'adjust',
        respondedAt: `${shift(NEED, -40)}T03:00:00.000Z`,
        lines: [{ lineId: 'li-1', reasonCode: 'capacity', counterQty: 100, counterDate: EARLY }],
        ...(decision
          ? { review: { decision, reviewedAt: `${shift(NEED, -39)}T03:00:00.000Z` } }
          : {})
      }
    })
  );
/**
 * @param {string} date
 * @returns {GoodsReceipt[]}
 */
const gr = (date) => [
  /** @type {GoodsReceipt} */ (
    /** @type {unknown} */ ({
      poNumber: 'PO-BL234',
      receivedDate: date,
      inspectionResults: [{ materialCode: 'MAT-BL234', qtyReceived: 100 }]
    })
  )
];
/**
 * @param {PurchaseOrder} p
 * @param {string} date
 */
const cfot = (p, date) =>
  /** @type {import('./performanceRules').PoCfot} */ (poCfot(p, gr(date))).pct;

describe('BL-234 · KPI-2 amended — early receipts in OTIF and CFOT', () => {
  it(`early + confirmed: ${E + 7} days before the need date, on the date the planner approved → on time`, () => {
    expect(otif(callOff('approved'), EARLY)).toEqual({ timing: 'onTime', otif: 1 });
    expect(cfot(po('accepted'), EARLY)).toBe(100);
  });

  it(`early, unconfirmed, within ${E} days → on time`, () => {
    expect(otif(callOff(null), shift(NEED, -E))).toEqual({ timing: 'onTime', otif: 1 });
    expect(cfot(po(null), shift(NEED, -E))).toBe(100);
  });

  it(`early, unconfirmed, beyond ${E} days → not on time`, () => {
    // OTIF: the receipt matches no delivery, so after the grace days it is missed.
    expect(otif(callOff(null), shift(NEED, -(E + 1)))).toEqual({ timing: 'missed', otif: 0 });
    expect(cfot(po(null), shift(NEED, -(E + 1)))).toBe(0);
  });

  it('the supplier PROPOSING the earlier date is not a confirmation: while the planner has not approved it, the window holds', () => {
    // Same receipt, same proposed date — only the planner's approval differs.
    expect(otif(callOff('awaiting'), EARLY)).toEqual({ timing: 'missed', otif: 0 });
    expect(cfot(po(null), EARLY)).toBe(0);
  });
});
