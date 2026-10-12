// ────────────────────────────────────────────────────────────────────────────
// BuyerRfp — pure helpers (no React state, no hooks).
//
// Moved out of `BuyerRfp.jsx` by the Phase 5 page split (no behaviour change).
// ────────────────────────────────────────────────────────────────────────────

/** @import { RfpEventView } from '@services/sourcing/views' */

/**
 * D3 — "Create RFQ from this RFP" is offered only where it can do something: an
 * RFP that asked for indicative prices on options AND holds at least one
 * submitted proposal (the view carries submitted proposals only). Without
 * options there is nothing to turn into items; without a proposal there is
 * nobody to invite and no supplier option to choose — a button there would be a
 * false affordance.
 * @param {RfpEventView} event
 * @returns {boolean}
 */
export function rfpToRfqOffered(event) {
  return (event.pricing?.options.length ?? 0) > 0 && event.responses.length > 0;
}
