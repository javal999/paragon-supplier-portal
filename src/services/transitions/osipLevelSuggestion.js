// ─────────────────────────────────────────────────────────────────────────────
// BL-208 (DRC-19) — the SUGGESTED OSIP level of a material. [Proposed]
//
// DRC-19 is on hold for questions C2 and F5. The owner asked for the
// recommended option to be built for review, so this file is marked
// [Proposed]: "Proposed: awaiting owner review (BL-208, C2, F5)".
//
// THE SYSTEM SUGGESTS A LEVEL; IT NEVER SETS ONE. Nothing here writes. The
// planner confirms a suggestion through the existing level verb
// (`t_osiplevel_set`), which records it with `source: 'classification'`.
//
// The rules, from the XLS "Logics" and "Guidance" sheets (DRC-10, DRC-19):
//   1. Order method from the material's order-method tag, where the hub holds
//      one (`ORDER_TAG_METHOD`):
//        PIPO                    → Manual Order       (level 1)
//        one shot                → Project Order      (level 2)
//        festive / uplift / CNY  → Exception Based    (strategic buffer, no level)
//        commodity               → Fixed Order        (level 5)
//   2. Otherwise by demand pattern, on wave 2's CV (`materialCvs`, DRC-11):
//        CV ≥ cvThreshold (fluctuative) → Continuous Review (level 3)
//        CV <  cvThreshold (stable)      → Periodic Review   (level 4)
//   3. JIT (level 6) = Periodic Review with a continuous production pattern:
//      MPQ rate = MPQ ÷ daily consumption ≤ `jitMpqRateMax` [Default F5], AND
//      "1 pallet mix HU = Yes". The hub holds no pallet-mix data, so JIT is
//      never suggested: the suggestion says "needs pallet-mix data" instead.
// A missing input (no CV, no consumption, no tag, no source) is NAMED in
// `missing`; nothing defaults silently.
//
// Pure: plain data in, plain data out. Computed at read and never stored, so
// it carries no stamp (DRC-D16 applies to stored figures).
// ─────────────────────────────────────────────────────────────────────────────

/** @import { OsipRules } from './osipRules' */
/** @import { MaterialCv } from './osipSafetyRules' */
import { OSIP_RULES, cvCategory, mean } from './osipRules';

/**
 * The order-method tags the XLS names. The hub's material master carries none
 * of them today (BL-208, reported): the read passes `null`.
 * @typedef {'pipo' | 'oneShot' | 'festive' | 'commodity'} OrderTag
 */

/**
 * The XLS order methods.
 * @typedef {| 'manualOrder'
 *   | 'projectOrder'
 *   | 'continuousReview'
 *   | 'periodicReview'
 *   | 'fixedOrder'
 *   | 'exceptionBased'} OrderMethod
 */

/**
 * Why a suggestion is incomplete, each naming the input the hub lacks.
 *   NO_TAG          — no order-method tag on record: decided by demand pattern.
 *   NO_CV           — no CV (no parent SKU with demand, or no BOM): no level.
 *   NO_SOURCE       — no purchasing source: no MPQ for the JIT check.
 *   NO_CONSUMPTION  — no recorded consumption: no MPQ rate for the JIT check.
 *   NO_PALLET_MIX   — continuous production pattern, but the hub holds no
 *                     "1 pallet mix HU" flag: JIT (6) is not suggested.
 * @typedef {'NO_TAG' | 'NO_CV' | 'NO_SOURCE' | 'NO_CONSUMPTION' | 'NO_PALLET_MIX'} SuggestionGap
 */

/**
 * [Proposed] The readings this file makes, one key each, with its question ID.
 */
export const LEVEL_SUGGESTION_RULES = Object.freeze({
  /** [Default F5] continuous production when MPQ ÷ daily consumption ≤ this; batching above (XLS Logics). */
  jitMpqRateMax: 6,
  /** [Default, wave 2] MPQ = orderMultiple until the master data feed carries MPQ (wave 2 default). */
  mpqSource: /** @type {'orderMultiple'} */ ('orderMultiple'),
  /** DRC-B4 — weekly → daily. */
  daysPerWeek: 7
});

/**
 * [Proposed] XLS order method by tag (DRC-19). `level` null: the method has no
 * OSIP level (Exception Based is the strategic buffer, DRC-9a).
 * @type {Readonly<Record<OrderTag, { readonly method: OrderMethod; readonly level: number | null }>>}
 */
export const ORDER_TAG_METHOD = Object.freeze({
  pipo: Object.freeze({ method: /** @type {OrderMethod} */ ('manualOrder'), level: 1 }),
  oneShot: Object.freeze({ method: /** @type {OrderMethod} */ ('projectOrder'), level: 2 }),
  festive: Object.freeze({ method: /** @type {OrderMethod} */ ('exceptionBased'), level: null }),
  commodity: Object.freeze({ method: /** @type {OrderMethod} */ ('fixedOrder'), level: 5 })
});

/** The question IDs the suggestion rests on, for its labels. */
export const LEVEL_SUGGESTION_QUESTIONS = Object.freeze(['C1', 'C2', 'F5', 'MPQ']);

/** The [Proposed] label's references (BL-208, C2, F5). */
export const LEVEL_SUGGESTION_PROPOSAL = Object.freeze(['BL-208', 'C2', 'F5']);

/**
 * `level`: the suggested level, or null (no CV, or a method with no level).
 * `basis`: which rule decided it.
 * `cv` / `mpqRate`: the figures behind it, null when absent.
 * `jit`: `'needsPalletMix'` — the MPQ rate qualifies for JIT but the pallet-mix
 *   input is missing; `'batching'` — MPQ rate above the threshold; null — not
 *   checked (not Periodic Review, or no MPQ rate).
 * `missing`: every input the hub lacks, in a fixed order.
 * @typedef {{
 *   readonly level: number | null;
 *   readonly method: OrderMethod | null;
 *   readonly basis: 'tag' | 'cvFluctuative' | 'cvStable' | null;
 *   readonly cv: number | null;
 *   readonly mpqRate: number | null;
 *   readonly jit: 'needsPalletMix' | 'batching' | null;
 *   readonly missing: readonly SuggestionGap[];
 * }} LevelSuggestion
 */

/**
 * The material-level inputs. `orderTag`: null or absent when the hub holds no
 * tag. `mpq` / `consumption`: the material's main source (highest share), its
 * MPQ [Default, wave 2] and its share of recorded weekly consumption; null
 * `mpq` when the material has no source.
 * @typedef {{
 *   readonly orderTag?: OrderTag | null;
 *   readonly cv: MaterialCv | null;
 *   readonly mpq: number | null;
 *   readonly consumption: readonly number[];
 * }} LevelSuggestionInput
 */

/**
 * BL-208 (DRC-19) [Proposed] — the suggested level of one material. Never
 * writes; the planner confirms it through `t_osiplevel_set`.
 * @param {LevelSuggestionInput} input
 * @param {OsipRules} [rules]
 * @param {typeof LEVEL_SUGGESTION_RULES} [read]
 * @returns {LevelSuggestion}
 */
export function suggestOsipLevel(input, rules = OSIP_RULES, read = LEVEL_SUGGESTION_RULES) {
  const cvValue = input.cv?.cv ?? null;

  // ── 1. The order-method tag, where the hub holds one (DRC-19, XLS Guidance). ──
  const tag = input.orderTag ?? null;
  if (tag !== null) {
    const m = ORDER_TAG_METHOD[tag];
    return {
      level: m.level,
      method: m.method,
      basis: 'tag',
      cv: cvValue,
      mpqRate: null,
      jit: null,
      missing: []
    };
  }

  /** @type {SuggestionGap[]} */
  const missing = ['NO_TAG'];

  // ── 2. The demand pattern, on wave 2's CV (DRC-11 [Default C1]). ──
  if (cvValue === null) {
    missing.push('NO_CV');
    return { level: null, method: null, basis: null, cv: null, mpqRate: null, jit: null, missing };
  }
  if (cvCategory(cvValue, rules) === 'fluctuative')
    return {
      level: 3,
      method: 'continuousReview',
      basis: 'cvFluctuative',
      cv: cvValue,
      mpqRate: null,
      jit: null,
      missing
    };

  // ── 3. Periodic Review; JIT only with a continuous pattern AND pallet mix. ──
  /** @type {number | null} */
  let mpqRate = null;
  /** @type {LevelSuggestion['jit']} */
  let jit = null;
  const daily = mean(input.consumption) / read.daysPerWeek;
  if (input.mpq === null) missing.push('NO_SOURCE');
  else if (input.consumption.length === 0 || !(daily > 0)) missing.push('NO_CONSUMPTION');
  else {
    mpqRate = input.mpq / daily;
    if (mpqRate <= read.jitMpqRateMax) {
      // [Default F5] continuous — but "1 pallet mix HU = Yes" is not in the hub.
      jit = 'needsPalletMix';
      missing.push('NO_PALLET_MIX');
    } else jit = 'batching';
  }
  return {
    level: 4,
    method: 'periodicReview',
    basis: 'cvStable',
    cv: cvValue,
    mpqRate,
    jit,
    missing
  };
}

/**
 * The inputs from one material's OSIP read (`osipSafetyInputs`): the main
 * source is the first supplier (the read sorts by share, highest first).
 * The hub holds no order-method tag, so `orderTag` is null.
 * @param {{ readonly cv: MaterialCv; readonly suppliers: readonly { readonly mpq: number; readonly consumption: readonly number[] }[] }} osip
 * @returns {LevelSuggestionInput}
 */
export function levelSuggestionInput(osip) {
  const main = osip.suppliers[0];
  return {
    orderTag: null,
    cv: osip.cv,
    mpq: main ? main.mpq : null,
    consumption: main ? main.consumption : []
  };
}
