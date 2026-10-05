// ────────────────────────────────────────────────────────────────────────────
// Quote-scoring primitive (F0.3-FIND-01) — the governed engine that mints the
// comparison score axes so the buyer drawer COMPUTES them instead of reading
// hand-authored fixture literals (the fabricated-score root cause).
//
// Honest-by-construction, on two rulings:
//
//  • AXIS-HONESTY SPLIT (FORK-3B). price + leadTime are LIVE — deterministic
//    rankings computed from the quote data in hand (price ratio-to-best;
//    leadTime absolute-linear since 2e-b-1, see below). reliability is a
//    DECLARED-SIMULATED external-data axis (the supplier's OTIF, measured from
//    sample data): its input is passed through VERBATIM, never recomputed here.
//
//  • COMPLIANCE IS A GATE, NOT A WEIGHT (CR-23 / CR-15, owner 2026-09-21,
//    BL-43). The compliance axis is gone: a supplier that fails the compliance
//    gate is not scored at all, and the caller filters it out BEFORE calling
//    this engine (`services/sourcing/complianceGate.ts`). Every quote this
//    engine sees is from a qualified supplier.
//
//  • WEAKEST-LINK LIVENESS. The composite (and the topRanked flag it drives) is
//    LIVE only when EVERY weighted axis is LIVE — DERIVED from AXIS_LIVENESS, not
//    hardcoded, so it auto-flips the day reliability gets a real source
//    (two-gate discipline on a derived score). Today it reads SIMULATED.
//
// C6-LOCK: CRITERIA_WEIGHTS are governed platform truth — a fixed scoring policy,
// NOT a user-editable formula. This module is pure (no I/O, no clock, no store).
// ────────────────────────────────────────────────────────────────────────────
/** @import { BidCurrency } from './currencyPolicy' */
import { BASE_CURRENCY } from './currencyPolicy';
/** @import { FxPin, FxRefusalReason } from './fxPin' */
import { effectivePin, isStalePin, isUsableRate } from './fxPin';
import { sdcClock } from '@services/sdc/clock';

/** @typedef {'live' | 'simulated'} Liveness */

/**
 * @typedef {object} CriteriaWeights
 * @property {number} price
 * @property {number} leadTime
 * @property {number} reliability
 */

/**
 * The governed scoring policy (C6-LOCK). Fixed platform truth, weights sum to 1.
 * Not user-authored — the portal's one blessed weighting, never a per-user knob.
 *
 * CR-15 (owner, 2026-09-21): price 40%, lead time 20%, reliability 40%. The old
 * 30 / 20 / 25 compliance / 25 split is retired — compliance became the CR-23
 * gate, which decides WHO is scored rather than adding points.
 * @type {CriteriaWeights}
 */
export const CRITERIA_WEIGHTS = {
  price: 0.4,
  leadTime: 0.2,
  reliability: 0.4
};

/**
 * Per-axis data liveness. LIVE axes derive from the quote set; SIMULATED axes
 * are external-data inputs with no real source yet (see the header ruling).
 * @type {Record<keyof CriteriaWeights, Liveness>}
 */
export const AXIS_LIVENESS = {
  price: 'live',
  leadTime: 'live',
  reliability: 'simulated'
};

/**
 * Weakest-link over the weighted axes — derived, so it flips when data lands.
 * @param {CriteriaWeights} weights
 * @returns {Liveness}
 */
function livenessFor(weights) {
  const axes = /** @type {(keyof CriteriaWeights)[]} */ (Object.keys(weights));
  const anySimulated = axes.some((a) => weights[a] > 0 && AXIS_LIVENESS[a] === 'simulated');
  return anySimulated ? 'simulated' : 'live';
}

/**
 * The composite's liveness under the default policy — SIMULATED today.
 * @type {Liveness}
 */
export const COMPOSITE_LIVENESS = livenessFor(CRITERIA_WEIGHTS);

/**
 * LEAD-TIME AXIS POLICY (CP-0 · W1 · 2e-b-1, operator ruling — a DELIBERATE
 * change to C6-LOCK, not a bug fix).
 *
 * The lead-time axis no longer uses ratio-to-best. It is now ABSOLUTE and
 * LINEAR: `max(0, 100 - days × 2)`. Zero days scores 100.
 *
 * Why the axis had to change rather than just the input gate: the ruling is
 * that a 0-day lead time is REAL (same-day supply) and therefore best. Under
 * ratio-to-best that is not merely wrong, it is incoherent — `best/value` with
 * `best = 0` scores every rival 0, so one same-day quote would zero the whole
 * set. A linear scale is the coherent way to express "fewer days is better and
 * zero is the floor", and it is what the ruling specifies.
 *
 * What this changes for existing data: lead-time scores are no longer relative
 * to the RFQ's fastest bid. A 14-day quote scores 72 whether or not a 7-day
 * rival exists. Price stays ratio-to-best (it is a competitive axis in a way an
 * absolute delivery promise is not).
 */
export const LEAD_TIME_PENALTY_PER_DAY = 2;

/**
 * The lead-time axis for ONE quote.
 *
 * There is no absent case (2e-b-1a): a lead time is required at quote stage, so
 * every scorable quote states one. A non-finite or negative value cannot come
 * from the UI (the parser rejects the sign) and is scored 0 — the WORST value —
 * rather than falling through to the 100 that `100 - days×2` would otherwise
 * hand it. Nonsense must never be the best score on a ranked axis.
 * @param {number} days
 * @returns {number}
 */
export function leadTimeScoreFor(days) {
  if (!Number.isFinite(days) || days < 0) return 0;
  return Math.max(0, 100 - days * LEAD_TIME_PENALTY_PER_DAY);
}

/** The minimal quote shape the engine needs (structurally a `Quotation` subset). */
/**
 * @typedef {object} ScorableQuote
 * @property {string} id
 * @property {number} unitPrice
 * @property {BidCurrency} currency The currency `unitPrice` is denominated in (2e-c-3). REQUIRED — the engine
 *   used to have no currency field at all, so `Math.min` over `unitPrice`
 *   compared bare numerals and an EUR 3.00 bid beside IDR 15,000 bids became
 *   the set minimum, collapsing every rupiah quote's price score toward zero
 *   (2e-c-2-FIND-01).
 *
 *   Required rather than defaulted precisely because `Quotation.currency` is
 *   OPTIONAL: the caller resolves absence to `BASE_CURRENCY` at the boundary,
 *   where the "absent means rupiah" convention already lives. An engine that
 *   defaulted it would be making that assumption silently, one layer too deep
 *   to see.
 * @property {number} leadTimeDays -  REQUIRED (2e-b-1a) — an incomplete bid never reaches the comparison.
 * @property {number} reliabilityScore -  CR-15 — the supplier's OTIF; "No history" scores 50 (`reliabilityScoreFor`).
 */

/**
 * @typedef {object} QuoteScore
 * @property {string} quoteId
 * @property {number} priceScore -  LIVE — ratio-to-best over the RFQ's quote set (cheapest = 100).
 * @property {number} leadTimeScore -  LIVE — absolute linear scale, `max(0, 100 - days×2)`; same-day = 100.
 * @property {number} reliabilityScore -  SIMULATED — the input value, passed through untouched.
 * @property {number} composite -  Weighted roll-up of the three axes, rounded for display.
 * @property {number} compositeExact The same roll-up UNROUNDED — what `topRanked` is decided on. Carried so a
 *   surface can say why one of two "72"s is best (72.0 against 71.6) instead of
 *   showing a recommendation the displayed numbers cannot explain.
 * @property {Liveness} compositeLiveness -  Weakest-link liveness of the composite (SIMULATED while any input is).
 * @property {boolean} topRanked -  argmax(composite) across the set — carries the composite's liveness.
 */

/**
 * Lower-is-better ratio-to-best: the best (lowest) value anchors 100, the rest
 * scale proportionally. Deterministic, single-quote-safe, guarded against a
 * non-positive or non-finite input so a degenerate value can never yield
 * NaN/Infinity.
 * @param {number} value
 * @param {number} best
 * @returns {number}
 */
function ratioToBest(value, best) {
  if (value <= 0 || !Number.isFinite(best) || best <= 0) return 0;
  return Math.round((best / value) * 100);
}

/**
 * The comparison basis a scored set was ranked against — stated so a surface can
 * show WHAT the ranking means, never inferred from the numbers.
 */
/**
 * `currency`:  The currency every price was compared in.
 * `pins`:  The pins actually used (empty for a homogeneous set, which needs none).
 * `homogeneous`:  True when the set was single-currency and no conversion happened at all.
 *
 * @typedef {{
 *   readonly currency: BidCurrency;
 *   readonly pins: readonly FxPin[];
 *   readonly homogeneous: boolean;
 * }} ScoringBasis
 */

/**
 * The engine's answer: a ranking, or a REFUSAL that names itself.
 *
 * Discriminated rather than "scores plus a warning" because a partial or
 * best-effort ranking is the failure mode this whole batch exists to close. If
 * the basis is missing or too old there is no honest number to show, and a
 * caller must be unable to accidentally render one.
 */
/**
 *  The currencies responsible — the refusal names them so a buyer knows
 *  exactly which pin to record, rather than being told "something is
 *  wrong with the currencies".
 *
 * @typedef {| { readonly kind: 'scored'; readonly scores: QuoteScore[]; readonly basis: ScoringBasis }
 *   | {
 *       readonly kind: 'refused';
 *       readonly reason: FxRefusalReason;
 *       readonly currencies: readonly BidCurrency[];
 *     }} ScoringOutcome
 */

/**
 * The engine's optional inputs, as an OBJECT rather than positional arguments.
 *
 * 2e-c-3 added two (`pins`, `now`) beside the existing `weights`, and three
 * optional positionals in a row is a defect waiting to happen: a caller passing
 * weights second would silently have them read as pins, and the engine would
 * score against an empty basis without complaining. Named fields make that
 * unexpressible.
 */
/**
 * `pins`:  The RFQ's recorded FX bases. Absent ⇒ none recorded, which refuses any  mixed-currency set rather than assuming a rate.
 * `now`:  The clock for the staleness read, injectable so specs are deterministic.
 *
 * @typedef {{
 *   readonly pins?: readonly FxPin[];
 *   readonly weights?: CriteriaWeights;
 *   readonly now?: Date;
 * }} ScoringOptions
 */

/**
 * Score a set of quotes for ONE RFQ. Pure: order-preserving, input-immutable,
 * deterministic, and clock-free except for the staleness read it is handed.
 *
 * HOMOGENEOUS-SET EXEMPTION. A single-currency set needs no pin and no
 * conversion. Ratio-to-best is scale-invariant — multiplying every price by the
 * same rate leaves every ratio, and therefore every score, identical — and the
 * other two axes never touch money. So an all-USD RFQ scores EXACTLY as it did
 * before this batch existed. This is not a convenience shortcut: demanding a pin
 * there would refuse a comparison the engine is provably able to make.
 *
 * MIXED SETS need a pin for every non-base currency present. The base needs none
 * (its rate is 1 by definition), so an all-rupiah set and a rupiah-plus-foreign
 * set differ by exactly the pins the foreign bids require.
 * @param {readonly ScorableQuote[]} quotes
 * @param {ScoringOptions} [opts]
 * @returns {ScoringOutcome}
 */
export function scoreQuotations(quotes, opts = {}) {
  const { pins = [], weights = CRITERIA_WEIGHTS, now = new Date(sdcClock.now()) } = opts;
  if (quotes.length === 0) {
    return {
      kind: 'scored',
      scores: [],
      basis: { currency: BASE_CURRENCY, pins: [], homogeneous: true }
    };
  }

  // — The FX gate, ahead of every axis ————————————————————————————————————
  // Deliberately first: a set that cannot be compared must not have a single
  // number computed for it, because a computed number tends to get rendered.
  const present = [...new Set(quotes.map((q) => q.currency))];
  const homogeneous = present.length === 1;
  // A homogeneous set is compared in its OWN currency — there is nothing to
  // convert, so calling the basis "IDR" for an all-USD RFQ would be a lie about
  // what the buyer is looking at.
  const basisCurrency = homogeneous ? present[0] : BASE_CURRENCY;

  /** @type {FxPin[]} */
  const usedPins = [];
  if (!homogeneous) {
    const needPin = present.filter((c) => c !== BASE_CURRENCY);
    const unpinned = needPin.filter((c) => !effectivePin(pins, c));
    if (unpinned.length > 0) {
      return { kind: 'refused', reason: 'FX_UNPINNED', currencies: unpinned };
    }
    const resolved = needPin.map(
      (c) => /** @type {NonNullable<ReturnType<typeof effectivePin>>} */ (effectivePin(pins, c))
    );
    // An unusable rate is reported as UNPINNED, not as a third reason: from the
    // buyer's side "there is no rate I can rank on" is one situation with one
    // remedy — record a pin — and splitting it would only ask them to care
    // about how the bad rate got there.
    const unusable = resolved.filter((p) => !isUsableRate(p.rate));
    if (unusable.length > 0) {
      return { kind: 'refused', reason: 'FX_UNPINNED', currencies: unusable.map((p) => p.quote) };
    }
    const stale = resolved.filter((p) => isStalePin(p, now));
    if (stale.length > 0) {
      return { kind: 'refused', reason: 'FX_STALE', currencies: stale.map((p) => p.quote) };
    }
    usedPins.push(...resolved);
  }

  /** A quote's price IN THE BASIS CURRENCY — derived here, at read, and never
   *  written back onto the quotation. The base currency and every price in a
   *  homogeneous set convert at 1, which is not a special case so much as the
   * @param {ScorableQuote} q
   * @returns {number}
   *  rate a currency has against itself. */
  const inBasis = (q) =>
    q.currency === basisCurrency
      ? q.unitPrice
      : q.unitPrice *
        /** @type {NonNullable<ReturnType<typeof effectivePin>>} */ (effectivePin(pins, q.currency))
          .rate;

  /** @param {number[]} xs */
  const positive = (xs) => xs.filter((x) => x > 0);
  const minPrice = Math.min(...positive(quotes.map(inBasis)));
  const compositeLiveness = livenessFor(weights);
  /**
   * Un-rounded composites, index-aligned with `scored` — ranking reads these.
   * @type {number[]}
   */
  const exacts = [];

  /** @type {QuoteScore[]} */
  const scored = quotes.map((q) => {
    // Compared in the basis, never as a bare numeral (2e-c-3).
    const priceScore = ratioToBest(inBasis(q), minPrice);
    // Absolute, not ratio-to-best (2e-b-1). Every quote states a lead time
    // (2e-b-1a), so all three axes are always present and `totalWeight` is 1 —
    // the renormalising form is kept because it is what makes a custom `weights`
    // policy that zeroes an axis behave sanely, not because an axis can be
    // missing.
    const leadTimeScore = leadTimeScoreFor(q.leadTimeDays);
    /** @type {readonly (readonly [number, number])[]} */
    const axes = [
      [priceScore, weights.price],
      [leadTimeScore, weights.leadTime],
      [q.reliabilityScore, weights.reliability]
    ];
    const totalWeight = axes.reduce((sum, [, w]) => sum + w, 0);
    // The EXACT composite is kept for ranking and the rounded one for display.
    // Rounding first was a real defect (found in 2e-b-1 live QA): at weight 0.2
    // on a 2-points-per-day scale, one day of lead time is 0.4 of a composite
    // point, so a 4-day and a 5-day supplier both rounded to 73 and `topRanked`
    // fell through to the tie-break — insertion order, which the store fills
    // newest-first. The buyer's recommendation was decided by who submitted last.
    const exact =
      totalWeight === 0 ? 0 : axes.reduce((sum, [v, w]) => sum + v * w, 0) / totalWeight;
    exacts.push(exact);
    const composite = Math.round(exact);
    return {
      quoteId: q.id,
      priceScore,
      leadTimeScore,
      reliabilityScore: q.reliabilityScore,
      composite,
      compositeExact: exact,
      compositeLiveness,
      topRanked: false
    };
  });

  // argmax over the EXACT composites — never the rounded ones (2e-b-1). The
  // first quote to reach the max still wins a genuine tie (stable), but a
  // difference the engine actually computed can no longer be rounded away into
  // an insertion-order coin flip.
  let topIdx = 0;
  for (let i = 1; i < scored.length; i += 1) {
    if (exacts[i] > exacts[topIdx]) topIdx = i;
  }
  scored[topIdx].topRanked = true;

  return {
    kind: 'scored',
    scores: scored,
    basis: { currency: basisCurrency, pins: usedPins, homogeneous }
  };
}

// ── How the top of a scored set reads (tie honesty) ─────────────────────────

/**
 * How the best of a scored set should be READ, so the "Best scored" marker never
 * contradicts the numbers beside it.
 *
 * - `tiedIds` — every quote whose UNROUNDED composite equals the best. More than
 *   one is a GENUINE tie: the engine keeps its stable first-listed pick for the
 *   award rule, but a surface must not present that pick as a ranking — it shows
 *   all of them as tied.
 * - `oneDecimal` — true when there is ONE best but another quote ROUNDS to the
 *   same whole number (Oslo at 3,000: 72.0 against 71.6, both "72"). The stated
 *   tie-break is then the unrounded score, and the surface shows one decimal so
 *   the reader can see it.
 */
/**
 * @typedef {{
 *   readonly tiedIds: readonly string[];
 *   readonly oneDecimal: boolean;
 * }} ScoreStanding
 */

/** Equal within float noise: a weighted sum of integers is never closer than 0.001 apart unless equal. */
const SAME = 1e-9;

/**
 * @param {readonly QuoteScore[]} scores
 * @returns {ScoreStanding}
 */
export function scoreStanding(scores) {
  if (scores.length === 0) return { tiedIds: [], oneDecimal: false };
  const best = Math.max(...scores.map((s) => s.compositeExact));
  const tiedIds = scores
    .filter((s) => Math.abs(s.compositeExact - best) < SAME)
    .map((s) => s.quoteId);
  const bestRounded = Math.round(best);
  const collides = scores.filter((s) => s.composite === bestRounded).length > tiedIds.length;
  return { tiedIds, oneDecimal: tiedIds.length === 1 && collides };
}

/**
 * The composite as a surface should print it under a standing.
 * @param {QuoteScore} score
 * @param {ScoreStanding} standing
 * @returns {string}
 */
export const compositeText = (score, standing) =>
  standing.oneDecimal ? score.compositeExact.toFixed(1) : String(score.composite);
