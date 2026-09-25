// ────────────────────────────────────────────────────────────────────────────
// RFx READ-MODEL VIEWS — the shapes `IProcurementService` returns for
// REQ-E03-01 to REQ-E03-05.
//
// They live BESIDE the entities rather than in `data/types.ts` so the service
// contract and the mock read model import one declaration instead of each
// holding its own: a view the adapter builds and a view the interface promises
// are the same thing, and two copies of a shape are two shapes.
//
// Everything here is DERIVED. `overdue`, `closed`, `responseState`, the response
// score and the "No history" `null` are computed at read from the deadlines and
// the answers (law 0.5) — no surface reads a stored one, because there is none.
// ────────────────────────────────────────────────────────────────────────────

import type {
  AwardRecord,
  NegotiationRound,
  RfiEvent,
  RfiResponse,
  RfpEvent,
  RfpFirmOffer,
  RfpOfferRound,
  RfpResponse,
} from './types';
import type { GateCriterion } from './complianceGate';

/**
 * CR-23 — one supplier's compliance-gate result on one sourcing event: every
 * invitee and every bidder. DERIVED at read from the certificates, the status
 * and the measured OTIF; a failing supplier can quote but cannot be awarded.
 */
export interface RfqSupplierGateView {
  readonly supplierId: string;
  readonly passes: boolean;
  readonly failed: readonly GateCriterion[];
}

/** What one invitee has done with its invitation. */
export type InviteeResponseState = 'notStarted' | 'draft' | 'submitted';

export interface RfxInviteeView {
  readonly supplierId: string;
  readonly supplierName: string;
  /** The deadline in force for THIS invitee (its extension, or the event's). */
  readonly deadline: string;
  readonly responseState: InviteeResponseState;
  readonly submittedAt: string | null;
  /** REQ-E03-01 AC-02 — `null` is "No history", never 0%. */
  readonly otif: number | null;
  readonly overdue: boolean;
  /** When this invitee accepted the event's confidentiality terms; null = not (yet). */
  readonly confidentialityAcceptedAt: string | null;
  /** When this invitee accepted the RFP's T&C document; null = not (yet). */
  readonly termsAcceptedAt: string | null;
}

export interface RfiResponseView extends RfiResponse {
  readonly supplierName: string;
  /** REQ-E03-02 — the weighted response score, or `null` when nothing is weighted. */
  readonly score: number | null;
}

export interface RfiEventView extends RfiEvent {
  readonly invitedSuppliers: readonly RfxInviteeView[];
  /** Buyer: the SUBMITTED responses. Supplier: its own, draft included. */
  readonly responses: readonly RfiResponseView[];
  readonly closed: boolean;
  /**
   * Supplier read only: the event is confidential and this supplier has not
   * accepted, so the read withheld its description, attachments and questions.
   * Always false for the buyer.
   */
  readonly confidentialityLocked: boolean;
}

export interface RfpResponseView extends RfpResponse {
  readonly supplierName: string;
  readonly complianceScore: number;
  readonly deviationCount: number;
}

export interface RfpEventView extends RfpEvent {
  readonly invitedSuppliers: readonly RfxInviteeView[];
  readonly responses: readonly RfpResponseView[];
  readonly closed: boolean;
  /** As on the RFI view: the read withheld the content until the supplier accepts. */
  readonly confidentialityLocked: boolean;
  /** The event number of `sourceRfiId`, resolved at read; null when none. */
  readonly sourceRfiNumber: string | null;
}


export interface NegotiationParticipantView {
  readonly supplierId: string;
  readonly supplierName: string;
  readonly revisedQuotationId: string | null;
  readonly revisedAt: string | null;
}

export interface NegotiationRoundView extends NegotiationRound {
  readonly rfqNumber: string;
  readonly rfqTitle: string;
  readonly participants: readonly NegotiationParticipantView[];
  readonly overdue: boolean;
  /** How many invitees have not answered yet (a supplier reads its own: 0 or 1). */
  readonly awaiting: number;
}

/** NR-2 — one option of a firm-offer round, in the words of whoever wrote it (edge case 3). */
export interface RfpRoundOptionView {
  /** The name a round and a firm price use (`rfpOptionRef`). */
  readonly ref: string;
  /** The option's own id: the buyer's, or the proposer's `sup-opt-N`. */
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  /** True for an option a supplier proposed in its RFP response (`sup-opt-…`). */
  readonly supplierProposed: boolean;
  /** The supplier that proposed it; absent on a buyer option. */
  readonly proposerSupplierId?: string;
}

/** NR-2 BR-04 — the firm price in force for one supplier × option × quantity point. */
export interface RfpFirmPriceView {
  readonly supplierId: string;
  readonly supplierName: string;
  readonly roundId: string;
  readonly roundNumber: number;
  readonly optionRef: string;
  readonly qty: number;
  readonly unitPrice: number;
  readonly validUntil: string;
  readonly submittedAt: string;
}

/**
 * NR-2 — a firm-offer round as a reader may see it. The buyer reads every
 * invitee and offer; a supplier reads a round only when invited, and then only
 * itself and its own offer.
 */
export interface RfpOfferRoundView extends RfpOfferRound {
  readonly rfpNumber: string;
  readonly rfpTitle: string;
  readonly currency: string;
  readonly options: readonly RfpRoundOptionView[];
  /** The buyer closed the round (`closedAt` is set). */
  readonly closed: boolean;
  /** Still Open, but past its deadline, so no offer is accepted. Derived at read. */
  readonly overdue: boolean;
  /** Buyer: every invitee's offer. Supplier: its own, if any. */
  readonly offers: readonly RfpFirmOffer[];
  /** How many visible invitees have not sent an offer in this round. */
  readonly awaiting: number;
  /**
   * BR-04 — the LAST firm price per supplier × option × point across every
   * round of this RFP the reader may see, whichever round it came from.
   */
  readonly firmPrices: readonly RfpFirmPriceView[];
}

export interface AwardedSupplierView {
  readonly supplierId: string;
  readonly supplierName: string;
  readonly sharePct: number;
  readonly quantity: number;
}

export interface AwardView extends AwardRecord {
  readonly rfqNumber: string;
  readonly rfqTitle: string;
  readonly uom: string;
  readonly awardedSuppliers: readonly AwardedSupplierView[];
  /** True when the award passed over the best-scored quote (BR-07). */
  readonly departedFromBestScore: boolean;
}
