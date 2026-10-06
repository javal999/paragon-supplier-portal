// ────────────────────────────────────────────────────────────────────────────
// Mutable stores for forecast collaboration (REQ-E06-01 to REQ-E06-03).
//
// Same contract as the other mock stores: commands add new rows, reads resolve
// from here, `reset()` restores the seed for tests. Both are append-only — a
// published version is never edited (a change is a new version), and a view is
// recorded once per supplier × version.
//   · forecastVersionStore — every published version of each stream
//   · forecastViewStore    — when a supplier first opened a version
// Commitments are RequirementResponses and live in `requirementResponseStore`.
// ────────────────────────────────────────────────────────────────────────────

/** @import { ForecastPublication } from '../../../sdc/types' */
import { FORECAST_VERSION_SEED, FORECAST_VIEW_SEED } from '../fixtures/forecastHub';

/**
 * @typedef {{
 *     readonly id: string;
 *     readonly publicationId: string;
 *     readonly supplierId: string;
 *     readonly viewedAt: string;
 *   }} ForecastViewRecord
 */

/** @type {ForecastPublication[]} */
let versions = [...FORECAST_VERSION_SEED];

export const forecastVersionStore = {
  /** @returns {readonly ForecastPublication[]} */
  all() {
    return versions;
  },
  /**
   * @param {string} publicationId
   * @returns {ForecastPublication | undefined}
   */
  get(publicationId) {
    return versions.find((v) => v.publicationId === publicationId);
  },
  /**
   * @param {ForecastPublication} version
   * @returns {void}
   */
  add(version) {
    versions = [...versions, version];
  },
  /** @returns {void} */
  reset() {
    versions = [...FORECAST_VERSION_SEED];
  }
};

/** @type {ForecastViewRecord[]} */
let views = FORECAST_VIEW_SEED.map((v) => ({ ...v }));
let viewSeq = FORECAST_VIEW_SEED.length;

export const forecastViewStore = {
  /** @returns {readonly ForecastViewRecord[]} */
  all() {
    return views;
  },
  /**
   * @param {string} id
   * @returns {ForecastViewRecord | undefined}
   */
  get(id) {
    return views.find((v) => v.id === id);
  },
  /**
   * @param {string} publicationId
   * @param {string} supplierId
   * @returns {ForecastViewRecord | undefined}
   */
  find(publicationId, supplierId) {
    return views.find((v) => v.publicationId === publicationId && v.supplierId === supplierId);
  },
  /**
   * @param {ForecastViewRecord} row
   * @returns {void}
   */
  add(row) {
    views = [...views, row];
  },
  /** @returns {string} */
  nextId() {
    viewSeq += 1;
    return `fv-${String(viewSeq).padStart(4, '0')}`;
  },
  /** @returns {void} */
  reset() {
    views = FORECAST_VIEW_SEED.map((v) => ({ ...v }));
    viewSeq = FORECAST_VIEW_SEED.length;
  }
};
