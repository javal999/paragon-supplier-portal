// ────────────────────────────────────────────────────────────────────────────
// REQ-E08-05 `supplierBelowRop`, rewired (owner, 2026-10-19; DRC-D15, BL-196):
// on the real read path the alert compares the supplier's stock with the
// SYSTEM ROP Supplier (`systemRopSuppliers`), never the supplier-typed ROP.
// Probed both ways on the sample data: every alert that fires has a system
// figure above the stock, and every pair with a system figure above the stock
// fires; a pair whose system figure is "Not available" never fires.
//
// [Team B10, 2026-10-28] ROP Supplier = demand × the supplier's bottleneck
// production lead time, a value the planner sets per supplier × material (no
// default). With none set, no pair has a system figure and the alert is quiet;
// the probe sets one for half the pairs, through the ledger the verb writes.
// ────────────────────────────────────────────────────────────────────────────

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NO_PERSON } from '@context/noPerson';
import { activeAlertConditions, allPositions } from './inventoryReadModel';
import { systemRopSuppliers } from './osipRopReadModel';
import { osipParamStore } from './stores/osipParamStore';
import { osipParamKey } from '../../transitions/osipParams';

/** The alert's pairs that fire, and the pairs whose stock is below the system figure. */
const read = () => {
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
  return { system, fired, positions, expected };
};

describe('[Team B10] with no bottleneck lead time set', () => {
  it('no pair has a system ROP Supplier, and the alert never fires', () => {
    osipParamStore.reset();
    const { system, fired } = read();
    expect(
      [...system.values()].every(
        (f) => f.unavailable === 'NO_BOTTLENECK_LEAD_TIME' || f.value === null
      )
    ).toBe(true);
    expect(fired.size).toBe(0);
  });
});

describe('supplierBelowRop reads the system ROP Supplier', () => {
  beforeAll(() => {
    osipParamStore.reset();
    // A long bottleneck lead time (60 days) on every other pair.
    allPositions().forEach((p, i) => {
      if (i % 2 !== 0) return;
      osipParamStore.append({
        key: osipParamKey('bottleneckLeadTimeDays', {
          supplierId: p.supplierId,
          materialCode: p.materialCode
        }),
        param: 'bottleneckLeadTimeDays',
        value: 60,
        previous: null,
        setAt: '2026-08-31T03:00:00.000Z',
        setBy: NO_PERSON
      });
    });
  });
  afterAll(() => osipParamStore.reset());

  it('population: some pairs carry a system figure and some do not', () => {
    const { system, positions } = read();
    const withFigure = positions.filter(
      (p) => (system.get(`${p.supplierId}|${p.materialCode}`)?.value ?? null) !== null
    );
    expect(withFigure.length).toBeGreaterThan(0);
    expect(withFigure.length).toBeLessThan(positions.length);
  });

  it('the alerts that fire are exactly the pairs whose stock is below the system figure', () => {
    const { fired, expected } = read();
    expect(expected.length).toBeGreaterThan(0);
    expect([...fired].sort()).toEqual([...expected].sort());
  });

  it('no pair without a system figure fires, whatever ROP the supplier typed', () => {
    const { system, fired } = read();
    for (const key of fired) expect(system.get(key)?.value ?? null).not.toBeNull();
  });
});
