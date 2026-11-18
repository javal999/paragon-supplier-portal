// ────────────────────────────────────────────────────────────────────────────
// MR-6 BR-05 to BR-09 — the shelf-life rule on an ASN and the exception Quality
// decides, dispatched through the REAL MockCommandService against the real
// stores (AC-03, AC-04, edge cases 1 and 3).
// ────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';

import { MockCommandService } from './MockCommandService';
import { purchaseOrderStore } from './stores/purchaseOrderStore';
import { asnStore } from './stores/asnStore';
import { materialOverlayStore } from './stores/materialOverlayStore';
/** @import { QueryScope } from '../types' */
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { approvedShelfLifeLines, shelfLifeExceptionOf } from '../../transitions/fulfilmentRules';
import { inTransitItems } from '../../transitions/inventoryRules';
import { NO_PERSON } from '@context/noPerson';
import { openLinesFor, readLines } from '@pages-v2/shipments/asnLines';

const svc = new MockCommandService();

/** @type {QueryScope} */
const sup007 = {
  personaType: 'supplier',
  supplierId: 'sup-007',
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON
};
/**
 * @param {...string} roles
 * @returns {QueryScope}
 */
const seat = (...roles) => ({
  personaType: 'buyer',
  supplierId: null,
  businessRoles: roles,
  actor: NO_PERSON
});
const quality = seat('compliance');
const planner = seat('planning');

// PO-2025-00107 (po-007) — sup-007, Confirmed, one line PK-PETB-8801 × 200,000.
// PK-PETB-8801 is packaging with no minimum in the master, so it is not checked
// by default (owner ruling 2026-09-29); an administrator switches it on.
const PO = 'PO-2025-00107';
const MAT = 'PK-PETB-8801';
const ETA = '2026-10-15';
const SUBMIT = {
  carrier: 'Sample Courier',
  trackingNumber: 'B 1234 XY',
  eta: ETA,
  shipDate: '2026-10-10',
  // AIB-1 BR-03 / BR-04 (BL-348) — a unique sequence and the Surat Jalan.
  sequence: '32',
  externalId: 'SJ-TEST-32'
};
// ETA + 5 months: short of the default 6. ETA + 6 months exactly: passes (edge case 3).
const SHORT = '2027-03-15';
const EXACT = '2027-04-15';

const shelfLifeOn = () =>
  materialOverlayStore.append({
    materialCode: MAT,
    shelfLifeRelevant: true,
    setAt: '2026-09-29T00:00:00.000Z',
    setBy: 'test'
  });

/** @param {string} [expiryDate] */
const createAsn = (expiryDate) =>
  svc.dispatch(sup007, {
    transitionId: 't_asn_create',
    entity: 'advanceShipNotice',
    payload: {
      poReference: PO,
      lines: [
        {
          materialCode: MAT,
          shippedQty: 1_000,
          batchNumber: 'PET-S1',
          ...(expiryDate ? { expiryDate } : {})
        }
      ]
    }
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
    payload: {
      ...SUBMIT,
      // AIB-1 BR-03 / BR-04 (BL-348) — per-ASN so two submits never collide.
      sequence: entityId.replace(/\D/g, '').slice(-4),
      externalId: `SJ-${entityId}`,
      ...payload
    }
  });
/** @param {string} entityId */
const requestException = (entityId, reason = 'Only batch available before the Ramadan run') =>
  svc.dispatch(sup007, {
    transitionId: 't_asn_request_exception',
    entity: 'advanceShipNotice',
    entityId,
    payload: {
      ...SUBMIT,
      sequence: entityId.replace(/\D/g, '').slice(-4),
      externalId: `SJ-${entityId}`,
      reason
    }
  });
/**
 * @param {QueryScope} scope
 * @param {string} entityId
 */
const approve = (scope, entityId) =>
  svc.dispatch(scope, {
    transitionId: 't_asn_approve_exception',
    entity: 'advanceShipNotice',
    entityId,
    payload: {}
  });
/**
 * @param {string} entityId
 * @param {string} reason
 */
const reject = (entityId, reason) =>
  svc.dispatch(quality, {
    transitionId: 't_asn_reject_exception',
    entity: 'advanceShipNotice',
    entityId,
    payload: { reason }
  });
/**
 * @param {string} entityId
 * @param {string} eta
 */
const changeEta = (entityId, eta) =>
  svc.dispatch(sup007, {
    transitionId: 't_asn_change_eta',
    entity: 'advanceShipNotice',
    entityId,
    payload: { eta }
  });

const inTransitQty = () =>
  inTransitItems('sup-007', MAT, asnStore.all(), [])
    .filter((i) => i.source !== 'production')
    .reduce((s, i) => s + i.quantity, 0);

beforeEach(() => {
  purchaseOrderStore.reset();
  asnStore.reset();
  materialOverlayStore.reset();
});

describe('the rule at submission (MR-6 BR-05 to BR-07)', () => {
  it('AC-03 — a packaging line with shelfLifeRelevant and expiry 5 months after ETA is refused BY THE VERB', async () => {
    shelfLifeOn();
    const draft = /** @type {NonNullable<(Awaited<ReturnType<typeof createAsn>>)['entityId']>} */ (
      (await createAsn(SHORT)).entityId
    );
    const res = await submitAsn(draft);
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(
      /POLICY_REJECTED:asn_submit_complete:SHELF_LIFE: line 1 \(PK-PETB-8801\)/
    );
    expect(/** @type {import('../types').ASN} */ (asnStore.get(draft)).status).toBe('Draft');
  });

  it('edge case 3 — expiry exactly ETA + 6 months passes', async () => {
    shelfLifeOn();
    const draft = /** @type {NonNullable<(Awaited<ReturnType<typeof createAsn>>)['entityId']>} */ (
      (await createAsn(EXACT)).entityId
    );
    expect((await submitAsn(draft)).status).toBe('done');
    expect(/** @type {import('../types').ASN} */ (asnStore.get(draft)).status).toBe('Submitted');
  });

  it('`expiryRequired` fires for a shelf-life material without expiry, and passes once one is given', async () => {
    shelfLifeOn();
    const draft = /** @type {NonNullable<(Awaited<ReturnType<typeof createAsn>>)['entityId']>} */ (
      (await createAsn()).entityId
    );
    const res = await submitAsn(draft);
    expect(res.reason).toMatch(/INCOMPLETE_ASN: expiry date missing on line 1/);
    expect(
      (
        await submitAsn(draft, {
          lines: [
            { materialCode: MAT, shippedQty: 1_000, batchNumber: 'PET-S1', expiryDate: EXACT }
          ]
        })
      ).status
    ).toBe('done');
  });

  it('a material with shelfLifeRelevant false needs no expiry, and a short one does not block', async () => {
    // Known state: the default for this packaging is off.
    const noExpiry =
      /** @type {NonNullable<(Awaited<ReturnType<typeof createAsn>>)['entityId']>} */ (
        (await createAsn()).entityId
      );
    expect((await submitAsn(noExpiry)).status).toBe('done');
    const short = /** @type {NonNullable<(Awaited<ReturnType<typeof createAsn>>)['entityId']>} */ (
      (await createAsn(SHORT)).entityId
    );
    expect((await submitAsn(short)).status).toBe('done');
  });

  it('the form reads the same rule: short → only shelf life is wrong, and the note has months left', () => {
    shelfLifeOn();
    const po = /** @type {import('../types').PurchaseOrder} */ (purchaseOrderStore.get('po-007'));
    const read = readLines(
      { [MAT]: { qty: '1000', batch: 'PET-S1', expiry: SHORT, batchSource: 'typed' } },
      openLinesFor(po, asnStore.all()),
      { po, asns: asnStore.all(), eta: ETA, overShipReason: '', batches: {} }
    );
    expect(read.lines[0].refusal).toBe('shelfLife');
    expect(read.complete).toBe(false);
    expect(read.onlyShelfLife).toBe(true);
    expect(read.lines[0].shelfLife).toMatchObject({ minMonths: 6, monthsLeft: 5, ok: false });
  });
});

describe('the exception (MR-6 BR-08, BR-09)', () => {
  it('AC-04 — request, then approve: Awaiting exception does not count in transit; Submitted does', async () => {
    shelfLifeOn();
    const draft = /** @type {NonNullable<(Awaited<ReturnType<typeof createAsn>>)['entityId']>} */ (
      (await createAsn(SHORT)).entityId
    );
    const req = await requestException(draft);
    expect(req.status).toBe('done');
    expect(/** @type {import('../types').ASN} */ (asnStore.get(draft)).status).toBe(
      'Awaiting exception'
    );
    expect(inTransitQty()).toBe(0);

    const ok = await approve(quality, draft);
    expect(ok.status).toBe('done');
    const asn = /** @type {import('../types').ASN} */ (asnStore.get(draft));
    expect(asn.status).toBe('Submitted');
    expect(inTransitQty()).toBe(1_000);
    // BR-09 — recorded on the ASN, request then decision, with who and when.
    expect(
      /** @type {NonNullable<typeof asn.shelfLifeException>} */ (asn.shelfLifeException).map(
        (e) => e.kind
      )
    ).toEqual(['requested', 'approved']);
    expect(
      /** @type {NonNullable<typeof asn.shelfLifeException>} */ (asn.shelfLifeException)[0]
    ).toMatchObject({
      reason: 'Only batch available before the Ramadan run',
      eta: ETA,
      by: NO_PERSON,
      lines: [{ materialCode: MAT, lotNumber: 'PET-S1', expiryDate: SHORT, minMonths: 6 }]
    });
    expect(
      typeof (
        /** @type {NonNullable<typeof asn.shelfLifeException>} */ (asn.shelfLifeException)[1].at
      )
    ).toBe('string');
    // The receipt marker's source: the approved lines go to blocked stock.
    expect(approvedShelfLifeLines(asn).map((l) => l.materialCode)).toEqual([MAT]);
  });

  it('a request is refused when shelf life is not the one thing wrong (no short line), and without a reason', async () => {
    shelfLifeOn();
    const fine = /** @type {NonNullable<(Awaited<ReturnType<typeof createAsn>>)['entityId']>} */ (
      (await createAsn(EXACT)).entityId
    );
    expect((await requestException(fine)).reason).toMatch(/SHELF_LIFE_MET/);
    const short = /** @type {NonNullable<(Awaited<ReturnType<typeof createAsn>>)['entityId']>} */ (
      (await createAsn(SHORT)).entityId
    );
    expect((await requestException(short, '   ')).reason).toMatch(/REASON_REQUIRED|MISSING_FIELDS/);
    // Known-good twin: the same short draft with a reason is accepted.
    expect((await requestException(short)).status).toBe('done');
  });

  it('a planning seat cannot approve; a compliance seat can', async () => {
    shelfLifeOn();
    const draft = /** @type {NonNullable<(Awaited<ReturnType<typeof createAsn>>)['entityId']>} */ (
      (await createAsn(SHORT)).entityId
    );
    await requestException(draft);
    const refused = await approve(planner, draft);
    expect(refused.status).toBe('failed');
    expect(refused.reason).toMatch(/ROLE_NOT_PERMITTED:asn:approve-shelf-life/);
    expect(/** @type {import('../types').ASN} */ (asnStore.get(draft)).status).toBe(
      'Awaiting exception'
    );
    expect((await approve(quality, draft)).status).toBe('done');
  });

  it('the supplier cannot approve its own exception', async () => {
    shelfLifeOn();
    const draft = /** @type {NonNullable<(Awaited<ReturnType<typeof createAsn>>)['entityId']>} */ (
      (await createAsn(SHORT)).entityId
    );
    await requestException(draft);
    expect((await approve(sup007, draft)).status).toBe('failed');
  });

  it('reject returns it to Draft with the reason, and it still cannot be submitted', async () => {
    shelfLifeOn();
    const draft = /** @type {NonNullable<(Awaited<ReturnType<typeof createAsn>>)['entityId']>} */ (
      (await createAsn(SHORT)).entityId
    );
    await requestException(draft);
    expect((await reject(draft, '  ')).status).toBe('failed');
    const res = await reject(draft, 'Five months is too short for this SKU');
    expect(res.status).toBe('done');
    const asn = /** @type {import('../types').ASN} */ (asnStore.get(draft));
    expect(asn.status).toBe('Draft');
    const view = /** @type {import('../../transitions/fulfilmentRules').ShelfLifeExceptionView} */ (
      shelfLifeExceptionOf(asn)
    );
    expect(view.state).toBe('rejected');
    expect(view.decision).toMatchObject({
      kind: 'rejected',
      reason: 'Five months is too short for this SKU'
    });
    expect(approvedShelfLifeLines(asn)).toEqual([]);
    expect((await submitAsn(draft)).reason).toMatch(/SHELF_LIFE/);
  });

  it('an ASN awaiting an exception can be cancelled', async () => {
    shelfLifeOn();
    const draft = /** @type {NonNullable<(Awaited<ReturnType<typeof createAsn>>)['entityId']>} */ (
      (await createAsn(SHORT)).entityId
    );
    await requestException(draft);
    const res = await svc.dispatch(sup007, {
      transitionId: 't_asn_cancel',
      entity: 'advanceShipNotice',
      entityId: draft
    });
    expect(res.status).toBe('done');
    expect(/** @type {import('../types').ASN} */ (asnStore.get(draft)).status).toBe('Cancelled');
  });
});

describe('edge case 1 — the ETA changes after approval', () => {
  const approved = async () => {
    shelfLifeOn();
    const draft = /** @type {NonNullable<(Awaited<ReturnType<typeof createAsn>>)['entityId']>} */ (
      (await createAsn(SHORT)).entityId
    );
    await requestException(draft);
    await approve(quality, draft);
    return draft;
  };

  it('a later ETA returns it to Awaiting exception, and the earlier approval stays in the record', async () => {
    const id = await approved();
    const res = await changeEta(id, '2026-10-25');
    expect(res.status).toBe('done');
    const asn = /** @type {import('../types').ASN} */ (asnStore.get(id));
    expect(asn.status).toBe('Awaiting exception');
    expect(asn.eta).toBe('2026-10-25');
    expect(
      /** @type {NonNullable<typeof asn.shelfLifeException>} */ (asn.shelfLifeException).map(
        (e) => e.kind
      )
    ).toEqual(['requested', 'approved', 'etaChanged']);
    expect(
      /** @type {NonNullable<typeof asn.shelfLifeException>} */ (asn.shelfLifeException)[2]
    ).toMatchObject({ previousEta: ETA, eta: '2026-10-25' });
    expect(
      /** @type {import('../../transitions/fulfilmentRules').ShelfLifeExceptionView} */ (
        shelfLifeExceptionOf(asn)
      ).state
    ).toBe('pending');
    expect(inTransitQty()).toBe(0);
    // Quality decides again at the new ETA.
    expect((await approve(quality, id)).status).toBe('done');
    expect(/** @type {import('../types').ASN} */ (asnStore.get(id)).status).toBe('Submitted');
  });

  it('an ETA not later than the approved one needs no new decision, so the verb refuses it', async () => {
    const id = await approved();
    expect((await changeEta(id, '2026-10-12')).reason).toMatch(/ETA_NEEDS_NO_REAPPROVAL/);
    expect(/** @type {import('../types').ASN} */ (asnStore.get(id)).status).toBe('Submitted');
  });
});
