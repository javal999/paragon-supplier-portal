// ────────────────────────────────────────────────────────────────────────────
// Material C4 — the MRP controller list verb (`t_mrpcontroller_set`) and the
// controller on every material read (MR-5 BR-01 to BR-04, AC-01, AC-03),
// dispatched through the REAL MockCommandService and read back through the
// REAL procurement service. Every refusal code is probed both ways.
// ────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService } from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import { mrpControllerStore } from '../../transitions/mrpControllerStore';
import type { MrpControllerRef, QueryScope } from '../types';
import { PERSONA_SYSTEM_ROLES, SYSTEM_ROLES, rolesHolding } from '../../transitions/businessRoles';
import { sdcClock } from '../../sdc';
import { materialEntry } from '../../sdc/materialMaster';
import { NO_PERSON } from '../../../context/noPerson';

const svc = new MockCommandService();
const reads = new MockProcurementService();

const buyerSeat = (...businessRoles: string[]): QueryScope => ({
  personaType: 'buyer',
  supplierId: null,
  businessRoles,
  actor: NO_PERSON,
});
const admin = buyerSeat('compliance');
const planner = buyerSeat('planning');
const supplierSeat = (supplierId: string): QueryScope => ({
  personaType: 'supplier',
  supplierId,
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON,
});

const setController = (code: string, payload: Record<string, unknown>, scope: QueryScope = admin) =>
  svc.dispatch(scope, { transitionId: 't_mrpcontroller_set', entity: 'mrpController', entityId: code, payload });

const PACKAGING = 'Packaging planning desk (sample)';

beforeEach(() => {
  mrpControllerStore.reset();
  sdcClock.reset();
});

describe('the fixture cases this file rests on (population control)', () => {
  it('PK-PETB-8801 carries P12 (mapped); FR-WARD-4410 carries P13 (unmapped on the sample list)', () => {
    expect(materialEntry('PK-PETB-8801')?.mrpController).toBe('P12');
    expect(materialEntry('FR-WARD-4410')?.mrpController).toBe('P13');
    expect(mrpControllerStore.get('P12')?.name).toBe(PACKAGING);
    expect(mrpControllerStore.get('P13')).toBeUndefined();
  });
});

describe('AC-01 — every material read names the controller (buyer)', () => {
  it('inventory, alerts, call-offs and ASN lines carry the code and the name', async () => {
    const inv = (await reads.getInventory(planner)).items.find(
      (r) => r.supplierId === 'sup-007' && r.materialCode === 'PK-PETB-8801',
    );
    expect(inv?.mrpController).toEqual({ code: 'P12', name: PACKAGING });

    const alert = (await reads.getInventoryAlerts(planner)).items.find((a) => a.key === 'coverage|PK-PETB-8802|sup-007');
    expect(alert?.mrpController).toEqual({ code: 'P12', name: PACKAGING });

    const callOff = (await reads.getCallOffs(planner)).items.find((c) => c.id === 'co-0001');
    expect(callOff?.mrpController).toEqual({ code: 'P12', name: PACKAGING });

    const asn = (await reads.getASNs(planner)).items.find((a) => a.asnNumber === 'ASN-2025-00198');
    expect(asn?.lineItems.find((l) => l.materialCode === 'PK-ALCP-2450')?.mrpController).toEqual({
      code: 'P12',
      name: PACKAGING,
    });
  });

  it('a capacity alert (subject: a material group) carries none', async () => {
    const cap = (await reads.getInventoryAlerts(planner)).items.find((a) => a.rule === 'capacityBelowDemand');
    expect(cap).toBeDefined();
    expect(cap?.mrpController).toBeUndefined();
  });

  it('an unmapped code shows the code only (BR-02)', async () => {
    const row = (await reads.getInventory(planner)).items.find((r) => r.materialCode === 'FR-WARD-4410');
    expect(row?.mrpController).toEqual({ code: 'P13' });
  });
});

describe('AC-03 — a supplier reads the name, never the code', () => {
  const noCode = (refs: readonly (MrpControllerRef | undefined)[]) => {
    const present = refs.filter((r): r is MrpControllerRef => r !== undefined);
    expect(present.length).toBeGreaterThan(0);
    for (const r of present) {
      expect(r.code).toBeUndefined();
      expect(typeof r.name).toBe('string');
    }
  };

  it('on inventory, alerts, call-offs and ASN lines', async () => {
    const me = supplierSeat('sup-007');
    const inv = (await reads.getInventory(me)).items;
    expect(inv.find((r) => r.materialCode === 'PK-PETB-8801')?.mrpController).toEqual({ name: PACKAGING });
    noCode(inv.map((r) => r.mrpController));
    noCode((await reads.getInventoryAlerts(me)).items.map((a) => a.mrpController));
    noCode((await reads.getCallOffs(me)).items.map((c) => c.mrpController));
    noCode((await reads.getASNs(me)).items.flatMap((a) => a.lineItems.map((l) => l.mrpController)));
    // Nothing on the wire names the code at all.
    const wire = JSON.stringify([
      inv,
      (await reads.getInventoryAlerts(me)).items,
      (await reads.getCallOffs(me)).items,
      (await reads.getASNs(me)).items,
    ]);
    expect(wire).not.toMatch(/"code":"P1[0-3]"/);
    expect(wire).toContain(PACKAGING);
  });

  it('an unmapped code gives the supplier nothing; mapping it gives the supplier the name', async () => {
    const sup3 = supplierSeat('sup-003');
    const before = (await reads.getInventory(sup3)).items.find((r) => r.materialCode === 'FR-WARD-4410');
    expect(before).toBeDefined();
    expect(before?.mrpController).toBeUndefined();

    const res = await setController('P13', { name: 'Fragrance planning desk', userLabels: ['FR planner'] });
    expect(res.status, res.reason).toBe('done');

    const after = (await reads.getInventory(sup3)).items.find((r) => r.materialCode === 'FR-WARD-4410');
    expect(after?.mrpController).toEqual({ name: 'Fragrance planning desk' });
    const ptiAfter = (await reads.getInventory(planner)).items.find((r) => r.materialCode === 'FR-WARD-4410');
    expect(ptiAfter?.mrpController).toEqual({ code: 'P13', name: 'Fragrance planning desk' });
  });
});

describe('t_mrpcontroller_set (MR-5 BR-02)', () => {
  it('maps a code, appends the change with who and when, and the latest wins', async () => {
    sdcClock.set('2026-09-30T02:00:00.000Z');
    const res = await setController('P12', { name: '  Packaging desk  ', userLabels: ['Planner A', ' ', 'Planner A', 'Planner B'] });
    expect(res.status, res.reason).toBe('done');
    expect(mrpControllerStore.get('P12')).toEqual({ code: 'P12', name: 'Packaging desk', userLabels: ['Planner A', 'Planner B'] });
    expect(mrpControllerStore.changes()).toEqual([
      {
        code: 'P12',
        name: 'Packaging desk',
        userLabels: ['Planner A', 'Planner B'],
        setBy: NO_PERSON,
        setAt: '2026-09-30T02:00:00.000Z',
      },
    ]);
  });

  it('a malformed code is not addressable (NOT_FOUND, the threePl shape); a SAP code passes', async () => {
    // The target's `readState` answers null for a code that fails the shape, so
    // the dispatcher refuses before the hook; the page pre-check names it
    // MRP_CONTROLLER_CODE_INVALID (mrpControllerStore.test.ts).
    await expect(setController('p12', { name: 'Desk', userLabels: ['A'] })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(mrpControllerStore.changes()).toEqual([]);
    expect((await setController('P14', { name: 'Desk', userLabels: ['A'] })).status).toBe('done');
  });

  it('MRP_CONTROLLER_NAME_REQUIRED: a blank name is refused by name; a name passes', async () => {
    const bad = await setController('P12', { name: ' ', userLabels: ['A'] });
    expect(bad.status).toBe('failed');
    expect(bad.reason).toMatch(/MRP_CONTROLLER_NAME_REQUIRED/);
    expect(mrpControllerStore.changes()).toEqual([]);
    expect((await setController('P12', { name: 'Desk', userLabels: ['A'] })).status).toBe('done');
  });

  it('MRP_CONTROLLER_USERS_REQUIRED: no hub user is refused by name; one passes', async () => {
    const bad = await setController('P12', { name: 'Desk', userLabels: ['  '] });
    expect(bad.status).toBe('failed');
    expect(bad.reason).toMatch(/MRP_CONTROLLER_USERS_REQUIRED/);
    expect(mrpControllerStore.changes()).toEqual([]);
    expect((await setController('P12', { name: 'Desk', userLabels: ['A'] })).status).toBe('done');
  });
});

describe('only the Hub administrator lane may map a code', () => {
  it('the atom sits in compliance only, and admin holds it by derivation', () => {
    expect(rolesHolding('mrpcontroller:manage')).toEqual(['compliance']);
    expect(SYSTEM_ROLES.admin).toContain('mrpcontroller:manage');
    expect(SYSTEM_ROLES.planning).not.toContain('mrpcontroller:manage');
  });

  it('a planner is refused; the compliance seat passes', async () => {
    const refused = await setController('P12', { name: 'Desk', userLabels: ['A'] }, planner);
    expect(refused.status).toBe('failed');
    expect(refused.reason).toMatch(/ROLE_NOT_PERMITTED/);
    expect((await setController('P12', { name: 'Desk', userLabels: ['A'] }, admin)).status).toBe('done');
  });

  it('a supplier is denied at scope on any code', async () => {
    await expect(setController('P12', { name: 'Desk', userLabels: ['A'] }, supplierSeat('sup-007'))).rejects.toMatchObject({
      code: 'SCOPE_DENIED',
    });
    expect(mrpControllerStore.changes()).toEqual([]);
  });
});

describe('BL-157 — t_mrpcontroller_unmap (FU-8; MR-5 BR-02, BR-04)', () => {
  const unmap = (code: string, scope: QueryScope = admin) =>
    svc.dispatch(scope, { transitionId: 't_mrpcontroller_unmap', entity: 'mrpController', entityId: code, payload: {} });

  it('removes a mapping by appending a change (MAT-R3); PTI then reads the code only, the supplier nothing', async () => {
    sdcClock.set('2026-09-30T03:00:00.000Z');
    const res = await unmap('P12');
    expect(res.status, res.reason).toBe('done');
    expect(mrpControllerStore.get('P12')).toBeUndefined();
    expect(mrpControllerStore.changes()).toEqual([
      { code: 'P12', name: '', userLabels: [], unmapped: true, setBy: NO_PERSON, setAt: '2026-09-30T03:00:00.000Z' },
    ]);
    const pti = (await reads.getInventory(planner)).items.find(
      (r) => r.supplierId === 'sup-007' && r.materialCode === 'PK-PETB-8801',
    );
    expect(pti?.mrpController).toEqual({ code: 'P12' });
    const sup = (await reads.getInventory(supplierSeat('sup-007'))).items.find((r) => r.materialCode === 'PK-PETB-8801');
    expect(sup).toBeDefined();
    expect(sup?.mrpController).toBeUndefined();
  });

  it('mapping the code again after an unmapping makes the new mapping the one in force', async () => {
    expect((await unmap('P12')).status).toBe('done');
    expect((await setController('P12', { name: 'Desk', userLabels: ['A'] })).status).toBe('done');
    expect(mrpControllerStore.get('P12')?.name).toBe('Desk');
    expect(mrpControllerStore.changes()).toHaveLength(2);
  });

  it('MRP_CONTROLLER_NOT_MAPPED: an unmapped code is refused by name; a mapped one passes', async () => {
    const bad = await unmap('P13');
    expect(bad.status).toBe('failed');
    expect(bad.reason).toMatch(/MRP_CONTROLLER_NOT_MAPPED/);
    expect(mrpControllerStore.changes()).toEqual([]);
    expect((await unmap('P10')).status).toBe('done');
  });

  it('a planner is refused; a supplier is denied at scope', async () => {
    const refused = await unmap('P12', planner);
    expect(refused.status).toBe('failed');
    expect(refused.reason).toMatch(/ROLE_NOT_PERMITTED/);
    await expect(unmap('P12', supplierSeat('sup-007'))).rejects.toMatchObject({ code: 'SCOPE_DENIED' });
    expect(mrpControllerStore.changes()).toEqual([]);
  });
});
