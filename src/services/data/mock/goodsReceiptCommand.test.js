// ────────────────────────────────────────────────────────────────────────────
// GR command integration (v2.2 Step 4 batch ii) — the goods-receipt verbs
// dispatched through the REAL MockCommandService + the real stores (not synthetic
// targets like command.test.js). This is the honest proof of the operator chain:
//   create (records lines) → rollup-gated disposition → cross-entity cascade
//   (ASN discrepancy) → Post to SAP (submitted, interim, NO doc) → settle
//   (Posted to SAP + REAL MAT-DOC, Option B).
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';

import { MockCommandService } from './MockCommandService';
import { goodsReceiptStore } from './stores/goodsReceiptStore';
import { asnStore } from './stores/asnStore';
/** @import { QueryScope, InspectionResult, ASN } from '../types' */
import { PERSONA_SYSTEM_ROLES } from '../../../services/transitions/businessRoles';

/** @type {QueryScope} */
const buyer = { personaType: 'buyer', supplierId: null, businessRoles: PERSONA_SYSTEM_ROLES.buyer };
const svc = new MockCommandService();

// A submitted ASN seeded directly so the GR references a receivable, cascadable
// document without threading the whole PO→ASN pipeline through each test.
/**
 * @param {string} asnNumber
 * @returns {ASN}
 */
const submittedAsn = (asnNumber) => ({
  asnNumber,
  supplierId: 'sup-007',
  poReference: 'PO-2025-00107',
  status: 'Submitted',
  carrier: 'Sample Courier',
  trackingNumber: 'TRK-1',
  eta: '2026-05-22',
  details: {
    originCity: 'Surabaya',
    destinationWarehouse: 'NDC J6, Jakarta',
    totalCartons: 10,
    grossWeightKg: 100,
    temperatureRequirement: 'Ambient'
  },
  // CP-2 · B1 — the ASN must DECLARE the material its receipt inspects. These
  // fixtures carried `lineItems: []` while filing an inspection line, and the new
  // GR_INSPECTION_MATERIALS_DECLARED gate refused them — correctly: a receipt
  // cannot inspect goods its own parent document never says arrived. The gate
  // found incoherent fixtures, so the fixtures are what changed.
  lineItems: [
    {
      materialCode: 'PK-PETB-8801',
      description: 'PET Bottle 200ml Frosted',
      orderedQty: 10_000,
      shippedQty: 10_000,
      lotNumber: 'LOT-1'
    }
  ]
});

/**
 * @param {number} acc
 * @param {number} rej
 * @returns {InspectionResult}
 */
const line = (acc, rej) => ({
  materialCode: 'PK-PETB-8801',
  description: 'PET Bottle 200ml Frosted',
  qtyExpected: acc + rej,
  qtyReceived: acc + rej,
  qtyAccepted: acc,
  qtyRejected: rej,
  visualCheck: 'Pass',
  packagingCheck: 'Pass'
});

/**
 * @param {string} asnReference
 * @param {InspectionResult[]} results
 */
const create = (asnReference, results) =>
  svc.dispatch(buyer, {
    transitionId: 't_gr_create',
    entity: 'goodsReceipt',
    payload: {
      asnReference,
      receivedDate: '2026-05-20',
      receivedBy: 'QC Inspector',
      inspectionResults: results
    }
  });

/**
 * @param {string} transitionId
 * @param {string} entityId
 * @param {Record<string, unknown>} [payload]
 */
const fire = (transitionId, entityId, payload) =>
  svc.dispatch(buyer, { transitionId, entity: 'goodsReceipt', entityId, payload });

beforeEach(() => {
  goodsReceiptStore.reset();
  asnStore.reset();
});

describe('GR command integration — create + rollup-gated disposition + cascade', () => {
  it('records the lines at create and starts in Pending Inspection', async () => {
    asnStore.add(submittedAsn('ASN-TEST-1'));
    const res = await create('ASN-TEST-1', [line(60, 40)]);
    expect(res.status).toBe('done');
    const gr = /** @type {import('../../../data/mockGoodsReceipts').GoodsReceipt} */ (
      goodsReceiptStore.get(/** @type {NonNullable<typeof res.entityId>} */ (res.entityId))
    );
    expect(gr.status).toBe('Pending Inspection');
    expect(gr.inspectionResults).toHaveLength(1);
    expect(gr.asnNumber).toBe('ASN-TEST-1');
    expect(gr.supplierId).toBe('sup-007'); // derived from the seeded ASN
  });

  it('rejects a header verb the line rollup contradicts (Approve on a partial)', async () => {
    asnStore.add(submittedAsn('ASN-TEST-1'));
    const grId = /** @type {NonNullable<(Awaited<ReturnType<typeof create>>)['entityId']>} */ (
      (await create('ASN-TEST-1', [line(60, 40)])).entityId
    );
    await fire('t_gr_start_inspection', grId);
    const bad = await fire('t_gr_approve', grId);
    expect(bad.status).toBe('failed');
    expect(bad.reason).toMatch(/POLICY_REJECTED:gr_rollup_all_accepted/);
    // The GR is untouched by the rejected command.
    expect(
      /** @type {import('../../../data/mockGoodsReceipts').GoodsReceipt} */ (
        goodsReceiptStore.get(grId)
      ).status
    ).toBe('Under Inspection');
  });

  it('partial-approve rolls up and cascades an ASN discrepancy (census G4)', async () => {
    asnStore.add(submittedAsn('ASN-TEST-1'));
    const grId = /** @type {NonNullable<(Awaited<ReturnType<typeof create>>)['entityId']>} */ (
      (await create('ASN-TEST-1', [line(60, 40)])).entityId
    );
    await fire('t_gr_start_inspection', grId);
    const res = await fire('t_gr_partial_approve', grId);
    expect(res.status).toBe('done');
    expect(
      /** @type {import('../../../data/mockGoodsReceipts').GoodsReceipt} */ (
        goodsReceiptStore.get(grId)
      ).status
    ).toBe('Partially Approved');
    // Cross-entity cascade fired onto the linked ASN.
    expect(/** @type {ASN} */ (asnStore.get('ASN-TEST-1')).status).toBe('Discrepancy');
  });

  it('t_gr_reject honestly requires a dispositionReason', async () => {
    asnStore.add(submittedAsn('ASN-TEST-1'));
    const grId = /** @type {NonNullable<(Awaited<ReturnType<typeof create>>)['entityId']>} */ (
      (await create('ASN-TEST-1', [line(0, 40)])).entityId
    );
    await fire('t_gr_start_inspection', grId);
    const res = await fire('t_gr_reject', grId); // no reason
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/MISSING_FIELDS:dispositionReason/);
  });

  it('rejects GR create when no arrived shipment or ASN backs the reference', async () => {
    const res = await create('ASN-GHOST', [line(100, 0)]);
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/POLICY_REJECTED:gr_create_shipment_received/);
  });
});

describe('GR Post to SAP — Option B submitted-interim → settle-finalize', () => {
  it('post holds submitted at Posting to SAP (no doc); settle assigns the real MAT-DOC', async () => {
    asnStore.add(submittedAsn('ASN-TEST-2'));
    const grId = /** @type {NonNullable<(Awaited<ReturnType<typeof create>>)['entityId']>} */ (
      (await create('ASN-TEST-2', [line(100, 0)])).entityId
    );
    await fire('t_gr_start_inspection', grId);
    await fire('t_gr_approve', grId); // all accepted → Approved
    expect(
      /** @type {import('../../../data/mockGoodsReceipts').GoodsReceipt} */ (
        goodsReceiptStore.get(grId)
      ).status
    ).toBe('Approved');

    const post = await fire('t_gr_post', grId);
    expect(post.status).toBe('submitted');
    const interim = /** @type {import('../../../data/mockGoodsReceipts').GoodsReceipt} */ (
      goodsReceiptStore.get(grId)
    );
    expect(interim.status).toBe('Posting to SAP');
    expect(interim.sapMaterialDoc).toBeUndefined(); // pending SAP assignment

    const settled = await svc.settle(buyer, post.correlationId);
    expect(settled?.status).toBe('done');
    const final = /** @type {import('../../../data/mockGoodsReceipts').GoodsReceipt} */ (
      goodsReceiptStore.get(grId)
    );
    expect(final.status).toBe('Posted to SAP');
    expect(final.sapMaterialDoc).toMatch(/^MAT-DOC-/); // real ref, minted on settle
  });
});
