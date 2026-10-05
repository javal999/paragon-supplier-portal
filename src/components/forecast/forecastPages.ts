import type { TFunction } from 'i18next';

// ─────────────────────────────────────────────────────────────────────────────
// THE 13 BUYER FORECAST PAGES — where each sits in the cycle (F-05, F-19).
//
// Forecast UX phase 1, task A4. One row per page: its route, the menu section
// that holds it (task A1's `weeklyPlan`, `review` or `planningEngine`), the key
// of its name, and the pages its purpose header links to as "Uses" (the step
// before) and "Next" (the step after).
//
// The links follow the phase 1 menu order: What to order → Make warehouse room
// → Publish to suppliers → Supplier responses → Supplier performance → Forecast
// quality → End-of-cycle stock check, and back to What to order for the next
// cycle. An engine page links to the page whose input it is, or that reaches
// it (`fux-build-00-brief.md`, "Reached from").
//
// A weekly or review page is named by its menu label (`hub.nav.pti.*`), so the
// title and the menu cannot drift. An engine page keeps its own title.
// ─────────────────────────────────────────────────────────────────────────────

export type ForecastPageId =
  | 'whatToOrder'
  | 'makeRoom'
  | 'publish'
  | 'responses'
  | 'forecastQuality'
  | 'stockCheck'
  | 'materialRequirement'
  | 'safetyStock'
  | 'publishedVersions'
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
  whatToOrder: { path: '/buyer/order-plan', titleKey: 'hub.nav.pti.whatToOrder', sectionKey: WEEKLY, uses: 'materialRequirement', next: 'makeRoom' },
  makeRoom: { path: '/buyer/reschedule', titleKey: 'hub.nav.pti.makeRoom', sectionKey: WEEKLY, uses: 'whatToOrder', next: 'publish' },
  publish: { path: '/buyer/stabilise', titleKey: 'hub.nav.pti.publishToSuppliers', sectionKey: WEEKLY, uses: 'makeRoom', next: 'responses' },
  responses: { path: '/buyer/collaboration', titleKey: 'hub.nav.pti.supplierResponses', sectionKey: WEEKLY, uses: 'publish', next: 'performance' },
  forecastQuality: { path: '/buyer/demand-forecast', titleKey: 'hub.nav.pti.forecastQuality', sectionKey: REVIEW, uses: 'performance', next: 'stockCheck' },
  stockCheck: { path: '/buyer/fs-reconcile', titleKey: 'hub.nav.pti.stockCheck', sectionKey: REVIEW, uses: 'forecastQuality', next: 'whatToOrder' },
  materialRequirement: { path: '/buyer/material-requirement', titleKey: 'mrq.title', sectionKey: ENGINE, uses: 'safetyStock', next: 'whatToOrder' },
  safetyStock: { path: '/buyer/safety-stock', titleKey: 'sst.title', sectionKey: ENGINE, uses: 'reliability', next: 'whatToOrder' },
  publishedVersions: { path: '/buyer/forecasts', titleKey: 'fc.pti.versions.title', sectionKey: ENGINE, uses: 'publish', next: 'responses' },
  forecastBias: { path: '/buyer/forecast-bias', titleKey: 'fb.title', sectionKey: ENGINE, uses: 'forecastQuality', next: 'modelBacktest' },
  dataHealth: { path: '/buyer/data-health', titleKey: 'dh.title', sectionKey: ENGINE, uses: 'stockCheck', next: 'whatToOrder' },
  modelBacktest: { path: '/buyer/model-backtest', titleKey: 'mb.title', sectionKey: ENGINE, uses: 'forecastBias', next: 'forecastQuality' },
  reliability: { path: '/buyer/reliability', titleKey: 'rel.pti.title', sectionKey: ENGINE, uses: 'performance', next: 'makeRoom' },
});

const PERFORMANCE: PageTarget = { path: '/buyer/scorecard', titleKey: 'hub.nav.pti.performance' };

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
