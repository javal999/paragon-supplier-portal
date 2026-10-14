// ─────────────────────────────────────────────────────────────────────────────
// BuyerCallOffs — pure helpers and the shared typedefs of the page folder.
// No React here: the row action key and the X-03 release-withheld predicate.
// ─────────────────────────────────────────────────────────────────────────────

/** @import { ASN, CallOffWarning } from '@services/data/types' */
/** @import { CallOffView } from '@services/transitions/callOffRules' */
import { isLive } from '@services/liveness';
import { engineReleaseWithheld } from '@services/transitions/callOffRules';

/**
 * The side panel the page has open: a new call-off or a series on one umbrella
 * PO line, or one call-off.
 * @typedef {| { kind: 'new'; poId: string; lineId: string }
 *   | { kind: 'series'; poId: string; lineId: string }
 *   | { kind: 'callOff'; id: string }
 *   | null} Panel
 */

/**
 * @typedef {object} SeriesRow
 * @property {string} id Row identity, used as the React key: `<preview number>-<n>`, minted in
 *   previewSeries. A new preview mints new ids, so its inputs start fresh
 *   instead of reusing the previous preview's DOM rows.
 * @property {string} quantity
 * @property {string} date
 */

/** A call-off's ASN with its current call-off warnings (MR-6 BR-12). */
/**
 * @typedef {object} LinkedAsn
 * @property {ASN} asn
 * @property {CallOffWarning[]} warnings
 */

/**
 * The row action a planner is offered: review, open the draft, or view.
 * @param {CallOffView} v
 */
export const actionKey = (v) =>
  v.confirmation === 'Awaiting Approval'
    ? 'co.action.review'
    : v.callOff.status === 'Draft'
      ? 'co.action.openDraft'
      : 'co.action.open';

/**
 * X-03 (owner decision 2026-09-23) — a draft the Order plan made from an engine
 * recommendation, while the engine dataset is not live: it is marked, and its
 * release is withheld. The predicate is the one the release verb's policy runs,
 * fed the registry's own liveness at render.
 * @param {CallOffView['callOff']} c
 * @returns {boolean}
 */
export const releaseWithheld = (c) => engineReleaseWithheld(c, isLive('engineDataset'));
