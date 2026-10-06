// ────────────────────────────────────────────────────────────────────────────
// FUX-D3 — the warehouse-week decision ledger.
//
// A Material Planner's decision for a week that does not fit the warehouse:
// the stream, the week, the choice, the note, the plan version it was made
// against, when and by whom. Append-only (MAT-R3); the latest record of a
// stream × week is in force (`decisionInForce`), earlier ones stay. Empty at
// start: no decision history is invented.
//
// Held for the browser session: the ledger is mirrored to `sessionStorage`, so
// a decision survives a reload of the page and is gone when the tab closes.
// Every stored row is re-checked on read through the same rule the verb calls;
// a row that fails it is dropped, never repaired.
// ────────────────────────────────────────────────────────────────────────────

import type { WarehouseDecision } from '../../types';
import { parseWarehouseDecisionId, warehouseDecisionEntityId, warehouseDecisionRefusal } from '../../../transitions/warehouseDecisionRules';

export const WAREHOUSE_DECISIONS_KEY = 'paragon.warehouseDecisions';

const storage = (): Storage | null => {
  try {
    return typeof window !== 'undefined' && window.sessionStorage ? window.sessionStorage : null;
  } catch {
    return null;
  }
};

const isRow = (r: unknown): r is WarehouseDecision => {
  if (typeof r !== 'object' || r === null) return false;
  const x = r as Record<string, unknown>;
  return (
    typeof x.id === 'string' &&
    typeof x.stream === 'string' &&
    typeof x.weekStart === 'string' &&
    parseWarehouseDecisionId(warehouseDecisionEntityId(x.stream as WarehouseDecision['stream'], x.weekStart)) !== null &&
    warehouseDecisionRefusal(x.choice, x.note) === null &&
    (x.note === null || typeof x.note === 'string') &&
    (x.planVersion === null || typeof x.planVersion === 'number') &&
    typeof x.recordedAt === 'string' &&
    typeof x.recordedBy === 'object' &&
    x.recordedBy !== null
  );
};

function load(): WarehouseDecision[] {
  const s = storage();
  if (!s) return [];
  try {
    const parsed: unknown = JSON.parse(s.getItem(WAREHOUSE_DECISIONS_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter(isRow) : [];
  } catch {
    return [];
  }
}

function save(next: readonly WarehouseDecision[]): void {
  try {
    storage()?.setItem(WAREHOUSE_DECISIONS_KEY, JSON.stringify(next));
  } catch {
    /* storage full or blocked: the session ledger in memory still holds the row */
  }
}

const seqOf = (rows: readonly WarehouseDecision[]) =>
  rows.reduce((max, r) => Math.max(max, Number(r.id.replace(/^wd-/, '')) || 0), 0);

let rows: WarehouseDecision[] = load();
let seq = seqOf(rows);

export const warehouseDecisionStore = {
  all(): readonly WarehouseDecision[] {
    return rows;
  },
  get(id: string): WarehouseDecision | undefined {
    return rows.find((r) => r.id === id);
  },
  add(row: Omit<WarehouseDecision, 'id'>): WarehouseDecision {
    seq += 1;
    const made: WarehouseDecision = { ...row, id: `wd-${String(seq).padStart(4, '0')}` };
    rows = [...rows, made];
    save(rows);
    return made;
  },
  reset(): void {
    rows = [];
    seq = 0;
    try {
      storage()?.removeItem(WAREHOUSE_DECISIONS_KEY);
    } catch {
      /* nothing stored */
    }
  },
  /** Re-read the session copy — what a page reload does. Tests only. */
  reloadFromSession(): void {
    rows = load();
    seq = seqOf(rows);
  },
};
