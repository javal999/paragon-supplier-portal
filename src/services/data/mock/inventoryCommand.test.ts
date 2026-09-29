// ────────────────────────────────────────────────────────────────────────────
// Inventory & capacity verbs (REQ-E08-02 to REQ-E08-05) dispatched through the
// REAL MockCommandService and read back through the REAL MockProcurementService.
// Every rule is probed both ways and every walk ends in the store or the read.
// ────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService } from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import { inventoryDeclarationStore } from './stores/inventoryDeclarationStore';
import {
  capacityStore,
  inventoryAlertLedger,
  stockAccessStore,
  stockSyncStore,
} from './stores/inventoryHubStores';
import type { QueryScope } from '../types';
import { PERSONA_SYSTEM_ROLES, rolesHolding } from '../../transitions/businessRoles';
import { stockFreshness } from '../../transitions/inventoryRules';
import { reasonCodeStore } from '../../transitions/reasonCodes';
import { planStatus } from '../../transitions/capacityRules';
import { sdcClock } from '../../sdc';
import { NO_PERSON } from '../../../context/noPerson';
import { CAPACITY_FIRST_WEEK } from './fixtures/inventoryHub';

const svc = new MockCommandService();
const reads = new MockProcurementService();

const supplier = (supplierId: string): QueryScope => ({
  personaType: 'supplier',
  supplierId,
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON,
});
const sup007 = supplier('sup-007');
const sup002 = supplier('sup-002');
const buyer: QueryScope = { personaType: 'buyer', supplierId: null, businessRoles: PERSONA_SYSTEM_ROLES.buyer, actor: NO_PERSON };

beforeEach(() => {
  inventoryDeclarationStore.reset();
  stockAccessStore.reset();
  capacityStore.reset();
  stockSyncStore.reset();
  inventoryAlertLedger.reset();
  reasonCodeStore.reset();
  sdcClock.reset();
});

const now = () => sdcClock.now();
const positionOf = async (scope: QueryScope, supplierId: string, materialCode: string) =>
  (await reads.getInventory(scope)).items.find((p) => p.supplierId === supplierId && p.materialCode === materialCode);

describe('roles (bilateral): planner syncs, grants and closes; supplier confirms capacity', () => {
  it('each new atom sits in exactly one lane on the right side', () => {
    expect(rolesHolding('stocksync:run')).toEqual(['planning']);
    expect(rolesHolding('stocksync:pull')).toEqual(['fulfilment']);
    expect(rolesHolding('stockaccess:manage')).toEqual(['planning']);
    expect(rolesHolding('inventoryalert:close')).toEqual(['planning']);
    expect(rolesHolding('capacity:confirm')).toEqual(['fulfilment']);
  });
});

describe('ONE inventory model (REQ-E08-01)', () => {
  it('the read has no "available" figure and projects every field the view needs', async () => {
    const p = (await positionOf(buyer, 'sup-007', 'PK-PETB-8801'))!;
    expect(p).toMatchObject({ supplierSoh: 85000, supplierRop: 60000, ptiSoh: 30000, ptiRop: 40000, materialType: 'VERP', channel: 'template' });
    expect(Object.keys(p).some((k) => /available|reserved/i.test(k))).toBe(false);
    // In production from the submission; in transit from the call-off dispatch notices.
    expect(p.incoming.map((i) => i.source).sort()).toEqual(['dispatch', 'dispatch', 'production']);
  });

  it('a supplier reads only its own rows (scoping)', async () => {
    const mine = (await reads.getInventory(sup002)).items;
    expect(mine.length).toBeGreaterThan(0);
    expect(new Set(mine.map((p) => p.supplierId))).toEqual(new Set(['sup-002']));
  });
});

describe('stock submission (REQ-E08-02)', () => {
  const declare = (payload: Record<string, unknown>, scope: QueryScope = sup007) =>
    svc.dispatch(scope, { transitionId: 't_inventorydeclaration_declare', entity: 'inventoryDeclaration', payload: { supplierId: scope.supplierId, ...payload } });

  it('known-good: SOH, ROP, in-production and completion date land on the template channel and become current', async () => {
    const res = await declare({ materialCode: 'PK-CAPF-8820', totalQty: 50000, supplierRop: 20000, inProductionQty: 10000, productionCompletionDate: '2026-09-12', channel: 'template' });
    expect(res.status).toBe('done');
    const p = (await positionOf(sup007, 'sup-007', 'PK-CAPF-8820'))!;
    expect(p).toMatchObject({ supplierSoh: 50000, supplierRop: 20000, channel: 'template', lastUpdatedAt: now() });
    expect(p.incoming).toEqual([{ source: 'production', date: '2026-09-12', quantity: 10000, reference: null }]);
    expect(stockFreshness(p, now())).toBe('current');
  });

  it('known-bad: a material not assigned to the supplier is refused, nothing stored', async () => {
    const before = inventoryDeclarationStore.all().length;
    await expect(declare({ materialCode: 'RM-STEAR-7300', totalQty: 1 })).rejects.toMatchObject({ code: 'SCOPE_DENIED' });
    expect(inventoryDeclarationStore.all()).toHaveLength(before);
  });

  it('known-bad: batches that do not add up to SOH (CR-19) and malformed detail are refused', async () => {
    expect((await declare({ materialCode: 'PK-PETB-8801', totalQty: 100, batches: [{ batchNumber: 'B', qty: 90 }] })).reason).toMatch(/batch total/);
    expect((await declare({ materialCode: 'PK-PETB-8801', totalQty: 100, supplierRop: -5 })).reason).toMatch(/inv_declare_detail_valid/);
    expect((await declare({ materialCode: 'PK-PETB-8801', totalQty: 100, productionCompletionDate: '12/09/2026' })).reason).toMatch(/date/);
    expect((await declare({ materialCode: 'PK-PETB-8801', totalQty: 100, channel: 'api' })).reason).toMatch(/channel/);
  });

  it('BL-60: a batch manufacturing date is stored; after expiry or in the future is refused by the verb', async () => {
    const today = now().slice(0, 10);
    const ok = await declare({
      materialCode: 'PK-PETB-8801',
      totalQty: 100,
      batches: [{ batchNumber: 'M1', qty: 100, manufacturingDate: today, expiryDate: '2099-01-01' }],
    });
    expect(ok.status).toBe('done');
    expect(inventoryDeclarationStore.latestFor('sup-007', 'PK-PETB-8801')!.batches).toEqual([
      { batchNumber: 'M1', qty: 100, uom: 'PCS', manufacturingDate: today, expiryDate: '2099-01-01' },
    ]);
    expect((await positionOf(sup007, 'sup-007', 'PK-PETB-8801'))!.batches[0]).toMatchObject({ manufacturingDate: today });
    const before = inventoryDeclarationStore.all().length;
    const after = await declare({
      materialCode: 'PK-PETB-8801',
      totalQty: 100,
      batches: [{ batchNumber: 'M2', qty: 100, manufacturingDate: '2026-01-10', expiryDate: '2026-01-09' }],
    });
    expect(after.reason).toMatch(/manufacturing date is after the expiry date/);
    const future = await declare({
      materialCode: 'PK-PETB-8801',
      totalQty: 100,
      batches: [{ batchNumber: 'M3', qty: 100, manufacturingDate: '2099-01-01' }],
    });
    expect(future.reason).toMatch(/manufacturing date is in the future/);
    expect(inventoryDeclarationStore.all()).toHaveLength(before);
  });

  it('BR-08: PTI records a WhatsApp reply on the supplier’s behalf — "Entered by PTI", visible to the supplier', async () => {
    const res = await svc.dispatch(buyer, {
      transitionId: 't_inventorydeclaration_record',
      entity: 'inventoryDeclaration',
      payload: { supplierId: 'sup-007', materialCode: 'PK-PETB-8802', totalQty: 33000, channel: 'template' },
    });
    expect(res.status).toBe('done');
    const seen = (await positionOf(sup007, 'sup-007', 'PK-PETB-8802'))!;
    // The payload's "template" is ignored: a PTI recording is always channel pti.
    expect(seen).toMatchObject({ supplierSoh: 33000, channel: 'pti' });
  });
});

describe('API sync (REQ-E08-02 BR-03, AC-02, edge case)', () => {
  const sync = (supplierId: string, scope: QueryScope = buyer) =>
    svc.dispatch(scope, { transitionId: 't_stocksync_run', entity: 'stockSync', payload: { supplierId } });

  it('success refreshes the figures and the last update time', async () => {
    const before = (await positionOf(buyer, 'sup-001', 'RM-LAURIC-7200'))!;
    expect(stockFreshness(before, now())).toBe('stale'); // 1-day SLA
    const res = await sync('sup-001');
    expect(res.status).toBe('done');
    expect(stockSyncStore.get(res.entityId!)).toMatchObject({ outcome: 'success', at: now() });
    const after = (await positionOf(buyer, 'sup-001', 'RM-LAURIC-7200'))!;
    expect(after).toMatchObject({ supplierSoh: 9000, channel: 'api', lastUpdatedAt: now() });
    expect(stockFreshness(after, now())).toBe('current');
  });

  // PREMISE CHANGED (Material B1, owner ruling 2026-09-29): the failure no
  // longer flags the figures stale; it is a warning (lastPullFailedAt), and the
  // figures go stale 24 h after the last successful pull (here the seeded
  // 1-day override for sup-003 gives the same instant).
  it('failure records the error and time, keeps the previous figures, and warns without making them stale', async () => {
    const figures = inventoryDeclarationStore.all().length;
    const before = (await positionOf(buyer, 'sup-003', 'FR-WARD-4410'))!;
    const res = await sync('sup-003');
    expect(res.status).toBe('done');
    expect(stockSyncStore.get(res.entityId!)).toMatchObject({ outcome: 'failed', errorKey: 'timeout', at: now() });
    expect(inventoryDeclarationStore.all()).toHaveLength(figures);
    const after = (await positionOf(buyer, 'sup-003', 'FR-WARD-4410'))!;
    expect(after.supplierSoh).toBe(before.supplierSoh);
    expect(after.lastSync).toMatchObject({ outcome: 'failed' });
    expect(after.lastPullFailedAt).toBe(now());
    expect(stockFreshness(after, now())).toBe('current');
  });

  it('known-bad: a supplier that is not API-connected, and a supplier pressing Sync', async () => {
    expect((await sync('sup-007')).reason).toMatch(/NOT_API_CONNECTED/);
    expect((await sync('sup-001', supplier('sup-001'))).reason).toMatch(/ROLE_NOT_PERMITTED/);
  });
});

describe('supplier-triggered sync (BL-59, REQ-E08-02 BR-03, AC-02)', () => {
  const pull = (supplierId: string, scope: QueryScope = supplier(supplierId)) =>
    svc.dispatch(scope, { transitionId: 't_stocksync_pull', entity: 'stockSync', payload: { supplierId } });

  it('known-good: a connected supplier pulls its OWN stock from its seat', async () => {
    const res = await pull('sup-001');
    expect(res.status).toBe('done');
    expect(stockSyncStore.get(res.entityId!)).toMatchObject({ supplierId: 'sup-001', outcome: 'success', at: now() });
    expect((await positionOf(supplier('sup-001'), 'sup-001', 'RM-LAURIC-7200'))!).toMatchObject({
      supplierSoh: 9000,
      channel: 'api',
      lastUpdatedAt: now(),
    });
  });

  // PREMISE CHANGED (Material B1, owner ruling 2026-09-29): kept, not stale.
  it('a failing connection records the error and keeps the previous figures, current with a warning', async () => {
    const figures = inventoryDeclarationStore.all().length;
    const res = await pull('sup-003');
    expect(stockSyncStore.get(res.entityId!)).toMatchObject({ outcome: 'failed', errorKey: 'timeout' });
    expect(inventoryDeclarationStore.all()).toHaveLength(figures);
    const kept = (await positionOf(supplier('sup-003'), 'sup-003', 'FR-WARD-4410'))!;
    expect(kept.lastPullFailedAt).toBe(now());
    expect(stockFreshness(kept, now())).toBe('current');
  });

  it('known-bad: another supplier’s stock, a non-connected supplier, a seat without fulfilment, and the buyer', async () => {
    // Scope: the owner the target names is the PAYLOAD's supplier, not the seat's.
    await expect(pull('sup-003', supplier('sup-001'))).rejects.toMatchObject({ code: 'SCOPE_DENIED' });
    expect((await pull('sup-007')).reason).toMatch(/NOT_API_CONNECTED/);
    const commercialOnly: QueryScope = { ...supplier('sup-001'), businessRoles: ['supplier', 'commercial'] };
    expect((await pull('sup-001', commercialOnly)).reason).toMatch(/ROLE_NOT_PERMITTED/);
    // The planner keeps its own verb; the supplier's is not the planner's.
    expect((await pull('sup-001', buyer)).reason).toMatch(/ROLE_NOT_PERMITTED/);
  });
});

describe('supplier access to PTI stock (REQ-E08-03)', () => {
  const act = (transitionId: string, supplierId: string, payload: Record<string, unknown> = {}, scope: QueryScope = buyer) =>
    svc.dispatch(scope, { transitionId, entity: 'stockAccess', entityId: supplierId, payload });

  it('AC-01: a supplier without access reads no PTI stock anywhere', async () => {
    const rows = (await reads.getInventory(sup002)).items;
    expect(rows.every((p) => p.ptiSoh === null && p.ptiRop === null && !p.ptiStockShared)).toBe(true);
    expect((await reads.getStockAccess(sup002)).items[0]).toMatchObject({ supplierId: 'sup-002', active: false });
  });

  it('the seeded grant shows PTI stock to sup-007 for the 2 permitted materials only', async () => {
    const rows = (await reads.getInventory(sup007)).items;
    const shared = rows.filter((p) => p.ptiStockShared).map((p) => p.materialCode).sort();
    expect(shared).toEqual(['PK-PETB-8801', 'PK-PETB-8802']);
    expect(rows.find((p) => p.materialCode === 'PK-CAPF-8820')).toMatchObject({ ptiSoh: null, ptiRop: null });
  });

  it('AC-02 / AC-03: grant, change and remove without supplier action, each logged with user and time; removal applies on the next read', async () => {
    expect((await act('t_stockaccess_grant', 'sup-002', { materials: ['RM-STEAR-7300'] })).status).toBe('done');
    let rows = (await reads.getInventory(sup002)).items;
    expect(rows.filter((p) => p.ptiStockShared).map((p) => p.materialCode)).toEqual(['RM-STEAR-7300']);
    expect((await act('t_stockaccess_change', 'sup-002', { materials: [] })).status).toBe('done');
    rows = (await reads.getInventory(sup002)).items;
    expect(rows.every((p) => p.ptiStockShared)).toBe(true);
    expect((await act('t_stockaccess_remove', 'sup-002')).status).toBe('done');
    rows = (await reads.getInventory(sup002)).items;
    expect(rows.some((p) => p.ptiStockShared)).toBe(false);
    const log = stockAccessStore.get('sup-002')!.log;
    expect(log.map((e) => e.action)).toEqual(['grant', 'change', 'remove']);
    expect(log.every((e) => e.at === now() && e.actor.kind === 'UNATTRIBUTED')).toBe(true);
  });

  it('known-bad: a material the supplier does not supply, a second grant, removal without access, a supplier granting itself', async () => {
    expect((await act('t_stockaccess_grant', 'sup-002', { materials: ['PK-PETB-8801'] })).reason).toMatch(/NOT_SUPPLIED/);
    expect((await act('t_stockaccess_grant', 'sup-007', { materials: [] })).reason).toMatch(/ILLEGAL_TRANSITION/);
    expect((await act('t_stockaccess_remove', 'sup-002')).reason).toMatch(/ILLEGAL_TRANSITION/);
    expect((await act('t_stockaccess_grant', 'sup-002', { materials: [] }, sup002)).reason).toMatch(/ROLE_NOT_PERMITTED/);
    expect(stockAccessStore.get('sup-002')).toBeUndefined();
  });
});

describe('capacity confirmation (REQ-E08-04)', () => {
  const plan = async (scope: QueryScope, group: string) =>
    (await reads.getCapacityPlans(scope)).items.find((p) => p.supplierId === scope.supplierId && p.planningGroupId === `pg-${group}`)!;
  const submit = (weeks: unknown[], group = 'MG-21', scope: QueryScope = sup007) =>
    svc.dispatch(scope, { transitionId: 't_capacity_submit', entity: 'capacitySubmission', payload: { supplierId: scope.supplierId, planningGroupId: `pg-${group}`, weeks } });

  it('the seed shows a gap week for sup-007 rigid plastics and a confirmed raw-material group for sup-002', async () => {
    const pet = await plan(sup007, 'MG-20');
    expect(pet.weeks[0].week).toBe(CAPACITY_FIRST_WEEK);
    expect(planStatus(pet)).toBe('gap');
    expect(planStatus(await plan(sup002, 'MG-02'))).toBe('confirmed');
    expect(planStatus(await plan(sup007, 'MG-21'))).toBe('notStarted');
  });

  it('owner 2026-09-29 — the demand is the LTP: the current forecast summed per group and week, and nothing else', async () => {
    // sup-007 MG-20, week of 14 Sep: PK-PETB-8801 34,300 + PK-PETB-8802 38,500.
    expect((await plan(sup007, 'MG-20')).weeks[2].demand).toBe(72800);
    // Closures carry no LTP line, so no capacity demand — the planning estimate no longer feeds it.
    expect((await plan(sup007, 'MG-21')).weeks.every((w) => w.demand === 0)).toBe(true);
  });

  it('AC-02 known-bad: a week below the LTP without a reason is refused, nothing stored', async () => {
    const closures = await plan(sup002, 'MG-10');
    const before = capacityStore.all().length;
    const weeks = closures.weeks.map((w, i) => ({ week: w.week, allocated: i === 4 ? w.demand - 1 : w.demand }));
    const res = await submit(weeks, 'MG-10', sup002);
    expect(res.reason).toMatch(/BELOW_DEMAND_NEEDS_REASON/);
    expect(capacityStore.all()).toHaveLength(before);
    const other = weeks.map((w, i) => (i === 4 ? { ...w, reason: 'other' } : w));
    expect((await submit(other, 'MG-10', sup002)).reason).toMatch(/OTHER_REASON_NEEDS_NOTE/);
  });

  it('AC-01 known-good: with a reason the submission lands, the plan shows the gap, and PTI sees it', async () => {
    const closures = await plan(sup002, 'MG-10');
    const weeks = closures.weeks.map((w, i) => ({
      week: w.week,
      allocated: i === 4 ? w.demand - 1000 : w.demand,
      ...(i === 4 ? { reason: 'logistics' } : { upside: 500 }),
    }));
    const res = await submit(weeks, 'MG-10', sup002);
    expect(res.status).toBe('done');
    const after = (await reads.getCapacityPlans(buyer)).items.find((p) => p.supplierId === 'sup-002' && p.planningGroupId === 'pg-MG-10')!;
    expect(planStatus(after)).toBe('gap');
    expect(after.weeks[4].entry).toMatchObject({ reason: 'logistics' });
    expect(after.weeks[0].entry).toMatchObject({ upside: 500 });
  });

  it('known-bad: a supplier cannot submit for another supplier, nor for a group it does not supply', async () => {
    const closures = await plan(sup007, 'MG-21');
    const weeks = closures.weeks.map((w) => ({ week: w.week, allocated: w.demand }));
    await expect(
      svc.dispatch(sup002, {
        transitionId: 't_capacity_submit',
        entity: 'capacitySubmission',
        payload: { supplierId: 'sup-007', planningGroupId: 'pg-MG-21', weeks },
      }),
    ).rejects.toMatchObject({ code: 'SCOPE_DENIED' });
    await expect(submit(weeks, 'MG-04')).rejects.toMatchObject({ code: 'SCOPE_DENIED' });
  });
});

describe('alerts (REQ-E08-05)', () => {
  const closeWith = (key: string, payload: Record<string, unknown>, scope: QueryScope = buyer) =>
    svc.dispatch(scope, { transitionId: 't_inventoryalert_close', entity: 'inventoryAlert', entityId: key, payload });
  const close = (key: string, actionNote: string, scope: QueryScope = buyer) =>
    closeWith(key, { closeReason: 'other', actionNote }, scope);

  it('the sample data shows High alerts first, and a supplier never sees PTI-stock rules', async () => {
    const all = (await reads.getInventoryAlerts(buyer)).items;
    expect(all[0].riskClass).toBe('high');
    expect(all.map((a) => a.key)).toEqual(
      expect.arrayContaining(['capacityBelowDemand|pg-MG-20|sup-007', 'staleData|PK-PETB-8810|sup-007', 'ptiBelowRop|RM-STEAR-7300|sup-002']),
    );
    const mine = (await reads.getInventoryAlerts(sup007)).items;
    expect(mine.every((a) => a.supplierId === 'sup-007')).toBe(true);
    expect(mine.some((a) => a.rule === 'ptiBelowRop' || a.rule === 'projectedStockOut')).toBe(false);
    expect(new Set(all.map((a) => a.key)).size).toBe(all.length);
  });

  it('closing with "Other" needs a note; a closed alert stays one closed alert while the condition persists', async () => {
    const key = 'ptiBelowRop|RM-STEAR-7300|sup-002';
    expect((await close(key, '  ')).reason).toMatch(/NOTE_REQUIRED/);
    expect((await close(key, 'Earlier call-off requested')).status).toBe('done');
    // Another command lands; the condition still holds → no new open alert.
    await svc.dispatch(sup007, { transitionId: 't_inventorydeclaration_declare', entity: 'inventoryDeclaration', payload: { supplierId: 'sup-007', materialCode: 'PK-PETB-8801', totalQty: 1 } });
    const matching = (await reads.getInventoryAlerts(buyer)).items.filter((a) => a.key === key);
    expect(matching).toEqual([expect.objectContaining({ status: 'closed', closeReason: 'other', actionNote: 'Earlier call-off requested' })]);
    expect((await close(key, 'again')).reason).toMatch(/ILLEGAL_TRANSITION/);
  });

  it('a closed alert reopens only after its condition clears and recurs', async () => {
    const key = 'supplierBelowRop|PK-PETB-8802|sup-007';
    expect((await close(key, 'Supplier producing')).status).toBe('done');
    const declare = (totalQty: number) =>
      svc.dispatch(sup007, { transitionId: 't_inventorydeclaration_declare', entity: 'inventoryDeclaration', payload: { supplierId: 'sup-007', materialCode: 'PK-PETB-8802', totalQty, supplierRop: 30000 } });
    await declare(40000); // above ROP → condition clears
    expect((await reads.getInventoryAlerts(buyer)).items.some((a) => a.key === key)).toBe(false);
    await declare(10000); // below ROP again → recurs
    expect((await reads.getInventoryAlerts(buyer)).items.find((a) => a.key === key)).toMatchObject({ status: 'open' });
  });

  // MR-9 BR-04, AC-02 (AR-14) — the reason is required; the note only for "Other".
  it('closing without a reason is refused by the verb', async () => {
    const key = 'ptiBelowRop|RM-STEAR-7300|sup-002';
    expect((await closeWith(key, { actionNote: 'Earlier call-off requested' })).reason).toMatch(/MISSING_FIELDS.*closeReason/);
    expect(inventoryAlertLedger.all()).toEqual([]);
  });

  it('REASON_UNKNOWN: an unknown or retired reason is refused; an active one closes without a note', async () => {
    const key = 'ptiBelowRop|RM-STEAR-7300|sup-002';
    expect((await closeWith(key, { closeReason: 'made-up' })).reason).toMatch(/REASON_UNKNOWN/);
    const retired = reasonCodeStore.append({
      list: 'alertClose',
      code: 'risk-accepted',
      labelEn: 'Risk accepted',
      labelId: 'Risiko diterima',
      active: false,
      setBy: NO_PERSON,
      setAt: now(),
    });
    expect(retired).toBe(true);
    expect((await closeWith(key, { closeReason: 'risk-accepted' })).reason).toMatch(/REASON_UNKNOWN/);
    expect((await closeWith(key, { closeReason: 'po-raised' })).status).toBe('done');
    expect(inventoryAlertLedger.all()).toEqual([expect.objectContaining({ key, kind: 'closed', closeReason: 'po-raised' })]);
    expect(inventoryAlertLedger.all()[0].note).toBeUndefined();
  });

  it('NOTE_REQUIRED: "Other" without a note is refused, with a note it closes', async () => {
    const key = 'ptiBelowRop|RM-STEAR-7300|sup-002';
    expect((await closeWith(key, { closeReason: 'other' })).reason).toMatch(/NOTE_REQUIRED/);
    expect((await closeWith(key, { closeReason: 'other', actionNote: 'Buyer phoned the supplier' })).status).toBe('done');
    expect((await reads.getInventoryAlerts(buyer)).items.find((a) => a.key === key)).toMatchObject({
      status: 'closed',
      closeReason: 'other',
      actionNote: 'Buyer phoned the supplier',
    });
  });

  it('a supplier cannot close an alert', async () => {
    expect((await close('staleData|PK-PETB-8810|sup-007', 'x', sup007)).reason).toMatch(/ROLE_NOT_PERMITTED/);
  });
});
