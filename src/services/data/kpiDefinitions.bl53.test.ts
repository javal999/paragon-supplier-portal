// ─────────────────────────────────────────────────────────────────────────────
// BL-53 · THE KPI DEFINITIONS ARE PINNED TO THE ARITHMETIC, NOT TO THE PROSE.
//
// Every sentence on the performance pages is a claim about `callOffRules` /
// `poCfot`. Each claim below is checked by firing the REAL function at its
// stated boundary, from both sides, with the numbers read from the definitions
// module — so the page cannot keep saying "7 days" after the code moves to 5.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import i18n from '../../lib/i18n';
import { BASELINE_MONTHS, KPI_DEFINITIONS, KPI_QUESTIONS } from './kpiDefinitions';
import { callOffOtif, deliveryResults, type ReceiptEvent } from '../transitions/callOffRules';
import { poCfot } from './performanceRules';
import type { CallOff, CallOffConfirmation, PurchaseOrder } from './types';
import type { GoodsReceipt } from '../../data/mockGoodsReceipts';

const otif = KPI_DEFINITIONS.find((d) => d.id === 'otif')!;
const MATCH = otif.answers.window.values!.match;
const GRACE = otif.answers.window.values!.grace;

const DAY = 86_400_000;
const NEED = '2026-06-10';
const shift = (d: string, days: number) => new Date(Date.parse(`${d}T00:00:00.000Z`) + days * DAY).toISOString().slice(0, 10);
const nowAfter = (days: number) => `${shift(NEED, days)}T12:00:00.000Z`;

const callOff = (over: Partial<CallOff> = {}): CallOff => ({
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
  confirmation: { kind: 'confirm', deliveries: [{ quantity: 100, date: NEED }], confirmedAt: `${shift(NEED, -20)}T03:00:00.000Z`, approval: 'auto' },
  dispatches: [],
  notes: [],
  ...over,
});
const receipt = (date: string, quantity = 100, ref = 'GR-KPI'): ReceiptEvent => ({
  ref, supplierId: 'sup-kpi', materialCode: 'MAT-KPI', date, quantity,
});
const resultFor = (c: CallOff, receipts: ReceiptEvent[], now: string) => {
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
    expect(i18n.t('perf.kpi.otif.window', { ...otif.answers.window.values, lng: 'en' })).toContain(`${MATCH} days`);
  });

  it('the target reads "Baseline period", and the baseline is BL-19’s three months', () => {
    expect(BASELINE_MONTHS).toBe(3);
    expect(i18n.t('perf.kpi.target.baseline', { lng: 'en' })).toMatch(/^Baseline period/);
    expect(i18n.t('perf.measuredCallOffs', { count: 2, lng: 'en' })).not.toMatch(/target \d/);
  });
});

describe('BL-53 · OTIF — the delivery window, both edges', () => {
  it(`on the date: on time · one day late: late (0)`, () => {
    expect(resultFor(callOff(), [receipt(NEED)], nowAfter(10))).toMatchObject({ timing: 'onTime', otif: 1 });
    expect(resultFor(callOff(), [receipt(shift(NEED, 1))], nowAfter(10))).toMatchObject({ timing: 'late', otif: 0 });
  });

  it(`nothing received: pending up to ${GRACE} days after, missed after that`, () => {
    expect(resultFor(callOff(), [], nowAfter(GRACE)).timing).toBe('pending');
    expect(resultFor(callOff(), [], nowAfter(GRACE)).otif).toBeNull();
    expect(resultFor(callOff(), [], nowAfter(GRACE + 1))).toMatchObject({ timing: 'missed', otif: 0 });
  });

  it(`a receipt more than ${MATCH} days late is not matched at all`, () => {
    expect(resultFor(callOff(), [receipt(shift(NEED, MATCH))], nowAfter(30)).timing).toBe('late');
    expect(resultFor(callOff(), [receipt(shift(NEED, MATCH + 1))], nowAfter(30)).timing).toBe('missed');
  });
});

describe('BL-53 · OTIF — early deliveries', () => {
  it(`count as on time up to ${MATCH} days early, and are not matched beyond`, () => {
    expect(resultFor(callOff(), [receipt(shift(NEED, -MATCH))], nowAfter(1))).toMatchObject({ timing: 'onTime', otif: 1 });
    expect(resultFor(callOff(), [receipt(shift(NEED, -(MATCH + 1)))], nowAfter(1)).timing).toBe('pending');
  });
});

describe('BL-53 · OTIF — the grain and "in full"', () => {
  it('per call-off: a partially confirmed call-off is 1 only if EVERY delivery is on time and in full', () => {
    const partial = callOff({
      status: 'Partially Confirmed',
      confirmation: {
        kind: 'partial',
        deliveries: [{ quantity: 60, date: NEED }, { quantity: 40, date: shift(NEED, 14) }],
        confirmedAt: `${shift(NEED, -20)}T03:00:00.000Z`,
        approval: 'auto',
      } as CallOffConfirmation,
    });
    const both = deliveryResults([partial], [receipt(NEED, 60, 'GR-1'), receipt(shift(NEED, 14), 40, 'GR-2')], [], nowAfter(30));
    expect(callOffOtif(partial.id, both)).toBe(1);
    const secondLate = deliveryResults([partial], [receipt(NEED, 60, 'GR-1'), receipt(shift(NEED, 15), 40, 'GR-2')], [], nowAfter(30));
    expect(callOffOtif(partial.id, secondLate)).toBe(0);
  });

  it('a notice of dispatch alone is not a result — and it keeps the call-off out of "missed" for good', () => {
    const noticed = callOff({
      dispatches: [{ id: 'dsp-1', shippedDate: shift(NEED, -2), expectedArrival: NEED, quantity: 100, recordedAt: `${shift(NEED, -2)}T03:00:00.000Z` }],
    } as Partial<CallOff>);
    const r = resultFor(noticed, [], nowAfter(60));
    expect(r.otif).toBeNull();
    expect(r.timing).not.toBe('missed');
  });

  it('in full is ONE receipt against the agreed quantity — two partial receipts are not added', () => {
    expect(resultFor(callOff(), [receipt(NEED, 100)], nowAfter(10)).inFull).toBe(true);
    const split = resultFor(callOff(), [receipt(NEED, 60, 'GR-A'), receipt(NEED, 40, 'GR-B')], nowAfter(10));
    expect(split.inFull).toBe(false);
    expect(split.otif).toBe(0);
  });
});

describe('BL-53 · OTIF — when a date changes', () => {
  const NEW = shift(NEED, 7);
  const newDate = (approval: CallOffConfirmation['approval']) =>
    callOff({
      status: 'Confirmed with New Date',
      confirmation: { kind: 'newDate', deliveries: [{ quantity: 100, date: NEW }], confirmedAt: `${shift(NEED, -20)}T03:00:00.000Z`, approval } as CallOffConfirmation,
    });

  it('an ACCEPTED new date resets the clock: arriving on it is on time', () => {
    expect(resultFor(newDate('approved'), [receipt(NEW)], nowAfter(20)).timing).toBe('onTime');
  });

  it('a new date still WAITING for the planner does not: the original date applies', () => {
    expect(resultFor(newDate('awaiting'), [receipt(NEW)], nowAfter(20)).timing).toBe('late');
  });

  it('a planner’s change of the need date applies at once, before the supplier confirms again', () => {
    const changed = callOff({ status: 'Awaiting Confirmation', needDate: NEW, confirmation: undefined });
    expect(resultFor(changed, [receipt(NEW)], nowAfter(20)).timing).toBe('onTime');
  });
});

describe('BL-53 · CFOT — window, early, grain, date change', () => {
  const po = (over: Partial<PurchaseOrder> = {}): PurchaseOrder =>
    ({
      id: 'po-cfot',
      poNumber: 'PO-CFOT',
      supplierId: 'sup-kpi',
      confirmedDeliveryDate: NEED,
      lineItems: [{ id: 'li-1', materialCode: 'MAT-KPI', description: 'x', quantity: 100, uom: 'PCS', unitPrice: 1, confirmedQty: 100 }],
      ...over,
    }) as PurchaseOrder;
  const gr = (date: string, qty: number): GoodsReceipt =>
    ({
      poNumber: 'PO-CFOT',
      receivedDate: date,
      inspectionResults: [{ materialCode: 'MAT-KPI', qtyReceived: qty }],
    }) as unknown as GoodsReceipt;

  it('received on or before the confirmed date counts, however early; a day late does not', () => {
    expect(poCfot(po(), [gr(shift(NEED, -60), 100)])!.pct).toBe(100);
    expect(poCfot(po(), [gr(shift(NEED, 1), 100)])!.pct).toBe(0);
  });

  it('by quantity: receipts on time are added, up to the confirmed quantity, over the quantity ordered', () => {
    expect(poCfot(po(), [gr(NEED, 60), gr(shift(NEED, -3), 30)])!.pct).toBe(90);
    expect(poCfot(po(), [gr(NEED, 150)])!.pct).toBe(100);
  });

  // ⚠️ WHAT THE CODE DOES, PINNED — AND IT DIFFERS FROM ITS OWN COMMENT. The
  // comment in `confirmedLine` says a counter-offer binds only once accepted;
  // the guard is `review && decision !== 'accepted'`, so a counter-offer with NO
  // review yet (still waiting) already moves the date. The page states this
  // behaviour; the difference is reported, not silently fixed (BL-53 brief).
  const counter = (decision: 'accepted' | 'rejected' | undefined) =>
    po({
      response: {
        option: 'adjust',
        respondedAt: `${shift(NEED, -30)}T03:00:00.000Z`,
        lines: [{ lineId: 'li-1', counterQty: 100, counterDate: shift(NEED, 5) }],
        ...(decision ? { review: { decision, reviewedAt: `${shift(NEED, -29)}T03:00:00.000Z` } } : {}),
      },
    } as unknown as Partial<PurchaseOrder>);
  const fiveDaysLate = () => [gr(shift(NEED, 5), 100)];

  it('a counter-offer moves the line’s date as soon as it is sent — waiting or accepted', () => {
    expect(poCfot(counter(undefined), fiveDaysLate())!.pct).toBe(100);
    expect(poCfot(counter('accepted'), fiveDaysLate())!.pct).toBe(100);
  });

  it('a REJECTED counter-offer puts the original date back', () => {
    expect(poCfot(counter('rejected'), fiveDaysLate())!.pct).toBe(0);
  });
});
