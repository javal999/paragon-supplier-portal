// ────────────────────────────────────────────────────────────────────────────
// EVALUATION AND AWARD OF A TIERED RFQ (RFx working spec, 2026-09-21,
// "Evaluation and award"). Pure rules, no store, no clock.
//
// A tiered RFQ is priced at several quantity BREAKS, item by item. Comparing it
// needs one more fact than a single-price RFQ: WHICH break the buyer is buying
// at. That is the EVALUATION BREAK. It is chosen per RFQ, it defaults to the
// break nearest the RFQ's own `totalQty`, and everything below is judged at it:
//
//   · an item's total cost at the break = unit price × pieces (× variants when
//     the break counts per variant) + the one-time costs quoted for the item;
//   · the composite score (CR-15, price 0.4 / lead time 0.2 / reliability 0.4,
//     weights UNCHANGED) scores PRICE AS THAT TOTAL COST. Ratio-to-best is
//     scale-invariant, so scoring the total or the total ÷ quantity gives the
//     same ranking; the total is passed because it is what the spec names;
//   · the award is PER ITEM, split by % across suppliers that pass the gate,
//     each item totalling 100%, and each line records the break it was made at.
//
// ⚠️ **THIS IS A PARALLEL DERIVATION, NOT A CHANGE TO `deriveQuoteHeader`.** The
// stored header on a quote (`unitPrice` / `totalPrice`) stays what B1 defined —
// the first break — because it is written when the quote is submitted and the
// buyer's evaluation break is a READ-TIME choice that can move after that. The
// comparison and the award read THIS module instead of the header whenever the
// RFQ has items; a legacy single-price RFQ never reaches it.
// ────────────────────────────────────────────────────────────────────────────

import type { BidCurrency } from '../../lib/currencyPolicy';
import { BASE_CURRENCY } from '../../lib/currencyPolicy';
import { scoreQuotations, type ScoringOptions, type ScoringOutcome } from '../../lib/quoteScore';
import type { AwardLine } from './types';
import {
  tierPieces,
  tiersForItem,
  type QuotationItemQuote,
  type RfqItem,
  type RfqQuantityTier,
} from './rfqModel';

/** The RFQ fields the comparison reads. */
export interface TieredRfqShape {
  readonly rfqNumber?: string;
  readonly totalQty: number;
  readonly items?: readonly RfqItem[];
  readonly tiers?: readonly RfqQuantityTier[];
}

/** The quotation fields the comparison reads. */
export interface TieredQuoteShape {
  readonly id: string;
  readonly supplierId: string;
  readonly currency?: BidCurrency;
  readonly leadTimeDays: number;
  readonly itemQuotes?: readonly QuotationItemQuote[];
}

/** True when the RFQ carries items — the rebuilt shape. A legacy RFQ never does. */
export const isTieredRfq = (rfq: { readonly items?: readonly unknown[] }): boolean =>
  (rfq.items?.length ?? 0) > 0;

/**
 * The item an award line names by `itemLineNo`, or undefined.
 *
 * ⚠️ A TIERED LINE IS NAMED BY ITS LINE NUMBER, NEVER BY A CODE MINTED INTO
 * `itemCode`. `itemCode` is a material-code field (the material identity census
 * in `materialIdentity.test.ts` derives it as one), and an Oslo sticker has no
 * material code; a value like `item-1` there would be a fake code in a code
 * field. The first build did exactly that and the census declined the field.
 */
export const itemOfLine = (rfq: TieredRfqShape, lineNo: number | undefined): RfqItem | undefined =>
  lineNo === undefined ? undefined : (rfq.items ?? []).find((i) => i.lineNo === lineNo);

/** "item 1 (Oslo front sticker)" — how every refusal names an item. */
export const itemName = (item: Pick<RfqItem, 'lineNo' | 'description'>): string =>
  `item ${item.lineNo} (${item.description})`;

// ── The evaluation break ────────────────────────────────────────────────────

/**
 * The breaks the buyer can evaluate at: the RFQ's own breaks, or — when the
 * RFQ states none and every item carries an override — the union of the
 * items' breaks. Ascending.
 */
export function evaluationBreaks(rfq: TieredRfqShape): readonly number[] {
  if ((rfq.tiers ?? []).length > 0) return (rfq.tiers ?? []).map((t) => t.qty);
  const all = new Set((rfq.items ?? []).flatMap((i) => (i.tiers ?? []).map((t) => t.qty)));
  return [...all].sort((a, b) => a - b);
}

/**
 * The break in force for ONE item when the RFQ is evaluated at `qty`: the item's
 * own break of that quantity, or — for an item whose override does not carry it
 * — the item's break NEAREST to it (the smaller on a tie). Stated rather than
 * silently chosen, because an item override is the one place the two can differ.
 */
export function itemTierAt(rfq: TieredRfqShape, item: RfqItem, qty: number): RfqQuantityTier | undefined {
  const tiers = tiersForItem(rfq, item);
  const exact = tiers.find((t) => t.qty === qty);
  if (exact) return exact;
  return [...tiers].sort((a, b) => Math.abs(a.qty - qty) - Math.abs(b.qty - qty) || a.qty - b.qty)[0];
}

/** The pieces the whole event buys at a break: Σ over items. */
export function eventPiecesAt(rfq: TieredRfqShape, qty: number): number {
  return (rfq.items ?? []).reduce((sum, item) => {
    const tier = itemTierAt(rfq, item, qty);
    return sum + (tier ? tierPieces(tier, item) : 0);
  }, 0);
}

/**
 * The DEFAULT evaluation break: the one whose pieces across every item come
 * nearest the RFQ's `totalQty` — the quantity the buyer said the event is for.
 * Ties go to the smaller break (the smaller commitment). `null` when the RFQ has
 * no break at all.
 *
 * Oslo: `totalQty` 48,000 is 3K per variant × 8 variants × 2 items, so the
 * default is the 3K break; Iron (10K total, one item) defaults to 10K.
 */
export function defaultEvaluationTierQty(rfq: TieredRfqShape): number | null {
  const breaks = evaluationBreaks(rfq);
  if (breaks.length === 0) return null;
  return [...breaks].sort(
    (a, b) =>
      Math.abs(eventPiecesAt(rfq, a) - rfq.totalQty) - Math.abs(eventPiecesAt(rfq, b) - rfq.totalQty) || a - b,
  )[0]!;
}

// ── Cost at a break ─────────────────────────────────────────────────────────

/** One item's cost, for one quote, at the evaluation break. */
export interface ItemCost {
  /** The item's break actually priced (see `itemTierAt`). */
  readonly tierQty: number;
  readonly unitPrice: number;
  readonly pieces: number;
  /** Σ of the one-time costs the supplier quoted for this item. */
  readonly oneTime: number;
  /** unit price × pieces + one-time costs. */
  readonly total: number;
}

/**
 * The item's cost at the evaluation break, or `null` when the supplier did not
 * price the item at that break — a total built from a missing price would be a
 * number nobody quoted.
 */
export function itemCostAt(
  rfq: TieredRfqShape,
  item: RfqItem,
  quote: Pick<TieredQuoteShape, 'itemQuotes'>,
  qty: number,
): ItemCost | null {
  const tier = itemTierAt(rfq, item, qty);
  const iq = (quote.itemQuotes ?? []).find((q) => q.itemLineNo === item.lineNo);
  const price = tier ? iq?.tierPrices.find((p) => p.tierQty === tier.qty) : undefined;
  if (!tier || !iq || !price) return null;
  const pieces = tierPieces(tier, item);
  const oneTime = (iq.oneTimeCosts ?? []).reduce((s, c) => s + c.amount, 0);
  return { tierQty: tier.qty, unitPrice: price.unitPrice, pieces, oneTime, total: price.unitPrice * pieces + oneTime };
}

/** The whole quote's total cost at the break, or `null` if any item is unpriced there. */
export function quoteTotalAt(
  rfq: TieredRfqShape,
  quote: Pick<TieredQuoteShape, 'itemQuotes'>,
  qty: number,
): number | null {
  let total = 0;
  for (const item of rfq.items ?? []) {
    const cost = itemCostAt(rfq, item, quote, qty);
    if (!cost) return null;
    total += cost.total;
  }
  return total;
}

/**
 * The quote id(s) with the LOWEST unit price at each of one item's breaks.
 * Only a same-currency set is marked: comparing bare numerals across currencies
 * is the defect `scoreQuotations` refuses (2e-c-2-FIND-01), so a mixed set marks
 * nothing rather than marking the wrong cell.
 */
export function bestPriceByBreak(
  rfq: TieredRfqShape,
  item: RfqItem,
  quotes: readonly TieredQuoteShape[],
): ReadonlyMap<number, readonly string[]> {
  const out = new Map<number, string[]>();
  const currencies = new Set(quotes.map((q) => q.currency ?? BASE_CURRENCY));
  if (currencies.size > 1) return out;
  for (const tier of tiersForItem(rfq, item)) {
    const priced = quotes
      .map((q) => ({
        id: q.id,
        price: (q.itemQuotes ?? [])
          .find((iq) => iq.itemLineNo === item.lineNo)
          ?.tierPrices.find((p) => p.tierQty === tier.qty)?.unitPrice,
      }))
      .filter((p): p is { id: string; price: number } => typeof p.price === 'number' && p.price > 0);
    if (priced.length === 0) continue;
    const min = Math.min(...priced.map((p) => p.price));
    out.set(
      tier.qty,
      priced.filter((p) => p.price === min).map((p) => p.id),
    );
  }
  return out;
}

// ── Scoring at the break ────────────────────────────────────────────────────

/**
 * CR-15 for ONE item at the evaluation break. Price is the item's total cost
 * there, lead time the item's own (the quote's when the item states none), and
 * reliability the supplier's OTIF score. A quote that did not price the item at
 * the break is not scored — it has no number to rank.
 *
 * The caller passes only the quotes that PASS the compliance gate (BR-01a).
 */
export function scoreItemAt(
  rfq: TieredRfqShape,
  item: RfqItem,
  quotes: readonly TieredQuoteShape[],
  qty: number,
  reliabilityOf: (supplierId: string) => number,
  opts: ScoringOptions = {},
): ScoringOutcome {
  const scorable = quotes.flatMap((q) => {
    const cost = itemCostAt(rfq, item, q, qty);
    if (!cost) return [];
    const iq = (q.itemQuotes ?? []).find((x) => x.itemLineNo === item.lineNo);
    return [
      {
        id: q.id,
        unitPrice: cost.total,
        currency: q.currency ?? BASE_CURRENCY,
        leadTimeDays: iq?.leadTimeDays ?? q.leadTimeDays,
        reliabilityScore: reliabilityOf(q.supplierId),
      },
    ];
  });
  return scoreQuotations(scorable, opts);
}

/**
 * CR-15 for the WHOLE tiered event at the evaluation break: price = the quote's
 * total cost at the break across every item. A quote missing a price at the
 * break is not scored.
 */
export function scoreRfqAt(
  rfq: TieredRfqShape,
  quotes: readonly TieredQuoteShape[],
  qty: number,
  reliabilityOf: (supplierId: string) => number,
  opts: ScoringOptions = {},
): ScoringOutcome {
  const scorable = quotes.flatMap((q) => {
    const total = quoteTotalAt(rfq, q, qty);
    if (total === null) return [];
    return [
      {
        id: q.id,
        unitPrice: total,
        currency: q.currency ?? BASE_CURRENCY,
        leadTimeDays: q.leadTimeDays,
        reliabilityScore: reliabilityOf(q.supplierId),
      },
    ];
  });
  return scoreQuotations(scorable, opts);
}

/** The top-ranked quote id of a scoring outcome, or null when it is unrankable. */
export const topRankedOf = (outcome: ScoringOutcome): string | null =>
  outcome.kind === 'scored' ? (outcome.scores.find((s) => s.topRanked)?.quoteId ?? null) : null;

/** The best-scored quote per item at the break (item line → quote id or null). */
export function bestScoredByItemAt(
  rfq: TieredRfqShape,
  quotes: readonly TieredQuoteShape[],
  qty: number,
  reliabilityOf: (supplierId: string) => number,
  opts: ScoringOptions = {},
): ReadonlyMap<number, string | null> {
  return new Map(
    (rfq.items ?? []).map((item) => [
      item.lineNo,
      topRankedOf(scoreItemAt(rfq, item, quotes, qty, reliabilityOf, opts)),
    ]),
  );
}

// ── The per-item split award ────────────────────────────────────────────────

/** The quantity a share of one item is, at the break: derived, never typed. */
export function awardQuantity(rfq: TieredRfqShape, item: RfqItem, qty: number, sharePct: number): number {
  const tier = itemTierAt(rfq, item, qty);
  return tier ? Math.round((tierPieces(tier, item) * sharePct) / 100) : 0;
}

/**
 * The award lines a set of per-item shares describes. `shares` is
 * item line (as text) → quotationId → percent; a blank, zero or unreadable share is not a
 * line. Every line records the evaluation break it was made at.
 */
export function buildTieredAwardLines(
  rfq: TieredRfqShape,
  qty: number,
  shares: Readonly<Record<string, Readonly<Record<string, string | number>>>>,
  quotes: readonly Pick<TieredQuoteShape, 'id' | 'supplierId'>[],
): AwardLine[] {
  const lines: AwardLine[] = [];
  for (const item of rfq.items ?? []) {
    for (const q of quotes) {
      const pct = Number(shares[String(item.lineNo)]?.[q.id]);
      if (!Number.isFinite(pct) || pct <= 0) continue;
      lines.push({
        supplierId: q.supplierId,
        quotationId: q.id,
        itemCode: '',
        itemLineNo: item.lineNo,
        sharePct: pct,
        quantity: awardQuantity(rfq, item, qty, pct),
        awardTierQty: qty,
      });
    }
  }
  return lines;
}

/** The refusal codes a tiered award can earn from its SHAPE. */
export type TieredAwardRefusalCode =
  | 'AWARD_EMPTY'
  | 'AWARD_ITEM_UNKNOWN'
  | 'AWARD_TIER_UNKNOWN'
  | 'AWARD_SHARE_INVALID'
  | 'AWARD_SPLIT_INCOMPLETE'
  | 'AWARD_ITEM_NOT_QUOTED'
  | 'AWARD_QTY_NOT_DERIVED'
  | 'AWARD_REASON_REQUIRED';

/** A refusal, structured so the verb can state it and the page can translate it. */
export interface TieredAwardRefusal {
  readonly code: TieredAwardRefusalCode;
  /** The item concerned, when there is one. */
  readonly item?: string;
  /** The item's total share, for AWARD_SPLIT_INCOMPLETE. */
  readonly pct?: number;
  /** The offending item line, supplier or break, as text. */
  readonly detail?: string;
}

/** The refusal as the verb states it: `CODE: sentence`. */
export function tieredRefusalText(r: TieredAwardRefusal): string {
  switch (r.code) {
    case 'AWARD_EMPTY':
      return 'AWARD_EMPTY: an award names at least one supplier';
    case 'AWARD_ITEM_UNKNOWN':
      return r.detail
        ? `AWARD_ITEM_UNKNOWN: ${r.detail} is not an item on this RFQ; a tiered RFQ is awarded item by item`
        : 'AWARD_ITEM_UNKNOWN: an award line names no item; a tiered RFQ is awarded item by item';
    case 'AWARD_TIER_UNKNOWN':
      return `AWARD_TIER_UNKNOWN: every line records one quantity break of this RFQ (${r.detail ?? 'none'})`;
    case 'AWARD_SHARE_INVALID':
      return 'AWARD_SHARE_INVALID: every share is a percentage above zero';
    case 'AWARD_SPLIT_INCOMPLETE':
      return `AWARD_SPLIT_INCOMPLETE: ${r.item} totals ${r.pct}%, not 100%`;
    case 'AWARD_ITEM_NOT_QUOTED':
      return `AWARD_ITEM_NOT_QUOTED: ${r.detail} did not price ${r.item} at this break`;
    case 'AWARD_QTY_NOT_DERIVED':
      return `AWARD_QTY_NOT_DERIVED: the quantity for ${r.item} is not the share of the break`;
    case 'AWARD_REASON_REQUIRED':
      return `AWARD_REASON_REQUIRED: the award for ${r.item} does not follow the best score, so it needs a reason`;
  }
}

/** Round a share total for display and the tolerance check alike. */
const roundPct = (n: number): number => Math.round(n * 100) / 100;

/**
 * Why a tiered award's SHAPE is refused, or `null`. Checked in this order:
 * lines exist · each names an item of this RFQ · all record the same break of
 * this RFQ · shares are positive · EVERY item totals 100% (an item with no line
 * totals 0% and is named) · each awarded quote priced the item at the break ·
 * each quantity is the share of the break.
 *
 * The compliance gate, "the quote is on this event" and the reason rule need
 * the stores and the clock, so the verb checks those; this is the part a page
 * can check before it dispatches, with the verb's own words.
 */
export function tieredAwardShapeRefusal(
  rfq: TieredRfqShape,
  lines: readonly AwardLine[],
  quotes: readonly Pick<TieredQuoteShape, 'id' | 'supplierId' | 'itemQuotes'>[],
): TieredAwardRefusal | null {
  if (lines.length === 0) return { code: 'AWARD_EMPTY' };
  for (const line of lines) {
    if (!itemOfLine(rfq, line.itemLineNo)) {
      return {
        code: 'AWARD_ITEM_UNKNOWN',
        ...(line.itemLineNo !== undefined ? { detail: `item ${line.itemLineNo}` } : {}),
      };
    }
  }
  const breaks = evaluationBreaks(rfq);
  const tierQtys = [...new Set(lines.map((l) => l.awardTierQty))];
  if (tierQtys.length !== 1 || typeof tierQtys[0] !== 'number' || !breaks.includes(tierQtys[0])) {
    return { code: 'AWARD_TIER_UNKNOWN', detail: tierQtys.map(String).join(', ') };
  }
  const qty = tierQtys[0];
  if (lines.some((l) => !Number.isFinite(l.sharePct) || l.sharePct <= 0)) return { code: 'AWARD_SHARE_INVALID' };
  for (const item of rfq.items ?? []) {
    const total = roundPct(
      lines.filter((l) => l.itemLineNo === item.lineNo).reduce((s, l) => s + l.sharePct, 0),
    );
    if (Math.abs(total - 100) > 0.01) return { code: 'AWARD_SPLIT_INCOMPLETE', item: itemName(item), pct: total };
  }
  for (const line of lines) {
    const item = itemOfLine(rfq, line.itemLineNo)!;
    const quote = quotes.find((q) => q.id === line.quotationId);
    if (quote && !itemCostAt(rfq, item, quote, qty)) {
      return { code: 'AWARD_ITEM_NOT_QUOTED', item: itemName(item), detail: quote.supplierId };
    }
    if (line.quantity !== awardQuantity(rfq, item, qty, line.sharePct)) {
      return { code: 'AWARD_QTY_NOT_DERIVED', item: itemName(item) };
    }
  }
  return null;
}

/**
 * The items whose award leaves out that item's best-scored quote. A split that
 * gives the best quote any share FOLLOWS it (the event-level rule, per item); an
 * item with no rankable best has nothing to depart from.
 */
export function itemsDepartingBestScore(
  rfq: TieredRfqShape,
  lines: readonly AwardLine[],
  bestByItem: ReadonlyMap<number, string | null>,
): readonly RfqItem[] {
  return (rfq.items ?? []).filter((item) => {
    const best = bestByItem.get(item.lineNo);
    if (!best) return false;
    return !lines.some((l) => l.itemLineNo === item.lineNo && l.quotationId === best);
  });
}

// ── Export ──────────────────────────────────────────────────────────────────

const csvCell = (v: string | number): string => {
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** One CSV row of the comparison. */
export interface ComparisonCsvRow {
  readonly rfqNumber: string;
  readonly item: string;
  readonly supplier: string;
  readonly breakQty: number;
  readonly basis: string;
  readonly unitPrice: number;
  readonly currency: string;
  readonly oneTimeCosts: number;
  readonly leadTimeDays: number;
}

/**
 * The comparison as rows: items × suppliers × breaks for a tiered RFQ; one row
 * per quote for a legacy RFQ (its one "break" is its `totalQty`, and its item is
 * its line item or material). Only the CURRENT version of each bid is passed in.
 */
export function comparisonRows(
  rfq: TieredRfqShape & {
    readonly rfqNumber: string;
    readonly materialIds?: readonly string[];
    readonly lineItems?: readonly { readonly materialCode: string; readonly description: string }[];
    readonly currency?: string;
  },
  quotes: readonly (TieredQuoteShape & { readonly unitPrice: number })[],
  supplierName: (id: string) => string,
): ComparisonCsvRow[] {
  const rows: ComparisonCsvRow[] = [];
  if (!isTieredRfq(rfq)) {
    const item =
      rfq.lineItems && rfq.lineItems.length > 0
        ? rfq.lineItems.map((l) => `${l.materialCode} ${l.description}`).join(' / ')
        : (rfq.materialIds ?? []).join(' / ');
    for (const q of quotes) {
      rows.push({
        rfqNumber: rfq.rfqNumber,
        item,
        supplier: supplierName(q.supplierId),
        breakQty: rfq.totalQty,
        basis: 'total',
        unitPrice: q.unitPrice,
        currency: q.currency ?? rfq.currency ?? BASE_CURRENCY,
        oneTimeCosts: 0,
        leadTimeDays: q.leadTimeDays,
      });
    }
    return rows;
  }
  for (const item of rfq.items ?? []) {
    for (const q of quotes) {
      const iq = (q.itemQuotes ?? []).find((x) => x.itemLineNo === item.lineNo);
      if (!iq) continue;
      const oneTime = (iq.oneTimeCosts ?? []).reduce((s, c) => s + c.amount, 0);
      for (const tier of tiersForItem(rfq, item)) {
        const price = iq.tierPrices.find((p) => p.tierQty === tier.qty);
        if (!price) continue;
        rows.push({
          rfqNumber: rfq.rfqNumber,
          item: `${item.lineNo} ${item.description}`,
          supplier: supplierName(q.supplierId),
          breakQty: tier.qty,
          basis: tier.basis,
          unitPrice: price.unitPrice,
          currency: q.currency ?? rfq.currency ?? BASE_CURRENCY,
          oneTimeCosts: oneTime,
          leadTimeDays: iq.leadTimeDays ?? q.leadTimeDays,
        });
      }
    }
  }
  return rows;
}

/** The rows as CSV text, headed by the given column labels (already translated). */
export function comparisonCsv(rows: readonly ComparisonCsvRow[], header: readonly string[]): string {
  const body = rows.map((r) =>
    [
      r.rfqNumber,
      r.item,
      r.supplier,
      r.breakQty,
      r.basis,
      r.unitPrice,
      r.currency,
      r.oneTimeCosts,
      r.leadTimeDays,
    ]
      .map(csvCell)
      .join(','),
  );
  return [header.map(csvCell).join(','), ...body].join('\n');
}

/** The current version of each bid: a superseded quote is history, not a rival. */
export function currentVersions<T extends { readonly id: string; readonly supersedesQuotationId?: string }>(
  quotes: readonly T[],
): T[] {
  const superseded = new Set(quotes.map((q) => q.supersedesQuotationId).filter(Boolean) as string[]);
  return quotes.filter((q) => !superseded.has(q.id));
}
