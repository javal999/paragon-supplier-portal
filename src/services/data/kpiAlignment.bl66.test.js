// ─────────────────────────────────────────────────────────────────────────────
// BL-66 / BL-82 · THE FIVE PLACES THE KPI CALCULATION DIFFERED FROM REQ-E10-01.
//
// Each rule is probed both ways — a known-good input that the aligned rule
// accepts, and the known-bad input the OLD code got wrong, with the old result
// named in the test so a reader sees what moved. The real functions are fired;
// nothing is re-implemented here.
// ─────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
/** @import { ReceiptEvent } from '../transitions/callOffRules' */
import {
  approvedDeliveries,
  callOffOtif,
  callOffViews,
  deliveryResults
} from '../transitions/callOffRules';
import { poCfot } from './performanceRules';
import { EARLY_DELIVERY_WINDOW_DAYS, earliestCountingDay, receivedOnTimeFor } from './kpiWindow';
import { KPI_DEFINITIONS } from './kpiDefinitions';
import { DELIVERY_GRACE_DAYS, MATCH_WINDOW_DAYS } from '../delivery/fulfillment';
import { agreedCfot, cfotByDefinition } from '../engine/cfot';
/** @import { LineHistory } from '../engine/lines' */
/** @import { CallOff, CallOffConfirmation, PurchaseOrder } from './types' */
/** @import { GoodsReceipt } from '@data/mockGoodsReceipts' */
import { MockCommandService } from './mock/MockCommandService';
import { callOffStore } from './mock/stores/callOffStore';
import { asnStore } from './mock/stores/asnStore';
import { purchaseOrderStore } from './mock/stores/purchaseOrderStore';
import { PERSONA_SYSTEM_ROLES } from '../transitions/businessRoles';
import { NO_PERSON } from '@context/noPerson';
/** @import { QueryScope } from './types' */

const DAY = 86_400_000;
const NEED = '2026-06-10';
/**
 * @param {string} d
 * @param {number} days
 */
const shift = (d, days) =>
  new Date(Date.parse(`${d}T00:00:00.000Z`) + days * DAY).toISOString().slice(0, 10);
/** @param {number} days */
const nowAfter = (days) => `${shift(NEED, days)}T12:00:00.000Z`;

/**
 * @param {Partial<CallOff>} [over]
 * @returns {CallOff}
 */
const callOff = (over = {}) => ({
  id: 'co-bl66',
  callOffNumber: 'CO-BL66',
  poId: 'po-bl66',
  poNumber: 'PO-BL66',
  poLineId: 'li-bl66',
  supplierId: 'sup-bl66',
  supplierName: 'Sample BL-66 Supplier (illustrative)',
  materialCode: 'MAT-BL66',
  description: 'Sample material',
  uom: 'PCS',
  unitPrice: 1,
  currency: 'IDR',
  quantity: 100,
  needDate: NEED,
  type: 'forecast',
  status: 'Confirmed',
  confirmation: {
    kind: 'confirm',
    deliveries: [{ quantity: 100, date: NEED }],
    confirmedAt: `${shift(NEED, -20)}T03:00:00.000Z`,
    approval: 'auto'
  },
  dispatches: [],
  notes: [],
  ...over
});
/**
 * @param {string} date
 * @returns {ReceiptEvent}
 */
const receipt = (date, quantity = 100, ref = 'GR-BL66') => ({
  ref,
  supplierId: 'sup-bl66',
  materialCode: 'MAT-BL66',
  date,
  quantity
});
/**
 * @param {CallOff} c
 * @param {ReceiptEvent[]} receipts
 * @param {string} now
 */
const one = (c, receipts, now) => {
  const r = deliveryResults([c], receipts, [], now);
  return { ...r[0], otif: callOffOtif(c.id, r) };
};

/**
 * @param {Partial<PurchaseOrder>} [over]
 * @returns {PurchaseOrder}
 */
const po = (over = {}) =>
  /** @type {PurchaseOrder} */ ({
    id: 'po-bl66',
    poNumber: 'PO-BL66',
    supplierId: 'sup-bl66',
    confirmedDeliveryDate: NEED,
    lineItems: [
      {
        id: 'li-1',
        materialCode: 'MAT-BL66',
        description: 'x',
        quantity: 100,
        uom: 'PCS',
        unitPrice: 1,
        confirmedQty: 100
      }
    ],
    ...over
  });
/**
 * @param {string} date
 * @param {number} qty
 * @returns {GoodsReceipt}
 */
const gr = (date, qty) =>
  /** @type {GoodsReceipt} */ (
    /** @type {unknown} */ ({
      poNumber: 'PO-BL66',
      receivedDate: date,
      inspectionResults: [{ materialCode: 'MAT-BL66', qtyReceived: qty }]
    })
  );

// ── (1) A counter-offer moves the CFOT date only once the planner ACCEPTS it ──

describe('BL-66 (1) · CFOT: a counter-offer binds when accepted, not when sent', () => {
  /** @param {'accepted' | 'rejected'} [decision] */
  const counter = (decision) =>
    po(
      /** @type {Partial<PurchaseOrder>} */ ({
        response: {
          option: 'adjust',
          respondedAt: `${shift(NEED, -30)}T03:00:00.000Z`,
          lines: [
            { lineId: 'li-1', reasonCode: 'capacity', counterQty: 100, counterDate: shift(NEED, 5) }
          ],
          ...(decision
            ? { review: { decision, reviewedAt: `${shift(NEED, -29)}T03:00:00.000Z` } }
            : {})
        }
      })
    );
  const onCounterDate = [gr(shift(NEED, 5), 100)];
  const onOrderDate = [gr(NEED, 100)];

  it('known-good: accepted — the counter date counts (delivered on it: 100%)', () => {
    expect(
      /** @type {import('./performanceRules').PoCfot} */ (
        poCfot(counter('accepted'), onCounterDate)
      ).pct
    ).toBe(100);
  });

  it('known-bad (was 100%): still waiting — the order date stands, so 5 days late is 0%', () => {
    expect(
      /** @type {import('./performanceRules').PoCfot} */ (poCfot(counter(), onCounterDate)).pct
    ).toBe(0);
    expect(
      /** @type {import('./performanceRules').PoCfot} */ (poCfot(counter(), onOrderDate)).pct
    ).toBe(100);
  });

  it('a rejected counter-offer also leaves the order date', () => {
    expect(
      /** @type {import('./performanceRules').PoCfot} */ (
        poCfot(counter('rejected'), onCounterDate)
      ).pct
    ).toBe(0);
  });
});

// ── (2) A planner's need-date change applies only once the supplier re-confirms ──

describe('BL-66 (2) · OTIF: measured against the date both sides last agreed', () => {
  const NEW = shift(NEED, 7);
  const changedAwaiting = callOff({
    status: 'Awaiting Confirmation',
    needDate: NEW,
    confirmation: undefined,
    agreedDeliveries: [{ quantity: 100, date: NEED }]
  });

  it('known-good: before the supplier re-confirms, the agreed date decides (on it: on time)', () => {
    expect(approvedDeliveries(changedAwaiting)).toEqual([{ quantity: 100, date: NEED }]);
    expect(one(changedAwaiting, [receipt(NEED)], nowAfter(20))).toMatchObject({
      timing: 'onTime',
      otif: 1
    });
  });

  it('known-bad (was on time): arriving on the planner’s unconfirmed new date is late', () => {
    expect(one(changedAwaiting, [receipt(NEW)], nowAfter(20))).toMatchObject({
      timing: 'late',
      otif: 0
    });
  });

  it('once the supplier confirms the new date and it is accepted, the new date applies', () => {
    const reconfirmed = callOff({
      needDate: NEW,
      agreedDeliveries: [{ quantity: 100, date: NEED }],
      confirmation: {
        kind: 'confirm',
        deliveries: [{ quantity: 100, date: NEW }],
        confirmedAt: `${shift(NEED, -5)}T03:00:00.000Z`,
        approval: 'auto'
      }
    });
    expect(one(reconfirmed, [receipt(NEW)], nowAfter(20))).toMatchObject({
      timing: 'onTime',
      otif: 1
    });
  });

  it('a supplier re-confirmation still waiting for the planner is not agreed: the earlier agreement applies', () => {
    const waiting = callOff({
      status: 'Confirmed with New Date',
      needDate: NEW,
      agreedDeliveries: [{ quantity: 100, date: NEED }],
      confirmation: /** @type {CallOffConfirmation} */ ({
        kind: 'newDate',
        deliveries: [{ quantity: 100, date: shift(NEED, 14) }],
        confirmedAt: `${shift(NEED, -5)}T03:00:00.000Z`,
        approval: 'awaiting'
      })
    });
    expect(approvedDeliveries(waiting)).toEqual([{ quantity: 100, date: NEED }]);
  });

  it('never agreed at all: the released need date is all there is', () => {
    expect(
      approvedDeliveries(callOff({ status: 'Awaiting Confirmation', confirmation: undefined }))
    ).toEqual([{ quantity: 100, date: NEED }]);
  });

  describe('through the real planner verb', () => {
    const svc = new MockCommandService();
    /** @type {QueryScope} */
    const buyer = {
      personaType: 'buyer',
      supplierId: null,
      businessRoles: PERSONA_SYSTEM_ROLES.buyer,
      actor: NO_PERSON
    };
    /** @type {QueryScope} */
    const sup007 = {
      personaType: 'supplier',
      supplierId: 'sup-007',
      businessRoles: PERSONA_SYSTEM_ROLES.supplier,
      actor: NO_PERSON
    };
    beforeEach(() => {
      callOffStore.reset();
      asnStore.reset();
      purchaseOrderStore.reset();
    });

    it('t_calloff_change keeps what both sides agreed; the supplier’s confirmation then replaces it', async () => {
      const before = /** @type {CallOff} */ (callOffStore.get('co-0006'));
      const agreedDate = /** @type {CallOffConfirmation} */ (before.confirmation).deliveries[0]
        .date;
      const moved = shift(agreedDate, 7);
      const res = await svc.dispatch(buyer, {
        transitionId: 't_calloff_change',
        entity: 'callOff',
        entityId: 'co-0006',
        payload: { needDate: moved, reason: 'Line moved a week' }
      });
      expect(res.status).toBe('done');
      const changed = /** @type {CallOff} */ (callOffStore.get('co-0006'));
      expect(changed).toMatchObject({ status: 'Awaiting Confirmation', needDate: moved });
      expect(changed.agreedDeliveries).toEqual(
        /** @type {CallOffConfirmation} */ (before.confirmation).deliveries
      );
      expect(approvedDeliveries(changed).map((d) => d.date)).toEqual([agreedDate]);

      const conf = await svc.dispatch(sup007, {
        transitionId: 't_calloff_confirm',
        entity: 'callOff',
        entityId: 'co-0006',
        payload: {}
      });
      expect(conf.status).toBe('done');
      expect(
        approvedDeliveries(/** @type {CallOff} */ (callOffStore.get('co-0006'))).map((d) => d.date)
      ).toEqual([moved]);
    });
  });
});

// ── (3) "In full" adds every receipt matched to the delivery ────────────────

describe('BL-66 (3) · OTIF in full: partial receipts add up (CR-08)', () => {
  it('known-good (was short, 0): 60 + 40 against 100 is in full', () => {
    const r = one(
      callOff(),
      [receipt(NEED, 60, 'GR-A'), receipt(shift(NEED, -1), 40, 'GR-B')],
      nowAfter(10)
    );
    expect(r).toMatchObject({ inFull: true, quantity: 100, otif: 1 });
    expect(r.refs).toEqual(['GR-A', 'GR-B']);
  });

  it('known-bad: 60 + 30 is still short', () => {
    expect(
      one(callOff(), [receipt(NEED, 60, 'GR-A'), receipt(NEED, 30, 'GR-B')], nowAfter(10))
    ).toMatchObject({
      inFull: false,
      otif: 0
    });
  });

  it('the part that completes the quantity after the date makes the delivery late', () => {
    expect(
      one(callOff(), [receipt(NEED, 60, 'GR-A'), receipt(shift(NEED, 2), 40, 'GR-B')], nowAfter(10))
    ).toMatchObject({
      timing: 'late',
      inFull: true,
      otif: 0
    });
  });

  it('a short delivery never takes next week’s receipt away from next week’s call-off', () => {
    const wk1 = callOff({ id: 'co-w1' });
    const NEXT = shift(NEED, 7);
    const wk2 = callOff({
      id: 'co-w2',
      needDate: NEXT,
      confirmation: {
        kind: 'confirm',
        deliveries: [{ quantity: 100, date: NEXT }],
        confirmedAt: `${shift(NEED, -20)}T03:00:00.000Z`,
        approval: 'auto'
      }
    });
    const results = deliveryResults(
      [wk1, wk2],
      [receipt(NEED, 90, 'GR-1'), receipt(NEXT, 100, 'GR-2')],
      [],
      nowAfter(20)
    );
    expect(callOffOtif('co-w1', results)).toBe(0); // short, and stays short
    expect(callOffOtif('co-w2', results)).toBe(1); // its own receipt, untouched
    expect(
      /** @type {import('../transitions/callOffRules').DeliveryResult} */ (
        results.find((r) => r.callOffId === 'co-w2')
      ).refs
    ).toEqual(['GR-2']);
  });
});

// ── (4) One early rule for OTIF and CFOT ────────────────────────────────────

describe('BL-66 (4) · ONE early window for OTIF and CFOT (PROPOSED until BL-56)', () => {
  const E = EARLY_DELIVERY_WINDOW_DAYS;

  it('the window is one value: every definition on the pages reads it', () => {
    const values = KPI_DEFINITIONS.flatMap((d) =>
      Object.values(d.answers).flatMap((a) =>
        a.values && 'early' in a.values ? [a.values.early] : []
      )
    );
    expect(values.length).toBe(4); // otif.window, otif.early, cfot.window, cfot.early
    expect(new Set(values)).toEqual(new Set([E]));
    // Until BL-56 it is CR-06's existing match window.
    expect(E).toBe(MATCH_WINDOW_DAYS);
    expect(earliestCountingDay(NEED)).toBe(shift(NEED, -E));
  });

  it('and every calculation imports it rather than carrying its own number', () => {
    /** @param {string} p */
    const src = (p) => readFileSync(resolve(__dirname, p), 'utf8');
    expect(src('../transitions/callOffRules.js')).toMatch(
      /import \{ EARLY_DELIVERY_WINDOW_DAYS \} from '\.\.\/data\/kpiWindow'/
    );
    expect(src('./performanceRules.js')).toMatch(
      /import \{ receivedOnTimeFor \} from '\.\/kpiWindow'/
    );
    expect(src('../engine/cfot.js')).toMatch(
      /import \{ EARLY_DELIVERY_WINDOW_DAYS \} from '\.\.\/data\/kpiWindow'/
    );
  });

  it(`known-good: ${E} days early is on time for OTIF, Hub CFOT and engine CFOT alike`, () => {
    expect(one(callOff(), [receipt(shift(NEED, -E))], nowAfter(1))).toMatchObject({
      timing: 'onTime',
      otif: 1
    });
    expect(
      /** @type {import('./performanceRules').PoCfot} */ (poCfot(po(), [gr(shift(NEED, -E), 100)]))
        .pct
    ).toBe(100);
    expect(receivedOnTimeFor(shift(NEED, -E), NEED)).toBe(true);
  });

  it(`known-bad (Hub CFOT was 100%): ${E + 1} days early counts for NEITHER measure`, () => {
    expect(one(callOff(), [receipt(shift(NEED, -(E + 1)))], nowAfter(1)).timing).toBe('pending');
    expect(
      /** @type {import('./performanceRules').PoCfot} */ (
        poCfot(po(), [gr(shift(NEED, -(E + 1)), 100)])
      ).pct
    ).toBe(0);
    expect(receivedOnTimeFor(shift(NEED, -(E + 1)), NEED)).toBe(false);
  });

  it('the engine’s surfaced CFOT applies the same edge; the calibration read keeps its recorded default', () => {
    /**
     * @param {string} receivedDate
     * @returns {LineHistory}
     */
    const line = (receivedDate) => ({
      line: {
        poNumber: 'SYN-PO-1',
        line: 10,
        supplierId: 'sup-bl66',
        materialCode: 'MAT-BL66',
        orderedQty: 100,
        uom: 'PCS',
        requestedDate: NEED,
        createdAt: `${shift(NEED, -40)}T00:00:00.000Z`,
        confirmDeadline: `${shift(NEED, -38)}T00:00:00.000Z`
      },
      changes: [],
      confirmations: [
        {
          poNumber: 'SYN-PO-1',
          line: 10,
          confirmedQty: 100,
          confirmedDate: NEED,
          confirmedAt: `${shift(NEED, -39)}T00:00:00.000Z`
        }
      ],
      receipts: [
        { grNumber: 'SYN-GR-1', poNumber: 'SYN-PO-1', line: 10, receivedQty: 100, receivedDate }
      ]
    });
    const w = { from: NEED, to: NEED };
    expect(agreedCfot([line(shift(NEED, -E))], w).rate).toBe(1);
    expect(agreedCfot([line(shift(NEED, -(E + 1)))], w).rate).toBe(0);
    expect(cfotByDefinition([line(shift(NEED, -(E + 1)))], w).rate).toBe(1);
  });
});

// ── (5) Dispatched but never received: missed after the CR-07 window ────────

describe('BL-66 (5) · OTIF: a dispatched call-off with no receipt is missed after the window', () => {
  const dispatched = callOff({
    dispatches: [
      {
        id: 'dsp-1',
        shippedDate: shift(NEED, -2),
        expectedArrival: NEED,
        quantity: 100,
        recordedAt: `${shift(NEED, -2)}T03:00:00.000Z`
      }
    ]
  });

  it(`known-good: up to ${DELIVERY_GRACE_DAYS} days after the date the notice stands in — no result yet`, () => {
    expect(one(dispatched, [], nowAfter(DELIVERY_GRACE_DAYS))).toMatchObject({
      basis: 'dispatch',
      timing: 'onTime',
      otif: null
    });
  });

  it(`known-bad (was pending for ever): ${DELIVERY_GRACE_DAYS + 1} days after, nothing received — missed`, () => {
    expect(one(dispatched, [], nowAfter(DELIVERY_GRACE_DAYS + 1))).toMatchObject({
      timing: 'missed',
      inFull: null,
      otif: 0
    });
    expect(one(dispatched, [], nowAfter(60))).toMatchObject({ timing: 'missed', otif: 0 });
    const view = callOffViews([dispatched], [], [], nowAfter(60))[0];
    expect(view.delivery).toBe('missed');
  });

  it('a receipt that does arrive inside the match window still decides it (late, not missed)', () => {
    expect(
      one(dispatched, [receipt(shift(NEED, DELIVERY_GRACE_DAYS + 1))], nowAfter(60))
    ).toMatchObject({
      basis: 'receipt',
      timing: 'late',
      otif: 0
    });
  });
});
