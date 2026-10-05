import { describe, it, expect } from 'vitest';
/** @import { ScorableQuote, CriteriaWeights } from './quoteScore' */
import { scoreQuotations, CRITERIA_WEIGHTS, AXIS_LIVENESS, COMPOSITE_LIVENESS } from './quoteScore';
import { mockQuotations } from '@data/mockQuotations';
import { BASE_CURRENCY } from './currencyPolicy';
/** @import { FxPin } from './fxPin' */

// 2e-c-3 — the engine returns a DISCRIMINATED OUTCOME (scored | refused). Every
// spec in this file concerns a set the engine CAN rank, so they unwrap through
// this helper, which ASSERTS the discriminant rather than hiding it: a spec that
// starts refusing fails here, by name, instead of reading `undefined` off an
// array that is no longer an array.
/**
 * @param {readonly ScorableQuote[]} quotes
 * @param {Parameters<typeof scoreQuotations>[1]} [opts]
 */
const rank = (quotes, opts) => {
  const out = scoreQuotations(quotes, opts);
  if (out.kind !== 'scored') {
    throw new Error(
      `expected a scored outcome, got refused: ${out.reason} (${out.currencies.join(', ')})`
    );
  }
  return out.scores;
};

// Every quote in this file is domestic unless a spec says otherwise, so the
// currency is neutral here by construction — a single-currency set needs no pin
// and scores exactly as it did before the FX axis existed.

// A minimal two-quote set with hand-verifiable arithmetic. A is cheaper AND
// faster AND higher on the external axes, so it is unambiguously top-ranked.
/** @type {ScorableQuote} */
const A = {
  id: 'A',
  unitPrice: 100,
  currency: 'IDR',
  leadTimeDays: 10,
  reliabilityScore: 80
};
/** @type {ScorableQuote} */
const B = {
  id: 'B',
  unitPrice: 200,
  currency: 'IDR',
  leadTimeDays: 20,
  reliabilityScore: 60
};

describe('scoreQuotations — LIVE axes derive from the quote set', () => {
  it('priceScore: the cheapest quote anchors 100, others scale by ratio-to-best', () => {
    const [a, b] = rank([A, B]);
    expect(a.priceScore).toBe(100); // 100 is the min → 100
    expect(b.priceScore).toBe(50); // 100/200 → 50
  });

  it('leadTimeScore: the fastest quote anchors 100, others scale by ratio-to-best', () => {
    const [a, b] = rank([A, B]);
    // ── CP-0 · W1 · 2e-b-1 — the lead-time axis is no longer ratio-to-best ──
    // This spec asserted 10 → 100 / 20 → 50, i.e. that a lead time is scored
    // RELATIVE to the fastest bid in the set. Under the 2e-b-1 ruling the axis
    // is ABSOLUTE and linear — `max(0, 100 - days×2)` — because a 0-day lead
    // time must be the best score, and ratio-to-best cannot express that (a
    // `best` of 0 zeroes every rival). 10 → 80, 20 → 60: A still beats B, but
    // it beats it by the size of the real difference rather than by a ratio.
    expect(a.leadTimeScore).toBe(80); // 100 - 10×2
    expect(b.leadTimeScore).toBe(60); // 100 - 20×2
  });

  it('the lead-time axis is ABSOLUTE — a quote scores the same with or without rivals', () => {
    // The property ratio-to-best did not have, and the reason the axis changed:
    // a delivery promise is a fact about the supplier, not about the field.
    const [alone] = rank([A]);
    const [withRival] = rank([A, { ...B, leadTimeDays: 1 }]);
    expect(alone.leadTimeScore).toBe(80);
    expect(withRival.leadTimeScore).toBe(80);
  });

  it('a same-day (0-day) lead time is the BEST score, and does not zero its rivals', () => {
    // The ruling, and the thing ratio-to-best could not do: under it, a `best`
    // of 0 made `best/value` 0 for everyone, so one same-day quote collapsed the
    // whole set. Here 0 → 100 and B keeps the score its own promise earns.
    const [sameDay, b] = rank([{ ...A, leadTimeDays: 0 }, B]);
    expect(sameDay.leadTimeScore).toBe(100);
    expect(b.leadTimeScore).toBe(60);
  });

  it('a lead time past the 50-day floor bottoms out at 0 rather than going negative', () => {
    const [slow] = rank([{ ...A, leadTimeDays: 90 }]);
    expect(slow.leadTimeScore).toBe(0);
  });

  // ── 2e-b-1a — a DELIBERATE POLICY REVERSAL, not a bug correction ───────────
  // 2e-b-1 had a whole describe block here — "an UNSTATED lead time is absent,
  // not zero" — asserting that an omitted lead time scored `null` and had its
  // axis dropped from the composite (weights renormalised). It was correct
  // arithmetic for the policy of the time. JJ's commercial ruling removed the
  // policy: a lead time is REQUIRED at quote stage, because a price with no
  // delivery promise is an incomplete bid, so there is no unstated case left
  // for the engine to be honest about. The block is retired rather than fixed;
  // the guarantee it protected now lives at the input gate, where a blank is
  // refused before it can become a quotation at all
  // (`quotationLeadTime.test.ts` → "BLANK → refused").
  it('a nonsense lead time scores the WORST value, never the best', () => {
    // Nothing in the UI can produce one (the parser rejects the sign), but the
    // engine is public and the axis is absolute — an unguarded negative would
    // sail past `100 - days×2` into a score above 100.
    const [neg] = rank([{ ...A, leadTimeDays: -5 }]);
    expect(neg.leadTimeScore).toBe(0);
    expect(neg.leadTimeScore).not.toBe(100);
  });

  it('POSITIVE TWIN — a stated lead time scores normally', () => {
    const [stated] = rank([A]);
    expect(stated.leadTimeScore).toBe(80);
  });

  // Retitled from "a single quote is trivially best in its own set
  // (price/leadTime = 100)". Only PRICE is trivially best alone now — the
  // lead-time axis is absolute, so a lone 10-day quote scores the 80 its own
  // promise earns rather than a 100 it earned only by having no rival.
  it('a single quote anchors PRICE at 100; its lead time is scored on its own merits', () => {
    const [only] = rank([A]);
    expect(only.priceScore).toBe(100);
    expect(only.leadTimeScore).toBe(80);
  });

  // Retitled from "guards a non-positive price/lead value to 0". The guard
  // still holds for PRICE — a zero price is not an offer and cannot anchor a
  // ratio. It is deliberately REVERSED for the lead time: 2e-b-1 rules that 0
  // days is same-day supply and therefore the best possible score, which is why
  // it is ack-gated at the input rather than guarded here.
  it('guards a non-positive PRICE to 0; a 0-day lead time is the best score, not a guarded one', () => {
    const [z] = rank([{ ...A, id: 'Z', unitPrice: 0, leadTimeDays: 0 }, B]);
    expect(z.priceScore).toBe(0);
    expect(z.leadTimeScore).toBe(100);
    expect(Number.isFinite(z.composite)).toBe(true);
  });
});

describe('scoreQuotations — external axes are declared SIMULATED, passed through untouched', () => {
  it('reliability is the input value verbatim (never recomputed)', () => {
    const [a] = rank([A, B]);
    expect(a.reliabilityScore).toBe(80);
  });

  // ⚠️ PREMISE CHANGE (BL-43, CR-15 2026-09-21): compliance is no longer an axis
  // — it is the CR-23 gate, applied by the caller before scoring.
  it('AXIS_LIVENESS marks price/leadTime LIVE and reliability SIMULATED; there is no compliance axis', () => {
    expect(AXIS_LIVENESS.price).toBe('live');
    expect(AXIS_LIVENESS.leadTime).toBe('live');
    expect(AXIS_LIVENESS.reliability).toBe('simulated');
    expect(Object.keys(AXIS_LIVENESS).sort()).toEqual(['leadTime', 'price', 'reliability']);
  });
});

describe('scoreQuotations — composite is a weighted roll-up with weakest-link liveness', () => {
  it('composite = Σ(axis × weight), rounded', () => {
    const [a, b] = rank([A, B]);
    // The lead-time terms moved with the axis (2e-b-1): A's 10 days scores 80
    // rather than a ratio-derived 100, and B's 20 days scores 60 rather than 50.
    // ⚠️ PREMISE CHANGE (BL-43): weights are now price 40 / lead time 20 /
    // reliability 40 (CR-15, 2026-09-21); the old 30/20/25/25 gave 89 and 60.
    // A: 100*.4 + 80*.2 + 80*.4 = 40+16+32 = 88
    expect(a.composite).toBe(88);
    // B: 50*.4 + 60*.2 + 60*.4 = 20+12+24 = 56
    expect(b.composite).toBe(56);
  });

  it('composite liveness is SIMULATED while any weighted axis is SIMULATED', () => {
    expect(COMPOSITE_LIVENESS).toBe('simulated');
    const [a] = rank([A, B]);
    expect(a.compositeLiveness).toBe('simulated');
  });

  it('composite flips LIVE only when the SIMULATED axes carry no weight (two-gate on a derived score)', () => {
    /** @type {CriteriaWeights} */
    const liveOnly = {
      price: 0.6,
      leadTime: 0.4,
      reliability: 0
    };
    const [a] = rank([A, B], { weights: liveOnly });
    expect(a.compositeLiveness).toBe('live');
  });

  it('honours a weights override for the composite value', () => {
    /** @type {CriteriaWeights} */
    const priceOnly = {
      price: 1,
      leadTime: 0,
      reliability: 0
    };
    const [a, b] = rank([A, B], { weights: priceOnly });
    expect(a.composite).toBe(100);
    expect(b.composite).toBe(50);
  });
});

describe('scoreQuotations — topRanked = argmax(composite), carrying composite liveness', () => {
  it('marks exactly one quote top-ranked: the highest composite', () => {
    const scored = rank([A, B]);
    expect(scored.filter((s) => s.topRanked)).toHaveLength(1);
    expect(scored.find((s) => s.topRanked)?.quoteId).toBe('A');
  });

  it('breaks a composite tie deterministically (first in input order wins)', () => {
    /** @type {ScorableQuote} */
    const twin = { ...A, id: 'A2' };
    const scored = rank([A, twin]);
    expect(scored.filter((s) => s.topRanked)).toHaveLength(1);
    expect(scored.find((s) => s.topRanked)?.quoteId).toBe('A');
  });
});

describe('scoreQuotations — pure & deterministic', () => {
  it('returns [] for an empty set without throwing', () => {
    expect(rank([])).toEqual([]);
  });

  it('preserves input order and produces identical output across calls', () => {
    const first = rank([A, B]);
    const second = rank([A, B]);
    expect(first.map((s) => s.quoteId)).toEqual(['A', 'B']);
    expect(first).toEqual(second);
  });

  it('does not mutate its inputs', () => {
    /** @type {ScorableQuote[]} */
    const input = [{ ...A }, { ...B }];
    const snapshot = JSON.parse(JSON.stringify(input));
    rank(input);
    expect(input).toEqual(snapshot);
  });
});

describe('scoreQuotations — computes from data, not the stored fixture literal', () => {
  it('recomputes priceScore for rfq-001 (differs from the hand-authored literal)', () => {
    // The "absent means rupiah" convention is resolved at the BOUNDARY, exactly
    // as `BuyerSourcing` does it — the engine requires an explicit currency and
    // deliberately will not make this assumption itself.
    const rfq001 = mockQuotations
      .filter((q) => q.rfqId === 'rfq-001')
      .map((q) => ({ ...q, currency: q.currency ?? BASE_CURRENCY }));
    const scored = rank(rfq001);
    const cheapest = scored.find((s) => s.quoteId === 'qt-001c'); // unitPrice 188_000 = min
    // Fixture literal for qt-001c.priceScore is 93; the engine derives 100 (it is
    // the cheapest in the set). The drawer showing 100 proves it computes.
    expect(cheapest?.priceScore).toBe(100);
    expect(cheapest?.priceScore).not.toBe(93);
  });

  it('the weights are a fixed governed constant summing to 1 (C6-LOCK)', () => {
    const total = CRITERIA_WEIGHTS.price + CRITERIA_WEIGHTS.leadTime + CRITERIA_WEIGHTS.reliability;
    expect(total).toBeCloseTo(1, 10);
  });

  it('CR-15 (2026-09-21) — price 40%, lead time 20%, reliability 40%, and no compliance weight', () => {
    expect(CRITERIA_WEIGHTS).toEqual({ price: 0.4, leadTime: 0.2, reliability: 0.4 });
  });
});

// ── CP-0 · 2e-c-3 — the engine stops comparing bare numerals ─────────────────
//
// 2e-c-2-FIND-01, closed. `ScorableQuote` had no currency field at all, so
// `Math.min` over `unitPrice` ranked NUMBERS: an EUR 3.00 bid beside IDR 15,000
// bids became the set minimum and collapsed every honest rupiah quote toward a
// price score of zero — the same shape as the misparse hijack in
// quotationPriceRanking.test.ts, reached by a different route.
//
// The engine now either scores against an explicit recorded basis, or REFUSES.
describe('scoreQuotations — a mixed-currency set is refused, never approximated', () => {
  /** @type {ScorableQuote} */
  const IDR_A = { ...A, id: 'IDR-A', unitPrice: 15_000, currency: 'IDR' };
  /** @type {ScorableQuote} */
  const IDR_B = { ...B, id: 'IDR-B', unitPrice: 16_000, currency: 'IDR' };
  /** @type {ScorableQuote} */
  const EUR_C = { ...A, id: 'EUR-C', unitPrice: 3, currency: 'EUR' };

  /**
   * @param {Partial<FxPin>} [over]
   * @returns {FxPin}
   */
  const eurPin = (over = {}) => ({
    quote: 'EUR',
    base: 'IDR',
    rate: 18_000,
    asOf: '2026-07-31',
    pinnedAt: '2026-07-31T00:00:00.000Z',
    source: 'MANUAL',
    liveness: 'SIMULATED',
    ...over
  });
  const NOW = new Date('2026-07-31T12:00:00.000Z');

  it('THE LOCK — no pin, no ranking: the set is REFUSED by name', () => {
    const out = scoreQuotations([IDR_A, IDR_B, EUR_C], { now: NOW });
    expect(out.kind).toBe('refused');
    if (out.kind !== 'refused') throw new Error('unreachable');
    expect(out.reason).toBe('FX_UNPINNED');
    // NAMES the currency that needs a pin — a buyer must know what to record.
    expect(out.currencies).toEqual(['EUR']);
  });

  it('THE REGRESSION — the EUR bid does not hijack the price axis', () => {
    // What the retired engine did: 3 becomes minPrice, and every rupiah quote
    // scores round(15000⁻¹×3×100) = 0. There is now NO scores array to read it
    // from, which is the point — a refused comparison cannot be half-rendered.
    const out = scoreQuotations([IDR_A, IDR_B, EUR_C], { now: NOW });
    expect(out).not.toHaveProperty('scores');
    expect('basis' in out).toBe(false);
  });

  it('names EVERY unpinned currency, not just the first one found', () => {
    /** @type {ScorableQuote} */
    const usd = { ...A, id: 'USD-D', unitPrice: 2, currency: 'USD' };
    const out = scoreQuotations([IDR_A, EUR_C, usd], { now: NOW });
    if (out.kind !== 'refused') throw new Error('expected a refusal');
    expect([...out.currencies].sort()).toEqual(['EUR', 'USD']);
  });

  it('WITH a pin the set scores, and the conversion decides the winner honestly', () => {
    // EUR 3.00 × 18,000 = Rp 54,000 — comfortably the most EXPENSIVE bid, which
    // is the truth the old engine inverted into "cheapest by a factor of 5,000".
    const out = scoreQuotations([IDR_A, IDR_B, EUR_C], { pins: [eurPin()], now: NOW });
    if (out.kind !== 'scored') throw new Error('expected a scored outcome');
    const byId = new Map(out.scores.map((s) => [s.quoteId, s]));
    expect(
      /** @type {NonNullable<ReturnType<typeof byId.get>>} */ (byId.get('IDR-A')).priceScore
    ).toBe(100); // Rp 15,000 — genuinely cheapest
    expect(
      /** @type {NonNullable<ReturnType<typeof byId.get>>} */ (byId.get('EUR-C')).priceScore
    ).toBe(28); // round(15000/54000×100)
    expect(
      /** @type {NonNullable<ReturnType<typeof byId.get>>} */ (byId.get('EUR-C')).priceScore
    ).toBeLessThan(
      /** @type {NonNullable<ReturnType<typeof byId.get>>} */ (byId.get('IDR-A')).priceScore
    );
  });

  it('states the BASIS it ranked on — a score whose meaning is inspectable', () => {
    const out = scoreQuotations([IDR_A, EUR_C], { pins: [eurPin()], now: NOW });
    if (out.kind !== 'scored') throw new Error('expected a scored outcome');
    expect(out.basis.currency).toBe('IDR');
    expect(out.basis.homogeneous).toBe(false);
    expect(out.basis.pins.map((p) => p.quote)).toEqual(['EUR']);
  });

  it('REFUSES a stale pin rather than ranking on an aged rate', () => {
    const out = scoreQuotations([IDR_A, EUR_C], {
      pins: [eurPin({ asOf: '2026-06-01' })], // ~2 months old
      now: NOW
    });
    if (out.kind !== 'refused') throw new Error('expected a refusal');
    expect(out.reason).toBe('FX_STALE');
    expect(out.currencies).toEqual(['EUR']);
  });

  it('reports an UNUSABLE rate as unpinned — one situation, one remedy', () => {
    // A zero/NaN rate and a missing rate are the same problem from the buyer's
    // side: there is no basis to rank on and the fix is to record one. Splitting
    // them would ask a buyer to care how the bad rate got there.
    for (const rate of [0, -1, NaN]) {
      const out = scoreQuotations([IDR_A, EUR_C], { pins: [eurPin({ rate })], now: NOW });
      if (out.kind !== 'refused') throw new Error(`expected a refusal for rate ${rate}`);
      expect(out.reason).toBe('FX_UNPINNED');
    }
  });

  it('uses the SUPERSEDING pin — the freeze is read through the ledger', () => {
    const out = scoreQuotations([IDR_A, EUR_C], {
      pins: [
        eurPin({ rate: 1_000, pinnedAt: '2026-07-01T00:00:00.000Z' }), // superseded
        eurPin({ rate: 18_000, pinnedAt: '2026-07-31T00:00:00.000Z' }) // in force
      ],
      now: NOW
    });
    if (out.kind !== 'scored') throw new Error('expected a scored outcome');
    expect(out.basis.pins[0].rate).toBe(18_000);
    // Under the superseded rate EUR 3 = Rp 3,000, which WOULD have been the
    // cheapest. The ledger head decides, not the first entry.
    const eur = /** @type {NonNullable<ReturnType<typeof out.scores.find>>} */ (
      out.scores.find((s) => s.quoteId === 'EUR-C')
    );
    expect(eur.priceScore).toBeLessThan(100);
  });
});

describe('scoreQuotations — the HOMOGENEOUS-SET EXEMPTION', () => {
  // Ratio-to-best is scale-invariant: multiplying every price by the same rate
  // leaves every ratio identical. A single-currency set is therefore rankable
  // with no pin at all, and demanding one would refuse a comparison the engine
  // is provably able to make.
  it('an all-USD set scores with NO pin — and identically to the same set in IDR', () => {
    /** @type {ScorableQuote} */
    const usdA = { ...A, currency: 'USD', unitPrice: 100 };
    /** @type {ScorableQuote} */
    const usdB = { ...B, currency: 'USD', unitPrice: 200 };
    const usd = scoreQuotations([usdA, usdB]);
    const idr = scoreQuotations([A, B]);
    if (usd.kind !== 'scored' || idr.kind !== 'scored') throw new Error('expected scored outcomes');
    expect(usd.scores).toEqual(idr.scores);
    expect(usd.basis.homogeneous).toBe(true);
  });

  it('states the basis in the set OWN currency — not a rupiah it never used', () => {
    const out = scoreQuotations([
      { ...A, currency: 'USD' },
      { ...B, currency: 'USD' }
    ]);
    if (out.kind !== 'scored') throw new Error('expected a scored outcome');
    // Calling this "IDR" would misdescribe what the buyer is looking at.
    expect(out.basis.currency).toBe('USD');
    expect(out.basis.pins).toEqual([]);
  });

  it('a stale pin is IRRELEVANT to a homogeneous set — no conversion happened', () => {
    const out = scoreQuotations(
      [
        { ...A, currency: 'USD' },
        { ...B, currency: 'USD' }
      ],
      {
        pins: [
          {
            quote: 'USD',
            base: 'IDR',
            rate: 17_250,
            asOf: '2020-01-01',
            pinnedAt: '2020-01-01T00:00:00.000Z',
            source: 'MANUAL',
            liveness: 'SIMULATED'
          }
        ]
      }
    );
    expect(out.kind).toBe('scored');
  });

  it('an all-IDR set is unchanged by this batch — the domestic case is untouched', () => {
    const out = scoreQuotations([A, B]);
    if (out.kind !== 'scored') throw new Error('expected a scored outcome');
    expect(out.scores[0].priceScore).toBe(100);
    expect(out.scores[1].priceScore).toBe(50);
    expect(out.basis.homogeneous).toBe(true);
  });

  it('an EMPTY set is scored-with-nothing, never refused', () => {
    const out = scoreQuotations([]);
    if (out.kind !== 'scored') throw new Error('expected a scored outcome');
    expect(out.scores).toEqual([]);
  });
});
