// ────────────────────────────────────────────────────────────────────────────
// RFx entity types — REQ-E03-01 to REQ-E03-05 (Phase 6a).
//
// Three sourcing event types share one shape and differ in what they ask for:
//   · RFI  asks what a supplier CAN DO   (structured questions, REQ-E03-02)
//   · RFQ  asks what it COSTS            (line items and prices, REQ-E03-03 —
//          the RFQ entity itself is the pre-existing `RFQ` in `data/mockRfqs`)
//   · RFP  asks on WHAT TERMS            (a commercial terms table, REQ-E03-04)
//
// Everything a clock decides — open / closed / overdue / due soon — is DERIVED
// at read from the deadline (law 0.5), never stored. What IS stored is the
// deadline itself, the per-invitee extension the buyer granted, and the answers.
// ────────────────────────────────────────────────────────────────────────────

import type { BidCurrency } from '../../lib/currencyPolicy';

/** The question kinds an RFI section may ask (REQ-E03-02, section F). */
export type RfiQuestionType =
  | 'yesNo'
  | 'singleChoice'
  | 'multipleChoice'
  | 'numberWithUnit'
  | 'date'
  | 'text'
  | 'attachment';

/** The template sections A–F of the RFI (REQ-E03-02). */
export type RfiSectionId = 'capability' | 'experience' | 'facilities' | 'products' | 'compliance' | 'event';

/**
 * A scoring scale for a weighted `numberWithUnit` question: the value that
 * scores 100 and the value that scores 0, linear and clamped between them.
 * `best` may be below `worst` (fewer days is better).
 */
export interface RfiNumberScale {
  readonly best: number;
  readonly worst: number;
}

/** One question of an RFI, from the library or added for a single event. */
export interface RfiQuestion {
  readonly id: string;
  readonly sectionId: RfiSectionId;
  /** i18n key for the prompt. Business language only (SC-04). */
  readonly promptKey: string;
  readonly type: RfiQuestionType;
  /** Option ids for a single/multiple choice question; i18n key `rfx.opt.<id>`. */
  readonly options?: readonly string[];
  /** i18n key for the unit of a `numberWithUnit` question. */
  readonly unitKey?: string;
  readonly required: boolean;
  /**
   * OPTIONAL weight (REQ-E03-02 template rules). A weighted question feeds the
   * response score, which SHORTLISTS and never awards. Absent = the answer is
   * read, not scored — which is the honest state of every descriptive question.
   */
  readonly weight?: number;
  /** Per-option points (0–100) for a weighted choice question. */
  readonly optionScores?: Readonly<Record<string, number>>;
  /** The scale for a weighted `numberWithUnit` question. */
  readonly scale?: RfiNumberScale;
}

/** A reusable template Procurement keeps per category family. */
export interface RfiTemplate {
  readonly id: string;
  readonly nameKey: string;
  readonly questions: readonly RfiQuestion[];
}

/** One supplier's answer to one question. */
export interface RfiAnswer {
  readonly questionId: string;
  /** Choice ids, a number, a date, free text, or an attachment name. */
  readonly value?: string | number | readonly string[];
  /** The description every structured entry carries (REQ-E03-02 BR-02). */
  readonly description?: string;
}

/** A sourcing event's invitation, with the deadline actually in force for it. */
export interface RfxInvitee {
  readonly supplierId: string;
  /**
   * A deadline granted to THIS invitee alone (REQ-E03-02 edge case). Absent =
   * the event's own deadline applies. Never written back onto the event, so
   * "extended for everyone" and "extended for these three" stay distinguishable.
   */
  readonly deadline?: string;
}

/** An extension the buyer granted, kept so the trail shows who got what. */
export interface DeadlineExtension {
  readonly at: string;
  readonly deadline: string;
  /** Empty = every invitee. */
  readonly supplierIds: readonly string[];
}

export type RfxEventStatus = 'Draft' | 'Open' | 'Closed' | 'Cancelled';

/** REQ-E03-02 — a Request for Information. */
export interface RfiEvent {
  readonly id: string;
  readonly eventNumber: string;
  readonly title: string;
  /**
   * What PTI wants to learn, in the buyer's own words (section 3.6a CE-07 —
   * "the scope the suppliers answer"). Optional because the seeded events
   * predate it and an absent description is honestly absent; the RFP's
   * `scope` is the same field under the name that requirement uses.
   */
  readonly description?: string;
  readonly templateId: string;
  readonly materialCategory: string;
  readonly purchasingGroup?: string;
  readonly status: RfxEventStatus;
  readonly createdAt: string;
  readonly responseDeadline: string;
  readonly invitees: readonly RfxInvitee[];
  readonly questions: readonly RfiQuestion[];
  readonly extensions: readonly DeadlineExtension[];
}

export type RfxResponseStatus = 'Draft' | 'Submitted';

/** REQ-E03-02 — one supplier's RFI response. A Draft is invisible to PTI. */
export interface RfiResponse {
  readonly id: string;
  readonly rfiId: string;
  readonly supplierId: string;
  readonly status: RfxResponseStatus;
  readonly updatedAt: string;
  readonly submittedAt?: string;
  readonly answers: readonly RfiAnswer[];
}

// ── RFP (REQ-E03-04) ────────────────────────────────────────────────────────

export type RfpTermGroup = 'price' | 'payment' | 'delivery' | 'quality' | 'serviceLevel' | 'contract' | 'other';

/** A term from the standard list the buyer picks from. */
export interface RfpTermDefinition {
  readonly id: string;
  readonly group: RfpTermGroup;
  readonly labelKey: string;
  /**
   * When present, this term carries a number CR-15 can score: the price basis
   * feeds the price axis, the standard lead time the lead-time axis.
   */
  readonly scorable?: 'price' | 'leadTime';
}

/** A term row on one RFP, holding PTI's requested value. */
export interface RfpTermRow {
  readonly termId: string;
  readonly requestedValue: string;
}

export type TermStance = 'comply' | 'deviate';

/** A supplier's answer to one term row. */
export interface RfpTermAnswer {
  readonly termId: string;
  readonly proposedValue: string;
  readonly stance: TermStance;
  /** REQUIRED on `deviate` (REQ-E03-04) — a deviation nobody explained is not an answer. */
  readonly comment?: string;
}

/** REQ-E03-04 — a Request for Proposal. */
export interface RfpEvent {
  readonly id: string;
  readonly eventNumber: string;
  readonly title: string;
  readonly scope: string;
  readonly materialCategory: string;
  readonly purchasingGroup?: string;
  readonly status: RfxEventStatus;
  readonly createdAt: string;
  readonly responseDeadline: string;
  readonly currency: BidCurrency;
  readonly invitees: readonly RfxInvitee[];
  readonly terms: readonly RfpTermRow[];
  readonly extensions: readonly DeadlineExtension[];
}

/** REQ-E03-04 — one supplier's proposal. A Draft is invisible to PTI. */
export interface RfpResponse {
  readonly id: string;
  readonly rfpId: string;
  readonly supplierId: string;
  readonly status: RfxResponseStatus;
  readonly updatedAt: string;
  readonly submittedAt?: string;
  readonly answers: readonly RfpTermAnswer[];
  /** REQ-E03-04 edge case — terms the supplier wants to add. */
  readonly otherTerms?: string;
}

// ── Negotiation and award (REQ-E03-05) ──────────────────────────────────────

/** REQ-E03-05 BR-03 / BR-04 — one negotiation round on an RFQ. */
export interface NegotiationRound {
  readonly id: string;
  readonly rfqId: string;
  readonly roundNumber: number;
  readonly openedAt: string;
  readonly deadline: string;
  readonly invitedSupplierIds: readonly string[];
  readonly message?: string;
  readonly targetUnitPrice?: number;
  /** BR-04 — the buyer marked this round best and final. */
  readonly bestAndFinal: boolean;
  readonly closed: boolean;
}

/** REQ-E03-05 BR-06 — one line of a split award. */
export interface AwardLine {
  readonly supplierId: string;
  readonly quotationId: string;
  /** The RFQ line item this share is against; `''` = the whole event. */
  readonly itemCode: string;
  readonly sharePct: number;
  readonly quantity: number;
}

/** REQ-E03-05 BR-09 — the hub's record of an award. No PO, no contract. */
export interface AwardRecord {
  readonly id: string;
  readonly rfqId: string;
  readonly awardedAt: string;
  readonly lines: readonly AwardLine[];
  /** BR-07 — required when the award does not follow the best-scored quote. */
  readonly reason?: string;
  /** The quotation CR-15 ranked first when the award was recorded. */
  readonly bestScoredQuotationId?: string;
  readonly notAwardedSupplierIds: readonly string[];
}
