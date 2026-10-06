// ─────────────────────────────────────────────────────────────────────────────
// BL-53 · THE KPI DEFINITIONS ARE PINNED TO THE ARITHMETIC, NOT TO THE PROSE.
//
// Every sentence on the performance pages is a claim about `callOffRules` /
// `poCfot`. Each claim below is checked by firing the REAL function at its
// stated boundary, from both sides, with the numbers read from the definitions
// module — so the page cannot keep saying "7 days" after the code moves to 5.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import i18n from '@lib/i18n';
import { BASELINE_MONTHS, KPI_DEFINITIONS, KPI_QUESTIONS } from './kpiDefinitions';
/** @import { ReceiptEvent } from '../transitions/callOffRules' */
import { callOffOtif, deliveryResults } from '../transitions/callOffRules';
import { poCfot } from './performanceRules';
/** @import { CallOff, CallOffConfirmation, PurchaseOrder } from './types' */
/** @import { GoodsReceipt } from '@data/mockGoodsReceipts' */

const otif = /** @type {import('./kpiDefinitions').KpiDefinition} */ (
  KPI_DEFINITIONS.find((d) => d.id === 'otif')
);
const MATCH = /** @type {Readonly<Record<string, number>>} */ (otif.answers.window.values).match;
const GRACE = /** @type {Readonly<Record<string, number>>} */ (otif.answers.window.values).grace;

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
  id: 'co-kpi',
  callOffNumber: 'CO-KPI',
  poId: 'po-kpi',
  poNumber: 'PO-KPI',
  poLineId: 'li-kpi',
  supplierId: 'sup-kpi',
  supplierName: 'Sample KPI Supplier (illustrative)',
  materialCode: 'MAT-KPI',
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
const receipt = (date, quantity = 100, ref = 'GR-KPI') => ({
  ref,
  supplierId: 'sup-kpi',
  materialCode: 'MAT-KPI',
  date,
  quantity
});
/**
 * @param {CallOff} c
 * @param {ReceiptEvent[]} receipts
 * @param {string} now
 */
const resultFor = (c, receipts, now) => {
  const r = deliveryResults([c], receipts, [], now);
  return { timing: r[0]?.timing, inFull: r[0]?.inFull, otif: callOffOtif(c.id, r) };
};

describe('BL-53 · every KPI answers every BL-19 question, in both languages, with no target', () => {
  it('each definition carries an EN and an ID sentence for each question, numbers filled', () => {
    for (const def of KPI_DEFINITIONS) {
      for (const q of KPI_QUESTIONS) {
        const a = def.answers[q];
        for (const lng of ['en', 'id']) {
          const text = i18n.t(a.key, { ...a.values, lng });
          expect(text, `${def.id}.${q} (${lng})`).not.toBe(a.key);
          expect(text, `${def.id}.${q} (${lng}) left a placeholder`).not.toMatch(/\{\{/);
        }
      }
    }
    expect(i18n.t('perf.kpi.otif.window', { ...otif.answers.window.values, lng: 'en' })).toContain(
      `${MATCH} days`
    );
  });

  it('the target reads "Baseline period", and the baseline is BL-19’s three months', () => {
    expect(BASELINE_MONTHS).toBe(3);
    expect(i18n.t('perf.kpi.target.baseline', { lng: 'en' })).toMatch(/^Baseline period/);
    expect(i18n.t('perf.measuredCallOffs', { count: 2, lng: 'en' })).not.toMatch(/target \d/);
  });
});

describe('BL-53 · OTIF — the delivery window, both edges', () => {
  it(`on the date: on time · one day late: late (0)`, () => {
    expect(resultFor(callOff(), [receipt(NEED)], nowAfter(10))).toMatchObject({
      timing: 'onTime',
      otif: 1
    });
    expect(resultFor(callOff(), [receipt(shift(NEED, 1))], nowAfter(10))).toMatchObject({
      timing: 'late',
      otif: 0
    });
  });

  it(`nothing received: pending up to ${GRACE} days after, missed after that`, () => {
    expect(resultFor(callOff(), [], nowAfter(GRACE)).timing).toBe('pending');
    expect(resultFor(callOff(), [], nowAfter(GRACE)).otif).toBeNull();
    expect(resultFor(callOff(), [], nowAfter(GRACE + 1))).toMatchObject({
      timing: 'missed',
      otif: 0
    });
  });

  it(`a receipt more than ${MATCH} days late is not matched at all`, () => {
    expect(resultFor(callOff(), [receipt(shift(NEED, MATCH))], nowAfter(30)).timing).toBe('late');
    expect(resultFor(callOff(), [receipt(shift(NEED, MATCH + 1))], nowAfter(30)).timing).toBe(
      'missed'
    );
  });
});

describe('BL-53 · OTIF — early deliveries', () => {
  const EARLY = /** @type {Readonly<Record<string, number>>} */ (otif.answers.early.values).early;
  it(`count as on time up to ${EARLY} days early, and are not matched beyond`, () => {
    expect(resultFor(callOff(), [receipt(shift(NEED, -EARLY))], nowAfter(1))).toMatchObject({
      timing: 'onTime',
      otif: 1
    });
    expect(resultFor(callOff(), [receipt(shift(NEED, -(EARLY + 1)))], nowAfter(1)).timing).toBe(
      'pending'
    );
  });
});

describe('BL-53 · OTIF — the grain and "in full"', () => {
  it('per call-off: a partially confirmed call-off is 1 only if EVERY delivery is on time and in full', () => {
    const partial = callOff({
      status: 'Partially Confirmed',
      confirmation: /** @type {CallOffConfirmation} */ ({
        kind: 'partial',
        deliveries: [
          { quantity: 60, date: NEED },
          { quantity: 40, date: shift(NEED, 14) }
        ],
        confirmedAt: `${shift(NEED, -20)}T03:00:00.000Z`,
        approval: 'auto'
      })
    });
    const both = deliveryResults(
      [partial],
      [receipt(NEED, 60, 'GR-1'), receipt(shift(NEED, 14), 40, 'GR-2')],
      [],
      nowAfter(30)
    );
    expect(callOffOtif(partial.id, both)).toBe(1);
    const secondLate = deliveryResults(
      [partial],
      [receipt(NEED, 60, 'GR-1'), receipt(shift(NEED, 15), 40, 'GR-2')],
      [],
      nowAfter(30)
    );
    expect(callOffOtif(partial.id, secondLate)).toBe(0);
  });

  // BL-82 retired the pinned "a notice keeps the call-off out of missed for
  // good" (BL-66 (5)): a notice alone is still not a result, but only until
  // the missed window has passed.
  it(`a notice of dispatch alone is not a result — until ${GRACE} days after the date, when it is missed`, () => {
    const noticed = callOff(
      /** @type {Partial<CallOff>} */ ({
        dispatches: [
          {
            id: 'dsp-1',
            shippedDate: shift(NEED, -2),
            expectedArrival: NEED,
            quantity: 100,
            recordedAt: `${shift(NEED, -2)}T03:00:00.000Z`
          }
        ]
      })
    );
    expect(resultFor(noticed, [], nowAfter(GRACE)).otif).toBeNull();
    expect(resultFor(noticed, [], nowAfter(GRACE)).timing).not.toBe('missed');
    expect(resultFor(noticed, [], nowAfter(GRACE + 1))).toMatchObject({
      timing: 'missed',
      otif: 0
    });
  });

  // BL-82 retired the pinned "two partial receipts are not added" (BL-66 (3)).
  it('in full is the SUM of the receipts matched — two partial receipts add up, and still short is short', () => {
    expect(resultFor(callOff(), [receipt(NEED, 100)], nowAfter(10)).inFull).toBe(true);
    const split = resultFor(
      callOff(),
      [receipt(NEED, 60, 'GR-A'), receipt(NEED, 40, 'GR-B')],
      nowAfter(10)
    );
    expect(split).toMatchObject({ inFull: true, otif: 1 });
    const stillShort = resultFor(
      callOff(),
      [receipt(NEED, 60, 'GR-A'), receipt(NEED, 30, 'GR-B')],
      nowAfter(10)
    );
    expect(stillShort).toMatchObject({ inFull: false, otif: 0 });
  });
});

describe('BL-53 · OTIF — when a date changes', () => {
  const NEW = shift(NEED, 7);
  /** @param {CallOffConfirmation['approval']} approval */
  const newDate = (approval) =>
    callOff({
      status: 'Confirmed with New Date',
      confirmation: /** @type {CallOffConfirmation} */ ({
        kind: 'newDate',
        deliveries: [{ quantity: 100, date: NEW }],
        confirmedAt: `${shift(NEED, -20)}T03:00:00.000Z`,
        approval
      })
    });

  it('an ACCEPTED new date resets the clock: arriving on it is on time', () => {
    expect(resultFor(newDate('approved'), [receipt(NEW)], nowAfter(20)).timing).toBe('onTime');
  });

  it('a new date still WAITING for the planner does not: the original date applies', () => {
    expect(resultFor(newDate('awaiting'), [receipt(NEW)], nowAfter(20)).timing).toBe('late');
  });

  // BL-82 retired the pinned "a planner's change applies at once" (BL-66 (2)).
  it('a planner’s change of the need date waits for the supplier: the date both sides last agreed applies', () => {
    const changed = callOff({
      status: 'Awaiting Confirmation',
      needDate: NEW,
      confirmation: undefined,
      agreedDeliveries: [{ quantity: 100, date: NEED }]
    });
    expect(resultFor(changed, [receipt(NEW)], nowAfter(20)).timing).toBe('late');
    expect(resultFor(changed, [receipt(NEED)], nowAfter(20)).timing).toBe('onTime');
  });
});

describe('BL-53 · CFOT — window, early, grain, date change', () => {
  /**
   * @param {Partial<PurchaseOrder>} [over]
   * @returns {PurchaseOrder}
   */
  const po = (over = {}) =>
    /** @type {PurchaseOrder} */ ({
      id: 'po-cfot',
      poNumber: 'PO-CFOT',
      supplierId: 'sup-kpi',
      confirmedDeliveryDate: NEED,
      lineItems: [
        {
          id: 'li-1',
          materialCode: 'MAT-KPI',
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
        poNumber: 'PO-CFOT',
        receivedDate: date,
        inspectionResults: [{ materialCode: 'MAT-KPI', qtyReceived: qty }]
      })
    );

  // BL-82 retired the pinned "however early" (BL-66 (4)): CFOT reads OTIF's early window.
  const EARLY = /** @type {Readonly<Record<string, number>>} */ (
    /** @type {import('./kpiDefinitions').KpiDefinition} */ (
      KPI_DEFINITIONS.find((d) => d.id === 'cfot')
    ).answers.early.values
  ).early;
  it(`received on or before the confirmed date counts up to ${EARLY} days early; earlier, or a day late, does not`, () => {
    expect(
      /** @type {import('./performanceRules').PoCfot} */ (
        poCfot(po(), [gr(shift(NEED, -EARLY), 100)])
      ).pct
    ).toBe(100);
    expect(
      /** @type {import('./performanceRules').PoCfot} */ (
        poCfot(po(), [gr(shift(NEED, -(EARLY + 1)), 100)])
      ).pct
    ).toBe(0);
    expect(
      /** @type {import('./performanceRules').PoCfot} */ (poCfot(po(), [gr(shift(NEED, -60), 100)]))
        .pct
    ).toBe(0);
    expect(
      /** @type {import('./performanceRules').PoCfot} */ (poCfot(po(), [gr(shift(NEED, 1), 100)]))
        .pct
    ).toBe(0);
  });

  it('by quantity: receipts on time are added, up to the confirmed quantity, over the quantity ordered', () => {
    expect(
      /** @type {import('./performanceRules').PoCfot} */ (
        poCfot(po(), [gr(NEED, 60), gr(shift(NEED, -3), 30)])
      ).pct
    ).toBe(90);
    expect(
      /** @type {import('./performanceRules').PoCfot} */ (poCfot(po(), [gr(NEED, 150)])).pct
    ).toBe(100);
  });

  // BL-82 closed what BL-53 pinned here: the guard was `review && decision !==
  // 'accepted'`, so a counter-offer with NO review yet already moved the date.
  // It now binds only once the planner accepted it (BL-66 (1)).
  /** @param {'accepted' | 'rejected' | undefined} decision */
  const counter = (decision) =>
    po(
      /** @type {Partial<PurchaseOrder>} */ (
        /** @type {unknown} */ ({
          response: {
            option: 'adjust',
            respondedAt: `${shift(NEED, -30)}T03:00:00.000Z`,
            lines: [{ lineId: 'li-1', counterQty: 100, counterDate: shift(NEED, 5) }],
            ...(decision
              ? { review: { decision, reviewedAt: `${shift(NEED, -29)}T03:00:00.000Z` } }
              : {})
          }
        })
      )
    );
  const fiveDaysLate = () => [gr(shift(NEED, 5), 100)];

  it('a counter-offer moves the line’s date only once the planner accepts it — not while it waits', () => {
    expect(
      /** @type {import('./performanceRules').PoCfot} */ (
        poCfot(counter(undefined), fiveDaysLate())
      ).pct
    ).toBe(0);
    expect(
      /** @type {import('./performanceRules').PoCfot} */ (
        poCfot(counter('accepted'), fiveDaysLate())
      ).pct
    ).toBe(100);
  });

  it('a REJECTED counter-offer puts the original date back', () => {
    expect(
      /** @type {import('./performanceRules').PoCfot} */ (
        poCfot(counter('rejected'), fiveDaysLate())
      ).pct
    ).toBe(0);
  });
});
