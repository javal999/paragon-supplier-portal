// ────────────────────────────────────────────────────────────────────────────
// Inventory derivations (REQ-E08-01, REQ-E08-02): CR-01 days of supply, CR-02
// bands, CR-03 coverage, freshness against the data-update SLA, incoming,
// projected stock-out, supplier access masking, and the row-by-row template
// validation (BR-05, CR-18, CR-19). Every rule is probed on both sides.
// ────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
/** @import { ASN, CallOff, InventoryPosition, StockAccessGrant } from '../data/types' */
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
  productionProblem,
  rawMaterialBatchProblem,
  readFeedstockRows,
  submissionChannel,
  STOCK_TEMPLATE_FIELDS,
  stockFreshness,
  stockTemplateCsv,
  supplyBand,
  templateFieldFor,
  validateStockRows,
  isBlankStockRow
} from './inventoryRules';
import { supplyBands, updateSlaFor } from './inventoryConfig';
import { hubSetting } from './hubSettingsStore';

const NOW = '2026-08-31T12:00:00.000Z';

/**
 * @param {Partial<InventoryPosition>} [over]
 * @returns {InventoryPosition}
 */
const position = (over = {}) => ({
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
  staleAt: null,
  lastPullFailedAt: null,
  apiConnected: false,
  lastSync: null,
  batches: [],
  ...over
});

describe('CR-02 — the ONE band function, at every boundary', () => {
  it('Critical below 14; Warning 14 to 29; Healthy 30 to 60; Excess above 60', () => {
    expect(supplyBands()).toEqual({ criticalBelow: 14, warningBelow: 30, healthyUpTo: 60 }); // the defaults (BL-32: read in force)
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
      { periodBucket: '2026-09', forecastQty: 60000 }
    ];
    const d = averageDailyDemand(lines, null, NOW);
    expect(d.source).toBe('forecast');
    expect(d.value).toBeCloseTo((1000 + 29 * 2000) / 30, 6);
  });

  it('falls back to the planning estimate for days the forecast does not cover', () => {
    expect(averageDailyDemand([], 120, NOW)).toEqual({ value: 120, source: 'planningEstimate' });
    expect(averageDailyDemand([], null, NOW)).toEqual({ value: null, source: 'none' });
    // A forecast month plus estimate days: 1 August day at 10/day, 29 September days at the estimate 5.
    const mixed = demandBetween(
      [{ periodBucket: '2026-08', forecastQty: 310 }],
      5,
      '2026-08-31',
      '2026-09-29'
    );
    expect(mixed).toEqual({ qty: 10 + 29 * 5, fromForecast: true });
  });
});

describe('CR-03 — coverage', () => {
  it('Covered at 1.0 or more, At risk from 0.8, Uncovered below 0.8; no demand is Covered', () => {
    // 30-day demand = 50 × 30 = 1,500.
    expect(coverage(position({ supplierSoh: 1500 })).status).toBe('covered');
    expect(coverage(position({ supplierSoh: 1200 })).status).toBe('atRisk');
    expect(coverage(position({ supplierSoh: 1199 })).status).toBe('uncovered');
    expect(
      coverage(
        position({
          supplierSoh: 1000,
          incoming: [{ source: 'production', date: '2026-09-05', quantity: 500, reference: null }]
        })
      ).status
    ).toBe('covered');
    expect(coverage(position({ avgDailyDemand: null })).status).toBe('covered');
  });

  it('a supplier with no figures is not reported as uncovered (it is stale instead)', () => {
    expect(coverage(position({ supplierSoh: null })).status).toBe('covered');
  });
});

describe('freshness against the data-update SLA (AC-05, edge case)', () => {
  it('current within the SLA, stale past it, missing without figures', () => {
    expect(hubSetting('stale.defaultDays')).toBe(7); // the default stale period (BL-32: read in force)
    expect(updateSlaFor('sup-999', 'X')).toBe(7);
    expect(updateSlaFor('sup-001', 'RM-COCO-8200')).toBe(1);
    expect(stockFreshness(position({ lastUpdatedAt: '2026-08-24T12:00:00.000Z' }), NOW)).toBe(
      'current'
    );
    expect(stockFreshness(position({ lastUpdatedAt: '2026-08-24T11:59:00.000Z' }), NOW)).toBe(
      'stale'
    );
    expect(stockFreshness(position({ lastUpdatedAt: null }), NOW)).toBe('missing');
  });

  // PREMISE CHANGED (Material B1, owner ruling 2026-09-29): a failed API sync
  // after the figures used to flag them stale at once (REQ-E08-02 edge case,
  // BL-59). It is now a warning only; the figure is judged by its staleAt.
  it('a failed API sync after the last figures does NOT make them stale', () => {
    const failed = {
      id: 's',
      supplierId: 'sup-003',
      at: '2026-08-31T06:00:00.000Z',
      outcome: /** @type {const} */ ('failed'),
      errorKey: 'timeout'
    };
    expect(
      stockFreshness(position({ lastUpdatedAt: '2026-08-31T02:00:00.000Z', lastSync: failed }), NOW)
    ).toBe('current');
    expect(
      stockFreshness(position({ lastUpdatedAt: '2026-08-31T08:00:00.000Z', lastSync: failed }), NOW)
    ).toBe('current');
  });
});

describe('incoming (BR-05, BR-06) — production vs transit, next date', () => {
  /**
   * @param {Partial<ASN>} over
   * @returns {ASN}
   */
  const asn = (over) =>
    /** @type {ASN} */ ({
      asnNumber: 'ASN-1',
      supplierId: 'sup-007',
      poReference: 'PO-1',
      status: 'In Transit',
      carrier: '',
      trackingNumber: '',
      eta: '2026-09-04T00:00:00.000Z',
      details: /** @type {ASN['details']} */ ({}),
      lineItems: [
        {
          materialCode: 'PK-PETB-8801',
          description: '',
          orderedQty: 10,
          shippedQty: 700,
          lotNumber: 'L'
        }
      ],
      ...over
    });
  /**
   * @param {Partial<CallOff>} over
   * @returns {CallOff}
   */
  const callOff = (over) =>
    /** @type {CallOff} */ ({
      id: 'co-x',
      callOffNumber: 'CO-X',
      supplierId: 'sup-007',
      materialCode: 'PK-PETB-8801',
      dispatches: [
        {
          id: 'd1',
          shippedDate: '2026-08-31',
          expectedArrival: '2026-09-02',
          quantity: 300,
          recordedAt: NOW
        }
      ],
      ...over
    });

  it('submitted and in-transit ASNs count; cancelled and delivered ones do not', () => {
    const items = inTransitItems(
      'sup-007',
      'PK-PETB-8801',
      [
        asn({}),
        asn({ asnNumber: 'A2', status: 'Cancelled' }),
        asn({ asnNumber: 'A3', status: 'Delivered' }),
        asn({ asnNumber: 'A4', status: 'Submitted' })
      ],
      []
    );
    expect(items.map((i) => i.reference)).toEqual(['ASN-1', 'A4']);
  });

  it('dispatch notices count only while their delivery is on the way, and never twice with their ASN', () => {
    const views = [
      { callOff: callOff({}), delivery: /** @type {const} */ ('dispatched') },
      {
        callOff: callOff({ id: 'co-y', callOffNumber: 'CO-Y' }),
        delivery: /** @type {const} */ ('deliveredOnTime')
      },
      {
        callOff: callOff({
          id: 'co-z',
          callOffNumber: 'CO-Z',
          dispatches: [
            {
              id: 'd2',
              shippedDate: '2026-08-31',
              expectedArrival: '2026-09-04',
              quantity: 700,
              asnNumber: 'ASN-1',
              recordedAt: NOW
            }
          ]
        }),
        delivery: /** @type {const} */ ('atRisk')
      }
    ];
    const items = inTransitItems('sup-007', 'PK-PETB-8801', [asn({})], views);
    expect(items.map((i) => `${i.source}:${i.reference}:${i.quantity}`)).toEqual([
      'asn:ASN-1:700',
      'dispatch:CO-X:300'
    ]);
    const totals = incomingTotals([
      ...items,
      { source: 'production', date: '2026-09-10', quantity: 1000, reference: null }
    ]);
    expect(totals).toEqual({
      inProduction: 1000,
      inTransit: 1000,
      total: 2000,
      nextDate: '2026-09-02'
    });
  });
});

describe('alert conditions on a position (REQ-E08-05 BR-01)', () => {
  it('PTI and supplier SOH below their ROPs — only when both figures exist', () => {
    expect(isPtiBelowRop(position({ ptiSoh: 399, ptiRop: 400 }))).toBe(true);
    expect(isPtiBelowRop(position({ ptiSoh: 400, ptiRop: 400 }))).toBe(false);
    expect(isPtiBelowRop(position({ ptiSoh: null }))).toBe(false);
    // Owner 2026-10-19 / DRC-D15 — against the SYSTEM ROP Supplier; the typed ROP is display only.
    /**
     * @param {number | null} value
     * @returns {import('./osipRopRules').RopFigure}
     */
    const sys = (value) => ({ value, unavailable: value === null ? 'NOT_ON_ROUTE' : null });
    expect(isSupplierBelowRop(position({ supplierSoh: 10, systemRopSupplier: sys(11) }))).toBe(
      true
    );
    expect(isSupplierBelowRop(position({ supplierSoh: 11, systemRopSupplier: sys(11) }))).toBe(
      false
    );
    expect(
      isSupplierBelowRop(
        position({ supplierSoh: 10, supplierRop: 11, systemRopSupplier: sys(null) })
      )
    ).toBe(false);
    expect(isSupplierBelowRop(position({ supplierSoh: 10, supplierRop: 11 }))).toBe(false);
  });

  it('projected stock-out: PTI cover shorter than the days until the next incoming date', () => {
    const incoming = [
      { source: /** @type {const} */ ('asn'), date: '2026-09-10', quantity: 5, reference: 'A' }
    ];
    // 400 ÷ 100 = 4 days of cover, next incoming in 10 days → stock-out.
    expect(isProjectedStockOut(position({ ptiSoh: 400, incoming }), 100, NOW)).toBe(true);
    // 1,100 ÷ 100 = 11 days → reaches the delivery.
    expect(isProjectedStockOut(position({ ptiSoh: 1100, incoming }), 100, NOW)).toBe(false);
    // No incoming date: nothing to be "before".
    expect(isProjectedStockOut(position({ ptiSoh: 1, incoming: [] }), 100, NOW)).toBe(false);
  });
});

describe('supplier access to PTI stock (REQ-E08-03 AC-01)', () => {
  /**
   * @param {Partial<StockAccessGrant>} over
   * @returns {StockAccessGrant}
   */
  const grant = (over) => ({
    supplierId: 'sup-007',
    supplierName: 'x',
    active: true,
    materials: [],
    log: [],
    ...over
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
    expect(maskForSupplier(position(), grant({ materials: ['PK-PETB-8801'] }))).toMatchObject({
      ptiSoh: 500,
      ptiRop: 400
    });
  });
});

describe('the stock template and row-by-row validation (REQ-E08-02 BR-05 to BR-07)', () => {
  const assigned = [
    { materialCode: 'PK-PETB-8801', uom: 'PCS' },
    { materialCode: 'PK-PETB-8802', uom: 'PCS' },
    { materialCode: 'PK-CAPF-8820', uom: 'PCS' }
  ];
  const TODAY = '2026-09-15';
  const ctx = { assigned, today: TODAY };

  it('the template is fixed, prefilled with the supplier’s materials, and parses back in EN or ID', () => {
    const csv = stockTemplateCsv(assigned, 'en');
    const { headers, rows } = parseCsv(csv);
    expect(headers[0]).toBe('Material code');
    // BL-60 — ten stock columns; [Proposed 2026-11-10] plus K and L for feedstock.
    expect(headers).toHaveLength(12);
    // [Proposed 2026-11-10] batch number, quantity and expiry are required for a
    // raw material, so only the manufacturing date still says "(optional)".
    expect(headers.slice(6)).toEqual([
      'Batch number',
      'Batch quantity',
      'Manufacturing date (YYYY-MM-DD) (optional)',
      'Expiry date (YYYY-MM-DD)',
      'Feedstock quantity (optional)',
      'Feedstock as of (YYYY-MM-DD) (optional)'
    ]);
    expect(rows.map((r) => r['Material code'])).toEqual([
      'PK-PETB-8801',
      'PK-PETB-8802',
      'PK-CAPF-8820'
    ]);
    expect(rows[0].Unit).toBe('PCS');
    expect(parseCsv(stockTemplateCsv(assigned, 'id')).headers[0]).toBe('Kode material');
  });

  it('known-good: valid materials are accepted with ROP, production and batches', () => {
    const csv = [
      'Material code,Stock on hand,Unit,Supplier reorder point,In-production quantity,Expected production completion date (YYYY-MM-DD),Batch number,Batch quantity,Expiry date (YYYY-MM-DD)',
      'PK-PETB-8801,1500,PCS,1000,2000,2026-09-10,B1,1000,2027-01-31',
      'PK-PETB-8801,,,,,,B2,500,',
      'PK-PETB-8802,700,pcs,,0,,,,'
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
          { batchNumber: 'B2', qty: 500 }
        ],
        rows: [2, 3]
      },
      { materialCode: 'PK-PETB-8802', totalQty: 700, inProductionQty: 0, rows: [4] }
    ]);
  });

  it('S-03 (INV-D10): a row left blank is not refused; it comes back as blank, not sent', () => {
    const csv = [
      stockTemplateCsv(assigned, 'en').split('\n')[0],
      'PK-PETB-8801,,PCS,,,,,,,', // row 2 — as downloaded: blank
      'PK-PETB-8802,700,PCS,,0,,,,,', // row 3 — filled and valid
      'PK-CAPF-8820,,PCS,,5,,,,,', // row 4 — filled, no SOH: refused
      ',,PCS,,,,,,,' // row 5 — code and figures empty: blank
    ].join('\n');
    const { accepted, refused, blank } = validateStockRows(parseCsv(csv).rows, ctx);
    expect(accepted.map((a) => a.materialCode)).toEqual(['PK-PETB-8802']);
    expect(refused).toEqual([
      { row: 4, materialCode: 'PK-CAPF-8820', reason: 'missingField', field: 'soh' }
    ]);
    expect(blank).toEqual([
      { row: 2, materialCode: 'PK-PETB-8801' },
      { row: 5, materialCode: '' }
    ]);
  });

  it('S-03: a value under a column the template does not know makes the row filled', () => {
    expect(isBlankStockRow({ 'Material code': 'PK-PETB-8801', Unit: 'PCS', Stock: '' })).toBe(true);
    expect(isBlankStockRow({ 'Material code': 'PK-PETB-8801', Unit: 'PCS', Stock: '50' })).toBe(
      false
    );
    const { refused, blank } = validateStockRows(
      [{ 'Material code': 'PK-PETB-8801', Unit: 'PCS', Stock: '50' }],
      ctx
    );
    expect(blank).toEqual([]);
    expect(refused).toEqual([
      { row: 2, materialCode: 'PK-PETB-8801', reason: 'missingField', field: 'soh' }
    ]);
  });

  it('known-bad rows are refused with row number and reason, and the valid rows still pass', () => {
    const csv = [
      'Material code,Stock on hand,Unit,Supplier reorder point,In-production quantity,Expected production completion date (YYYY-MM-DD),Batch number,Batch quantity,Expiry date (YYYY-MM-DD)',
      'RM-EMUL-3310,100,KG,,,,,,', // row 2 — not assigned to this supplier
      'PK-PETB-8802,1.500,PCS,,,,,,', // row 3 — CR-18 ambiguous
      'PK-CAPF-8820,900,PCS,,0,,C1,400,', // row 4 — CR-19 batch total ≠ SOH
      'PK-CAPF-8820,,,,,,C2,400,', // row 5 — same material, refused with it
      ',50,PCS,,,,,,', // row 6 — material code missing
      'PK-PETB-8801,abc,PCS,,,,,,', // row 7 — not a number
      'PK-PETB-8801,10,KG,,,,,,' // row 8 — conflicting SOH for the same material
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
      '8:conflictingRows'
    ]);
    // A lone valid row beside the same failures is still accepted (not all-or-nothing).
    const mixed = validateStockRows(
      [
        { 'Material code': 'RM-EMUL-3310', 'Stock on hand': '1', Unit: 'KG' },
        {
          'Material code': 'PK-PETB-8801',
          'Stock on hand': '1500',
          Unit: 'PCS',
          'In-production quantity': '0'
        }
      ],
      ctx
    );
    expect(mixed.accepted.map((a) => a.materialCode)).toEqual(['PK-PETB-8801']);
    expect(mixed.refused.map((r) => `${r.row}:${r.reason}`)).toEqual(['2:notAssigned']);
  });

  it('missing SOH, wrong unit and a bad date are each refused by name', () => {
    /** @type {Record<string, string>[]} */
    const rows = [
      // Filled (a reorder point), so not blank (S-03): the missing SOH is refused.
      {
        'Material code': 'PK-PETB-8801',
        'Stock on hand': '',
        Unit: 'PCS',
        'Supplier reorder point': '100'
      },
      { 'Material code': 'PK-PETB-8802', 'Stock on hand': '5', Unit: 'KG' },
      {
        'Kode material': 'PK-CAPF-8820',
        'Stok tersedia': '5',
        Satuan: 'PCS',
        'Kuantitas dalam produksi': '10',
        'Perkiraan tanggal selesai produksi (YYYY-MM-DD)': '10/09/2026'
      }
    ];
    expect(validateStockRows(rows, ctx).refused).toEqual([
      { row: 2, materialCode: 'PK-PETB-8801', reason: 'missingField', field: 'soh' },
      { row: 3, materialCode: 'PK-PETB-8802', reason: 'unitMismatch', field: 'unit' },
      {
        row: 4,
        materialCode: 'PK-CAPF-8820',
        reason: 'invalidDate',
        field: 'productionCompletionDate'
      }
    ]);
  });
});

describe('MR-4 — the template marks optional columns; MAT-D4 — in production is required', () => {
  const assigned = [{ materialCode: 'PK-PETB-8801', uom: 'PCS' }];
  const ctx = { assigned, today: '2026-09-15' };

  it('AC-01: a freshly built template marks D, I, K and L optional, in EN and ID, and nothing else', () => {
    const en = parseCsv(stockTemplateCsv(assigned, 'en')).headers;
    const id = parseCsv(stockTemplateCsv(assigned, 'id')).headers;
    /**
     * @param {string[]} hs
     * @param {string} suffix
     */
    const marked = (hs, suffix) =>
      hs.flatMap((h, i) => (h.endsWith(suffix) ? [String.fromCharCode(65 + i)] : []));
    expect(marked(en, ' (optional)')).toEqual(['D', 'I', 'K', 'L']);
    expect(marked(id, ' (opsional)')).toEqual(['D', 'I', 'K', 'L']);
    expect(en[6]).toBe('Batch number');
    expect(id[6]).toBe('Nomor batch');
    // E is required; F is required when E > 0 — neither carries the suffix.
    expect(en[4]).toBe('In-production quantity');
    expect(en[5]).toBe('Expected production completion date (YYYY-MM-DD)');
    expect(STOCK_TEMPLATE_FIELDS.map((f) => f.presence)).toEqual([
      'required',
      'required',
      'required',
      'optional',
      'required',
      'requiredWhenInProduction',
      'requiredForRawMaterial',
      'requiredForRawMaterial',
      'optional',
      'requiredForRawMaterial',
      'optional',
      'optional'
    ]);
  });

  it('AC-02: a header with or without the suffix matches the same field (older files still upload)', () => {
    for (const f of STOCK_TEMPLATE_FIELDS) {
      expect(templateFieldFor(f.en)).toBe(f.field);
      expect(templateFieldFor(f.id)).toBe(f.field);
      expect(templateFieldFor(`${f.en} (optional)`)).toBe(f.field);
      expect(templateFieldFor(`${f.id} (opsional)`)).toBe(f.field);
    }
    expect(templateFieldFor('Not a column (optional)')).toBeNull();
    // A pre-change file (no suffixes) and a fresh file (suffixes) validate the same.
    const old =
      'Material code,Stock on hand,Unit,Supplier reorder point,In-production quantity,Expected production completion date (YYYY-MM-DD),Batch number,Batch quantity,Manufacturing date (YYYY-MM-DD),Expiry date (YYYY-MM-DD)';
    const fresh = parseCsv(stockTemplateCsv(assigned, 'en')).headers.join(',');
    const body = 'PK-PETB-8801,100,PCS,50,0,,B1,100,2026-09-01,2027-09-01';
    const a = validateStockRows(parseCsv([old, body].join('\n')).rows, ctx);
    const b = validateStockRows(parseCsv([fresh, body].join('\n')).rows, ctx);
    expect(a.refused).toEqual([]);
    expect(b).toEqual(a);
    expect(a.accepted[0]).toMatchObject({
      supplierRop: 50,
      inProductionQty: 0,
      batches: [{ batchNumber: 'B1', qty: 100 }]
    });
  });

  const HEAD = parseCsv(stockTemplateCsv(assigned, 'en')).headers.join(',');
  /**
   * @param {string} e
   * @param {string} f
   */
  const row = (e, f) =>
    validateStockRows(parseCsv([HEAD, `PK-PETB-8801,100,PCS,,${e},${f},,,,`].join('\n')).rows, ctx);

  it('blank E is refused as a missing field', () => {
    expect(row('', '').refused).toEqual([
      { row: 2, materialCode: 'PK-PETB-8801', reason: 'missingField', field: 'inProductionQty' }
    ]);
    expect(row('', '').accepted).toEqual([]);
  });

  it('E = 0 with blank F passes', () => {
    const r = row('0', '');
    expect(r.refused).toEqual([]);
    expect(r.accepted).toEqual([
      { materialCode: 'PK-PETB-8801', totalQty: 100, inProductionQty: 0, rows: [2] }
    ]);
  });

  it('E = 50 with blank F is refused productionDateMissing; with F it passes', () => {
    expect(row('50', '').refused).toEqual([
      {
        row: 2,
        materialCode: 'PK-PETB-8801',
        reason: 'productionDateMissing',
        field: 'productionCompletionDate'
      }
    ]);
    expect(row('50', '2026-10-01').accepted).toEqual([
      {
        materialCode: 'PK-PETB-8801',
        totalQty: 100,
        inProductionQty: 50,
        productionCompletionDate: '2026-10-01',
        rows: [2]
      }
    ]);
  });

  it('productionProblem is the one check (both directions)', () => {
    expect(productionProblem(null, '', 'template')).toEqual({
      reason: 'missingField',
      field: 'inProductionQty'
    });
    expect(productionProblem(0, '', 'template')).toBeNull();
    expect(productionProblem(50, '', 'template')).toEqual({
      reason: 'productionDateMissing',
      field: 'productionCompletionDate'
    });
    expect(productionProblem(50, '2026-10-01', 'template')).toBeNull();
    expect(productionProblem(0, '01/10/2026', 'template')).toEqual({
      reason: 'invalidDate',
      field: 'productionCompletionDate'
    });
  });

  it('C1b — manual and pti enforce the pair like template; api is exempt (owner ruling 2026-09-29)', () => {
    for (const ch of /** @type {const} */ (['manual', 'pti'])) {
      expect(productionProblem(null, '', ch)).toEqual({
        reason: 'missingField',
        field: 'inProductionQty'
      });
      expect(productionProblem(50, '', ch)).toEqual({
        reason: 'productionDateMissing',
        field: 'productionCompletionDate'
      });
      expect(productionProblem(0, '', ch)).toBeNull();
    }
    // An ERP that does not send in-production is accepted; nor is a date demanded.
    expect(productionProblem(null, '', 'api')).toBeNull();
    expect(productionProblem(50, '', 'api')).toBeNull();
    // A date it does send must still be a day.
    expect(productionProblem(null, '01/10/2026', 'api')).toEqual({
      reason: 'invalidDate',
      field: 'productionCompletionDate'
    });
  });

  it('submissionChannel — a buyer recording is always pti; a supplier is template or manual', () => {
    expect(submissionChannel(true, 'template')).toBe('pti');
    expect(submissionChannel(false, 'template')).toBe('template');
    expect(submissionChannel(false, 'manual')).toBe('manual');
    expect(submissionChannel(false, undefined)).toBe('manual');
  });
});

describe('batch manufacturing date (REQ-E08-02 BR-06, BL-60)', () => {
  const assigned = [{ materialCode: 'PK-PETB-8801', uom: 'PCS' }];
  const ctx = { assigned, today: '2026-09-15' };
  const HEAD =
    'Material code,Stock on hand,Unit,Supplier reorder point,In-production quantity,Expected production completion date (YYYY-MM-DD),Batch number,Batch quantity,Manufacturing date (YYYY-MM-DD),Expiry date (YYYY-MM-DD)';
  /**
   * @param {string} mfg
   * @param {string} exp
   */
  const one = (mfg, exp) =>
    validateStockRows(
      parseCsv([HEAD, `PK-PETB-8801,100,PCS,,0,,B1,100,${mfg},${exp}`].join('\n')).rows,
      ctx
    );

  it('known-good: an optional manufacturing date is carried into the submission', () => {
    expect(one('2026-09-01', '2027-09-01').accepted[0].batches).toEqual([
      { batchNumber: 'B1', qty: 100, manufacturingDate: '2026-09-01', expiryDate: '2027-09-01' }
    ]);
    // Still optional: no date, no key.
    expect(one('', '').accepted[0].batches).toEqual([{ batchNumber: 'B1', qty: 100 }]);
    // On the day itself is not the future.
    expect(one('2026-09-15', '').refused).toEqual([]);
  });

  it('known-bad: after expiry, in the future, or not a date — each refused by name', () => {
    expect(one('2027-10-01', '2027-09-01').refused).toEqual([
      {
        row: 2,
        materialCode: 'PK-PETB-8801',
        reason: 'manufacturedAfterExpiry',
        field: 'manufacturingDate'
      }
    ]);
    expect(one('2026-09-16', '').refused).toEqual([
      {
        row: 2,
        materialCode: 'PK-PETB-8801',
        reason: 'manufacturedInFuture',
        field: 'manufacturingDate'
      }
    ]);
    expect(one('01/09/2026', '').refused).toEqual([
      { row: 2, materialCode: 'PK-PETB-8801', reason: 'invalidDate', field: 'manufacturingDate' }
    ]);
  });

  it('batchDatesProblem is the one check (both directions)', () => {
    expect(batchDatesProblem({}, '2026-09-15')).toBeNull();
    expect(
      batchDatesProblem({ manufacturingDate: '2026-09-15', expiryDate: '2026-09-15' }, '2026-09-15')
    ).toBeNull();
    expect(batchDatesProblem({ manufacturingDate: '2026-09-16' }, '2026-09-15')?.problem).toBe(
      'manufacturedInFuture'
    );
    expect(
      batchDatesProblem({ manufacturingDate: '2026-09-10', expiryDate: '2026-09-09' }, '2026-09-15')
        ?.problem
    ).toBe('manufacturedAfterExpiry');
    expect(batchDatesProblem({ expiryDate: 'soon' }, '2026-09-15')).toEqual({
      problem: 'invalidDate',
      field: 'expiryDate'
    });
  });
});

describe('weeks', () => {
  it('Monday of the week', () => {
    expect(mondayOf('2026-08-31')).toBe('2026-08-31');
    expect(mondayOf('2026-09-06')).toBe('2026-08-31');
    expect(mondayOf('2026-09-07')).toBe('2026-09-07');
  });
});

describe('[Proposed 2026-11-10] raw material needs batches with expiry; feedstock rides the template', () => {
  const rawCtx = {
    assigned: [
      { materialCode: 'RM-GLYC-0001', uom: 'KG', materialType: 'ROH' },
      { materialCode: 'PK-PETB-8801', uom: 'PCS', materialType: 'VERP' }
    ],
    today: '2026-09-01'
  };
  const HEAD =
    'Material code,Stock on hand,Unit,In-production quantity,Batch number,Batch quantity,Expiry date (YYYY-MM-DD),Feedstock quantity,Feedstock as of (YYYY-MM-DD)';

  it('the rule: ROH with stock needs batches, each with an expiry; packaging, zero stock and API are exempt', () => {
    const base = { materialType: 'ROH', soh: 100, channel: /** @type {const} */ ('manual') };
    expect(rawMaterialBatchProblem({ ...base, batches: [] })?.reason).toBe(
      'rawMaterialBatchRequired'
    );
    expect(rawMaterialBatchProblem({ ...base, batches: [{ expiryDate: '' }] })?.reason).toBe(
      'rawMaterialExpiryRequired'
    );
    // Known-good: a batch with its expiry passes.
    expect(rawMaterialBatchProblem({ ...base, batches: [{ expiryDate: '2027-01-31' }] })).toBe(
      null
    );
    expect(rawMaterialBatchProblem({ ...base, materialType: 'VERP', batches: [] })).toBe(null);
    expect(rawMaterialBatchProblem({ ...base, soh: 0, batches: [] })).toBe(null);
    expect(rawMaterialBatchProblem({ ...base, channel: 'api', batches: [] })).toBe(null);
  });

  it('the template refuses a raw material without batches or expiry, and still accepts packaging without', () => {
    const csv = [HEAD, 'RM-GLYC-0001,100,KG,0,,,,,', 'PK-PETB-8801,700,PCS,0,,,,,'].join('\n');
    const { accepted, refused } = validateStockRows(parseCsv(csv).rows, rawCtx);
    expect(refused).toEqual([
      {
        row: 2,
        materialCode: 'RM-GLYC-0001',
        reason: 'rawMaterialBatchRequired',
        field: 'batchNumber'
      }
    ]);
    expect(accepted.map((a) => a.materialCode)).toEqual(['PK-PETB-8801']);
    const noExpiry = [HEAD, 'RM-GLYC-0001,100,KG,0,B1,100,,,'].join('\n');
    expect(validateStockRows(parseCsv(noExpiry).rows, rawCtx).refused[0].reason).toBe(
      'rawMaterialExpiryRequired'
    );
    const good = [HEAD, 'RM-GLYC-0001,100,KG,0,B1,100,2027-01-31,,'].join('\n');
    expect(validateStockRows(parseCsv(good).rows, rawCtx).accepted[0].batches).toEqual([
      { batchNumber: 'B1', qty: 100, expiryDate: '2027-01-31' }
    ]);
  });

  it('feedstock columns: read on their own, a feedstock-only row is not stock, a blank date is today', () => {
    const csv = [
      HEAD,
      'PK-PETB-8801,,PCS,,,,,250,',
      'RM-GLYC-0001,,KG,,,,,abc,',
      'XX-NOT-0001,,PCS,,,,,10,2026-08-30'
    ].join('\n');
    const rows = parseCsv(csv).rows;
    // The stock half sees the feedstock-only rows as blank, never as refused stock.
    const stock = validateStockRows(rows, rawCtx);
    expect(stock.refused.map((r) => r.materialCode)).toEqual([]);
    expect(stock.blank.map((b) => b.materialCode)).toEqual([
      'PK-PETB-8801',
      'RM-GLYC-0001',
      'XX-NOT-0001'
    ]);
    const feed = readFeedstockRows(rows, rawCtx);
    expect(feed.accepted).toEqual([
      { materialCode: 'PK-PETB-8801', feedstockQty: 250, confirmedOn: '2026-09-01', row: 2 }
    ]);
    expect(feed.refused).toEqual([
      { row: 3, materialCode: 'RM-GLYC-0001', reason: 'feedstockQtyInvalid' },
      { row: 4, materialCode: 'XX-NOT-0001', reason: 'notAssigned' }
    ]);
  });
});
