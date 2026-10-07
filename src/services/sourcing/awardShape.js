// ────────────────────────────────────────────────────────────────────────────
// THE AWARD RULE — one item-based rule for every RFQ (RFx C1; AR-04; NR-3
// BR-02 to BR-06). Pure: no store, no clock.
//
// Before C1 there were two rules: `awardSplitRefusal` for a legacy RFQ (shares
// per `itemCode`, built against its FIRST line only) and
// `tieredAwardShapeRefusal` for a tiered one (one break for the whole award,
// every item at 100%). Quantity splits, a break per item and partial award
// would have had to be built twice. Now both RFQ kinds produce one ITEM LIST
// (`awardItemsOf`) and one rule judges an award over it:
//
//   · a TIERED item is an `RfqItem`, named by its line, with the RFQ's
//     evaluation breaks as its breaks;
//   · a LEGACY item is a line item with ONE break equal to its quantity, or —
//     for an RFQ with no line items — the whole event at its `totalQty`.
//
// An item with no line in an award is "not awarded now". Whether that is
// allowed is the VERB's question (the final award refuses AWARD_ITEMS_OPEN, the
// partial award refuses AWARD_NOTHING_OPEN), because it depends on which verb
// was sent; this rule judges only the lines the award does carry.
//
// RFx D2 — an RFP award is judged by the SAME rule: `awardItemsOfRfp`
// (`rfpAward.js`) makes one item per option of a closed firm-offer round, its
// breaks the round's quantity points, and the item answers for itself whether
// a line's firm offer counts (`lineRefusal`). Only the item list and the offer
// lookup differ; the split, the break and the "already awarded" rules are one.
// ────────────────────────────────────────────────────────────────────────────

/** @import { AnyAwardLine, AwardEventType, AwardRecord, AwardSplitBasis } from './types' */
/** @import { NamedEligibility } from './sourcingType' */
import { notQualifiedText } from './sourcingType';
/** @import { RfqItem } from './rfqModel' */
import { tierPieces } from './rfqModel';
/** @import { TieredQuoteShape, TieredRfqShape } from './rfqComparison' */
import {
  evaluationBreaks,
  itemCostAt,
  itemName,
  itemTierAt,
  isTieredRfq,
  splitQuantities
} from './rfqComparison';

/** One break an item can be awarded at: its quantity and the pieces it means. */
/**
 * `qty`:  The break as the RFQ states it (per variant on a per-variant break).
 * `pieces`:  The pieces awarded at that break — what the item's quantities total.
 *
 * @typedef {{
 *   readonly qty: number;
 *   readonly pieces: number;
 * }} AwardItemBreak
 */

/** A quote as the award rule reads it. */
/** @typedef {Pick<TieredQuoteShape, 'id' | 'supplierId' | 'itemQuotes'>} AwardQuoteShape */

/** One item of an RFQ, as the award rule sees it. Both RFQ kinds produce these. */
/**
 * `key`:  Stable per RFQ: a tiered item's line, a legacy line's material code, or `event`.
 * `name`:  How every refusal names it: "item 1 (Oslo front sticker)".
 * `lineNo`:  Tiered: the item's line. An award line names it by `itemLineNo`.
 * `itemCode`:  Legacy: the material code an award line names it by (`''` for the whole event).
 * `priced`:  Did this quote price this item at this break?
 * `awardedIn`:  The id of an earlier award of the event that already awarded this item.
 * `optionRef`: RFx D2 — an RFP option: the ref its award lines name (`RfpAwardLine.optionRef`). Absent on every RFQ item.
 * `lineRefusal`: RFx D2 — an item that judges its own lines' offers (an RFP option: the line's firm offer must be the supplier's price in force at the break, and still valid). When present it replaces the quote lookup for this item.
 *
 * @typedef {{
 *   readonly key: string;
 *   readonly name: string;
 *   readonly lineNo?: number;
 *   readonly itemCode: string;
 *   readonly tiered: boolean;
 *   readonly breaks: readonly AwardItemBreak[];
 *   readonly priced: (quote: AwardQuoteShape, breakQty: number) => boolean;
 *   readonly awardedIn?: string;
 *   readonly optionRef?: string;
 *   readonly lineRefusal?: (line: AnyAwardLine, breakQty: number) => AwardRefusal | null;
 * }} AwardItem
 */

/** The RFQ fields `awardItemsOf` reads. */
/**
 * @typedef {TieredRfqShape & {
 *     readonly lineItems?: readonly { readonly lineNo: number; readonly materialCode: string; readonly description: string; readonly quantity: number; }[];
 *   }} AwardableRfq
 */

/** The key of the one item a legacy RFQ without line items has. */
export const WHOLE_EVENT_ITEM_KEY = 'event';

/**
 * @param {Pick<AwardItem, 'tiered' | 'lineNo' | 'itemCode' | 'optionRef'>} item
 * @param {AnyAwardLine} line
 * @returns {boolean}
 */
const lineMatches = (item, line) =>
  item.optionRef !== undefined
    ? line.optionRef === item.optionRef
    : line.optionRef === undefined &&
      (item.tiered
        ? line.itemLineNo !== undefined && line.itemLineNo === item.lineNo
        : line.itemLineNo === undefined && line.itemCode === item.itemCode);

/**
 * The items of an RFQ, as the award rule sees them. `priorAwards` are the
 * awards ALREADY RECORDED on this event (the caller filters them); an item one
 * of them awarded carries its id in `awardedIn`.
 * @param {AwardableRfq} rfq
 * @param {readonly AwardRecord[]} [priorAwards]
 * @returns {readonly AwardItem[]}
 */
export function awardItemsOf(rfq, priorAwards = []) {
  /** @type {Omit<AwardItem, 'awardedIn'>[]} */
  const base = isTieredRfq(rfq)
    ? (rfq.items ?? []).map(
        /** @param {RfqItem} item */ (item) => ({
          key: String(item.lineNo),
          name: itemName(item),
          lineNo: item.lineNo,
          itemCode: '',
          tiered: true,
          // The RFQ's evaluation breaks, each at the item's own break in force
          // there (`itemTierAt`) — the rule the per-item award always read.
          breaks: evaluationBreaks(rfq).flatMap((qty) => {
            const tier = itemTierAt(rfq, item, qty);
            return tier ? [{ qty, pieces: tierPieces(tier, item) }] : [];
          }),
          /**
           * @param {AwardQuoteShape} quote
           * @param {number} breakQty
           */
          priced: (quote, breakQty) => itemCostAt(rfq, item, quote, breakQty) !== null
        })
      )
    : (rfq.lineItems ?? []).length > 0
      ? (rfq.lineItems ?? []).map((li) => ({
          key: li.materialCode,
          name: itemName({ lineNo: li.lineNo, description: li.description }),
          itemCode: li.materialCode,
          tiered: false,
          breaks: [{ qty: li.quantity, pieces: li.quantity }],
          // A legacy quote prices the whole event, so it prices every line.
          priced: () => true
        }))
      : [
          {
            key: WHOLE_EVENT_ITEM_KEY,
            name: rfq.rfqNumber ? `the event (${rfq.rfqNumber})` : 'the event',
            itemCode: '',
            tiered: false,
            breaks: [{ qty: rfq.totalQty, pieces: rfq.totalQty }],
            priced: () => true
          }
        ];
  return base.map((item) => {
    const prior = priorAwards.find((a) => a.lines.some((l) => lineMatches(item, l)));
    return prior ? { ...item, awardedIn: prior.id } : item;
  });
}

/**
 * The item an award line names, or undefined.
 * @param {readonly AwardItem[]} items
 * @param {AnyAwardLine} line
 * @returns {AwardItem | undefined}
 */
export const itemOfAwardLine = (items, line) => items.find((item) => lineMatches(item, line));

/**
 * The break a line was awarded at. A legacy line sent without one is read at
 * its item's only break; a tiered line must name one.
 * @param {AwardItem} item
 * @param {AnyAwardLine} line
 * @returns {number | undefined}
 */
export const lineBreakOf = (item, line) =>
  line.awardTierQty ?? (item.tiered ? undefined : item.breaks[0]?.qty);

/**
 * A line's basis; absent is `pct`, the only basis before NR-3.
 * @param {AnyAwardLine} line
 * @returns {AwardSplitBasis}
 */
export const basisOf = (line) => line.splitBasis ?? 'pct';

// ── Refusals ────────────────────────────────────────────────────────────────

/** The codes the award SHAPE can earn — the part a page can check before it sends. */
/**
 * RFx D2 (NR-2 edge case 2) — the firm offer a line names has lapsed.
 *
 * @typedef {| 'AWARD_EMPTY'
 *   | 'AWARD_ITEM_UNKNOWN'
 *   | 'AWARD_TIER_UNKNOWN'
 *   | 'AWARD_SHARE_INVALID'
 *   | 'AWARD_QTY_INVALID'
 *   | 'AWARD_SPLIT_INCOMPLETE'
 *   | 'AWARD_ITEM_NOT_QUOTED'
 *   | 'AWARD_QTY_NOT_DERIVED'
 *   | 'AWARD_ITEM_ALREADY_AWARDED'
 *   | 'AWARD_OFFER_EXPIRED'} AwardShapeRefusalCode
 */

/** Every code an award can earn by name, the verb-level ones included. */
/**
 * Material B4 (MR-2 BR-06) — a share goes to a supplier red-flagged on update compliance.
 * RFx D2 (NR-2 BR-08) — the option is already placed through the other route.
 * Material G2 (MR-10 BR-07, AC-05) — a supplier below the level the event's
 * sourcing type needs, against a real qualification list.
 *
 * @typedef {| AwardShapeRefusalCode
 *   | 'AWARD_ITEMS_OPEN'
 *   | 'AWARD_NOTHING_OPEN'
 *   | 'AWARD_REASON_REQUIRED'
 *   | 'AWARD_REASON_COMPLIANCE_FLAG'
 *   | 'AWARD_OPTION_SOURCED_ELSEWHERE'
 *   | 'AWARD_SUPPLIER_NOT_QUALIFIED'} AwardRefusalCode
 */

/** A refusal, structured so the verb can state it and the page can translate it. */
/**
 * `item`:  The item(s) concerned, by name.
 * `pct`:  AWARD_SPLIT_INCOMPLETE on a share split: the item's share total.
 * `total`:  AWARD_SPLIT_INCOMPLETE on a quantity split: the item's quantity total.
 * `breakQty`:  AWARD_SPLIT_INCOMPLETE on a quantity split: the break quantity it must total.
 * `detail`:  The offending line, supplier, break or award, as text.
 * `unqualified`: Material G2 — AWARD_SUPPLIER_NOT_QUALIFIED, and AWARD_REASON_REQUIRED when the reason is owed for a vendor below the level on a placeholder list: the vendors concerned and why.
 *
 * @typedef {{
 *   readonly code: AwardRefusalCode;
 *   readonly item?: string;
 *   readonly pct?: number;
 *   readonly total?: number;
 *   readonly breakQty?: number;
 *   readonly detail?: string;
 *   readonly unqualified?: readonly NamedEligibility[];
 * }} AwardRefusal
 */

/**
 * @param {number} n
 * @returns {string}
 */
const units = (n) => n.toLocaleString('en-US');

/**
 * The refusal as the verb states it: `CODE: sentence`. `eventType` picks the
 * words where an RFQ and an RFP differ (an item vs an option, a quote vs a
 * firm offer); the codes are the same.
 * @param {AwardRefusal} r
 * @param {AwardEventType} [eventType]
 * @returns {string}
 */
export function awardRefusalText(r, eventType = 'rfq') {
  if (eventType === 'rfp') {
    switch (r.code) {
      case 'AWARD_ITEM_UNKNOWN':
        return `AWARD_ITEM_UNKNOWN: ${r.detail ?? 'an award line'} is not an option of a closed firm-offer round of this RFP; an RFP is awarded option by option on firm offers`;
      case 'AWARD_TIER_UNKNOWN':
        return `AWARD_TIER_UNKNOWN: the lines for ${r.item} record one quantity point of its firm-offer round (${r.detail ?? 'none'})`;
      case 'AWARD_ITEM_NOT_QUOTED':
        return `AWARD_ITEM_NOT_QUOTED: ${r.detail} has no firm offer in force on ${r.item} at this quantity point`;
      case 'AWARD_REASON_REQUIRED':
        return r.unqualified
          ? qualificationReasonText(r.unqualified)
          : 'AWARD_REASON_REQUIRED: every RFP award needs a reason';
      default:
        break;
    }
  }
  switch (r.code) {
    case 'AWARD_EMPTY':
      return 'AWARD_EMPTY: an award names at least one supplier';
    case 'AWARD_ITEM_UNKNOWN':
      return r.detail
        ? `AWARD_ITEM_UNKNOWN: ${r.detail} is not an item on this RFQ; an RFQ is awarded item by item`
        : 'AWARD_ITEM_UNKNOWN: an award line names no item; an RFQ is awarded item by item';
    case 'AWARD_TIER_UNKNOWN':
      return `AWARD_TIER_UNKNOWN: the lines for ${r.item} record one quantity break of that item (${r.detail ?? 'none'})`;
    case 'AWARD_SHARE_INVALID':
      return 'AWARD_SHARE_INVALID: every share is a percentage above zero';
    case 'AWARD_QTY_INVALID':
      return 'AWARD_QTY_INVALID: every award line carries a quantity above zero';
    case 'AWARD_SPLIT_INCOMPLETE':
      return r.total !== undefined
        ? `AWARD_SPLIT_INCOMPLETE: ${r.item} totals ${units(r.total)}, not ${units(r.breakQty ?? 0)}`
        : `AWARD_SPLIT_INCOMPLETE: ${r.item} totals ${r.pct}%, not 100%`;
    case 'AWARD_ITEM_NOT_QUOTED':
      return `AWARD_ITEM_NOT_QUOTED: ${r.detail} did not price ${r.item} at this break`;
    case 'AWARD_QTY_NOT_DERIVED':
      return r.detail === 'qty'
        ? `AWARD_QTY_NOT_DERIVED: the share for ${r.item} is not its quantity over the break`
        : `AWARD_QTY_NOT_DERIVED: the quantity for ${r.item} is not the share of the break`;
    case 'AWARD_ITEM_ALREADY_AWARDED':
      return `AWARD_ITEM_ALREADY_AWARDED: ${r.item} was already awarded (${r.detail})`;
    case 'AWARD_ITEMS_OPEN':
      return `AWARD_ITEMS_OPEN: ${r.item} is not awarded; award it or mark it Will not award`;
    case 'AWARD_NOTHING_OPEN':
      return 'AWARD_NOTHING_OPEN: this award settles every item, so it is the final award, not a partial one';
    case 'AWARD_REASON_REQUIRED':
      return r.unqualified
        ? qualificationReasonText(r.unqualified)
        : `AWARD_REASON_REQUIRED: the award for ${r.item} does not follow the best score, so it needs a reason`;
    case 'AWARD_REASON_COMPLIANCE_FLAG':
      return `AWARD_REASON_COMPLIANCE_FLAG: ${r.detail} is below the update-compliance flag and gets a share of ${r.item}, so the award needs a reason`;
    case 'AWARD_OFFER_EXPIRED':
      return `AWARD_OFFER_EXPIRED: the firm offer ${r.detail} on ${r.item} is no longer valid; open a new firm-offer round`;
    case 'AWARD_OPTION_SOURCED_ELSEWHERE':
      return `AWARD_OPTION_SOURCED_ELSEWHERE: ${r.item} is already ${r.detail}`;
    case 'AWARD_SUPPLIER_NOT_QUALIFIED':
      return `AWARD_SUPPLIER_NOT_QUALIFIED: ${(r.unqualified ?? []).map(notQualifiedText).join('; ')}`;
  }
}

/**
 * @param {readonly NamedEligibility[]} vendors
 * @returns {string}
 */
function qualificationReasonText(vendors) {
  return `AWARD_REASON_REQUIRED: ${vendors.map(notQualifiedText).join('; ')} (placeholder qualification rules), so the award needs a reason`;
}

/** The share tolerance, in percentage points (NR-3 BR-03, edge case 2). */
export const AWARD_SHARE_TOLERANCE = 0.01;
/** The quantity tolerance, in units (NR-3 BR-03). */
export const AWARD_QTY_TOLERANCE = 1;

/**
 * @param {number} n
 * @returns {number}
 */
const round2 = (n) => Math.round(n * 100) / 100;

/**
 * An award's lines, grouped by the item they name, in item order.
 * @param {readonly AwardItem[]} items
 * @param {readonly AnyAwardLine[]} lines
 * @returns {{ item: AwardItem; lines: AnyAwardLine[] }[]}
 */
function groupsOf(items, lines) {
  return items
    .map((item) => ({ item, lines: lines.filter((l) => lineMatches(item, l)) }))
    .filter((g) => g.lines.length > 0);
}

/**
 * The quantities each line of one item derives from its shares: the share of
 * the break, rounded, with any remainder unit placed on the item's FIRST line
 * when the shares total 100% (edge case 2: 33.33% × 3 places every unit).
 * @param {number} pieces
 * @param {readonly AnyAwardLine[]} lines
 * @returns {number[]}
 */
export function derivedQuantities(pieces, lines) {
  return splitQuantities(
    pieces,
    lines.map((l) => l.sharePct)
  );
}

/**
 * RFx C3 (NR-3 BR-06) — what a FINAL award with no lines needs to be read as
 * "Will not award the rest": the event is Partly awarded, and the payload's
 * "Will not award" keys cover every item still open. Only the final award
 * passes it; the partial award never does, so an empty partial award stays
 * AWARD_EMPTY.
 */
/**
 * `partlyAwarded`:  The event is `Partly awarded`: an earlier award of it is in force.
 * `notAwardedKeys`:  The award's "Will not award" items, by `AwardItem.key`.
 *
 * @typedef {{
 *   readonly partlyAwarded: boolean;
 *   readonly notAwardedKeys: readonly string[];
 * }} AwardSettleRest
 */

/**
 * True when an award with NO lines only settles the rest: on a Partly awarded
 * event, every open item (not awarded by an award in force) is marked "Will
 * not award". Anything else with no lines is AWARD_EMPTY.
 * @param {readonly AwardItem[]} items
 * @param {AwardSettleRest} settle
 * @returns {boolean}
 */
export function settlesRestWithoutLines(items, settle) {
  if (!settle.partlyAwarded) return false;
  const open = items.filter((item) => !item.awardedIn);
  return open.length > 0 && open.every((item) => settle.notAwardedKeys.includes(item.key));
}

/**
 * Why an award's SHAPE is refused, or `null`. Checked in this order: lines
 * exist (or, RFx C3, the award only marks the rest "Will not award" — see
 * `settlesRestWithoutLines`) · each names an item · each item's lines record one of its breaks, the
 * same one · shares above zero · quantities above zero · each awarded item
 * totals its break (by the side the buyer typed) · each quote priced the item
 * at the break · the derived side matches the typed side · no item was already
 * awarded by an earlier award.
 *
 * The compliance gate, "the quote is on this event", open items and the reason
 * rule need the stores, the clock or the verb, so the verb checks those.
 * @param {readonly AwardItem[]} items
 * @param {readonly AnyAwardLine[]} lines
 * @param {readonly AwardQuoteShape[]} quotes
 * @param {AwardSettleRest} [settle]
 * @returns {AwardRefusal | null}
 */
export function awardShapeRefusal(items, lines, quotes, settle) {
  if (lines.length === 0)
    return settle && settlesRestWithoutLines(items, settle) ? null : { code: 'AWARD_EMPTY' };
  for (const line of lines) {
    if (!itemOfAwardLine(items, line)) {
      const detail =
        line.optionRef !== undefined
          ? `"${line.optionRef}"`
          : line.itemLineNo !== undefined
            ? `item ${line.itemLineNo}`
            : line.itemCode
              ? line.itemCode
              : undefined;
      return { code: 'AWARD_ITEM_UNKNOWN', ...(detail ? { detail } : {}) };
    }
  }
  const groups = groupsOf(items, lines);
  const breakOf = /** @type {Map<string, AwardItemBreak>} */ (new Map());
  for (const { item, lines: its } of groups) {
    const qtys = [...new Set(its.map((l) => lineBreakOf(item, l)))];
    const found = qtys.length === 1 ? item.breaks.find((b) => b.qty === qtys[0]) : undefined;
    if (!found)
      return { code: 'AWARD_TIER_UNKNOWN', item: item.name, detail: qtys.map(String).join(', ') };
    breakOf.set(item.key, found);
  }
  if (lines.some((l) => !Number.isFinite(l.sharePct) || l.sharePct <= 0))
    return { code: 'AWARD_SHARE_INVALID' };
  if (lines.some((l) => !Number.isFinite(l.quantity) || l.quantity <= 0))
    return { code: 'AWARD_QTY_INVALID' };
  for (const { item, lines: its } of groups) {
    const brk = /** @type {AwardItemBreak} */ (breakOf.get(item.key));
    if (its.every((l) => basisOf(l) === 'pct')) {
      const pct = round2(its.reduce((s, l) => s + l.sharePct, 0));
      if (round2(Math.abs(pct - 100)) > AWARD_SHARE_TOLERANCE)
        return { code: 'AWARD_SPLIT_INCOMPLETE', item: item.name, pct };
    } else {
      const total = its.reduce((s, l) => s + l.quantity, 0);
      if (Math.abs(total - brk.pieces) > AWARD_QTY_TOLERANCE) {
        return { code: 'AWARD_SPLIT_INCOMPLETE', item: item.name, total, breakQty: brk.pieces };
      }
    }
  }
  for (const { item, lines: its } of groups) {
    const brk = /** @type {AwardItemBreak} */ (breakOf.get(item.key));
    for (const line of its) {
      if (item.lineRefusal) {
        const refused = item.lineRefusal(line, brk.qty);
        if (refused) return refused;
        continue;
      }
      const quote = quotes.find((q) => q.id === line.quotationId);
      if (quote && !item.priced(quote, brk.qty)) {
        return { code: 'AWARD_ITEM_NOT_QUOTED', item: item.name, detail: quote.supplierId };
      }
    }
  }
  for (const { item, lines: its } of groups) {
    const brk = /** @type {AwardItemBreak} */ (breakOf.get(item.key));
    const pctLines = its.filter((l) => basisOf(l) === 'pct');
    const expected = derivedQuantities(brk.pieces, pctLines);
    if (pctLines.some((l, i) => l.quantity !== expected[i])) {
      return { code: 'AWARD_QTY_NOT_DERIVED', item: item.name, detail: 'pct' };
    }
    const qtyLines = its.filter((l) => basisOf(l) === 'qty');
    if (
      qtyLines.some(
        (l) =>
          round2(Math.abs(l.sharePct - (l.quantity * 100) / brk.pieces)) > AWARD_SHARE_TOLERANCE
      )
    ) {
      return { code: 'AWARD_QTY_NOT_DERIVED', item: item.name, detail: 'qty' };
    }
  }
  for (const { item } of groups) {
    if (item.awardedIn)
      return { code: 'AWARD_ITEM_ALREADY_AWARDED', item: item.name, detail: item.awardedIn };
  }
  return null;
}

/**
 * The items still OPEN once this award is recorded: not awarded before, not
 * awarded now, and not marked "Will not award" (`notAwardedKeys`). The final
 * award refuses while this is not empty; the partial award refuses when it is.
 * @param {readonly AwardItem[]} items
 * @param {readonly AnyAwardLine[]} lines
 * @param {readonly string[]} [notAwardedKeys]
 * @returns {readonly AwardItem[]}
 */
export function itemsOpenAfter(items, lines, notAwardedKeys = []) {
  return items.filter(
    (item) =>
      !item.awardedIn &&
      !lines.some((l) => lineMatches(item, l)) &&
      !notAwardedKeys.includes(item.key)
  );
}

/**
 * The awarded items whose lines leave out that item's best-scored quote at
 * the item's break. `bestOf` answers per item and break; `null` means there
 * is no single best to depart from (an unrankable set or a tie).
 * @param {readonly AwardItem[]} items
 * @param {readonly AnyAwardLine[]} lines
 * @param {(item: AwardItem, breakQty: number) => string | null} bestOf
 * @returns {readonly AwardItem[]}
 */
export function awardItemsDepartingBest(items, lines, bestOf) {
  return groupsOf(items, lines)
    .filter(({ item, lines: its }) => {
      const breakQty = lineBreakOf(item, /** @type {AnyAwardLine} */ (its[0]));
      const best = breakQty === undefined ? null : bestOf(item, breakQty);
      return best !== null && !its.some((l) => l.quotationId === best);
    })
    .map((g) => g.item);
}

/**
 * The break each awarded item's lines record, by item (for the stored best scores).
 * @param {readonly AwardItem[]} items
 * @param {readonly AnyAwardLine[]} lines
 * @returns {readonly { item: AwardItem; breakQty: number }[]}
 */
export function awardedItemBreaks(items, lines) {
  return groupsOf(items, lines).flatMap(({ item, lines: its }) => {
    const breakQty = lineBreakOf(item, /** @type {AnyAwardLine} */ (its[0]));
    return breakQty === undefined ? [] : [{ item, breakQty }];
  });
}

// ── Material G2 · QUALIFICATION AT AWARD, AND THE ONE REASON RULE ───────────
//
// MR-10 BR-07 / MAT-D14 — a vendor that dropped below the level the event's
// sourcing type needs may still respond, but may not be awarded. Checked AFTER
// CR-23 by both award hooks, and by the panel with the same functions (MAT-R2).
// `eligibilityOf` answers per supplier on the award date; the caller computes
// it (the rule stays pure).

/**
 * Every supplier an award names, with its eligibility, once each.
 * @param {readonly AnyAwardLine[]} lines
 * @param {(supplierId: string) => NamedEligibility | undefined} eligibilityOf
 * @returns {NamedEligibility[]}
 */
const awardedVendors = (lines, eligibilityOf) =>
  [...new Set(lines.map((l) => l.supplierId))].flatMap((sid) => {
    const v = eligibilityOf(sid);
    return v ? [v] : [];
  });

/**
 * AWARD_SUPPLIER_NOT_QUALIFIED for any awarded supplier below the level
 * against a REAL list (fail-closed, plan AD-8); null otherwise. A vendor below
 * the level on a placeholder list is not refused here: it owes a reason
 * (`awardReasonOwed`).
 * @param {readonly AnyAwardLine[]} lines
 * @param {(supplierId: string) => NamedEligibility | undefined} eligibilityOf
 * @returns {AwardRefusal | null}
 */
export function awardQualificationRefusal(lines, eligibilityOf) {
  const refused = awardedVendors(lines, eligibilityOf).filter(
    (v) => v.eligibility.state === 'refused'
  );
  return refused.length > 0 ? { code: 'AWARD_SUPPLIER_NOT_QUALIFIED', unqualified: refused } : null;
}

/** Why an award owes a reason. */
/**
 * `always`:  An RFP award always owes one (NR-2 BR-06).
 * `departing`:  RFQ items whose lines leave out the item's best-scored quote (NR-3 BR-08).
 * `unqualified`: Material G2 — owner ruling 2026-09-29: vendors awarded below the level while the list for it is a placeholder. The award record keeps them as `qualificationWarnings`.
 * `flagged`: Material B4 (MR-2 BR-06, per item) — the awarded items that give a share to a supplier red-flagged on weekly update compliance, with those suppliers. A flag only asks for a reason; it never refuses by itself (MR-2 BR-07).
 *
 * @typedef {{
 *   readonly always: boolean;
 *   readonly departing: readonly AwardItem[];
 *   readonly unqualified: readonly NamedEligibility[];
 *   readonly flagged: readonly { readonly item: AwardItem; readonly supplierIds: readonly string[] }[];
 *   readonly owed: boolean;
 * }} AwardReasonOwed
 */

/**
 * THE ONE REASON RULE, called by the award panel and by both award hooks
 * (MAT-R2). B4 extends it with its own causes; each cause is a field here.
 * `bestOf`:  Absent on an RFP: it is never judged against a best score.
 * `flagged`:  Material B4 (MR-2 BR-06) — is this supplier red-flagged (compliance below `compliance.flagPct`)?
 * @param {{ readonly items: readonly AwardItem[]; readonly lines: readonly AnyAwardLine[]; readonly always: boolean; readonly bestOf?: (item: AwardItem, breakQty: number) => string | null; readonly eligibilityOf?: (supplierId: string) => NamedEligibility | undefined; readonly flagged?: (supplierId: string) => boolean; }} input
 * @returns {AwardReasonOwed}
 */
export function awardReasonOwed(input) {
  const departing =
    input.always || !input.bestOf
      ? []
      : awardItemsDepartingBest(input.items, input.lines, input.bestOf);
  const unqualified = input.eligibilityOf
    ? awardedVendors(input.lines, input.eligibilityOf).filter((v) => v.eligibility.state === 'warn')
    : [];
  const isFlagged = input.flagged;
  const flagged = isFlagged
    ? groupsOf(input.items, input.lines).flatMap(({ item, lines: its }) => {
        const supplierIds = [...new Set(its.map((l) => l.supplierId))].filter((sid) =>
          isFlagged(sid)
        );
        return supplierIds.length > 0 ? [{ item, supplierIds }] : [];
      })
    : [];
  return {
    always: input.always,
    departing,
    unqualified,
    flagged,
    owed: input.always || departing.length > 0 || unqualified.length > 0 || flagged.length > 0
  };
}

/**
 * The refusal when a reason is owed and none was given; null otherwise. In
 * order: a departed best score, a vendor below the level (both
 * AWARD_REASON_REQUIRED), the RFP's own rule (AWARD_REASON_REQUIRED, so an RFP
 * reads as before), then Material B4's AWARD_REASON_COMPLIANCE_FLAG naming the
 * first flagged item and supplier.
 * @param {AwardReasonOwed} owed
 * @param {string} reason
 * @returns {AwardRefusal | null}
 */
export function awardReasonRefusal(owed, reason) {
  if (!owed.owed || reason.trim().length > 0) return null;
  if (owed.departing.length > 0)
    return {
      code: 'AWARD_REASON_REQUIRED',
      item: /** @type {AwardItem} */ (owed.departing[0]).name
    };
  if (owed.unqualified.length > 0)
    return { code: 'AWARD_REASON_REQUIRED', unqualified: owed.unqualified };
  const firstFlag = owed.flagged[0];
  if (!owed.always && firstFlag) {
    return {
      code: 'AWARD_REASON_COMPLIANCE_FLAG',
      item: firstFlag.item.name,
      detail: firstFlag.supplierIds[0]
    };
  }
  return { code: 'AWARD_REASON_REQUIRED' };
}
