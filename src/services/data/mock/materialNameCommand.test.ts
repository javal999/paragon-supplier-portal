// ────────────────────────────────────────────────────────────────────────────
// Material C2 — supplier trade names (MR-3 BR-01 to BR-03, BR-05, BR-06; AC-01,
// AC-03, AC-05), dispatched through the REAL MockCommandService and read back
// through the REAL procurement service. Every refusal code is fired once and
// passed once.
// ────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService } from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import { materialNameStore } from './stores/materialNameStore';
import { isAssignedMaterial } from './inventoryReadModel';
import { approvedNameFor, materialNamesFor } from './materialNameReadModel';
import type { QueryScope } from '../types';
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { sdcClock } from '../../sdc';
import { NO_PERSON } from '../../../context/noPerson';

const svc = new MockCommandService();
const reads = new MockProcurementService();

const planner: QueryScope = { personaType: 'buyer', supplierId: null, businessRoles: ['planning'], actor: NO_PERSON };
const supplierSeat = (supplierId: string): QueryScope => ({
  personaType: 'supplier',
  supplierId,
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON,
});
const sup7 = supplierSeat('sup-007');

const submit = (payload: Record<string, unknown>, scope: QueryScope = sup7) =>
  svc.dispatch(scope, { transitionId: 't_materialname_submit', entity: 'materialName', payload });
const approve = (id: string) =>
  svc.dispatch(planner, { transitionId: 't_materialname_approve', entity: 'materialName', entityId: id });
const reject = (id: string, payload: Record<string, unknown>) =>
  svc.dispatch(planner, { transitionId: 't_materialname_reject', entity: 'materialName', entityId: id, payload });
const load = (payload: Record<string, unknown>) =>
  svc.dispatch(planner, { transitionId: 't_materialname_load', entity: 'materialName', payload });

beforeEach(() => {
  materialNameStore.reset();
  sdcClock.reset();
});

describe('the fixture cases this file rests on (population control)', () => {
  it('PK-PETB-8801 is assigned to sup-007 and RM-EMUL-3310 is not; sup-007 has "ClearForm PET 100 (sample)" approved', () => {
    expect(isAssignedMaterial('sup-007', 'PK-PETB-8801')).toBe(true);
    expect(isAssignedMaterial('sup-007', 'RM-EMUL-3310')).toBe(false);
    expect(approvedNameFor('sup-007', 'PK-PETB-8810')?.tradeName).toBe('ClearForm PET 100 (sample)');
    expect(approvedNameFor('sup-005', 'RM-EMUL-3310')?.tradeName).toBe('OleoMul 3310 (sample)');
  });
});

describe('submit (supplier)', () => {
  it('AC-01 — a submit for a material not assigned to the supplier is refused NOT_ASSIGNED', async () => {
    const r = await submit({ supplierId: 'sup-007', materialCode: 'RM-EMUL-3310', tradeName: 'Emulsense 200' });
    expect(r.status).toBe('failed');
    expect(r.reason).toBe('POLICY_REJECTED:material_name_valid:NOT_ASSIGNED');
    expect(materialNameStore.all().some((n) => n.supplierId === 'sup-007' && n.materialCode === 'RM-EMUL-3310')).toBe(false);
  });

  it('and passes for an assigned material, landing Awaiting approval with the session actor', async () => {
    const r = await submit({ supplierId: 'sup-007', materialCode: 'PK-PETB-8801', tradeName: '  Bottle   PET 250 ', supplierMaterialNo: 'SPP-250' });
    expect(r.status, r.reason).toBe('done');
    const row = materialNameStore.get(r.entityId!);
    expect(row).toMatchObject({ state: 'Awaiting approval', tradeName: 'Bottle PET 250', supplierMaterialNo: 'SPP-250', submittedBy: NO_PERSON });
  });

  it('a supplier cannot submit for another supplier (scope)', async () => {
    await expect(submit({ supplierId: 'sup-002', materialCode: 'RM-EMUL-3310', tradeName: 'Emulsense 200' })).rejects.toMatchObject({
      code: 'SCOPE_DENIED',
    });
  });

  it('BR-05 — NAME_LENGTH fires below 2 and above 80 characters, and passes at 2 and 80', async () => {
    for (const bad of ['', 'A', 'x'.repeat(81)]) {
      const r = await submit({ supplierId: 'sup-007', materialCode: 'PK-PETB-8801', tradeName: bad });
      expect(r.reason, bad).toBe('POLICY_REJECTED:material_name_valid:NAME_LENGTH');
    }
    for (const good of ['AB', 'y'.repeat(80)]) {
      const r = await submit({ supplierId: 'sup-007', materialCode: 'PK-PETB-8801', tradeName: good });
      expect(r.status, good).toBe('done');
    }
  });

  it('BR-05 — SUPPLIER_NO_LENGTH fires over 40 characters and passes at 40', async () => {
    const over = await submit({ supplierId: 'sup-007', materialCode: 'PK-PETB-8801', tradeName: 'Bottle', supplierMaterialNo: 'n'.repeat(41) });
    expect(over.reason).toBe('POLICY_REJECTED:material_name_valid:SUPPLIER_NO_LENGTH');
    const at = await submit({ supplierId: 'sup-007', materialCode: 'PK-PETB-8801', tradeName: 'Bottle', supplierMaterialNo: 'n'.repeat(40) });
    expect(at.status).toBe('done');
  });

  it('edge case 3 — a name identical to the PTI description is accepted', async () => {
    const pti = (await reads.getMaterialNames(sup7)).items.find((r) => r.materialCode === 'PK-PETB-8801')!;
    const r = await submit({ supplierId: 'sup-007', materialCode: 'PK-PETB-8801', tradeName: pti.materialLabel });
    expect(r.status).toBe('done');
  });

  it('BR-02 — a changed name waits for approval and the approved name stays in use; a second change replaces the pending one', async () => {
    const first = await submit({ supplierId: 'sup-007', materialCode: 'PK-PETB-8810', tradeName: 'ClearForm PET 110' });
    expect(approvedNameFor('sup-007', 'PK-PETB-8810')?.tradeName).toBe('ClearForm PET 100 (sample)');
    const second = await submit({ supplierId: 'sup-007', materialCode: 'PK-PETB-8810', tradeName: 'ClearForm PET 120' });
    expect(materialNameStore.get(first.entityId!)?.state).toBe('Replaced');
    expect(materialNameStore.get(second.entityId!)?.state).toBe('Awaiting approval');
    expect(approvedNameFor('sup-007', 'PK-PETB-8810')?.tradeName).toBe('ClearForm PET 100 (sample)');
  });
});

describe('approve and reject (Material Planning)', () => {
  it('BR-01 — approving a new name replaces the earlier approved one', async () => {
    const sub = await submit({ supplierId: 'sup-007', materialCode: 'PK-PETB-8810', tradeName: 'ClearForm PET 110' });
    const r = await approve(sub.entityId!);
    expect(r.status, r.reason).toBe('done');
    expect(materialNameStore.get(sub.entityId!)?.state).toBe('Approved');
    expect(materialNameStore.get('smn-0001')?.state).toBe('Replaced');
    const approved = materialNameStore.forPair('sup-007', 'PK-PETB-8810').filter((n) => n.state === 'Approved');
    expect(approved.map((n) => n.id)).toEqual([sub.entityId]);
    expect(approvedNameFor('sup-007', 'PK-PETB-8810')?.tradeName).toBe('ClearForm PET 110');
  });

  it('the approved name shows beside PTI’s description on the supplier’s stock row', async () => {
    const row = (await reads.getInventory(sup7)).items.find((p) => p.materialCode === 'PK-PETB-8810');
    expect(row?.tradeName).toBe('ClearForm PET 100 (sample)');
    const none = (await reads.getInventory(sup7)).items.find((p) => p.materialCode === 'PK-PETB-8801');
    expect(none?.tradeName).toBeUndefined();
  });

  it('AC-05 — a rejection without a reason (absent or blank) is refused REASON_REQUIRED', async () => {
    for (const payload of [{}, { rejectionReason: '   ' }]) {
      const r = await reject('smn-0004', payload);
      expect(r.reason).toBe('POLICY_REJECTED:material_name_valid:REASON_REQUIRED');
    }
    expect(materialNameStore.get('smn-0004')?.state).toBe('Awaiting approval');
  });

  it('and a rejection with a reason lands Rejected with that reason, which the supplier reads', async () => {
    const r = await reject('smn-0004', { rejectionReason: ' Redundant: same as the PTI description ' });
    expect(r.status, r.reason).toBe('done');
    const mine = (await reads.getMaterialNames(supplierSeat('sup-002'))).items.find((x) => x.materialCode === 'RM-EMUL-3310');
    expect(mine?.latest).toMatchObject({ state: 'Rejected', rejectionReason: 'Redundant: same as the PTI description' });
  });

  it('a supplier seat holds no review atom, so it cannot approve its own name', async () => {
    const r = await svc.dispatch(supplierSeat('sup-002'), {
      transitionId: 't_materialname_approve', entity: 'materialName', entityId: 'smn-0004',
    });
    expect(r.status).toBe('failed');
    expect(r.reason).toContain('ROLE_NOT_PERMITTED');
  });
});

describe('BR-06 — the bulk load', () => {
  const FILE = [
    { supplierId: 'sup-007', materialCode: 'PK-PETB-8801', tradeName: 'Bottle PET 250', supplierMaterialNo: 'SPP-250' },
    { supplierId: 'sup-007', materialCode: 'PK-PETB-8810', tradeName: 'ClearForm PET 110' },
  ];

  it('loads approved, marked loadedByPti, replacing the earlier approved name', async () => {
    for (const row of FILE) expect((await load(row)).status).toBe('done');
    const loaded = approvedNameFor('sup-007', 'PK-PETB-8801');
    expect(loaded).toMatchObject({ tradeName: 'Bottle PET 250', loadedByPti: true, state: 'Approved' });
    expect(materialNameStore.get('smn-0001')?.state).toBe('Replaced');
  });

  it('loading the same CSV twice changes nothing', async () => {
    for (const row of FILE) await load(row);
    const after = JSON.stringify(materialNameStore.all());
    for (const row of FILE) expect((await load(row)).status).toBe('done');
    expect(JSON.stringify(materialNameStore.all())).toBe(after);
  });

  it('a load row for an unassigned material is refused NOT_ASSIGNED; an unknown supplier at scope', async () => {
    const r = await load({ supplierId: 'sup-007', materialCode: 'RM-EMUL-3310', tradeName: 'Emulsense 200' });
    expect(r.reason).toBe('POLICY_REJECTED:material_name_valid:NOT_ASSIGNED');
    await expect(load({ supplierId: 'sup-999', materialCode: 'PK-PETB-8801', tradeName: 'Bottle' })).rejects.toMatchObject({
      code: 'SCOPE_DENIED',
    });
  });
});

describe('AC-03 / BR-03 — a supplier reads its own names only', () => {
  it('supplier A’s read never contains supplier B’s name; PTI reads both', async () => {
    const a = await reads.getMaterialNames(supplierSeat('sup-002'));
    const aNames = a.items.flatMap((r) => r.history.map((n) => n.tradeName));
    expect(aNames).toContain('Emulsense 200 (sample)');
    expect(aNames).not.toContain('OleoMul 3310 (sample)');
    expect(a.items.every((r) => r.supplierId === 'sup-002')).toBe(true);
    expect(materialNamesFor(supplierSeat('sup-002')).every((n) => n.supplierId === 'sup-002')).toBe(true);

    const pti = (await reads.getMaterialNames(planner)).items.flatMap((r) => r.history.map((n) => n.tradeName));
    expect(pti).toEqual(expect.arrayContaining(['Emulsense 200 (sample)', 'OleoMul 3310 (sample)']));
  });

  it('edge case 2 — a name on a material no longer assigned stays on record but is hidden from every read', async () => {
    // A record for a pair outside the assignments stands in for an unassignment.
    materialNameStore.insert({
      supplierId: 'sup-007', materialCode: 'RM-EMUL-3310', tradeName: 'Old name', state: 'Approved',
      submittedBy: NO_PERSON, submittedAt: '2026-09-01T00:00:00.000Z',
    });
    expect(materialNameStore.all().some((n) => n.tradeName === 'Old name')).toBe(true);
    expect(approvedNameFor('sup-007', 'RM-EMUL-3310')).toBeUndefined();
    const pti = (await reads.getMaterialNames(planner)).items.flatMap((r) => r.history.map((n) => n.tradeName));
    expect(pti).not.toContain('Old name');
    const mine = (await reads.getMaterialNames(sup7)).items.flatMap((r) => r.history.map((n) => n.tradeName));
    expect(mine).not.toContain('Old name');
  });
});
