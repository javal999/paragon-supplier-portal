// ────────────────────────────────────────────────────────────────────────────
// REQ-E08-05 `supplierBelowRop`, rewired (owner, 2026-10-19; DRC-D15, BL-196):
// on the real read path the alert compares the supplier's stock with the
// SYSTEM ROP Supplier (`systemRopSuppliers`), never the supplier-typed ROP.
// Probed both ways on the sample data: every alert that fires has a system
// figure above the stock, and every pair with a system figure above the stock
// fires; a pair whose system figure is "Not available" never fires.
// ────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import { activeAlertConditions, allPositions } from './inventoryReadModel';
import { systemRopSuppliers } from './osipRopReadModel';

describe('supplierBelowRop reads the system ROP Supplier', () => {
  const system = systemRopSuppliers();
  const fired = new Set(
    activeAlertConditions()
      .filter((c) => c.rule === 'supplierBelowRop')
      .map((c) => `${c.supplierId}|${c.subject}`)
  );
  const positions = allPositions();
  const expected = positions
    .filter((p) => {
      const rop = system.get(`${p.supplierId}|${p.materialCode}`)?.value ?? null;
      return p.supplierSoh !== null && rop !== null && p.supplierSoh < rop;
    })
    .map((p) => `${p.supplierId}|${p.materialCode}`);

  it('population: some pairs carry a system figure and some do not', () => {
    const withFigure = positions.filter(
      (p) => (system.get(`${p.supplierId}|${p.materialCode}`)?.value ?? null) !== null
    );
    expect(withFigure.length).toBeGreaterThan(0);
    expect(withFigure.length).toBeLessThan(positions.length);
  });

  it('the alerts that fire are exactly the pairs whose stock is below the system figure', () => {
    expect(expected.length).toBeGreaterThan(0);
    expect([...fired].sort()).toEqual([...expected].sort());
  });

  it('no pair without a system figure fires, whatever ROP the supplier typed', () => {
    for (const key of fired) expect(system.get(key)?.value ?? null).not.toBeNull();
  });
});
