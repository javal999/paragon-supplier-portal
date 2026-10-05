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

import { asActorAttribution, type ActorAttribution } from '@lib/enforcement';

/** One change as recorded. */
export interface MaxStockChange {
  readonly supplierId: string;
  readonly materialCode: string;
  /** Whole units of the material; null clears the value ("no max stock agreed"). */
  readonly quantity: number | null;
  /** The value before this change — store-assigned; null when none was set. */
  readonly previous: number | null;
  readonly setBy: ActorAttribution;
  /** Store-assigned, never a payload field. */
  readonly setAt: string;
}

const ENTITY_ID = /^([^|\s]+)\|([^|\s]+)$/;

/** The entity id of one supplier × material. */
export const maxStockEntityId = (supplierId: string, materialCode: string): string => `${supplierId}|${materialCode}`;

/** The supplier and material an entity id names, or null when it is not one. */
export function parseMaxStockEntityId(id: unknown): { supplierId: string; materialCode: string } | null {
  if (typeof id !== 'string') return null;
  const m = ENTITY_ID.exec(id);
  return m ? { supplierId: m[1], materialCode: m[2] } : null;
}

/** The largest value accepted — a guard against a typo of several extra digits. */
export const MAX_STOCK_LIMIT = 1_000_000_000;

/** Why a value would be refused, or null when it is acceptable. */
export function maxStockRefusal(quantity: unknown): string | null {
  if (quantity === null) return null;
  if (typeof quantity !== 'number' || !Number.isFinite(quantity)) return 'quantity must be a number, or null to clear it';
  if (!Number.isInteger(quantity)) return 'quantity must be a whole number';
  if (quantity <= 0) return 'quantity must be above zero (clear it instead to mean none agreed)';
  if (quantity > MAX_STOCK_LIMIT) return `quantity must be at most ${MAX_STOCK_LIMIT}`;
  return null;
}

/**
 * The change a payload makes, or null when the verb would refuse it. The
 * target applies this; the policy hook has already refused every payload it
 * returns null for.
 */
export function maxStockChangeFrom(id: string, payload: Record<string, unknown>, at: string): MaxStockChange | null {
  const pair = parseMaxStockEntityId(id);
  const setBy = asActorAttribution(payload.setBy);
  const quantity = payload.quantity === undefined ? undefined : (payload.quantity as number | null);
  if (!pair || !setBy || quantity === undefined || maxStockRefusal(quantity)) return null;
  return {
    ...pair,
    quantity,
    previous: maxStockStore.get(pair.supplierId, pair.materialCode)?.quantity ?? null,
    setBy,
    setAt: at,
  };
}

let rows: MaxStockChange[] = [];

export const maxStockStore = {
  /** Every change, oldest first. */
  changes(): readonly MaxStockChange[] {
    return rows;
  },
  /** The latest change for a pair, or undefined when none was ever made. */
  get(supplierId: string, materialCode: string): MaxStockChange | undefined {
    for (let i = rows.length - 1; i >= 0; i -= 1) {
      if (rows[i].supplierId === supplierId && rows[i].materialCode === materialCode) return rows[i];
    }
    return undefined;
  },
  /** The changes for one pair, oldest first. */
  history(supplierId: string, materialCode: string): readonly MaxStockChange[] {
    return rows.filter((r) => r.supplierId === supplierId && r.materialCode === materialCode);
  },
  append(change: MaxStockChange): void {
    rows = [...rows, change];
  },
  /** TEST SEAM — back to nothing set. */
  reset(): void {
    rows = [];
  },
};

/** REQ-E06-04 BR-06 — the maximum stock in force for a pair, or null when none is set. */
export const maxStockFor = (supplierId: string, materialCode: string): number | null =>
  maxStockStore.get(supplierId, materialCode)?.quantity ?? null;
