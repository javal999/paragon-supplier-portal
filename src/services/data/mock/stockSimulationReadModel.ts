// ────────────────────────────────────────────────────────────────────────────
// Material E2 · THE STOCK SIMULATION READ MODEL (MR-7 section e; plan AD-1).
//
// ONE place gathers E1's inputs from the stores — the stock records, ASNs,
// to-distributor legs, call-offs, capacity, planning groups, the supplier ×
// material relationships and the planner's inputs — and hands them to the pure
// `simulateSupplierStock`, once per supplier × material. Nothing is stored.
//
// The rows are the inventory page's pairs (`assignments`), plus any pair a
// planner has entered a figure for, plus ONE labelled sample row: the MR-7 9g
// worked example on its own sample inputs (`fixtures/stockSimulationSample`),
// computed on a world of its own so it can touch no other row.
// ────────────────────────────────────────────────────────────────────────────

import type { QueryScope, StockSimulationFilter, StockSimulationRow } from '../types';
import { SUPPLIER_MATERIAL_RELATIONSHIPS, materialEntry, sdcClock } from '../../sdc';
import { callOffViews } from '../../transitions/callOffRules';
import { dayOf } from '../../transitions/inventoryRules';
import {
  isSimulationRefusal,
  simulateSupplierStock,
  type SimulationWorld,
} from '../../transitions/simulateSupplierStock';
import { assignments, supplierNameOf } from './inventoryReadModel';
import { withMrpController } from './mrpControllerReadModel';
import { inventoryDeclarationStore } from './stores/inventoryDeclarationStore';
import { asnStore } from './stores/asnStore';
import { callOffStore } from './stores/callOffStore';
import { goodsReceiptStore } from './stores/goodsReceiptStore';
import { incomingShipmentStore } from './stores/incomingShipmentStore';
import { capacityStore } from './stores/inventoryHubStores';
import { simulationOverrideStore } from './stores/simulationOverrideStore';
import {
  SAMPLE_ASN,
  SAMPLE_CALL_OFF,
  SAMPLE_DECLARATION,
  SAMPLE_RELATIONSHIP,
  SAMPLE_TO_DISTRIBUTOR,
  SIMULATION_SAMPLE_MATERIAL,
  SIMULATION_SAMPLE_SUPPLIER,
  sampleCapacity,
} from './fixtures/stockSimulationSample';

const planningGroupOf = (code: string): string | null => materialEntry(code)?.planningGroupId ?? null;

/** E1's inputs, as the stores hold them now. */
export function simulationWorld(nowIso: string = sdcClock.now()): SimulationWorld {
  return {
    nowIso,
    declarations: inventoryDeclarationStore.all(),
    asns: asnStore.all(),
    shipments: incomingShipmentStore.all(),
    callOffViews: callOffViews(callOffStore.all(), asnStore.all(), goodsReceiptStore.all(), nowIso),
    capacitySubmissions: capacityStore.all(),
    planningGroupOf,
    relationships: SUPPLIER_MATERIAL_RELATIONSHIPS,
  };
}

/** The sample row's world: the 9g inputs only. */
export function sampleWorld(nowIso: string = sdcClock.now()): SimulationWorld {
  const group = planningGroupOf(SIMULATION_SAMPLE_MATERIAL);
  return {
    nowIso,
    declarations: [SAMPLE_DECLARATION],
    asns: [SAMPLE_ASN],
    shipments: [SAMPLE_TO_DISTRIBUTOR],
    callOffViews: [{ callOff: SAMPLE_CALL_OFF, delivery: 'notDue' }],
    capacitySubmissions: group ? [sampleCapacity(group)] : [],
    planningGroupOf,
    relationships: [SAMPLE_RELATIONSHIP],
  };
}

const key = (s: string, m: string) => `${s}|${m}`;
const SAMPLE_KEY = key(SIMULATION_SAMPLE_SUPPLIER, SIMULATION_SAMPLE_MATERIAL);

/** The rows at a check date, PTI's view. A supplier scope reads none (PTI's estimate). */
export function stockSimulationRows(
  scope: QueryScope,
  checkDate?: string,
  filter?: StockSimulationFilter,
  nowIso: string = sdcClock.now(),
): StockSimulationRow[] {
  if (scope.personaType !== 'buyer') return [];
  const day = checkDate ?? dayOf(nowIso);
  const overrides = simulationOverrideStore.all();

  const pairs = new Map<string, { supplierId: string; materialCode: string }>();
  for (const a of assignments()) pairs.set(key(a.supplierId, a.materialCode), a);
  // A pair a planner entered a figure for is simulated too (MR-7 BR-06).
  for (const o of overrides) {
    const k = key(o.supplierId, o.materialCode);
    if (!pairs.has(k) && materialEntry(o.materialCode)) pairs.set(k, { supplierId: o.supplierId, materialCode: o.materialCode });
  }
  pairs.delete(SAMPLE_KEY);

  const real = simulationWorld(nowIso);
  const sample = sampleWorld(nowIso);
  const rowFor = (supplierId: string, materialCode: string, world: SimulationWorld, isSample: boolean): StockSimulationRow | null => {
    const entry = materialEntry(materialCode);
    if (!entry) return null;
    const result = simulateSupplierStock({ supplierId, materialCode, checkDate: day, overrides }, world);
    const row: StockSimulationRow = {
      supplierId,
      supplierName: supplierNameOf(supplierId),
      materialCode,
      materialLabel: entry.label,
      uom: entry.canonicalUom,
      planningGroupId: entry.planningGroupId ?? null,
      distributor: world.relationships.some(
        (r) => r.supplierId === supplierId && r.materialCode === materialCode && r.supplierType === 'distributor',
      ),
      sample: isSample,
      simulation: isSimulationRefusal(result) ? null : result,
      refusal: isSimulationRefusal(result) ? result : null,
    };
    return withMrpController(row, materialCode, scope);
  };

  const rows = [...pairs.values()]
    .map((p) => rowFor(p.supplierId, p.materialCode, real, false))
    .filter((r): r is StockSimulationRow => r !== null)
    .sort((a, b) => a.supplierName.localeCompare(b.supplierName) || a.materialCode.localeCompare(b.materialCode));
  const sampleRow = rowFor(SIMULATION_SAMPLE_SUPPLIER, SIMULATION_SAMPLE_MATERIAL, sample, true);
  return [...(sampleRow ? [sampleRow] : []), ...rows].filter(
    (r) =>
      (!filter?.supplierId || r.supplierId === filter.supplierId) &&
      (!filter?.planningGroupId || r.planningGroupId === filter.planningGroupId),
  );
}
