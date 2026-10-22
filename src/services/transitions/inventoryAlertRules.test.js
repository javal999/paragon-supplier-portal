// ────────────────────────────────────────────────────────────────────────────
// MR-9 (SC Hub Material F1), pure: days to impact per rule (BR-03), the order
// within a class and after grouping (BR-02, AC-01, AR-13), the close-reason
// rule (BR-04, AC-02, AC-03) and the count per rule per reason (BR-06, AC-04).
// ────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
/** @import { CapacityPlan, InventoryAlert, InventoryPosition } from '../data/types' */
/** @import { AlertLedgerEntry } from './inventoryAlertRules' */
import {
  NO_DAYS_TO_IMPACT,
  alertCloseRefusal,
  alertsFromLedger,
  closeReasonCounts,
  closeReasonOf,
  deriveAlertConditions,
  groupAlertsBySupplier
} from './inventoryAlertRules';
import { horizonWeeks } from './capacityRules';
import { reasonCodeStore } from './reasonCodes';

const NOW = '2026-08-31T12:00:00.000Z';
const HORIZON = horizonWeeks(NOW);
const NOBODY = /** @type {const} */ ({ kind: 'UNATTRIBUTED', reason: 'NO_PERSON_IN_SESSION' });

/**
 * @param {Partial<InventoryPosition>} [over]
 * @returns {InventoryPosition}
 */
const position = (over = {}) => ({
  supplierId: 'sup-007',
  supplierName: 'PT Sample Packaging Indonesia',
  materialCode: 'PK-A',
  materialLabel: 'A',
  materialType: 'VERP',
  materialGroup: 'MG-20',
  uom: 'PCS',
  supplierSoh: 4500,
  supplierRop: null,
  ptiSoh: 1000,
  ptiRop: 500,
  ptiStockShared: true,
  consignment: false,
  incoming: [],
  avgDailyDemand: 100,
  demandSource: 'forecast',
  leadTimeDays: 30,
  lastUpdatedAt: '2026-08-31T02:00:00.000Z',
  channel: 'manual',
  updateSla: 7,
  staleAt: null,
  lastPullFailedAt: null,
  apiConnected: false,
  lastSync: null,
  batches: [],
  ...over
});

/**
 * @param {Partial<CapacityPlan>} [over]
 * @returns {CapacityPlan}
 */
const plan = (over = {}) => ({
  supplierId: 'sup-007',
  supplierName: 'PT Sample Packaging Indonesia',
  planningGroupId: 'pg-MG-20',
  materials: [],
  uom: 'PCS',
  weeks: HORIZON.map((week, i) => ({
    week,
    demand: 100,
    entry: { week, allocated: i === 2 ? 10 : 100, ...(i === 2 ? { reason: 'capacity' } : {}) }
  })),
  latest: null,
  ...over
});

beforeEach(() => {
  reasonCodeStore.reset();
});

describe('MR-9 BR-02 / AC-01 — within a class, fewest days to impact first', () => {
  // DRC-D15 (BL-196) — these ran on `supplierBelowRop`, which no longer fires;
  // `ptiBelowRop` is a stock rule with the same days of cover and class.
  // Two High alerts: 10 days of cover at "PT A…" and 3 days at "PT Z…". By
  // supplier name A would come first; by days to impact the 3-day one does.
  const conditions = deriveAlertConditions(
    [
      position({
        supplierId: 'sup-a',
        supplierName: 'PT A Early Name',
        materialCode: 'M10',
        supplierSoh: 1000,
        ptiSoh: 0,
        ptiRop: 2000
      }),
      position({
        supplierId: 'sup-z',
        supplierName: 'PT Z Late Name',
        materialCode: 'M3',
        supplierSoh: 300,
        ptiSoh: 0,
        ptiRop: 2000
      })
    ],
    [],
    NOW
  );
  const alerts = alertsFromLedger(conditions, []).filter((a) => a.rule === 'ptiBelowRop');

  it('2 High alerts with 3 and 10 days of cover list the 3-day one first', () => {
    expect(alerts.map((a) => [a.riskClass, a.daysToImpact, a.supplierId])).toEqual([
      ['high', 3, 'sup-z'],
      ['high', 10, 'sup-a']
    ]);
  });

  it('…and grouping by supplier keeps that order (AR-13)', () => {
    expect(groupAlertsBySupplier(alerts).map((g) => g.supplierId)).toEqual(['sup-z', 'sup-a']);
    // A group is placed by its most urgent alert even when its input came in name order.
    expect(groupAlertsBySupplier([...alerts].reverse()).map((g) => g.supplierId)).toEqual([
      'sup-z',
      'sup-a'
    ]);
  });

  it('the class still comes first: a Medium alert with fewer days sorts after a High one', () => {
    const mixed = alertsFromLedger(
      deriveAlertConditions(
        [
          position({
            supplierId: 'sup-h',
            supplierName: 'PT H',
            materialCode: 'H',
            supplierSoh: 2900,
            ptiSoh: 0,
            ptiRop: 5000
          }), // 29 d, High
          position({
            supplierId: 'sup-m',
            supplierName: 'PT M',
            materialCode: 'M',
            supplierSoh: 4000,
            ptiSoh: 0,
            ptiRop: 5000,
            leadTimeDays: 30
          }) // 40 d, Medium
        ],
        [],
        NOW
      ),
      []
    ).filter((a) => a.rule === 'ptiBelowRop');
    expect(mixed.map((a) => [a.riskClass, a.supplierId])).toEqual([
      ['high', 'sup-h'],
      ['medium', 'sup-m']
    ]);
  });
});

describe('MR-9 BR-03 — days to impact per rule', () => {
  it('stock rules read days of cover; a projected stock-out reads days until PTI stock runs out', () => {
    const c = deriveAlertConditions(
      [
        position({
          materialCode: 'P3',
          supplierSoh: 2000,
          ptiSoh: 300,
          incoming: [{ source: 'asn', date: '2026-09-10', quantity: 1, reference: 'A' }]
        })
      ],
      [],
      NOW
    );
    expect(
      /** @type {NonNullable<ReturnType<typeof c.find>>} */ (c.find((x) => x.rule === 'coverage'))
        .daysToImpact
    ).toBe(20);
    expect(
      /** @type {NonNullable<ReturnType<typeof c.find>>} */ (
        c.find((x) => x.rule === 'projectedStockOut')
      ).daysToImpact
    ).toBe(3);
  });

  it('a stock rule with no demand has no impact date and sorts last in its class', () => {
    const c = deriveAlertConditions(
      [position({ ptiSoh: 0, ptiRop: 5000, avgDailyDemand: null })],
      [],
      NOW
    );
    expect(
      /** @type {NonNullable<ReturnType<typeof c.find>>} */ (
        c.find((x) => x.rule === 'ptiBelowRop')
      ).daysToImpact
    ).toBe(NO_DAYS_TO_IMPACT);
  });

  it('supplierBelowRop reads the SYSTEM ROP Supplier (owner 2026-10-19); the typed ROP is display only; no system figure, no alert', () => {
    const c = deriveAlertConditions(
      [
        // Typed ROP above the stock, system figure below it → no alert.
        position({
          materialCode: 'PK-A',
          supplierSoh: 1000,
          supplierRop: 5000,
          systemRopSupplier: { value: 800, unavailable: null }
        }),
        // System figure above the stock → alert, with the stock rule's days of cover.
        position({
          materialCode: 'PK-B',
          supplierSoh: 1000,
          systemRopSupplier: { value: 2000, unavailable: null }
        }),
        // "Not available" (a lead-time leg the hub does not hold) → no alert.
        position({
          materialCode: 'PK-C',
          supplierSoh: 1000,
          supplierRop: 5000,
          systemRopSupplier: { value: null, unavailable: 'NOT_ON_ROUTE' }
        })
      ],
      [],
      NOW
    );
    expect(c.filter((x) => x.rule === 'supplierBelowRop').map((x) => x.subject)).toEqual(['PK-B']);
    expect(c.find((x) => x.rule === 'supplierBelowRop')?.daysToImpact).toBe(10);
  });

  it('capacity: days to the first gap week', () => {
    const c = deriveAlertConditions([], [plan()], NOW);
    // Week 3 of the horizon starts on 2026-09-14, 14 days after 2026-08-31.
    expect(
      /** @type {NonNullable<ReturnType<typeof c.find>>} */ (
        c.find((x) => x.rule === 'capacityBelowDemand')
      ).daysToImpact
    ).toBe(14);
  });

  describe('INV-D12 (BL-225) — accepted additional capacity and the capacity alert', () => {
    /** Week i: allocated 10 against demand 100; `upside` decides amber or red. */
    const withGaps = (/** @type {Record<number, number>} */ upsideByWeek) =>
      plan({
        weeks: HORIZON.map((week, i) => ({
          week,
          demand: 100,
          entry:
            i in upsideByWeek
              ? { week, allocated: 10, upside: upsideByWeek[i], reason: 'capacity' }
              : { week, allocated: 100 }
        }))
      });
    /** @param {string[]} weeks */
    const acceptedOn =
      (weeks) => (/** @type {string} */ s, /** @type {string} */ g, /** @type {string} */ w) =>
        s === 'sup-007' && g === 'pg-MG-20' && weeks.includes(w);
    const capacity = (/** @type {ReturnType<typeof deriveAlertConditions>} */ c) =>
      c.find((x) => x.rule === 'capacityBelowDemand');

    it('every gap week amber and accepted: no capacity alert', () => {
      const c = deriveAlertConditions(
        [],
        [withGaps({ 2: 100, 4: 100 })],
        NOW,
        [],
        [],
        [],
        [],
        [],
        acceptedOn([HORIZON[2], HORIZON[4]])
      );
      expect(capacity(c)).toBeUndefined();
    });

    it('one amber week still not accepted: the alert stays, impact at that week', () => {
      const c = deriveAlertConditions(
        [],
        [withGaps({ 2: 100, 4: 100 })],
        NOW,
        [],
        [],
        [],
        [],
        [],
        acceptedOn([HORIZON[2]])
      );
      // Week 5 of the horizon starts 28 days after 2026-08-31.
      expect(capacity(c)?.daysToImpact).toBe(28);
    });

    it('a red week always counts, even if a decision names it', () => {
      // Upside 50 → BE 60 < demand 100: red ("Cannot be supplied").
      const c = deriveAlertConditions(
        [],
        [withGaps({ 2: 50 })],
        NOW,
        [],
        [],
        [],
        [],
        [],
        acceptedOn([HORIZON[2]])
      );
      expect(capacity(c)?.daysToImpact).toBe(14);
    });

    it('control: with no decisions the amber weeks raise the alert as before', () => {
      const c = deriveAlertConditions([], [withGaps({ 2: 100, 4: 100 })], NOW);
      expect(capacity(c)?.daysToImpact).toBe(14);
    });
  });

  it('stale data: minus the days since it went stale, so the oldest comes first', () => {
    const c = deriveAlertConditions(
      [
        // Updated 2026-08-01, SLA 7 days → stale since 2026-08-08: 23 days.
        position({
          supplierId: 'sup-old',
          supplierName: 'PT Old',
          materialCode: 'S1',
          lastUpdatedAt: '2026-08-01T12:00:00.000Z'
        }),
        // Updated 2026-08-20 → stale since 2026-08-27: 4 days.
        position({
          supplierId: 'sup-new',
          supplierName: 'PT New',
          materialCode: 'S2',
          lastUpdatedAt: '2026-08-20T12:00:00.000Z'
        })
      ],
      [],
      NOW
    );
    const stale = alertsFromLedger(c, []).filter((a) => a.rule === 'staleData');
    expect(stale.map((a) => [a.supplierId, a.daysToImpact])).toEqual([
      ['sup-old', -23],
      ['sup-new', -4]
    ]);
  });

  it('other rules: 0', () => {
    const c = deriveAlertConditions([], [], NOW, [
      {
        supplierId: 'sup-007',
        supplierName: 'PT Sample Packaging Indonesia',
        materialCode: 'PK-A',
        materialLabel: 'A',
        firm: true
      }
    ]);
    expect(
      /** @type {NonNullable<ReturnType<typeof c.find>>} */ (
        c.find((x) => x.rule === 'commitmentBelowForecast')
      ).daysToImpact
    ).toBe(0);
  });
});

describe('MR-9 BR-04 — the close reason rule (the page pre-check and the verb hook)', () => {
  it('REASON_UNKNOWN fires for no reason, an unknown code and a retired code; an active code passes', () => {
    expect(alertCloseRefusal(undefined, '')).toBe('REASON_UNKNOWN');
    expect(alertCloseRefusal('', '')).toBe('REASON_UNKNOWN');
    expect(alertCloseRefusal('not-a-code', '')).toBe('REASON_UNKNOWN');
    expect(alertCloseRefusal('po-raised', '')).toBeNull();
    reasonCodeStore.append({
      list: 'alertClose',
      code: 'po-raised',
      labelEn: 'PO raised',
      labelId: 'PO dibuat',
      active: false,
      setBy: NOBODY,
      setAt: NOW
    });
    expect(alertCloseRefusal('po-raised', 'note')).toBe('REASON_UNKNOWN');
  });

  it('NOTE_REQUIRED fires for "Other" without a note (AC-02); with a note it passes', () => {
    expect(alertCloseRefusal('other', '   ')).toBe('NOTE_REQUIRED');
    expect(alertCloseRefusal('other', undefined)).toBe('NOTE_REQUIRED');
    expect(alertCloseRefusal('other', 'Buyer phoned the supplier')).toBeNull();
  });
});

describe('MR-9 BR-06 / AC-04 — count per reason per rule; a note-only closure counts as Other', () => {
  const conditions = deriveAlertConditions(
    [
      position({ materialCode: 'P1', ptiSoh: 400, ptiRop: 500 }),
      position({ materialCode: 'P2', ptiSoh: 400, ptiRop: 500 }),
      position({ materialCode: 'P3', ptiSoh: 400, ptiRop: 500 })
    ],
    [],
    NOW
  );
  /** @type {AlertLedgerEntry[]} */
  const ledger = [
    { key: 'ptiBelowRop|P1|sup-007', kind: 'closed', at: NOW, closeReason: 'po-raised' },
    { key: 'ptiBelowRop|P2|sup-007', kind: 'closed', at: NOW, closeReason: 'po-raised' },
    // Recorded before reasons existed: a note, no code.
    { key: 'ptiBelowRop|P3|sup-007', kind: 'closed', at: NOW, note: 'Earlier call-off requested' }
  ];
  /** @type {InventoryAlert[]} */
  const alerts = alertsFromLedger(conditions, ledger);

  it('the closed alerts carry their reason, and the old one reads as Other with its note kept', () => {
    const old = /** @type {NonNullable<ReturnType<typeof alerts.find>>} */ (
      alerts.find((a) => a.key === 'ptiBelowRop|P3|sup-007')
    );
    expect(old.closeReason).toBeUndefined();
    expect(old.actionNote).toBe('Earlier call-off requested');
    expect(closeReasonOf(old)).toBe('other');
  });

  it('counts per rule per reason, open alerts not counted', () => {
    expect(closeReasonCounts(alerts)).toEqual([
      { rule: 'ptiBelowRop', reason: 'po-raised', count: 2 },
      { rule: 'ptiBelowRop', reason: 'other', count: 1 }
    ]);
    expect(closeReasonCounts(alertsFromLedger(conditions, []))).toEqual([]);
  });
});
