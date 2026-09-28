import { describe, expect, it } from 'vitest';
import { MockProcurementService } from './MockProcurementService';
import type { QueryScope } from '../types';
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';

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
      ['packaging|2026-08-31|sup-007|PK-PETB-8801', 'underCalled', 11_600],
      ['packaging|2026-08-31|sup-007|PK-PETB-8802', 'balanced', 0],
      ['packaging|2026-08-10|sup-007|PK-PETB-8801', 'balanced', 0],
    ]);
    const first = rows[0];
    expect(first).toMatchObject({ committed: 99_600, calledOff: 88_000, held: 85_000, maxStock: null, final: false });
  });

  it('a supplier reads only its own rows', async () => {
    const own = (await reads.getFixedStockReconcile(sup('sup-007'))).items;
    expect(own.length).toBe(3);
    expect(own.every((r) => r.supplierId === 'sup-007')).toBe(true);
    expect((await reads.getFixedStockReconcile(sup('sup-002'))).items).toEqual([]);
  });
});
