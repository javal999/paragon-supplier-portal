// ────────────────────────────────────────────────────────────────────────────
// MAXIMUM STOCK PER SUPPLIER × MATERIAL — REQ-E06-04 BR-06 (owner, 2026-09-29).
//
// The most a supplier may hold for PTI of one material, maintained by
// Procurement with the one governed verb `t_maxstock_set`. The fixed stock
// reconcile caps the flagged liability at it and shows stock above it as the
// supplier's own. Where none is set the reconcile reads "No max stock agreed".
//
//   · APPEND-ONLY. Every change is a new row with the value before it, who set
//     it and when (store-stamped). The value in force is the latest row; a row
//     with `quantity: null` clears it back to "none agreed". Nothing is deleted.
//   · THE ENTITY IS `<supplierId>|<materialCode>`, and only a pair the hub
//     actually assigns is addressable (the target checks it) — a max stock for
//     a pair nobody supplies is NOT_FOUND, never a silently created row.
//   · THE ONE RULE (`maxStockRefusal`) is called by the verb's policy hook and
//     by the page's form, so "a value the page offers" and "a value the verb
//     accepts" cannot disagree.
//   · Held in memory like every other record in the prototype: lost on reload.
// ────────────────────────────────────────────────────────────────────────────

/** @import { ActorAttribution } from '@lib/enforcement' */
import { asActorAttribution } from '@lib/enforcement';

/** One change as recorded. */
/**
 * @typedef {object} MaxStockChange
 * @property {string} supplierId
 * @property {string} materialCode
 * @property {number | null} quantity -  Whole units of the material; null clears the value ("no max stock agreed").
 * @property {number | null} previous -  The value before this change — store-assigned; null when none was set.
 * @property {ActorAttribution} setBy
 * @property {string} setAt -  Store-assigned, never a payload field.
 */

const ENTITY_ID = /^([^|\s]+)\|([^|\s]+)$/;

/**
 * The entity id of one supplier × material.
 * @param {string} supplierId
 * @param {string} materialCode
 * @returns {string}
 */
export const maxStockEntityId = (supplierId, materialCode) => `${supplierId}|${materialCode}`;

/**
 * The supplier and material an entity id names, or null when it is not one.
 * @param {unknown} id
 * @returns {{ supplierId: string; materialCode: string } | null}
 */
export function parseMaxStockEntityId(id) {
  if (typeof id !== 'string') return null;
  const m = ENTITY_ID.exec(id);
  return m ? { supplierId: m[1], materialCode: m[2] } : null;
}

/** The largest value accepted — a guard against a typo of several extra digits. */
export const MAX_STOCK_LIMIT = 1_000_000_000;

/**
 * Why a value would be refused, or null when it is acceptable.
 * @param {unknown} quantity
 * @returns {string | null}
 */
export function maxStockRefusal(quantity) {
  if (quantity === null) return null;
  if (typeof quantity !== 'number' || !Number.isFinite(quantity))
    return 'quantity must be a number, or null to clear it';
  if (!Number.isInteger(quantity)) return 'quantity must be a whole number';
  if (quantity <= 0) return 'quantity must be above zero (clear it instead to mean none agreed)';
  if (quantity > MAX_STOCK_LIMIT) return `quantity must be at most ${MAX_STOCK_LIMIT}`;
  return null;
}

/** @type {MaxStockChange[]} */
let rows = [];

export const maxStockStore = {
  /**
   * Every change, oldest first.
   * @returns {readonly MaxStockChange[]}
   */
  changes() {
    return rows;
  },
  /**
   * The latest change for a pair, or undefined when none was ever made.
   * @param {string} supplierId
   * @param {string} materialCode
   * @returns {MaxStockChange | undefined}
   */
  get(supplierId, materialCode) {
    for (let i = rows.length - 1; i >= 0; i -= 1) {
      if (rows[i].supplierId === supplierId && rows[i].materialCode === materialCode)
        return rows[i];
    }
    return undefined;
  },
  /**
   * The changes for one pair, oldest first.
   * @param {string} supplierId
   * @param {string} materialCode
   * @returns {readonly MaxStockChange[]}
   */
  history(supplierId, materialCode) {
    return rows.filter((r) => r.supplierId === supplierId && r.materialCode === materialCode);
  },
  /**
   * @param {MaxStockChange} change
   * @returns {void}
   */
  append(change) {
    rows = [...rows, change];
  },
  /**
   * TEST SEAM — back to nothing set.
   * @returns {void}
   */
  reset() {
    rows = [];
  }
};

/**
 * The change a payload makes, or null when the verb would refuse it. The
 * target applies this; the policy hook has already refused every payload it
 * returns null for.
 * @param {string} id
 * @param {Record<string, unknown>} payload
 * @param {string} at
 * @returns {MaxStockChange | null}
 */
export function maxStockChangeFrom(id, payload, at) {
  const pair = parseMaxStockEntityId(id);
  const setBy = asActorAttribution(payload.setBy);
  const quantity =
    payload.quantity === undefined ? undefined : /** @type {number | null} */ (payload.quantity);
  if (!pair || !setBy || quantity === undefined || maxStockRefusal(quantity)) return null;
  return {
    ...pair,
    quantity,
    previous: maxStockStore.get(pair.supplierId, pair.materialCode)?.quantity ?? null,
    setBy,
    setAt: at
  };
}

/**
 * REQ-E06-04 BR-06 — the maximum stock in force for a pair, or null when none is set.
 * @param {string} supplierId
 * @param {string} materialCode
 * @returns {number | null}
 */
export const maxStockFor = (supplierId, materialCode) =>
  maxStockStore.get(supplierId, materialCode)?.quantity ?? null;
