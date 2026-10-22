import { describe, expect, it } from 'vitest';
import { MockProcurementService } from './MockProcurementService';
/** @import { QueryScope } from '../types' */
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';

// DRC-15a BR-04 (was REQ-E06-04 BR-12) — the planner reads every supplier; a
// supplier reads only its own rows, scoped in the service, never by the page.
// Pinned on the sample data by value (sample clock 2026-08-31).

const reads = new MockProcurementService();
/** @type {QueryScope} */
const buyer = { personaType: 'buyer', supplierId: null, businessRoles: PERSONA_SYSTEM_ROLES.buyer };
/**
 * @param {string} supplierId
 * @returns {QueryScope}
 */
const sup = (supplierId) => ({
  personaType: 'supplier',
  supplierId,
  businessRoles: PERSONA_SYSTEM_ROLES.supplier
});

describe('getFixedStockReconcile (the feedstock reconcile) — scoping and sample rows', () => {
  it('the planner reads every supplier, with the sample figures', async () => {
    const rows = (await reads.getFixedStockReconcile(buyer)).items;
    expect(new Set(rows.map((r) => r.supplierId)).size).toBeGreaterThan(1);
    // PO-2026-00123 (Rejected, 120,000) is left out of PO ordered; drafts
    // CO-2026-0012, -0018 and -0019 are left out of called off.
    expect(rows.find((r) => r.key === 'sup-007|PK-PETB-8801')).toMatchObject({
      asOf: '2026-08-31',
      poOrdered: 470_000,
      poNumbers: [
        'PO-2025-00107',
        'PO-2026-00122',
        'PO-2026-00124',
        'PO-2026-00125',
        'PO-2026-00127'
      ],
      calledOff: 208_000,
      asnRequested: 0,
      notYetCalledOff: 262_000,
      calledOffNotShipped: 208_000,
      maxStock: null,
      maxStockSettable: true
    });
    expect(rows.find((r) => r.key === 'sup-007|PK-PETB-8802')).toMatchObject({
      poOrdered: 320_000,
      poNumbers: ['PO-2025-00108', 'PO-2026-00121', 'PO-2026-00125', 'PO-2026-00126'],
      calledOff: 143_000
    });
    // A value-only PO line adds no quantity and is counted apart.
    expect(rows.find((r) => r.key === 'sup-003|FR-WARD-4410')).toMatchObject({
      poOrdered: 500,
      valueOnlyLines: 1,
      calledOff: 100,
      notYetCalledOff: 400
    });
  });

  it('a supplier reads only its own rows', async () => {
    const own = (await reads.getFixedStockReconcile(sup('sup-007'))).items;
    expect(own.map((r) => r.key)).toEqual(['sup-007|PK-PETB-8801', 'sup-007|PK-PETB-8802']);
    const other = (await reads.getFixedStockReconcile(sup('sup-002'))).items;
    expect(other.length).toBeGreaterThan(0);
    expect(other.every((r) => r.supplierId === 'sup-002')).toBe(true);
    expect((await reads.getFixedStockReconcile(sup('sup-999'))).items).toEqual([]);
  });

  it('DRC-15b [Proposed BL-207]: a supplier sees the liability flag on its own rows only', async () => {
    const own = (await reads.getFixedStockReconcile(sup('sup-007'))).items;
    expect(own.find((r) => r.key === 'sup-007|PK-PETB-8801')?.leftover).toEqual({
      rule: 'flagLiability',
      liabilityQty: 262_000,
      noMaxAgreed: true,
      carriedQty: null
    });
    expect(own.every((r) => r.supplierId === 'sup-007')).toBe(true);
    const all = (await reads.getFixedStockReconcile(buyer)).items;
    const othersFlagged = all.filter((r) => r.supplierId !== 'sup-007' && r.leftover.liabilityQty);
    expect(othersFlagged.length).toBeGreaterThan(0);
    for (const r of othersFlagged) expect(own.map((o) => o.key)).not.toContain(r.key);
  });
});
