// ────────────────────────────────────────────────────────────────────────────
// Material E2 · THE STOCK SIMULATION READ MODEL (MR-7 section e; plan AD-1).
//
// ONE place gathers E1's inputs from the stores — the stock records, ASNs,
// to-distributor legs, call-offs, capacity, planning groups, the supplier ×
// material relationships and the planner's inputs — and hands them to the pure
// `simulateSupplierStock`, once per supplier × material. Nothing is stored.
//
// The rows are the inventory page's pairs (`assignments`), plus any pair a
// planner has entered a figure for, plus THREE labelled sample rows: the MR-7
// 9g worked example and the owner's walkthrough cases 2 and 3, each on its own
// sample inputs (`fixtures/stockSimulationSample`), computed on a world of its
// own so it can touch no other row. Each sample pair is reserved for its
// sample row: it is never a real row, a planner input on it reaches only that
// row, and it is kept out of the real rows' capacity cap.
// ────────────────────────────────────────────────────────────────────────────

/** @import { QueryScope, SimulationOverride, StockSimulationFilter, StockSimulationRow } from '../types' */
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
/** @import { SimulationSample } from './fixtures/stockSimulationSample' */
import { SIMULATION_SAMPLES } from './fixtures/stockSimulationSample';

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
 * A sample row's world: its own sample inputs only (the 9g inputs by default).
 * @param {string} [nowIso]
 * @param {SimulationSample} [sample]
 * @returns {SimulationWorld}
 */
export function sampleWorld(nowIso = sdcClock.now(), sample = SIMULATION_SAMPLES[0]) {
  const group = planningGroupOf(sample.materialCode);
  return {
    nowIso,
    declarations: sample.declarations,
    asns: sample.asns,
    shipments: sample.shipments,
    callOffViews: sample.callOffs.map((callOff) => ({ callOff, delivery: 'notDue' })),
    capacitySubmissions: group ? sample.capacity(group) : [],
    planningGroupOf,
    relationships: sample.relationships
  };
}

/**
 * @param {string} s
 * @param {string} m
 */
const key = (s, m) => `${s}|${m}`;
const SAMPLE_KEYS = new Set(SIMULATION_SAMPLES.map((x) => key(x.supplierId, x.materialCode)));

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
  const allOverrides = simulationOverrideStore.all();
  // A sample pair's inputs reach its sample row only; a real row never reads them.
  const overrides = allOverrides.filter((o) => !SAMPLE_KEYS.has(key(o.supplierId, o.materialCode)));

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
  for (const k of SAMPLE_KEYS) pairs.delete(k);

  const real = simulationWorld(nowIso);
  /**
   * @param {string} supplierId
   * @param {string} materialCode
   * @param {SimulationWorld} world
   * @param {SimulationSample['sampleCase'] | null} sampleCase
   * @param {readonly SimulationOverride[]} inputs
   * @returns {StockSimulationRow | null}
   */
  const rowFor = (supplierId, materialCode, world, sampleCase, inputs) => {
    const entry = materialEntry(materialCode);
    if (!entry) return null;
    const result = simulateSupplierStock(
      { supplierId, materialCode, checkDate: day, overrides: inputs },
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
      sample: sampleCase !== null,
      sampleCase,
      simulation: isSimulationRefusal(result) ? null : result,
      refusal: isSimulationRefusal(result) ? result : null
    };
    return withMrpController(row, materialCode, scope);
  };

  const rows = [...pairs.values()]
    .map((p) => rowFor(p.supplierId, p.materialCode, real, null, overrides))
    .filter(/** @returns {r is StockSimulationRow} */ (r) => r !== null)
    .sort(
      (a, b) =>
        a.supplierName.localeCompare(b.supplierName) || a.materialCode.localeCompare(b.materialCode)
    );
  const sampleRows = SIMULATION_SAMPLES.map((x) =>
    rowFor(
      x.supplierId,
      x.materialCode,
      sampleWorld(nowIso, x),
      x.sampleCase,
      allOverrides.filter((o) => o.supplierId === x.supplierId && o.materialCode === x.materialCode)
    )
  ).filter(/** @returns {r is StockSimulationRow} */ (r) => r !== null);
  return [...sampleRows, ...rows].filter(
    (r) =>
      (!filter?.supplierId || r.supplierId === filter.supplierId) &&
      (!filter?.planningGroupId || r.planningGroupId === filter.planningGroupId)
  );
}
