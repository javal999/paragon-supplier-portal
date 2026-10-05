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
//   · the award is PER ITEM, split across suppliers that pass the gate, and
//     each line records the break it was made at. The award RULE lives in
//     `awardShape.js` (RFx C1), one rule for tiered and legacy RFQs alike.
//
// ⚠️ **THIS IS A PARALLEL DERIVATION, NOT A CHANGE TO `deriveQuoteHeader`.** The
// stored header on a quote (`unitPrice` / `totalPrice`) stays what B1 defined —
// the first break — because it is written when the quote is submitted and the
// buyer's evaluation break is a READ-TIME choice that can move after that. The
// comparison and the award read THIS module instead of the header whenever the
// RFQ has items; a legacy single-price RFQ never reaches it.
// ────────────────────────────────────────────────────────────────────────────

/** @import { BidCurrency } from '@lib/currencyPolicy' */
import { BASE_CURRENCY } from '@lib/currencyPolicy';
/** @import { ScoringOptions, ScoringOutcome } from '@lib/quoteScore' */
import { scoreQuotations, scoreStanding } from '@lib/quoteScore';
/** @import { AwardLine } from './types' */
/** @import { QuotationItemQuote, RfqItem, RfqQuantityTier } from './rfqModel' */
import { tierPieces, tiersForItem } from './rfqModel';

/** The RFQ fields the comparison reads. */
/**
 * @typedef {{
 *   readonly rfqNumber?: string;
 *   readonly totalQty: number;
 *   readonly items?: readonly RfqItem[];
 *   readonly tiers?: readonly RfqQuantityTier[];
 * }} TieredRfqShape
 */

/** The quotation fields the comparison reads. */
/**
 * @typedef {{
 *   readonly id: string;
 *   readonly supplierId: string;
 *   readonly currency?: BidCurrency;
 *   readonly leadTimeDays: number;
 *   readonly itemQuotes?: readonly QuotationItemQuote[];
 * }} TieredQuoteShape
 */

/**
 * True when the RFQ carries items — the rebuilt shape. A legacy RFQ never does.
 * @param {{ readonly items?: readonly unknown[] }} rfq
 * @returns {boolean}
 */
export const isTieredRfq = (rfq) => (rfq.items?.length ?? 0) > 0;

/**
 * The item an award line names by `itemLineNo`, or undefined.
 *
 * ⚠️ A TIERED LINE IS NAMED BY ITS LINE NUMBER, NEVER BY A CODE MINTED INTO
 * `itemCode`. `itemCode` is a material-code field (the material identity census
 * in `materialIdentity.test.js` derives it as one), and an Oslo sticker has no
 * material code; a value like `item-1` there would be a fake code in a code
 * field. The first build did exactly that and the census declined the field.
 * @param {TieredRfqShape} rfq
 * @param {number | undefined} lineNo
 * @returns {RfqItem | undefined}
 */
export const itemOfLine = (rfq, lineNo) =>
  lineNo === undefined ? undefined : (rfq.items ?? []).find((i) => i.lineNo === lineNo);

/**
 * "item 1 (Oslo front sticker)" — how every refusal names an item.
 * @param {Pick<RfqItem, 'lineNo' | 'description'>} item
 * @returns {string}
 */
export const itemName = (item) => `item ${item.lineNo} (${item.description})`;

// ── The evaluation break ────────────────────────────────────────────────────

/**
 * The breaks the buyer can evaluate at: the RFQ's own breaks, or — when the
 * RFQ states none and every item carries an override — the union of the
 * items' breaks. Ascending.
 * @param {TieredRfqShape} rfq
 * @returns {readonly number[]}
 */
export function evaluationBreaks(rfq) {
  if ((rfq.tiers ?? []).length > 0) return (rfq.tiers ?? []).map((t) => t.qty);
  const all = new Set((rfq.items ?? []).flatMap((i) => (i.tiers ?? []).map((t) => t.qty)));
  return [...all].sort((a, b) => a - b);
}

/**
 * The break in force for ONE item when the RFQ is evaluated at `qty`: the item's
 * own break of that quantity, or — for an item whose override does not carry it
 * — the item's break NEAREST to it (the smaller on a tie). Stated rather than
 * silently chosen, because an item override is the one place the two can differ.
 * @param {TieredRfqShape} rfq
 * @param {RfqItem} item
 * @param {number} qty
 * @returns {RfqQuantityTier | undefined}
 */
export function itemTierAt(rfq, item, qty) {
  const tiers = tiersForItem(rfq, item);
  const exact = tiers.find((t) => t.qty === qty);
  if (exact) return exact;
  return [...tiers].sort(
    (a, b) => Math.abs(a.qty - qty) - Math.abs(b.qty - qty) || a.qty - b.qty
  )[0];
}

/**
 * The pieces the whole event buys at a break: Σ over items.
 * @param {TieredRfqShape} rfq
 * @param {number} qty
 * @returns {number}
 */
export function eventPiecesAt(rfq, qty) {
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
 * @param {TieredRfqShape} rfq
 * @returns {number | null}
 */
export function defaultEvaluationTierQty(rfq) {
  const breaks = evaluationBreaks(rfq);
  if (breaks.length === 0) return null;
  return /** @type {number} */ (
    [...breaks].sort(
      (a, b) =>
        Math.abs(eventPiecesAt(rfq, a) - rfq.totalQty) -
          Math.abs(eventPiecesAt(rfq, b) - rfq.totalQty) || a - b
    )[0]
  );
}

// ── Cost at a break ─────────────────────────────────────────────────────────

/** One item's cost, for one quote, at the evaluation break. */
/**
 * `tierQty`:  The item's break actually priced (see `itemTierAt`).
 * `oneTime`:  Σ of the one-time costs the supplier quoted for this item.
 * `total`:  unit price × pieces + one-time costs.
 *
 * @typedef {{
 *   readonly tierQty: number;
 *   readonly unitPrice: number;
 *   readonly pieces: number;
 *   readonly oneTime: number;
 *   readonly total: number;
 * }} ItemCost
 */

/**
 * The item's cost at the evaluation break, or `null` when the supplier did not
 * price the item at that break — a total built from a missing price would be a
 * number nobody quoted.
 * @param {TieredRfqShape} rfq
 * @param {RfqItem} item
 * @param {Pick<TieredQuoteShape, 'itemQuotes'>} quote
 * @param {number} qty
 * @returns {ItemCost | null}
 */
export function itemCostAt(rfq, item, quote, qty) {
  const tier = itemTierAt(rfq, item, qty);
  const iq = (quote.itemQuotes ?? []).find((q) => q.itemLineNo === item.lineNo);
  const price = tier ? iq?.tierPrices.find((p) => p.tierQty === tier.qty) : undefined;
  if (!tier || !iq || !price) return null;
  const pieces = tierPieces(tier, item);
  const oneTime = (iq.oneTimeCosts ?? []).reduce((s, c) => s + c.amount, 0);
  return {
    tierQty: tier.qty,
    unitPrice: price.unitPrice,
    pieces,
    oneTime,
    total: price.unitPrice * pieces + oneTime
  };
}

/**
 * The whole quote's total cost at the break, or `null` if any item is unpriced there.
 * @param {TieredRfqShape} rfq
 * @param {Pick<TieredQuoteShape, 'itemQuotes'>} quote
 * @param {number} qty
 * @returns {number | null}
 */
export function quoteTotalAt(rfq, quote, qty) {
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
 * @param {TieredRfqShape} rfq
 * @param {RfqItem} item
 * @param {readonly TieredQuoteShape[]} quotes
 * @returns {ReadonlyMap<number, readonly string[]>}
 */
export function bestPriceByBreak(rfq, item, quotes) {
  const out = /** @type {Map<number, string[]>} */ (new Map());
  const currencies = new Set(quotes.map((q) => q.currency ?? BASE_CURRENCY));
  if (currencies.size > 1) return out;
  for (const tier of tiersForItem(rfq, item)) {
    const priced = quotes
      .map((q) => ({
        id: q.id,
        price: (q.itemQuotes ?? [])
          .find((iq) => iq.itemLineNo === item.lineNo)
          ?.tierPrices.find((p) => p.tierQty === tier.qty)?.unitPrice
      }))
      .filter(
        /** @returns {p is { id: string; price: number }} */ (p) =>
          typeof p.price === 'number' && p.price > 0
      );
    if (priced.length === 0) continue;
    const min = Math.min(...priced.map((p) => p.price));
    out.set(
      tier.qty,
      priced.filter((p) => p.price === min).map((p) => p.id)
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
 * @param {TieredRfqShape} rfq
 * @param {RfqItem} item
 * @param {readonly TieredQuoteShape[]} quotes
 * @param {number} qty
 * @param {(supplierId: string) => number} reliabilityOf
 * @param {ScoringOptions} [opts]
 * @returns {ScoringOutcome}
 */
export function scoreItemAt(rfq, item, quotes, qty, reliabilityOf, opts = {}) {
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
        reliabilityScore: reliabilityOf(q.supplierId)
      }
    ];
  });
  return scoreQuotations(scorable, opts);
}

/**
 * CR-15 for the WHOLE tiered event at the evaluation break: price = the quote's
 * total cost at the break across every item. A quote missing a price at the
 * break is not scored.
 * @param {TieredRfqShape} rfq
 * @param {readonly TieredQuoteShape[]} quotes
 * @param {number} qty
 * @param {(supplierId: string) => number} reliabilityOf
 * @param {ScoringOptions} [opts]
 * @returns {ScoringOutcome}
 */
export function scoreRfqAt(rfq, quotes, qty, reliabilityOf, opts = {}) {
  const scorable = quotes.flatMap((q) => {
    const total = quoteTotalAt(rfq, q, qty);
    if (total === null) return [];
    return [
      {
        id: q.id,
        unitPrice: total,
        currency: q.currency ?? BASE_CURRENCY,
        leadTimeDays: q.leadTimeDays,
        reliabilityScore: reliabilityOf(q.supplierId)
      }
    ];
  });
  return scoreQuotations(scorable, opts);
}

/**
 * The best-scored quote id of a scoring outcome, or null when there is none to
 * follow: an unrankable set, OR A GENUINE TIE. On an exact tie the engine still
 * marks its stable first pick `topRanked`, but that is list order, not a ranking
 * — so the award's reason rule has no single best to depart from, and the
 * comparison shows the tied quotes as "Tied for best" (`scoreStanding`).
 * @param {ScoringOutcome} outcome
 * @returns {string | null}
 */
export const topRankedOf = (outcome) => {
  if (outcome.kind !== 'scored') return null;
  if (scoreStanding(outcome.scores).tiedIds.length > 1) return null;
  return outcome.scores.find((s) => s.topRanked)?.quoteId ?? null;
};

/**
 * The best-scored quote per item at the break (item line → quote id or null).
 * @param {TieredRfqShape} rfq
 * @param {readonly TieredQuoteShape[]} quotes
 * @param {number} qty
 * @param {(supplierId: string) => number} reliabilityOf
 * @param {ScoringOptions} [opts]
 * @returns {ReadonlyMap<number, string | null>}
 */
export function bestScoredByItemAt(rfq, quotes, qty, reliabilityOf, opts = {}) {
  return new Map(
    (rfq.items ?? []).map((item) => [
      item.lineNo,
      topRankedOf(scoreItemAt(rfq, item, quotes, qty, reliabilityOf, opts))
    ])
  );
}

// ── The per-item split award ────────────────────────────────────────────────

/**
 * The quantity a share of one item is, at the break: derived, never typed.
 * @param {TieredRfqShape} rfq
 * @param {RfqItem} item
 * @param {number} qty
 * @param {number} sharePct
 * @returns {number}
 */
export function awardQuantity(rfq, item, qty, sharePct) {
  const tier = itemTierAt(rfq, item, qty);
  return tier ? Math.round((tierPieces(tier, item) * sharePct) / 100) : 0;
}

/**
 * The quantities a set of shares of ONE item derives at a break of `pieces`:
 * each share of the break, rounded, and — when the shares total 100% within
 * 0.01 — the remainder unit(s) placed on the FIRST line, so an awarded item is
 * fully placed (NR-3 BR-03, edge case 2: 33.33% × 3 of 100,000 is 33,340 +
 * 33,330 + 33,330). The award rule (`awardShape.js`) derives with this too.
 * @param {number} pieces
 * @param {readonly number[]} sharePcts
 * @returns {number[]}
 */
export function splitQuantities(pieces, sharePcts) {
  const out = sharePcts.map((pct) => Math.round((pieces * pct) / 100));
  // Rounded to 2 places BEFORE the comparison: 99.99 − 100 is 0.0100000…05 in
  // floating point, which would put 33.33% × 3 outside its own tolerance.
  const off = Math.round(Math.abs(sharePcts.reduce((s, p) => s + p, 0) - 100) * 100) / 100;
  if (out.length > 0 && off <= 0.01) {
    out[0] =
      /** @type {NonNullable<(typeof out)[number]>} */ (out[0]) +
      (pieces - out.reduce((s, n) => s + n, 0));
  }
  return out;
}

/**
 * The award lines a set of per-item shares describes. `shares` is
 * item line (as text) → quotationId → percent; a blank, zero or unreadable share is not a
 * line. Every line records the evaluation break it was made at, and its
 * quantity is derived by `splitQuantities`, as the verb derives it.
 * @param {TieredRfqShape} rfq
 * @param {number} qty
 * @param {Readonly<Record<string, Readonly<Record<string, string | number>>>>} shares
 * @param {readonly Pick<TieredQuoteShape, 'id' | 'supplierId'>[]} quotes
 * @returns {AwardLine[]}
 */
export function buildTieredAwardLines(rfq, qty, shares, quotes) {
  /** @type {AwardLine[]} */
  const lines = [];
  for (const item of rfq.items ?? []) {
    const picked = quotes.flatMap((q) => {
      const pct = Number(shares[String(item.lineNo)]?.[q.id]);
      return Number.isFinite(pct) && pct > 0 ? [{ q, pct }] : [];
    });
    const tier = itemTierAt(rfq, item, qty);
    const qtys = splitQuantities(
      tier ? tierPieces(tier, item) : 0,
      picked.map((p) => p.pct)
    );
    picked.forEach(({ q, pct }, i) => {
      lines.push({
        supplierId: q.supplierId,
        quotationId: q.id,
        itemCode: '',
        itemLineNo: item.lineNo,
        sharePct: pct,
        quantity: /** @type {NonNullable<(typeof qtys)[number]>} */ (qtys[i]),
        awardTierQty: qty
      });
    });
  }
  return lines;
}

/**
 * The items whose award leaves out that item's best-scored quote. A split that
 * gives the best quote any share FOLLOWS it (the event-level rule, per item); an
 * item with no rankable best has nothing to depart from.
 * @param {TieredRfqShape} rfq
 * @param {readonly AwardLine[]} lines
 * @param {ReadonlyMap<number, string | null>} bestByItem
 * @returns {readonly RfqItem[]}
 */
export function itemsDepartingBestScore(rfq, lines, bestByItem) {
  return (rfq.items ?? []).filter((item) => {
    const best = bestByItem.get(item.lineNo);
    if (!best) return false;
    return !lines.some((l) => l.itemLineNo === item.lineNo && l.quotationId === best);
  });
}

// ── Export ──────────────────────────────────────────────────────────────────

/**
 * @param {string | number} v
 * @returns {string}
 */
const csvCell = (v) => {
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** One CSV row of the comparison. */
/**
 * @typedef {{
 *   readonly rfqNumber: string;
 *   readonly item: string;
 *   readonly supplier: string;
 *   readonly breakQty: number;
 *   readonly basis: string;
 *   readonly unitPrice: number;
 *   readonly currency: string;
 *   readonly oneTimeCosts: number;
 *   readonly leadTimeDays: number;
 * }} ComparisonCsvRow
 */

/**
 * The comparison as rows: items × suppliers × breaks for a tiered RFQ; one row
 * per quote for a legacy RFQ (its one "break" is its `totalQty`, and its item is
 * its line item or material). Only the CURRENT version of each bid is passed in.
 * @param {TieredRfqShape & { readonly rfqNumber: string; readonly materialIds?: readonly string[]; readonly lineItems?: readonly { readonly materialCode: string; readonly description: string }[]; readonly currency?: string; }} rfq
 * @param {readonly (TieredQuoteShape & { readonly unitPrice: number })[]} quotes
 * @param {(id: string) => string} supplierName
 * @returns {ComparisonCsvRow[]}
 */
export function comparisonRows(rfq, quotes, supplierName) {
  /** @type {ComparisonCsvRow[]} */
  const rows = [];
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
        leadTimeDays: q.leadTimeDays
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
          leadTimeDays: iq.leadTimeDays ?? q.leadTimeDays
        });
      }
    }
  }
  return rows;
}

/**
 * The rows as CSV text, headed by the given column labels (already translated).
 * @param {readonly ComparisonCsvRow[]} rows
 * @param {readonly string[]} header
 * @returns {string}
 */
export function comparisonCsv(rows, header) {
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
      r.leadTimeDays
    ]
      .map(csvCell)
      .join(',')
  );
  return [header.map(csvCell).join(','), ...body].join('\n');
}

/**
 * The current version of each bid: a superseded quote is history, not a rival.
 * @template {{ readonly id: string; readonly supersedesQuotationId?: string }} T
 * @param {readonly T[]} quotes
 * @returns {T[]}
 */
export function currentVersions(quotes) {
  const superseded = new Set(
    /** @type {string[]} */ (quotes.map((q) => q.supersedesQuotationId).filter(Boolean))
  );
  return quotes.filter((q) => !superseded.has(q.id));
}
