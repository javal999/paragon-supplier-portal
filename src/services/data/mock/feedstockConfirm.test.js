// ────────────────────────────────────────────────────────────────────────────
// BL-194 · the supplier's feedstock confirmation (DRC-8 BR-a, BR-c; DRC-D17),
// dispatched through the REAL MockCommandService and read back through the
// REAL procurement service.
//
//   · the verb: the supplier's own assigned material passes; another
//     supplier, an unassigned material and a future date are refused; 0 is
//     allowed; every outcome is in the DR-10 audit trail.
//   · the latest record is in force, and every record stays on file.
//   · MoM 2B / MR-7 BR-01: a confirmation never changes supplier SOH, the
//     stock simulation's "supplier available" or "free to call off".
// ────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService, commandAuditSink } from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import { feedstockConfirmationStore } from './stores/feedstockConfirmationStore';
import { inventoryDeclarationStore } from './stores/inventoryDeclarationStore';
import { isAssignedMaterial } from './inventoryReadModel';
import { feedstockInForce } from './feedstockConfirmationReadModel';
/** @import { QueryScope } from '../types' */
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { addDays, dayOf } from '../../transitions/inventoryRules';
import { sdcClock } from '../../sdc';
import { NO_PERSON } from '@context/noPerson';

const svc = new MockCommandService();
const reads = new MockProcurementService();

/** @type {QueryScope} */
const planner = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['planning'],
  actor: NO_PERSON
};
/**
 * @param {string} supplierId
 * @returns {QueryScope}
 */
const supplierSeat = (supplierId) => ({
  personaType: 'supplier',
  supplierId,
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON
});
const sup7 = supplierSeat('sup-007');
const sup2 = supplierSeat('sup-002');

const today = () => dayOf(sdcClock.now());

/**
 * @param {Record<string, unknown>} payload
 * @param {QueryScope} [scope]
 */
const confirm = (payload, scope = sup7) =>
  svc.dispatch(scope, {
    transitionId: 't_feedstock_confirm',
    entity: 'feedstockConfirmation',
    payload
  });

beforeEach(() => {
  feedstockConfirmationStore.reset();
  inventoryDeclarationStore.reset();
  commandAuditSink.clear();
  sdcClock.reset();
});

describe('the fixture cases this file rests on (population control)', () => {
  it('PK-PETB-8801 is assigned to sup-007 and RM-EMUL-3310 is not; RM-EMUL-3310 is assigned to sup-002', () => {
    expect(isAssignedMaterial('sup-007', 'PK-PETB-8801')).toBe(true);
    expect(isAssignedMaterial('sup-007', 'RM-EMUL-3310')).toBe(false);
    expect(isAssignedMaterial('sup-002', 'RM-EMUL-3310')).toBe(true);
    expect(feedstockConfirmationStore.all()).toEqual([]);
  });
});

describe('t_feedstock_confirm (supplier)', () => {
  it('passes for its own assigned material, with the unit from the master and the session actor', async () => {
    const r = await confirm({
      supplierId: 'sup-007',
      materialCode: 'PK-PETB-8801',
      feedstockQty: 1250,
      confirmedOn: today(),
      note: '  resin lot at the plant  '
    });
    expect(r.status, r.reason).toBe('done');
    const row = feedstockConfirmationStore.get(/** @type {string} */ (r.entityId));
    expect(row).toMatchObject({
      supplierId: 'sup-007',
      materialCode: 'PK-PETB-8801',
      feedstockQty: 1250,
      confirmedOn: today(),
      note: 'resin lot at the plant',
      recordedAt: sdcClock.now(),
      recordedBy: NO_PERSON
    });
    expect(row?.uom).not.toBe('');
  });

  it('0 is allowed (BR-a)', async () => {
    const r = await confirm({
      supplierId: 'sup-007',
      materialCode: 'PK-PETB-8801',
      feedstockQty: 0,
      confirmedOn: today()
    });
    expect(r.status, r.reason).toBe('done');
    expect(feedstockInForce('sup-007', 'PK-PETB-8801')?.feedstockQty).toBe(0);
  });

  it('a supplier cannot confirm for another supplier (scope), and nothing is stored', async () => {
    await expect(
      confirm({
        supplierId: 'sup-002',
        materialCode: 'RM-EMUL-3310',
        feedstockQty: 10,
        confirmedOn: today()
      })
    ).rejects.toMatchObject({ code: 'SCOPE_DENIED' });
    expect(feedstockConfirmationStore.all()).toEqual([]);
  });

  it('a material not assigned to the supplier is refused NOT_ASSIGNED', async () => {
    const r = await confirm({
      supplierId: 'sup-007',
      materialCode: 'RM-EMUL-3310',
      feedstockQty: 10,
      confirmedOn: today()
    });
    expect(r.status).toBe('failed');
    expect(r.reason).toBe('POLICY_REJECTED:feedstock_confirmation_valid:NOT_ASSIGNED');
    expect(feedstockConfirmationStore.all()).toEqual([]);
  });

  it('a future confirmation date is refused DATE_IN_FUTURE; today passes', async () => {
    const r = await confirm({
      supplierId: 'sup-007',
      materialCode: 'PK-PETB-8801',
      feedstockQty: 10,
      confirmedOn: addDays(today(), 1)
    });
    expect(r.status).toBe('failed');
    expect(r.reason).toBe('POLICY_REJECTED:feedstock_confirmation_valid:DATE_IN_FUTURE');
    expect(feedstockConfirmationStore.all()).toEqual([]);
  });

  it('a missing date is refused before the policy (required field)', async () => {
    const r = await confirm({
      supplierId: 'sup-007',
      materialCode: 'PK-PETB-8801',
      feedstockQty: 10
    });
    expect(r.status).toBe('failed');
    expect(r.reason).toContain('MISSING_FIELDS');
    expect(r.reason).toContain('confirmedOn');
  });

  it('a negative quantity is refused QTY_INVALID', async () => {
    const r = await confirm({
      supplierId: 'sup-007',
      materialCode: 'PK-PETB-8801',
      feedstockQty: -5,
      confirmedOn: today()
    });
    expect(r.reason).toBe('POLICY_REJECTED:feedstock_confirmation_valid:QTY_INVALID');
  });

  it('PTI holds no feedstock:confirm atom: a planner is refused at the role gate', async () => {
    const r = await confirm(
      {
        supplierId: 'sup-007',
        materialCode: 'PK-PETB-8801',
        feedstockQty: 1,
        confirmedOn: today()
      },
      planner
    );
    expect(r.status).toBe('failed');
    expect(r.reason?.split(':')[0]).toBe('ROLE_NOT_PERMITTED');
    expect(feedstockConfirmationStore.all()).toEqual([]);
  });

  it('every outcome is written to the audit trail: the accepted one and the refused one', async () => {
    await confirm({
      supplierId: 'sup-007',
      materialCode: 'PK-PETB-8801',
      feedstockQty: 3,
      confirmedOn: today()
    });
    await confirm({
      supplierId: 'sup-007',
      materialCode: 'PK-PETB-8801',
      feedstockQty: 3,
      confirmedOn: addDays(today(), 2)
    });
    const events = commandAuditSink.byEvent('t_feedstock_confirm');
    expect(events.map((e) => e.outcome)).toEqual(['done', 'failed']);
    expect(events[0]?.actor).toBe('supplier:sup-007');
    expect(events[1]?.reason).toBe('POLICY_REJECTED:feedstock_confirmation_valid:DATE_IN_FUTURE');
  });
});

describe('BR-a · append-only; the latest record is in force', () => {
  it('a second confirmation supersedes the first at read; both stay on record', async () => {
    await confirm({
      supplierId: 'sup-007',
      materialCode: 'PK-PETB-8801',
      feedstockQty: 100,
      confirmedOn: addDays(today(), -3)
    });
    sdcClock.set(new Date(Date.parse(sdcClock.now()) + 3_600_000).toISOString());
    await confirm({
      supplierId: 'sup-007',
      materialCode: 'PK-PETB-8801',
      feedstockQty: 80,
      confirmedOn: addDays(today(), -5)
    });
    expect(feedstockConfirmationStore.all()).toHaveLength(2);
    // The latest RECORDED wins, even with an earlier confirmation date.
    expect(feedstockInForce('sup-007', 'PK-PETB-8801')?.feedstockQty).toBe(80);
    const row = (await reads.getInventory(sup7)).items.find(
      (p) => p.materialCode === 'PK-PETB-8801'
    );
    expect(row?.feedstock?.feedstockQty).toBe(80);
  });

  it('a supplier reads its own feedstock only; PTI reads every supplier’s', async () => {
    await confirm({
      supplierId: 'sup-007',
      materialCode: 'PK-PETB-8801',
      feedstockQty: 9,
      confirmedOn: today()
    });
    const own = (await reads.getInventory(sup2)).items;
    expect(own.some((p) => p.feedstock !== undefined)).toBe(false);
    const pti = (await reads.getInventory(planner)).items.find(
      (p) => p.supplierId === 'sup-007' && p.materialCode === 'PK-PETB-8801'
    );
    expect(pti?.feedstock?.feedstockQty).toBe(9);
  });
});

describe('BR-c (MoM 2B, MR-7 BR-01) · feedstock is not stock', () => {
  it('supplier SOH is unchanged by a confirmation, for the supplier and for PTI', async () => {
    const sohOf = async (/** @type {QueryScope} */ scope) =>
      (await reads.getInventory(scope)).items.find(
        (p) => p.supplierId === 'sup-007' && p.materialCode === 'PK-PETB-8801'
      )?.supplierSoh;
    const before = [await sohOf(sup7), await sohOf(planner)];
    const declarations = inventoryDeclarationStore.all().length;
    await confirm({
      supplierId: 'sup-007',
      materialCode: 'PK-PETB-8801',
      feedstockQty: 999_999,
      confirmedOn: today()
    });
    expect([await sohOf(sup7), await sohOf(planner)]).toEqual(before);
    // No stock declaration was written.
    expect(inventoryDeclarationStore.all()).toHaveLength(declarations);
  });

  it('the stock simulation’s available and free-to-call-off figures are unchanged', async () => {
    const sim = async () =>
      (await reads.getStockSimulation(planner)).items.find(
        (r) => r.supplierId === 'sup-002' && r.materialCode === 'RM-EMUL-3310'
      )?.simulation;
    const before = await sim();
    // Control: the figure is a real number, so "unchanged" is not vacuous.
    expect(before?.available).toBe(4000);
    const r = await confirm(
      {
        supplierId: 'sup-002',
        materialCode: 'RM-EMUL-3310',
        feedstockQty: 50_000,
        confirmedOn: today()
      },
      sup2
    );
    expect(r.status, r.reason).toBe('done');
    const after = await sim();
    expect(after?.available).toBe(before?.available);
    expect(after?.freeToCallOff).toBe(before?.freeToCallOff);
  });
});
