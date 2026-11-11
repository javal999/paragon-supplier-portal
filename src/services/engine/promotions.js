// ─────────────────────────────────────────────────────────────────────────────
// REQ-E14-08 BR-05 (BL-235) — A PROMOTION ENTERED FOR ONE SKU.
//
// A planner enters a promotion for ONE SKU: the week it is expected in and the
// expected increase, as a percentage of that week's forecast or as a number of
// units. The forecast applies it to that week for that SKU only, and the week is
// marked. One entry covers one SKU only, because the trend differs per SKU.
//
//   percent:  shown = forecast + round(forecast × percent ÷ 100)
//   units:    shown = forecast + units
//
// Pure: a forecast run and ledger rows in, the promoted forecast out (the shape
// `applyOverrides` has). It is applied AFTER the engine's reconciliation, on the
// SKU × week, and the brand and total are re-summed from their SKUs — so every
// level adds up. It is not an input to the main model (BR-02) and does not feed
// the promotion model (BR-03): those are the rest of BL-113. A planner override
// (E14-11 X-06) is applied on top of it, so an override wins on its cell.
//
// MY CALLS (listed in the MR as [Proposed]; none is in the requirements doc):
//   · The key of an entry is the SKU and the week: one active promotion per SKU
//     per week; a change replaces it, a withdrawal ends it, nothing is deleted.
//   · A percentage is above 0 and at most PROMOTION_PERCENT_MAX; units are a
//     whole number from 1 to PROMOTION_UNITS_MAX (a typing guard, as the
//     override's).
//   · Not a DA cause (PEX-6): the Demand anticipation reads SAP's plan, not this
//     forecast (ENG-B66), so a promotion moves no DA figure (PEX-6 BR-03).
// ─────────────────────────────────────────────────────────────────────────────

/** @import { DemandForecastRun } from './demandForecast' */
/** @import { IsoDate } from './types' */

/**
 * A promotion's increase may be at most this percentage of the week's forecast
 * (+300%: four times the forecast). The engine's own estimated event factors cap
 * at +50% (`FACTOR_CAP`); a planner's entry is allowed six times that, since a
 * campaign can be larger than the calendar events. Above it the entry is most
 * likely a typing slip (units typed as a percentage), so it is refused.
 */
export const PROMOTION_PERCENT_MAX = 300;
/** The largest number of units an entry may add (a typing guard, not a business limit). */
export const PROMOTION_UNITS_MAX = 1_000_000;

/** @typedef {'percent' | 'units'} PromotionKind */
/** @type {readonly PromotionKind[]} */
export const PROMOTION_KINDS = ['percent', 'units'];

/**
 * `status`:  `Active`: in force when it is the latest row of its key; `Withdrawn`: ended.
 * `kind`, `value`:  The increase (null on a withdrawal).
 * `previous`:  The increase in force just before this row (null if none).
 * `setBy`:  Who: the session's actor attribution, as recorded.
 *
 * @typedef {{
 *     readonly key: string;
 *     readonly skuCode: string;
 *     readonly weekStart: IsoDate;
 *     readonly status: 'Active' | 'Withdrawn';
 *     readonly kind: PromotionKind | null;
 *     readonly value: number | null;
 *     readonly previous: { readonly kind: PromotionKind; readonly value: number } | null;
 *     readonly setAt: string;
 *     readonly setBy: unknown;
 *   }} PromotionRow
 */

/**
 * The ledger key and entity id of a SKU's promotion in a week.
 * @param {string} skuCode
 * @param {IsoDate} weekStart
 * @returns {string}
 */
export const promotionKey = (skuCode, weekStart) => `promo|${skuCode}|${weekStart}`;

/**
 * @param {string} key
 * @returns {{ skuCode: string; weekStart: IsoDate } | null}
 */
export function parsePromotionKey(key) {
  const [kind, skuCode, weekStart, ...rest] = key.split('|');
  if (kind !== 'promo' || rest.length > 0 || !skuCode || !weekStart) return null;
  return { skuCode, weekStart };
}

/**
 * The promotions in force: the latest row of each key, when it is `Active`.
 * @param {readonly PromotionRow[]} rows oldest first
 * @returns {Map<string, PromotionRow>}
 */
export function promotionsInForce(rows) {
  const latest = /** @type {Map<string, PromotionRow>} */ (new Map());
  for (const r of rows) latest.set(r.key, r);
  for (const [k, r] of latest) if (r.status !== 'Active') latest.delete(k);
  return latest;
}

/**
 * The units a promotion adds to a forecast value.
 * @param {number} forecast
 * @param {{ readonly kind: PromotionKind | null; readonly value: number | null }} p
 * @returns {number}
 */
export function liftOf(forecast, p) {
  if (p.value === null) return 0;
  return p.kind === 'percent' ? Math.round((forecast * p.value) / 100) : p.value;
}

/**
 * `index`:  The week's index in the run.
 * `forecast`:  The forecast of the week before the promotion.
 * `lift`:  The units the promotion adds.
 *
 * @typedef {{
 *     readonly index: number;
 *     readonly weekStart: IsoDate;
 *     readonly kind: PromotionKind;
 *     readonly value: number;
 *     readonly forecast: number;
 *     readonly lift: number;
 *     readonly setAt: string;
 *     readonly setBy: unknown;
 *   }} AppliedPromotion
 */

/**
 * `skus`:  Per SKU: the forecast with its promotions, and the promotions applied.
 * `brands`, `total`:  The sum of their SKUs' promoted forecasts.
 * `cells`:  SKU × week cells of this run carrying a promotion.
 *
 * @typedef {{
 *     readonly skus: readonly {
 *       readonly skuCode: string;
 *       readonly forecast: readonly number[];
 *       readonly promotions: readonly AppliedPromotion[];
 *     }[];
 *     readonly brands: readonly { readonly key: string; readonly forecast: readonly number[] }[];
 *     readonly total: readonly number[];
 *     readonly cells: number;
 *   }} AppliedPromotions
 */

/**
 * The forecast with the promotions in force applied to their SKU × week. A
 * discontinued SKU, or a week from its end date, is fixed at zero and takes no
 * promotion.
 * @param {Pick<DemandForecastRun, 'weeks' | 'skus' | 'brands'>} run
 * @param {readonly PromotionRow[]} rows
 * @returns {AppliedPromotions}
 */
export function applyPromotions(run, rows) {
  const inForce = promotionsInForce(rows);
  let cells = 0;
  const skus = run.skus.map((s) => {
    /** @type {AppliedPromotion[]} */
    const promotions = [];
    const forecast = run.weeks.map((w, i) => {
      const p = inForce.get(promotionKey(s.skuCode, w));
      const ended = s.method === 'discontinued' || (s.endsOn !== null && w >= s.endsOn);
      if (!p || ended || p.kind === null || p.value === null) return s.forecast[i];
      const lift = liftOf(s.forecast[i], p);
      promotions.push({
        index: i,
        weekStart: w,
        kind: p.kind,
        value: p.value,
        forecast: s.forecast[i],
        lift,
        setAt: p.setAt,
        setBy: p.setBy
      });
      return s.forecast[i] + lift;
    });
    cells += promotions.length;
    return { skuCode: s.skuCode, forecast, promotions };
  });
  const bySku = new Map(skus.map((s) => /** @type {const} */ ([s.skuCode, s])));
  /** @param {readonly string[]} codes */
  const sumOf = (codes) =>
    run.weeks.map((_, i) => codes.reduce((a, c) => a + (bySku.get(c)?.forecast[i] ?? 0), 0));
  return {
    skus,
    brands: run.brands.map((b) => ({ key: b.key, forecast: sumOf(b.skuCodes) })),
    total: sumOf(run.skus.map((s) => s.skuCode)),
    cells
  };
}

/**
 * @typedef {{
 *     readonly withdraw?: unknown;
 *     readonly kind?: unknown;
 *     readonly value?: unknown;
 *   }} PromotionPayload
 */

/**
 * Why an entry, a change or a withdrawal is refused, or null. The ONE predicate:
 * the verb's policy hook calls it, and the target calls it again before it writes.
 * `run` is the engine's run (before promotions): the week and the SKU are read
 * from it, never from the form.
 * @param {Pick<DemandForecastRun, 'weeks' | 'skus' | 'excludedOem'>} run
 * @param {readonly PromotionRow[]} rows
 * @param {string} entityId the key
 * @param {PromotionPayload} payload
 * @returns {string | null}
 */
export function promotionRefusal(run, rows, entityId, payload) {
  const k = parsePromotionKey(entityId);
  if (!k) return 'PROMOTION_KEY_INVALID: a promotion is for one SKU and one week';
  if (run.excludedOem.some((o) => o.skuCode === k.skuCode)) {
    return `OEM_NOT_FORECAST: ${k.skuCode} is an OEM product; its demand is the brand's POs (ENG-D20)`;
  }
  const sku = run.skus.find((s) => s.skuCode === k.skuCode);
  if (!sku) return `UNKNOWN_SKU: ${k.skuCode} is not in the demand forecast`;
  if (sku.method === 'discontinued')
    return `SKU_DISCONTINUED: ${k.skuCode} is discontinued and forecast at zero`;
  if (!run.weeks.includes(k.weekStart)) {
    return `WEEK_NOT_IN_HORIZON: the week must be a forecast week from ${run.weeks[0]} to ${run.weeks[run.weeks.length - 1]}`;
  }
  if (sku.endsOn !== null && k.weekStart >= sku.endsOn) {
    return `SKU_ENDED: ${k.skuCode} is discontinued from ${sku.endsOn}; that week is fixed at zero`;
  }
  const current = promotionsInForce(rows).get(entityId);
  if (payload.withdraw === true) {
    return current
      ? null
      : `PROMOTION_NOT_FOUND: no promotion in force for ${k.skuCode} in ${k.weekStart}`;
  }
  const { kind, value } = payload;
  if (kind !== 'percent' && kind !== 'units')
    return 'PROMOTION_KIND_INVALID: the increase is a percentage or a number of units';
  if (typeof value !== 'number' || !Number.isFinite(value))
    return 'PROMOTION_VALUE_INVALID: the increase must be a number';
  if (kind === 'percent' && (value <= 0 || value > PROMOTION_PERCENT_MAX)) {
    return `PROMOTION_PERCENT_INVALID: the increase must be above 0% and at most ${PROMOTION_PERCENT_MAX}%`;
  }
  if (kind === 'units' && (!Number.isInteger(value) || value < 1 || value > PROMOTION_UNITS_MAX)) {
    return `PROMOTION_UNITS_INVALID: the increase must be a whole number of units from 1 to ${PROMOTION_UNITS_MAX}`;
  }
  if (current && current.kind === kind && current.value === value)
    return `NO_CHANGE: ${k.skuCode} in ${k.weekStart} already has this promotion`;
  return null;
}
