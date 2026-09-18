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
  RFP_RESPONSE_SEED,
} from '../fixtures/rfxHub';
import type {
  AwardRecord,
  NegotiationRound,
  RfiEvent,
  RfiResponse,
  RfpEvent,
  RfpResponse,
} from '../../../sourcing/types';

/** A store over one RFx collection: read, update in place, append, reset. */
function collection<T extends { readonly id: string }>(seed: readonly T[], prefix: string) {
  let rows: T[] = seed.map((r) => ({ ...r }));
  let seq = seed.length;
  return {
    all(): readonly T[] {
      return rows;
    },
    get(id: string): T | undefined {
      return rows.find((r) => r.id === id);
    },
    update(id: string, next: (row: T) => T): void {
      rows = rows.map((r) => (r.id === id ? next(r) : r));
    },
    add(row: T): void {
      rows = [row, ...rows];
    },
    nextId(): string {
      seq += 1;
      return `${prefix}-${String(seq).padStart(4, '0')}`;
    },
    reset(): void {
      rows = seed.map((r) => ({ ...r }));
      seq = seed.length;
    },
  };
}

export const rfiEventStore = collection<RfiEvent>(RFI_EVENT_SEED, 'rfi');
export const rfiResponseStore = collection<RfiResponse>(RFI_RESPONSE_SEED, 'rfi-resp');
export const rfpEventStore = collection<RfpEvent>(RFP_EVENT_SEED, 'rfp');
export const rfpResponseStore = collection<RfpResponse>(RFP_RESPONSE_SEED, 'rfp-resp');
export const negotiationRoundStore = collection<NegotiationRound>(NEGOTIATION_ROUND_SEED, 'nr');
export const awardStore = collection<AwardRecord>(AWARD_SEED, 'aw');

/** The one response a supplier holds for an event, or undefined. */
export const responseOf = <T extends { supplierId: string }>(
  rows: readonly T[],
  match: (row: T) => boolean,
  supplierId: string,
): T | undefined => rows.find((r) => match(r) && r.supplierId === supplierId);

/** Reset every RFx store (test isolation). */
export function resetRfxStores(): void {
  rfiEventStore.reset();
  rfiResponseStore.reset();
  rfpEventStore.reset();
  rfpResponseStore.reset();
  negotiationRoundStore.reset();
  awardStore.reset();
}
