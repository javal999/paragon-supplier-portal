// ────────────────────────────────────────────────────────────────────────────
// Inventory derivations (REQ-E08-01, REQ-E08-02): CR-01 days of supply, CR-02
// bands, CR-03 coverage, freshness against the data-update SLA, incoming,
// projected stock-out, supplier access masking, and the row-by-row template
// validation (BR-05, CR-18, CR-19). Every rule is probed on both sides.
// ────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import type { ASN, CallOff, InventoryPosition, StockAccessGrant } from '../data/types';
import {
  averageDailyDemand,
  batchDatesProblem,
  canSeePtiStock,
  coverage,
  daysOfSupply,
  demandBetween,
  inTransitItems,
  incomingTotals,
  isProjectedStockOut,
  isPtiBelowRop,
  isSupplierBelowRop,
  maskForSupplier,
  mondayOf,
  parseCsv,
  positionBand,
  stockFreshness,
  stockTemplateCsv,
  supplyBand,
  validateStockRows,
} from './inventoryRules';
import { DEFAULT_UPDATE_SLA, SUPPLY_BANDS, updateSlaFor } from './inventoryConfig';

const NOW = '2026-08-31T12:00:00.000Z';

const position = (over: Partial<InventoryPosition> = {}): InventoryPosition => ({
  supplierId: 'sup-007',
  supplierName: 'PT Sample Packaging Indonesia',
  materialCode: 'PK-PETB-8801',
  materialLabel: 'PET Bottle',
  materialType: 'VERP',
  materialGroup: 'MG-20',
  uom: 'PCS',
  supplierSoh: 1000,
  supplierRop: null,
  ptiSoh: 500,
  ptiRop: 400,
  ptiStockShared: true,
  consignment: false,
  incoming: [],
  avgDailyDemand: 50,
  demandSource: 'forecast',
  leadTimeDays: 14,
  lastUpdatedAt: '2026-08-30T02:00:00.000Z',
  channel: 'template',
  updateSla: 7,
  apiConnected: false,
  lastSync: null,
  batches: [],
  ...over,
});

describe('CR-02 — the ONE band function, at every boundary', () => {
  it('Critical below 14; Warning 14 to 29; Healthy 30 to 60; Excess above 60', () => {
    expect(SUPPLY_BANDS).toEqual({ criticalBelow: 14, warningBelow: 30, healthyUpTo: 60 });
    expect(supplyBand(0)).toBe('critical');
    expect(supplyBand(13.99)).toBe('critical');
    expect(supplyBand(14)).toBe('warning');
    expect(supplyBand(29.99)).toBe('warning');
    expect(supplyBand(30)).toBe('healthy');
    expect(supplyBand(60)).toBe('healthy');
    expect(supplyBand(60.01)).toBe('excess');
    expect(supplyBand(null)).toBeNull();
  });

  it('the retired supplier thresholds (<7 critical, 14–30 normal) no longer apply', () => {
    // 10 days read "Low" under the old supplier page; CR-02 says Critical.
    expect(supplyBand(10)).toBe('critical');
    // 25 days read "Normal"; CR-02 says Warning.
    expect(supplyBand(25)).toBe('warning');
  });
});

describe('CR-01 — days of supply = SOH ÷ (30-day forecast ÷ 30)', () => {
  it('SOH ÷ average daily demand; no figures or no demand → no days', () => {
    expect(daysOfSupply(1400, 100)).toBe(14);
    expect(daysOfSupply(null, 100)).toBeNull();
    expect(daysOfSupply(1400, null)).toBeNull();
    expect(daysOfSupply(1400, 0)).toBeNull();
    expect(positionBand(position({ supplierSoh: 650, avgDailyDemand: 50 }))).toBe('critical');
  });

  it('prorates a monthly forecast by day and averages over 30 days', () => {
    // September (30 days) of 60,000 → 2,000 a day; the window from 31 Aug adds
    // one day of the August bucket (31,000 / 31 = 1,000).
    const lines = [
      { periodBucket: '2026-08', forecastQty: 31000 },
      { periodBucket: '2026-09', forecastQty: 60000 },
    ];
    const d = averageDailyDemand(lines, null, NOW);
    expect(d.source).toBe('forecast');
    expect(d.value).toBeCloseTo((1000 + 29 * 2000) / 30, 6);
  });

  it('falls back to the planning estimate for days the forecast does not cover', () => {
    expect(averageDailyDemand([], 120, NOW)).toEqual({ value: 120, source: 'planningEstimate' });
    expect(averageDailyDemand([], null, NOW)).toEqual({ value: null, source: 'none' });
    // A forecast month plus estimate days: 1 August day at 10/day, 29 September days at the estimate 5.
    const mixed = demandBetween([{ periodBucket: '2026-08', forecastQty: 310 }], 5, '2026-08-31', '2026-09-29');
    expect(mixed).toEqual({ qty: 10 + 29 * 5, fromForecast: true });
  });
});

describe('CR-03 — coverage', () => {
  it('Covered at 1.0 or more, At risk from 0.8, Uncovered below 0.8; no demand is Covered', () => {
    // 30-day demand = 50 × 30 = 1,500.
    expect(coverage(position({ supplierSoh: 1500 })).status).toBe('covered');
    expect(coverage(position({ supplierSoh: 1200 })).status).toBe('atRisk');
    expect(coverage(position({ supplierSoh: 1199 })).status).toBe('uncovered');
    expect(coverage(position({ supplierSoh: 1000, incoming: [{ source: 'production', date: '2026-09-05', quantity: 500, reference: null }] })).status).toBe('covered');
    expect(coverage(position({ avgDailyDemand: null })).status).toBe('covered');
  });

  it('a supplier with no figures is not reported as uncovered (it is stale instead)', () => {
    expect(coverage(position({ supplierSoh: null })).status).toBe('covered');
  });
});

describe('freshness against the data-update SLA (AC-05, edge case)', () => {
  it('current within the SLA, stale past it, missing without figures', () => {
    expect(DEFAULT_UPDATE_SLA).toBe(7);
    expect(updateSlaFor('sup-999', 'X')).toBe(7);
    expect(updateSlaFor('sup-001', 'RM-COCO-8200')).toBe(1);
    expect(stockFreshness(position({ lastUpdatedAt: '2026-08-24T12:00:00.000Z' }), NOW)).toBe('current');
    expect(stockFreshness(position({ lastUpdatedAt: '2026-08-24T11:59:00.000Z' }), NOW)).toBe('stale');
    expect(stockFreshness(position({ lastUpdatedAt: null }), NOW)).toBe('missing');
  });

  it('a failed API sync after the last figures flags them stale even within the SLA', () => {
    const failed = { id: 's', supplierId: 'sup-003', at: '2026-08-31T06:00:00.000Z', outcome: 'failed' as const, errorKey: 'timeout' };
    expect(stockFreshness(position({ lastUpdatedAt: '2026-08-31T02:00:00.000Z', lastSync: failed }), NOW)).toBe('stale');
    // A failure BEFORE a newer submission does not taint it.
    expect(stockFreshness(position({ lastUpdatedAt: '2026-08-31T08:00:00.000Z', lastSync: failed }), NOW)).toBe('current');
  });
});

describe('incoming (BR-05, BR-06) — production vs transit, next date', () => {
  const asn = (over: Partial<ASN>): ASN =>
    ({
      asnNumber: 'ASN-1',
      supplierId: 'sup-007',
      poReference: 'PO-1',
      status: 'In Transit',
      carrier: '',
      trackingNumber: '',
      eta: '2026-09-04T00:00:00.000Z',
      details: {} as ASN['details'],
      lineItems: [{ materialCode: 'PK-PETB-8801', description: '', orderedQty: 10, shippedQty: 700, lotNumber: 'L' }],
      ...over,
    }) as ASN;
  const callOff = (over: Partial<CallOff>): CallOff =>
    ({
      id: 'co-x',
      callOffNumber: 'CO-X',
      supplierId: 'sup-007',
      materialCode: 'PK-PETB-8801',
      dispatches: [{ id: 'd1', shippedDate: '2026-08-31', expectedArrival: '2026-09-02', quantity: 300, recordedAt: NOW }],
      ...over,
    }) as CallOff;

  it('submitted and in-transit ASNs count; cancelled and delivered ones do not', () => {
    const items = inTransitItems('sup-007', 'PK-PETB-8801', [asn({}), asn({ asnNumber: 'A2', status: 'Cancelled' }), asn({ asnNumber: 'A3', status: 'Delivered' }), asn({ asnNumber: 'A4', status: 'Submitted' })], []);
    expect(items.map((i) => i.reference)).toEqual(['ASN-1', 'A4']);
  });

  it('dispatch notices count only while their delivery is on the way, and never twice with their ASN', () => {
    const views = [
      { callOff: callOff({}), delivery: 'dispatched' as const },
      { callOff: callOff({ id: 'co-y', callOffNumber: 'CO-Y' }), delivery: 'deliveredOnTime' as const },
      {
        callOff: callOff({
          id: 'co-z',
          callOffNumber: 'CO-Z',
          dispatches: [{ id: 'd2', shippedDate: '2026-08-31', expectedArrival: '2026-09-04', quantity: 700, asnNumber: 'ASN-1', recordedAt: NOW }],
        }),
        delivery: 'atRisk' as const,
      },
    ];
    const items = inTransitItems('sup-007', 'PK-PETB-8801', [asn({})], views);
    expect(items.map((i) => `${i.source}:${i.reference}:${i.quantity}`)).toEqual(['asn:ASN-1:700', 'dispatch:CO-X:300']);
    const totals = incomingTotals([...items, { source: 'production', date: '2026-09-10', quantity: 1000, reference: null }]);
    expect(totals).toEqual({ inProduction: 1000, inTransit: 1000, total: 2000, nextDate: '2026-09-02' });
  });
});

describe('alert conditions on a position (REQ-E08-05 BR-01)', () => {
  it('PTI and supplier SOH below their ROPs — only when both figures exist', () => {
    expect(isPtiBelowRop(position({ ptiSoh: 399, ptiRop: 400 }))).toBe(true);
    expect(isPtiBelowRop(position({ ptiSoh: 400, ptiRop: 400 }))).toBe(false);
    expect(isPtiBelowRop(position({ ptiSoh: null }))).toBe(false);
    expect(isSupplierBelowRop(position({ supplierSoh: 10, supplierRop: 11 }))).toBe(true);
    expect(isSupplierBelowRop(position({ supplierSoh: 10, supplierRop: null }))).toBe(false);
  });

  it('projected stock-out: PTI cover shorter than the days until the next incoming date', () => {
    const incoming = [{ source: 'asn' as const, date: '2026-09-10', quantity: 5, reference: 'A' }];
    // 400 ÷ 100 = 4 days of cover, next incoming in 10 days → stock-out.
    expect(isProjectedStockOut(position({ ptiSoh: 400, incoming }), 100, NOW)).toBe(true);
    // 1,100 ÷ 100 = 11 days → reaches the delivery.
    expect(isProjectedStockOut(position({ ptiSoh: 1100, incoming }), 100, NOW)).toBe(false);
    // No incoming date: nothing to be "before".
    expect(isProjectedStockOut(position({ ptiSoh: 1, incoming: [] }), 100, NOW)).toBe(false);
  });
});

describe('supplier access to PTI stock (REQ-E08-03 AC-01)', () => {
  const grant = (over: Partial<StockAccessGrant>): StockAccessGrant => ({
    supplierId: 'sup-007',
    supplierName: 'x',
    active: true,
    materials: [],
    log: [],
    ...over,
  });

  it('no grant, an inactive grant, or a material outside the list → no PTI stock', () => {
    expect(canSeePtiStock(undefined, 'PK-PETB-8801')).toBe(false);
    expect(canSeePtiStock(grant({ active: false }), 'PK-PETB-8801')).toBe(false);
    expect(canSeePtiStock(grant({ materials: ['PK-PETB-8802'] }), 'PK-PETB-8801')).toBe(false);
    expect(canSeePtiStock(grant({ materials: ['PK-PETB-8801'] }), 'PK-PETB-8801')).toBe(true);
    expect(canSeePtiStock(grant({ materials: [] }), 'anything')).toBe(true);
  });

  it('the masked row carries no PTI figure at all', () => {
    const masked = maskForSupplier(position(), undefined);
    expect(masked).toMatchObject({ ptiSoh: null, ptiRop: null, ptiStockShared: false });
    expect(maskForSupplier(position(), grant({ materials: ['PK-PETB-8801'] }))).toMatchObject({ ptiSoh: 500, ptiRop: 400 });
  });
});

describe('the stock template and row-by-row validation (REQ-E08-02 BR-05 to BR-07)', () => {
  const assigned = [
    { materialCode: 'PK-PETB-8801', uom: 'PCS' },
    { materialCode: 'PK-PETB-8802', uom: 'PCS' },
    { materialCode: 'PK-CAPF-8820', uom: 'PCS' },
  ];
  const TODAY = '2026-09-15';
  const ctx = { assigned, today: TODAY };

  it('the template is fixed, prefilled with the supplier’s materials, and parses back in EN or ID', () => {
    const csv = stockTemplateCsv(assigned, 'en');
    const { headers, rows } = parseCsv(csv);
    expect(headers[0]).toBe('Material code');
    // BL-60 — ten columns: the manufacturing date joined the batch fields.
    expect(headers).toHaveLength(10);
    expect(headers.slice(6)).toEqual([
      'Batch number',
      'Batch quantity',
      'Manufacturing date (YYYY-MM-DD)',
      'Expiry date (YYYY-MM-DD)',
    ]);
    expect(rows.map((r) => r['Material code'])).toEqual(['PK-PETB-8801', 'PK-PETB-8802', 'PK-CAPF-8820']);
    expect(rows[0].Unit).toBe('PCS');
    expect(parseCsv(stockTemplateCsv(assigned, 'id')).headers[0]).toBe('Kode material');
  });

  it('known-good: valid materials are accepted with ROP, production and batches', () => {
    const csv = [
      'Material code,Stock on hand,Unit,Supplier reorder point,In-production quantity,Expected production completion date (YYYY-MM-DD),Batch number,Batch quantity,Expiry date (YYYY-MM-DD)',
      'PK-PETB-8801,1500,PCS,1000,2000,2026-09-10,B1,1000,2027-01-31',
      'PK-PETB-8801,,,,,,B2,500,',
      'PK-PETB-8802,700,pcs,,,,,,',
    ].join('\n');
    const { accepted, refused } = validateStockRows(parseCsv(csv).rows, ctx);
    expect(refused).toEqual([]);
    expect(accepted).toEqual([
      {
        materialCode: 'PK-PETB-8801',
        totalQty: 1500,
        supplierRop: 1000,
        inProductionQty: 2000,
        productionCompletionDate: '2026-09-10',
        batches: [
          { batchNumber: 'B1', qty: 1000, expiryDate: '2027-01-31' },
          { batchNumber: 'B2', qty: 500 },
        ],
        rows: [2, 3],
      },
      { materialCode: 'PK-PETB-8802', totalQty: 700, rows: [4] },
    ]);
  });

  it('known-bad rows are refused with row number and reason, and the valid rows still pass', () => {
    const csv = [
      'Material code,Stock on hand,Unit,Supplier reorder point,In-production quantity,Expected production completion date (YYYY-MM-DD),Batch number,Batch quantity,Expiry date (YYYY-MM-DD)',
      'RM-EMUL-3310,100,KG,,,,,,', // row 2 — not assigned to this supplier
      'PK-PETB-8802,1.500,PCS,,,,,,', // row 3 — CR-18 ambiguous
      'PK-CAPF-8820,900,PCS,,,,C1,400,', // row 4 — CR-19 batch total ≠ SOH
      'PK-CAPF-8820,,,,,,C2,400,', // row 5 — same material, refused with it
      ',50,PCS,,,,,,', // row 6 — material code missing
      'PK-PETB-8801,abc,PCS,,,,,,', // row 7 — not a number
      'PK-PETB-8801,10,KG,,,,,,', // row 8 — conflicting SOH for the same material
    ].join('\n');
    const { accepted, refused } = validateStockRows(parseCsv(csv).rows, ctx);
    expect(accepted).toEqual([]);
    expect(refused.map((r) => `${r.row}:${r.reason}`)).toEqual([
      '2:notAssigned',
      '3:ambiguousNumber',
      '4:batchTotal',
      '5:batchTotal',
      '6:missingField',
      '7:conflictingRows',
      '8:conflictingRows',
    ]);
    // A lone valid row beside the same failures is still accepted (not all-or-nothing).
    const mixed = validateStockRows(
      [
        { 'Material code': 'RM-EMUL-3310', 'Stock on hand': '1', Unit: 'KG' },
        { 'Material code': 'PK-PETB-8801', 'Stock on hand': '1500', Unit: 'PCS' },
      ],
      ctx,
    );
    expect(mixed.accepted.map((a) => a.materialCode)).toEqual(['PK-PETB-8801']);
    expect(mixed.refused.map((r) => `${r.row}:${r.reason}`)).toEqual(['2:notAssigned']);
  });

  it('missing SOH, wrong unit and a bad date are each refused by name', () => {
    const rows: Record<string, string>[] = [
      { 'Material code': 'PK-PETB-8801', 'Stock on hand': '', Unit: 'PCS' },
      { 'Material code': 'PK-PETB-8802', 'Stock on hand': '5', Unit: 'KG' },
      { 'Kode material': 'PK-CAPF-8820', 'Stok tersedia': '5', Satuan: 'PCS', 'Perkiraan tanggal selesai produksi (YYYY-MM-DD)': '10/09/2026' },
    ];
    expect(validateStockRows(rows, ctx).refused).toEqual([
      { row: 2, materialCode: 'PK-PETB-8801', reason: 'missingField', field: 'soh' },
      { row: 3, materialCode: 'PK-PETB-8802', reason: 'unitMismatch', field: 'unit' },
      { row: 4, materialCode: 'PK-CAPF-8820', reason: 'invalidDate', field: 'productionCompletionDate' },
    ]);
  });
});

describe('batch manufacturing date (REQ-E08-02 BR-06, BL-60)', () => {
  const assigned = [{ materialCode: 'PK-PETB-8801', uom: 'PCS' }];
  const ctx = { assigned, today: '2026-09-15' };
  const HEAD =
    'Material code,Stock on hand,Unit,Supplier reorder point,In-production quantity,Expected production completion date (YYYY-MM-DD),Batch number,Batch quantity,Manufacturing date (YYYY-MM-DD),Expiry date (YYYY-MM-DD)';
  const one = (mfg: string, exp: string) =>
    validateStockRows(parseCsv([HEAD, `PK-PETB-8801,100,PCS,,,,B1,100,${mfg},${exp}`].join('\n')).rows, ctx);

  it('known-good: an optional manufacturing date is carried into the submission', () => {
    expect(one('2026-09-01', '2027-09-01').accepted[0].batches).toEqual([
      { batchNumber: 'B1', qty: 100, manufacturingDate: '2026-09-01', expiryDate: '2027-09-01' },
    ]);
    // Still optional: no date, no key.
    expect(one('', '').accepted[0].batches).toEqual([{ batchNumber: 'B1', qty: 100 }]);
    // On the day itself is not the future.
    expect(one('2026-09-15', '').refused).toEqual([]);
  });

  it('known-bad: after expiry, in the future, or not a date — each refused by name', () => {
    expect(one('2027-10-01', '2027-09-01').refused).toEqual([
      { row: 2, materialCode: 'PK-PETB-8801', reason: 'manufacturedAfterExpiry', field: 'manufacturingDate' },
    ]);
    expect(one('2026-09-16', '').refused).toEqual([
      { row: 2, materialCode: 'PK-PETB-8801', reason: 'manufacturedInFuture', field: 'manufacturingDate' },
    ]);
    expect(one('01/09/2026', '').refused).toEqual([
      { row: 2, materialCode: 'PK-PETB-8801', reason: 'invalidDate', field: 'manufacturingDate' },
    ]);
  });

  it('batchDatesProblem is the one check (both directions)', () => {
    expect(batchDatesProblem({}, '2026-09-15')).toBeNull();
    expect(batchDatesProblem({ manufacturingDate: '2026-09-15', expiryDate: '2026-09-15' }, '2026-09-15')).toBeNull();
    expect(batchDatesProblem({ manufacturingDate: '2026-09-16' }, '2026-09-15')?.problem).toBe('manufacturedInFuture');
    expect(batchDatesProblem({ manufacturingDate: '2026-09-10', expiryDate: '2026-09-09' }, '2026-09-15')?.problem).toBe(
      'manufacturedAfterExpiry',
    );
    expect(batchDatesProblem({ expiryDate: 'soon' }, '2026-09-15')).toEqual({ problem: 'invalidDate', field: 'expiryDate' });
  });
});

describe('weeks', () => {
  it('Monday of the week', () => {
    expect(mondayOf('2026-08-31')).toBe('2026-08-31');
    expect(mondayOf('2026-09-06')).toBe('2026-08-31');
    expect(mondayOf('2026-09-07')).toBe('2026-09-07');
  });
});
