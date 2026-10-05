// ─────────────────────────────────────────────────────────────────────────────
// THE `purchaseOrder` FAMILY ANCHOR — re-derived from the raw source, never
// trusted from `FAMILY_ANCHORS`.
//
// ⚠️ **THE DEFECT THIS CLOSES IS THE ONE THE WHOLE MODULE EXISTS FOR, ONE
// FAMILY LATE.** Until the demo-data batch, `mockPurchaseOrders.js` was the last
// fixture in the tree still carrying its authored 2025 literals: every order was
// placed a year before the goods receipts that fulfil it and fourteen months
// before the invoices that bill it, on three surfaces that render both. Nothing
// could say so, because nothing compared the two families.
//
// ── WHAT IS ASSERTED, AND WHY EACH HALF IS NOT THE OTHER ────────────────────
//   1. The anchor equals `max(orderDate)` over the RAW literals — read off disk,
//      upstream of the shift, so this cannot be satisfied by the exported rows
//      agreeing with themselves (§86).
//   2. It also equals the eta of the latest DELIVERED ASN. That is a SECOND,
//      INDEPENDENT instrument: it comes from a different file, a different
//      corpus and a different kind of fact (a delivery that has happened cannot
//      be in the future). Two instruments landing on one day is what the
//      `contract` / `obligation` and `invoice` anchors were each corroborated
//      by, and it is the only reason this anchor is more than a maximum.
//   3. The consequences a reader actually sees: nothing is ordered after the
//      present, nothing DELIVERED is delivered after it, and the ASNs moved
//      with their orders so `orderDate <= eta` survived the shift.
//
// ⚠️ **AND THE ANTI-VACUITY CONTROL MATTERS MORE HERE THAN USUAL.** Every
// assertion below is of the form "no row is later than X", which an empty read
// satisfies perfectly. The populations are pinned first.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { DECLARED_PRESENT, FAMILY_ANCHORS, shiftDays } from './fixturePresent';
import { mockPurchaseOrders } from '@data/mockPurchaseOrders';
import { MOCK_ASNS } from './mock/fixtures/supplierShipments';
import { POStatus } from './types';

/** The latest of a set of `YYYY-MM-DD` strings. `at(-1)` is not in this lib target. */
const latest = (days: readonly string[]): string => [...days].sort()[days.length - 1];

/** RAW literals, off disk — upstream of `shiftFields`. */
const rawDates = (file: string, key: string): string[] =>
  [...readFileSync(file, 'utf8').matchAll(new RegExp(`${key}: '(\\d{4}-\\d{2}-\\d{2})'`, 'g'))].map(
    (m) => m[1],
  );

const RAW_ORDER_DATES = rawDates('src/data/mockPurchaseOrders.js', 'orderDate');
const RAW_ETAS = rawDates('src/services/data/mock/fixtures/supplierShipments.ts', 'eta');

const A = FAMILY_ANCHORS.purchaseOrder.anchor;

describe('POPULATION CONTROLS — every claim below is a "nothing later than" shape', () => {
  it('the raw literals were actually read, and they are RAW', () => {
    expect(RAW_ORDER_DATES.length).toBeGreaterThan(20);
    expect(RAW_ETAS.length).toBeGreaterThan(3);
    // Raw means 2025: the shift is what moves them, and it has not run here.
    expect(RAW_ORDER_DATES.every((d) => d.startsWith('2025-'))).toBe(true);
  });

  it('⚠️ the exported rows are NOT the raw ones — the shift is real', () => {
    expect(shiftDays('purchaseOrder')).toBeGreaterThan(400);
    const po007 = mockPurchaseOrders.find((p) => p.id === 'po-007')!;
    expect(po007.orderDate).not.toBe('2025-03-15');
    // …and the ASNs moved by the SAME shift, which is the point of their
    // membership in this family rather than in `shipment`.
    const delivered = MOCK_ASNS.find((a) => a.asnNumber === 'ASN-2025-00302')!;
    expect(delivered.eta).not.toBe('2025-04-18');
  });
});

describe('⚠️ THE ANCHOR IS DERIVED, AND TWO INSTRUMENTS AGREE ON IT', () => {
  it('it is max(orderDate) over the raw fixture — the newest order is the present', () => {
    expect(A).toBe(latest(RAW_ORDER_DATES));
  });

  it('⚠️ and the latest DELIVERED ASN arrives on exactly that day — a second instrument', () => {
    // A delivery that HAS happened cannot be in the future. The latest such eta
    // is therefore an upper bound on the family's present, arrived at from a
    // different file and a different kind of fact than the maximum above.
    const rawDeliveredEta: string[] = [...readFileSync(
      'src/services/data/mock/fixtures/supplierShipments.ts',
      'utf8',
    ).matchAll(/status: '(\w[\w ]*)',[\s\S]*?eta: '(\d{4}-\d{2}-\d{2})'/g)]
      .filter((m) => m[1] === 'Delivered')
      .map((m) => m[2]);
    expect(rawDeliveredEta.length).toBeGreaterThan(1);
    expect(latest(rawDeliveredEta)).toBe(A);
  });
});

describe('⚠️ THE PAYOFF — what a reader sees at the declared present', () => {
  it('no order is placed after the present, and the newest lands ON it', () => {
    expect(latest(mockPurchaseOrders.map((p) => p.orderDate))).toBe(DECLARED_PRESENT);
    for (const po of mockPurchaseOrders) {
      expect(po.orderDate <= DECLARED_PRESENT, po.poNumber).toBe(true);
    }
  });

  it('nothing DELIVERED or CLOSED is confirmed for a date still in the future', () => {
    const done = mockPurchaseOrders.filter(
      (p) => p.status === POStatus.DELIVERED || p.status === POStatus.CLOSED,
    );
    expect(done.length).toBeGreaterThan(3);
    for (const po of done) {
      expect(po.confirmedDeliveryDate <= DECLARED_PRESENT, po.poNumber).toBe(true);
    }
  });

  it('⚠️ a DELIVERED ASN has arrived, and an In Transit one is still moving OR late', () => {
    const delivered = MOCK_ASNS.filter((a) => a.status === 'Delivered');
    expect(delivered.length).toBeGreaterThan(1);
    for (const a of delivered) expect(a.eta <= DECLARED_PRESENT, a.asnNumber).toBe(true);
  });

  it('the ASNs moved WITH their orders — `orderDate <= eta` survived the shift', () => {
    const dated = MOCK_ASNS.filter((a) => a.eta !== '');
    expect(dated.length).toBeGreaterThan(3);
    for (const a of dated) {
      const parent = mockPurchaseOrders.find((p) => p.poNumber === a.poReference)!;
      expect(parent, a.asnNumber).toBeDefined();
      expect(parent.orderDate <= a.eta, `${a.asnNumber} vs ${parent.poNumber}`).toBe(true);
    }
  });
});
