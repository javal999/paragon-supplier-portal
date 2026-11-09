// ────────────────────────────────────────────────────────────────────────────
// PEX-15 (BL-277) — the LTP series a material's what-if scenarios read, one per
// scenario (BR-02): A (Baseline), Festive, B (Protection buffer).
//
// THE SEAM TO PEX-5 (BL-267). The hub holds one LTP today: the forecast
// commitments, which is LTP A. LTP Festive and LTP B arrive with the LTP inputs
// (planner uploads per material); until then those two are null and their
// scenarios are unavailable on the page. When BL-267 lands, `festive` and `b`
// read the uploads in force for the material here, and nothing else changes.
// ────────────────────────────────────────────────────────────────────────────

/** @import { LtpSeriesSet } from '../../transitions/whatIfLevels' */

/**
 * @param {string} _materialCode  Unused until BL-267 reads uploads per material.
 * @param {readonly number[]} liveLtp  The pair's LTP A per sandbox week, as the sandbox reads it.
 * @returns {LtpSeriesSet}
 */
export const whatIfLtpSeries = (_materialCode, liveLtp) => ({
  A: liveLtp,
  Festive: null,
  B: null
});
