import { describe, expect, it } from 'vitest';
/** @import { FsAsnInput, FsCallOffInput, FsInputs, FsPoInput } from './feedstockReconcile' */
/** @import { CallOffStatus, POStatus } from '../data/types' */
import {
  FEEDSTOCK_PO_EXCLUDED_STATES,
  buildFeedstockReconcile,
  feedstockRemainders
} from './feedstockReconcile';
import { cycleOfDay } from './forecastConfig';

// DRC-15a (BL-201) — the feedstock (FS) reconcile: PO ordered against called
// off against ASN requested, per supplier × material, read daily.

/**
 * @param {string} poNumber
 * @param {POStatus} status
 * @param {number} quantity
 * @param {Partial<FsPoInput['lineItems'][number]>} [line]
 * @returns {FsPoInput}
 */
const po = (poNumber, status, quantity, line = {}) => ({
  poNumber,
  supplierId: 'sup-a',
  supplierName: 'Supplier A',
  status,
  lineItems: [
    {
      id: `${poNumber}-1`,
      materialCode: 'PK-1',
      description: 'Bottle 100 ml',
      quantity,
      uom: 'PCS',
      unitPrice: 1,
      confirmedQty: 0,
      ...line
    }
  ]
});

/**
 * @param {string} id
 * @param {CallOffStatus} status
 * @param {number} quantity
 * @returns {FsCallOffInput}
 */
const co = (id, status, quantity) => ({
  id,
  callOffNumber: `CO-${id}`,
  supplierId: 'sup-a',
  supplierName: 'Supplier A',
  materialCode: 'PK-1',
  description: 'Bottle 100 ml',
  uom: 'PCS',
  status,
  quantity
});

/**
 * @param {string} asnNumber
 * @param {FsAsnInput['status']} status
 * @param {string} callOffId
 * @param {number} shippedQty
 * @param {string} [materialCode]
 * @returns {FsAsnInput}
 */
const asn = (asnNumber, status, callOffId, shippedQty, materialCode = 'PK-1') => ({
  asnNumber,
  status,
  callOffId,
  lineItems: [
    { materialCode, description: '', orderedQty: shippedQty, shippedQty, lotNumber: 'L1' }
  ]
});

/**
 * @param {Partial<FsInputs>} over
 * @returns {FsInputs}
 */
const inputs = (over) => ({
  purchaseOrders: [],
  callOffs: [],
  asns: [],
  maxStock: () => null,
  maxStockSettable: () => true,
  asOf: '2026-10-19',
  ...over
});

describe('DRC-15a BR-01 — the worked example', () => {
  it('PO 100, called off 60, ASN 40: 40 not yet called off, 20 called off and not yet shipped', () => {
    expect(feedstockRemainders({ poOrdered: 100, calledOff: 60, asnRequested: 40 })).toEqual({
      notYetCalledOff: 40,
      calledOffNotShipped: 20,
      calledBeyondPo: 0,
      shippedBeyondCalledOff: 0
    });
  });

  it('the same example built from records gives one row with those figures', () => {
    const rows = buildFeedstockReconcile(
      inputs({
        purchaseOrders: [po('PO-1', 'Confirmed', 100)],
        callOffs: [co('c1', 'Confirmed', 35), co('c2', 'Awaiting Confirmation', 25)],
        asns: [asn('ASN-1', 'In Transit', 'c1', 30), asn('ASN-2', 'Delivered', 'c1', 10)]
      })
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      key: 'sup-a|PK-1',
      asOf: '2026-10-19',
      poOrdered: 100,
      poNumbers: ['PO-1'],
      calledOff: 60,
      callOffNumbers: ['CO-c1', 'CO-c2'],
      asnRequested: 40,
      asnNumbers: ['ASN-1', 'ASN-2'],
      notYetCalledOff: 40,
      calledOffNotShipped: 20,
      calledBeyondPo: 0,
      shippedBeyondCalledOff: 0
    });
  });
});

describe('DRC-15a BR-01 — what counts as called off (callOffRules.isReleased)', () => {
  it('drafts, dismissed and rejected call-offs count nothing; every released state counts', () => {
    const rows = buildFeedstockReconcile(
      inputs({
        purchaseOrders: [po('PO-1', 'Confirmed', 1000)],
        callOffs: [
          co('d', 'Draft', 500),
          co('x', 'Dismissed', 400),
          co('r', 'Rejected', 300),
          co('a', 'Awaiting Confirmation', 10),
          co('c', 'Confirmed', 20),
          co('n', 'Confirmed with New Date', 30),
          co('g', 'Confirmed with Changes', 40),
          co('p', 'Partially Confirmed', 50)
        ]
      })
    );
    expect(rows[0].calledOff).toBe(150);
    expect(rows[0].callOffNumbers).toEqual(['CO-a', 'CO-c', 'CO-g', 'CO-n', 'CO-p']);
    expect(rows[0].notYetCalledOff).toBe(850);
  });

  it('a pair with only a draft call-off and no PO has no row', () => {
    expect(buildFeedstockReconcile(inputs({ callOffs: [co('d', 'Draft', 500)] }))).toEqual([]);
  });

  it('an ASN against a rejected call-off counts nothing', () => {
    const rows = buildFeedstockReconcile(
      inputs({
        purchaseOrders: [po('PO-1', 'Confirmed', 100)],
        callOffs: [co('r', 'Rejected', 50)],
        asns: [asn('ASN-1', 'Submitted', 'r', 50)]
      })
    );
    expect(rows[0]).toMatchObject({ calledOff: 0, asnRequested: 0, asnNumbers: [] });
  });
});

describe('DRC-15a BR-01 — what counts as ASN requested (callOffRules.SHIPPED_ASN_STATES)', () => {
  it('a draft, a cancelled and an ASN awaiting a shelf-life exception count nothing', () => {
    const rows = buildFeedstockReconcile(
      inputs({
        purchaseOrders: [po('PO-1', 'Confirmed', 100)],
        callOffs: [co('c', 'Confirmed', 100)],
        asns: [
          asn('A-draft', 'Draft', 'c', 10),
          asn('A-cancel', 'Cancelled', 'c', 20),
          asn('A-exc', 'Awaiting exception', 'c', 30),
          asn('A-sub', 'Submitted', 'c', 1),
          asn('A-disc', 'Discrepancy', 'c', 2)
        ]
      })
    );
    expect(rows[0]).toMatchObject({ asnRequested: 3, asnNumbers: ['A-disc', 'A-sub'] });
  });

  it('only the call-off’s own material counts, and an ASN with no call-off counts nothing', () => {
    const rows = buildFeedstockReconcile(
      inputs({
        purchaseOrders: [po('PO-1', 'Confirmed', 100)],
        callOffs: [co('c', 'Confirmed', 100)],
        asns: [
          asn('A-other', 'In Transit', 'c', 70, 'PK-OTHER'),
          { asnNumber: 'A-po', status: 'In Transit', lineItems: [] },
          asn('A-mine', 'In Transit', 'c', 15)
        ]
      })
    );
    expect(rows[0]).toMatchObject({ asnRequested: 15, asnNumbers: ['A-mine'] });
  });
});

describe('DRC-15a BR-01 — what counts as PO ordered', () => {
  it('a rejected PO counts nothing; adjusted, delivered and closed POs count', () => {
    expect(FEEDSTOCK_PO_EXCLUDED_STATES).toEqual(['Rejected']);
    const rows = buildFeedstockReconcile(
      inputs({
        purchaseOrders: [
          po('PO-R', 'Rejected', 1000),
          po('PO-A', 'Adjusted', 10),
          po('PO-D', 'Delivered', 20),
          po('PO-C', 'Closed', 30)
        ]
      })
    );
    expect(rows[0]).toMatchObject({ poOrdered: 60, poNumbers: ['PO-A', 'PO-C', 'PO-D'] });
  });

  it('a value-only line adds no quantity and is counted apart', () => {
    const rows = buildFeedstockReconcile(
      inputs({
        purchaseOrders: [po('PO-V', 'Confirmed', 0, { valueLimit: 5_000_000 })],
        callOffs: [co('c', 'Confirmed', 100)]
      })
    );
    expect(rows[0]).toMatchObject({
      poOrdered: 0,
      valueOnlyLines: 1,
      notYetCalledOff: 0,
      calledBeyondPo: 100
    });
  });
});

describe('DRC-15a BR-01 / BR-02 — never below zero; an excess is a note, not an outcome', () => {
  it('called off beyond the PO and shipped beyond the call-offs show as excesses', () => {
    expect(feedstockRemainders({ poOrdered: 50, calledOff: 80, asnRequested: 95 })).toEqual({
      notYetCalledOff: 0,
      calledOffNotShipped: 0,
      calledBeyondPo: 30,
      shippedBeyondCalledOff: 15
    });
  });

  it('a row carries no outcome and no liability (BR-02)', () => {
    const [row] = buildFeedstockReconcile(
      inputs({ purchaseOrders: [po('PO-1', 'Confirmed', 100)] })
    );
    expect(Object.keys(row)).not.toContain('outcome');
    expect(Object.keys(row)).not.toContain('liabilityQty');
  });
});

describe('DRC-15a BR-03 — max stock stays on the row', () => {
  it('reads the max stock and whether the pair can carry one', () => {
    const [row] = buildFeedstockReconcile(
      inputs({
        purchaseOrders: [po('PO-1', 'Confirmed', 100)],
        maxStock: (s, m) => (s === 'sup-a' && m === 'PK-1' ? 90 : null),
        maxStockSettable: () => false
      })
    );
    expect(row).toMatchObject({ maxStock: 90, maxStockSettable: false });
  });
});

describe('rows per supplier × material, sorted by supplier then material', () => {
  it('two suppliers and two materials give four rows in order', () => {
    /**
     * @param {string} supplierId
     * @param {string} supplierName
     * @param {string} materialCode
     * @returns {FsPoInput}
     */
    const line = (supplierId, supplierName, materialCode) => ({
      ...po(`PO-${supplierId}-${materialCode}`, 'Confirmed', 1, { materialCode }),
      supplierId,
      supplierName
    });
    const rows = buildFeedstockReconcile(
      inputs({
        purchaseOrders: [
          line('s2', 'Beta', 'M2'),
          line('s1', 'Alpha', 'M2'),
          line('s2', 'Beta', 'M1'),
          line('s1', 'Alpha', 'M1')
        ]
      })
    );
    expect(rows.map((r) => r.key)).toEqual(['s1|M1', 's1|M2', 's2|M1', 's2|M2']);
  });
});

// The old 3-week cycle rule is dormant since DRC-15a (the view is daily); its
// setting stays until the owner rules, so the rule it still decides stays tested.
describe('REQ-E06-04 cycle (dormant) — cycleOfDay', () => {
  const CFG = { anchor: '2026-08-31', cycleWeeks: 3 };

  it('packaging runs in blocks of the cycle length from the anchor Monday', () => {
    expect(cycleOfDay('packaging', '2026-08-31', CFG)).toEqual({
      stream: 'packaging',
      start: '2026-08-31',
      end: '2026-09-20'
    });
    expect(cycleOfDay('packaging', '2026-09-21', CFG).start).toBe('2026-09-21');
    expect(cycleOfDay('packaging', '2026-08-27', CFG).start).toBe('2026-08-10');
  });

  it('raw material runs per calendar month', () => {
    expect(cycleOfDay('rawMaterial', '2027-02-01', CFG)).toEqual({
      stream: 'rawMaterial',
      start: '2027-02-01',
      end: '2027-02-28'
    });
  });
});
