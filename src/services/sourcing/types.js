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

/** @import { BidCurrency } from '@lib/currencyPolicy' */
/** @import { AttachmentMeta } from '../attachments/sessionAttachments' */
/** @import { ActorAttribution } from '@lib/enforcement' */
/** @import { QualificationWarning, SourcingType } from './sourcingType' */

/**
 * The question kinds an RFI (or an RFP's questions section) may ask.
 *
 * RFx authoring batch (2026-09-21): `longText`, `money`, `percentage` and
 * `priceRange` join the original seven. `priceRange` is the RFI's INDICATIVE
 * price question (spec D4): a min–max range in a currency and a unit, never a
 * firm price, and every surface labels it so.
 */
/**
 * @typedef {| 'yesNo'
 *   | 'singleChoice'
 *   | 'multipleChoice'
 *   | 'numberWithUnit'
 *   | 'date'
 *   | 'text'
 *   | 'longText'
 *   | 'money'
 *   | 'percentage'
 *   | 'priceRange'
 *   | 'attachment'} RfiQuestionType
 */

/** The template sections A–F of the RFI (REQ-E03-02). */
/** @typedef {'capability' | 'experience' | 'facilities' | 'products' | 'compliance' | 'event'} RfiSectionId */

/**
 * A section the buyer added for ONE event. The id carries the `custom-` prefix
 * so it can never collide with the template's A–F, and the title is the buyer's
 * own words (not an i18n key — nobody translated it).
 */
/** @typedef {`custom-${string}`} RfxCustomSectionId */

/**
 * @typedef {object} RfxCustomSection
 * @property {RfxCustomSectionId} id
 * @property {string} title
 */

/**
 * A scoring scale for a weighted `numberWithUnit` question: the value that
 * scores 100 and the value that scores 0, linear and clamped between them.
 * `best` may be below `worst` (fewer days is better).
 */
/**
 * @typedef {object} RfiNumberScale
 * @property {number} best
 * @property {number} worst
 */

/** One question of an RFI, from the library or added for a single event. */
/**
 * BL-215 — the built-in response field a buyer question repeats: the sample
 * offer's ready date (RFQ and RFP) or the RFP pricing's development timeline.
 * @typedef {'sampleReadyDate' | 'developmentTimeline'} RfxBuiltInField
 */

/**
 * @typedef {object} RfiQuestion
 * @property {string} id
 * @property {RfiSectionId | RfxCustomSectionId} sectionId
 * @property {string} promptKey -  i18n key for the prompt. Business language only (SC-04).
 * @property {RfiQuestionType} type
 * @property {readonly string[]} [options] -  Option ids for a single/multiple choice question; i18n key `rfx.opt.<id>`.
 * @property {Readonly<Record<string, string>>} [optionLabels] The buyer's own words for each option id, for a choice question written in
 *   the option editor (BL-36). Library options have none and resolve through
 *   `rfx.opt.<id>`; an authored option is its label, in the buyer's language.
 * @property {string} [unitKey] i18n key for the unit of a `numberWithUnit` / `priceRange` question — or,
 *   for a question the buyer wrote, the buyer's own unit (the `promptKey`
 *   convention: an unknown key renders as the words themselves).
 * @property {boolean} required
 * @property {string} [help] -  Help text shown under the prompt, in the buyer's own words.
 * @property {number} [min] -  Optional bounds on a `numberWithUnit` / `money` / `percentage` answer.
 * @property {number} [max]
 * @property {BidCurrency} [currency] -  The currency of a `money` or `priceRange` question.
 * @property {number} [weight] OPTIONAL weight (REQ-E03-02 template rules). A weighted question feeds the
 *   response score, which SHORTLISTS and never awards. Absent = the answer is
 *   read, not scored — which is the honest state of every descriptive question.
 * @property {Readonly<Record<string, number>>} [optionScores] -  Per-option points (0–100) for a weighted choice question.
 * @property {RfiNumberScale} [scale] -  The scale for a weighted `numberWithUnit` question.
 * @property {RfxBuiltInField} [builtIn] BL-215 — the built-in field this question repeats, set by the
 *   buyer in the question editor. The supplier answers the question only, and the answer fills that
 *   field on send (`builtInDuplicates`). Absent = no stored link (the word match is the fallback).
 */

/** A reusable template Procurement keeps per category family. */
/**
 * @typedef {object} RfiTemplate
 * @property {string} id
 * @property {string} nameKey
 * @property {readonly RfiQuestion[]} questions
 */

// ── Documents (NR-1 BR-01 to BR-05, BR-11) ─────────────────────────────────

/**
 * The kinds of document a buyer can ask for (NR-1 BR-02). Ids, not labels: the
 * words a screen shows come through `t()`.
 */
/**
 * @typedef {| 'certificate'
 *   | 'specification'
 *   | 'drawing'
 *   | 'samplePhoto'
 *   | 'quotation'
 *   | 'companyProfile'
 *   | 'other'} DocumentType
 */

/** @type {readonly DocumentType[]} */
export const DOCUMENT_TYPES = [
  'certificate',
  'specification',
  'drawing',
  'samplePhoto',
  'quotation',
  'companyProfile',
  'other'
];

/**
 * One document the buyer asks every supplier for (NR-1 BR-02). `itemLineNo`
 * names one RFQ item (`RfqItem.lineNo`) and is refused on an RFI or an RFP:
 * only an RFQ has items. Absent = the whole response.
 */
/**
 * @typedef {object} DocumentRequest
 * @property {string} id
 * @property {string} name -  The buyer's own words.
 * @property {DocumentType} type
 * @property {boolean} required
 * @property {number} [itemLineNo]
 */

/** The certificate fields a Certificate request also takes (NR-1 BR-04). */
/**
 * @typedef {object} CertificateFields
 * @property {string} number
 * @property {string} issuer
 * @property {string} expiresOn -  `YYYY-MM-DD`. Expiry is judged when read (`certificateExpired`), never stored (law 0.5).
 */

/**
 * One file a supplier sends with a response (NR-1 BR-01). `requestId` names
 * the request it answers; absent = one of the supplier's "other documents".
 * `uploadedAt` and `uploadedBy` are store-assigned (`stampDocuments`).
 */
/**
 * @typedef {object} ResponseDocument
 * @property {string} id
 * @property {string} [requestId]
 * @property {AttachmentMeta} attachment
 * @property {string} uploadedAt
 * @property {ActorAttribution} [uploadedBy] CE-11i / NR-1 BR-10 — WHO sent the file: the SESSION's actor when the file
 *   first arrived, never the payload's (C10 §6.2). Kept unchanged while the
 *   file is carried into a later save or version. OPTIONAL because a document
 *   stored before this field existed (a quote's legacy `attachments` read
 *   through `documentsOf`, any row already held) has no uploader on record, and
 *   back-filling one would invent a fact: absent reads as "Not recorded".
 *   Today every stamp is `UNATTRIBUTED: NO_PERSON_IN_SESSION`.
 * @property {CertificateFields} [certificate]
 */

/** One supplier's answer to one question. */
/**
 * @typedef {object} RfiAnswer
 * @property {string} questionId
 * @property {string | number | readonly string[]} [value] -  Choice ids, a number, a date, free text, or an attachment name.
 * @property {string} [description] -  The description every structured entry carries (REQ-E03-02 BR-02).
 * @property {{ readonly min: number; readonly max: number }} [range] -  A `priceRange` answer: the INDICATIVE range, in the question's currency.
 * @property {readonly AttachmentMeta[]} [attachments] -  An `attachment` answer's files: metadata only, the file itself is session-held (BL-27).
 */

/**
 * The confidentiality (bidder-agreement) gate an event may carry. When present
 * the supplier accepts once before the scope, attachments and questions are
 * shown, and the READ withholds them until it has.
 */
/**
 * @typedef {object} RfxConfidentiality
 * @property {string} [terms] -  The buyer's terms, in the buyer's words. Absent = the standard wording.
 */

/** A sourcing event's invitation, with the deadline actually in force for it. */
/**
 * @typedef {object} RfxInvitee
 * @property {string} supplierId
 * @property {string} [deadline] A deadline granted to THIS invitee alone (REQ-E03-02 edge case). Absent =
 *   the event's own deadline applies. Never written back onto the event, so
 *   "extended for everyone" and "extended for these three" stay distinguishable.
 */

/** An extension the buyer granted, kept so the trail shows who got what. */
/**
 * @typedef {object} DeadlineExtension
 * @property {string} at
 * @property {string} deadline
 * @property {readonly string[]} supplierIds -  Empty = every invitee.
 */

/** @typedef {'Draft' | 'Open' | 'Closed' | 'Cancelled'} RfxEventStatus */

/**
 * RFx D2 — an RFP's states: the RFx ones plus the two its award reaches
 * (`rfpEvent.flow.js`). An RFI is never awarded (RFX-D1), so the shared union
 * stays as it is.
 */
/** @typedef {RfxEventStatus | 'Partly awarded' | 'Awarded'} RfpEventStatus */

/**
 * BL-93 / CE-08 — one edit of a DRAFT event (the revise-draft verbs). WHO is
 * the session's actor and WHEN is the store's clock; neither comes from the
 * payload, so a caller cannot backdate or reassign its own edit. Appended,
 * never replaced: the trail shows every edit, in order.
 */
/**
 * @typedef {object} DraftRevision
 * @property {string} at
 * @property {ActorAttribution} by
 */

/** REQ-E03-02 — a Request for Information. */
/**
 * @typedef {object} RfiEvent
 * @property {string} id
 * @property {string} eventNumber
 * @property {string} title
 * @property {string} [description] What PTI wants to learn, in the buyer's own words (section 3.6a CE-07 —
 *   "the scope the suppliers answer"). Optional because the seeded events
 *   predate it and an absent description is honestly absent; the RFP's
 *   `scope` is the same field under the name that requirement uses.
 * @property {string} templateId
 * @property {string} materialCategory
 * @property {string} [purchasingGroup]
 * @property {RfxEventStatus} status
 * @property {string} createdAt
 * @property {string} responseDeadline
 * @property {readonly RfxInvitee[]} invitees
 * @property {readonly RfiQuestion[]} questions
 * @property {readonly DeadlineExtension[]} extensions
 * @property {readonly RfxCustomSection[]} [customSections] -  Sections the buyer added for this event, in the order they render.
 * @property {readonly AttachmentMeta[]} [attachments] -  The buyer's documents: a brief, drawings, reference images (session-held).
 * @property {RfxConfidentiality} [confidentiality] -  Present = the supplier must accept before reading the event.
 * @property {readonly DraftRevision[]} [revisions] -  BL-93 — every edit made while it was a Draft (CE-08).
 * @property {readonly DocumentRequest[]} [documentRequests] -  NR-1 BR-02 — the documents the buyer asks every supplier for.
 * @property {SourcingType} [sourcingType] Material G2 (MR-10 BR-06) — Direct or Indirect, from the category's
 *   mapping, STORED AT PUBLISH and fixed after. Absent on a Draft (it reads
 *   the map) and on an event published before G2 (it reads Direct, edge case 4).
 * @property {readonly QualificationWarning[]} [qualificationWarnings] Material G2 — owner ruling 2026-09-29: the invitees published below the
 *   level while the list for that level was a placeholder. Appended at
 *   publish; never edited.
 */

/** @typedef {'Draft' | 'Submitted'} RfxResponseStatus */

/**
 * NR-1 BR-08 (D-6) — one submitted version of an RFI or RFP response. Appended
 * on each submit and each revise, never edited or removed (RFX-R3, AR-05). The
 * response's own fields always hold the latest version. `number` is 1-based.
 * A seeded Submitted response carries no versions and is read as version 1
 * (`responseVersions` in `sourcing/responseVersions`).
 */
/**
 * @template TAnswer
 * @typedef {object} ResponseVersion
 * @property {number} number
 * @property {string} submittedAt
 * @property {readonly TAnswer[]} answers
 * @property {readonly RfiAnswer[]} [questionAnswers] -  RFP only — the answers to the RFP's questions section.
 * @property {RfpPricingAnswer} [pricing] -  RFP only — the indicative pricing.
 * @property {string} [otherTerms] -  RFP only — terms the supplier wants to add.
 * @property {readonly ResponseDocument[]} [documents]
 */

/** REQ-E03-02 — one supplier's RFI response. A Draft is invisible to PTI. */
/**
 * @typedef {object} RfiResponse
 * @property {string} id
 * @property {string} rfiId
 * @property {string} supplierId
 * @property {RfxResponseStatus} status
 * @property {string} updatedAt
 * @property {string} [submittedAt]
 * @property {readonly RfiAnswer[]} answers
 * @property {string} [confidentialityAcceptedAt] -  When this supplier accepted the event's confidentiality terms (store-assigned).
 * @property {readonly ResponseDocument[]} [documents] -  NR-1 BR-01 — the supplier's files. Only its author and, once Submitted, PTI read them.
 * @property {readonly ResponseVersion<RfiAnswer>[]} [versions] -  NR-1 BR-08 — every submitted version, oldest first. Absent on seeds (read as version 1).
 */

// ── RFP (REQ-E03-04) ────────────────────────────────────────────────────────

/** @typedef {'price' | 'payment' | 'delivery' | 'quality' | 'serviceLevel' | 'contract' | 'other'} RfpTermGroup */

/** A term from the standard list the buyer picks from. */
/** How a term's value is read: free text, a number with a unit, a choice, or yes/no. */
/** @typedef {'text' | 'numberWithUnit' | 'choice' | 'yesNo'} RfpTermValueKind */

/**
 * @typedef {object} RfpTermDefinition
 * @property {string} id
 * @property {RfpTermGroup} group
 * @property {string} labelKey
 * @property {RfpTermValueKind} [valueKind] -  The value kind this term is asked in. Absent = free text.
 * @property {string} [unitKey] -  i18n key of the unit, for a `numberWithUnit` term.
 * @property {'price' | 'leadTime'} [scorable] When present, this term carries a number CR-15 can score: the price basis
 *   feeds the price axis, the standard lead time the lead-time axis.
 */

/** The id prefix of a term the buyer wrote for one RFP (not on the standard list). */
/** @typedef {`custom-${string}`} RfpCustomTermId */

/**
 * A term row on one RFP, holding PTI's requested value.
 *
 * A STANDARD row names a term on `RFP_STANDARD_TERMS` and needs nothing else. A
 * CUSTOM row (`custom-…` id) is the buyer's own term, so it carries what the
 * standard list would have: its label (the buyer's words), its group, its value
 * kind, and, for a choice, its options.
 */
/**
 * @typedef {object} RfpTermRow
 * @property {string} termId
 * @property {string} requestedValue
 * @property {string} [label] -  Custom term: the buyer's label.
 * @property {RfpTermGroup} [group] -  Custom term: the group it renders under. Absent = `other`.
 * @property {RfpTermValueKind} [valueKind] -  The value kind. Absent = the standard term's own, else free text.
 * @property {string} [unit] -  The unit of a `numberWithUnit` value (the buyer's own words on a custom term).
 * @property {readonly string[]} [options] -  The options of a `choice` value, in the buyer's words.
 */

/**
 * An optional T&C document on an RFP: the supplier ticks acceptance before it
 * may answer. Text, a file, or both.
 */
/**
 * @typedef {object} RfpTermsDocument
 * @property {string} [text]
 * @property {AttachmentMeta} [attachment]
 */

/** One option PTI asks an INDICATIVE price for (open-spec requests, spec D4). */
/**
 * @typedef {object} RfpPricingOption
 * @property {string} id
 * @property {string} title
 * @property {string} [description]
 */

/**
 * RFP indicative pricing: options × quantity points. Every price asked here is
 * INDICATIVE (spec D4); firm prices by tier belong to the RFQ.
 */
/**
 * @typedef {object} RfpPricingRequest
 * @property {readonly RfpPricingOption[]} options
 * @property {readonly number[]} quantityPoints -  Indicative quantity points, ascending (e.g. 10,000 / 50,000 / 100,000).
 * @property {'perVariant' | 'total'} quantityBasis -  Whether a quantity point is per variant or across the whole order.
 * @property {boolean} samplesRequested -  Ask the supplier for a sample offer (can sample, ready date).
 */

/** One indicative price: one option at one quantity point. */
/**
 * @typedef {object} RfpIndicativePrice
 * @property {string} optionId
 * @property {number} qty
 * @property {number} unitPrice
 */

/** A supplier's indicative-pricing answer. */
/**
 * @typedef {object} RfpPricingAnswer
 * @property {readonly RfpIndicativePrice[]} prices
 * @property {readonly RfpPricingOption[]} proposedOptions -  Options the SUPPLIER proposes (e.g. "pump and cap only"); ids start `sup-opt-`.
 * @property {{ readonly canSample: boolean; readonly readyDate?: string }} [sample]
 * @property {string} [timelineNote]
 * @property {string} [validUntil] -  How long the indicative prices hold.
 */

/** @typedef {'comply' | 'deviate'} TermStance */

/** A supplier's answer to one term row. */
/**
 * @typedef {object} RfpTermAnswer
 * @property {string} termId
 * @property {string} proposedValue
 * @property {TermStance} stance
 * @property {string} [comment] -  REQUIRED on `deviate` (REQ-E03-04) — a deviation nobody explained is not an answer.
 */

/** REQ-E03-04 — a Request for Proposal. */
/**
 * @typedef {object} RfpEvent
 * @property {string} id
 * @property {string} eventNumber
 * @property {string} title
 * @property {string} scope
 * @property {string} materialCategory
 * @property {string} [purchasingGroup]
 * @property {RfpEventStatus} status
 * @property {string} createdAt
 * @property {string} responseDeadline
 * @property {BidCurrency} currency
 * @property {readonly RfxInvitee[]} invitees
 * @property {readonly RfpTermRow[]} terms
 * @property {readonly DeadlineExtension[]} extensions
 * @property {string} [sourceRfiId] -  The RFI this RFP was created from (spec D3); the board shows "Created from RFI-…".
 * @property {readonly RfiQuestion[]} [questions] -  Optional typed questions, the same shape the RFI asks.
 * @property {readonly RfxCustomSection[]} [customSections]
 * @property {readonly AttachmentMeta[]} [attachments]
 * @property {RfxConfidentiality} [confidentiality]
 * @property {RfpTermsDocument} [termsDocument] -  Present = the supplier accepts this T&C before answering.
 * @property {RfpPricingRequest} [pricing] -  Present = the RFP asks for indicative prices (options × quantity points).
 * @property {readonly DraftRevision[]} [revisions] -  BL-93 — every edit made while it was a Draft (CE-08).
 * @property {readonly DocumentRequest[]} [documentRequests] -  NR-1 BR-02 — the documents the buyer asks every supplier for.
 * @property {SourcingType} [sourcingType] Material G2 (MR-10 BR-06) — Direct or Indirect, from the category's
 *   mapping, STORED AT PUBLISH and fixed after. Absent on a Draft (it reads
 *   the map) and on an event published before G2 (it reads Direct, edge case 4).
 * @property {readonly QualificationWarning[]} [qualificationWarnings] Material G2 — owner ruling 2026-09-29: the invitees published below the
 *   level while the list for that level was a placeholder. Appended at
 *   publish; never edited.
 */

/** REQ-E03-04 — one supplier's proposal. A Draft is invisible to PTI. */
/**
 * @typedef {object} RfpResponse
 * @property {string} id
 * @property {string} rfpId
 * @property {string} supplierId
 * @property {RfxResponseStatus} status
 * @property {string} updatedAt
 * @property {string} [submittedAt]
 * @property {readonly RfpTermAnswer[]} answers
 * @property {string} [otherTerms] -  REQ-E03-04 edge case — terms the supplier wants to add.
 * @property {readonly RfiAnswer[]} [questionAnswers] -  Answers to the RFP's questions section.
 * @property {RfpPricingAnswer} [pricing] -  The supplier's indicative pricing.
 * @property {string} [confidentialityAcceptedAt]
 * @property {string} [termsAcceptedAt] -  When the supplier accepted the RFP's T&C document (store-assigned).
 * @property {readonly ResponseDocument[]} [documents] -  NR-1 BR-01 — the supplier's files. Only its author and, once Submitted, PTI read them.
 * @property {readonly ResponseVersion<RfpTermAnswer>[]} [versions] -  NR-1 BR-08 — every submitted version, oldest first. Absent on seeds (read as version 1).
 */

// ── Negotiation and award (REQ-E03-05) ──────────────────────────────────────

/** REQ-E03-05 BR-03 / BR-04 — one negotiation round on an RFQ. */
/**
 * @typedef {object} NegotiationRound
 * @property {string} id
 * @property {string} rfqId
 * @property {number} roundNumber
 * @property {string} openedAt
 * @property {string} deadline
 * @property {readonly string[]} invitedSupplierIds
 * @property {string} [message]
 * @property {number} [targetUnitPrice]
 * @property {boolean} bestAndFinal -  BR-04 — the buyer marked this round best and final.
 * @property {boolean} closed
 */

// ── Firm-offer round on an RFP (NR-2, decision D-1 option A) ────────────────

/**
 * NR-2 BR-02 — a firm-offer round on a Closed RFP: the options and quantity
 * points the buyer wants FIRM prices for, and the suppliers asked. Rounds are
 * append-only: asking again is a new round, never an edit of this one.
 */
/**
 * @typedef {object} RfpOfferRound
 * @property {string} id
 * @property {string} rfpId
 * @property {number} roundNumber
 * @property {readonly string[]} optionRefs Option REFS (`rfpOptionRef`): a buyer option's id as-is, or
 *   `<proposerSupplierId>:sup-opt-N` for an option a supplier proposed, since a
 *   `sup-opt-N` id is unique only within its proposer's response.
 * @property {readonly number[]} quantityPoints
 * @property {readonly string[]} invitedSupplierIds
 * @property {string} deadline
 * @property {string} [message]
 * @property {string} openedAt
 * @property {string} [closedAt] -  Set once by `t_rfp_round_close`. Absent = the round is Open.
 */

/** One firm price: one option at one quantity point (NR-2 BR-03). */
/**
 * @typedef {object} RfpFirmPrice
 * @property {string} optionRef -  The option's ref, as in `RfpOfferRound.optionRefs`.
 * @property {number} qty
 * @property {number} unitPrice
 */

/** One version of a firm offer, as the supplier sent it. */
/**
 * @typedef {object} RfpFirmOfferVersion
 * @property {number} version
 * @property {readonly RfpFirmPrice[]} prices
 * @property {string} validUntil
 * @property {readonly AttachmentMeta[]} [documents]
 * @property {string} submittedAt
 */

/**
 * NR-2 BR-01 / BR-03 / BR-04 — one supplier's firm offer in one round. The top
 * fields are the version in force; `versions` keeps every version, oldest
 * first, and is only ever appended to.
 */
/**
 * @typedef {object} RfpFirmOffer
 * @property {string} id
 * @property {string} roundId
 * @property {string} rfpId
 * @property {string} supplierId
 * @property {readonly RfpFirmPrice[]} prices
 * @property {string} validUntil -  The supplier holds these prices until this date (on or after the round deadline).
 * @property {readonly AttachmentMeta[]} [documents]
 * @property {readonly RfpFirmOfferVersion[]} versions
 * @property {string} submittedAt -  When the version in force was sent.
 */

/** REQ-E03-05 BR-06 — one line of a split award. */
/**
 * @typedef {object} AwardLine
 * @property {string} supplierId
 * @property {string} quotationId
 * @property {string} itemCode The MATERIAL CODE of the RFQ line item this share is against; `''` = none:
 *   the whole event on a legacy award, or a tiered item named by `itemLineNo`.
 * @property {number} [itemLineNo] The TIERED item (`RfqItem.lineNo`) this share is against (RFx spec, "Award
 *   per item"). A tiered item has no material code — Oslo's stickers are not in
 *   the material master — so it is named by its line, never by a code minted to
 *   fill `itemCode`. Absent on a legacy award.
 * @property {number} sharePct
 * @property {number} quantity
 * @property {AwardSplitBasis} [splitBasis] NR-3 BR-02 (D-2) — which side of the line the buyer TYPED: the share
 *   (`pct`, the quantity derived from it) or the quantity (`qty`, the share
 *   derived from it). Both are stored either way. Absent reads as `pct`, the
 *   only basis before NR-3; the award verb records it on every line it keeps.
 * @property {number} [awardTierQty] The quantity break THIS LINE was awarded at (NR-3 BR-04: a break per item,
 *   so per line, never per award). On a tiered RFQ, one of its evaluation
 *   breaks; on a legacy RFQ, the line item's own quantity — its only break.
 *   The lines of one item share one break. A legacy line sent without it is
 *   read at its item's only break, and recorded with it.
 * @property {never} [optionRef] -  RFx D2 — an RFQ line names no RFP option and no firm offer.
 * @property {never} [firmOfferId]
 */

/**
 * RFx D2 (NR-2 BR-05, AR-02) — one line of an RFP award: a share of ONE option
 * at one quantity point of a firm-offer round, on one supplier's FIRM OFFER.
 * It names the option and the offer in place of an RFQ item and quotation; an
 * offer id is never put in `quotationId`, so no RFQ-side reader can take an
 * RFP line for a quote.
 */
/**
 * @typedef {object} RfpAwardLine
 * @property {string} supplierId
 * @property {string} optionRef The option, by its ref (`rfpOptionRef`): a buyer option's id, or
 *   `${proposerSupplierId}:${optionId}` for a supplier-proposed one, so two
 *   suppliers' `sup-opt-1` stay two options.
 * @property {string} firmOfferId -  The `RfpFirmOffer` whose firm price this share is awarded on.
 * @property {number} sharePct
 * @property {number} quantity
 * @property {AwardSplitBasis} [splitBasis] -  NR-3 BR-02 — the side the buyer typed; recorded on every line.
 * @property {number} [awardTierQty] -  The quantity point of the round this line was awarded at (NR-2 BR-05).
 * @property {never} [quotationId] -  An RFP line names no RFQ quotation and no RFQ item.
 * @property {never} [itemCode]
 * @property {never} [itemLineNo]
 */

/** Either arm's line, where a rule reads both (the shared award shape rule). */
/** @typedef {AwardLine | RfpAwardLine} AnyAwardLine */

/** NR-3 BR-02 — the side of an award line the buyer typed. */
/** @typedef {'pct' | 'qty'} AwardSplitBasis */

/**
 * AR-02 — the kind of sourcing event an award record belongs to. RFx D2 adds
 * the RFP arm, which reuses this record rather than adding a parallel one.
 */
/** @typedef {'rfq' | 'rfp'} AwardEventType */

/** REQ-E03-05 BR-09 — the hub's record of an award. No PO, no contract. */
/** @typedef {RfqAwardRecord | RfpAwardRecord} AwardRecord */

/**
 * RFx D2 (NR-2 BR-05 to BR-07) — an award on an RFP: per option, on firm
 * offers. The same record as the RFQ's, with its own lines. The reason is
 * always there (NR-2 BR-06: every RFP award needs one).
 */
/**
 * @typedef {object} RfpAwardRecord
 * @property {string} id
 * @property {'rfp'} eventType
 * @property {string} eventId
 * @property {string} awardedAt
 * @property {readonly RfpAwardLine[]} lines
 * @property {string} reason
 * @property {readonly string[]} notAwardedSupplierIds NR-2 BR-09 — the responders told they were not awarded. Empty on a partial
 *   award; the final award names every responder no award of the RFP named.
 * @property {readonly ComplianceAtAward[]} [complianceAtAward] -  Material B4 (MR-2 BR-06, AC-05) — see `ComplianceAtAward`.
 * @property {never} [bestScoredQuotationId] -  An RFP award is not judged against a best-scored quote (NR-2 BR-06).
 * @property {never} [bestScoredByItem]
 * @property {readonly QualificationWarning[]} [qualificationWarnings] Material G2 — owner ruling 2026-09-29: the vendors awarded below the level
 *   the event's type needs while that level's list was a placeholder. The
 *   award needed a reason for them; the record keeps the warning.
 */

/** REQ-E03-05 BR-09 — the hub's record of an award on an RFQ. */
/**
 * @typedef {object} RfqAwardRecord
 * @property {string} id
 * @property {'rfq'} eventType -  AR-02 — the event type and id this award is for (was `rfqId`).
 * @property {string} eventId
 * @property {string} awardedAt
 * @property {readonly AwardLine[]} lines
 * @property {string} [reason] -  BR-07 — required when the award does not follow the best-scored quote.
 * @property {string} [bestScoredQuotationId] -  The quotation CR-15 ranked first when the award was recorded.
 * @property {readonly { readonly itemLineNo: number; readonly quotationId: string }[]} [bestScoredByItem] A tiered RFQ is awarded ITEM BY ITEM, so the best score it departs from is
 *   per item: the quotation CR-15 ranked first for each item AWARDED HERE, at
 *   that item's break, when the award was recorded. Absent on a legacy award.
 * @property {readonly string[]} notAwardedSupplierIds BR-08 — the invited suppliers told they were not awarded. Empty on a
 *   PARTIAL award (NR-3 BR-06): a supplier with no share yet may still win an
 *   item left open. The final award names every invitee no award of the event
 *   named.
 * @property {readonly QualificationWarning[]} [qualificationWarnings] Material G2 — owner ruling 2026-09-29: the vendors awarded below the level
 *   the event's type needs while that level's list was a placeholder. The
 *   award needed a reason for them; the record keeps the warning.
 * @property {readonly ComplianceAtAward[]} [complianceAtAward] -  Material B4 (MR-2 BR-06, AC-05) — see `ComplianceAtAward`.
 */

/**
 * Material B4 (MR-2 BR-06, AC-05) — the update compliance an awarded supplier
 * had when the award was recorded, kept as shown then (`null` = "No history").
 * One row per awarded supplier. Absent on awards recorded before B4.
 */
/**
 * @typedef {object} ComplianceAtAward
 * @property {string} supplierId
 * @property {number | null} pct
 */

/**
 * RFx C2 (NR-3 BR-09 to BR-11, AR-08) — the status an award is in, DERIVED at
 * read from the records appended beside it, never stored on the award:
 * `Active` until a cancellation or a SAP marking is appended for it.
 */
/** @typedef {'Active' | 'Cancelled' | 'Raised in SAP'} AwardStatus */

/**
 * NR-3 BR-09 / BR-11 — an award withdrawn by the buyer, with who, when and
 * why. APPENDED to its own store; the `AwardRecord` it names is never edited,
 * so the trail keeps what was awarded as well as why it was withdrawn.
 */
/**
 * @typedef {object} AwardCancellation
 * @property {string} id
 * @property {string} awardId
 * @property {string} cancelledAt
 * @property {string} reason
 * @property {ActorAttribution} by -  CE-08 — the session's actor (UNATTRIBUTED until an identity provider lands).
 */

/**
 * NR-3 BR-10 / BR-11 — an award marked "Raised in SAP", with the SAP document
 * number the buyer typed (no SAP interface). After it the award cannot be
 * cancelled here: changes happen in SAP. APPENDED to its own store.
 */
/**
 * @typedef {object} AwardSapMark
 * @property {string} id
 * @property {string} awardId
 * @property {string} sapDocumentNo
 * @property {string} markedAt
 * @property {ActorAttribution} by
 */
