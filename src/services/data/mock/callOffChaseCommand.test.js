// ────────────────────────────────────────────────────────────────────────────
// AIB-3 (BL-351) — the missing-ASN chase through the REAL command spine and the
// REAL service.
//
// Probed both ways: a Material Planning seat closes a chase with a reason; a
// procurement seat is refused at the ROLE gate; a supplier seat at SCOPE; a
// blank reason at the POLICY gate; a second close at LEGALITY; and a chase that
// no longer exists (covered by an ASN) at NOT_FOUND. Every outcome is audited.
// The read is scoped: a supplier reads only its own call-offs' chases.
// ────────────────────────────────────────────────────────────────────────────

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService, commandAuditSink, WIRED_COMMAND_TARGETS } from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import { callOffStore } from './stores/callOffStore';
import { asnStore } from './stores/asnStore';
import { goodsReceiptStore } from './stores/goodsReceiptStore';
import { callOffChaseStore } from './stores/callOffChaseStore';
/** @import { ASN, CallOff, QueryScope } from '../types' */
import { DataError } from '../types';
import { PERSONA_SYSTEM_ROLES, SYSTEM_ROLES } from '../../transitions/businessRoles';
import { POLICY_HOOKS } from '../../transitions/policyHooks';
import { callOffChaseFlow } from '../../transitions/flows/callOffChase.flow';
import { callOffChaseRows } from '../../transitions/callOffChase';
import { sdcClock } from '../../sdc';
import { NO_PERSON } from '@context/noPerson';

const cmd = new MockCommandService();
const svc = new MockProcurementService();

/**
 * @param {readonly import('../../transitions/businessRoles').SystemRoleId[]} roles
 * @returns {QueryScope}
 */
const seat = (roles) => ({
  personaType: 'buyer',
  supplierId: null,
  businessRoles: roles,
  actor: NO_PERSON
});
const planning = seat(['planning']);
const procurement = seat(['procurement']);
/** @type {QueryScope} */
const supplier = {
  personaType: 'supplier',
  supplierId: 'sup-007',
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON
};

const ID = 'co-chase-t1';

/** A call-off sent six days before the hub's now, confirmed, with no ASN. */
const addChaseCallOff = () =>
  callOffStore.add(
    /** @type {CallOff} */ ({
      id: ID,
      callOffNumber: 'CO-CHASE-0001',
      poId: 'po-007',
      poNumber: 'PO-2025-00107',
      poLineId: 'li-007a',
      supplierId: 'sup-007',
      supplierName: 'PT Sample Packaging',
      materialCode: 'PK-PETB-8801',
      description: 'PET bottle 100 ml',
      uom: 'PCS',
      unitPrice: 100,
      currency: 'IDR',
      quantity: 5000,
      needDate: '2026-10-20',
      type: 'forecast',
      status: 'Confirmed',
      releasedAt: '2026-08-26T02:00:00.000Z',
      confirmation: {
        kind: 'confirm',
        deliveries: [{ quantity: 5000, date: '2026-10-20' }],
        confirmedAt: '2026-08-26T03:00:00.000Z',
        approval: 'auto'
      },
      dispatches: [],
      notes: []
    })
  );

/**
 * @param {number} shippedQty
 * @param {string} [asnNumber]
 * @returns {ASN}
 */
const asnOf = (shippedQty, asnNumber = 'ASN-CHASE-1') => ({
  asnNumber,
  supplierId: 'sup-007',
  poReference: 'PO-2025-00107',
  status: 'Submitted',
  carrier: 'Own truck',
  trackingNumber: 'TRK-CHASE',
  eta: '2026-09-18',
  callOffId: ID,
  details: {
    originCity: 'Bekasi, ID',
    destinationWarehouse: 'Paragon Plant J6',
    totalCartons: 1,
    grossWeightKg: 1,
    temperatureRequirement: 'Ambient'
  },
  lineItems: [
    {
      materialCode: 'PK-PETB-8801',
      description: 'PET bottle 100 ml',
      orderedQty: shippedQty,
      shippedQty,
      lotNumber: 'LOT-CHASE',
      uom: 'PCS'
    }
  ]
});

/**
 * @param {QueryScope} scope
 * @param {string} [closeReason]
 * @param {string} [callOffId]
 */
const closeChase = (scope, closeReason = 'Supplier promised the ASN tomorrow', callOffId = ID) =>
  cmd.dispatch(scope, {
    transitionId: 't_calloffchase_close',
    entity: 'callOffChase',
    entityId: callOffId,
    payload: { closeReason }
  });

/**
 * @param {QueryScope} scope
 * @returns {Promise<readonly import('../../transitions/callOffChase').CallOffChaseRow[]>}
 */
const readChase = async (scope) => (await svc.getCallOffChase(scope)).items;

beforeEach(() => {
  callOffStore.reset();
  asnStore.reset();
  goodsReceiptStore.reset();
  callOffChaseStore.reset();
  commandAuditSink.clear();
});
afterEach(() => {
  callOffStore.reset();
  asnStore.reset();
  goodsReceiptStore.reset();
  callOffChaseStore.reset();
});

describe('AIB-3 — the flow, the target and the atom', () => {
  it('is one Close edge with a required reason and the substance hook', () => {
    expect(callOffChaseFlow.entity).toBe('callOffChase');
    expect(callOffChaseFlow.transitions).toEqual([
      expect.objectContaining({
        id: 't_calloffchase_close',
        from: ['Open'],
        to: 'Closed',
        trigger: 'user',
        requiredRole: 'calloffchase:close',
        requiredFields: ['closeReason'],
        policyHooks: [POLICY_HOOKS.CHASE_CLOSE_REASON_AUTHORED]
      })
    ]);
    expect(WIRED_COMMAND_TARGETS).toContain('callOffChase');
  });

  it('the atom is in the Material Planning bundle and in no supplier lane', () => {
    const holders = Object.entries(SYSTEM_ROLES)
      .filter(([, atoms]) =>
        /** @type {readonly string[]} */ (atoms).includes('calloffchase:close')
      )
      .map(([id]) => id);
    // `buyer_all` and `admin` carry it by derivation (the union of every bundle).
    expect(holders).toContain('planning');
    for (const not of [
      'procurement',
      'finance',
      'supplier',
      'commercial',
      'fulfilment',
      'back_office'
    ])
      expect(holders).not.toContain(not);
  });
});

describe('AIB-3 — the read, scoped', () => {
  it('the planner reads the chase, derived: open, one working day after the send', async () => {
    addChaseCallOff();
    const rows = await readChase(seat(['planning']));
    const row = rows.find((r) => r.callOffId === ID);
    expect(row).toEqual(
      expect.objectContaining({
        callOffNumber: 'CO-CHASE-0001',
        supplierId: 'sup-007',
        state: 'open',
        coverage: 0,
        obligation: 5000,
        dueAt: '2026-08-27T02:00:00.000Z'
      })
    );
  });

  it('a supplier reads only its own call-offs’ chases — another supplier’s row is absent', async () => {
    addChaseCallOff();
    const own = await readChase(supplier);
    expect(own.length).toBeGreaterThan(0);
    expect(own.every((r) => r.supplierId === 'sup-007')).toBe(true);
    expect(own.some((r) => r.callOffId === ID)).toBe(true);
    const other = await readChase({ ...supplier, supplierId: 'sup-002' });
    expect(other.some((r) => r.callOffId === ID)).toBe(false);
    // The planner's read is the superset.
    const planner = await readChase(seat(['planning']));
    for (const r of own) expect(planner.some((p) => p.callOffId === r.callOffId)).toBe(true);
  });

  it('a partial ASN keeps the chase open; an ASN that covers it clears the line', async () => {
    addChaseCallOff();
    asnStore.add(asnOf(2000));
    let row = (await readChase(seat(['planning']))).find((r) => r.callOffId === ID);
    expect(row?.state).toBe('open');
    expect(row?.coverage).toBe(2000);
    asnStore.add(asnOf(3000, 'ASN-CHASE-2'));
    row = (await readChase(seat(['planning']))).find((r) => r.callOffId === ID);
    expect(row?.state).toBe('covered');
  });
});

describe('AIB-3 — closing the chase', () => {
  it('the planner closes it with a reason: the row closes, is audited, and leaves the open list', async () => {
    addChaseCallOff();
    const res = await closeChase(planning);
    expect(res.status, res.reason).toBe('done');
    expect(callOffChaseStore.all()).toEqual([
      expect.objectContaining({
        callOffId: ID,
        reason: 'Supplier promised the ASN tomorrow',
        closedAt: sdcClock.now(),
        closedBy: NO_PERSON
      })
    ]);
    const rows = await readChase(seat(['planning']));
    expect(rows.find((r) => r.callOffId === ID)?.state).toBe('closed');
    expect(rows.filter((r) => r.state === 'open').some((r) => r.callOffId === ID)).toBe(false);
    expect(
      commandAuditSink.byEvent('t_calloffchase_close').filter((e) => e.outcome === 'done')
    ).toHaveLength(1);
  });

  it('a second close is refused at LEGALITY — the chase fires once', async () => {
    addChaseCallOff();
    expect((await closeChase(planning)).status).toBe('done');
    const second = await closeChase(planning, 'Again');
    expect(second.status).toBe('failed');
    expect(callOffChaseStore.all()).toHaveLength(1);
  });

  it('a blank reason is refused at the POLICY gate and nothing is stored', async () => {
    addChaseCallOff();
    const res = await closeChase(planning, '   ');
    expect(res.status).toBe('failed');
    expect(res.reason).toContain(POLICY_HOOKS.CHASE_CLOSE_REASON_AUTHORED);
    expect(res.reason).toContain('blank');
    expect(callOffChaseStore.all()).toEqual([]);
  });

  it('a seat without calloffchase:close is refused at the ROLE gate — the supplier too', async () => {
    addChaseCallOff();
    const role = await closeChase(procurement);
    expect(role.status).toBe('failed');
    expect(role.reason).toContain('ROLE_NOT_PERMITTED');
    // The target names the supplier, so scope passes and the atom is what refuses.
    const sup = await closeChase(supplier);
    expect(sup.status).toBe('failed');
    expect(sup.reason).toContain('ROLE_NOT_PERMITTED');
    expect(callOffChaseStore.all()).toEqual([]);
  });

  it('a chase the ASNs already cover, or one that has not fired, is NOT_FOUND — there is nothing to close', async () => {
    addChaseCallOff();
    asnStore.add(asnOf(5000));
    await expect(closeChase(planning)).rejects.toBeInstanceOf(DataError);
    // A call-off sent today has no chase yet.
    const fresh = {
      .../** @type {CallOff} */ (callOffStore.get(ID)),
      id: 'co-chase-t2',
      releasedAt: sdcClock.now()
    };
    callOffStore.add(fresh);
    await expect(closeChase(planning, 'Too early', 'co-chase-t2')).rejects.toBeInstanceOf(
      DataError
    );
    expect(callOffChaseStore.all()).toEqual([]);
  });

  it('a fully received delivery leaves no chase to close', async () => {
    addChaseCallOff();
    goodsReceiptStore.add({
      id: 'gr-chase-1',
      grNumber: 'GR-CHASE-1',
      asnId: '',
      asnNumber: '',
      poNumber: 'PO-2025-00107',
      supplierId: 'sup-007',
      supplierName: 'PT Sample Packaging',
      receivedDate: '2026-10-20',
      receivedBy: 'Warehouse Supervisor',
      status: 'Posted to SAP',
      inspectionResults: [
        {
          materialCode: 'PK-PETB-8801',
          description: 'PET bottle 100 ml',
          qtyExpected: 5000,
          qtyReceived: 5000,
          qtyAccepted: 5000,
          qtyRejected: 0,
          visualCheck: 'Pass',
          packagingCheck: 'Pass'
        }
      ],
      disposition: 'Accept'
    });
    const rows = await readChase(seat(['planning']));
    expect(rows.some((r) => r.callOffId === ID)).toBe(false);
    await expect(closeChase(planning)).rejects.toBeInstanceOf(DataError);
  });
});

describe('AIB-3 — the derivation agrees with the service read', () => {
  it('the service returns exactly the pure module’s rows for the same stores', async () => {
    addChaseCallOff();
    const pure = callOffChaseRows(
      callOffStore.all(),
      asnStore.all(),
      goodsReceiptStore.all(),
      callOffChaseStore.all(),
      sdcClock.now()
    );
    expect(await readChase(seat(['planning']))).toEqual(pure);
  });
});
