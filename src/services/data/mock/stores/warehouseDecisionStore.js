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

/** @import { WarehouseDecision } from '../../types' */
import {
  parseWarehouseDecisionId,
  warehouseDecisionEntityId,
  warehouseDecisionRefusal
} from '../../../transitions/warehouseDecisionRules';

export const WAREHOUSE_DECISIONS_KEY = 'paragon.warehouseDecisions';

/** @returns {Storage | null} */
const storage = () => {
  try {
    return typeof window !== 'undefined' && window.sessionStorage ? window.sessionStorage : null;
  } catch {
    return null;
  }
};

/**
 * @param {unknown} r
 * @returns {r is WarehouseDecision}
 */
const isRow = (r) => {
  if (typeof r !== 'object' || r === null) return false;
  const x = /** @type {Record<string, unknown>} */ (r);
  return (
    typeof x.id === 'string' &&
    typeof x.stream === 'string' &&
    typeof x.weekStart === 'string' &&
    parseWarehouseDecisionId(
      warehouseDecisionEntityId(/** @type {WarehouseDecision['stream']} */ (x.stream), x.weekStart)
    ) !== null &&
    warehouseDecisionRefusal(x.choice, x.note) === null &&
    (x.note === null || typeof x.note === 'string') &&
    (x.planVersion === null || typeof x.planVersion === 'number') &&
    typeof x.recordedAt === 'string' &&
    typeof x.recordedBy === 'object' &&
    x.recordedBy !== null
  );
};

/** @returns {WarehouseDecision[]} */
function load() {
  const s = storage();
  if (!s) return [];
  try {
    /** @type {unknown} */
    const parsed = JSON.parse(s.getItem(WAREHOUSE_DECISIONS_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter(isRow) : [];
  } catch {
    return [];
  }
}

/**
 * @param {readonly WarehouseDecision[]} next
 * @returns {void}
 */
function save(next) {
  try {
    storage()?.setItem(WAREHOUSE_DECISIONS_KEY, JSON.stringify(next));
  } catch {
    /* storage full or blocked: the session ledger in memory still holds the row */
  }
}

/** @param {readonly WarehouseDecision[]} rows */
const seqOf = (rows) =>
  rows.reduce((max, r) => Math.max(max, Number(r.id.replace(/^wd-/, '')) || 0), 0);

/** @type {WarehouseDecision[]} */
let rows = load();
let seq = seqOf(rows);

export const warehouseDecisionStore = {
  /** @returns {readonly WarehouseDecision[]} */
  all() {
    return rows;
  },
  /**
   * @param {string} id
   * @returns {WarehouseDecision | undefined}
   */
  get(id) {
    return rows.find((r) => r.id === id);
  },
  /**
   * @param {Omit<WarehouseDecision, 'id'>} row
   * @returns {WarehouseDecision}
   */
  add(row) {
    seq += 1;
    /** @type {WarehouseDecision} */
    const made = { ...row, id: `wd-${String(seq).padStart(4, '0')}` };
    rows = [...rows, made];
    save(rows);
    return made;
  },
  /** @returns {void} */
  reset() {
    rows = [];
    seq = 0;
    try {
      storage()?.removeItem(WAREHOUSE_DECISIONS_KEY);
    } catch {
      /* nothing stored */
    }
  },
  /**
   * Re-read the session copy — what a page reload does. Tests only.
   * @returns {void}
   */
  reloadFromSession() {
    rows = load();
    seq = seqOf(rows);
  }
};
