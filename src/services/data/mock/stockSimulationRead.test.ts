// ────────────────────────────────────────────────────────────────────────────
// Material E2 — `getStockSimulation`, the read behind the stock simulation
// page (MR-7 section e): E1's inputs gathered from the stores, the labelled
// sample row reproducing section 9g, PTI-only, the planner's input reaching
// the row, the filters and the forward-only check date.
// ────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { MockProcurementService } from './MockProcurementService';
import { MockCommandService } from './MockCommandService';
import { simulationOverrideStore } from './stores/simulationOverrideStore';
import { inventoryDeclarationStore } from './stores/inventoryDeclarationStore';
import type { QueryScope, StockSimulationRow } from '../types';
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { materialEntry, sdcClock } from '../../sdc';
import { NO_PERSON } from '@context/noPerson';
import {
  SIMULATION_SAMPLE_CHECK_DATE,
  SIMULATION_SAMPLE_MATERIAL,
  SIMULATION_SAMPLE_SUPPLIER,
} from './fixtures/stockSimulationSample';

const reads = new MockProcurementService();
const commands = new MockCommandService();
const planner: QueryScope = { personaType: 'buyer', supplierId: null, businessRoles: ['planning'], actor: NO_PERSON };
const sup002: QueryScope = { personaType: 'supplier', supplierId: 'sup-002', businessRoles: PERSONA_SYSTEM_ROLES.supplier, actor: NO_PERSON };

const sampleOf = (rows: readonly StockSimulationRow[]) =>
  rows.find((r) => r.supplierId === SIMULATION_SAMPLE_SUPPLIER && r.materialCode === SIMULATION_SAMPLE_MATERIAL)!;

beforeEach(() => {
  simulationOverrideStore.reset();
  inventoryDeclarationStore.reset();
  sdcClock.reset();
});

describe('getStockSimulation', () => {
  it('the labelled sample row reproduces the worked example (9g): 8,300 · 3,000 · 5,300 · 1,200', async () => {
    for (const date of [undefined, SIMULATION_SAMPLE_CHECK_DATE]) {
      const row = sampleOf((await reads.getStockSimulation(planner, date)).items);
      expect(row.sample).toBe(true);
      expect(row.distributor).toBe(true);
      const s = row.simulation!;
      expect([s.available, s.calledOffNotShipped, s.freeToCallOff, s.ptiInbound]).toEqual([8300, 3000, 5300, 1200]);
      expect(s.cappedByCapacity).toBe(true);
      expect(s.components.find((c) => c.kind === 'inProduction')).toMatchObject({ qty: 2500, uncappedQty: 3000 });
      expect(s.components.find((c) => c.kind === 'asnShipped')?.qty).toBe(-1200);
      expect(s.components.find((c) => c.kind === 'toDistributor')?.qty).toBe(2000);
      expect(s.weekly).toHaveLength(13);
    }
  });

  it('lists the inventory pairs besides the sample, with their names; only the sample row is a sample', async () => {
    const rows = (await reads.getStockSimulation(planner)).items;
    const glycerin = rows.find((r) => r.supplierId === 'sup-002' && r.materialCode === 'RM-EMUL-3310')!;
    expect(glycerin).toMatchObject({ supplierName: 'PT Sample Specialty Fats', sample: false, distributor: false });
    expect(glycerin.planningGroupId).toBe(materialEntry('RM-EMUL-3310')!.planningGroupId);
    expect(glycerin.simulation?.available).toBe(4000);
    expect(rows.filter((r) => r.sample)).toHaveLength(1);
  });

  it('a supplier scope reads nothing: the simulation is PTI\'s estimate', async () => {
    expect((await reads.getStockSimulation(sup002)).items).toEqual([]);
  });

  it('a planner input reaches its row with who and when, and the basis says so (MR-7 step 5, BR-08)', async () => {
    const res = await commands.dispatch(planner, {
      transitionId: 't_simulation_override_set',
      entity: 'simulationOverride',
      payload: { supplierId: SIMULATION_SAMPLE_SUPPLIER, materialCode: SIMULATION_SAMPLE_MATERIAL, field: 'soh', value: 6000 },
    });
    expect(res.status, res.reason).toBe('done');
    const s = sampleOf((await reads.getStockSimulation(planner)).items).simulation!;
    expect(s.basis).toBe('plannerInput');
    expect(s.available).toBe(9300);
    expect(s.components.find((c) => c.kind === 'soh')?.plannerInput).toMatchObject({ enteredBy: NO_PERSON, enteredAt: sdcClock.now() });
  });

  it('filters by supplier and by planning group', async () => {
    const bySupplier = (await reads.getStockSimulation(planner, undefined, { supplierId: 'sup-007' })).items;
    expect(bySupplier.length).toBeGreaterThan(0);
    expect(bySupplier.every((r) => r.supplierId === 'sup-007')).toBe(true);
    const group = materialEntry(SIMULATION_SAMPLE_MATERIAL)!.planningGroupId!;
    const byGroup = (await reads.getStockSimulation(planner, undefined, { planningGroupId: group })).items;
    expect(byGroup.map((r) => r.materialCode)).toContain(SIMULATION_SAMPLE_MATERIAL);
    expect(byGroup.every((r) => r.planningGroupId === group)).toBe(true);
  });

  it('a check date before the latest update is refused on that row (edge case 6); a valid one is not', async () => {
    const before = sampleOf((await reads.getStockSimulation(planner, '2026-08-20')).items);
    expect(before.simulation).toBeNull();
    expect(before.refusal?.refusal).toBe('CHECK_DATE_BEFORE_LAST_UPDATE');
    const on = sampleOf((await reads.getStockSimulation(planner, '2026-08-27')).items);
    expect(on.refusal).toBeNull();
  });

  it('load time at fixture volume (plan section 1.1 input 2) — measured, not asserted', async () => {
    const runs = 20;
    const t0 = performance.now();
    let n = 0;
    for (let i = 0; i < runs; i += 1) n = (await reads.getStockSimulation(planner)).items.length;
    const perRead = (performance.now() - t0) / runs;
    // eslint-disable-next-line no-console
    console.info(`[E2 load time] getStockSimulation: ${n} rows, ${perRead.toFixed(2)} ms per read (mean of ${runs})`);
    expect(n).toBeGreaterThan(1);
  });
});
