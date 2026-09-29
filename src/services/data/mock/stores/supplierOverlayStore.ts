// ────────────────────────────────────────────────────────────────────────────
// SUPPLIER OVERLAY STORE — Material A1 (MR-1 BR-02, AC-06; plan AD-4, AR-03).
//
// The hub-mastered supplier fields, over the frozen supplier master. APPEND
// ONLY: every change of a supplier's stock update mode is a new row, and the
// latest row per supplier wins (MAT-R3). Nothing here is edited, so the history
// of who changed a supplier's mode, and when, is the store itself.
//
// Written by the `t_supplier_set_update_mode` target and nothing else. Read
// through the resolver (`supplierMaster.ts`), never directly by a page.
// Held in memory like every other record in the prototype.
// ────────────────────────────────────────────────────────────────────────────

import type { SupplierUpdateModeChange } from '../../types';

let rows: SupplierUpdateModeChange[] = [];
let version = 0;
const listeners = new Set<() => void>();

function changed(): void {
  version += 1;
  listeners.forEach((l) => l());
}

export const supplierOverlayStore = {
  /** Every row, oldest first. */
  all(): readonly SupplierUpdateModeChange[] {
    return rows;
  },
  /** One supplier's rows, oldest first. */
  historyFor(supplierId: string): readonly SupplierUpdateModeChange[] {
    return rows.filter((r) => r.supplierId === supplierId);
  },
  /** The row in force for a supplier: its latest. */
  latestFor(supplierId: string): SupplierUpdateModeChange | undefined {
    for (let i = rows.length - 1; i >= 0; i -= 1) if (rows[i].supplierId === supplierId) return rows[i];
    return undefined;
  },
  /** APPEND ONLY — called by the `t_supplier_set_update_mode` target and nothing else. */
  append(row: SupplierUpdateModeChange): void {
    rows = [...rows, row];
    changed();
  },
  /** Back to no overlay rows — test isolation. */
  reset(): void {
    rows = [];
    changed();
  },
  version(): number {
    return version;
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
