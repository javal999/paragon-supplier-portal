// ─────────────────────────────────────────────────────────────────────────────
// IA review item 1 — Forecast quality opens each SKU list on its first rows, so
// the selected SKU's weeks and the demand range are not pushed screens down.
// "Show all" reveals the rest. The same pattern as What to order (IA F-1); the
// cut is smaller here because these lists hold 20 SKUs or fewer.
// ─────────────────────────────────────────────────────────────────────────────

/** How many rows a Forecast quality SKU list opens on. */
export const FQ_FIRST_ROWS = 10;

/**
 * The rows a list shows: all of them, or the first `FQ_FIRST_ROWS` plus any row
 * `keep` names (the selected SKU stays visible).
 * @template T
 * @param {readonly T[]} rows
 * @param {boolean} showAll
 * @param {(row: T) => boolean} [keep]
 * @returns {readonly T[]}
 */
export function firstRows(rows, showAll, keep = () => false) {
  return showAll ? rows : rows.filter((r, i) => i < FQ_FIRST_ROWS || keep(r));
}
