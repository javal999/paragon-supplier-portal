// ────────────────────────────────────────────────────────────────────────────
// Mutable InventoryDeclaration store (SDC-3a).
//
// Same contract as requirementResponseStore: reads resolve FROM here; the
// declare command APPENDS a new immutable snapshot (never mutates a prior one
// — SOH is keyed material + insertion order, one true SOH per as-of). "Current
// SOH" is derived at read via `latestFor` (most-recently-ADDED per supplier ×
// material, by insertion recency — NOT declaredAt, SDC-4a ruling c). No `update`
// path exists — snapshots don't change; a new count is
// a new declaration. Seeded from the SDC-0 SIMULATED fixtures; `reset()`
// restores the seed (test isolation). Keyed by id (the store-assigned number
// doubles as the document number, the platform convention).
// ────────────────────────────────────────────────────────────────────────────

import { INVENTORY_DECLARATIONS, declarationRecency, requireUom } from '../../../sdc';
import type { InventoryDeclaration } from '../../../sdc';
import { mockInventory } from '@data/mockInventory';

function clone(d: InventoryDeclaration): InventoryDeclaration {
  return { ...d, batches: d.batches ? d.batches.map((b) => ({ ...b })) : undefined };
}

// REQ-E08-01 — ONE inventory model (INVENTORY-REFERENT-01 closed). The supplier
// stock submissions that used to be a separate static list are loaded here as
// declarations, AFTER the SDC-0 seed rows so the first row is unchanged. Their
// ids (inv-01xx) sit between the SDC seed (inv-000x) and live declares
// (inv-9xxx) in insertion recency, and no seeded pair repeats an SDC pair.
const HUB_SEED: readonly InventoryDeclaration[] = mockInventory.map((r) => ({
  id: r.id,
  supplierId: r.supplierId,
  materialCode: r.materialCode,
  // 09:00 WIB on the day of the submission.
  declaredAt: `${r.lastUpdated}T02:00:00.000Z`,
  totalQty: r.qtyOnHand,
  uom: requireUom(r.materialCode),
  channel: r.channel,
  ...(r.supplierRop !== undefined ? { supplierRop: r.supplierRop } : {}),
  ...(r.inProductionQty !== undefined ? { inProductionQty: r.inProductionQty } : {}),
  ...(r.productionCompletionDate ? { productionCompletionDate: r.productionCompletionDate } : {}),
  provenance: { source: 'SUPPLIER', liveness: 'SIMULATED', planState: 'committed' },
}));

const SEED: readonly InventoryDeclaration[] = [...INVENTORY_DECLARATIONS, ...HUB_SEED];

let rows: InventoryDeclaration[] = SEED.map(clone);
let seq = 0;

export const inventoryDeclarationStore = {
  /** All declarations (the mutable source reads resolve from). */
  all(): readonly InventoryDeclaration[] {
    return rows;
  },
  /** One declaration by id, or undefined. */
  get(id: string): InventoryDeclaration | undefined {
    return rows.find((d) => d.id === id);
  },
  /**
   * The CURRENT SOH declaration for a supplier × material — the most-recently
   * ADDED (a state snapshot, not a running total). "Latest" is by store-insertion
   * recency (`declarationRecency`), NOT `declaredAt` (SDC-4a ruling c): a fresh
   * declare must win over a future-dated seed regardless of its stamp. Undefined
   * when the pair has never declared.
   */
  latestFor(supplierId: string, materialCode: string): InventoryDeclaration | undefined {
    let latest: InventoryDeclaration | undefined;
    for (const d of rows) {
      if (d.supplierId !== supplierId || d.materialCode !== materialCode) continue;
      if (!latest || declarationRecency(d) > declarationRecency(latest)) latest = d;
    }
    return latest;
  },
  /** Add a newly-declared snapshot (creation). New array reference. */
  add(declaration: InventoryDeclaration): void {
    rows = [declaration, ...rows];
  },
  /** Store-assigned id for a declare (distinct 9xxx range; fixtures are 0xxx). */
  nextNumber(): string {
    seq += 1;
    return `inv-${9000 + seq}`;
  },
  /** Restore the fixture seed (test isolation). */
  reset(): void {
    rows = SEED.map(clone);
    seq = 0;
  },
};
