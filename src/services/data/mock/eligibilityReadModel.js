// ────────────────────────────────────────────────────────────────────────────
// BIDDING ELIGIBILITY READ MODEL — Material G2 (MR-10 BR-05 to BR-07).
//
// The one place the mock layer joins a vendor's computed qualification (G1,
// `qualificationFor`), the per-level placeholder flag (G1,
// `qualificationRulesPlaceholder`) and an event's sourcing type. The rules
// themselves are pure (`sourcing/sourcingType.js`); the invitee read, the
// publish hook and both award hooks all ask here, so they cannot disagree.
// ────────────────────────────────────────────────────────────────────────────

import { mockSuppliers } from '@data/mockSuppliers';
/** @import { RFQ } from '@data/mockRfqs' */
/** @import { RfiEvent, RfpEvent } from '../../sourcing/types' */
/** @import { BiddingEligibility, NamedEligibility, SourcingEventFacts, SourcingType } from '../../sourcing/sourcingType' */
import { REQUIRED_LEVEL, biddingEligibility, sourcingTypeOf } from '../../sourcing/sourcingType';
import { sourcingTypeStore } from '../../transitions/sourcingTypeStore';
import { sdcClock } from '../../sdc/clock';
import { qualificationFor, qualificationRulesPlaceholder } from './qualificationReadModel';

/**
 * One vendor against a sourcing type on a date (default: the hub's now).
 * @param {string} supplierId
 * @param {SourcingType} sourcingType
 * @param {string} [onDate]
 * @returns {BiddingEligibility}
 */
export function eligibilityFor(supplierId, sourcingType, onDate = sdcClock.now()) {
  return biddingEligibility(
    qualificationFor(supplierId, onDate),
    sourcingType,
    qualificationRulesPlaceholder(REQUIRED_LEVEL[sourcingType])
  );
}

/**
 * The same, with the vendor's name for the refusal text.
 * @param {string} supplierId
 * @param {SourcingType} sourcingType
 * @param {string} [onDate]
 * @returns {NamedEligibility}
 */
export const namedEligibility = (supplierId, sourcingType, onDate) => ({
  supplierId,
  supplierName: mockSuppliers.find((s) => s.id === supplierId)?.name ?? supplierId,
  eligibility: eligibilityFor(supplierId, sourcingType, onDate)
});

/** Any RFx event as the sourcing type reads it. */
/** @typedef {RFQ | RfiEvent | RfpEvent} AnySourcingEvent */

/**
 * @param {AnySourcingEvent} e
 * @returns {e is RFQ}
 */
const isRfq = (e) => 'invitedSupplierIds' in e;

/**
 * The facts `sourcingTypeOf` reads, by event type.
 * @param {AnySourcingEvent} event
 * @returns {SourcingEventFacts}
 */
export const sourcingFactsOf = (event) =>
  isRfq(event)
    ? {
        kind: 'rfq',
        status: event.status,
        materialCategory: event.materialCategory,
        ...(event.sourcingType ? { sourcingType: event.sourcingType } : {})
      }
    : {
        kind: 'terms' in event ? 'rfp' : 'rfi',
        status: event.status,
        materialCategory: event.materialCategory,
        ...(event.purchasingGroup ? { purchasingGroup: event.purchasingGroup } : {}),
        ...(event.sourcingType ? { sourcingType: event.sourcingType } : {})
      };

/**
 * An event's sourcing type against the map in force (BR-06).
 * @param {AnySourcingEvent} event
 * @returns {SourcingType}
 */
export const eventSourcingType = (event) =>
  sourcingTypeOf(sourcingFactsOf(event), sourcingTypeStore.map());

/**
 * AR-16 — the invitee ids by event type: `invitedSupplierIds` on an RFQ, `invitees` otherwise.
 * @param {AnySourcingEvent} event
 * @returns {readonly string[]}
 */
export const inviteeIdsOf = (event) =>
  isRfq(event) ? event.invitedSupplierIds : event.invitees.map((i) => i.supplierId);
