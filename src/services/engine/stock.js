// ─────────────────────────────────────────────────────────────────────────────
// Stock-side measures of the data foundation (REQ-E14-01).
//
//   · Warehouse utilisation — pallets on hand ÷ owned capacity, per warehouse
//     and snapshot date. On hand in pallets = onHandQty ÷ unitsPerPallet.
//     (The owner's slides: packaging 121–142%, raw material ~106%, target 80%.)
//   · Stock accuracy (BR-03, ENG-D2) — |counted − system| ÷ system on the
//     latest cycle count; a material above the tolerance (2% to start) is
//     flagged low-confidence. A count with no system stock is flagged (edge
//     case: "a new material with no stock record … flagged").
//
// Pure: the tolerance is an argument, never read from a store (X-01, X-05).
// ─────────────────────────────────────────────────────────────────────────────

/** @import { CycleCount, IsoDate, MaterialVolume, StockSnapshot, Warehouse, WarehouseKind } from './types' */

/**
 * @typedef {object} UtilisationPoint
 * @property {string} warehouseId
 * @property {WarehouseKind} kind
 * @property {IsoDate} date
 * @property {number} pallets
 * @property {number} capacityPallets
 * @property {number} utilisation -  pallets ÷ capacity (1.21 = 121%).
 */

/**
 * Utilisation per warehouse per snapshot date, oldest first. A snapshot whose
 * material has no volume record cannot be converted to pallets and is REFUSED
 * by name rather than counted as zero.
 * @param {readonly StockSnapshot[]} stock
 * @param {readonly MaterialVolume[]} volumes
 * @param {readonly Warehouse[]} warehouses
 * @returns {UtilisationPoint[]}
 */
export function warehouseUtilisation(stock, volumes, warehouses) {
  const perPallet = new Map(volumes.map((v) => [v.materialCode, v.unitsPerPallet]));
  const byWarehouse = new Map(warehouses.map((w) => [w.warehouseId, w]));
  const pallets = /** @type {Map<string, number>} */ (new Map());
  for (const s of stock) {
    const upp = perPallet.get(s.materialCode);
    if (upp === undefined || upp <= 0) {
      throw new Error(
        `NO_VOLUME: '${s.materialCode}' has no units-per-pallet record — its stock cannot be converted to pallets`
      );
    }
    if (!byWarehouse.has(s.warehouseId)) throw new Error(`UNKNOWN_WAREHOUSE: '${s.warehouseId}'`);
    const k = `${s.warehouseId}|${s.date}`;
    pallets.set(k, (pallets.get(k) ?? 0) + s.onHandQty / upp);
  }
  return [...pallets.entries()]
    .map(([k, p]) => {
      const [warehouseId, date] = k.split('|');
      const w = /** @type {Warehouse} */ (byWarehouse.get(warehouseId));
      return {
        warehouseId,
        kind: w.kind,
        date,
        pallets: p,
        capacityPallets: w.capacityPallets,
        utilisation: p / w.capacityPallets
      };
    })
    .sort((a, b) => a.warehouseId.localeCompare(b.warehouseId) || a.date.localeCompare(b.date));
}

/** E14-01 BR-03 — the starting tolerance (ENG-D2). The administrator owns it (X-05). */
export const DEFAULT_STOCK_ACCURACY_TOLERANCE = 0.02;

/**
 * @typedef {object} StockAccuracy
 * @property {string} materialCode
 * @property {string} warehouseId
 * @property {IsoDate} countDate
 * @property {number | null} gap -  |counted − system| ÷ system; null when system stock is zero.
 * @property {boolean} flagged -  Low-confidence: recommendations wait for the planner (BR-03).
 */

/**
 * The latest cycle count per material × warehouse, judged against `tolerance`.
 * @param {readonly CycleCount[]} counts
 * @param {number} [tolerance]
 * @returns {StockAccuracy[]}
 */
export function stockAccuracy(counts, tolerance = DEFAULT_STOCK_ACCURACY_TOLERANCE) {
  const latest = /** @type {Map<string, CycleCount>} */ (new Map());
  for (const c of counts) {
    const k = `${c.materialCode}|${c.warehouseId}`;
    const prev = latest.get(k);
    if (!prev || c.countDate > prev.countDate) latest.set(k, c);
  }
  return [...latest.values()]
    .map((c) => {
      const gap = c.systemQty > 0 ? Math.abs(c.countedQty - c.systemQty) / c.systemQty : null;
      return {
        materialCode: c.materialCode,
        warehouseId: c.warehouseId,
        countDate: c.countDate,
        gap,
        flagged: gap === null || gap > tolerance
      };
    })
    .sort((a, b) => a.materialCode.localeCompare(b.materialCode));
}
