// ────────────────────────────────────────────────────────────────────────────
// Mutable RequirementResponse store (SDC-2a).
//
// Same contract as quotationStore: reads resolve FROM here; commands mutate
// IMMUTABLY (new object + new array). Seeded from the SDC-0 SIMULATED fixtures
// (`REQUIREMENT_RESPONSES`); `reset()` restores the seed (test isolation).
// `forResponseKey` gives the create path the prior-submission set so
// `submissionVersion` is DERIVED (prior max + 1) — a re-confirmation against
// the same published line versions up, never overwrites (design §4:
// "versioned + audited"). Keyed by id; the store-assigned id doubles as the
// document number (the GR/invoice/PR/RFQ convention).
// ────────────────────────────────────────────────────────────────────────────

import { REQUIREMENT_RESPONSES } from '../../../sdc';
/** @import { RequirementResponse } from '../../../sdc' */
// REQ-E06-02 — the forecast commitments are RequirementResponses too, seeded
// after the SDC-0 rows so the first row stays the SDC-0 seed.
import { FORECAST_COMMITMENT_SEED } from '../fixtures/forecastHub';

/** @type {readonly RequirementResponse[]} */
const SEED = [...REQUIREMENT_RESPONSES, ...FORECAST_COMMITMENT_SEED];

/**
 * @param {RequirementResponse} r
 * @returns {RequirementResponse}
 */
function clone(r) {
  return { ...r };
}

/** @type {RequirementResponse[]} */
let rows = SEED.map(clone);
let seq = 0;

export const requirementResponseStore = {
  /**
   * All requirement responses (the mutable source reads resolve from).
   * @returns {readonly RequirementResponse[]}
   */
  all() {
    return rows;
  },
  /**
   * One response by id, or undefined.
   * @param {string} id
   * @returns {RequirementResponse | undefined}
   */
  get(id) {
    return rows.find((r) => r.id === id);
  },
  /**
   * Every response answering the SAME published line by the SAME supplier —
   * the response thread `submissionVersion` counts over (supplier × material ×
   * period × publication).
   * @param {string} supplierId
   * @param {string} materialCode
   * @param {string} periodBucket
   * @param {string} publicationId
   * @returns {readonly RequirementResponse[]}
   */
  forResponseKey(supplierId, materialCode, periodBucket, publicationId) {
    return rows.filter(
      (r) =>
        r.supplierId === supplierId &&
        r.materialCode === materialCode &&
        r.periodBucket === periodBucket &&
        r.publicationId === publicationId
    );
  },
  /**
   * IMMUTABLE update — swap in a new response + new array.
   * @param {string} id
   * @param {(r: RequirementResponse) => RequirementResponse} next
   * @returns {void}
   */
  update(id, next) {
    rows = rows.map((r) => (r.id === id ? next(r) : r));
  },
  /**
   * Add a newly-submitted response (creation). New array reference.
   * @param {RequirementResponse} response
   * @returns {void}
   */
  add(response) {
    rows = [response, ...rows];
  },
  /**
   * Store-assigned id for a submit (distinct 9xxx range; fixtures are 0xxx).
   * @returns {string}
   */
  nextNumber() {
    seq += 1;
    return `rr-${9000 + seq}`;
  },
  /**
   * Restore the fixture seed (test isolation).
   * @returns {void}
   */
  reset() {
    rows = SEED.map(clone);
    seq = 0;
  }
};
