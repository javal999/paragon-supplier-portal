/** @import { TFunction } from 'i18next' */

// ─────────────────────────────────────────────────────────────────────────────
// THE BUYER FORECAST PAGES — where each sits in the cycle (F-05, F-19).
//
// Forecast UX phase 1, task A4. One row per page: its route, the menu section
// that holds it (task A1's `weeklyPlan`, `review` or `planningEngine`), the key
// of its name, and the pages its purpose header links to as "Uses" (the step
// before) and "Next" (the step after).
//
// The links follow the menu order: This week (phase 2, B1) → What to order → Make warehouse room
// → Publish to suppliers → Foresight commitments → Demand anticipation (DA), and
// back to This week for the next cycle. FSR-D3 (BL-251, U-11): DA is step 6,
// after Foresight commitments; this supersedes IA-BUILD-DECISIONS D-19, where
// the cycle returned to This week after Foresight commitments (IA P-07). DA's
// "Uses" is Publish to suppliers, the version its figures are checked against,
// as BL-251 names it; its strip neighbour stays Foresight commitments. The
// Review pages run Supplier performance → Forecast quality → Feedstock
// reconcile, and back to What to order. An engine page links to the page whose
// input it is, or that reaches it (`fux-build-00-brief.md`, "Reached from").
//
// FUX phase 2 B2 (F-01): Published versions is no longer a page. It is the
// `?tab=versions` tab of Publish to suppliers, so it has no row here; its old
// route redirects to the tab (FUX2-R1).
//
// A weekly or review page is named by its menu label (`hub.nav.pti.*`), so the
// title and the menu cannot drift. An engine page keeps its own title.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {| 'thisWeek'
 *   | 'whatToOrder'
 *   | 'makeRoom'
 *   | 'publish'
 *   | 'responses'
 *   | 'demandAnticipation'
 *   | 'forecastQuality'
 *   | 'stockCheck'
 *   | 'materialRequirement'
 *   | 'safetyStock'
 *   | 'dataHealth'
 *   | 'modelBacktest'
 *   | 'reliability'} ForecastPageId
 */

/** A page a purpose header may link to: one of the forecast pages, or the Supplier scorecard. */
/** @typedef {ForecastPageId | 'performance'} ForecastLinkTarget */

/** @typedef {'hub.nav.section.weeklyPlan' | 'hub.nav.section.review' | 'hub.nav.section.planningEngine'} SectionKey */

/**
 * @typedef {{
 *     readonly path: string;
 *     readonly titleKey: string;
 *   }} PageTarget
 */

/**
 * @typedef {PageTarget & {
 *     readonly sectionKey: SectionKey;
 *     readonly uses: ForecastLinkTarget;
 *     readonly next: ForecastLinkTarget;
 *   }} ForecastPage
 */

/** @type {SectionKey} */
const WEEKLY = 'hub.nav.section.weeklyPlan';
/** @type {SectionKey} */
const REVIEW = 'hub.nav.section.review';
/** @type {SectionKey} */
const ENGINE = 'hub.nav.section.planningEngine';

/** @type {Readonly<Record<ForecastPageId, ForecastPage>>} */
export const FORECAST_PAGES = Object.freeze({
  // FUX phase 2 B1 (F-03) — the cycle's starting point: it checks the inputs
  // (Data health) and hands over to What to order.
  thisWeek: {
    path: '/buyer/this-week',
    titleKey: 'hub.nav.pti.thisWeek',
    sectionKey: WEEKLY,
    uses: 'dataHealth',
    next: 'whatToOrder'
  },
  whatToOrder: {
    path: '/buyer/order-plan',
    titleKey: 'hub.nav.pti.whatToOrder',
    sectionKey: WEEKLY,
    uses: 'thisWeek',
    next: 'makeRoom'
  },
  makeRoom: {
    path: '/buyer/reschedule',
    titleKey: 'hub.nav.pti.makeRoom',
    sectionKey: WEEKLY,
    uses: 'whatToOrder',
    next: 'publish'
  },
  publish: {
    path: '/buyer/stabilise',
    titleKey: 'hub.nav.pti.publishToSuppliers',
    sectionKey: WEEKLY,
    uses: 'makeRoom',
    next: 'responses'
  },
  responses: {
    path: '/buyer/collaboration',
    titleKey: 'hub.nav.pti.supplierResponses',
    sectionKey: WEEKLY,
    uses: 'publish',
    // FSR-D3 (BL-251) — step 6, Demand anticipation (DA), follows; the cycle
    // then ends back at This week, inside its own section (IA P-07, IA-B10).
    next: 'demandAnticipation'
  },
  // FSR-D3 (BL-251, U-11) — Demand anticipation (DA) is step 6 of the weekly
  // strip: after Foresight commitments, and back to This week for the next
  // cycle. Supersedes IA-BUILD-DECISIONS D-19. The page reads the hub sample
  // (LTP, SAP stock, call-offs), not the engine dataset (FSR-D1).
  demandAnticipation: {
    path: '/buyer/demand-anticipation',
    titleKey: 'hub.nav.pti.demandAnticipation',
    sectionKey: WEEKLY,
    uses: 'publish',
    next: 'thisWeek'
  },
  forecastQuality: {
    path: '/buyer/demand-forecast',
    titleKey: 'hub.nav.pti.forecastQuality',
    sectionKey: REVIEW,
    uses: 'performance',
    next: 'stockCheck'
  },
  // DRC-15a: the Feedstock reconcile (was the End-of-cycle stock check); the id
  // and route are kept so links and the menu key stay as they are.
  stockCheck: {
    path: '/buyer/fs-reconcile',
    titleKey: 'hub.nav.pti.stockCheck',
    sectionKey: REVIEW,
    uses: 'forecastQuality',
    next: 'whatToOrder'
  },
  materialRequirement: {
    path: '/buyer/material-requirement',
    titleKey: 'mrq.title',
    sectionKey: ENGINE,
    uses: 'safetyStock',
    next: 'whatToOrder'
  },
  safetyStock: {
    path: '/buyer/safety-stock',
    titleKey: 'sst.title',
    sectionKey: ENGINE,
    uses: 'reliability',
    next: 'whatToOrder'
  },
  dataHealth: {
    path: '/buyer/data-health',
    titleKey: 'dh.title',
    sectionKey: ENGINE,
    uses: 'stockCheck',
    next: 'whatToOrder'
  },
  // FUX phase 2 B5 — Forecast bias is now Forecast quality's bias tab, so the backtest's Uses link goes there.
  modelBacktest: {
    path: '/buyer/model-backtest',
    titleKey: 'mb.title',
    sectionKey: ENGINE,
    uses: 'forecastQuality',
    next: 'forecastQuality'
  },
  reliability: {
    path: '/buyer/reliability',
    titleKey: 'rel.pti.title',
    sectionKey: ENGINE,
    uses: 'performance',
    next: 'makeRoom'
  }
});

/** @type {PageTarget} */
const PERFORMANCE = { path: '/buyer/scorecard', titleKey: 'hub.nav.pti.performance' };

/**
 * The Supplier scorecard is not one of the forecast pages, but it is the
 * "performance" step that Uses/Next links point to, so its own place in the
 * cycle is stated here beside the others (phase 2, B6).
 * @type {{ readonly uses: ForecastLinkTarget; readonly next: ForecastLinkTarget }}
 */
export const PERFORMANCE_PLACE = Object.freeze({
  uses: 'responses',
  next: 'forecastQuality'
});

/**
 * Where a purpose-header link goes, and the key of the name it shows.
 * @param {ForecastLinkTarget} target
 * @returns {PageTarget}
 */
export function linkTarget(target) {
  return target === 'performance' ? PERFORMANCE : FORECAST_PAGES[target];
}

/**
 * The page's title, in the active language.
 * @param {TFunction} t
 * @param {ForecastPageId} page
 * @returns {string}
 */
export function forecastTitle(t, page) {
  return t(FORECAST_PAGES[page].titleKey);
}

/**
 * The page's crumb: its menu section, then its own name.
 * @param {TFunction} t
 * @param {ForecastPageId} page
 * @returns {string[]}
 */
export function forecastCrumb(t, page) {
  const p = FORECAST_PAGES[page];
  return [t(p.sectionKey), t(p.titleKey)];
}
