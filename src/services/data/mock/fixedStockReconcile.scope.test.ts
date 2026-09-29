import { describe, expect, it } from 'vitest';
import { MockProcurementService } from './MockProcurementService';
import type { QueryScope } from '../types';
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { callOffStore } from './stores/callOffStore';
import { reconcileCallOff } from './fixedStockReadModel';

// REQ-E06-04 BR-12 — the planner reads every supplier; a supplier reads only its
// own rows, scoped in the service. Pinned on the sample data by value (the
// sample clock is 2026-08-31, so the first packaging cycle is running and the
// September raw-material month has not started).

const reads = new MockProcurementService();
const buyer: QueryScope = { personaType: 'buyer', supplierId: null, businessRoles: PERSONA_SYSTEM_ROLES.buyer };
const sup = (supplierId: string): QueryScope => ({
  personaType: 'supplier',
  supplierId,
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
});

describe('getFixedStockReconcile — scoping and sample rows', () => {
  it('the planner reads every row, with the sample outcomes', async () => {
    const rows = (await reads.getFixedStockReconcile(buyer)).items;
    expect(rows.map((r) => [r.key, r.outcome, r.liabilityQty])).toEqual([
      ['packaging|2026-08-31|sup-007|PK-PETB-8801', 'underCalled', 54_500],
      ['packaging|2026-08-10|sup-007|PK-PETB-8801', 'notCommitted', 0],
      ['packaging|2026-08-31|sup-007|PK-PETB-8802', 'balanced', 0],
    ]);
    // Only the deliveries the supplier accepted count (owner, 2026-09-29).
    expect(rows[0]).toMatchObject({
      committed: 99_600,
      calledOff: 45_100,
      callOffNumbers: ['CO-2026-0002', 'CO-2026-0005', 'CO-2026-0006', 'CO-2026-0015', 'CO-2026-0017'],
      awaitingSupplier: 1,
      awaitingPti: 3,
      uncalled: 54_500,
      held: 85_000,
      maxStock: null,
      final: false,
    });
    // Never a negative "not called off" (owner, 2026-09-29).
    expect(rows[2]).toMatchObject({ uncalled: 0, calledBeyond: 20_500 });
  });

  it('a supplier reads only its own rows', async () => {
    const own = (await reads.getFixedStockReconcile(sup('sup-007'))).items;
    expect(own.length).toBe(3);
    expect(own.every((r) => r.supplierId === 'sup-007')).toBe(true);
    expect((await reads.getFixedStockReconcile(sup('sup-002'))).items).toEqual([]);
  });
});

describe('reconcileCallOff — BR-04, read through the call-off rules', () => {
  const byId = (id: string) => reconcileCallOff(callOffStore.all().find((c) => c.id === id)!);

  it('an accepted confirmation counts its own deliveries, not the requested quantity', () => {
    // co-0005: 10,000 requested, the supplier confirmed 10,500 with changes, accepted automatically.
    expect(byId('co-0005')).toMatchObject({ agreed: [{ quantity: 10_500, date: '2026-09-02' }], pending: null });
  });

  it('awaiting the supplier, and a counter-offer awaiting PTI, count nothing and say why', () => {
    expect(byId('co-0003')).toMatchObject({ agreed: [], pending: 'supplier' });
    expect(byId('co-0004')).toMatchObject({ agreed: [], pending: 'pti' });
  });

  it('a rejected call-off and a draft count nothing and are not pending', () => {
    expect(byId('co-0011')).toMatchObject({ agreed: [], pending: null });
    expect(byId('co-0012')).toMatchObject({ agreed: [], pending: null });
  });
});
