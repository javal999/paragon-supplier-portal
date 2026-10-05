// ────────────────────────────────────────────────────────────────────────────
// Mutable stores for RFx management (REQ-E03-02 to REQ-E03-05).
//
// Same contract as every other mock store: reads resolve from here, commands
// mutate IMMUTABLY (new object + new array), `reset()` restores the seed for
// test isolation.
//
//   · rfiEventStore / rfpEventStore           — the two new event types
//   · rfiResponseStore / rfpResponseStore     — one response per supplier ×
//     event; a Draft lives here too and the READ hides it from PTI
//   · negotiationRoundStore                   — append-only: a round is never
//     edited and never reopened, asking again is a new round
//   · awardStore                              — append-only: the hub's record of
//     an award (BR-09), no PO and no contract
//   · awardCancellationStore / awardSapMarkStore — append-only (RFx C2, AR-08):
//     a cancel or a "Raised in SAP" marking is a NEW record naming the award,
//     so the award itself is never edited and its status is derived at read
//   · rfpOfferRoundStore                      — NR-2: firm-offer rounds on an
//     RFP; append-only like the negotiation round, closing only stamps `closedAt`
//   · rfpFirmOfferStore                       — NR-2: one firm offer per
//     supplier × round; a revision APPENDS a version. Both start EMPTY: no
//     sample RFP is Closed, so no round could have been opened on one
//
// The RFQ and quotation rows the RFx demo needs live in `rfqStore` /
// `quotationStore` beside the legacy set — one RFQ list, not two.
// ────────────────────────────────────────────────────────────────────────────

import {
  AWARD_SEED,
  NEGOTIATION_ROUND_SEED,
  RFI_EVENT_SEED,
  RFI_RESPONSE_SEED,
  RFP_EVENT_SEED,
  RFP_RESPONSE_SEED
} from '../fixtures/rfxHub';
import { RFQ_SAMPLE_AWARD_SEED } from '../fixtures/rfqSamples';
/** @import { AwardCancellation, AwardRecord, AwardSapMark, NegotiationRound, RfiEvent, RfiResponse, RfpEvent, RfpFirmOffer, RfpOfferRound, RfpResponse } from '../../../sourcing/types' */

/**
 * A store over one RFx collection: read, update in place, append, reset.
 * @template {{ readonly id: string }} T
 * @param {readonly T[]} seed
 * @param {string} prefix
 */
export function collection(seed, prefix) {
  /** @type {T[]} */
  let rows = seed.map((r) => ({ ...r }));
  let seq = seed.length;
  return {
    /** @returns {readonly T[]} */
    all() {
      return rows;
    },
    /**
     * @param {string} id
     * @returns {T | undefined}
     */
    get(id) {
      return rows.find((r) => r.id === id);
    },
    /**
     * @param {string} id
     * @param {(row: T) => T} next
     * @returns {void}
     */
    update(id, next) {
      rows = rows.map((r) => (r.id === id ? next(r) : r));
    },
    /**
     * @param {T} row
     * @returns {void}
     */
    add(row) {
      rows = [row, ...rows];
    },
    /** @returns {string} */
    nextId() {
      seq += 1;
      return `${prefix}-${String(seq).padStart(4, '0')}`;
    },
    /** @returns {void} */
    reset() {
      rows = seed.map((r) => ({ ...r }));
      seq = seed.length;
    }
  };
}

/**
 * RFx C2 (AR-08) — a store that can only be APPENDED to: the collection above
 * without `update`. The award trail is kept in these, so nothing can edit what
 * was awarded, withdrawn or raised in SAP after the fact (RFX-R3).
 * @template {{ readonly id: string }} T
 * @param {readonly T[]} seed
 * @param {string} prefix
 */
export function appendOnly(seed, prefix) {
  const { all, get, add, nextId, reset } = /** @type {typeof collection<T>} */ (collection)(
    seed,
    prefix
  );
  return { all, get, add, nextId, reset };
}

export const rfiEventStore = /** @type {typeof collection<RfiEvent>} */ (collection)(
  RFI_EVENT_SEED,
  'rfi'
);
export const rfiResponseStore = /** @type {typeof collection<RfiResponse>} */ (collection)(
  RFI_RESPONSE_SEED,
  'rfi-resp'
);
export const rfpEventStore = /** @type {typeof collection<RfpEvent>} */ (collection)(
  RFP_EVENT_SEED,
  'rfp'
);
export const rfpResponseStore = /** @type {typeof collection<RfpResponse>} */ (collection)(
  RFP_RESPONSE_SEED,
  'rfp-resp'
);
export const negotiationRoundStore = /** @type {typeof collection<NegotiationRound>} */ (
  collection
)(NEGOTIATION_ROUND_SEED, 'nr');
// The Amplify split award (rfq-024) joins after the hub's seeded award.
export const awardStore = /** @type {typeof appendOnly<AwardRecord>} */ (appendOnly)(
  [...AWARD_SEED, ...RFQ_SAMPLE_AWARD_SEED],
  'aw'
);
// RFx C2 — the award trail. Nothing is seeded: every seeded award is in force.
export const awardCancellationStore = /** @type {typeof appendOnly<AwardCancellation>} */ (
  appendOnly
)([], 'awc');
export const awardSapMarkStore = /** @type {typeof appendOnly<AwardSapMark>} */ (appendOnly)(
  [],
  'aws'
);
export const rfpOfferRoundStore = /** @type {typeof collection<RfpOfferRound>} */ (collection)(
  [],
  'fr'
);
export const rfpFirmOfferStore = /** @type {typeof collection<RfpFirmOffer>} */ (collection)(
  [],
  'fo'
);

/**
 * The one response a supplier holds for an event, or undefined.
 * @template {{ supplierId: string }} T
 * @param {readonly T[]} rows
 * @param {(row: T) => boolean} match
 * @param {string} supplierId
 * @returns {T | undefined}
 */
export const responseOf = (rows, match, supplierId) =>
  rows.find((r) => match(r) && r.supplierId === supplierId);

/**
 * Reset every RFx store (test isolation).
 * @returns {void}
 */
export function resetRfxStores() {
  rfiEventStore.reset();
  rfiResponseStore.reset();
  rfpEventStore.reset();
  rfpResponseStore.reset();
  negotiationRoundStore.reset();
  awardStore.reset();
  awardCancellationStore.reset();
  awardSapMarkStore.reset();
  rfpOfferRoundStore.reset();
  rfpFirmOfferStore.reset();
}
