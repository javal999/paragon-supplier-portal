// ─────────────────────────────────────────────────────────────────────────────
// LEAD TIME BY STEP — DRC-6 (BL-192), SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10
// §3 "DRC-6 Lead time breakdown" [XLS Guidance].
//
// A supplier × material lead time is the sum of its steps, and the steps
// depend on the supply route:
//   · local                — machine queue + production + delivery.
//                            Ordering material is excluded.
//   · import               — ordering material (1–2 weeks) + machine queue
//                            + production + shipment.
//   · importedRawMaterial  — order to principal (4 weeks) + machine queue
//                            + production + shipment (6–8 weeks) + delivery.
//
// `leadTimeDays` on `MaterialSource` stays the field every existing reader
// uses. The steps sit beside it (`leadTimeRoute`, `leadTimeSteps`), and data
// health checks that they add up to it (`leadTimeStepsSum`).
//
// The total in weeks, rounded up, is what the rolling demand anticipation
// horizon reads (DRC-2 BR-01, wave 2) — `leadTimeBreakdown(...).totalWeeks`.
//
// ── PURITY (X-01) ───────────────────────────────────────────────────────────
//   Plain data in, plain data out. No clock, no store.
// ─────────────────────────────────────────────────────────────────────────────

/** @import { LeadTimeRoute, LeadTimeStep, LeadTimeStepId, MaterialSource } from './types' */

/**
 * DRC-6 — the steps of each route, in the order they happen [XLS Guidance].
 * @type {Readonly<Record<LeadTimeRoute, readonly LeadTimeStepId[]>>}
 */
export const LEAD_TIME_ROUTE_STEPS = Object.freeze({
  local: Object.freeze(
    /** @type {LeadTimeStepId[]} */ (['machineQueue', 'production', 'delivery'])
  ),
  import: Object.freeze(
    /** @type {LeadTimeStepId[]} */ (['orderingMaterial', 'machineQueue', 'production', 'shipment'])
  ),
  importedRawMaterial: Object.freeze(
    /** @type {LeadTimeStepId[]} */ ([
      'orderToPrincipal',
      'machineQueue',
      'production',
      'shipment',
      'delivery'
    ])
  )
});

/** @type {readonly LeadTimeRoute[]} */
export const LEAD_TIME_ROUTES = Object.freeze(
  /** @type {LeadTimeRoute[]} */ (Object.keys(LEAD_TIME_ROUTE_STEPS))
);

/**
 * `route`:  null when the source carries no steps.
 * `steps`:  The source's steps; empty when it carries none.
 * `totalDays`:  Σ steps; the record's `leadTimeDays` when it carries no steps.
 * `totalWeeks`:  `totalDays` in weeks, rounded up (DRC-2 BR-01 reads this).
 * `stepped`:  Whether the total comes from the steps.
 *
 * @typedef {{
 *   readonly route: LeadTimeRoute | null;
 *   readonly steps: readonly LeadTimeStep[];
 *   readonly totalDays: number;
 *   readonly totalWeeks: number;
 *   readonly stepped: boolean;
 * }} LeadTimeBreakdown
 */

/**
 * Days in weeks, rounded up (a part week is a whole planning week).
 * @param {number} days
 * @returns {number}
 */
export const daysToWeeksUp = (days) => Math.max(0, Math.ceil(days / 7));

/**
 * Σ of the steps' days.
 * @param {readonly LeadTimeStep[]} steps
 * @returns {number}
 */
export const sumOfSteps = (steps) => steps.reduce((n, s) => n + s.days, 0);

/**
 * DRC-6 — one source's lead time by step, its total in days and in weeks
 * (rounded up). A source without steps (a feed that does not carry them yet)
 * falls back to its `leadTimeDays`, with no steps and `stepped: false`.
 * @param {Pick<MaterialSource, 'leadTimeDays' | 'leadTimeRoute' | 'leadTimeSteps'>} source
 * @returns {LeadTimeBreakdown}
 */
export function leadTimeBreakdown(source) {
  const steps = source.leadTimeSteps ?? [];
  const stepped = steps.length > 0;
  const totalDays = stepped ? sumOfSteps(steps) : source.leadTimeDays;
  return {
    route: stepped ? (source.leadTimeRoute ?? null) : null,
    steps,
    totalDays,
    totalWeeks: daysToWeeksUp(totalDays),
    stepped
  };
}

/**
 * The data health check (`leadTimeStepsSum`): why a source's steps do not
 * add up to its `leadTimeDays`, or null when they do. Also names a step that
 * is negative or not a whole number of days, and a step that is not on the
 * source's route, since either makes the sum meaningless.
 * @param {Pick<MaterialSource, 'leadTimeDays' | 'leadTimeRoute' | 'leadTimeSteps'>} source
 * @returns {string | null}
 */
export function leadTimeStepsProblem(source) {
  const steps = source.leadTimeSteps ?? [];
  if (steps.length === 0) return null;
  const bad = steps.find((s) => !Number.isInteger(s.days) || s.days < 0);
  if (bad) return `${bad.step} ${bad.days}`;
  const allowed = source.leadTimeRoute ? LEAD_TIME_ROUTE_STEPS[source.leadTimeRoute] : undefined;
  if (!allowed) return `route ${String(source.leadTimeRoute)}`;
  const off = steps.find((s) => !allowed.includes(s.step));
  if (off) return `${off.step} ∉ ${source.leadTimeRoute}`;
  const sum = sumOfSteps(steps);
  return sum === source.leadTimeDays ? null : `Σ ${sum} ≠ ${source.leadTimeDays}`;
}

/**
 * Split a total over a route's steps by weights, in whole days, so the parts
 * add up to the total exactly (largest remainder): each step gets
 * floor(total × weight ÷ Σ weights), and the days left go one each to the
 * steps with the largest fractional part (ties: route order). A step the
 * weights do not name gets weight 0.
 * @param {LeadTimeRoute} route
 * @param {number} totalDays  A whole number of days, 0 or more.
 * @param {Readonly<Partial<Record<LeadTimeStepId, number>>>} weights
 * @returns {LeadTimeStep[]}
 */
export function splitLeadTime(route, totalDays, weights) {
  const ids = LEAD_TIME_ROUTE_STEPS[route];
  const w = ids.map((id) => Math.max(0, weights[id] ?? 0));
  const wSum = w.reduce((a, b) => a + b, 0);
  if (wSum === 0) throw new Error(`splitLeadTime: no weight for any step of '${route}'`);
  const exact = w.map((x) => (totalDays * x) / wSum);
  const days = exact.map((x) => Math.floor(x));
  let left = totalDays - days.reduce((a, b) => a + b, 0);
  const byFraction = ids
    .map((_, i) => i)
    .sort((a, b) => exact[b] - days[b] - (exact[a] - days[a]) || a - b);
  for (const i of byFraction) {
    if (left <= 0) break;
    days[i] += 1;
    left -= 1;
  }
  return ids.map((step, i) => ({ step, days: days[i] }));
}
