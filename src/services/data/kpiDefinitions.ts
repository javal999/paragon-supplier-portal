// ─────────────────────────────────────────────────────────────────────────────
// KPI DEFINITIONS — BL-53 (BL-19 decided 2026-09-21: definitions first, a
// 3-month baseline, then targets).
//
// What the two calculated measures on the performance pages ACTUALLY compute,
// stated for suppliers and buyers alike: the delivery window, whether early
// counts, the grain, and whether a date change resets the clock.
//
// ⚠️ **THIS FILE DESCRIBES THE CODE; IT DOES NOT DEFINE THE MEASURE.** The
// measure is `performanceRules.ts` over `callOffRules.ts` (CR-06 to CR-08) and
// `poCfot`. Every number below is READ from the constants those modules use,
// and `kpiDefinitions.bl53.test.ts` fires the real functions at each stated
// boundary — so if the arithmetic changes and this text does not, a named test
// goes red. Where the code differs from the decided wording in the
// requirements, the page shows what the code does (and the difference is
// reported, not silently fixed).
//
// ⚠️ **NO TARGET IS SHOWN.** BL-19 decided to measure a baseline before any
// target is set, so both measures read "Baseline period" and the CR-17 90%
// no longer colours or annotates them on these pages.
// ─────────────────────────────────────────────────────────────────────────────

import { DELIVERY_GRACE_DAYS, MATCH_WINDOW_DAYS } from '../delivery/fulfillment';

/** BL-19 — the baseline is measured for this many months before a target is set. */
export const BASELINE_MONTHS = 3;

/** The questions BL-19 said every definition must answer, in its order. */
export const KPI_QUESTIONS = ['window', 'early', 'grain', 'dateChange', 'inFull'] as const;
export type KpiQuestion = (typeof KPI_QUESTIONS)[number];

export interface KpiDefinition {
  readonly id: 'otif' | 'cfot';
  /** The measure's name on the page (the `perf.*` key the KPI card already uses). */
  readonly nameKey: string;
  /** One answer per BL-19 question — an i18n key and the numbers it states. */
  readonly answers: Readonly<Record<KpiQuestion, { readonly key: string; readonly values?: Readonly<Record<string, number>> }>>;
}

export const KPI_DEFINITIONS: readonly KpiDefinition[] = Object.freeze([
  {
    id: 'otif',
    nameKey: 'perf.otif',
    answers: {
      // CR-06 / CR-07: a receipt counts toward a delivery when it is within
      // MATCH_WINDOW_DAYS of the approved date (either side); on time = on or
      // before that date; nothing received DELIVERY_GRACE_DAYS after it = missed.
      window: { key: 'perf.kpi.otif.window', values: { match: MATCH_WINDOW_DAYS, grace: DELIVERY_GRACE_DAYS } },
      // Early counts as on time — but only inside the match window.
      early: { key: 'perf.kpi.otif.early', values: { match: MATCH_WINDOW_DAYS } },
      // BR-02 / BR-06: per call-off; % of the call-offs due in the period whose
      // result is decided; one still pending is left out.
      grain: { key: 'perf.kpi.otif.grain' },
      // `approvedDeliveries`: the accepted confirmation's dates, else the
      // released need date — so a planner's change moves the date at once.
      dateChange: { key: 'perf.kpi.otif.dateChange' },
      // CR-08: the ONE matched receipt against the approved quantity.
      inFull: { key: 'perf.kpi.otif.inFull' },
    },
  },
  {
    id: 'cfot',
    nameKey: 'perf.cfot',
    answers: {
      // `poCfot`: received on or before the confirmed date; no earliest date.
      window: { key: 'perf.kpi.cfot.window' },
      early: { key: 'perf.kpi.cfot.early' },
      // BR-01 / BR-05: per PO, by quantity; a period takes the POs whose
      // confirmed date falls in it.
      grain: { key: 'perf.kpi.cfot.grain' },
      // `confirmedLine`: a counter-offer's line date and quantity from the
      // moment it is SENT (the guard only falls back on a review that is not
      // 'accepted', and a waiting counter-offer has no review) — although its
      // own comment says it binds only once accepted. Stated as the code does
      // it; the difference is reported under BL-53, not silently fixed.
      dateChange: { key: 'perf.kpi.cfot.dateChange' },
      inFull: { key: 'perf.kpi.cfot.inFull' },
    },
  },
]);
