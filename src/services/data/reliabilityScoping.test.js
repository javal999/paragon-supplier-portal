// ─────────────────────────────────────────────────────────────────────────────
// REQ-E14-02 BR-07 / AC-03 (owner ENG-D3) — through the DATA-SERVICE SCOPING
// CONTRACT, a supplier reaches only its own reliability row, and that row
// carries PTI's plan-change figure for its own materials. Another supplier's
// figures are unreachable, not merely hidden by a page.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import { mockDataService as svc } from './mock/mockDataService';
/** @import { QueryScope } from './types' */
import { PERSONA_SYSTEM_ROLES } from '../transitions/businessRoles';

/** @type {QueryScope} */
const buyer = { personaType: 'buyer', supplierId: null, businessRoles: PERSONA_SYSTEM_ROLES.buyer };
/**
 * @param {string | null} id
 * @returns {QueryScope}
 */
const supplier = (id) => ({
  personaType: 'supplier',
  supplierId: id,
  businessRoles: PERSONA_SYSTEM_ROLES.supplier
});

describe('getSupplierReliability — the scoping contract', () => {
  it('the planner reads every supplier in the engine dataset (population control, by membership)', async () => {
    const ids = (await svc.procurement.getSupplierReliability(buyer)).items.map(
      (r) => r.supplierId
    );
    expect(ids).toContain('sup-007');
    expect(ids).toContain('sup-002');
    expect(ids).toContain('sup-005');
    expect(ids.length).toBeGreaterThan(3);
  });

  it.each(['sup-007', 'sup-002', 'sup-005'])(
    'supplier %s reads exactly ONE row — its own — with its own plan-change figure',
    async (id) => {
      const all = (await svc.procurement.getSupplierReliability(buyer)).items;
      const mine = (await svc.procurement.getSupplierReliability(supplier(id))).items;
      expect(mine.map((r) => r.supplierId)).toEqual([id]);
      // The same figures the planner sees for this supplier — scoped, not recomputed differently.
      expect(mine[0]).toEqual(all.find((r) => r.supplierId === id));
      expect(mine[0].planChange.schedules).toBeGreaterThan(0);
    }
  );

  it('no supplier scope can reach another supplier’s row, in either window', async () => {
    for (const weeks of /** @type {const} */ ([13, 26])) {
      const a = (await svc.procurement.getSupplierReliability(supplier('sup-007'), weeks)).items;
      const b = (await svc.procurement.getSupplierReliability(supplier('sup-002'), weeks)).items;
      expect(a.every((r) => r.supplierId === 'sup-007')).toBe(true);
      expect(b.every((r) => r.supplierId === 'sup-002')).toBe(true);
      expect(a.some((r) => r.supplierId === 'sup-002')).toBe(false);
    }
  });

  it('a supplier outside the dataset, and a supplier seat with no id, read nothing', async () => {
    expect((await svc.procurement.getSupplierReliability(supplier('sup-020'))).items).toEqual([]);
    expect((await svc.procurement.getSupplierReliability(supplier(null))).items).toEqual([]);
  });
});
