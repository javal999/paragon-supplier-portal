// ────────────────────────────────────────────────────────────────────────────
// BIDDING ELIGIBILITY READ MODEL — Material G2 (MR-10 BR-05 to BR-07).
//
// The one place the mock layer joins a vendor's computed qualification (G1,
// `qualificationFor`), the per-level placeholder flag (G1,
// `qualificationRulesPlaceholder`) and an event's sourcing type. The rules
// themselves are pure (`sourcing/sourcingType.ts`); the invitee read, the
// publish hook and both award hooks all ask here, so they cannot disagree.
// ────────────────────────────────────────────────────────────────────────────

import { mockSuppliers } from '@data/mockSuppliers';
import type { RFQ } from '@data/mockRfqs';
import type { RfiEvent, RfpEvent } from '../../sourcing/types';
import {
  REQUIRED_LEVEL,
  biddingEligibility,
  sourcingTypeOf,
  type BiddingEligibility,
  type NamedEligibility,
  type SourcingEventFacts,
  type SourcingType,
} from '../../sourcing/sourcingType';
import { sourcingTypeStore } from '../../transitions/sourcingTypeStore';
import { sdcClock } from '../../sdc/clock';
import { qualificationFor, qualificationRulesPlaceholder } from './qualificationReadModel';

/** One vendor against a sourcing type on a date (default: the hub's now). */
export function eligibilityFor(
  supplierId: string,
  sourcingType: SourcingType,
  onDate: string = sdcClock.now(),
): BiddingEligibility {
  return biddingEligibility(
    qualificationFor(supplierId, onDate),
    sourcingType,
    qualificationRulesPlaceholder(REQUIRED_LEVEL[sourcingType]),
  );
}

/** The same, with the vendor's name for the refusal text. */
export const namedEligibility = (supplierId: string, sourcingType: SourcingType, onDate?: string): NamedEligibility => ({
  supplierId,
  supplierName: mockSuppliers.find((s) => s.id === supplierId)?.name ?? supplierId,
  eligibility: eligibilityFor(supplierId, sourcingType, onDate),
});

/** Any RFx event as the sourcing type reads it. */
export type AnySourcingEvent = RFQ | RfiEvent | RfpEvent;

const isRfq = (e: AnySourcingEvent): e is RFQ => 'invitedSupplierIds' in e;

/** The facts `sourcingTypeOf` reads, by event type. */
export const sourcingFactsOf = (event: AnySourcingEvent): SourcingEventFacts =>
  isRfq(event)
    ? {
        kind: 'rfq',
        status: event.status,
        materialCategory: event.materialCategory,
        ...(event.sourcingType ? { sourcingType: event.sourcingType } : {}),
      }
    : {
        kind: 'terms' in event ? 'rfp' : 'rfi',
        status: event.status,
        materialCategory: event.materialCategory,
        ...(event.purchasingGroup ? { purchasingGroup: event.purchasingGroup } : {}),
        ...(event.sourcingType ? { sourcingType: event.sourcingType } : {}),
      };

/** An event's sourcing type against the map in force (BR-06). */
export const eventSourcingType = (event: AnySourcingEvent): SourcingType =>
  sourcingTypeOf(sourcingFactsOf(event), sourcingTypeStore.map());

/** AR-16 — the invitee ids by event type: `invitedSupplierIds` on an RFQ, `invitees` otherwise. */
export const inviteeIdsOf = (event: AnySourcingEvent): readonly string[] =>
  isRfq(event) ? event.invitedSupplierIds : event.invitees.map((i) => i.supplierId);
