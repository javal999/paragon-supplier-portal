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
// ────────────────────────────────────────────────────────────────────────────

import type { AwardLine, AwardRecord, AwardSplitBasis } from './types';
import { tierPieces, type RfqItem } from './rfqModel';
import {
  evaluationBreaks,
  itemCostAt,
  itemName,
  itemTierAt,
  isTieredRfq,
  splitQuantities,
  type TieredQuoteShape,
  type TieredRfqShape,
} from './rfqComparison';

/** One break an item can be awarded at: its quantity and the pieces it means. */
export interface AwardItemBreak {
  /** The break as the RFQ states it (per variant on a per-variant break). */
  readonly qty: number;
  /** The pieces awarded at that break — what the item's quantities total. */
  readonly pieces: number;
}

/** A quote as the award rule reads it. */
export type AwardQuoteShape = Pick<TieredQuoteShape, 'id' | 'supplierId' | 'itemQuotes'>;

/** One item of an RFQ, as the award rule sees it. Both RFQ kinds produce these. */
export interface AwardItem {
  /** Stable per RFQ: a tiered item's line, a legacy line's material code, or `event`. */
  readonly key: string;
  /** How every refusal names it: "item 1 (Oslo front sticker)". */
  readonly name: string;
  /** Tiered: the item's line. An award line names it by `itemLineNo`. */
  readonly lineNo?: number;
  /** Legacy: the material code an award line names it by (`''` for the whole event). */
  readonly itemCode: string;
  readonly tiered: boolean;
  readonly breaks: readonly AwardItemBreak[];
  /** Did this quote price this item at this break? */
  readonly priced: (quote: AwardQuoteShape, breakQty: number) => boolean;
  /** The id of an earlier award of the event that already awarded this item. */
  readonly awardedIn?: string;
}

/** The RFQ fields `awardItemsOf` reads. */
export interface AwardableRfq extends TieredRfqShape {
  readonly lineItems?: readonly {
    readonly lineNo: number;
    readonly materialCode: string;
    readonly description: string;
    readonly quantity: number;
  }[];
}

/** The key of the one item a legacy RFQ without line items has. */
export const WHOLE_EVENT_ITEM_KEY = 'event';

const lineMatches = (item: Pick<AwardItem, 'tiered' | 'lineNo' | 'itemCode'>, line: AwardLine): boolean =>
  item.tiered
    ? line.itemLineNo !== undefined && line.itemLineNo === item.lineNo
    : line.itemLineNo === undefined && line.itemCode === item.itemCode;

/**
 * The items of an RFQ, as the award rule sees them. `priorAwards` are the
 * awards ALREADY RECORDED on this event (the caller filters them); an item one
 * of them awarded carries its id in `awardedIn`.
 */
export function awardItemsOf(rfq: AwardableRfq, priorAwards: readonly AwardRecord[] = []): readonly AwardItem[] {
  const base: Omit<AwardItem, 'awardedIn'>[] = isTieredRfq(rfq)
    ? (rfq.items ?? []).map((item: RfqItem) => ({
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
        priced: (quote: AwardQuoteShape, breakQty: number) => itemCostAt(rfq, item, quote, breakQty) !== null,
      }))
    : (rfq.lineItems ?? []).length > 0
      ? (rfq.lineItems ?? []).map((li) => ({
          key: li.materialCode,
          name: itemName({ lineNo: li.lineNo, description: li.description }),
          itemCode: li.materialCode,
          tiered: false,
          breaks: [{ qty: li.quantity, pieces: li.quantity }],
          // A legacy quote prices the whole event, so it prices every line.
          priced: () => true,
        }))
      : [
          {
            key: WHOLE_EVENT_ITEM_KEY,
            name: rfq.rfqNumber ? `the event (${rfq.rfqNumber})` : 'the event',
            itemCode: '',
            tiered: false,
            breaks: [{ qty: rfq.totalQty, pieces: rfq.totalQty }],
            priced: () => true,
          },
        ];
  return base.map((item) => {
    const prior = priorAwards.find((a) => a.lines.some((l) => lineMatches(item, l)));
    return prior ? { ...item, awardedIn: prior.id } : item;
  });
}

/** The item an award line names, or undefined. */
export const itemOfAwardLine = (items: readonly AwardItem[], line: AwardLine): AwardItem | undefined =>
  items.find((item) => lineMatches(item, line));

/**
 * The break a line was awarded at. A legacy line sent without one is read at
 * its item's only break; a tiered line must name one.
 */
export const lineBreakOf = (item: AwardItem, line: AwardLine): number | undefined =>
  line.awardTierQty ?? (item.tiered ? undefined : item.breaks[0]?.qty);

/** A line's basis; absent is `pct`, the only basis before NR-3. */
export const basisOf = (line: AwardLine): AwardSplitBasis => line.splitBasis ?? 'pct';

// ── Refusals ────────────────────────────────────────────────────────────────

/** The codes the award SHAPE can earn — the part a page can check before it sends. */
export type AwardShapeRefusalCode =
  | 'AWARD_EMPTY'
  | 'AWARD_ITEM_UNKNOWN'
  | 'AWARD_TIER_UNKNOWN'
  | 'AWARD_SHARE_INVALID'
  | 'AWARD_QTY_INVALID'
  | 'AWARD_SPLIT_INCOMPLETE'
  | 'AWARD_ITEM_NOT_QUOTED'
  | 'AWARD_QTY_NOT_DERIVED'
  | 'AWARD_ITEM_ALREADY_AWARDED';

/** Every code an award can earn by name, the verb-level ones included. */
export type AwardRefusalCode =
  | AwardShapeRefusalCode
  | 'AWARD_ITEMS_OPEN'
  | 'AWARD_NOTHING_OPEN'
  | 'AWARD_REASON_REQUIRED';

/** A refusal, structured so the verb can state it and the page can translate it. */
export interface AwardRefusal {
  readonly code: AwardRefusalCode;
  /** The item(s) concerned, by name. */
  readonly item?: string;
  /** AWARD_SPLIT_INCOMPLETE on a share split: the item's share total. */
  readonly pct?: number;
  /** AWARD_SPLIT_INCOMPLETE on a quantity split: the item's quantity total. */
  readonly total?: number;
  /** AWARD_SPLIT_INCOMPLETE on a quantity split: the break quantity it must total. */
  readonly breakQty?: number;
  /** The offending line, supplier, break or award, as text. */
  readonly detail?: string;
}

const units = (n: number): string => n.toLocaleString('en-US');

/** The refusal as the verb states it: `CODE: sentence`. */
export function awardRefusalText(r: AwardRefusal): string {
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
      return `AWARD_REASON_REQUIRED: the award for ${r.item} does not follow the best score, so it needs a reason`;
  }
}

/** The share tolerance, in percentage points (NR-3 BR-03, edge case 2). */
export const AWARD_SHARE_TOLERANCE = 0.01;
/** The quantity tolerance, in units (NR-3 BR-03). */
export const AWARD_QTY_TOLERANCE = 1;

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** An award's lines, grouped by the item they name, in item order. */
function groupsOf(
  items: readonly AwardItem[],
  lines: readonly AwardLine[],
): { item: AwardItem; lines: AwardLine[] }[] {
  return items
    .map((item) => ({ item, lines: lines.filter((l) => lineMatches(item, l)) }))
    .filter((g) => g.lines.length > 0);
}

/**
 * The quantities each line of one item derives from its shares: the share of
 * the break, rounded, with any remainder unit placed on the item's FIRST line
 * when the shares total 100% (edge case 2: 33.33% × 3 places every unit).
 */
export function derivedQuantities(pieces: number, lines: readonly AwardLine[]): number[] {
  return splitQuantities(
    pieces,
    lines.map((l) => l.sharePct),
  );
}

/**
 * Why an award's SHAPE is refused, or `null`. Checked in this order: lines
 * exist · each names an item · each item's lines record one of its breaks, the
 * same one · shares above zero · quantities above zero · each awarded item
 * totals its break (by the side the buyer typed) · each quote priced the item
 * at the break · the derived side matches the typed side · no item was already
 * awarded by an earlier award.
 *
 * The compliance gate, "the quote is on this event", open items and the reason
 * rule need the stores, the clock or the verb, so the verb checks those.
 */
export function awardShapeRefusal(
  items: readonly AwardItem[],
  lines: readonly AwardLine[],
  quotes: readonly AwardQuoteShape[],
): AwardRefusal | null {
  if (lines.length === 0) return { code: 'AWARD_EMPTY' };
  for (const line of lines) {
    if (!itemOfAwardLine(items, line)) {
      const detail =
        line.itemLineNo !== undefined ? `item ${line.itemLineNo}` : line.itemCode ? line.itemCode : undefined;
      return { code: 'AWARD_ITEM_UNKNOWN', ...(detail ? { detail } : {}) };
    }
  }
  const groups = groupsOf(items, lines);
  const breakOf = new Map<string, AwardItemBreak>();
  for (const { item, lines: its } of groups) {
    const qtys = [...new Set(its.map((l) => lineBreakOf(item, l)))];
    const found = qtys.length === 1 ? item.breaks.find((b) => b.qty === qtys[0]) : undefined;
    if (!found) return { code: 'AWARD_TIER_UNKNOWN', item: item.name, detail: qtys.map(String).join(', ') };
    breakOf.set(item.key, found);
  }
  if (lines.some((l) => !Number.isFinite(l.sharePct) || l.sharePct <= 0)) return { code: 'AWARD_SHARE_INVALID' };
  if (lines.some((l) => !Number.isFinite(l.quantity) || l.quantity <= 0)) return { code: 'AWARD_QTY_INVALID' };
  for (const { item, lines: its } of groups) {
    const brk = breakOf.get(item.key)!;
    if (its.every((l) => basisOf(l) === 'pct')) {
      const pct = round2(its.reduce((s, l) => s + l.sharePct, 0));
      if (round2(Math.abs(pct - 100)) > AWARD_SHARE_TOLERANCE) return { code: 'AWARD_SPLIT_INCOMPLETE', item: item.name, pct };
    } else {
      const total = its.reduce((s, l) => s + l.quantity, 0);
      if (Math.abs(total - brk.pieces) > AWARD_QTY_TOLERANCE) {
        return { code: 'AWARD_SPLIT_INCOMPLETE', item: item.name, total, breakQty: brk.pieces };
      }
    }
  }
  for (const { item, lines: its } of groups) {
    const brk = breakOf.get(item.key)!;
    for (const line of its) {
      const quote = quotes.find((q) => q.id === line.quotationId);
      if (quote && !item.priced(quote, brk.qty)) {
        return { code: 'AWARD_ITEM_NOT_QUOTED', item: item.name, detail: quote.supplierId };
      }
    }
  }
  for (const { item, lines: its } of groups) {
    const brk = breakOf.get(item.key)!;
    const pctLines = its.filter((l) => basisOf(l) === 'pct');
    const expected = derivedQuantities(brk.pieces, pctLines);
    if (pctLines.some((l, i) => l.quantity !== expected[i])) {
      return { code: 'AWARD_QTY_NOT_DERIVED', item: item.name, detail: 'pct' };
    }
    const qtyLines = its.filter((l) => basisOf(l) === 'qty');
    if (qtyLines.some((l) => round2(Math.abs(l.sharePct - (l.quantity * 100) / brk.pieces)) > AWARD_SHARE_TOLERANCE)) {
      return { code: 'AWARD_QTY_NOT_DERIVED', item: item.name, detail: 'qty' };
    }
  }
  for (const { item } of groups) {
    if (item.awardedIn) return { code: 'AWARD_ITEM_ALREADY_AWARDED', item: item.name, detail: item.awardedIn };
  }
  return null;
}

/**
 * The items still OPEN once this award is recorded: not awarded before, not
 * awarded now, and not marked "Will not award" (`notAwardedKeys`). The final
 * award refuses while this is not empty; the partial award refuses when it is.
 */
export function itemsOpenAfter(
  items: readonly AwardItem[],
  lines: readonly AwardLine[],
  notAwardedKeys: readonly string[] = [],
): readonly AwardItem[] {
  return items.filter(
    (item) => !item.awardedIn && !lines.some((l) => lineMatches(item, l)) && !notAwardedKeys.includes(item.key),
  );
}

/**
 * The awarded items whose lines leave out that item's best-scored quote at
 * the item's break. `bestOf` answers per item and break; `null` means there
 * is no single best to depart from (an unrankable set or a tie).
 */
export function awardItemsDepartingBest(
  items: readonly AwardItem[],
  lines: readonly AwardLine[],
  bestOf: (item: AwardItem, breakQty: number) => string | null,
): readonly AwardItem[] {
  return groupsOf(items, lines)
    .filter(({ item, lines: its }) => {
      const breakQty = lineBreakOf(item, its[0]!);
      const best = breakQty === undefined ? null : bestOf(item, breakQty);
      return best !== null && !its.some((l) => l.quotationId === best);
    })
    .map((g) => g.item);
}

/** The break each awarded item's lines record, by item (for the stored best scores). */
export function awardedItemBreaks(
  items: readonly AwardItem[],
  lines: readonly AwardLine[],
): readonly { item: AwardItem; breakQty: number }[] {
  return groupsOf(items, lines).flatMap(({ item, lines: its }) => {
    const breakQty = lineBreakOf(item, its[0]!);
    return breakQty === undefined ? [] : [{ item, breakQty }];
  });
}
