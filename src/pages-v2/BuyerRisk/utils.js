// ────────────────────────────────────────────────────────────────────────────
// BuyerRisk — pure helpers (no React). Moved out of `BuyerRisk.jsx` by the
// Phase 5 page split (no behaviour change).
// ────────────────────────────────────────────────────────────────────────────

/**
 * Status-pill tone for a days-of-stock figure on the supply-exposure table:
 * under 30 days is danger, under 50 is warning, otherwise success.
 * @param {number} dos
 * @returns {'success' | 'warning' | 'danger'}
 */
export const dosVariant = (dos) => {
  if (dos < 30) return 'danger';
  if (dos < 50) return 'warning';
  return 'success';
};
