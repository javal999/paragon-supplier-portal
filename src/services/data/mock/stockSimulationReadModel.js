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

/** @import { QueryScope, StockSimulationFilter, StockSimulationRow } from '../types' */
import { SUPPLIER_MATERIAL_RELATIONSHIPS, materialEntry, sdcClock } from '../../sdc';
import { callOffViews } from '../../transitions/callOffRules';
import { dayOf } from '../../transitions/inventoryRules';
/** @import { SimulationWorld } from '../../transitions/simulateSupplierStock' */
import {
  isSimulationRefusal,
  simulateSupplierStock
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
  sampleCapacity
} from './fixtures/stockSimulationSample';

/**
 * @param {string} code
 * @returns {string | null}
 */
const planningGroupOf = (code) => materialEntry(code)?.planningGroupId ?? null;

/**
 * E1's inputs, as the stores hold them now.
 * @param {string} [nowIso]
 * @returns {SimulationWorld}
 */
export function simulationWorld(nowIso = sdcClock.now()) {
  return {
    nowIso,
    declarations: inventoryDeclarationStore.all(),
    asns: asnStore.all(),
    shipments: incomingShipmentStore.all(),
    callOffViews: callOffViews(callOffStore.all(), asnStore.all(), goodsReceiptStore.all(), nowIso),
    capacitySubmissions: capacityStore.all(),
    planningGroupOf,
    relationships: SUPPLIER_MATERIAL_RELATIONSHIPS
  };
}

/**
 * The sample row's world: the 9g inputs only.
 * @param {string} [nowIso]
 * @returns {SimulationWorld}
 */
export function sampleWorld(nowIso = sdcClock.now()) {
  const group = planningGroupOf(SIMULATION_SAMPLE_MATERIAL);
  return {
    nowIso,
    declarations: [SAMPLE_DECLARATION],
    asns: [SAMPLE_ASN],
    shipments: [SAMPLE_TO_DISTRIBUTOR],
    callOffViews: [{ callOff: SAMPLE_CALL_OFF, delivery: 'notDue' }],
    capacitySubmissions: group ? [sampleCapacity(group)] : [],
    planningGroupOf,
    relationships: [SAMPLE_RELATIONSHIP]
  };
}

/**
 * @param {string} s
 * @param {string} m
 */
const key = (s, m) => `${s}|${m}`;
const SAMPLE_KEY = key(SIMULATION_SAMPLE_SUPPLIER, SIMULATION_SAMPLE_MATERIAL);

/**
 * The rows at a check date, PTI's view. A supplier scope reads none (PTI's estimate).
 * @param {QueryScope} scope
 * @param {string} [checkDate]
 * @param {StockSimulationFilter} [filter]
 * @param {string} [nowIso]
 * @returns {StockSimulationRow[]}
 */
export function stockSimulationRows(scope, checkDate, filter, nowIso = sdcClock.now()) {
  if (scope.personaType !== 'buyer') return [];
  const day = checkDate ?? dayOf(nowIso);
  const overrides = simulationOverrideStore.all();

  const pairs = /** @type {Map<string, { supplierId: string; materialCode: string }>} */ (
    new Map()
  );
  for (const a of assignments()) pairs.set(key(a.supplierId, a.materialCode), a);
  // A pair a planner entered a figure for is simulated too (MR-7 BR-06).
  for (const o of overrides) {
    const k = key(o.supplierId, o.materialCode);
    if (!pairs.has(k) && materialEntry(o.materialCode))
      pairs.set(k, { supplierId: o.supplierId, materialCode: o.materialCode });
  }
  pairs.delete(SAMPLE_KEY);

  const real = simulationWorld(nowIso);
  const sample = sampleWorld(nowIso);
  /**
   * @param {string} supplierId
   * @param {string} materialCode
   * @param {SimulationWorld} world
   * @param {boolean} isSample
   * @returns {StockSimulationRow | null}
   */
  const rowFor = (supplierId, materialCode, world, isSample) => {
    const entry = materialEntry(materialCode);
    if (!entry) return null;
    const result = simulateSupplierStock(
      { supplierId, materialCode, checkDate: day, overrides },
      world
    );
    /** @type {StockSimulationRow} */
    const row = {
      supplierId,
      supplierName: supplierNameOf(supplierId),
      materialCode,
      materialLabel: entry.label,
      uom: entry.canonicalUom,
      planningGroupId: entry.planningGroupId ?? null,
      distributor: world.relationships.some(
        (r) =>
          r.supplierId === supplierId &&
          r.materialCode === materialCode &&
          r.supplierType === 'distributor'
      ),
      sample: isSample,
      simulation: isSimulationRefusal(result) ? null : result,
      refusal: isSimulationRefusal(result) ? result : null
    };
    return withMrpController(row, materialCode, scope);
  };

  const rows = [...pairs.values()]
    .map((p) => rowFor(p.supplierId, p.materialCode, real, false))
    .filter(/** @returns {r is StockSimulationRow} */ (r) => r !== null)
    .sort(
      (a, b) =>
        a.supplierName.localeCompare(b.supplierName) || a.materialCode.localeCompare(b.materialCode)
    );
  const sampleRow = rowFor(SIMULATION_SAMPLE_SUPPLIER, SIMULATION_SAMPLE_MATERIAL, sample, true);
  return [...(sampleRow ? [sampleRow] : []), ...rows].filter(
    (r) =>
      (!filter?.supplierId || r.supplierId === filter.supplierId) &&
      (!filter?.planningGroupId || r.planningGroupId === filter.planningGroupId)
  );
}
