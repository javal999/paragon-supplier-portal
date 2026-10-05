import type { TFunction } from 'i18next';

// ─────────────────────────────────────────────────────────────────────────────
// THE 13 BUYER FORECAST PAGES — where each sits in the cycle (F-05, F-19).
//
// Forecast UX phase 1, task A4. One row per page: its route, the menu section
// that holds it (task A1's `weeklyPlan`, `review` or `planningEngine`), the key
// of its name, and the pages its purpose header links to as "Uses" (the step
// before) and "Next" (the step after).
//
// The links follow the menu order: This week (phase 2, B1) → What to order → Make warehouse room
// → Publish to suppliers → Supplier responses → Supplier performance → Forecast
// quality → End-of-cycle stock check, and back to What to order for the next
// cycle. An engine page links to the page whose input it is, or that reaches
// it (`fux-build-00-brief.md`, "Reached from").
//
// FUX phase 2 B2 (F-01): Published versions is no longer a page. It is the
// `?tab=versions` tab of Publish to suppliers, so it has no row here; its old
// route redirects to the tab (FUX2-R1).
//
// A weekly or review page is named by its menu label (`hub.nav.pti.*`), so the
// title and the menu cannot drift. An engine page keeps its own title.
// ─────────────────────────────────────────────────────────────────────────────

export type ForecastPageId =
  | 'thisWeek'
  | 'whatToOrder'
  | 'makeRoom'
  | 'publish'
  | 'responses'
  | 'forecastQuality'
  | 'stockCheck'
  | 'materialRequirement'
  | 'safetyStock'
  | 'forecastBias'
  | 'dataHealth'
  | 'modelBacktest'
  | 'reliability';

/** A page a purpose header may link to: one of the 13, or the Supplier scorecard. */
export type ForecastLinkTarget = ForecastPageId | 'performance';

type SectionKey = 'hub.nav.section.weeklyPlan' | 'hub.nav.section.review' | 'hub.nav.section.planningEngine';

interface PageTarget {
  readonly path: string;
  readonly titleKey: string;
}

interface ForecastPage extends PageTarget {
  readonly sectionKey: SectionKey;
  readonly uses: ForecastLinkTarget;
  readonly next: ForecastLinkTarget;
}

const WEEKLY: SectionKey = 'hub.nav.section.weeklyPlan';
const REVIEW: SectionKey = 'hub.nav.section.review';
const ENGINE: SectionKey = 'hub.nav.section.planningEngine';

export const FORECAST_PAGES: Readonly<Record<ForecastPageId, ForecastPage>> = Object.freeze({
  // FUX phase 2 B1 (F-03) — the cycle's starting point: it checks the inputs
  // (Data health) and hands over to What to order.
  thisWeek: { path: '/buyer/this-week', titleKey: 'hub.nav.pti.thisWeek', sectionKey: WEEKLY, uses: 'dataHealth', next: 'whatToOrder' },
  whatToOrder: { path: '/buyer/order-plan', titleKey: 'hub.nav.pti.whatToOrder', sectionKey: WEEKLY, uses: 'thisWeek', next: 'makeRoom' },
  makeRoom: { path: '/buyer/reschedule', titleKey: 'hub.nav.pti.makeRoom', sectionKey: WEEKLY, uses: 'whatToOrder', next: 'publish' },
  publish: { path: '/buyer/stabilise', titleKey: 'hub.nav.pti.publishToSuppliers', sectionKey: WEEKLY, uses: 'makeRoom', next: 'responses' },
  responses: { path: '/buyer/collaboration', titleKey: 'hub.nav.pti.supplierResponses', sectionKey: WEEKLY, uses: 'publish', next: 'performance' },
  forecastQuality: { path: '/buyer/demand-forecast', titleKey: 'hub.nav.pti.forecastQuality', sectionKey: REVIEW, uses: 'performance', next: 'stockCheck' },
  stockCheck: { path: '/buyer/fs-reconcile', titleKey: 'hub.nav.pti.stockCheck', sectionKey: REVIEW, uses: 'forecastQuality', next: 'whatToOrder' },
  materialRequirement: { path: '/buyer/material-requirement', titleKey: 'mrq.title', sectionKey: ENGINE, uses: 'safetyStock', next: 'whatToOrder' },
  safetyStock: { path: '/buyer/safety-stock', titleKey: 'sst.title', sectionKey: ENGINE, uses: 'reliability', next: 'whatToOrder' },
  forecastBias: { path: '/buyer/forecast-bias', titleKey: 'fb.title', sectionKey: ENGINE, uses: 'forecastQuality', next: 'modelBacktest' },
  dataHealth: { path: '/buyer/data-health', titleKey: 'dh.title', sectionKey: ENGINE, uses: 'stockCheck', next: 'whatToOrder' },
  modelBacktest: { path: '/buyer/model-backtest', titleKey: 'mb.title', sectionKey: ENGINE, uses: 'forecastBias', next: 'forecastQuality' },
  reliability: { path: '/buyer/reliability', titleKey: 'rel.pti.title', sectionKey: ENGINE, uses: 'performance', next: 'makeRoom' },
});

const PERFORMANCE: PageTarget = { path: '/buyer/scorecard', titleKey: 'hub.nav.pti.performance' };

/**
 * The Supplier scorecard is not one of the forecast pages, but it is the
 * "performance" step that Uses/Next links point to, so its own place in the
 * cycle is stated here beside the others (phase 2, B6).
 */
export const PERFORMANCE_PLACE: { readonly uses: ForecastLinkTarget; readonly next: ForecastLinkTarget } = Object.freeze({
  uses: 'responses',
  next: 'forecastQuality',
});

/** Where a purpose-header link goes, and the key of the name it shows. */
export function linkTarget(target: ForecastLinkTarget): PageTarget {
  return target === 'performance' ? PERFORMANCE : FORECAST_PAGES[target];
}

/** The page's title, in the active language. */
export function forecastTitle(t: TFunction, page: ForecastPageId): string {
  return t(FORECAST_PAGES[page].titleKey);
}

/** The page's crumb: its menu section, then its own name. */
export function forecastCrumb(t: TFunction, page: ForecastPageId): string[] {
  const p = FORECAST_PAGES[page];
  return [t(p.sectionKey), t(p.titleKey)];
}
