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
import type { AttachmentMeta } from '../attachments/sessionAttachments';
import type { ActorAttribution } from '../../lib/enforcement';
import type { QualificationWarning, SourcingType } from './sourcingType';

/**
 * The question kinds an RFI (or an RFP's questions section) may ask.
 *
 * RFx authoring batch (2026-09-21): `longText`, `money`, `percentage` and
 * `priceRange` join the original seven. `priceRange` is the RFI's INDICATIVE
 * price question (spec D4): a min–max range in a currency and a unit, never a
 * firm price, and every surface labels it so.
 */
export type RfiQuestionType =
  | 'yesNo'
  | 'singleChoice'
  | 'multipleChoice'
  | 'numberWithUnit'
  | 'date'
  | 'text'
  | 'longText'
  | 'money'
  | 'percentage'
  | 'priceRange'
  | 'attachment';

/** The template sections A–F of the RFI (REQ-E03-02). */
export type RfiSectionId = 'capability' | 'experience' | 'facilities' | 'products' | 'compliance' | 'event';

/**
 * A section the buyer added for ONE event. The id carries the `custom-` prefix
 * so it can never collide with the template's A–F, and the title is the buyer's
 * own words (not an i18n key — nobody translated it).
 */
export type RfxCustomSectionId = `custom-${string}`;

export interface RfxCustomSection {
  readonly id: RfxCustomSectionId;
  readonly title: string;
}

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
  readonly sectionId: RfiSectionId | RfxCustomSectionId;
  /** i18n key for the prompt. Business language only (SC-04). */
  readonly promptKey: string;
  readonly type: RfiQuestionType;
  /** Option ids for a single/multiple choice question; i18n key `rfx.opt.<id>`. */
  readonly options?: readonly string[];
  /**
   * The buyer's own words for each option id, for a choice question written in
   * the option editor (BL-36). Library options have none and resolve through
   * `rfx.opt.<id>`; an authored option is its label, in the buyer's language.
   */
  readonly optionLabels?: Readonly<Record<string, string>>;
  /**
   * i18n key for the unit of a `numberWithUnit` / `priceRange` question — or,
   * for a question the buyer wrote, the buyer's own unit (the `promptKey`
   * convention: an unknown key renders as the words themselves).
   */
  readonly unitKey?: string;
  readonly required: boolean;
  /** Help text shown under the prompt, in the buyer's own words. */
  readonly help?: string;
  /** Optional bounds on a `numberWithUnit` / `money` / `percentage` answer. */
  readonly min?: number;
  readonly max?: number;
  /** The currency of a `money` or `priceRange` question. */
  readonly currency?: BidCurrency;
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

// ── Documents (NR-1 BR-01 to BR-05, BR-11) ─────────────────────────────────

/**
 * The kinds of document a buyer can ask for (NR-1 BR-02). Ids, not labels: the
 * words a screen shows come through `t()`.
 */
export type DocumentType =
  | 'certificate'
  | 'specification'
  | 'drawing'
  | 'samplePhoto'
  | 'quotation'
  | 'companyProfile'
  | 'other';

export const DOCUMENT_TYPES: readonly DocumentType[] = [
  'certificate',
  'specification',
  'drawing',
  'samplePhoto',
  'quotation',
  'companyProfile',
  'other',
];

/**
 * One document the buyer asks every supplier for (NR-1 BR-02). `itemLineNo`
 * names one RFQ item (`RfqItem.lineNo`) and is refused on an RFI or an RFP:
 * only an RFQ has items. Absent = the whole response.
 */
export interface DocumentRequest {
  readonly id: string;
  /** The buyer's own words. */
  readonly name: string;
  readonly type: DocumentType;
  readonly required: boolean;
  readonly itemLineNo?: number;
}

/** The certificate fields a Certificate request also takes (NR-1 BR-04). */
export interface CertificateFields {
  readonly number: string;
  readonly issuer: string;
  /** `YYYY-MM-DD`. Expiry is judged when read (`certificateExpired`), never stored (law 0.5). */
  readonly expiresOn: string;
}

/**
 * One file a supplier sends with a response (NR-1 BR-01). `requestId` names
 * the request it answers; absent = one of the supplier's "other documents".
 * `uploadedAt` and `uploadedBy` are store-assigned (`stampDocuments`).
 */
export interface ResponseDocument {
  readonly id: string;
  readonly requestId?: string;
  readonly attachment: AttachmentMeta;
  readonly uploadedAt: string;
  /**
   * CE-11i / NR-1 BR-10 — WHO sent the file: the SESSION's actor when the file
   * first arrived, never the payload's (C10 §6.2). Kept unchanged while the
   * file is carried into a later save or version. OPTIONAL because a document
   * stored before this field existed (a quote's legacy `attachments` read
   * through `documentsOf`, any row already held) has no uploader on record, and
   * back-filling one would invent a fact: absent reads as "Not recorded".
   * Today every stamp is `UNATTRIBUTED: NO_PERSON_IN_SESSION`.
   */
  readonly uploadedBy?: ActorAttribution;
  readonly certificate?: CertificateFields;
}

/** One supplier's answer to one question. */
export interface RfiAnswer {
  readonly questionId: string;
  /** Choice ids, a number, a date, free text, or an attachment name. */
  readonly value?: string | number | readonly string[];
  /** The description every structured entry carries (REQ-E03-02 BR-02). */
  readonly description?: string;
  /** A `priceRange` answer: the INDICATIVE range, in the question's currency. */
  readonly range?: { readonly min: number; readonly max: number };
  /** An `attachment` answer's files: metadata only, the file itself is session-held (BL-27). */
  readonly attachments?: readonly AttachmentMeta[];
}

/**
 * The confidentiality (bidder-agreement) gate an event may carry. When present
 * the supplier accepts once before the scope, attachments and questions are
 * shown, and the READ withholds them until it has.
 */
export interface RfxConfidentiality {
  /** The buyer's terms, in the buyer's words. Absent = the standard wording. */
  readonly terms?: string;
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

/**
 * RFx D2 — an RFP's states: the RFx ones plus the two its award reaches
 * (`rfpEvent.flow.ts`). An RFI is never awarded (RFX-D1), so the shared union
 * stays as it is.
 */
export type RfpEventStatus = RfxEventStatus | 'Partly awarded' | 'Awarded';

/**
 * BL-93 / CE-08 — one edit of a DRAFT event (the revise-draft verbs). WHO is
 * the session's actor and WHEN is the store's clock; neither comes from the
 * payload, so a caller cannot backdate or reassign its own edit. Appended,
 * never replaced: the trail shows every edit, in order.
 */
export interface DraftRevision {
  readonly at: string;
  readonly by: ActorAttribution;
}

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
  /** Sections the buyer added for this event, in the order they render. */
  readonly customSections?: readonly RfxCustomSection[];
  /** The buyer's documents: a brief, drawings, reference images (session-held). */
  readonly attachments?: readonly AttachmentMeta[];
  /** Present = the supplier must accept before reading the event. */
  readonly confidentiality?: RfxConfidentiality;
  /** BL-93 — every edit made while it was a Draft (CE-08). */
  readonly revisions?: readonly DraftRevision[];
  /** NR-1 BR-02 — the documents the buyer asks every supplier for. */
  readonly documentRequests?: readonly DocumentRequest[];
  /**
   * Material G2 (MR-10 BR-06) — Direct or Indirect, from the category's
   * mapping, STORED AT PUBLISH and fixed after. Absent on a Draft (it reads
   * the map) and on an event published before G2 (it reads Direct, edge case 4).
   */
  readonly sourcingType?: SourcingType;
  /**
   * Material G2 — owner ruling 2026-09-29: the invitees published below the
   * level while the list for that level was a placeholder. Appended at
   * publish; never edited.
   */
  readonly qualificationWarnings?: readonly QualificationWarning[];
}

export type RfxResponseStatus = 'Draft' | 'Submitted';

/**
 * NR-1 BR-08 (D-6) — one submitted version of an RFI or RFP response. Appended
 * on each submit and each revise, never edited or removed (RFX-R3, AR-05). The
 * response's own fields always hold the latest version. `number` is 1-based.
 * A seeded Submitted response carries no versions and is read as version 1
 * (`responseVersions` in `sourcing/responseVersions`).
 */
export interface ResponseVersion<TAnswer> {
  readonly number: number;
  readonly submittedAt: string;
  readonly answers: readonly TAnswer[];
  /** RFP only — the answers to the RFP's questions section. */
  readonly questionAnswers?: readonly RfiAnswer[];
  /** RFP only — the indicative pricing. */
  readonly pricing?: RfpPricingAnswer;
  /** RFP only — terms the supplier wants to add. */
  readonly otherTerms?: string;
  readonly documents?: readonly ResponseDocument[];
}

/** REQ-E03-02 — one supplier's RFI response. A Draft is invisible to PTI. */
export interface RfiResponse {
  readonly id: string;
  readonly rfiId: string;
  readonly supplierId: string;
  readonly status: RfxResponseStatus;
  readonly updatedAt: string;
  readonly submittedAt?: string;
  readonly answers: readonly RfiAnswer[];
  /** When this supplier accepted the event's confidentiality terms (store-assigned). */
  readonly confidentialityAcceptedAt?: string;
  /** NR-1 BR-01 — the supplier's files. Only its author and, once Submitted, PTI read them. */
  readonly documents?: readonly ResponseDocument[];
  /** NR-1 BR-08 — every submitted version, oldest first. Absent on seeds (read as version 1). */
  readonly versions?: readonly ResponseVersion<RfiAnswer>[];
}

// ── RFP (REQ-E03-04) ────────────────────────────────────────────────────────

export type RfpTermGroup = 'price' | 'payment' | 'delivery' | 'quality' | 'serviceLevel' | 'contract' | 'other';

/** A term from the standard list the buyer picks from. */
/** How a term's value is read: free text, a number with a unit, a choice, or yes/no. */
export type RfpTermValueKind = 'text' | 'numberWithUnit' | 'choice' | 'yesNo';

export interface RfpTermDefinition {
  readonly id: string;
  readonly group: RfpTermGroup;
  readonly labelKey: string;
  /** The value kind this term is asked in. Absent = free text. */
  readonly valueKind?: RfpTermValueKind;
  /** i18n key of the unit, for a `numberWithUnit` term. */
  readonly unitKey?: string;
  /**
   * When present, this term carries a number CR-15 can score: the price basis
   * feeds the price axis, the standard lead time the lead-time axis.
   */
  readonly scorable?: 'price' | 'leadTime';
}

/** The id prefix of a term the buyer wrote for one RFP (not on the standard list). */
export type RfpCustomTermId = `custom-${string}`;

/**
 * A term row on one RFP, holding PTI's requested value.
 *
 * A STANDARD row names a term on `RFP_STANDARD_TERMS` and needs nothing else. A
 * CUSTOM row (`custom-…` id) is the buyer's own term, so it carries what the
 * standard list would have: its label (the buyer's words), its group, its value
 * kind, and, for a choice, its options.
 */
export interface RfpTermRow {
  readonly termId: string;
  readonly requestedValue: string;
  /** Custom term: the buyer's label. */
  readonly label?: string;
  /** Custom term: the group it renders under. Absent = `other`. */
  readonly group?: RfpTermGroup;
  /** The value kind. Absent = the standard term's own, else free text. */
  readonly valueKind?: RfpTermValueKind;
  /** The unit of a `numberWithUnit` value (the buyer's own words on a custom term). */
  readonly unit?: string;
  /** The options of a `choice` value, in the buyer's words. */
  readonly options?: readonly string[];
}

/**
 * An optional T&C document on an RFP: the supplier ticks acceptance before it
 * may answer. Text, a file, or both.
 */
export interface RfpTermsDocument {
  readonly text?: string;
  readonly attachment?: AttachmentMeta;
}

/** One option PTI asks an INDICATIVE price for (open-spec requests, spec D4). */
export interface RfpPricingOption {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
}

/**
 * RFP indicative pricing: options × quantity points. Every price asked here is
 * INDICATIVE (spec D4); firm prices by tier belong to the RFQ.
 */
export interface RfpPricingRequest {
  readonly options: readonly RfpPricingOption[];
  /** Indicative quantity points, ascending (e.g. 10,000 / 50,000 / 100,000). */
  readonly quantityPoints: readonly number[];
  /** Whether a quantity point is per variant or across the whole order. */
  readonly quantityBasis: 'perVariant' | 'total';
  /** Ask the supplier for a sample offer (can sample, ready date). */
  readonly samplesRequested: boolean;
}

/** One indicative price: one option at one quantity point. */
export interface RfpIndicativePrice {
  readonly optionId: string;
  readonly qty: number;
  readonly unitPrice: number;
}

/** A supplier's indicative-pricing answer. */
export interface RfpPricingAnswer {
  readonly prices: readonly RfpIndicativePrice[];
  /** Options the SUPPLIER proposes (e.g. "pump and cap only"); ids start `sup-opt-`. */
  readonly proposedOptions: readonly RfpPricingOption[];
  readonly sample?: { readonly canSample: boolean; readonly readyDate?: string };
  readonly timelineNote?: string;
  /** How long the indicative prices hold. */
  readonly validUntil?: string;
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
  readonly status: RfpEventStatus;
  readonly createdAt: string;
  readonly responseDeadline: string;
  readonly currency: BidCurrency;
  readonly invitees: readonly RfxInvitee[];
  readonly terms: readonly RfpTermRow[];
  readonly extensions: readonly DeadlineExtension[];
  /** The RFI this RFP was created from (spec D3); the board shows "Created from RFI-…". */
  readonly sourceRfiId?: string;
  /** Optional typed questions, the same shape the RFI asks. */
  readonly questions?: readonly RfiQuestion[];
  readonly customSections?: readonly RfxCustomSection[];
  readonly attachments?: readonly AttachmentMeta[];
  readonly confidentiality?: RfxConfidentiality;
  /** Present = the supplier accepts this T&C before answering. */
  readonly termsDocument?: RfpTermsDocument;
  /** Present = the RFP asks for indicative prices (options × quantity points). */
  readonly pricing?: RfpPricingRequest;
  /** BL-93 — every edit made while it was a Draft (CE-08). */
  readonly revisions?: readonly DraftRevision[];
  /** NR-1 BR-02 — the documents the buyer asks every supplier for. */
  readonly documentRequests?: readonly DocumentRequest[];
  /**
   * Material G2 (MR-10 BR-06) — Direct or Indirect, from the category's
   * mapping, STORED AT PUBLISH and fixed after. Absent on a Draft (it reads
   * the map) and on an event published before G2 (it reads Direct, edge case 4).
   */
  readonly sourcingType?: SourcingType;
  /**
   * Material G2 — owner ruling 2026-09-29: the invitees published below the
   * level while the list for that level was a placeholder. Appended at
   * publish; never edited.
   */
  readonly qualificationWarnings?: readonly QualificationWarning[];
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
  /** Answers to the RFP's questions section. */
  readonly questionAnswers?: readonly RfiAnswer[];
  /** The supplier's indicative pricing. */
  readonly pricing?: RfpPricingAnswer;
  readonly confidentialityAcceptedAt?: string;
  /** When the supplier accepted the RFP's T&C document (store-assigned). */
  readonly termsAcceptedAt?: string;
  /** NR-1 BR-01 — the supplier's files. Only its author and, once Submitted, PTI read them. */
  readonly documents?: readonly ResponseDocument[];
  /** NR-1 BR-08 — every submitted version, oldest first. Absent on seeds (read as version 1). */
  readonly versions?: readonly ResponseVersion<RfpTermAnswer>[];
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

// ── Firm-offer round on an RFP (NR-2, decision D-1 option A) ────────────────

/**
 * NR-2 BR-02 — a firm-offer round on a Closed RFP: the options and quantity
 * points the buyer wants FIRM prices for, and the suppliers asked. Rounds are
 * append-only: asking again is a new round, never an edit of this one.
 */
export interface RfpOfferRound {
  readonly id: string;
  readonly rfpId: string;
  readonly roundNumber: number;
  /**
   * Option REFS (`rfpOptionRef`): a buyer option's id as-is, or
   * `<proposerSupplierId>:sup-opt-N` for an option a supplier proposed, since a
   * `sup-opt-N` id is unique only within its proposer's response.
   */
  readonly optionRefs: readonly string[];
  readonly quantityPoints: readonly number[];
  readonly invitedSupplierIds: readonly string[];
  readonly deadline: string;
  readonly message?: string;
  readonly openedAt: string;
  /** Set once by `t_rfp_round_close`. Absent = the round is Open. */
  readonly closedAt?: string;
}

/** One firm price: one option at one quantity point (NR-2 BR-03). */
export interface RfpFirmPrice {
  /** The option's ref, as in `RfpOfferRound.optionRefs`. */
  readonly optionRef: string;
  readonly qty: number;
  readonly unitPrice: number;
}

/** One version of a firm offer, as the supplier sent it. */
export interface RfpFirmOfferVersion {
  readonly version: number;
  readonly prices: readonly RfpFirmPrice[];
  readonly validUntil: string;
  readonly documents?: readonly AttachmentMeta[];
  readonly submittedAt: string;
}

/**
 * NR-2 BR-01 / BR-03 / BR-04 — one supplier's firm offer in one round. The top
 * fields are the version in force; `versions` keeps every version, oldest
 * first, and is only ever appended to.
 */
export interface RfpFirmOffer {
  readonly id: string;
  readonly roundId: string;
  readonly rfpId: string;
  readonly supplierId: string;
  readonly prices: readonly RfpFirmPrice[];
  /** The supplier holds these prices until this date (on or after the round deadline). */
  readonly validUntil: string;
  readonly documents?: readonly AttachmentMeta[];
  readonly versions: readonly RfpFirmOfferVersion[];
  /** When the version in force was sent. */
  readonly submittedAt: string;
}

/** REQ-E03-05 BR-06 — one line of a split award. */
export interface AwardLine {
  readonly supplierId: string;
  readonly quotationId: string;
  /**
   * The MATERIAL CODE of the RFQ line item this share is against; `''` = none:
   * the whole event on a legacy award, or a tiered item named by `itemLineNo`.
   */
  readonly itemCode: string;
  /**
   * The TIERED item (`RfqItem.lineNo`) this share is against (RFx spec, "Award
   * per item"). A tiered item has no material code — Oslo's stickers are not in
   * the material master — so it is named by its line, never by a code minted to
   * fill `itemCode`. Absent on a legacy award.
   */
  readonly itemLineNo?: number;
  readonly sharePct: number;
  readonly quantity: number;
  /**
   * NR-3 BR-02 (D-2) — which side of the line the buyer TYPED: the share
   * (`pct`, the quantity derived from it) or the quantity (`qty`, the share
   * derived from it). Both are stored either way. Absent reads as `pct`, the
   * only basis before NR-3; the award verb records it on every line it keeps.
   */
  readonly splitBasis?: AwardSplitBasis;
  /**
   * The quantity break THIS LINE was awarded at (NR-3 BR-04: a break per item,
   * so per line, never per award). On a tiered RFQ, one of its evaluation
   * breaks; on a legacy RFQ, the line item's own quantity — its only break.
   * The lines of one item share one break. A legacy line sent without it is
   * read at its item's only break, and recorded with it.
   */
  readonly awardTierQty?: number;
  /** RFx D2 — an RFQ line names no RFP option and no firm offer. */
  readonly optionRef?: never;
  readonly firmOfferId?: never;
}

/**
 * RFx D2 (NR-2 BR-05, AR-02) — one line of an RFP award: a share of ONE option
 * at one quantity point of a firm-offer round, on one supplier's FIRM OFFER.
 * It names the option and the offer in place of an RFQ item and quotation; an
 * offer id is never put in `quotationId`, so no RFQ-side reader can take an
 * RFP line for a quote.
 */
export interface RfpAwardLine {
  readonly supplierId: string;
  /**
   * The option, by its ref (`rfpOptionRef`): a buyer option's id, or
   * `${proposerSupplierId}:${optionId}` for a supplier-proposed one, so two
   * suppliers' `sup-opt-1` stay two options.
   */
  readonly optionRef: string;
  /** The `RfpFirmOffer` whose firm price this share is awarded on. */
  readonly firmOfferId: string;
  readonly sharePct: number;
  readonly quantity: number;
  /** NR-3 BR-02 — the side the buyer typed; recorded on every line. */
  readonly splitBasis?: AwardSplitBasis;
  /** The quantity point of the round this line was awarded at (NR-2 BR-05). */
  readonly awardTierQty?: number;
  /** An RFP line names no RFQ quotation and no RFQ item. */
  readonly quotationId?: never;
  readonly itemCode?: never;
  readonly itemLineNo?: never;
}

/** Either arm's line, where a rule reads both (the shared award shape rule). */
export type AnyAwardLine = AwardLine | RfpAwardLine;

/** NR-3 BR-02 — the side of an award line the buyer typed. */
export type AwardSplitBasis = 'pct' | 'qty';

/**
 * AR-02 — the kind of sourcing event an award record belongs to. RFx D2 adds
 * the RFP arm, which reuses this record rather than adding a parallel one.
 */
export type AwardEventType = 'rfq' | 'rfp';

/** REQ-E03-05 BR-09 — the hub's record of an award. No PO, no contract. */
export type AwardRecord = RfqAwardRecord | RfpAwardRecord;

/**
 * RFx D2 (NR-2 BR-05 to BR-07) — an award on an RFP: per option, on firm
 * offers. The same record as the RFQ's, with its own lines. The reason is
 * always there (NR-2 BR-06: every RFP award needs one).
 */
export interface RfpAwardRecord {
  readonly id: string;
  readonly eventType: 'rfp';
  readonly eventId: string;
  readonly awardedAt: string;
  readonly lines: readonly RfpAwardLine[];
  readonly reason: string;
  /**
   * NR-2 BR-09 — the responders told they were not awarded. Empty on a partial
   * award; the final award names every responder no award of the RFP named.
   */
  readonly notAwardedSupplierIds: readonly string[];
  /** Material B4 (MR-2 BR-06, AC-05) — see `ComplianceAtAward`. */
  readonly complianceAtAward?: readonly ComplianceAtAward[];
  /** An RFP award is not judged against a best-scored quote (NR-2 BR-06). */
  readonly bestScoredQuotationId?: never;
  readonly bestScoredByItem?: never;
  /**
   * Material G2 — owner ruling 2026-09-29: the vendors awarded below the level
   * the event's type needs while that level's list was a placeholder. The
   * award needed a reason for them; the record keeps the warning.
   */
  readonly qualificationWarnings?: readonly QualificationWarning[];
}

/** REQ-E03-05 BR-09 — the hub's record of an award on an RFQ. */
export interface RfqAwardRecord {
  readonly id: string;
  /** AR-02 — the event type and id this award is for (was `rfqId`). */
  readonly eventType: 'rfq';
  readonly eventId: string;
  readonly awardedAt: string;
  readonly lines: readonly AwardLine[];
  /** BR-07 — required when the award does not follow the best-scored quote. */
  readonly reason?: string;
  /** The quotation CR-15 ranked first when the award was recorded. */
  readonly bestScoredQuotationId?: string;
  /**
   * A tiered RFQ is awarded ITEM BY ITEM, so the best score it departs from is
   * per item: the quotation CR-15 ranked first for each item AWARDED HERE, at
   * that item's break, when the award was recorded. Absent on a legacy award.
   */
  readonly bestScoredByItem?: readonly { readonly itemLineNo: number; readonly quotationId: string }[];
  /**
   * BR-08 — the invited suppliers told they were not awarded. Empty on a
   * PARTIAL award (NR-3 BR-06): a supplier with no share yet may still win an
   * item left open. The final award names every invitee no award of the event
   * named.
   */
  readonly notAwardedSupplierIds: readonly string[];
  /**
   * Material G2 — owner ruling 2026-09-29: the vendors awarded below the level
   * the event's type needs while that level's list was a placeholder. The
   * award needed a reason for them; the record keeps the warning.
   */
  readonly qualificationWarnings?: readonly QualificationWarning[];
  /** Material B4 (MR-2 BR-06, AC-05) — see `ComplianceAtAward`. */
  readonly complianceAtAward?: readonly ComplianceAtAward[];
}

/**
 * Material B4 (MR-2 BR-06, AC-05) — the update compliance an awarded supplier
 * had when the award was recorded, kept as shown then (`null` = "No history").
 * One row per awarded supplier. Absent on awards recorded before B4.
 */
export interface ComplianceAtAward {
  readonly supplierId: string;
  readonly pct: number | null;
}

/**
 * RFx C2 (NR-3 BR-09 to BR-11, AR-08) — the status an award is in, DERIVED at
 * read from the records appended beside it, never stored on the award:
 * `Active` until a cancellation or a SAP marking is appended for it.
 */
export type AwardStatus = 'Active' | 'Cancelled' | 'Raised in SAP';

/**
 * NR-3 BR-09 / BR-11 — an award withdrawn by the buyer, with who, when and
 * why. APPENDED to its own store; the `AwardRecord` it names is never edited,
 * so the trail keeps what was awarded as well as why it was withdrawn.
 */
export interface AwardCancellation {
  readonly id: string;
  readonly awardId: string;
  readonly cancelledAt: string;
  readonly reason: string;
  /** CE-08 — the session's actor (UNATTRIBUTED until an identity provider lands). */
  readonly by: ActorAttribution;
}

/**
 * NR-3 BR-10 / BR-11 — an award marked "Raised in SAP", with the SAP document
 * number the buyer typed (no SAP interface). After it the award cannot be
 * cancelled here: changes happen in SAP. APPENDED to its own store.
 */
export interface AwardSapMark {
  readonly id: string;
  readonly awardId: string;
  readonly sapDocumentNo: string;
  readonly markedAt: string;
  readonly by: ActorAttribution;
}
