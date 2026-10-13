// ────────────────────────────────────────────────────────────────────────────
// THE AWARD PANEL'S SHARED TYPES — the draft one item holds, the award a panel
// asks the page to dispatch, and the ITEM MODEL each event kind answers (see
// `index.jsx` for why the RFQ and the RFP differ only there). Types only: this
// module exports no value. `index.jsx` re-exports `ItemPanelAward` and
// `PanelAward`, the two the importers name.
// ────────────────────────────────────────────────────────────────────────────

/** @import React from 'react' */
/** @import { GateResult } from '@services/sourcing/complianceGate' */
/** @import { AnyAwardLine, AwardLine, AwardSplitBasis } from '@services/sourcing/types' */
/** @import { AwardItem, AwardItemBreak, AwardQuoteShape } from '@services/sourcing/awardShape' */
/** @import { BiddingEligibility } from '@services/sourcing/sourcingType' */

/** What the buyer decided for one open item. */
/** @typedef {'award' | 'open' | 'willNot'} ItemChoice */

/**
 * `breakQty`:  Unset = the default break (the evaluation break on a tiered RFQ).
 * `values`:  bid key → the typed share (%) or quantity, as text.
 *
 * @typedef {{
 *     readonly choice: ItemChoice;
 *     readonly basis: AwardSplitBasis;
 *     readonly breakQty?: number;
 *     readonly values: Readonly<Record<string, string>>;
 *   }} ItemDraft
 */

/** The award a panel asks the page to dispatch. */
/**
 * `final`:  The final award when true, the partial award when false.
 * `notAwardedItems`:  "Will not award" item keys (final award only).
 *
 * @template {AnyAwardLine} L
 * @typedef {{
 *     readonly final: boolean;
 *     readonly lines: L[];
 *     readonly reason: string;
 *     readonly notAwardedItems: string[];
 *   }} ItemPanelAward
 */

/** The award the RFQ panel asks the page to dispatch (`award` / `awardPartial`). */
/** @typedef {ItemPanelAward<AwardLine>} PanelAward */

// ── The item model: what an event kind answers ─────────────────────────────

/** One party that can be awarded an item: an RFQ quote, or an RFP supplier's firm offer. */
/**
 * `key`:  The key a typed value is stored under (a quotation id, or a supplier id on an RFP).
 *
 * @typedef {{
 *     readonly key: string;
 *     readonly supplierId: string;
 *   }} AwardBid
 */

/** The typed and derived sides of one line, before the event kind writes it. */
/**
 * @typedef {{
 *     readonly sharePct: number;
 *     readonly quantity: number;
 *     readonly basis: AwardSplitBasis;
 *   }} LineValues
 */

/**
 * `items`:  The verb's own item list, with the awards in force applied (`awardedIn`).
 * `quotes`:  The quotes the shape rule reads (none on an RFP: each item judges its own offers).
 * `reasonAlways`:  NR-2 BR-06 — an RFP award always needs a reason.
 * `offerSettleRest`:  "Will not award the rest": offered only where the verb accepts a final award with no lines.
 * `settleRestHelpKey`:  The words under "Will not award the rest" (an item on an RFQ, an option on an RFP).
 * `bidKeyOf`:  Which bid a line belongs to (its `AwardBid.key`).
 * `bestOf`:  The best-scored bid for an item at a break, or null (none, a tie, or not scored).
 *
 * @template {AnyAwardLine} L
 * @typedef {{
 *     readonly items: readonly AwardItem[];
 *     readonly partlyAwarded: boolean;
 *     readonly quotes: readonly AwardQuoteShape[];
 *     readonly defaultBreak: number | null;
 *     readonly reasonAlways: boolean;
 *     readonly offerSettleRest: boolean;
 *     readonly settleRestHelpKey: string;
 *     readonly hintKey: string;
 *     readonly partialNoteKey: string;
 *     readonly label: (item: AwardItem) => string;
 *     readonly bidsFor: (item: AwardItem) => readonly AwardBid[];
 *     readonly priceHeader: (item: AwardItem, brk: AwardItemBreak) => string;
 *     readonly priceCell: (item: AwardItem, bid: AwardBid, brk: AwardItemBreak) => React.ReactNode;
 *     readonly uomOf: (item: AwardItem) => string;
 *     readonly lineOf: (item: AwardItem, bid: AwardBid, brk: AwardItemBreak, v: LineValues) => L;
 *     readonly bidKeyOf: (line: L) => string;
 *     readonly bestOf: (item: AwardItem, breakQty: number) => string | null;
 *   }} ItemModel
 */

/** What every panel takes besides its item model. */
/**
 * @template {AnyAwardLine} L
 * @typedef {object} PanelCommon
 * @property {(supplierId: string) => boolean} qualifies
 * @property {(supplierId: string) => GateResult | undefined} gateOf
 * @property {(supplierId: string) => BiddingEligibility | undefined} [eligibilityOf] Material G2 (MR-10 BR-07, edge case 1) — each bidder against the event's
 *   sourcing type on the award date. `refused` gets no input and shows why;
 *   `warn` (placeholder lists) can be awarded with a reason. Absent = not known.
 * @property {(supplierId: string) => string} supplierName
 * @property {boolean} noneAwardable -  BL-64 — no bidding supplier passes CR-23: rows show why, and nothing is sent.
 * @property {boolean} pending
 * @property {(award: ItemPanelAward<L>) => void} onAward
 */

export {};
