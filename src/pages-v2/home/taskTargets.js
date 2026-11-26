// ─────────────────────────────────────────────────────────────────────────────
// UCX-P1 (BL-362) — THE ROW'S TARGET: THE RECORD WHEN IT COUNTS ONE, ELSE THE
// FILTERED VIEW. The rule lives in one function so two rows cannot disagree
// about it; each page says what its own record target and filtered view are.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @template T
 * @param {readonly T[]} items  What the row counts.
 * @param {(item: T) => string} one  The record's target when the row counts one.
 * @param {() => string} many  The filtered view's target otherwise.
 * @returns {string}
 */
export function oneRecordOrFiltered(items, one, many) {
  return items.length === 1 ? one(items[0]) : many();
}
