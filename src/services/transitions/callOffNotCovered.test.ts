// ────────────────────────────────────────────────────────────────────────────
// MR-6 BR-13 (AR-13), pure: the `callOffNotCovered` alert — a confirmed
// call-off due within the supplier lead time that the supplier's declared SOH
// plus production due before the need date cannot cover. AC-07's worked
// example (1,000 against 600) is reproduced exactly.
// ────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import type { ASN, CallOff, InventoryPosition } from '../data/types';
import {
  ALERT_RULES,
  PTI_ONLY_RULES,
  callOffCoverGap,
  deriveAlertConditions,
  parseAlertKey,
} from './inventoryAlertRules';
import { callOffCoverSubjects, callOffViews } from './callOffRules';
import { positionRisk } from './inventoryRules';

const NOW = '2026-10-01T03:00:00.000Z';

const position = (over: Partial<InventoryPosition> = {}): InventoryPosition => ({
  supplierId: 'sup-t',
  supplierName: 'Sample Supplier',
  materialCode: 'MAT-A',
  materialLabel: 'Material A',
  materialType: 'ROH',
  materialGroup: 'MG-1',
  uom: 'KG',
  // AC-07 — SOH 400 + 200 in production due before the need date = 600.
  supplierSoh: 400,
  supplierRop: null,
  ptiSoh: 5000,
  ptiRop: 100,
  ptiStockShared: true,
  consignment: false,
  incoming: [{ source: 'production', date: '2026-10-05', quantity: 200, reference: null }],
  avgDailyDemand: 100,
  demandSource: 'forecast',
  leadTimeDays: 14,
  lastUpdatedAt: '2026-09-30T02:00:00.000Z',
  channel: 'manual',
  updateSla: 7,
  apiConnected: false,
  lastSync: null,
  batches: [],
  ...over,
});

const callOff = (over: Partial<CallOff> = {}): CallOff => ({
  id: 'co-t1',
  callOffNumber: 'CO-T-0001',
  poId: 'po-t',
  poNumber: 'PO-T-1',
  poLineId: 'li-t1',
  supplierId: 'sup-t',
  supplierName: 'Sample Supplier',
  materialCode: 'MAT-A',
  description: 'Material A',
  uom: 'KG',
  unitPrice: 1,
  currency: 'IDR',
  quantity: 1000,
  needDate: '2026-10-08',
  type: 'forecast',
  status: 'Confirmed',
  confirmation: {
    kind: 'confirm',
    deliveries: [{ quantity: 1000, date: '2026-10-08' }],
    confirmedAt: '2026-09-25T03:00:00.000Z',
    approval: 'auto',
  },
  dispatches: [],
  notes: [],
  ...over,
});

const subjectsOf = (cs: readonly CallOff[], asns: readonly ASN[] = []) => callOffCoverSubjects(callOffViews(cs, asns, [], NOW));
const conditionsFor = (p: InventoryPosition, cs: readonly CallOff[], asns: readonly ASN[] = []) =>
  deriveAlertConditions([p], [], NOW, [], subjectsOf(cs, asns)).filter((c) => c.rule === 'callOffNotCovered');

describe('the rule is registered and PTI-only', () => {
  it('is an alert rule, parses from its key, and is never shown to a supplier', () => {
    expect(ALERT_RULES).toContain('callOffNotCovered');
    expect(PTI_ONLY_RULES).toContain('callOffNotCovered');
    expect(parseAlertKey('callOffNotCovered|MAT-A|sup-t')).toEqual({ rule: 'callOffNotCovered', subject: 'MAT-A', supplierId: 'sup-t' });
  });
});

describe('AC-07 — a call-off of 1,000 inside the lead time against SOH + production of 600', () => {
  it('fires, with the CR-24 class of the position and the days to the need date', () => {
    const p = position();
    const found = conditionsFor(p, [callOff()]);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({
      key: 'callOffNotCovered|MAT-A|sup-t',
      supplierId: 'sup-t',
      subject: 'MAT-A',
      riskClass: positionRisk(p).riskClass,
      riskBasis: positionRisk(p).basis,
      daysToImpact: 7,
    });
    expect(callOffCoverGap(p, [{ quantity: 1000, date: '2026-10-08' }], NOW)).toEqual({
      needDate: '2026-10-08',
      required: 1000,
      available: 600,
      daysToNeed: 7,
    });
  });

  it('passes when SOH + production covers it (600 called off against 600)', () => {
    const p = position();
    const fits = callOff({
      quantity: 600,
      confirmation: { kind: 'confirm', deliveries: [{ quantity: 600, date: '2026-10-08' }], confirmedAt: NOW, approval: 'auto' },
    });
    expect(conditionsFor(p, [fits])).toEqual([]);
  });

  it('production due ON or after the need date does not count', () => {
    const late = position({ incoming: [{ source: 'production', date: '2026-10-08', quantity: 5000, reference: null }] });
    expect(callOffCoverGap(late, [{ quantity: 1000, date: '2026-10-08' }], NOW)?.available).toBe(400);
    const early = position({ incoming: [{ source: 'production', date: '2026-10-07', quantity: 5000, reference: null }] });
    expect(callOffCoverGap(early, [{ quantity: 1000, date: '2026-10-08' }], NOW)).toBeNull();
  });
});

describe('only call-offs that are confirmed, due within the lead time, and still to ship', () => {
  it('a need date beyond the lead time raises nothing', () => {
    expect(conditionsFor(position({ leadTimeDays: 5 }), [callOff()])).toEqual([]);
  });

  it('no lead time on record raises nothing here (leadTimeMissing speaks)', () => {
    expect(conditionsFor(position({ leadTimeDays: null }), [callOff()])).toEqual([]);
  });

  it('a call-off not yet confirmed, or awaiting the planner, raises nothing', () => {
    expect(conditionsFor(position(), [callOff({ status: 'Awaiting Confirmation', confirmation: undefined })])).toEqual([]);
    expect(
      conditionsFor(position(), [
        callOff({ confirmation: { kind: 'confirm', deliveries: [{ quantity: 1000, date: '2026-10-08' }], confirmedAt: NOW, approval: 'awaiting' } }),
      ]),
    ).toEqual([]);
  });

  it('quantity already on a shipped ASN is not asked of stock again', () => {
    const asn: ASN = {
      asnNumber: 'ASN-T-1',
      supplierId: 'sup-t',
      poReference: 'PO-T-1',
      status: 'Submitted',
      carrier: 'c',
      trackingNumber: 't',
      eta: '2026-10-07',
      shipDate: '2026-10-02',
      details: { originCity: '', destinationWarehouse: '', totalCartons: 0, grossWeightKg: 0, temperatureRequirement: '' },
      lineItems: [{ materialCode: 'MAT-A', description: '', orderedQty: 0, shippedQty: 500, lotNumber: 'L' }],
      callOffId: 'co-t1',
    };
    expect(subjectsOf([callOff()], [asn])[0].deliveries).toEqual([{ quantity: 500, date: '2026-10-08' }]);
    expect(conditionsFor(position(), [callOff()], [asn])).toEqual([]);
  });

  it('two call-offs that each fit but together do not are seen together', () => {
    const a = callOff({ id: 'co-a', quantity: 400, confirmation: { kind: 'confirm', deliveries: [{ quantity: 400, date: '2026-10-06' }], confirmedAt: NOW, approval: 'auto' } });
    const b = callOff({ id: 'co-b', quantity: 400, confirmation: { kind: 'confirm', deliveries: [{ quantity: 400, date: '2026-10-08' }], confirmedAt: NOW, approval: 'auto' } });
    const found = conditionsFor(position(), [a, b]);
    expect(found.map((c) => c.daysToImpact)).toEqual([7]);
  });
});
