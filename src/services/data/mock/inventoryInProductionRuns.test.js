// ─────────────────────────────────────────────────────────────────────────────
// BL-358 (PSC-2 AC-02 follow-up) — the stock record carries MORE THAN ONE
// production run, and the real read projects every one of them.
//
// Before this batch the declaration held one `inProductionQty` + completion
// date, so the drawer and the download could only ever show one run whatever
// they supported; the PSC-2 AC-02 two-run case was proven with a seeded read
// alone. Here the seeded mock record (PK-PETB-8801, two runs) and a declared
// record both project N `production` entries through the SAME read the pages
// use, and the column figures (`entryFigures`) and the download follow.
// ─────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService } from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import { inventoryDeclarationStore } from './stores/inventoryDeclarationStore';
import { mockInventory } from '@data/mockInventory';
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { sdcClock } from '../../sdc';
import { NO_PERSON } from '@context/noPerson';
import { entryFigures, stockEntriesCsv } from '../../../pages-v2/inventory/SupplierStockDrawer';

const svc = new MockCommandService();
const reads = new MockProcurementService();

/** @type {import('../types').QueryScope} */
const sup007 = {
  personaType: 'supplier',
  supplierId: 'sup-007',
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON
};

const CODE = 'PK-PETB-8801';
const DECLARED = 'PK-PETB-8802';

/** The seeded runs of the record under test, dates already shifted. */
const seededRuns = () => mockInventory.find((r) => r.materialCode === CODE)?.inProductionRuns ?? [];

/** @param {string} materialCode */
const positionOf = async (materialCode) =>
  (await reads.getInventory(sup007)).items.find(
    (p) => p.supplierId === 'sup-007' && p.materialCode === materialCode
  );

beforeEach(() => {
  inventoryDeclarationStore.reset();
  sdcClock.reset();
});

describe('BL-358 — the real mock read carries two production runs', () => {
  it('the seeded record yields one production entry per run, each with its own date', async () => {
    const runs = seededRuns();
    // POPULATION — the seed really holds two dated runs, not a rewritten pair.
    expect(runs).toHaveLength(2);
    expect(runs.every((r) => typeof r.completionDate === 'string' && r.completionDate !== '')).toBe(
      true
    );
    const p = /** @type {import('../types').InventoryPosition} */ (await positionOf(CODE));
    const production = p.incoming.filter((i) => i.source === 'production');
    expect(production).toEqual(
      runs.map((r) => ({
        source: 'production',
        date: r.completionDate,
        quantity: r.quantity,
        reference: null
      }))
    );
    // The figures the In Production column shows follow from those entries: the
    // sum, and the LATEST run date (BR-03).
    const dates = runs.map((r) => /** @type {string} */ (r.completionDate)).sort();
    const latest = dates[dates.length - 1];
    const figures = entryFigures(production, 'latest');
    expect(figures.total).toBe(60000);
    expect(figures.nextDate).toBe(latest);
  });

  it('the download flattens both runs, one row each with its own date', async () => {
    const p = /** @type {import('../types').InventoryPosition} */ (await positionOf(CODE));
    const csv = stockEntriesCsv([p], 'en');
    const productionLines = csv
      .trim()
      .split('\n')
      .filter((line) => line.includes('In Production'));
    expect(productionLines).toHaveLength(2);
    for (const run of seededRuns()) {
      expect(csv).toContain(run.completionDate);
      expect(csv).toContain(String(run.quantity));
    }
  });
});

describe('BL-358 — the write path stores the runs it is given', () => {
  /**
   * @param {Record<string, unknown>} payload
   * @returns {Promise<import('../types').CommandResult>}
   */
  const declare = (payload) =>
    svc.dispatch(sup007, {
      transitionId: 't_inventorydeclaration_declare',
      entity: 'inventoryDeclaration',
      payload: { supplierId: 'sup-007', inProductionQty: 0, ...payload }
    });

  it('a declaration with two runs is stored and read back as two entries', async () => {
    const res = await declare({
      materialCode: DECLARED,
      totalQty: 22000,
      inProductionRuns: [
        { quantity: 100, completionDate: '2026-09-10' },
        { quantity: 250, completionDate: '2026-09-18' }
      ]
    });
    expect(res.status).toBe('done');
    const stored = inventoryDeclarationStore.get(/** @type {string} */ (res.entityId));
    expect(stored?.inProductionRuns).toEqual([
      { quantity: 100, completionDate: '2026-09-10' },
      { quantity: 250, completionDate: '2026-09-18' }
    ]);
    const p = /** @type {import('../types').InventoryPosition} */ (await positionOf(DECLARED));
    expect(p.incoming.filter((i) => i.source === 'production')).toEqual([
      { source: 'production', date: '2026-09-10', quantity: 100, reference: null },
      { source: 'production', date: '2026-09-18', quantity: 250, reference: null }
    ]);
    expect(
      entryFigures(
        p.incoming.filter((i) => i.source === 'production'),
        'latest'
      )
    ).toEqual({
      entries: [
        { source: 'production', date: '2026-09-10', quantity: 100, reference: null },
        { source: 'production', date: '2026-09-18', quantity: 250, reference: null }
      ],
      total: 350,
      nextDate: '2026-09-18'
    });
  });

  it('a run above 0 without its own date is refused by name, and nothing is stored', async () => {
    const before = inventoryDeclarationStore.all().length;
    const res = await declare({
      materialCode: DECLARED,
      totalQty: 22000,
      inProductionRuns: [{ quantity: 5 }]
    });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/production run above 0 needs its own completion date/);
    expect(inventoryDeclarationStore.all()).toHaveLength(before);
  });

  it('runs supersede a single pair supplied in the same declaration', async () => {
    const res = await declare({
      materialCode: DECLARED,
      totalQty: 22000,
      inProductionQty: 999,
      productionCompletionDate: '2026-09-30',
      inProductionRuns: [
        { quantity: 10, completionDate: '2026-09-11' },
        { quantity: 20, completionDate: '2026-09-21' }
      ]
    });
    expect(res.status).toBe('done');
    const p = /** @type {import('../types').InventoryPosition} */ (await positionOf(DECLARED));
    expect(p.incoming.filter((i) => i.source === 'production').map((i) => i.quantity)).toEqual([
      10, 20
    ]);
  });
});

describe('BL-358 — the single pair stays the fallback', () => {
  it('a declaration that carries only the pair still yields one production entry', async () => {
    // sup-002 RM-STEAR-7300 is seeded with the single pair — the shape every
    // record predating the run list still has.
    const seed = mockInventory.find(
      (r) => r.supplierId === 'sup-002' && r.materialCode === 'RM-STEAR-7300'
    );
    // POPULATION — this row really is the fallback shape.
    expect(seed?.inProductionRuns).toBeUndefined();
    expect(seed?.inProductionQty).toBe(6000);
    /** @type {import('../types').QueryScope} */
    const buyer = {
      personaType: 'buyer',
      supplierId: null,
      businessRoles: PERSONA_SYSTEM_ROLES.buyer,
      actor: NO_PERSON
    };
    const p = /** @type {import('../types').InventoryPosition} */ (
      (await reads.getInventory(buyer)).items.find(
        (row) => row.supplierId === 'sup-002' && row.materialCode === 'RM-STEAR-7300'
      )
    );
    expect(p.incoming.filter((i) => i.source === 'production')).toEqual([
      {
        source: 'production',
        date: seed?.productionCompletionDate,
        quantity: 6000,
        reference: null
      }
    ]);
  });
});
