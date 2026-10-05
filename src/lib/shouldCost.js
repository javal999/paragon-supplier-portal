// ────────────────────────────────────────────────────────────────────────────
// Should-cost engine (CI-1, Layer 2) — the governed commodity analogue of
// quoteScore.js. Pure: no I/O, no clock, no store. Given a material's basket of
// root benchmarks + the governed coefficient set, it computes a should-cost as a
// permanently-MODELED, banded figure over honestly-marked (CI-1: SIMULATED) feeds.
//
// Honest-by-construction, on the canon of Commodity_Intelligence_Module_Build_Plan
// §2/§3/§5 and the RM/PM taxonomy:
//
//  • TWO ORTHOGONAL AXES. FeedLiveness (SIMULATED < SNAPSHOT < STALE < LIVE) is a
//    property of the FEED — it lives on the roots + FX and rolls up weakest-link.
//    Epistemic MODELED is a property of the NUMBER — permanent, independent of feed
//    liveness (a should-cost off LIVE roots is STILL a model). The two never merge:
//    epistemic is not a LivenessRegistry field (that would reconflate them).
//
//  • BAND, NOT A POINT. Every modeled figure renders as a band. The band carries
//    the governed cyclical MARGIN uncertainty AND the CO-PRODUCT-CREDIT uncertainty
//    (the credit is a governed CONSTANT in CI-1 — its uncertainty is expressed as a
//    wider band, not a fake precise adjustment; §0 ruling). The mid is the internal
//    central estimate; the export guard (CI-2) keeps the point off supplier exports.
//
//  • TAIL = HONEST SILENCE. A material with no modelable benchmark (actives,
//    fragrance) carries NO basket and returns a no-benchmark flag — never a
//    fabricated number.
//
// C6-LOCK: the coefficient set below is governed platform truth — a fixed policy,
// NOT a user-editable formula. SIMULATED root/FX VALUES are fixture-owned
// (commodityBaskets.js), corrected against Paragon's real master later; the engine
// and its logic do not change when real data lands — only the data it reads.
// ────────────────────────────────────────────────────────────────────────────

/** Where a material is priced. Baked into the schema from CI-1 (the domestic feed
 *  lands at CI-3, but the export-ban backtest needs the dimension present now). */
/** @typedef {'domestic' | 'international'} Basis */

/** The FEED liveness lattice (§3). Full 4-state union typed now; only SIMULATED is
 *  exercised in CI-1. SNAPSHOT arrives with CI-1.5 vendored history, STALE/LIVE with
 *  CI-3 real feeds — no type migration needed then, just new values. */
/** @typedef {'SIMULATED' | 'SNAPSHOT' | 'STALE' | 'LIVE'} FeedLiveness */

/** The NUMBER epistemics (§3). A should-cost is permanently MODELED; OBSERVED is
 *  reserved for a real benchmark cell / supplier quote (never produced here). */
/** @typedef {'MODELED' | 'OBSERVED'} Epistemic */

/** The governed cost-behaviour classes the coefficient set is keyed on. Distinct
 *  from the operator-correctable material GROUP (MG-xx): the class is platform
 *  policy (does this class carry a co-product credit? what conversion cost?), the
 *  group is a reporting bucket. The specialty tail has no class — it never computes. */
/**
 * oleochemical RM (surfactants/esters/humectants) — carries a credit
 * petro-derived RM (glycols, preservatives) — no co-product credit
 * rigid + flexible plastic packaging
 * glass packaging (energy/soda-ash driven)
 * aluminium / tinplate (LME-linked)
 *
 * @typedef {| 'RM_OLEO'
 *   | 'RM_PETRO'
 *   | 'PM_PLASTIC'
 *   | 'PM_GLASS'
 *   | 'PM_METAL'
 *   | 'PM_PAPER'} MaterialClass
 */ // paper / board (pulp-linked)

// ─── Governed C6-LOCK coefficient set (USD/kg unless noted) ───────────────────
// A fixed platform policy. Values are CI-1 placeholders (SIMULATED in spirit, but
// GOVERNED — one blessed source, never a per-user knob), corrected as the module
// matures. The coefficient-set VERSION below stamps every output for provenance.

export const COEFF_VERSION = 'ci-1.0.0';

/**
 * Energy/labour conversion cost added per class.
 * @type {Record<MaterialClass, number>}
 */
export const CONVERSION_COST = {
  RM_OLEO: 0.3,
  RM_PETRO: 0.25,
  PM_PLASTIC: 0.2,
  PM_GLASS: 0.4,
  PM_METAL: 0.3,
  PM_PAPER: 0.3
};

/** Governed CONSTANT co-product credit, subtracted (0 where the class has none).
 * @type {Record<MaterialClass, number>}
 *  The CPO/biodiesel proxy-spread refinement is deferred to CI-5 (§0 ruling). */
export const CO_PRODUCT_CREDIT = {
  RM_OLEO: 0.1,
  RM_PETRO: 0,
  PM_PLASTIC: 0,
  PM_GLASS: 0,
  PM_METAL: 0,
  PM_PAPER: 0
};

/** Governed CYCLICAL margin band per class: `center` is the margin added to the
 * @type {Record<MaterialClass, { center: number; pct: number }>}
 *  basis (USD/kg); `pct` is the band half-width it contributes to the output. */
export const MARGIN_BAND = {
  RM_OLEO: { center: 0.15, pct: 0.08 },
  RM_PETRO: { center: 0.12, pct: 0.07 },
  PM_PLASTIC: { center: 0.1, pct: 0.06 },
  PM_GLASS: { center: 0.08, pct: 0.06 },
  PM_METAL: { center: 0.12, pct: 0.07 },
  PM_PAPER: { center: 0.09, pct: 0.05 }
};

/** Extra band half-width a class with a co-product credit carries, because that
 *  credit is a governed CONSTANT — its uncertainty is honestly widened, not faked. */
export const CREDIT_BAND_WIDENING = 0.05;

/** Governed import duty / levy-wedge by basis: the fiscal wedge (§5 duties term).
 * @type {Record<Basis, number>}
 *  Domestic carries the export-levy effect; international carries import duty. */
export const DUTIES = {
  domestic: 0.02,
  international: 0.05
};

/** Governed freight by basis (§5 freight term; Drewry/index at CI-3). International
 * @type {Record<Basis, number>}
 *  bears ocean freight, domestic a minimal inland leg. */
export const FREIGHT = {
  domestic: 0.03,
  international: 0.12
};

/** Governed FX pass-through — 100% in CI-1 (spot × 1.0). Per-origin pass-through
 *  calibration from quote history is deferred to CI-5. */
export const FX_PASSTHROUGH = 1.0;

// ─── Fixture-owned input shapes (SIMULATED values live in commodityBaskets.js) ─

/** A public commodity root benchmark. In CI-1 every value is SIMULATED. */
/**
 * ISO date; the vintage source
 *
 * @typedef {object} RootBenchmark
 * @property {string} id
 * @property {string} label
 * @property {number} valueUsdPerKg
 * @property {FeedLiveness} liveness
 * @property {string} asOf
 */

/** The spot FX feed (IDR per USD). SIMULATED in CI-1. */
/**
 * @typedef {object} FxRate
 * @property {number} idrPerUsd
 * @property {FeedLiveness} liveness
 * @property {string} asOf
 */

/** One weighted root in a material's basket. The weight is a TECHNICAL coefficient
 *  (includes process yield) — NOT a recipe share; weights need not sum to 1. */
/**
 * @typedef {object} BasketComponent
 * @property {string} rootId
 * @property {number} weight
 * @property {string} [lagNote]
 */

/**
 * MG-xx (operator-correctable reporting bucket)
 *
 * @typedef {object} MaterialBase
 * @property {string} id
 * @property {string} name
 * @property {string} group
 * @property {'ROH' | 'VERP'} sapType
 */

/** A material the engine can model: a governed class + a non-empty basket + basis. */
/**
 * @typedef {MaterialBase & {
 *     readonly materialClass: MaterialClass;
 *     readonly basis: Basis;
 *     readonly basket: readonly BasketComponent[];
 *     readonly tail?: false;
 *   }} ModelableMaterial
 */

/** A specialty-tail material: no modelable benchmark, honest silence, no number. */
/**
 * @typedef {MaterialBase & {
 *     readonly basket: null;
 *     readonly tail: true;
 *     readonly reason: string;
 *   }} TailMaterial
 */

/** @typedef {ModelableMaterial | TailMaterial} Material */

// ─── Engine output ────────────────────────────────────────────────────────────

/** The rendered figure: a band in IDR/kg, never a bare point. */
/**
 * band half-width (fraction)
 *
 * @typedef {object} CostBand
 * @property {number} lowIdrPerKg
 * @property {number} midIdrPerKg
 * @property {number} highIdrPerKg
 * @property {number} pct
 */

/**
 * permanent, regardless of feed liveness
 * shouldCost_basis, before FX
 * × spotFX, banded
 * weakest-link across the inputs
 * oldest as-of among the inputs
 *
 * @typedef {object} ShouldCost
 * @property {string} materialId
 * @property {false} tail
 * @property {'MODELED'} epistemic
 * @property {Basis} basis
 * @property {number} basisCostUsdPerKg
 * @property {CostBand} band
 * @property {FeedLiveness} liveness
 * @property {string} vintage
 * @property {string} coeffVersion
 */

/**
 * "no modelable benchmark" — never a number
 *
 * @typedef {object} TailShouldCost
 * @property {string} materialId
 * @property {true} tail
 * @property {string} reason
 */

/** @typedef {ShouldCost | TailShouldCost} ShouldCostResult */

// ─── Weakest-link lattice (generalises quoteScore.livenessFor to 4 states) ─────

/** @type {Record<FeedLiveness, number>} */
const LIVENESS_ORDER = {
  SIMULATED: 0,
  SNAPSHOT: 1,
  STALE: 2,
  LIVE: 3
};

/** The composite feed-liveness of a set of inputs = the LOWEST state among them.
 * @param {readonly FeedLiveness[]} states
 * @returns {FeedLiveness}
 *  A basket output can never be fresher than its stalest root (§2 invariant). */
export function weakestLink(states) {
  return states.reduce((lo, s) => (LIVENESS_ORDER[s] < LIVENESS_ORDER[lo] ? s : lo));
}

// ─── The engine ───────────────────────────────────────────────────────────────

/**
 * @param {number} n
 * @returns {number}
 */
const round = (n) => Math.round(n);

/**
 * Compute a material's should-cost per build-plan §5. Pure & deterministic; does
 * not mutate its inputs. A tail material short-circuits to honest silence.
 *
 *   shouldCost_basis = Σ(weightᵢ × benchmarkᵢ) + conversion − coProductCredit
 *                      + freight(basis) + duties(basis) + marginCenter
 *   mid IDR/kg       = basis × spotFX × passthrough
 *   band             = mid × (1 ∓ pct),  pct = marginPct (+ creditWidening if any)
 * @param {Material} material
 * @param {Readonly<Record<string, RootBenchmark>>} roots
 * @param {FxRate} fx
 * @returns {ShouldCostResult}
 */
export function computeShouldCost(material, roots, fx) {
  if (material.tail) {
    return { materialId: material.id, tail: true, reason: material.reason };
  }

  const cls = material.materialClass;
  const used = material.basket.map((c) => {
    const root = roots[c.rootId];
    if (!root) throw new Error(`unknown root benchmark: ${c.rootId}`);
    return { root, weight: c.weight };
  });

  const basketSum = used.reduce((s, u) => s + u.weight * u.root.valueUsdPerKg, 0);
  const basisCostUsdPerKg =
    basketSum +
    CONVERSION_COST[cls] -
    CO_PRODUCT_CREDIT[cls] +
    FREIGHT[material.basis] +
    DUTIES[material.basis] +
    MARGIN_BAND[cls].center;

  const mid = basisCostUsdPerKg * fx.idrPerUsd * FX_PASSTHROUGH;
  const pct = MARGIN_BAND[cls].pct + (CO_PRODUCT_CREDIT[cls] > 0 ? CREDIT_BAND_WIDENING : 0);

  /** @type {FeedLiveness[]} */
  const feedStates = [...used.map((u) => u.root.liveness), fx.liveness];
  const vintage = [...used.map((u) => u.root.asOf), fx.asOf].reduce((a, b) => (a < b ? a : b));

  return {
    materialId: material.id,
    tail: false,
    epistemic: 'MODELED',
    basis: material.basis,
    basisCostUsdPerKg,
    band: {
      lowIdrPerKg: round(mid * (1 - pct)),
      midIdrPerKg: round(mid),
      highIdrPerKg: round(mid * (1 + pct)),
      pct
    },
    liveness: weakestLink(feedStates),
    vintage,
    coeffVersion: COEFF_VERSION
  };
}
