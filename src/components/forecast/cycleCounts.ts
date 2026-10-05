import type { DataHealthReport, EngineStep } from '@services/engine/dataHealth';
import { selectionEffect } from '@services/engine/reschedule';
import type {
  ForecastCommitmentLine,
  ForecastVersionView,
  OrderPlanView,
  RescheduleView
} from '@services/data/types';
import type { ForecastStream } from '@services/sdc/types';
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
 */
export function failingChecks(report: DataHealthReport, step?: EngineStep): number {
  return report.feeds
    .filter((f) => step === undefined || f.affects.includes(step))
    .flatMap((f) => f.checks)
    .filter((c) => !c.passed).length;
}

/**
 * What to order: the page's headline, "Recommended orders" — its KPI reads
 * `w.after.orders` for the warehouse shown; this sums both warehouses, so the
 * card counts every order the page can list.
 */
export function recommendedOrders(run: OrderPlanView): number {
  return run.warehouses.reduce((sum, w) => sum + w.after.orders, 0);
}

/**
 * What to order: the earliest release week of any recommended order, both
 * warehouses — the page's "Release in" column (`releaseWeek`). Null when the
 * plan recommends nothing.
 */
export function firstReleaseWeek(run: OrderPlanView): string | null {
  return run.warehouses
    .flatMap((w) => w.materials.flatMap((m) => m.recommendations.map((r) => r.releaseWeek)))
    .reduce<string | null>((min, wk) => (min === null || wk < min ? wk : min), null);
}

/**
 * Make warehouse room: weeks over owned capacity with nothing yet selected, both
 * warehouses. The page's fill table marks a week "Cannot be relieved by open
 * orders" or "Over capacity" by exactly this rule (`selectionEffect` with an
 * empty selection is the page's starting fill).
 */
export function weeksOverCapacity(run: RescheduleView): number {
  return run.warehouses.reduce((sum, w) => {
    const fill = selectionEffect(w, new Set(), run.costs).fill;
    return sum + w.weeks.filter((wk, i) => wk.onHandOverPallets > 0 || fill[i] > 1).length;
  }, 0);
}

/** Publish to suppliers: the current published version of each stream, as the page lists them. */
export function currentVersions(items: readonly ForecastVersionView[]): ForecastVersionView[] {
  return (['packaging', 'rawMaterial'] as const satisfies readonly ForecastStream[])
    .map((stream) => items.find((v) => v.stream === stream && v.isCurrent))
    .filter((v): v is ForecastVersionView => v !== undefined);
}

/** Publish is withheld while the engine data is simulated (X-03), the page's own test. */
export function publishWithheld(): boolean {
  return !isLive('engineDataset');
}

/** Supplier responses: open exceptions, both streams (the page lists one stream at a time). */
export function openExceptions(lines: readonly ForecastCommitmentLine[], nowIso: string): number {
  return lines.filter((l) => isException(l, nowIso)).length;
}

/** The weekly cycle's 5 steps, in order (evaluation §4–§5). Each is a page in `FORECAST_PAGES`. */
export const CYCLE_STEPS = ['thisWeek', 'whatToOrder', 'makeRoom', 'publish', 'responses'] as const;
export type CycleStepId = (typeof CYCLE_STEPS)[number];

/**
 * The engine step each Weekly plan page's Data health chip names (the pages'
 * own `DataHealthChip step=…`). Supplier responses carries no chip; This week
 * counts every check (its input check card).
 */
export const STEP_HEALTH: Readonly<Partial<Record<CycleStepId, EngineStep>>> = Object.freeze({
  whatToOrder: 'E14-05',
  makeRoom: 'E14-13',
  publish: 'E14-03'
});
