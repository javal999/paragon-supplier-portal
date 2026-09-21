// ────────────────────────────────────────────────────────────────────────────
// Capacity confirmation (REQ-E08-04) and alert (REQ-E08-05) derivations, pure:
// the 13-week horizon, the below-demand reason rule, plan and PO status, the
// risk class, one open alert per condition, closure and recurrence, grouping.
// ────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import type { CapacityPlan, InventoryPosition } from '../data/types';
import {
  capacityStatusForPo,
  capacitySubmissionRefusal,
  gapWeeks,
  horizonWeeks,
  planStatus,
} from './capacityRules';
import { CAPACITY_HORIZON_WEEKS, CAPACITY_REASONS } from './inventoryConfig';
import {
  alertKey,
  alertsFromLedger,
  clearedSince,
  deriveAlertConditions,
  groupAlertsBySupplier,
  parseAlertKey,
  type AlertLedgerEntry,
} from './inventoryAlertRules';
import { positionRisk } from './inventoryRules';
import type { MaterialMasterEntry } from '../sdc/types';

const NOW = '2026-08-31T12:00:00.000Z';
const HORIZON = horizonWeeks(NOW);

describe('REQ-E08-04 — the horizon and the below-demand rule', () => {
  it('13 weekly buckets starting with the current week', () => {
    expect(CAPACITY_HORIZON_WEEKS).toBe(13);
    expect(HORIZON).toHaveLength(13);
    expect(HORIZON[0]).toBe('2026-08-31');
    expect(HORIZON[12]).toBe('2026-11-23');
    expect(horizonWeeks('2026-09-02T00:00:00.000Z')[0]).toBe('2026-08-31');
  });

  it('starter reason codes are Capacity, Material, Logistics, Quality, Other', () => {
    expect(CAPACITY_REASONS).toEqual(['capacity', 'material', 'logistics', 'quality', 'other']);
  });

  const weeks = (patch: Record<number, object> = {}) =>
    HORIZON.map((week, i) => ({ week, allocated: 100, ...(patch[i] ?? {}) }));
  const demand = () => 100;

  it('known-good: every week at or above demand, upside optional', () => {
    expect(capacitySubmissionRefusal(weeks({ 3: { upside: 20 } }), demand, HORIZON)).toBeNull();
  });

  it('known-bad: a week below demand without a reason is refused (AC-02)', () => {
    expect(capacitySubmissionRefusal(weeks({ 2: { allocated: 99 } }), demand, HORIZON)).toEqual({
      refusal: 'reasonRequired',
      week: HORIZON[2],
    });
    expect(capacitySubmissionRefusal(weeks({ 2: { allocated: 99, reason: 'weather' } }), demand, HORIZON)?.refusal).toBe(
      'reasonRequired',
    );
  });

  it('a starter reason clears it; Other needs a note', () => {
    expect(capacitySubmissionRefusal(weeks({ 2: { allocated: 50, reason: 'material' } }), demand, HORIZON)).toBeNull();
    expect(capacitySubmissionRefusal(weeks({ 2: { allocated: 50, reason: 'other' } }), demand, HORIZON)?.refusal).toBe('noteRequired');
    expect(
      capacitySubmissionRefusal(weeks({ 2: { allocated: 50, reason: 'other', note: 'Machine shutdown' } }), demand, HORIZON),
    ).toBeNull();
  });

  it('every horizon week once, with valid quantities', () => {
    expect(capacitySubmissionRefusal(weeks().slice(1), demand, HORIZON)).toEqual({ refusal: 'missingWeek', week: HORIZON[0] });
    expect(capacitySubmissionRefusal([...weeks(), weeks()[0]], demand, HORIZON)?.refusal).toBe('duplicateWeek');
    expect(capacitySubmissionRefusal(weeks({ 0: { week: '2027-01-04' } }), demand, HORIZON)?.refusal).toBe('weekOutsideHorizon');
    expect(capacitySubmissionRefusal(weeks({ 1: { allocated: -1 } }), demand, HORIZON)?.refusal).toBe('invalidQuantity');
    expect(capacitySubmissionRefusal(weeks({ 1: { allocated: Number.NaN } }), demand, HORIZON)?.refusal).toBe('invalidQuantity');
    expect(capacitySubmissionRefusal([], demand, HORIZON)?.refusal).toBe('noWeeks');
  });
});

describe('capacity status per plan and per PO (Order summary)', () => {
  const plan = (group: string, entries: ((i: number) => number) | null): CapacityPlan => ({
    supplierId: 'sup-007',
    supplierName: 'x',
    materialGroup: group,
    materials: [],
    uom: 'PCS',
    weeks: HORIZON.map((week, i) => ({
      week,
      demand: 100,
      entry: entries ? { week, allocated: entries(i) } : null,
    })),
    latest: entries ? { id: 'c', supplierId: 'sup-007', materialGroup: group, submittedAt: NOW, weeks: [] } : null,
  });
  const master = (code: string) => ({ 'PK-A': { materialGroup: 'MG-20' }, 'PK-B': { materialGroup: 'MG-21' } } as Record<string, Partial<MaterialMasterEntry>>)[code] as MaterialMasterEntry | null ?? null;

  it('not started, gap (with its weeks), confirmed', () => {
    expect(planStatus(plan('MG-20', null))).toBe('notStarted');
    const gap = plan('MG-20', (i) => (i === 2 ? 60 : 100));
    expect(planStatus(gap)).toBe('gap');
    expect(gapWeeks(gap).map((w) => w.week)).toEqual([HORIZON[2]]);
    expect(planStatus(plan('MG-20', () => 100))).toBe('confirmed');
  });

  it('a PO is Confirmed only when every group on it is; the worst group wins', () => {
    const po = (codes: string[]) => ({ supplierId: 'sup-007', lineItems: codes.map((materialCode) => ({ materialCode })) }) as never;
    const plans = [plan('MG-20', () => 100), plan('MG-21', (i) => (i === 0 ? 1 : 100))];
    expect(capacityStatusForPo(po(['PK-A']), plans, master)).toBe('confirmed');
    expect(capacityStatusForPo(po(['PK-A', 'PK-B']), plans, master)).toBe('gap');
    expect(capacityStatusForPo(po(['PK-A']), [], master)).toBe('notStarted');
    expect(capacityStatusForPo(po(['UNKNOWN']), plans, master)).toBe('notStarted');
  });
});

const position = (over: Partial<InventoryPosition> = {}): InventoryPosition => ({
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
  apiConnected: false,
  lastSync: null,
  batches: [],
  ...over,
});

describe('REQ-E08-05 BR-02 — risk class (CR-24 since 2026-09-21; was CR-02 band × CR-03 coverage)', () => {
  // Demand 100/day, lead time 30 days, so 1× = 3000 and 1.5× = 4500 units.
  it('lead time decides: High below it, Medium below 1.5 ×, Low otherwise', () => {
    expect(positionRisk(position({ supplierSoh: 1300 })).riskClass).toBe('high'); // 13 days
    expect(positionRisk(position({ supplierSoh: 4500 })).riskClass).toBe('low'); // 45 days = 1.5 ×
    // PREMISE CHANGED (BL-46): 25 days with 0.83 coverage was Medium under the
    // old rule (Warning band, At-risk coverage). Against a 30-day lead time it
    // is below 1 ×, so High.
    expect(positionRisk(position({ supplierSoh: 2500 })).riskClass).toBe('high');
    // PREMISE CHANGED: 29 days was Medium by the Warning band even when covered.
    // It is still below the 30-day lead time, so High — coverage never lowers it.
    expect(
      positionRisk(position({ supplierSoh: 2900, incoming: [{ source: 'production', date: null, quantity: 1000, reference: null }] }))
        .riskClass,
    ).toBe('high');
  });

  it('coverage no longer sets the class: Uncovered but above 1.5 × lead time is Low', () => {
    // 45 days of cover, lead time 20 (1.5 × = 30): Low, whatever coverage says.
    expect(positionRisk(position({ supplierSoh: 4500, leadTimeDays: 20 })).riskClass).toBe('low');
  });

  it('no lead time: the CR-02 bands decide, and the basis says so', () => {
    expect(positionRisk(position({ supplierSoh: 1300, leadTimeDays: null }))).toEqual({
      riskClass: 'high',
      basis: { kind: 'fallbackBands', band: 'critical', daysOfCover: 13 },
    });
    expect(positionRisk(position({ supplierSoh: 2500, leadTimeDays: null })).riskClass).toBe('medium'); // Warning
    expect(positionRisk(position({ supplierSoh: 4500, leadTimeDays: null })).riskClass).toBe('low'); // Healthy
  });
});

describe('REQ-E08-05 BR-01 — each rule raises an alert when its condition is met', () => {
  it('PTI below ROP, supplier below ROP, projected stock-out, stale data, coverage, capacity gap', () => {
    const conditions = deriveAlertConditions(
      [
        position({ materialCode: 'P1', ptiSoh: 400, ptiRop: 500 }),
        position({ materialCode: 'P2', supplierSoh: 4500, supplierRop: 5000 }),
        position({ materialCode: 'P3', ptiSoh: 300, incoming: [{ source: 'asn', date: '2026-09-10', quantity: 1, reference: 'A' }] }),
        position({ materialCode: 'P4', lastUpdatedAt: '2026-08-01T00:00:00.000Z' }),
        position({ materialCode: 'P5', supplierSoh: 2000 }),
        position({ materialCode: 'P6', supplierSoh: 1300, leadTimeDays: null }),
      ],
      [
        {
          supplierId: 'sup-007',
          supplierName: 'PT Sample Packaging Indonesia',
          materialGroup: 'MG-20',
          materials: ['P1'],
          uom: 'PCS',
          weeks: [{ week: HORIZON[0], demand: 100, entry: { week: HORIZON[0], allocated: 10, reason: 'capacity' } }],
          latest: null,
        },
      ],
      NOW,
    );
    const keys = conditions.map((c) => c.key);
    expect(keys).toEqual(
      expect.arrayContaining([
        'ptiBelowRop|P1|sup-007',
        'supplierBelowRop|P2|sup-007',
        'projectedStockOut|P3|sup-007',
        'staleData|P4|sup-007',
        'coverage|P5|sup-007',
        'capacityBelowDemand|MG-20|sup-007',
      ]),
    );
    expect(conditions.find((c) => c.key === 'staleData|P4|sup-007')!.riskClass).toBe('low');
    // 20 days against a 30-day lead time — High by CR-24, with its basis.
    expect(conditions.find((c) => c.key === 'coverage|P5|sup-007')).toMatchObject({
      riskClass: 'high',
      riskBasis: { kind: 'leadTime', leadTimeDays: 30, daysOfCover: 20 },
    });
    // CR-24 — a missing lead time is its own alert, classed by the CR-02 fallback.
    expect(conditions.find((c) => c.key === 'leadTimeMissing|P6|sup-007')).toMatchObject({
      riskClass: 'high',
      riskBasis: { kind: 'fallbackBands', band: 'critical', daysOfCover: 13 },
    });
    // Known-false: a position WITH a lead time never raises it.
    expect(keys.filter((k) => k.startsWith('leadTimeMissing|'))).toEqual(['leadTimeMissing|P6|sup-007']);
    expect(conditions.find((c) => c.key === 'staleData|P4|sup-007')!.riskBasis).toEqual({ kind: 'rule' });
    // A position with none of the conditions raises nothing.
    expect(keys.filter((k) => k.includes('|PK-A|'))).toEqual([]);
  });

  it('the key parses back, and a foreign rule does not', () => {
    expect(parseAlertKey(alertKey('coverage', 'P5', 'sup-007'))).toEqual({ rule: 'coverage', subject: 'P5', supplierId: 'sup-007' });
    expect(parseAlertKey('nonsense|P5|sup-007')).toBeNull();
  });
});

describe('REQ-E08-05 BR-05 / AC-03 — no duplicate open alert; closure and recurrence', () => {
  const cond = deriveAlertConditions([position({ materialCode: 'P1', ptiSoh: 400, ptiRop: 500 })], [], NOW);
  const key = 'ptiBelowRop|P1|sup-007';

  it('the same condition read twice is ONE open alert', () => {
    const alerts = alertsFromLedger([...cond, ...cond], []);
    expect(alerts.filter((a) => a.key === key)).toHaveLength(1);
    expect(alerts.find((a) => a.key === key)!.status).toBe('open');
  });

  it('a closed alert stays closed, with its note, while the condition persists', () => {
    const ledger: AlertLedgerEntry[] = [{ key, kind: 'closed', at: NOW, note: 'Earlier call-off requested' }];
    const alert = alertsFromLedger(cond, ledger).find((a) => a.key === key)!;
    expect(alert).toMatchObject({ status: 'closed', actionNote: 'Earlier call-off requested', closedAt: NOW });
    // Still active → nothing clears.
    expect(clearedSince(new Set([key]), ledger, NOW)).toEqual([]);
  });

  it('it reopens only after the condition cleared and came back', () => {
    const closed: AlertLedgerEntry[] = [{ key, kind: 'closed', at: NOW, note: 'n' }];
    const cleared = clearedSince(new Set(), closed, '2026-09-01T00:00:00.000Z');
    expect(cleared).toEqual([{ key, kind: 'cleared', at: '2026-09-01T00:00:00.000Z' }]);
    const ledger = [...closed, ...cleared];
    expect(alertsFromLedger(cond, ledger).find((a) => a.key === key)!.status).toBe('open');
    // Clearing is recorded once, not on every read.
    expect(clearedSince(new Set(), ledger, '2026-09-02T00:00:00.000Z')).toEqual([]);
  });
});

describe('edge case — alerts from one supplier on many materials under one parent', () => {
  it('groups by supplier with the highest class, High suppliers first', () => {
    const alerts = alertsFromLedger(
      deriveAlertConditions(
        [
          position({ materialCode: 'P1', ptiSoh: 400, ptiRop: 500, supplierSoh: 4500 }),
          position({ materialCode: 'P2', supplierSoh: 1000, supplierRop: 2000 }),
          position({ supplierId: 'sup-002', supplierName: 'PT Sample Specialty Fats', materialCode: 'R1', lastUpdatedAt: null }),
        ],
        [],
        NOW,
      ),
      [],
    );
    const groups = groupAlertsBySupplier(alerts);
    expect(groups.map((g) => [g.supplierId, g.riskClass])).toEqual([
      ['sup-007', 'high'],
      ['sup-002', 'low'],
    ]);
    expect(groups[0].alerts.length).toBeGreaterThan(1);
  });
});
