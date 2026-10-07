/** @import { DataHealthReport, EngineStep } from '@services/engine/dataHealth' */
import { selectionEffect } from '@services/engine/reschedule';
/** @import { ForecastCommitmentLine, ForecastVersionView, OrderPlanView, RescheduleView } from '@services/data/types' */
/** @import { ForecastStream } from '@services/sdc/types' */
import { isException } from '@services/transitions/forecastRules';
import { isLive } from '@services/liveness';

// ─────────────────────────────────────────────────────────────────────────────
// THE WEEKLY CYCLE'S NUMBERS — Forecast UX phase 2, task B1 (F-02, F-03, F-05).
//
// One number per Weekly plan step, for the "This week" page and the cycle step
// bar. Each is read from the data the step's own page reads, by the rule that
// page applies, so the start page cannot disagree with the page it links to
// (FUX2-R3: nothing here is stored; every status is derived at render).
//
// Pure functions only: no hook, store or verb (B1 constraints). The callers
// read the existing query hooks and pass the data in.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Failing quality checks. With a step: the checks of every feed whose failure
 * reaches that step (the report's own `affects`), which is what a result page's
 * Data health chip shows. Without a step: every failing check, the input check
 * on "This week". The one count; `DataHealthChip` reads it too.
 * @param {DataHealthReport} report
 * @param {EngineStep} [step]
 * @returns {number}
 */
export function failingChecks(report, step) {
  return report.feeds
    .filter((f) => step === undefined || f.affects.includes(step))
    .flatMap((f) => f.checks)
    .filter((c) => !c.passed).length;
}

/**
 * What to order: the page's headline, "Recommended orders" — its KPI reads
 * `w.after.orders` for the warehouse shown; this sums both warehouses, so the
 * card counts every order the page can list.
 * @param {OrderPlanView} run
 * @returns {number}
 */
export function recommendedOrders(run) {
  return run.warehouses.reduce((sum, w) => sum + w.after.orders, 0);
}

/**
 * What to order: the earliest release week of any recommended order, both
 * warehouses — the page's "Release in" column (`releaseWeek`). Null when the
 * plan recommends nothing.
 * @param {OrderPlanView} run
 * @returns {string | null}
 */
export function firstReleaseWeek(run) {
  return run.warehouses
    .flatMap((w) => w.materials.flatMap((m) => m.recommendations.map((r) => r.releaseWeek)))
    .reduce(
      (min, wk) => (min === null || wk < min ? wk : min),
      /** @type {string | null} */ (null)
    );
}

/**
 * Make warehouse room: weeks over owned capacity with nothing yet selected, both
 * warehouses. The page's fill table marks a week "Cannot be relieved by open
 * orders" or "Over capacity" by exactly this rule (`selectionEffect` with an
 * empty selection is the page's starting fill).
 * @param {RescheduleView} run
 * @returns {number}
 */
export function weeksOverCapacity(run) {
  return run.warehouses.reduce((sum, w) => {
    const fill = selectionEffect(w, new Set(), run.costs).fill;
    return sum + w.weeks.filter((wk, i) => wk.onHandOverPallets > 0 || fill[i] > 1).length;
  }, 0);
}

/**
 * Publish to suppliers: the current published version of each stream, as the page lists them.
 * @param {readonly ForecastVersionView[]} items
 * @returns {ForecastVersionView[]}
 */
export function currentVersions(items) {
  return /** @satisfies {readonly ForecastStream[]} */ (
    /** @type {const} */ (['packaging', 'rawMaterial'])
  )
    .map((stream) => items.find((v) => v.stream === stream && v.isCurrent))
    .filter(/** @returns {v is ForecastVersionView} */ (v) => v !== undefined);
}

/**
 * Publish is withheld while the engine data is simulated (X-03), the page's own test.
 * @returns {boolean}
 */
export function publishWithheld() {
  return !isLive('engineDataset');
}

/**
 * Supplier responses: open exceptions, both streams (the page lists one stream at a time).
 * @param {readonly ForecastCommitmentLine[]} lines
 * @param {string} nowIso
 * @returns {number}
 */
export function openExceptions(lines, nowIso) {
  return lines.filter((l) => isException(l, nowIso)).length;
}

/** The weekly cycle's 5 steps, in order (evaluation §4–§5). Each is a page in `FORECAST_PAGES`. */
export const CYCLE_STEPS = /** @type {const} */ ([
  'thisWeek',
  'whatToOrder',
  'makeRoom',
  'publish',
  'responses'
]);
/** @typedef {(typeof CYCLE_STEPS)[number]} CycleStepId */

/**
 * The engine step each Weekly plan page's Data health chip names (the pages'
 * own `DataHealthChip step=…`). Supplier responses carries no chip; This week
 * counts every check (its input check card). Read by the publish checklist
 * (`BuyerStabilise`, B2); restored after #140 removed it while that reader stood.
 * @type {Readonly<Partial<Record<CycleStepId, EngineStep>>>}
 */
export const STEP_HEALTH = Object.freeze({
  whatToOrder: 'E14-05',
  makeRoom: 'E14-13',
  publish: 'E14-03'
});
