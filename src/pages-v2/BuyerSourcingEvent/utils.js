// ────────────────────────────────────────────────────────────────────────────
// BuyerSourcingEvent — pure helpers (no React state, no hooks).
//
// Moved out of `BuyerSourcingEvent.jsx` by the Phase 5 page split (no
// behaviour change).
// ────────────────────────────────────────────────────────────────────────────

/**
 * The quote with this id — the comparison rows read it by id, never by index.
 * @template {{ id: string }} T
 * @param {readonly T[]} rows
 * @param {string} id
 * @returns {T}
 */
export function byId(rows, id) {
  return /** @type {T} */ (rows.find((r) => r.id === id));
}
