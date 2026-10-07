// ────────────────────────────────────────────────────────────────────────────
// RFx READ-MODEL VIEWS — the shapes `IProcurementService` returns for
// REQ-E03-01 to REQ-E03-05.
//
// They live BESIDE the entities rather than in `data/types.js` so the service
// contract and the mock read model import one declaration instead of each
// holding its own: a view the adapter builds and a view the interface promises
// are the same thing, and two copies of a shape are two shapes.
//
// Everything here is DERIVED. `overdue`, `closed`, `responseState`, the response
// score and the "No history" `null` are computed at read from the deadlines and
// the answers (law 0.5) — no surface reads a stored one, because there is none.
// ────────────────────────────────────────────────────────────────────────────

/** @import { AwardCancellation, AwardSapMark, AwardStatus, NegotiationRound, ResponseVersion, RfiAnswer, RfiEvent, RfiResponse, RfpAwardLine, RfpEvent, RfpFirmOffer, RfpOfferRound, RfpResponse, RfpTermAnswer, RfqAwardRecord, ComplianceAtAward } from './types' */
/** @import { GateCriterion } from './complianceGate' */
/** @import { BiddingEligibility, QualificationWarning } from './sourcingType' */

/**
 * CR-23 — one supplier's compliance-gate result on one sourcing event: every
 * invitee and every bidder. DERIVED at read from the certificates, the status
 * and the measured OTIF; a failing supplier can quote but cannot be awarded.
 */
/**
 * @typedef {object} RfqSupplierGateView
 * @property {string} supplierId
 * @property {boolean} passes
 * @property {readonly GateCriterion[]} failed
 * @property {BiddingEligibility} [eligibility] Material G2 (MR-10 BR-07) — the supplier against the event's sourcing
 *   type on this date. Separate from CR-23: it never makes `passes` false.
 */

/** What one invitee has done with its invitation. */
/** @typedef {'notStarted' | 'draft' | 'submitted'} InviteeResponseState */

/**
 * @typedef {object} RfxInviteeView
 * @property {string} supplierId
 * @property {string} supplierName
 * @property {string} deadline -  The deadline in force for THIS invitee (its extension, or the event's).
 * @property {InviteeResponseState} responseState
 * @property {string | null} submittedAt
 * @property {number | null} otif -  REQ-E03-01 AC-02 — `null` is "No history", never 0%.
 * @property {boolean} overdue
 * @property {string | null} confidentialityAcceptedAt -  When this invitee accepted the event's confidentiality terms; null = not (yet).
 * @property {string | null} termsAcceptedAt -  When this invitee accepted the RFP's T&C document; null = not (yet).
 * @property {BiddingEligibility} [eligibility] -  Material G2 (MR-10 BR-07) — the invitee against the event's sourcing type today.
 */

/**
 * `score`:  REQ-E03-02 — the weighted response score, or `null` when nothing is weighted.
 * `versions`: NR-1 BR-08 — every submitted version, oldest first; the last is the one the response's own fields hold. A seed with none reads as version 1. The buyer reads them on submitted responses, a supplier only on its own.
 *
 * @typedef {Omit<RfiResponse, 'versions'> & {
 *     readonly supplierName: string;
 *     readonly score: number | null;
 *     readonly versions: readonly ResponseVersion<RfiAnswer>[];
 *   }} RfiResponseView
 */

/**
 * `responses`:  Buyer: the SUBMITTED responses. Supplier: its own, draft included.
 * `confidentialityLocked`: Supplier read only: the event is confidential and this supplier has not accepted, so the read withheld its description, attachments and questions. Always false for the buyer.
 *
 * @typedef {RfiEvent & {
 *     readonly invitedSuppliers: readonly RfxInviteeView[];
 *     readonly responses: readonly RfiResponseView[];
 *     readonly closed: boolean;
 *     readonly confidentialityLocked: boolean;
 *   }} RfiEventView
 */

/**
 * `versions`:  NR-1 BR-08 — as on the RFI response view.
 *
 * @typedef {Omit<RfpResponse, 'versions'> & {
 *     readonly supplierName: string;
 *     readonly complianceScore: number;
 *     readonly deviationCount: number;
 *     readonly versions: readonly ResponseVersion<RfpTermAnswer>[];
 *   }} RfpResponseView
 */

/**
 * `confidentialityLocked`:  As on the RFI view: the read withheld the content until the supplier accepts.
 * `sourceRfiNumber`:  The event number of `sourceRfiId`, resolved at read; null when none.
 *
 * @typedef {RfpEvent & {
 *     readonly invitedSuppliers: readonly RfxInviteeView[];
 *     readonly responses: readonly RfpResponseView[];
 *     readonly closed: boolean;
 *     readonly confidentialityLocked: boolean;
 *     readonly sourceRfiNumber: string | null;
 *   }} RfpEventView
 */

/**
 * @typedef {object} NegotiationParticipantView
 * @property {string} supplierId
 * @property {string} supplierName
 * @property {string | null} revisedQuotationId
 * @property {string | null} revisedAt
 */

/**
 * `awaiting`:  How many invitees have not answered yet (a supplier reads its own: 0 or 1).
 *
 * @typedef {NegotiationRound & {
 *     readonly rfqNumber: string;
 *     readonly rfqTitle: string;
 *     readonly participants: readonly NegotiationParticipantView[];
 *     readonly overdue: boolean;
 *     readonly awaiting: number;
 *   }} NegotiationRoundView
 */

/** NR-2 — one option of a firm-offer round, in the words of whoever wrote it (edge case 3). */
/**
 * @typedef {object} RfpRoundOptionView
 * @property {string} ref -  The name a round and a firm price use (`rfpOptionRef`).
 * @property {string} id -  The option's own id: the buyer's, or the proposer's `sup-opt-N`.
 * @property {string} title
 * @property {string} [description]
 * @property {boolean} supplierProposed -  True for an option a supplier proposed in its RFP response (`sup-opt-…`).
 * @property {string} [proposerSupplierId] -  The supplier that proposed it; absent on a buyer option.
 */

/** NR-2 BR-04 — the firm price in force for one supplier × option × quantity point. */
/**
 * @typedef {object} RfpFirmPriceView
 * @property {string} supplierId
 * @property {string} supplierName
 * @property {string} roundId
 * @property {number} roundNumber
 * @property {string} optionRef
 * @property {number} qty
 * @property {number} unitPrice
 * @property {string} validUntil
 * @property {string} submittedAt
 */

/**
 * NR-2 — a firm-offer round as a reader may see it. The buyer reads every
 * invitee and offer; a supplier reads a round only when invited, and then only
 * itself and its own offer.
 */
/**
 * `closed`:  The buyer closed the round (`closedAt` is set).
 * `overdue`:  Still Open, but past its deadline, so no offer is accepted. Derived at read.
 * `offers`:  Buyer: every invitee's offer. Supplier: its own, if any.
 * `awaiting`:  How many visible invitees have not sent an offer in this round.
 * `firmPrices`: BR-04 — the LAST firm price per supplier × option × point across every round of this RFP the reader may see, whichever round it came from.
 *
 * @typedef {RfpOfferRound & {
 *     readonly rfpNumber: string;
 *     readonly rfpTitle: string;
 *     readonly currency: string;
 *     readonly options: readonly RfpRoundOptionView[];
 *     readonly closed: boolean;
 *     readonly overdue: boolean;
 *     readonly offers: readonly RfpFirmOffer[];
 *     readonly awaiting: number;
 *     readonly firmPrices: readonly RfpFirmPriceView[];
 *   }} RfpOfferRoundView
 */

/**
 * @typedef {object} AwardedSupplierView
 * @property {string} supplierId
 * @property {string} supplierName
 * @property {number} sharePct
 * @property {number} quantity
 */

/**
 * `departedFromBestScore`:  True when the award passed over the best-scored quote (BR-07).
 * `status`: RFx C2 — DERIVED from the appended cancellation and SAP marking (AR-08). A supplier reads it too: a `Cancelled` award is its "Award withdrawn".
 * `withdrawnAt`:  NR-3 BR-12 — when the award was withdrawn; the date a supplier is shown.
 * `cancellation`:  The cancellation with its reason and actor. The buyer's read only.
 * `sapMark`:  The SAP marking with its document number. The buyer's read only.
 * `settledItemKeys`: RFx C3 (NR-3 BR-12) — the items this award awarded, by `AwardItem.key`, to ANY supplier. A supplier reads it too, with no supplier, share or quantity attached: it is how a supplier on the award learns an item it holds no line on is settled ("Not awarded") rather than still open ("Pending"). Derived from the record at read.
 *
 * @typedef {RfqAwardRecord & {
 *     readonly rfqNumber: string;
 *     readonly rfqTitle: string;
 *     readonly uom: string;
 *     readonly awardedSuppliers: readonly AwardedSupplierView[];
 *     readonly departedFromBestScore: boolean;
 *     readonly status: AwardStatus;
 *     readonly withdrawnAt?: string;
 *     readonly cancellation?: AwardCancellation;
 *     readonly sapMark?: AwardSapMark;
 *     readonly settledItemKeys: readonly string[];
 *   }} AwardView
 */

/** RFx D2 — one line of an RFP award, with the words a screen shows it in. */
/**
 * `optionTitle`:  The option's title, in the words of whoever wrote it (edge case 3).
 *
 * @typedef {RfpAwardLine & {
 *     readonly supplierName: string;
 *     readonly optionTitle: string;
 *   }} RfpAwardLineView
 */

/**
 * RFx D2 (NR-2 BR-09, AC-07; NR-3 BR-12) — how one supplier reads an RFP award:
 * awarded (it has lines), not awarded (a final award named it among the
 * responders), or withdrawn (the award was cancelled).
 */
/** @typedef {'Awarded' | 'Not awarded' | 'Withdrawn'} RfpAwardOutcome */

/**
 * RFx D2 — an award on an RFP, as a scope may read it. The buyer reads every
 * line, the reason, the cancellation and the SAP marking. A supplier reads only
 * an award it is named on, only its OWN lines and its own "not awarded", and
 * its `outcome`; never another supplier's share, the reason or the SAP number.
 */
/**
 * @typedef {object} RfpAwardView
 * @property {string} id
 * @property {'rfp'} eventType
 * @property {string} eventId
 * @property {string} rfpNumber
 * @property {string} rfpTitle
 * @property {string} awardedAt
 * @property {readonly RfpAwardLineView[]} lines
 * @property {readonly string[]} notAwardedSupplierIds
 * @property {string} [reason] -  NR-2 BR-06 — why. The buyer's read only.
 * @property {readonly ComplianceAtAward[]} [complianceAtAward] -  Material B4 (MR-2 BR-06, AC-05) — compliance at award; a supplier reads only its own row.
 * @property {readonly QualificationWarning[]} [qualificationWarnings] -  Material G2 / BL-147 — vendors awarded below the level on placeholder rules; a supplier reads only its own row.
 * @property {AwardStatus} status -  DERIVED from the appended cancellation and SAP marking (AR-08).
 * @property {string} [withdrawnAt] -  When the award was withdrawn; the date a supplier is shown.
 * @property {AwardCancellation} [cancellation] -  The buyer's read only.
 * @property {AwardSapMark} [sapMark] -  The buyer's read only.
 * @property {RfpAwardOutcome} [outcome] -  A supplier's read only: its own outcome on this award.
 * @property {readonly string[]} settledOptionRefs RFx D3 (NR-2 BR-09; NR-3 BR-12) — the option refs this award awarded, to
 *   ANY supplier. A supplier reads it too, with no supplier, share or quantity
 *   attached: it is how a supplier on the award reads "Not awarded" on an
 *   option it holds no line on, rather than "Pending" (the RFQ's
 *   `settledItemKeys`). Derived from the full record at read.
 */

// Types only: `export {}` keeps this a module so its typedefs can be imported.
export {};
