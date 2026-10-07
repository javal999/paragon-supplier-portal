// ────────────────────────────────────────────────────────────────────────────
// MR-6 BR-01 to BR-04 and AR-11 — the ASN line rule shared by the form and the
// verbs, and the batch from declared stock, dispatched through the REAL
// MockCommandService against the real stores.
// ────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';

import { MockCommandService } from './MockCommandService';
import { purchaseOrderStore } from './stores/purchaseOrderStore';
import { asnStore } from './stores/asnStore';
import { inventoryDeclarationStore } from './stores/inventoryDeclarationStore';
/** @import { QueryScope } from '../types' */
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { availableBatches } from '../../transitions/fulfilmentRules';
import { NO_PERSON } from '@context/noPerson';
/** @import { LineEntry } from '@pages-v2/shipments/asnLines' */
import { openLinesFor, readLines } from '@pages-v2/shipments/asnLines';

const svc = new MockCommandService();

/** @type {QueryScope} */
const sup007 = {
  personaType: 'supplier',
  supplierId: 'sup-007',
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON
};

// PO-2025-00107 (po-007) — sup-007, Confirmed, one line PK-PETB-8801 × 200,000.
const PO = 'PO-2025-00107';
const MAT = 'PK-PETB-8801';
const SUBMIT = {
  carrier: 'Sample Courier',
  trackingNumber: 'B 1234 XY',
  eta: '2026-09-20',
  shipDate: '2026-09-18'
};

// A batch-grain stock record for sup-007 × PK-PETB-8801, added as the latest.
const declare = () =>
  inventoryDeclarationStore.add({
    id: 'inv-9901',
    supplierId: 'sup-007',
    materialCode: MAT,
    declaredAt: '2026-09-01T02:00:00.000Z',
    totalQty: 5000,
    uom: 'PCS',
    batches: [
      { batchNumber: 'PET-A', qty: 3000, uom: 'PCS', expiryDate: '2028-01-31' },
      { batchNumber: 'PET-B', qty: 2000, uom: 'PCS', expiryDate: '2028-03-31' }
    ],
    provenance: { source: 'SUPPLIER', liveness: 'SIMULATED', planState: 'committed' }
  });

/** @param {Record<string, unknown>} payload */
const createAsn = (payload) =>
  svc.dispatch(sup007, {
    transitionId: 't_asn_create',
    entity: 'advanceShipNotice',
    payload: { poReference: PO, ...payload }
  });
/**
 * @param {string} entityId
 * @param {Record<string, unknown>} [payload]
 */
const submitAsn = (entityId, payload = {}) =>
  svc.dispatch(sup007, {
    transitionId: 't_asn_submit',
    entity: 'advanceShipNotice',
    entityId,
    payload: { ...SUBMIT, ...payload }
  });

const po = () => /** @type {import('../types').PurchaseOrder} */ (purchaseOrderStore.get('po-007'));
const batchesNow = () => ({
  [MAT]: availableBatches(
    'sup-007',
    MAT,
    asnStore.all(),
    inventoryDeclarationStore.latestFor('sup-007', MAT)
  )
});
/** @param {Partial<LineEntry>} entry */
const formRead = (entry, overShipReason = '') =>
  readLines(
    { [MAT]: { qty: '', batch: '', expiry: '', batchSource: 'declared', ...entry } },
    openLinesFor(po(), asnStore.all()),
    { po: po(), asns: asnStore.all(), eta: SUBMIT.eta, overShipReason, batches: batchesNow() }
  );

beforeEach(() => {
  purchaseOrderStore.reset();
  asnStore.reset();
  inventoryDeclarationStore.reset();
});

describe('the submit hook reads each line through asnLineRefusal (AR-11)', () => {
  it('KNOWN-BAD — a line without a batch is refused by name; KNOWN-GOOD — with one it submits', async () => {
    const draft = /** @type {NonNullable<(Awaited<ReturnType<typeof createAsn>>)['entityId']>} */ (
      (await createAsn({ lines: [{ materialCode: MAT, shippedQty: 1_000 }] })).entityId
    );
    const refused = await submitAsn(draft);
    expect(refused.status).toBe('failed');
    expect(refused.reason).toMatch(
      /POLICY_REJECTED:asn_submit_complete:INCOMPLETE_ASN: batch number missing on line 1/
    );
    expect(/** @type {import('../types').ASN} */ (asnStore.get(draft)).status).toBe('Draft');

    const ok = await submitAsn(draft, {
      lines: [{ materialCode: MAT, shippedQty: 1_000, batchNumber: 'B-1' }]
    });
    expect(ok.status).toBe('done');
  });

  it('an expiry that is not a calendar date is refused on submit too (the stored line now reaches the rule)', async () => {
    const draft = /** @type {NonNullable<(Awaited<ReturnType<typeof createAsn>>)['entityId']>} */ (
      (await createAsn({ lines: [{ materialCode: MAT, shippedQty: 1_000 }] })).entityId
    );
    const bad = await submitAsn(draft, {
      lines: [
        { materialCode: MAT, shippedQty: 1_000, batchNumber: 'B-1', expiryDate: '2027-02-30' }
      ]
    });
    expect(bad.reason).toMatch(/asn_lines_within_open:line 1: expiry/);
    const good = await submitAsn(draft, {
      lines: [
        { materialCode: MAT, shippedQty: 1_000, batchNumber: 'B-1', expiryDate: '2027-02-28' }
      ]
    });
    expect(good.status).toBe('done');
  });
});

describe('the form and the verbs agree on one fixture (PO-2025-00107)', () => {
  it('no batch: the form is incomplete, and the verb refuses', async () => {
    const read = formRead({ qty: '1000' });
    expect(read.complete).toBe(false);
    expect(read.lines[0].refusal).toBe('batch');
    const draft = /** @type {NonNullable<(Awaited<ReturnType<typeof createAsn>>)['entityId']>} */ (
      (await createAsn({ lines: read.lines.map((l) => l.input) })).entityId
    );
    expect((await submitAsn(draft)).status).toBe('failed');
  });

  it('above open without a reason: the form flags it, and the verb refuses; with a reason both pass', async () => {
    const over = formRead({ qty: '200001', batch: 'B-1', batchSource: 'typed' });
    expect(over.overCount).toBe(1);
    expect(over.complete).toBe(false);
    expect((await createAsn({ lines: over.lines.map((l) => l.input) })).reason).toMatch(
      /OVER_OPEN_QUANTITY/
    );

    const reason = 'Overfill agreed with the planner';
    const withReason = formRead({ qty: '200001', batch: 'B-1', batchSource: 'typed' }, reason);
    expect(withReason.complete).toBe(true);
    const res = await createAsn({
      lines: withReason.lines.map((l) => l.input),
      overShipReason: reason,
      ...SUBMIT
    });
    expect(res.status).toBe('done');
    expect(
      (await submitAsn(/** @type {NonNullable<typeof res.entityId>} */ (res.entityId))).status
    ).toBe('done');
  });

  it('complete: the form passes, and the verb submits', async () => {
    const read = formRead({ qty: '1000', batch: 'B-1', batchSource: 'typed' });
    expect(read.complete).toBe(true);
    const draft = /** @type {NonNullable<(Awaited<ReturnType<typeof createAsn>>)['entityId']>} */ (
      (await createAsn({ lines: read.lines.map((l) => l.input) })).entityId
    );
    expect((await submitAsn(draft)).status).toBe('done');
  });
});

describe('batch from declared stock (MR-6 BR-01 to BR-04)', () => {
  it('AC-01 — the offered batches are the declared ones minus earlier submitted ASNs', async () => {
    declare();
    const first = /** @type {NonNullable<(Awaited<ReturnType<typeof createAsn>>)['entityId']>} */ (
      (
        await createAsn({
          lines: [
            { materialCode: MAT, shippedQty: 1_200, batchNumber: 'PET-A', batchSource: 'declared' }
          ]
        })
      ).entityId
    );
    expect((await submitAsn(first)).status).toBe('done');
    expect(batchesNow()[MAT]).toEqual([
      { batchNumber: 'PET-A', available: 1800, expiryDate: '2028-01-31' },
      { batchNumber: 'PET-B', available: 2000, expiryDate: '2028-03-31' }
    ]);
  });

  it('edge case 4 — a batch used up by another ASN is left out, and can still be typed', async () => {
    declare();
    const first = /** @type {NonNullable<(Awaited<ReturnType<typeof createAsn>>)['entityId']>} */ (
      (
        await createAsn({
          lines: [
            { materialCode: MAT, shippedQty: 3_000, batchNumber: 'PET-A', batchSource: 'declared' }
          ]
        })
      ).entityId
    );
    await submitAsn(first);
    expect(batchesNow()[MAT].map((b) => b.batchNumber)).toEqual(['PET-B']);

    const read = formRead({ qty: '10', batch: 'PET-A', batchSource: 'typed' });
    expect(read.lines[0].input.batchSource).toBe('typed');
    const second = /** @type {NonNullable<(Awaited<ReturnType<typeof createAsn>>)['entityId']>} */ (
      (await createAsn({ lines: read.lines.map((l) => l.input) })).entityId
    );
    expect(/** @type {import('../types').ASN} */ (asnStore.get(second)).lineItems[0]).toMatchObject(
      { lotNumber: 'PET-A', batchSource: 'typed' }
    );
  });

  it('AC-02 — a supplier without declared batches types one, stored `typed`', async () => {
    // sup-007 × PK-PETB-8801 has no batch-grain record in the seed.
    expect(batchesNow()[MAT]).toEqual([]);
    const read = formRead({ qty: '500', batch: 'LOT-77', batchSource: 'declared' });
    expect(read.lines[0].batchSource).toBe('typed');
    const draft = /** @type {NonNullable<(Awaited<ReturnType<typeof createAsn>>)['entityId']>} */ (
      (await createAsn({ lines: read.lines.map((l) => l.input) })).entityId
    );
    expect(/** @type {import('../types').ASN} */ (asnStore.get(draft)).lineItems[0]).toMatchObject({
      lotNumber: 'LOT-77',
      batchSource: 'typed'
    });
  });

  it('a picked batch is stored `declared`; a claim of `declared` for a batch not in the record is stored `typed`', async () => {
    declare();
    const picked = /** @type {NonNullable<(Awaited<ReturnType<typeof createAsn>>)['entityId']>} */ (
      (
        await createAsn({
          lines: [
            { materialCode: MAT, shippedQty: 10, batchNumber: 'PET-B', batchSource: 'declared' }
          ]
        })
      ).entityId
    );
    expect(
      /** @type {import('../types').ASN} */ (asnStore.get(picked)).lineItems[0].batchSource
    ).toBe('declared');
    const claimed =
      /** @type {NonNullable<(Awaited<ReturnType<typeof createAsn>>)['entityId']>} */ (
        (
          await createAsn({
            lines: [
              {
                materialCode: MAT,
                shippedQty: 10,
                batchNumber: 'NOT-DECLARED',
                batchSource: 'declared'
              }
            ]
          })
        ).entityId
      );
    expect(
      /** @type {import('../types').ASN} */ (asnStore.get(claimed)).lineItems[0].batchSource
    ).toBe('typed');
  });

  it("BR-03 — a line above the batch's available quantity warns, and still submits", async () => {
    declare();
    const read = formRead({
      qty: '2500',
      batch: 'PET-B',
      batchSource: 'declared',
      expiry: '2028-03-31'
    });
    expect(read.aboveAvailable.map((l) => [l.input.batchNumber, l.aboveAvailable])).toEqual([
      ['PET-B', 2000]
    ]);
    expect(read.complete).toBe(true);
    const res = await createAsn({ lines: read.lines.map((l) => l.input), ...SUBMIT });
    expect(res.status).toBe('done');
    expect(
      (await submitAsn(/** @type {NonNullable<typeof res.entityId>} */ (res.entityId))).status
    ).toBe('done');
    expect(
      /** @type {import('../types').ASN} */ (
        asnStore.get(/** @type {NonNullable<typeof res.entityId>} */ (res.entityId))
      ).lineItems[0]
    ).toMatchObject({ shippedQty: 2500, batchSource: 'declared' });

    // Known-good twin: at the available quantity there is no warning.
    expect(
      formRead({ qty: '1000', batch: 'PET-A', batchSource: 'declared' }).aboveAvailable
    ).toEqual([]);
  });
});
