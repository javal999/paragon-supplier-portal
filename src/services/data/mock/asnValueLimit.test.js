// ────────────────────────────────────────────────────────────────────────────
// BL-140 (owner ruling 2026-11-20) through the REAL MockCommandService — an
// ASN against a value-limit PO line. Source: CR-04, value-limit line BL-49.
//
// The ruling: the ASN is raised against the released call-off, and a standalone
// ASN on the value-limit line is refused with a reason. Each bound refuses by
// name, and the quantity-line behaviour (BR-02, BL-71) is unchanged.
//
// Fixtures: `po-028` / `PO-2026-00128` / `li-028a` (sup-003, `FR-WARD-4410`,
// unit price 2,200,000, `valueLimit` 500,000,000), and `co-0020`, the confirmed
// call-off on that line releasing 100 KG.
// ────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService } from './MockCommandService';
import { asnStore } from './stores/asnStore';
import { callOffStore } from './stores/callOffStore';
import { purchaseOrderStore } from './stores/purchaseOrderStore';
/** @import { ASN, CallOff, QueryScope } from '../types' */
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { openValueForLine } from '../../transitions/fulfilmentRules';
import { NO_PERSON } from '@context/noPerson';

const svc = new MockCommandService();

/**
 * @param {string} supplierId
 * @returns {QueryScope}
 */
const supplier = (supplierId) => ({
  personaType: 'supplier',
  supplierId,
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON
});

const sup003 = supplier('sup-003');
const sup007 = supplier('sup-007');

const PO_NUMBER = 'PO-2026-00128';
const MAT = 'FR-WARD-4410';
const CO = 'co-0020';

beforeEach(() => {
  asnStore.reset();
  callOffStore.reset();
  purchaseOrderStore.reset();
});

/** @returns {CallOff} */
const callOff = () => /** @type {CallOff} */ (callOffStore.get(CO));

/** @param {Record<string, unknown>} payload */
const createAsn = (payload) =>
  svc.dispatch(sup003, {
    transitionId: 't_asn_create',
    entity: 'advanceShipNotice',
    payload: { poReference: PO_NUMBER, shipDate: callOff().needDate, ...payload }
  });

/**
 * @param {string} asnNumber
 * @param {Record<string, unknown>} [payload]
 */
const submitAsn = (asnNumber, payload = {}) =>
  svc.dispatch(sup003, {
    transitionId: 't_asn_submit',
    entity: 'advanceShipNotice',
    entityId: asnNumber,
    payload: {
      carrier: 'Sample Courier',
      trackingNumber: 'B 1 XY',
      eta: callOff().needDate,
      sequence: asnNumber.replace(/\D/g, '').slice(-4),
      externalId: `SJ-${asnNumber}`,
      ...payload
    }
  });

/**
 * One line on the value-limit material.
 * @param {number} shippedQty
 */
const lines = (shippedQty) => [
  { materialCode: MAT, shippedQty, batchNumber: 'LOT-1', expiryDate: '2027-06-30' }
];

/** @param {string | undefined} asnNumber */
const stored = (asnNumber) => /** @type {ASN} */ (asnStore.get(String(asnNumber)));

describe('BL-140 · a standalone ASN on the value-limit line is refused by name', () => {
  it('fires on create: VALUE_LIMIT_CALL_OFF_REQUIRED, and nothing is stored', async () => {
    const res = await createAsn({ lines: lines(10) });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(
      /POLICY_REJECTED:asn_lines_within_open:VALUE_LIMIT_CALL_OFF_REQUIRED:/
    );
    expect(res.reason).toContain(MAT);
    // Nothing was drafted on the value-limit PO (the store keeps its fixtures).
    expect(asnStore.all().filter((a) => a.poReference === PO_NUMBER)).toHaveLength(0);
  });

  it('fires on submit: a draft created without a call-off cannot be submitted', async () => {
    // The row action drafts an ASN with no lines; the supplier then enters one.
    const created = await createAsn({});
    expect(created.status).toBe('done');
    const res = await submitAsn(
      /** @type {NonNullable<typeof created.entityId>} */ (created.entityId),
      { lines: lines(10) }
    );
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(
      /POLICY_REJECTED:asn_lines_within_open:VALUE_LIMIT_CALL_OFF_REQUIRED:/
    );
    expect(stored(created.entityId).status).toBe('Draft');
  });
});

describe('BL-140 · raised against the released call-off, the ASN is accepted', () => {
  it('passes: 100 KG on co-0020 is created and submitted', async () => {
    const created = await createAsn({ callOffId: CO, lines: lines(100) });
    expect(created.status).toBe('done');
    const res = await submitAsn(
      /** @type {NonNullable<typeof created.entityId>} */ (created.entityId)
    );
    expect(res.reason).toBeUndefined();
    expect(res.status).toBe('done');
    expect(stored(created.entityId)).toMatchObject({ status: 'Submitted', callOffId: CO });
    expect(stored(created.entityId).lineItems[0]).toMatchObject({
      materialCode: MAT,
      shippedQty: 100
    });
  });

  it('the quantity is bounded by what the call-off released', async () => {
    const res = await createAsn({ callOffId: CO, lines: lines(101) });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/POLICY_REJECTED:asn_lines_within_open:OVER_CALL_OFF_QUANTITY:/);
  });

  it('the value is bounded by what the PO line has left (CR-04)', async () => {
    // Two 100 KG ASNs already carry 440,000,000 of the 500,000,000 limit; a
    // third is inside the call-off's quantity but above the value left.
    expect((await createAsn({ callOffId: CO, lines: lines(100) })).status).toBe('done');
    expect((await createAsn({ callOffId: CO, lines: lines(100) })).status).toBe('done');
    const res = await createAsn({ callOffId: CO, lines: lines(100) });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/POLICY_REJECTED:asn_lines_within_open:OVER_VALUE_LIMIT:/);
    const po = /** @type {import('../types').PurchaseOrder} */ (
      purchaseOrderStore.all().find((p) => p.poNumber === PO_NUMBER)
    );
    // The value axis reads what the other active ASNs shipped, not call-offs.
    expect(openValueForLine(po, po.lineItems[0], asnStore.all())).toBe(60_000_000);
  });
});

describe('BL-140 · the quantity-line behaviour is unchanged (known-good controls)', () => {
  it('a standalone ASN on a PO line that carries a quantity is still accepted', async () => {
    const res = await svc.dispatch(sup007, {
      transitionId: 't_asn_create',
      entity: 'advanceShipNotice',
      payload: {
        poReference: 'PO-2025-00107',
        shipDate: callOff().needDate,
        lines: [{ materialCode: 'PK-PETB-8801', shippedQty: 1000, batchNumber: 'LOT-1' }]
      }
    });
    expect(res.reason).toBeUndefined();
    expect(res.status).toBe('done');
  });

  it('above the open quantity it still refuses as OVER_OPEN_QUANTITY', async () => {
    const res = await svc.dispatch(sup007, {
      transitionId: 't_asn_create',
      entity: 'advanceShipNotice',
      payload: {
        poReference: 'PO-2025-00107',
        shipDate: callOff().needDate,
        lines: [{ materialCode: 'PK-PETB-8801', shippedQty: 300_000, batchNumber: 'LOT-1' }]
      }
    });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/POLICY_REJECTED:asn_lines_within_open:OVER_OPEN_QUANTITY:/);
  });
});
