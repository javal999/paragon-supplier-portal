// ────────────────────────────────────────────────────────────────────────────
// RFQ evaluation and award, per item, across several suppliers (RFx working
// spec 2026-09-21, "Evaluation and award"; closes BL-37).
//
// The pure rules (`rfqComparison`) are probed on the real Oslo fixture, and the
// award verb is dispatched through the REAL MockCommandService. Every refusal
// is a KNOWN-BAD refused BY NAME beside a KNOWN-GOOD twin that differs in the
// one field the rule is about, so "the rule fired" cannot be confused with
// "the verb refuses everything".
// ────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { everyVendorQualified } from '@test/everyVendorQualified';
import { MockCommandService } from './MockCommandService';
import { awardStore, resetRfxStores } from './stores/rfxStores';
import { rfqStore } from './stores/rfqStore';
import { quotationStore } from './stores/quotationStore';
import { bestScoredByItem, bestScoredQuotationId, rfqScoring, rfxNow, scorableQuote } from './rfxReadModel';
import { RFQ_SAMPLE_AWARD_SEED } from './fixtures/rfqSamples';
import { sdcClock } from '../../sdc';
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { NO_PERSON } from '@context/noPerson';
import type { QueryScope } from '../types';
import type { AwardLine } from '../../sourcing/types';
import { scoreQuotations } from '@lib/quoteScore';
import {
  awardQuantity,
  bestPriceByBreak,
  buildTieredAwardLines,
  defaultEvaluationTierQty,
  evaluationBreaks,
  itemCostAt,
  quoteTotalAt,
  scoreRfqAt,
  topRankedOf,
} from '../../sourcing/rfqComparison';
import { awardItemsOf, awardShapeRefusal } from '../../sourcing/awardShape';

const svc = new MockCommandService();
const buyer: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer,
  actor: NO_PERSON,
};

beforeEach(() => {
  resetRfxStores();
  rfqStore.reset();
  quotationStore.reset();
  sdcClock.reset();
  // Material G2 — this spec is about the award's shape and the best-score
  // reason, not qualification: every vendor qualifies here.
  everyVendorQualified();
});

const oslo = () => rfqStore.get('rfq-021')!;
const q = (id: string) => quotationStore.get(id)!;
const item = (lineNo: number) => oslo().items!.find((i) => i.lineNo === lineNo)!;

// ─────────────────────────────────────────────────────────────────────────────
// POPULATION CONTROL
// ─────────────────────────────────────────────────────────────────────────────

describe('the fixtures the rules are probed against', () => {
  it('Oslo is tiered, with two current quotes from suppliers that pass the gate', () => {
    expect(oslo().items?.map((i) => i.description)).toEqual([
      'Oslo front sticker',
      'Oslo back sticker (ingredients)',
    ]);
    expect(quotationStore.forRfq('rfq-021').map((x) => x.supplierId).sort()).toEqual(['sup-013', 'sup-015']);
    // known-bad: a legacy RFQ has no items
    expect(rfqStore.get('rfq-014')!.items).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// The per-break comparison
// ─────────────────────────────────────────────────────────────────────────────

describe('the evaluation break', () => {
  it('defaults to the break nearest totalQty: Oslo 3K per variant, Iron 10K total', () => {
    expect(evaluationBreaks(oslo())).toEqual([3_000, 5_000, 7_000, 10_000, 25_000, 50_000]);
    expect(defaultEvaluationTierQty(oslo())).toBe(3_000);
    expect(defaultEvaluationTierQty(rfqStore.get('rfq-022')!)).toBe(10_000);
    // the default moves with totalQty: 400,000 pieces is 25K × 8 × 2
    expect(defaultEvaluationTierQty({ ...oslo(), totalQty: 400_000 })).toBe(25_000);
  });
});

describe('total cost at the evaluation break', () => {
  it('per variant: unit price × break × variants, plus the one-time costs', () => {
    // sup-015, item 1, 3K per variant × 8 variants: 420 × 24,000 + 1.5M + 2.4M
    expect(itemCostAt(oslo(), item(1), q('qt-021a'), 3_000)).toEqual({
      tierQty: 3_000,
      unitPrice: 420,
      pieces: 24_000,
      oneTime: 3_900_000,
      total: 13_980_000,
    });
    // the whole quote is the sum over items
    expect(quoteTotalAt(oslo(), q('qt-021a'), 3_000)).toBe(13_980_000 + (380 * 24_000 + 2_900_000));
  });

  it('total basis: the break IS the pieces, never multiplied by the variants', () => {
    const totalBasis = { ...oslo(), tiers: oslo().tiers!.map((t) => ({ ...t, basis: 'total' as const })) };
    const cost = itemCostAt(totalBasis, item(1), q('qt-021a'), 3_000)!;
    expect(cost.pieces).toBe(3_000);
    expect(cost.total).toBe(420 * 3_000 + 3_900_000);
  });

  it('a quote with no price at the break has no total — never a number nobody quoted', () => {
    const partial = { itemQuotes: q('qt-021a').itemQuotes!.slice(0, 1) };
    expect(itemCostAt(oslo(), item(2), partial, 3_000)).toBeNull();
    expect(quoteTotalAt(oslo(), partial, 3_000)).toBeNull();
  });
});

describe('the best price per break', () => {
  it('marks sup-013 at the low breaks and sup-015 at volume, on the same item', () => {
    const best = bestPriceByBreak(oslo(), item(1), [q('qt-021a'), q('qt-021b')]);
    expect(best.get(3_000)).toEqual(['qt-021b']); // 395 < 420
    expect(best.get(10_000)).toEqual(['qt-021b']); // 298 < 300
    expect(best.get(25_000)).toEqual(['qt-021a']); // 238 < 262
    expect(best.get(50_000)).toEqual(['qt-021a']);
  });

  it('marks nothing across currencies rather than comparing bare numerals', () => {
    const usd = { ...q('qt-021a'), currency: 'USD' as const };
    expect(bestPriceByBreak(oslo(), item(1), [usd, q('qt-021b')]).size).toBe(0);
  });
});

describe('changing the evaluation break changes the ranking', () => {
  it('the event: sup-013 is best-scored at 3K, sup-015 at 50K', () => {
    expect(bestScoredQuotationId(oslo(), rfxNow(), 3_000)).toBe('qt-021b');
    expect(bestScoredQuotationId(oslo(), rfxNow(), 50_000)).toBe('qt-021a');
  });

  it('per item: at 3K item 1 is a TIE and item 2 goes to sup-013; at 50K both to sup-015', () => {
    // ⚠️ Item 1 at 3K scores 72 for both suppliers, exactly (B5). It used to be
    // "won" by sup-015 only because its quote is listed first — the engine's
    // stable pick on a tie, which is list order, not a ranking. A tie now has no
    // single best to follow (`topRankedOf`), so the award rule asks no reason
    // for either supplier on that item.
    expect([...bestScoredByItem(oslo(), rfxNow(), 3_000)]).toEqual([
      [1, null],
      [2, 'qt-021b'],
    ]);
    expect([...bestScoredByItem(oslo(), rfxNow(), 50_000)]).toEqual([
      [1, 'qt-021a'],
      [2, 'qt-021a'],
    ]);
  });

  it('price is scored as total cost: the price score IS ratio-to-best of the totals', () => {
    const scored = scoreRfqAt(oslo(), [q('qt-021a'), q('qt-021b')], 50_000, () => 50);
    expect(scored.kind).toBe('scored');
    const a = quoteTotalAt(oslo(), q('qt-021a'), 50_000)!;
    const b = quoteTotalAt(oslo(), q('qt-021b'), 50_000)!;
    const priceOf = (id: string) => (scored.kind === 'scored' ? scored.scores.find((s) => s.quoteId === id)!.priceScore : -1);
    expect(priceOf('qt-021a')).toBe(100);
    expect(priceOf('qt-021b')).toBe(Math.round((a / b) * 100));
    expect(topRankedOf(scored)).toBe('qt-021a');
  });
});

describe('legacy single-price RFQs compare exactly as today', () => {
  it('rfq-014 scores its header unit prices, and the evaluation break is ignored', () => {
    const rfq = rfqStore.get('rfq-014')!;
    const direct = rfqScoring(rfq, rfxNow());
    expect(rfqScoring(rfq, rfxNow(), 50_000)).toEqual(direct);
    expect(bestScoredByItem(rfq, rfxNow(), 3_000).size).toBe(0);
    // the same outcome the engine gives the header figures directly
    expect(direct.kind).toBe('scored');
    const ids = direct.kind === 'scored' ? direct.scores.map((s) => s.quoteId) : [];
    const header = scoreQuotations(
      ids.map((id) => scorableQuote(q(id))),
      { pins: rfq.fxPins, now: new Date(rfxNow()) },
    );
    expect(header).toEqual(direct);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// The award verb
// ─────────────────────────────────────────────────────────────────────────────

const lineFor = (supplierId: string, quotationId: string, lineNo: number, sharePct: number, tierQty = 3_000): AwardLine => ({
  supplierId,
  quotationId,
  itemCode: '',
  itemLineNo: lineNo,
  sharePct,
  quantity: awardQuantity(oslo(), item(lineNo), tierQty, sharePct),
  awardTierQty: tierQty,
});

/** A split that follows the best score on both items at 3K. */
const goodSplit = (): AwardLine[] => [
  lineFor('sup-015', 'qt-021a', 1, 70),
  lineFor('sup-013', 'qt-021b', 1, 30),
  lineFor('sup-013', 'qt-021b', 2, 100),
];

const award = (lines: readonly AwardLine[], reason?: string) =>
  svc.dispatch(buyer, {
    transitionId: 't_rfq_award',
    entity: 'rfq',
    entityId: 'rfq-021',
    payload: {
      awardedQuotationId: lines[0]?.quotationId ?? 'qt-021a',
      awardedSupplierId: lines[0]?.supplierId ?? 'sup-015',
      awardLines: lines.map((l) => ({ ...l })),
      ...(reason ? { awardReason: reason } : {}),
    },
  });

const nothingAwarded = () => {
  expect(oslo().status).toBe('Open');
  expect(awardStore.all().some((a) => a.eventId === 'rfq-021')).toBe(false);
};

describe('a multi-supplier award per item, recorded with its break', () => {
  it('KNOWN-GOOD — 70/30 on item 1 and 100% on item 2 is recorded, line by line', async () => {
    const res = await award(goodSplit());
    expect(res.status, res.reason).toBe('done');
    const rec = awardStore.all().find((a) => a.eventId === 'rfq-021')!;
    expect(rec.lines.map((l) => [l.itemLineNo, l.supplierId, l.sharePct, l.quantity, l.awardTierQty])).toEqual([
      [1, 'sup-015', 70, 16_800, 3_000],
      [1, 'sup-013', 30, 7_200, 3_000],
      [2, 'sup-013', 100, 24_000, 3_000],
    ]);
    // a tiered line names its item by LINE; `itemCode` stays a material-code field
    expect(rec.lines.every((l) => l.itemCode === '')).toBe(true);
    // Item 1 ties at 3K, so only item 2 has a best to record (B5).
    expect(rec.bestScoredByItem).toEqual([{ itemLineNo: 2, quotationId: 'qt-021b' }]);
    // suppliers with no share on any item are the not-awarded list
    expect([...rec.notAwardedSupplierIds].sort()).toEqual(['sup-007', 'sup-008']);
    // BL-37 — BOTH winners' quotes are Awarded; before, the second was Rejected.
    expect(q('qt-021a').status).toBe('Awarded');
    expect(q('qt-021b').status).toBe('Awarded');
  });

  it('the page and the verb build the same lines from the same shares', () => {
    const built = buildTieredAwardLines(
      oslo(),
      3_000,
      { '1': { 'qt-021a': '70', 'qt-021b': '30' }, '2': { 'qt-021b': 100, 'qt-021a': '' } },
      [q('qt-021a'), q('qt-021b')],
    );
    expect(built).toEqual(goodSplit());
    expect(awardShapeRefusal(awardItemsOf(oslo()), built, [q('qt-021a'), q('qt-021b')])).toBeNull();
  });
});

describe('an item not at 100% is refused, naming the item', () => {
  it('KNOWN-BAD — item 2 at 90%', async () => {
    const lines = [...goodSplit().slice(0, 2), lineFor('sup-013', 'qt-021b', 2, 90)];
    const res = await award(lines);
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/AWARD_SPLIT_INCOMPLETE: item 2 \(Oslo back sticker \(ingredients\)\) totals 90%/);
    nothingAwarded();
  });

  it('KNOWN-BAD — an item left out entirely totals 0% and is named', async () => {
    const res = await award(goodSplit().slice(0, 2));
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/AWARD_ITEMS_OPEN: item 2 \(Oslo back sticker \(ingredients\)\)/);
    nothingAwarded();
  });

  it('KNOWN-GOOD sibling — the SAME lines sent as a PARTIAL award go through, to Partly awarded', async () => {
    const lines = goodSplit().slice(0, 2);
    const res = await svc.dispatch(buyer, {
      transitionId: 't_rfq_award_partial',
      entity: 'rfq',
      entityId: 'rfq-021',
      payload: {
        awardedQuotationId: lines[0]!.quotationId,
        awardedSupplierId: lines[0]!.supplierId,
        awardLines: lines.map((l) => ({ ...l })),
      },
    });
    expect(res.status, res.reason).toBe('done');
    expect(oslo().status).toBe('Partly awarded');
  });

  it('KNOWN-GOOD twin — the same item at 100% goes through', async () => {
    expect((await award(goodSplit())).status).toBe('done');
  });
});

describe('a supplier that fails the compliance gate cannot take a share', () => {
  const addFailingQuote = () =>
    quotationStore.add({ ...q('qt-021a'), id: 'qt-021x', supplierId: 'sup-008', status: 'Submitted' });

  it('KNOWN-BAD — a share for sup-008, which fails the gate, is refused by name', async () => {
    addFailingQuote();
    const lines = [lineFor('sup-008', 'qt-021x', 1, 30), goodSplit()[0]!, goodSplit()[2]!].map((l, i) =>
      i === 1 ? { ...l, sharePct: 70 } : l,
    );
    const res = await award(lines, 'Third source.');
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/COMPLIANCE_GATE_FAILED: sup-008/);
    nothingAwarded();
  });

  it('KNOWN-GOOD twin — the same 30% to sup-013, which passes, goes through', async () => {
    addFailingQuote();
    expect((await award(goodSplit(), 'Third source.')).status).toBe('done');
  });
});

describe('a departure from an item’s best score needs a reason, naming the item', () => {
  /** Item 2 all to sup-015, whose quote is NOT item 2's best at 3K. */
  const departing = () => [lineFor('sup-015', 'qt-021a', 1, 100), lineFor('sup-015', 'qt-021a', 2, 100)];

  it('KNOWN-BAD — no reason', async () => {
    const res = await award(departing());
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/AWARD_REASON_REQUIRED: the award for item 2 \(Oslo back sticker/);
    nothingAwarded();
  });

  it('A TIE HAS NO BEST TO DEPART FROM — item 1 at 3K to either supplier needs no reason (B5)', async () => {
    const toSup013 = [lineFor('sup-013', 'qt-021b', 1, 100), lineFor('sup-013', 'qt-021b', 2, 100)];
    const res = await award(toSup013);
    expect(res.status, res.reason).toBe('done');
  });

  it('KNOWN-GOOD twin — the same award with a reason is recorded, and the departure shows', async () => {
    const res = await award(departing(), 'One printer for both stickers keeps the colours matched.');
    expect(res.status, res.reason).toBe('done');
    const rec = awardStore.all().find((a) => a.eventId === 'rfq-021')!;
    expect(rec.reason).toMatch(/colours matched/);
    const view = (await import('./rfxReadModel')).awardViews(null).find((a) => a.eventId === 'rfq-021')!;
    expect(view.departedFromBestScore).toBe(true);
  });

  it('POSITIVE TWIN — a split that gives each item’s best a share needs no reason', async () => {
    const res = await award(goodSplit());
    expect(res.status, res.reason).toBe('done');
    const view = (await import('./rfxReadModel')).awardViews(null).find((a) => a.eventId === 'rfq-021')!;
    expect(view.departedFromBestScore).toBe(false);
  });

  it('the rule is judged AT THE BREAK: the same lines at 50K depart on item 2 instead', async () => {
    const at50 = goodSplit().map((l) => ({
      ...l,
      awardTierQty: 50_000,
      quantity: awardQuantity(oslo(), item(l.itemLineNo!), 50_000, l.sharePct),
    }));
    const res = await award(at50);
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/AWARD_REASON_REQUIRED: the award for item 2/);
  });
});

describe('an unknown item, a whole-event line, or a missing break is refused by name', () => {
  it('KNOWN-BAD — a line naming item 9', async () => {
    const res = await award([...goodSplit(), { ...lineFor('sup-013', 'qt-021b', 2, 10), itemLineNo: 9 }]);
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/AWARD_ITEM_UNKNOWN: item 9 is not an item on this RFQ/);
    nothingAwarded();
  });

  it('KNOWN-BAD — a whole-event line (the side panel’s old single award) on a tiered RFQ', async () => {
    const res = await svc.dispatch(buyer, {
      transitionId: 't_rfq_award',
      entity: 'rfq',
      entityId: 'rfq-021',
      payload: { awardedQuotationId: 'qt-021b', awardedSupplierId: 'sup-013' },
    });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/AWARD_ITEM_UNKNOWN: an award line names no item/);
    nothingAwarded();
  });

  it('KNOWN-BAD — lines with no break recorded, or two different breaks', async () => {
    const noBreak = goodSplit().map(({ awardTierQty: _drop, ...l }) => l);
    expect((await award(noBreak)).reason).toMatch(/AWARD_TIER_UNKNOWN/);
    const mixed = goodSplit().map((l, i) => (i === 0 ? { ...l, awardTierQty: 5_000 } : l));
    expect((await award(mixed)).reason).toMatch(/AWARD_TIER_UNKNOWN/);
    nothingAwarded();
  });

  it('KNOWN-BAD — a typed quantity that is not the share of the break', async () => {
    const lines = goodSplit().map((l, i) => (i === 0 ? { ...l, quantity: 20_000 } : l));
    const res = await award(lines);
    expect(res.reason).toMatch(/AWARD_QTY_NOT_DERIVED: the quantity for item 1/);
    nothingAwarded();
  });

  it('KNOWN-GOOD twin — the same award with known items, one break and derived quantities', async () => {
    expect((await award(goodSplit())).status).toBe('done');
  });
});

describe('the seeded Amplify split (rfq-024) tells the truth about itself', () => {
  it('its stored best scores are what CR-15 gives per item at its break, and its quantities are derived', () => {
    const rfq = rfqStore.get('rfq-024')!;
    const seeded = RFQ_SAMPLE_AWARD_SEED[0]!;
    const live = [...bestScoredByItem(rfq, rfxNow(), 10_000)].map(([itemLineNo, quotationId]) => ({
      itemLineNo,
      quotationId,
    }));
    expect(seeded.bestScoredByItem).toEqual(live);
    expect(seeded.bestScoredQuotationId).toBe(bestScoredQuotationId(rfq, rfxNow(), 10_000));
    expect(
      awardShapeRefusal(awardItemsOf(rfq), seeded.lines, quotationStore.forRfq('rfq-024')),
    ).toBeNull();
    // two suppliers on EACH item — a split per item, not one winner per item
    for (const lineNo of [1, 2]) {
      expect(new Set(seeded.lines.filter((l) => l.itemLineNo === lineNo).map((l) => l.supplierId)).size).toBe(2);
    }
  });
});
