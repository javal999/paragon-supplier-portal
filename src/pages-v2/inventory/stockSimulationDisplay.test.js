// ─────────────────────────────────────────────────────────────────────────────
// P-05 / P-06 — the stock simulation row's pure parts: the agreement line the
// row offers "Create call-off" on (line exists, no line, line exhausted), by
// the rule the call-off page's prefill uses, and the over-called state.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
/** @import { CallOff, PurchaseOrder } from '@services/data/types' */
import { POStatus } from '@services/data/types';
import { agreementLineFor, isOverCalled } from './stockSimulationDisplay';

/**
 * @param {Partial<PurchaseOrder>} [over]
 * @returns {PurchaseOrder}
 */
const po = (over = {}) =>
  /** @type {PurchaseOrder} */ ({
    id: 'po-1',
    poNumber: 'PO-1',
    supplierId: 'sup-X',
    status: POStatus.CONFIRMED,
    lineItems: [{ id: 'li-1', materialCode: 'RM-A', quantity: 1000, unitPrice: 10 }],
    ...over
  });

/**
 * @param {number} quantity
 * @returns {CallOff}
 */
const released = (quantity) =>
  /** @type {CallOff} */ ({ id: 'co-1', poLineId: 'li-1', status: 'Confirmed', quantity });

describe('P-06 — agreementLineFor: line exists, no line, line exhausted', () => {
  it('line exists: the open line with quantity left, and how much', () => {
    const line = agreementLineFor([po()], [released(300)], 'sup-X', 'RM-A');
    expect(line).toMatchObject({ state: 'line', poNumber: 'PO-1' });
    expect(line.state === 'line' && line.remaining.remainingQty).toBe(700);
  });

  it('no line: another supplier, another material, or a PO not open for call-offs', () => {
    expect(agreementLineFor([po()], [], 'sup-Y', 'RM-A')).toEqual({ state: 'none' });
    expect(agreementLineFor([po()], [], 'sup-X', 'RM-B')).toEqual({ state: 'none' });
    expect(agreementLineFor([po({ status: POStatus.SENT })], [], 'sup-X', 'RM-A')).toEqual({
      state: 'none'
    });
  });

  it('line exhausted: everything on the line is released', () => {
    expect(agreementLineFor([po()], [released(1000)], 'sup-X', 'RM-A')).toMatchObject({
      state: 'exhausted',
      poNumber: 'PO-1'
    });
  });

  it('of several lines, the one with the most left (the call-off page prefill rule)', () => {
    const other = po({
      id: 'po-2',
      poNumber: 'PO-2',
      lineItems: /** @type {PurchaseOrder['lineItems']} */ ([
        { id: 'li-2', materialCode: 'RM-A', quantity: 5000, unitPrice: 10 }
      ])
    });
    expect(agreementLineFor([po(), other], [], 'sup-X', 'RM-A')).toMatchObject({
      state: 'line',
      poNumber: 'PO-2'
    });
  });
});

describe('P-05 — isOverCalled: only a negative free figure is the over-called state', () => {
  it('negative is over-called; zero, positive and missing are not', () => {
    expect(isOverCalled({ freeToCallOff: -1 })).toBe(true);
    expect(isOverCalled({ freeToCallOff: 0 })).toBe(false);
    expect(isOverCalled({ freeToCallOff: 5 })).toBe(false);
    expect(isOverCalled({ freeToCallOff: null })).toBe(false);
    expect(isOverCalled(null)).toBe(false);
  });
});
