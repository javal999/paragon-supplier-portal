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
  AwardCancellation,
  AwardSapMark,
  AwardStatus,
  NegotiationRound,
  ResponseVersion,
  RfiAnswer,
  RfiEvent,
  RfiResponse,
  RfpAwardLine,
  RfpEvent,
  RfpFirmOffer,
  RfpOfferRound,
  RfpResponse,
  RfpTermAnswer,
  RfqAwardRecord,
} from './types';
import type { GateCriterion } from './complianceGate';
import type { BiddingEligibility } from './sourcingType';

/**
 * CR-23 — one supplier's compliance-gate result on one sourcing event: every
 * invitee and every bidder. DERIVED at read from the certificates, the status
 * and the measured OTIF; a failing supplier can quote but cannot be awarded.
 */
export interface RfqSupplierGateView {
  readonly supplierId: string;
  readonly passes: boolean;
  readonly failed: readonly GateCriterion[];
  /**
   * Material G2 (MR-10 BR-07) — the supplier against the event's sourcing
   * type on this date. Separate from CR-23: it never makes `passes` false.
   */
  readonly eligibility?: BiddingEligibility;
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
  /** Material G2 (MR-10 BR-07) — the invitee against the event's sourcing type today. */
  readonly eligibility?: BiddingEligibility;
}

export interface RfiResponseView extends RfiResponse {
  readonly supplierName: string;
  /** REQ-E03-02 — the weighted response score, or `null` when nothing is weighted. */
  readonly score: number | null;
  /**
   * NR-1 BR-08 — every submitted version, oldest first; the last is the one the
   * response's own fields hold. A seed with none reads as version 1. The buyer
   * reads them on submitted responses, a supplier only on its own.
   */
  readonly versions: readonly ResponseVersion<RfiAnswer>[];
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
  /** NR-1 BR-08 — as on the RFI response view. */
  readonly versions: readonly ResponseVersion<RfpTermAnswer>[];
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

export interface AwardView extends RfqAwardRecord {
  readonly rfqNumber: string;
  readonly rfqTitle: string;
  readonly uom: string;
  readonly awardedSuppliers: readonly AwardedSupplierView[];
  /** True when the award passed over the best-scored quote (BR-07). */
  readonly departedFromBestScore: boolean;
  /**
   * RFx C2 — DERIVED from the appended cancellation and SAP marking (AR-08).
   * A supplier reads it too: a `Cancelled` award is its "Award withdrawn".
   */
  readonly status: AwardStatus;
  /** NR-3 BR-12 — when the award was withdrawn; the date a supplier is shown. */
  readonly withdrawnAt?: string;
  /** The cancellation with its reason and actor. The buyer's read only. */
  readonly cancellation?: AwardCancellation;
  /** The SAP marking with its document number. The buyer's read only. */
  readonly sapMark?: AwardSapMark;
  /**
   * RFx C3 (NR-3 BR-12) — the items this award awarded, by `AwardItem.key`,
   * to ANY supplier. A supplier reads it too, with no supplier, share or
   * quantity attached: it is how a supplier on the award learns an item it
   * holds no line on is settled ("Not awarded") rather than still open
   * ("Pending"). Derived from the record at read.
   */
  readonly settledItemKeys: readonly string[];
}

/** RFx D2 — one line of an RFP award, with the words a screen shows it in. */
export interface RfpAwardLineView extends RfpAwardLine {
  readonly supplierName: string;
  /** The option's title, in the words of whoever wrote it (edge case 3). */
  readonly optionTitle: string;
}

/**
 * RFx D2 (NR-2 BR-09, AC-07; NR-3 BR-12) — how one supplier reads an RFP award:
 * awarded (it has lines), not awarded (a final award named it among the
 * responders), or withdrawn (the award was cancelled).
 */
export type RfpAwardOutcome = 'Awarded' | 'Not awarded' | 'Withdrawn';

/**
 * RFx D2 — an award on an RFP, as a scope may read it. The buyer reads every
 * line, the reason, the cancellation and the SAP marking. A supplier reads only
 * an award it is named on, only its OWN lines and its own "not awarded", and
 * its `outcome`; never another supplier's share, the reason or the SAP number.
 */
export interface RfpAwardView {
  readonly id: string;
  readonly eventType: 'rfp';
  readonly eventId: string;
  readonly rfpNumber: string;
  readonly rfpTitle: string;
  readonly awardedAt: string;
  readonly lines: readonly RfpAwardLineView[];
  readonly notAwardedSupplierIds: readonly string[];
  /** NR-2 BR-06 — why. The buyer's read only. */
  readonly reason?: string;
  /** DERIVED from the appended cancellation and SAP marking (AR-08). */
  readonly status: AwardStatus;
  /** When the award was withdrawn; the date a supplier is shown. */
  readonly withdrawnAt?: string;
  /** The buyer's read only. */
  readonly cancellation?: AwardCancellation;
  /** The buyer's read only. */
  readonly sapMark?: AwardSapMark;
  /** A supplier's read only: its own outcome on this award. */
  readonly outcome?: RfpAwardOutcome;
  /**
   * RFx D3 (NR-2 BR-09; NR-3 BR-12) — the option refs this award awarded, to
   * ANY supplier. A supplier reads it too, with no supplier, share or quantity
   * attached: it is how a supplier on the award reads "Not awarded" on an
   * option it holds no line on, rather than "Pending" (the RFQ's
   * `settledItemKeys`). Derived from the full record at read.
   */
  readonly settledOptionRefs: readonly string[];
}
