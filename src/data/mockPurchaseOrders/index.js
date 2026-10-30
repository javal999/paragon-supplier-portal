// ─────────────────────────────────────────────────────────────────────────────
// Purchase-order fixtures. The module is a folder since BL-229: the authored
// rows sit in four group files and `retimed.js` builds the shifted export.
// This index re-exports the one name the single file exported, so every
// importer keeps the old specifier.
// ─────────────────────────────────────────────────────────────────────────────
export { mockPurchaseOrders } from './retimed';
