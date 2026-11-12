// ────────────────────────────────────────────────────────────────────────────
// PEX-12 [Proposed] — the recommended action on a PO On Hold line and the PO
// cancellation request, through the REAL MockCommandService and read back
// through the REAL procurement service.
// ────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService, commandAuditSink } from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import { poOnHoldStore } from './stores/poOnHoldStore';
import { poCancellationStore } from './stores/poCancellationStore';
import { osipParamStore } from './stores/osipParamStore';
import { callOffStore } from './stores/callOffStore';
import { purchaseOrderStore } from './stores/purchaseOrderStore';
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { sdcClock } from '../../sdc';
import { NO_PERSON } from '@context/noPerson';

const svc = new MockCommandService();
const reads = new MockProcurementService();

/** @type {import('../types').QueryScope} */
const planner = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['planning'],
  actor: NO_PERSON
};
/** @param {string} supplierId @returns {import('../types').QueryScope} */
const supplierSeat = (supplierId) => ({
  personaType: 'supplier',
  supplierId,
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON
});

/** A dispatch is refused when it resolves "failed" or throws (SCOPE_DENIED, NOT_FOUND). @param {Promise<{ status: string }>} p */
const isRefused = (p) =>
  p.then(
    (r) => r.status === 'failed',
    () => true
  );

const NO_DEMAND = { supplierId: 'sup-002', materialCode: 'RM-MYRST-7310' };
const key = `${NO_DEMAND.supplierId}|${NO_DEMAND.materialCode}`;
const line = async (/** @type {import('../types').QueryScope} */ scope = planner) =>
  (await reads.getPoOnHold(scope)).items.find((r) => r.key === key);
/** @param {string} id @param {number | null} value */
const setClass = (id, value) =>
  svc.dispatch(planner, {
    transitionId: 't_osipparam_set',
    entity: 'osipParam',
    entityId: id,
    payload: { osipParamValue: value }
  });
/** @param {Record<string, unknown>} payload @param {import('../types').QueryScope} [scope] */
const request = (payload, scope = planner) =>
  svc.dispatch(scope, { transitionId: 't_pocancel_request', entity: 'poCancellation', payload });
/** @param {string} id @param {import('../types').QueryScope} scope */
const acknowledge = (id, scope) =>
  svc.dispatch(scope, {
    transitionId: 't_pocancel_acknowledge',
    entity: 'poCancellation',
    entityId: id,
    payload: {}
  });

beforeEach(() => {
  poOnHoldStore.reset();
  poCancellationStore.reset();
  callOffStore.reset();
  osipParamStore.reset();
  commandAuditSink.clear();
  sdcClock.reset();
});

describe('the recommended action', () => {
  it('with no threshold set it reads "manual: no threshold set" and changes nothing', async () => {
    const r = await line();
    expect(r?.recommendation).toEqual({ action: 'manual', reason: 'noThreshold', sharePct: null });
    expect(r?.thresholds).toEqual({ absorbMaxPct: null, carryMaxPct: null });
    expect(poOnHoldStore.all()).toHaveLength(0);
    expect(poOnHoldStore.executions()).toHaveLength(0);
  });

  it('a planner sets a class threshold; the recommendation follows but nothing executes', async () => {
    const cls = (await line())?.materialClass;
    expect(cls).toMatch(/^MG-/);
    const set = await setClass(`autoCarryMaxPct|${cls}`, 100);
    expect(set.status).not.toBe('failed');
    const r = await line();
    expect(r?.thresholds.carryMaxPct).toBe(100);
    // No demand at all: fsSpread does not hold, so the line stays manual with the reason.
    expect(r?.recommendation.action).toBe('manual');
    expect(r?.recommendation.reason).toBe('conditionsNotMet');
    expect(poOnHoldStore.executions()).toHaveLength(0);
    expect(callOffStore.all().some((c) => c.origin === 'poOnHold')).toBe(false);
  });

  it('refuses an unknown class and an out-of-range value, and a supplier seat cannot set one', async () => {
    expect(await isRefused(setClass('autoAbsorbMaxPct|MG-NOPE', 10))).toBe(true);
    expect(await isRefused(setClass('autoAbsorbMaxPct|MG-03', 101))).toBe(true);
    const sup = await isRefused(
      svc.dispatch(supplierSeat('sup-002'), {
        transitionId: 't_osipparam_set',
        entity: 'osipParam',
        entityId: 'autoAbsorbMaxPct|MG-03',
        payload: { osipParamValue: 10 }
      })
    );
    expect(sup).toBe(true);
  });
});

describe('PO cancellation request', () => {
  it('the planner requests, the supplier acknowledges; both are on the ledger with actor; the PO is untouched', async () => {
    const r = await line();
    const po = r?.cancellations[0];
    expect(po).toBeTruthy();
    const before = purchaseOrderStore.get(po?.poId ?? '')?.status;
    const made = await request({
      supplierId: 'sup-002',
      poId: po?.poId,
      reason: 'Demand dropped for good'
    });
    expect(made.status).not.toBe('failed');
    const row = poCancellationStore.all()[0];
    expect(row).toMatchObject({ state: 'Requested', poId: po?.poId });
    expect(row.history[0]).toMatchObject({ kind: 'requested', reason: 'Demand dropped for good' });
    expect(row.history[0].actor).toBeTruthy();

    // Another supplier cannot acknowledge it.
    expect(await isRefused(acknowledge(row.id, supplierSeat('sup-003')))).toBe(true);
    // The planner cannot acknowledge it either.
    expect(await isRefused(acknowledge(row.id, planner))).toBe(true);
    expect(await isRefused(acknowledge(row.id, supplierSeat('sup-002')))).toBe(false);
    expect(poCancellationStore.get(row.id)?.state).toBe('Acknowledged');
    expect(poCancellationStore.get(row.id)?.history.map((h) => h.kind)).toEqual([
      'requested',
      'acknowledged'
    ]);
    // Nothing else moved: no Cancelled status, status unchanged.
    expect(purchaseOrderStore.get(po?.poId ?? '')?.status).toBe(before);
    const read = await line();
    expect(read?.cancellations[0].request?.state).toBe('Acknowledged');
  });

  it('refuses a missing reason, another supplier’s PO, a second open request, and a supplier requesting', async () => {
    const poId = (await line())?.cancellations[0].poId;
    const ok = 'Long enough reason';
    expect(await isRefused(request({ supplierId: 'sup-002', poId, reason: 'short' }))).toBe(true);
    expect(await isRefused(request({ supplierId: 'sup-003', poId, reason: ok }))).toBe(true);
    expect(await isRefused(request({ supplierId: 'sup-002', poId, reason: ok }))).toBe(false);
    expect(await isRefused(request({ supplierId: 'sup-002', poId, reason: ok }))).toBe(true);
    expect(
      await isRefused(request({ supplierId: 'sup-002', poId, reason: ok }, supplierSeat('sup-002')))
    ).toBe(true);
  });
});
