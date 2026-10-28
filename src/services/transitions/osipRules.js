// ─────────────────────────────────────────────────────────────────────────────
// OSIP CALCULATION MODULE — BL-187 (and BL-200, DRC-14),
// SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10 design rules 1 to 4.
//
// One module, pure functions only: no store, no clock, no UI. The live plan
// (BL-188), the planner pages and the what-if sandbox (DRC-17) all call it, so
// a corrected rule changes one place (design rule 1).
//
//   cycle stock      = Σ LTP over the lead-time weeks                 (DRC-10)
//   safety order     = z × √LT × SD, rounded up per `safetyRounding`  (DRC-7 BR-01)
//   ROP Order        = cycle stock + safety order                     [Default B9]
//   PR generated     = −(ROP Order − SOH − OSPO − OSPR)               (DRC-4 AC-01)
//   ROP Fisik        = CEILING(demand × f, MPQ) + safety, by level    (DRC-10)
//   Max              = per `maxRule`                                  [Default B8]
//   CV               = SD ÷ mean; components demand-weighted          (DRC-11)
//   strategic buffer = LTP − baseline                                 (DRC-9a)
//   rolling DA       = one supplier × material × planning week        (DRC-2)
//   plan check       = Total DA − Total OSPO, per `planCheckBasis`       (DRC-4)
//
// Every [Default] is ONE key of `OSIP_RULES` (design rule 2), and every
// function takes the rules as its last argument, defaulting to `OSIP_RULES`,
// so the sandbox can run a variant without touching this file. A stored
// figure is wrapped by `stamp` with its inputs and `RULES_VERSION` (design
// rule 3). The team's own examples (PPT 7, 8, 9) are golden fixtures in
// `__fixtures__/osipGolden.json` (design rule 4).
//
// Standard deviations here are SAMPLE standard deviations (n − 1), the
// spreadsheet's STDEV. PPT 7 reproduces with it (SD 57,801.5 → SS 244,896).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Bump on any change to a key or a formula; stamped on every stored figure.
 * 2026-10-28.1 — the Material Planning team's answers, owner ruling
 * 2026-10-28: plan check vs Total OSPO (A2), 13-week LTP SD (B2), monthly CV
 * buckets (C1), ROP FS removed and ROP Supplier on the bottleneck lead time
 * (B10), Z / g / f per material or supplier (B3, B7, B6), daily confirmation
 * on a pull agreement (E2), call-off quantity = minimum delivery (F5).
 */
export const RULES_VERSION = 'osip-2026-10-28.1';

/** @typedef {'import' | 'jabodetabek' | 'outsideJabodetabek'} SupplyArea */

/**
 * The rules block's shape: the variants each switch may take (the sandbox
 * passes a changed copy).
 * @typedef {{
 *   readonly z: number;
 *   readonly sdSource: 'ltp13w' | 'ltp' | 'consumption12w';
 *   readonly ltpSdWeeks: number;
 *   readonly consumptionSdWeeks: number;
 *   readonly safetyRounding: 'mpq' | 'koli' | 'moq';
 *   readonly fisikSafety: 'deck' | 'sheet';
 *   readonly fisikDemandIncludesLtp: boolean;
 *   readonly fixedSafetyDays: number;
 *   readonly maxRule: 'deck' | 'sheetGuidance';
 *   readonly replenishmentCycleDays: Readonly<Record<SupplyArea, number>>;
 *   readonly cvThreshold: number;
 *   readonly cvBucket: 'month' | 'week';
 *   readonly cvWindowMonths: number;
 *   readonly cvWindowWeeks: number;
 *   readonly defaultLevel: number;
 *   readonly daSafetyPlacement: 'week1' | 'spread';
 *   readonly planCheckBasis: 'totalOspo' | 'sohOspoOsprPr' | 'ospoOsprPr';
 *   readonly carryOverTarget: 'lastWeek' | 'firstOutside';
 *   readonly carryOverLimit: 'salesOrderQty4w';
 *   readonly consumptionMovingAvgWeeks: number;
 *   readonly ospoIncludesNewPo: boolean;
 * }} OsipRules
 */

/**
 * Every [Default] of section 4, one key each, with its question ID.
 * @type {OsipRules}
 */
export const OSIP_RULES = Object.freeze({
  /** [Default B3] safety factor, every material. */
  z: 1.65,
  /**
   * [Team, 2026-10-28, B2; owner ruling 2026-10-28] SD behind the safety order
   * (ROP Order): 'ltp13w' = LTP over the next `ltpSdWeeks` weeks (default);
   * 'ltp' = LTP over the lead-time weeks (the earlier default; PPT 7's golden
   * SS 244,896 runs on it); 'consumption12w' = the last `consumptionSdWeeks`
   * weeks of consumption (sheet). The ROP Fisik SD waits on B1: untouched.
   */
  sdSource: /** @type {'ltp13w' | 'ltp' | 'consumption12w'} */ ('ltp13w'),
  /** [Team, 2026-10-28, B2] the LTP window of the `'ltp13w'` variant, in weeks from week 1. */
  ltpSdWeeks: 13,
  /** [Default B2] the window of the `'consumption12w'` variant. */
  consumptionSdWeeks: 12,
  /** [Default B4] the safety order rounds up to a multiple of this size. */
  safetyRounding: /** @type {'mpq' | 'koli' | 'moq'} */ ('mpq'),
  /** [Default B1] ROP Fisik safety: deck = CEILING(g × min(a, b, c), MPQ); sheet = Z × √f × SD(consumption) + g × average demand. */
  fisikSafety: /** @type {'deck' | 'sheet'} */ ('deck'),
  /** [Default B5] ROP Fisik demand of an existing material includes LTP in its min. */
  fisikDemandIncludesLtp: true,
  /** [Default B7] g, in days. */
  fixedSafetyDays: 1,
  /** [Default B8] deck: local = CEILING(ROP, koli), import = CEILING(ROP, MOQ); sheetGuidance: ROP + cycle stock. */
  maxRule: /** @type {'deck' | 'sheetGuidance'} */ ('deck'),
  /** [Default B6] BL-200 / DRC-14: replenishment cycle f, in days, by supply area. */
  replenishmentCycleDays: Object.freeze({ import: 7, jabodetabek: 1, outsideJabodetabek: 2 }),
  /** [Team, 2026-10-28, C1] stable below, fluctuative at or above; final. */
  cvThreshold: 0.5,
  /**
   * [Team, 2026-10-28, C1; owner ruling 2026-10-28] CV buckets: 'month' = the
   * last `cvWindowMonths` full calendar months (default); 'week' = the last
   * `cvWindowWeeks` weekly buckets (the earlier default). The category is set
   * by the FG-variant CV ("CV Comp FG Var"), as `componentCv` weights it.
   */
  cvBucket: /** @type {'month' | 'week'} */ ('month'),
  /** [Team, 2026-10-28, C1] six months. */
  cvWindowMonths: 6,
  /** [Default C1] the `'week'` variant's window, weekly buckets. */
  cvWindowWeeks: 26,
  /** [Default C2] OSIP level of a material nobody classified (DRC-D11). */
  defaultLevel: 4,
  /** [Default A1] where the safety order sits in DA: all in week 1, or spread evenly over the horizon. */
  daSafetyPlacement: /** @type {'week1' | 'spread'} */ ('week1'),
  /**
   * [Team, 2026-10-28, A2; owner ruling 2026-10-28] the supply the plan check
   * sets against Total DA: 'totalOspo' (the target "Total OSPO = Total DA";
   * SOH, OSPR and PR are SAP MRP elements, shown as context only), or the
   * earlier readings 'sohOspoOsprPr' (SOH + OSPO + OSPR + PR; PPT 7's golden
   * fixture runs on it) and 'ospoOsprPr' (the same without SOH).
   */
  planCheckBasis: /** @type {'totalOspo' | 'sohOspoOsprPr' | 'ospoOsprPr'} */ ('totalOspo'),
  /** [Owner A8] where a remainder goes: the last week of the horizon, or the first week outside it (supplier agreed only). */
  carryOverTarget: /** @type {'lastWeek' | 'firstOutside'} */ ('lastWeek'),
  /** [Default A8b] the carry-over limit is a QUANTITY (last 4 weeks of sales orders), passed in per supplier; this names its unit. */
  carryOverLimit: /** @type {'salesOrderQty4w'} */ ('salesOrderQty4w'),
  /** [Default A11] consumption moving average window (BL-203 builds the average). */
  consumptionMovingAvgWeeks: 13,
  /** [Default A9; owner 2026-10-19] OSPO(w) = OSPO(w−1) − call-off, plus last week's new PO: the only reading that chains PPT 8/9 to 35, 30, 25. */
  ospoIncludesNewPo: true
});

/**
 * Design rule 3 — a stored figure with the inputs and rules version that made it.
 * @template T
 * @typedef {{ readonly value: T; readonly inputs: Readonly<Record<string, unknown>>; readonly rulesVersion: string }} Stamped
 */

/**
 * Design rule 3 / DRC-D16 — wrap a figure with what produced it.
 * @template T
 * @param {T} value
 * @param {Readonly<Record<string, unknown>>} inputs
 * @param {string} [rulesVersion]
 * @returns {Stamped<T>}
 */
export function stamp(value, inputs, rulesVersion = RULES_VERSION) {
  return Object.freeze({ value, inputs: Object.freeze({ ...inputs }), rulesVersion });
}

// ─── Arithmetic helpers ─────────────────────────────────────────────────────

/**
 * The spreadsheet's CEILING(x, step): the smallest multiple of `step` ≥ x.
 * A step ≤ 0 leaves x rounded up to a whole unit.
 * @param {number} x
 * @param {number} step
 * @returns {number}
 */
export function ceilingTo(x, step) {
  if (!(step > 0)) return Math.ceil(x);
  // Guard float noise (e.g. 3.0000000001 multiples) before rounding up.
  const n = x / step;
  const r = Math.round(n);
  return (Math.abs(n - r) < 1e-9 ? r : Math.ceil(n)) * step;
}

/**
 * @param {readonly number[]} xs
 * @returns {number}
 */
export function mean(xs) {
  return xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;
}

/**
 * SAMPLE standard deviation (n − 1), the spreadsheet's STDEV. 0 below two points.
 * @param {readonly number[]} xs
 * @returns {number}
 */
export function sampleStdev(xs) {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
}

/**
 * DRC-2 BR-01 — the horizon in whole weeks: the lead time rounded up.
 * @param {number} leadTimeWeeks
 * @returns {number}
 */
export function horizonWeeksOf(leadTimeWeeks) {
  return Math.max(1, Math.ceil(leadTimeWeeks));
}

// ─── ROP Order (DRC-7 BR-01, DRC-10, DRC-4) ─────────────────────────────────

/**
 * DRC-10 — cycle stock = Σ LTP over the lead-time weeks (`ltp` from week 1).
 * @param {readonly number[]} ltp
 * @param {number} leadTimeWeeks
 * @returns {number}
 */
export function cycleStock(ltp, leadTimeWeeks) {
  return ltp.slice(0, horizonWeeksOf(leadTimeWeeks)).reduce((a, b) => a + b, 0);
}

/**
 * The series behind the safety order's SD, per `sdSource` [Team B2]: LTP over
 * the next `ltpSdWeeks` weeks (as many as `ltp` holds), LTP over the
 * lead-time weeks, or the last `consumptionSdWeeks` weeks of consumption.
 * @param {{ readonly ltp: readonly number[]; readonly leadTimeWeeks: number; readonly consumption?: readonly number[] }} input
 * @param {OsipRules} [rules]
 * @returns {readonly number[]}
 */
export function safetySdSeries(input, rules = OSIP_RULES) {
  if (rules.sdSource === 'consumption12w')
    return (input.consumption ?? []).slice(-rules.consumptionSdWeeks);
  if (rules.sdSource === 'ltp') return input.ltp.slice(0, horizonWeeksOf(input.leadTimeWeeks));
  return input.ltp.slice(0, rules.ltpSdWeeks);
}

/**
 * DRC-7 BR-01 — safety order = z × √LT(weeks) × SD, rounded up per
 * `safetyRounding` [Default B4]. SD per `sdSource` (`safetySdSeries`). BL-210 — an `sd` given (the sandbox's typed SD)
 * replaces the computed one; absent, nothing changes.
 * @param {{
 *   readonly ltp: readonly number[];
 *   readonly leadTimeWeeks: number;
 *   readonly mpq?: number;
 *   readonly koli?: number;
 *   readonly moq?: number;
 *   readonly consumption?: readonly number[];
 *   readonly sd?: number | null;
 * }} input
 * @param {OsipRules} [rules]
 * @returns {{ value: number; sd: number; raw: number; roundTo: number }}
 */
export function safetyOrder(input, rules = OSIP_RULES) {
  const series = safetySdSeries(input, rules);
  // BL-210 — the override, when given, stands in for the series' SD.
  const sd = typeof input.sd === 'number' ? input.sd : sampleStdev(series);
  const raw = rules.z * Math.sqrt(input.leadTimeWeeks) * sd;
  const roundTo =
    rules.safetyRounding === 'koli'
      ? (input.koli ?? 0)
      : rules.safetyRounding === 'moq'
        ? (input.moq ?? 0)
        : (input.mpq ?? 0);
  return { value: ceilingTo(raw, roundTo), sd, raw, roundTo };
}

/**
 * [Default B9] — ROP Order = cycle stock + safety order. Shown as the input to
 * ZPE007; the hub does not run ZPE007 (DRC-10).
 * @param {{ readonly cycleStock: number; readonly safetyOrder: number }} input
 * @returns {number}
 */
export function ropOrder({ cycleStock: c, safetyOrder: s }) {
  return c + s;
}

/**
 * DRC-4 AC-01 — PR generated = −(ROP Order − SOH − OSPO − OSPR). Negative is a
 * need: PPT 7 gives −645,559, a PR of 645,559.
 * @param {{ readonly ropOrder: number; readonly soh: number; readonly ospo: number; readonly ospr: number }} input
 * @returns {number}
 */
export function prGenerated({ ropOrder: rop, soh, ospo, ospr }) {
  return -(rop - soh - ospo - ospr);
}

// ─── ROP Fisik (DRC-7 BR-02, DRC-10, DRC-14) ────────────────────────────────

/**
 * Jabodetabek, as the supplier fixtures spell their `city`. Cikarang is in
 * Bekasi Regency; Karawang is NOT in Jabodetabek (BL-200, decision noted).
 */
export const JABODETABEK_CITIES = Object.freeze([
  'jakarta',
  'bogor',
  'depok',
  'tangerang',
  'tangerang selatan',
  'south tangerang',
  'bekasi',
  'cikarang'
]);

/**
 * BL-200 / DRC-14 — a supplier's supply area from its master `country` and
 * `city`: outside Indonesia → import; a Jabodetabek city → jabodetabek; any
 * other Indonesian city → outsideJabodetabek. Null when the country is missing.
 * @param {{ readonly country?: string | null; readonly city?: string | null }} supplier
 * @returns {SupplyArea | null}
 */
export function supplyAreaOf({ country, city }) {
  if (!country) return null;
  if (country.trim().toUpperCase() !== 'ID') return 'import';
  const c = (city ?? '').trim().toLowerCase();
  return JABODETABEK_CITIES.includes(c) ? 'jabodetabek' : 'outsideJabodetabek';
}

/**
 * [Default B6] — replenishment cycle f, in days, for a supply area.
 * @param {SupplyArea} area
 * @param {OsipRules} [rules]
 * @returns {number}
 */
export function replenishmentCycleDays(area, rules = OSIP_RULES) {
  return rules.replenishmentCycleDays[area];
}

/**
 * DRC-10 — the demand behind ROP Fisik, PER DAY (f and g are days, so every
 * input is a daily rate; a caller holding weekly figures divides first).
 *   existing: min(highest consumption over the last 3 months, production
 *             capacity, LTP); LTP leaves the min when `fisikDemandIncludesLtp`
 *             is false [Default B5].
 *   NPD:      min(highest LTP over the next 3 months, production capacity).
 * @param {{
 *   readonly npd?: boolean;
 *   readonly highestConsumption3m?: number;
 *   readonly highestLtpNext3m?: number;
 *   readonly productionCapacity: number;
 *   readonly ltp?: number;
 * }} input
 * @param {OsipRules} [rules]
 * @returns {number}
 */
export function fisikDemand(input, rules = OSIP_RULES) {
  if (input.npd) return Math.min(input.highestLtpNext3m ?? 0, input.productionCapacity);
  const parts = [input.highestConsumption3m ?? 0, input.productionCapacity];
  if (rules.fisikDemandIncludesLtp) parts.push(input.ltp ?? Infinity);
  return Math.min(...parts);
}

/**
 * DRC-7 BR-02 — the safety in ROP Fisik, per `fisikSafety` [Default B1]:
 *   deck:  CEILING(g × demand, MPQ), demand = min(a, b, c) from `fisikDemand`.
 *   sheet: Z × √f × SD(daily consumption) + g × average daily demand, not
 *          rounded (the sheet states no rounding).
 * @param {{
 *   readonly demand: number;
 *   readonly mpq: number;
 *   readonly f: number;
 *   readonly consumption?: readonly number[];
 *   readonly averageDemand?: number;
 * }} input
 * @param {OsipRules} [rules]
 * @returns {number}
 */
export function fisikSafety(input, rules = OSIP_RULES) {
  const g = rules.fixedSafetyDays;
  if (rules.fisikSafety === 'sheet') {
    return (
      rules.z * Math.sqrt(input.f) * sampleStdev(input.consumption ?? []) +
      g * (input.averageDemand ?? 0)
    );
  }
  return ceilingTo(g * input.demand, input.mpq);
}

/**
 * DRC-10 — ROP Fisik by OSIP level (PPT 11; level from DRC-D11, default 4):
 *   3, 4 (modal sharing, warehouse replenishment): CEILING(demand × f, MPQ) + safety.
 *   5 (fixed order):  CEILING(demand × f, MDQ) + safety.
 *   6 (JIT):          CEILING(c × d, pallet), c the daily LTP and d the days
 *                     covered (at least 1 call-off a day); no safety.
 *   any other level:  the level-4 formula, with `levelFallback` set.
 * @param {{
 *   readonly level?: number | null;
 *   readonly demand: number;
 *   readonly f: number;
 *   readonly mpq: number;
 *   readonly safety: number;
 *   readonly mdq?: number;
 *   readonly jitRate?: number;
 *   readonly jitDays?: number;
 *   readonly palletQty?: number;
 * }} input
 * @param {OsipRules} [rules]
 * @returns {{ value: number; cycle: number; safety: number; level: number; levelFallback: boolean }}
 */
export function ropFisik(input, rules = OSIP_RULES) {
  const asked = input.level ?? rules.defaultLevel;
  const known = [3, 4, 5, 6].includes(asked);
  const level = known ? asked : rules.defaultLevel;
  if (level === 6) {
    const cycle = ceilingTo(
      (input.jitRate ?? 0) * Math.max(1, input.jitDays ?? 1),
      input.palletQty ?? 0
    );
    return { value: cycle, cycle, safety: 0, level, levelFallback: !known };
  }
  const size = level === 5 ? (input.mdq ?? 0) : input.mpq;
  const cycle = ceilingTo(input.demand * input.f, size);
  return { value: cycle + input.safety, cycle, safety: input.safety, level, levelFallback: !known };
}

/**
 * [Default B8] — max stock:
 *   deck:          local = CEILING(ROP, koli), import = CEILING(ROP, MOQ).
 *   sheetGuidance: ROP + cycle stock.
 * @param {{
 *   readonly rop: number;
 *   readonly area: SupplyArea;
 *   readonly koli?: number;
 *   readonly moq?: number;
 *   readonly cycleStock?: number;
 * }} input
 * @param {OsipRules} [rules]
 * @returns {number}
 */
export function maxStock(input, rules = OSIP_RULES) {
  if (rules.maxRule === 'sheetGuidance') return input.rop + (input.cycleStock ?? 0);
  return ceilingTo(input.rop, maxRoundingUnit(input, rules));
}

/**
 * [Default B8] — the unit max stock rounds up to: local koli, import MOQ
 * (deck); 0 under the sheet guidance, which does not round. [Team F5] — a
 * call-off quantity rounds the same way (`callOffTriggerRules`).
 * @param {{ readonly area: SupplyArea | null; readonly koli?: number | null; readonly moq?: number }} input
 * @param {OsipRules} [rules]
 * @returns {number}
 */
export function maxRoundingUnit({ area, koli, moq }, rules = OSIP_RULES) {
  if (rules.maxRule === 'sheetGuidance') return 0;
  return area === 'import' ? (moq ?? 0) : (koli ?? 0);
}

// ─── CV (DRC-11) and strategic buffer (DRC-9a) ──────────────────────────────

/**
 * DRC-11 — CV = sample SD ÷ mean over the last buckets of the window in force
 * [Team C1]: `cvWindowMonths` monthly buckets, or `cvWindowWeeks` weekly ones
 * (`cvBucket`). `buckets` are of that kind, oldest first. Null when the mean is 0.
 * @param {readonly number[]} buckets
 * @param {OsipRules} [rules]
 * @returns {number | null}
 */
export function cv(buckets, rules = OSIP_RULES) {
  const window = buckets.slice(
    -(rules.cvBucket === 'month' ? rules.cvWindowMonths : rules.cvWindowWeeks)
  );
  const m = mean(window);
  return m === 0 ? null : sampleStdev(window) / m;
}

/**
 * DRC-11 [Team C1] — weekly demand as calendar-month buckets: each week's
 * quantity spread evenly over its 7 days (the `groupWeekLtp` reading), the
 * days summed by month. Only FULL months count: every day of the month inside
 * the weeks given. `firstWeek` is the Monday of `weekly[0]`. Oldest first.
 * @param {readonly number[]} weekly
 * @param {string} firstWeek  YYYY-MM-DD.
 * @returns {{ month: string; qty: number }[]}
 */
export function monthlyBuckets(weekly, firstWeek) {
  const DAY = 86_400_000;
  const start = Date.parse(`${firstWeek}T00:00:00.000Z`);
  const end = start + weekly.length * 7 * DAY; // exclusive
  /** @type {Map<string, number>} */
  const byMonth = new Map();
  weekly.forEach((q, w) => {
    for (let d = 0; d < 7; d++) {
      const month = new Date(start + (w * 7 + d) * DAY).toISOString().slice(0, 7);
      byMonth.set(month, (byMonth.get(month) ?? 0) + q / 7);
    }
  });
  return [...byMonth.entries()]
    .filter(([month]) => {
      const first = Date.parse(`${month}-01T00:00:00.000Z`);
      const d = new Date(first);
      const next = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
      return first >= start && next <= end;
    })
    .map(([month, qty]) => ({ month, qty }));
}

/**
 * DRC-11 — a shared component's CV: Σ(CV_var × avgDemand_sku) ÷ Σ avgDemand_sku.
 * Null when no SKU carries demand.
 * @param {readonly { readonly cv: number; readonly avgDemand: number }[]} skus
 * @returns {number | null}
 */
export function componentCv(skus) {
  const weight = skus.reduce((s, k) => s + k.avgDemand, 0);
  return weight === 0 ? null : skus.reduce((s, k) => s + k.cv * k.avgDemand, 0) / weight;
}

/**
 * DRC-11 — stable below `cvThreshold`, fluctuative at or above [Default C1].
 * @param {number} value
 * @param {OsipRules} [rules]
 * @returns {'stable' | 'fluctuative'}
 */
export function cvCategory(value, rules = OSIP_RULES) {
  return value < rules.cvThreshold ? 'stable' : 'fluctuative';
}

/**
 * DRC-9a [Default C4] — strategic buffer = LTP − baseline, the baseline the
 * average LTP of the 3 months before the festive window. No rounding (none
 * stated); never below 0.
 * @param {{ readonly ltp: number; readonly preFestiveLtp: readonly number[] }} input
 * @returns {{ value: number; baseline: number }}
 */
export function strategicBuffer({ ltp, preFestiveLtp }) {
  const baseline = mean(preFestiveLtp);
  return { value: Math.max(0, ltp - baseline), baseline };
}

// ─── Rolling DA (DRC-2) ─────────────────────────────────────────────────────

/**
 * A remainder moved onto a later week (DRC-3 keeps where it came from).
 * @typedef {{ readonly week: string; readonly qty: number; readonly fromWeek: string }} Carry
 */

/**
 * One week of the DA, with its parts.
 * @typedef {{
 *   readonly week: string;
 *   readonly ltp: number;
 *   readonly safety: number;
 *   readonly carriedIn: readonly { readonly qty: number; readonly fromWeek: string }[];
 *   readonly da: number;
 * }} DaWeek
 */

/**
 * Spread `total` over `n` weeks in whole units, the odd units first.
 * @param {number} total
 * @param {number} n
 * @returns {number[]}
 */
function spreadEvenly(total, n) {
  const base = Math.floor(total / n);
  const extra = total - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < extra ? 1 : 0));
}

/**
 * DRC-2 — the rolling DA of one supplier × material for one planning week.
 *
 * `weeks` / `ltp` run from the planning week, at least the horizon long, plus
 * one more week when the remainder may go outside it. `carries` holds the
 * remainders earlier planning weeks moved forward.
 *
 *   horizon     = lead time in weeks (BR-01)
 *   DA(w)       = LTP(w) + carried in, plus the safety order per
 *                 `daSafetyPlacement` [Default A1] (BR-02)
 *   OSPO        = OSPO(w−1) − call-off(w−1), plus last week's new PO when
 *                 `ospoIncludesNewPo` is on [Default A9] (BR-05)
 *   additional PO = Σ DA over the horizon − OSPO, never below 0 (BR-05)
 *   remainder   = DA(planning week) − call-off (BR-03); a positive remainder
 *                 moves to the last week of the horizon, or to the first week
 *                 outside it when the supplier agreed [Owner A8], capped by the
 *                 carry-over limit [Default A8b] (BR-04).
 *
 * @param {{
 *   readonly weeks: readonly string[];
 *   readonly ltp: readonly number[];
 *   readonly leadTimeWeeks: number;
 *   readonly safetyOrder?: number;
 *   readonly carries?: readonly Carry[];
 *   readonly ospoPrev?: number;
 *   readonly callOffPrev?: number;
 *   readonly newPoPrev?: number;
 *   readonly callOff?: number;
 *   readonly carryTo?: 'lastWeek' | 'firstOutside';
 *   readonly supplierAgreedFirstOutside?: boolean;
 *   readonly carryOverLimit?: number;
 * }} input
 * @param {OsipRules} [rules]
 * @returns {{
 *   weeks: DaWeek[];
 *   totalDa: number;
 *   ospo: number;
 *   additionalPo: number;
 *   callOff: number;
 *   remainder: number;
 *   carry: Carry | null;
 *   uncarried: number;
 *   carries: Carry[];
 *   flags: string[];
 * }}
 */
export function rollingDaWeek(input, rules = OSIP_RULES) {
  const n = horizonWeeksOf(input.leadTimeWeeks);
  if (input.weeks.length < n || input.ltp.length < n)
    throw new RangeError(`rollingDaWeek: ${n} horizon weeks needed`);
  const carries = input.carries ?? [];
  const safety = input.safetyOrder ?? 0;
  const safetyByWeek =
    rules.daSafetyPlacement === 'spread'
      ? spreadEvenly(safety, n)
      : Array.from({ length: n }, (_, i) => (i === 0 ? safety : 0));

  /** @param {string} week */
  const carriedInto = (week) =>
    carries.filter((c) => c.week === week).map((c) => ({ qty: c.qty, fromWeek: c.fromWeek }));

  /** @type {DaWeek[]} */
  const weeks = input.weeks.slice(0, n).map((week, i) => {
    const carriedIn = carriedInto(week);
    const da = input.ltp[i] + safetyByWeek[i] + carriedIn.reduce((s, c) => s + c.qty, 0);
    return { week, ltp: input.ltp[i], safety: safetyByWeek[i], carriedIn, da };
  });
  const totalDa = weeks.reduce((s, w) => s + w.da, 0);

  const ospo =
    (input.ospoPrev ?? 0) -
    (input.callOffPrev ?? 0) +
    (rules.ospoIncludesNewPo ? (input.newPoPrev ?? 0) : 0);
  const additionalPo = Math.max(0, totalDa - ospo);

  const callOff = input.callOff ?? 0;
  const remainder = weeks[0].da - callOff;

  /** @type {string[]} */
  const flags = [];
  let target = input.carryTo ?? rules.carryOverTarget;
  if (target === 'firstOutside' && !input.supplierAgreedFirstOutside) {
    // [Owner A8] — outside the horizon only with the supplier's agreement.
    flags.push('CARRY_FIRST_OUTSIDE_NOT_AGREED');
    target = 'lastWeek';
  }
  if (target === 'firstOutside' && input.weeks.length <= n) {
    flags.push('CARRY_FIRST_OUTSIDE_WEEK_MISSING');
    target = 'lastWeek';
  }
  const toWeek = target === 'firstOutside' ? input.weeks[n] : input.weeks[n - 1];
  const limit = input.carryOverLimit ?? Infinity;
  const carried = Math.max(0, Math.min(remainder, limit));
  const uncarried = Math.max(0, remainder - carried);
  if (uncarried > 0) flags.push('CARRY_OVER_LIMIT');
  /** @type {Carry | null} */
  const carry = carried > 0 ? { week: toWeek, qty: carried, fromWeek: input.weeks[0] } : null;

  return {
    weeks,
    totalDa,
    ospo,
    additionalPo,
    callOff,
    remainder,
    carry,
    uncarried,
    // The carries the next planning week reads: the past week's are spent.
    carries: [...carries.filter((c) => c.week !== input.weeks[0]), ...(carry ? [carry] : [])],
    flags
  };
}

// ─── Plan vs execution (DRC-4) ──────────────────────────────────────────────

/**
 * DRC-4 — gap = Total DA − supply, the supply per `planCheckBasis` [Team A2]:
 * Total OSPO (default), SOH + OSPO + OSPR + PR, or OSPO + OSPR + PR. `pr` is
 * the PR quantity, a positive number (= −PR generated). A shortfall (gap > 0) is a PR
 * recommendation for the planner; a surplus (gap < 0) is absorbed in the last
 * week of the DA (BR-02), never below 0 — what the last week cannot take is
 * returned as `unabsorbed`.
 * @param {{
 *   readonly daWeeks: readonly number[];
 *   readonly soh: number;
 *   readonly ospo: number;
 *   readonly ospr: number;
 *   readonly pr: number;
 * }} input
 * @param {OsipRules} [rules]
 * @returns {{
 *   totalDa: number;
 *   supply: number;
 *   gap: number;
 *   prRecommendation: number;
 *   absorbedLastWeek: number;
 *   unabsorbed: number;
 *   daWeeks: number[];
 * }}
 */
export function planCheck(input, rules = OSIP_RULES) {
  const totalDa = input.daWeeks.reduce((a, b) => a + b, 0);
  const supply =
    rules.planCheckBasis === 'totalOspo'
      ? input.ospo
      : (rules.planCheckBasis === 'sohOspoOsprPr' ? input.soh : 0) +
        input.ospo +
        input.ospr +
        input.pr;
  const gap = totalDa - supply;
  const daWeeks = [...input.daWeeks];
  let absorbedLastWeek = 0;
  let unabsorbed = 0;
  if (gap < 0 && daWeeks.length > 0) {
    const last = daWeeks.length - 1;
    absorbedLastWeek = Math.min(-gap, daWeeks[last]);
    unabsorbed = -gap - absorbedLastWeek;
    daWeeks[last] -= absorbedLastWeek;
  }
  return {
    totalDa,
    supply,
    gap,
    prRecommendation: Math.max(0, gap),
    absorbedLastWeek,
    unabsorbed,
    daWeeks
  };
}

/**
 * PPT 7 — projected SOH per week: SOH + Σ(incoming − LTP) up to that week.
 * @param {number} soh
 * @param {readonly number[]} incoming
 * @param {readonly number[]} ltp
 * @returns {number[]}
 */
export function projectedSoh(soh, incoming, ltp) {
  let level = soh;
  return incoming.map((inc, i) => (level += inc - (ltp[i] ?? 0)));
}
