// ────────────────────────────────────────────────────────────────────────────
// PTI stock on hand — the hub's stock records (BL-199, DRC-13 BR-04, DRC-D12).
//
// Until the eWM feed is connected, PTI SOH comes from the hub's stock records
// (DRC-13 BR-04 [Owner F2]): this store, seeded from `PTI_STOCK`. Every record
// names its plant (DRC-D12). An update — the eWM refresh once the feed exists —
// replaces the material × plant record and stamps it with a sequence number, so
// the call-off trigger can tell which records changed since it last looked
// ("the check runs on every PTI SOH update"). The seed is sequence 0: the
// state before any update, which the trigger never treats as one.
//
// Same contract as the other mock stores: reads resolve from here, `reset()`
// restores the seed for tests.
// ────────────────────────────────────────────────────────────────────────────

/** @import { PtiStockRecord } from '../../../transitions/inventoryRules' */
/** @import { PtiPlant } from '../../../transitions/callOffTriggerRules' */
import { PTI_STOCK } from '../fixtures/inventoryHub';

/**
 * A PTI SOH record in the hub: the SAP record with its plant (DRC-D12), the
 * sequence of the update that wrote it (0 = seed) and when it was written.
 * @typedef {PtiStockRecord & {
 *   readonly plant: PtiPlant;
 *   readonly seq: number;
 *   readonly updatedAt: string | null;
 * }} PtiSohRecord
 */

/**
 * One SOH update: a material × plant and its new stock on hand.
 * @typedef {{ readonly materialCode: string; readonly plant: PtiPlant; readonly ptiSoh: number }} PtiSohUpdate
 */

/** @returns {PtiSohRecord[]} */
const seed = () =>
  PTI_STOCK.map((r) => ({
    ...r,
    // DRC-D12 — the fixture's SAMPLE plant (see `PTI_STOCK`); J6 for a record
    // that names none, so every record in the hub carries one.
    plant: r.plant ?? 'J6',
    seq: 0,
    updatedAt: null
  }));

/** @type {PtiSohRecord[]} */
let rows = seed();
let seq = 0;

export const ptiStockStore = {
  /** @returns {readonly PtiSohRecord[]} */
  all() {
    return rows;
  },
  /**
   * The material's records, every plant.
   * @param {string} materialCode
   * @returns {readonly PtiSohRecord[]}
   */
  forMaterial(materialCode) {
    return rows.filter((r) => r.materialCode === materialCode);
  },
  /**
   * One record per material, SOH summed over its plants [Default F1]: what the
   * inventory and demand anticipation reads take, which read one record per
   * material. The first record's PTI ROP and consignment flag stand.
   * @returns {readonly PtiStockRecord[]}
   */
  combined() {
    /** @type {Map<string, PtiStockRecord>} */
    const out = new Map();
    for (const r of rows) {
      const seen = out.get(r.materialCode);
      out.set(
        r.materialCode,
        seen
          ? { ...seen, ptiSoh: seen.ptiSoh + r.ptiSoh }
          : {
              materialCode: r.materialCode,
              ptiSoh: r.ptiSoh,
              ptiRop: r.ptiRop,
              consignment: r.consignment,
              plant: r.plant
            }
      );
    }
    return [...out.values()];
  },
  /** The sequence of the latest update; 0 while only the seed was ever there. */
  latestSeq() {
    return seq;
  },
  /**
   * DRC-13 BR-04 — record one SOH update (the eWM refresh): each material ×
   * plant record is replaced, or added for a plant the material had none in.
   * A new material × plant takes the PTI ROP and consignment flag of the
   * material's other records.
   * @param {readonly PtiSohUpdate[]} updates
   * @param {string} at
   * @returns {number} The update's sequence number.
   */
  record(updates, at) {
    seq += 1;
    for (const u of updates) {
      const same = rows.find((r) => r.materialCode === u.materialCode && r.plant === u.plant);
      if (same) {
        rows = rows.map((r) => (r === same ? { ...r, ptiSoh: u.ptiSoh, seq, updatedAt: at } : r));
        continue;
      }
      const sibling = rows.find((r) => r.materialCode === u.materialCode);
      rows = [
        ...rows,
        {
          materialCode: u.materialCode,
          plant: u.plant,
          ptiSoh: u.ptiSoh,
          ptiRop: sibling?.ptiRop ?? 0,
          consignment: sibling?.consignment ?? false,
          seq,
          updatedAt: at
        }
      ];
    }
    return seq;
  },
  /**
   * TEST SEAM — back to the seed. The sequence keeps counting, so an update
   * after a reset is never mistaken for one the trigger already processed.
   * @returns {void}
   */
  reset() {
    rows = seed();
  }
};
