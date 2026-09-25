// ────────────────────────────────────────────────────────────────────────────
// RFx C1 — the ONE item-based award rule (AR-04; NR-3 BR-02 to BR-05).
//
// Each refusal code is fired by a KNOWN-BAD award beside a KNOWN-GOOD twin that
// differs in the one field the rule is about, so "the rule fired" cannot be
// read as "the rule refuses everything". Probed on small synthetic RFQs of both
// kinds, because the rule is pure and the item list is what it reads.
// ────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import {
  awardItemsOf,
  awardRefusalText,
  awardShapeRefusal,
  itemsOpenAfter,
  WHOLE_EVENT_ITEM_KEY,
  type AwardableRfq,
  type AwardQuoteShape,
} from './awardShape';
import type { AwardLine, AwardRecord } from './types';
import type { RfqItem } from './rfqModel';

// ── A legacy RFQ: two line items, each one break equal to its quantity ──────

const LEGACY: AwardableRfq = {
  rfqNumber: 'RFQ-T-001',
  totalQty: 150_000,
  lineItems: [
    { lineNo: 1, materialCode: 'M-BOTTLE', description: 'Bottle', quantity: 100_000 },
    { lineNo: 2, materialCode: 'M-CAP', description: 'Cap', quantity: 50_000 },
  ],
};
const LEGACY_QUOTES: AwardQuoteShape[] = [
  { id: 'qa', supplierId: 'sup-a' },
  { id: 'qb', supplierId: 'sup-b' },
  { id: 'qc', supplierId: 'sup-c' },
];
const legacyItems = () => awardItemsOf(LEGACY);

/** A legacy share line: the buyer typed the share, the quantity is derived. */
const byPct = (itemCode: string, quotationId: string, sharePct: number, quantity: number): AwardLine => ({
  supplierId: `sup-${quotationId.slice(1)}`,
  quotationId,
  itemCode,
  sharePct,
  quantity,
});

/** A legacy quantity line: the buyer typed the quantity, the share is derived. */
const byQty = (itemCode: string, quotationId: string, quantity: number, sharePct: number): AwardLine => ({
  ...byPct(itemCode, quotationId, sharePct, quantity),
  splitBasis: 'qty',
});

/** Both legacy items, each 100% to supplier a. */
const legacyWhole = (): AwardLine[] => [byPct('M-BOTTLE', 'qa', 100, 100_000), byPct('M-CAP', 'qa', 100, 50_000)];

// ── A tiered RFQ: two items, breaks of 10K and 50K pieces (total basis) ─────

const item = (lineNo: number, description: string): RfqItem => ({
  lineNo,
  itemType: 'sticker',
  description,
  variantCount: 1,
  uom: 'PCS',
  specFields: [],
});
const TIERED: AwardableRfq = {
  rfqNumber: 'RFQ-T-002',
  totalQty: 10_000,
  tiers: [
    { qty: 10_000, basis: 'total' },
    { qty: 50_000, basis: 'total' },
  ],
  items: [item(1, 'Front sticker'), item(2, 'Back sticker')],
};
const priced = (lineNo: number, tierQtys: readonly number[]) => ({
  itemLineNo: lineNo,
  tierPrices: tierQtys.map((tierQty) => ({ tierQty, unitPrice: 100 })),
});
const TIERED_QUOTES: AwardQuoteShape[] = [
  { id: 'qx', supplierId: 'sup-x', itemQuotes: [priced(1, [10_000, 50_000]), priced(2, [10_000, 50_000])] },
  // sup-y priced item 2 only at 10K
  { id: 'qy', supplierId: 'sup-y', itemQuotes: [priced(1, [10_000, 50_000]), priced(2, [10_000])] },
];
const tieredItems = () => awardItemsOf(TIERED);

const tLine = (quotationId: string, lineNo: number, sharePct: number, awardTierQty: number, quantity?: number): AwardLine => ({
  supplierId: `sup-${quotationId.slice(1)}`,
  quotationId,
  itemCode: '',
  itemLineNo: lineNo,
  sharePct,
  quantity: quantity ?? Math.round((awardTierQty * sharePct) / 100),
  awardTierQty,
});

const codeOf = (lines: readonly AwardLine[], items = legacyItems(), quotes = LEGACY_QUOTES) =>
  awardShapeRefusal(items, lines, quotes)?.code ?? null;

// ─────────────────────────────────────────────────────────────────────────────

describe('the item list both RFQ kinds produce (awardItemsOf)', () => {
  it('a legacy RFQ is its line items, each with one break equal to the line quantity', () => {
    expect(legacyItems().map((i) => [i.key, i.name, i.breaks])).toEqual([
      ['M-BOTTLE', 'item 1 (Bottle)', [{ qty: 100_000, pieces: 100_000 }]],
      ['M-CAP', 'item 2 (Cap)', [{ qty: 50_000, pieces: 50_000 }]],
    ]);
  });

  it('edge case 6 — a legacy RFQ with no lines is 1 item, one break equal to its total quantity', () => {
    const items = awardItemsOf({ rfqNumber: 'RFQ-T-003', totalQty: 7_500 });
    expect(items.map((i) => [i.key, i.itemCode, i.breaks])).toEqual([
      [WHOLE_EVENT_ITEM_KEY, '', [{ qty: 7_500, pieces: 7_500 }]],
    ]);
    const whole: AwardLine = { supplierId: 'sup-a', quotationId: 'qa', itemCode: '', sharePct: 100, quantity: 7_500 };
    expect(awardShapeRefusal(items, [whole], LEGACY_QUOTES)).toBeNull();
  });

  it('a tiered RFQ is its items, each with the evaluation breaks', () => {
    expect(tieredItems().map((i) => [i.key, i.lineNo, i.breaks.map((b) => b.qty)])).toEqual([
      ['1', 1, [10_000, 50_000]],
      ['2', 2, [10_000, 50_000]],
    ]);
  });
});

describe('AWARD_EMPTY', () => {
  it('KNOWN-BAD — no lines', () => expect(codeOf([])).toBe('AWARD_EMPTY'));
  it('KNOWN-GOOD — one line per item', () => expect(codeOf(legacyWhole())).toBeNull());
});

// RFx C3 (NR-3 BR-06) — a FINAL award with no lines that only marks the open
// items "Will not award" on a Partly awarded event. Item 1 was awarded by an
// earlier award in force (`aw-p`), so item 2 (M-CAP) is the only open item.
describe('AWARD_EMPTY — "Will not award the rest" (settlesRestWithoutLines)', () => {
  const prior: AwardRecord = {
    id: 'aw-p',
    eventType: 'rfq',
    eventId: 'rfq-t',
    awardedAt: '2026-09-01T00:00:00Z',
    lines: [byPct('M-BOTTLE', 'qa', 100, 100_000)],
    notAwardedSupplierIds: [],
  };
  const partly = () => awardItemsOf(LEGACY, [prior]);
  const settle = (partlyAwarded: boolean, notAwardedKeys: readonly string[]) =>
    awardShapeRefusal(partly(), [], LEGACY_QUOTES, { partlyAwarded, notAwardedKeys })?.code ?? null;

  it('KNOWN-GOOD — Partly awarded, and every open item is marked Will not award', () => {
    expect(settle(true, ['M-CAP'])).toBeNull();
  });
  it('KNOWN-BAD — Partly awarded, but the open item is not marked', () => {
    expect(settle(true, [])).toBe('AWARD_EMPTY');
  });
  it('KNOWN-BAD — Partly awarded, marking only an item already awarded', () => {
    expect(settle(true, ['M-BOTTLE'])).toBe('AWARD_EMPTY');
  });
  it('KNOWN-BAD — not Partly awarded: marking every item is still an empty award', () => {
    expect(awardShapeRefusal(legacyItems(), [], LEGACY_QUOTES, { partlyAwarded: false, notAwardedKeys: ['M-BOTTLE', 'M-CAP'] })?.code).toBe(
      'AWARD_EMPTY',
    );
  });
  it('KNOWN-BAD — no settle argument (the partial award): AWARD_EMPTY as before', () => {
    expect(awardShapeRefusal(partly(), [], LEGACY_QUOTES)?.code).toBe('AWARD_EMPTY');
  });
});

describe('AWARD_ITEM_UNKNOWN', () => {
  it('KNOWN-BAD — a legacy line naming a material the RFQ does not have, named', () => {
    const r = awardShapeRefusal(legacyItems(), [byPct('M-OTHER', 'qa', 100, 100_000)], LEGACY_QUOTES)!;
    expect(awardRefusalText(r)).toMatch(/AWARD_ITEM_UNKNOWN: M-OTHER is not an item on this RFQ/);
  });
  it('KNOWN-BAD — a tiered line naming item 9, and one naming no item', () => {
    expect(awardRefusalText(awardShapeRefusal(tieredItems(), [tLine('qx', 9, 100, 10_000)], TIERED_QUOTES)!)).toMatch(
      /AWARD_ITEM_UNKNOWN: item 9 is not an item/,
    );
    const noItem: AwardLine = { supplierId: 'sup-x', quotationId: 'qx', itemCode: '', sharePct: 100, quantity: 10_000 };
    expect(awardRefusalText(awardShapeRefusal(tieredItems(), [noItem], TIERED_QUOTES)!)).toMatch(
      /AWARD_ITEM_UNKNOWN: an award line names no item/,
    );
  });
  it('KNOWN-GOOD — the same lines naming items the RFQ has', () => {
    expect(codeOf([tLine('qx', 1, 100, 10_000), tLine('qx', 2, 100, 10_000)], tieredItems(), TIERED_QUOTES)).toBeNull();
  });
});

describe('AWARD_TIER_UNKNOWN', () => {
  it('KNOWN-BAD — a break the item does not have', () => {
    expect(codeOf([tLine('qx', 1, 100, 7_000)], tieredItems(), TIERED_QUOTES)).toBe('AWARD_TIER_UNKNOWN');
  });
  it('KNOWN-BAD — one item’s lines at two different breaks, named', () => {
    const r = awardShapeRefusal(tieredItems(), [tLine('qx', 1, 50, 10_000), tLine('qy', 1, 50, 50_000)], TIERED_QUOTES)!;
    expect(awardRefusalText(r)).toMatch(/AWARD_TIER_UNKNOWN: the lines for item 1 \(Front sticker\)/);
  });
  it('KNOWN-BAD — a tiered line with no break at all', () => {
    const { awardTierQty: _drop, ...noBreak } = tLine('qx', 1, 100, 10_000);
    expect(codeOf([noBreak], tieredItems(), TIERED_QUOTES)).toBe('AWARD_TIER_UNKNOWN');
  });
  it('KNOWN-GOOD — edge case 3: item 1 at the 10K break and item 2 at the 50K break in one award', () => {
    expect(codeOf([tLine('qx', 1, 100, 10_000), tLine('qx', 2, 100, 50_000)], tieredItems(), TIERED_QUOTES)).toBeNull();
  });
  it('KNOWN-GOOD — a legacy line with no break is read at its item’s only break', () => {
    expect(legacyWhole().every((l) => l.awardTierQty === undefined)).toBe(true);
    expect(codeOf(legacyWhole())).toBeNull();
  });
});

describe('AWARD_SHARE_INVALID', () => {
  it('KNOWN-BAD — a share of zero', () => {
    expect(codeOf([byPct('M-BOTTLE', 'qa', 0, 100_000), byPct('M-CAP', 'qa', 100, 50_000)])).toBe('AWARD_SHARE_INVALID');
  });
  it('KNOWN-GOOD — the same line at 100%', () => expect(codeOf(legacyWhole())).toBeNull());
});

describe('AWARD_QTY_INVALID', () => {
  it('KNOWN-BAD — a quantity line of zero units', () => {
    expect(codeOf([byQty('M-BOTTLE', 'qa', 0, 100)])).toBe('AWARD_QTY_INVALID');
  });
  it('KNOWN-GOOD — the same line at the whole break', () => {
    expect(codeOf([byQty('M-BOTTLE', 'qa', 100_000, 100)])).toBeNull();
  });
});

describe('AWARD_SPLIT_INCOMPLETE', () => {
  it('KNOWN-BAD — shares totalling 90%, naming the item', () => {
    const r = awardShapeRefusal(
      legacyItems(),
      [byPct('M-BOTTLE', 'qa', 60, 60_000), byPct('M-BOTTLE', 'qb', 30, 30_000)],
      LEGACY_QUOTES,
    )!;
    expect(awardRefusalText(r)).toBe('AWARD_SPLIT_INCOMPLETE: item 1 (Bottle) totals 90%, not 100%');
  });

  it('KNOWN-BAD — edge case 1: 60,000 + 45,000 on a 100,000 break, naming the item and the 105,000 total', () => {
    const r = awardShapeRefusal(
      legacyItems(),
      [byQty('M-BOTTLE', 'qa', 60_000, 60), byQty('M-BOTTLE', 'qb', 45_000, 45)],
      LEGACY_QUOTES,
    )!;
    expect(r).toMatchObject({ code: 'AWARD_SPLIT_INCOMPLETE', item: 'item 1 (Bottle)', total: 105_000, breakQty: 100_000 });
    expect(awardRefusalText(r)).toBe('AWARD_SPLIT_INCOMPLETE: item 1 (Bottle) totals 105,000, not 100,000');
  });

  it('KNOWN-GOOD — edge case 2: 33.33% × 3 is accepted, the remainder unit on the first line', () => {
    const lines = [
      byPct('M-BOTTLE', 'qa', 33.33, 33_340),
      byPct('M-BOTTLE', 'qb', 33.33, 33_330),
      byPct('M-BOTTLE', 'qc', 33.33, 33_330),
    ];
    expect(lines.reduce((s, l) => s + l.quantity, 0)).toBe(100_000);
    expect(codeOf(lines)).toBeNull();
    // the same split by quantity is within 1 unit and 0.01% too
    expect(
      codeOf([
        byQty('M-BOTTLE', 'qa', 33_334, 33.33),
        byQty('M-BOTTLE', 'qb', 33_333, 33.33),
        byQty('M-BOTTLE', 'qc', 33_333, 33.33),
      ]),
    ).toBeNull();
  });

  it('KNOWN-GOOD — 60,000 + 40,000 on the 100,000 break', () => {
    expect(codeOf([byQty('M-BOTTLE', 'qa', 60_000, 60), byQty('M-BOTTLE', 'qb', 40_000, 40)])).toBeNull();
  });
});

describe('AWARD_ITEM_NOT_QUOTED', () => {
  it('KNOWN-BAD — sup-y did not price item 2 at 50K, named', () => {
    const r = awardShapeRefusal(tieredItems(), [tLine('qy', 2, 100, 50_000)], TIERED_QUOTES)!;
    expect(awardRefusalText(r)).toBe('AWARD_ITEM_NOT_QUOTED: sup-y did not price item 2 (Back sticker) at this break');
  });
  it('KNOWN-GOOD — the same supplier at the break it priced', () => {
    expect(codeOf([tLine('qy', 2, 100, 10_000)], tieredItems(), TIERED_QUOTES)).toBeNull();
  });
});

describe('AWARD_QTY_NOT_DERIVED', () => {
  it('KNOWN-BAD — a share line whose typed quantity is not the share of the break', () => {
    expect(codeOf([byPct('M-BOTTLE', 'qa', 70, 71_000), byPct('M-BOTTLE', 'qb', 30, 30_000)])).toBe(
      'AWARD_QTY_NOT_DERIVED',
    );
  });
  it('KNOWN-BAD — a quantity line whose share is not its quantity over the break', () => {
    const r = awardShapeRefusal(
      legacyItems(),
      [byQty('M-BOTTLE', 'qa', 70_000, 60), byQty('M-BOTTLE', 'qb', 30_000, 30)],
      LEGACY_QUOTES,
    )!;
    expect(awardRefusalText(r)).toMatch(/AWARD_QTY_NOT_DERIVED: the share for item 1 \(Bottle\)/);
  });
  it('KNOWN-GOOD — both sides derived: 70/30 by share, and 70,000/30,000 by quantity', () => {
    expect(codeOf([byPct('M-BOTTLE', 'qa', 70, 70_000), byPct('M-BOTTLE', 'qb', 30, 30_000)])).toBeNull();
    expect(codeOf([byQty('M-BOTTLE', 'qa', 70_000, 70), byQty('M-BOTTLE', 'qb', 30_000, 30)])).toBeNull();
  });
});

describe('AWARD_ITEM_ALREADY_AWARDED', () => {
  const earlier: AwardRecord = {
    id: 'aw-9001',
    eventType: 'rfq',
    eventId: 'rfq-t',
    awardedAt: '2026-09-01T00:00:00.000Z',
    lines: [byPct('M-BOTTLE', 'qa', 100, 100_000)],
    notAwardedSupplierIds: [],
  };
  it('KNOWN-BAD — item 1 was awarded by an earlier award, named with that award', () => {
    const r = awardShapeRefusal(awardItemsOf(LEGACY, [earlier]), [byPct('M-BOTTLE', 'qb', 100, 100_000)], LEGACY_QUOTES)!;
    expect(awardRefusalText(r)).toBe('AWARD_ITEM_ALREADY_AWARDED: item 1 (Bottle) was already awarded (aw-9001)');
  });
  it('KNOWN-GOOD — the item still open can be awarded', () => {
    expect(codeOf([byPct('M-CAP', 'qb', 100, 50_000)], awardItemsOf(LEGACY, [earlier]))).toBeNull();
  });
});

describe('an item with no line is "not awarded now" — the rule leaves the verb to decide', () => {
  it('the shape passes, and the item is reported open unless marked "Will not award"', () => {
    const lines = [byPct('M-BOTTLE', 'qa', 100, 100_000)];
    expect(codeOf(lines)).toBeNull();
    expect(itemsOpenAfter(legacyItems(), lines).map((i) => i.key)).toEqual(['M-CAP']);
    expect(itemsOpenAfter(legacyItems(), lines, ['M-CAP'])).toEqual([]);
    expect(itemsOpenAfter(legacyItems(), legacyWhole())).toEqual([]);
  });
});
