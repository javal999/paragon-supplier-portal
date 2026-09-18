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

import type { RfiEvent, RfiResponse, RfpEvent, RfpResponse, NegotiationRound, AwardRecord } from './types';

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
