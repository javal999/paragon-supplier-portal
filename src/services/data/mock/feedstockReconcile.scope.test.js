import { afterEach, describe, expect, it } from 'vitest';
import { MockProcurementService } from './MockProcurementService';
import { allPoOnHoldFigures } from './poOnHoldReadModel';
import { osipParamStore } from './stores/osipParamStore';
import { sdcClock } from '../../sdc';
import { NO_PERSON } from '@context/noPerson';
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

afterEach(() => {
  osipParamStore.reset();
  sdcClock.reset();
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
      // Released call-offs on the 100ml line: 0013, the BL-94 history and the
      // BL-360 extension. The drafts stay out.
      calledOff: 149_000
    });
    // A value-only PO line adds no quantity and is counted apart.
    expect(rows.find((r) => r.key === 'sup-003|FR-WARD-4410')).toMatchObject({
      poOrdered: 500,
      valueOnlyLines: 1,
      calledOff: 100,
      notYetCalledOff: 400
    });
  });

  it('PSC-6 BR-03/BR-04: every row carries its pair’s DA picture, the hold split and Total OSPO', async () => {
    const rows = (await reads.getFixedStockReconcile(buyer)).items;
    const figures = new Map(allPoOnHoldFigures().map((f) => [f.key, f]));
    // The join is complete: every row is a pair the PO On Hold read model knows.
    for (const r of rows) {
      expect(r.da, r.key).not.toBeNull();
      expect(r.daNotCalledOff, r.key).not.toBeNull();
      expect(r.totalOspo, r.key).not.toBeNull();
    }
    const row = rows.find((r) => r.key === 'sup-007|PK-PETB-8801');
    const fig = figures.get('sup-007|PK-PETB-8801');
    expect(row).toMatchObject({
      da: fig?.demand,
      daNotCalledOff: fig?.daNotCalledOff,
      // Hub day 2026-08-31: the quantity first appears today, so it is in grace
      // (PSC-6 BR-02) until day 15 — 14 CALENDAR days later (PSC-6 BR-06).
      inGraceQty: 117_700,
      inGraceUntil: '2026-09-14',
      onHoldQty: 0,
      onHoldSince: null
    });
    expect(row?.totalOspo).toBe(Math.min(fig?.ospo ?? 0, fig?.daNotCalledOff ?? 0) + 117_700);
  });

  it('PSC-6 BR-02: when the grace ends the quantity leaves In grace for PO On Hold', async () => {
    const key = 'sup-007|PK-PETB-8801';
    const first = (await reads.getFixedStockReconcile(buyer)).items.find((r) => r.key === key);
    expect(first).toMatchObject({ inGraceQty: 117_700, onHoldQty: 0, onHoldSince: null });
    // Grace 0 on the pair: the episode is over on its own first day.
    osipParamStore.append({
      key: `grace|${key}`,
      param: 'grace',
      value: 0,
      previous: null,
      reason: null,
      setAt: sdcClock.now(),
      setBy: NO_PERSON
    });
    const fig = allPoOnHoldFigures().find((f) => f.key === key);
    const later = (await reads.getFixedStockReconcile(buyer)).items.find((r) => r.key === key);
    expect(later).toMatchObject({
      inGraceQty: 0,
      inGraceUntil: null,
      onHoldQty: fig?.qty,
      onHoldSince: '2026-08-31'
    });
    expect(later?.onHoldQty).toBe(117_700);
  });

  it('AC-04 (PSC-6): a pair with no PO On Hold quantity still reads its DA and Total OSPO', async () => {
    // A reconcile row whose pair has nothing on hold keeps its DA columns and
    // Total OSPO = min(OSPO, DA not yet called off) (PSC-6 BR-04, AC-04).
    const rows = (await reads.getFixedStockReconcile(buyer)).items;
    const figures = new Map(allPoOnHoldFigures().map((f) => [f.key, f]));
    const key = rows.map((r) => r.key).find((k) => figures.get(k)?.qty === 0);
    expect(key, 'a sample pair with nothing on hold').toBeDefined();
    const fig = figures.get(key ?? '');
    expect(rows.find((r) => r.key === key)).toMatchObject({
      da: fig?.demand,
      daNotCalledOff: fig?.daNotCalledOff,
      inGraceQty: 0,
      onHoldQty: 0,
      totalOspo: Math.min(fig?.ospo ?? 0, fig?.daNotCalledOff ?? 0)
    });
  });

  it('a supplier reads only its own rows', async () => {
    const own = (await reads.getFixedStockReconcile(sup('sup-007'))).items;
    // 2000028400 is the E2E walkthrough pair (fixtures/walkthroughSstp.js).
    expect(own.map((r) => r.key)).toEqual([
      'sup-007|2000028400',
      'sup-007|PK-PETB-8801',
      'sup-007|PK-PETB-8802'
    ]);
    const other = (await reads.getFixedStockReconcile(sup('sup-002'))).items;
    expect(other.length).toBeGreaterThan(0);
    expect(other.every((r) => r.supplierId === 'sup-002')).toBe(true);
    expect((await reads.getFixedStockReconcile(sup('sup-999'))).items).toEqual([]);
  });
});
