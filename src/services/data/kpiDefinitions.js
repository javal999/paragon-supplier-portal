// ─────────────────────────────────────────────────────────────────────────────
// KPI DEFINITIONS — BL-53 (BL-19 decided 2026-09-21: definitions first, a
// 3-month baseline, then targets).
//
// What the two calculated measures on the performance pages ACTUALLY compute,
// stated for suppliers and buyers alike: the delivery window, whether early
// counts, the grain, and whether a date change resets the clock.
//
// ⚠️ **THIS FILE DESCRIBES THE CODE; IT DOES NOT DEFINE THE MEASURE.** The
// measure is `performanceRules.js` over `callOffRules.js` (CR-06 to CR-08) and
// `poCfot`. Every number below is READ from the constants those modules use,
// and `kpiDefinitions.bl53.test.js` fires the real functions at each stated
// boundary — so if the arithmetic changes and this text does not, a named test
// goes red. Where the code differs from the decided wording in the
// requirements, the page shows what the code does (and the difference is
// reported, not silently fixed). Since BL-82 the five BL-66 differences are
// closed and the text describes the aligned calculation; the early window is
// decided for an unconfirmed receipt (KPI-2, `kpiWindow.js`); a confirmed
// early date counting as on time is BL-234, not built.
//
// ⚠️ **NO TARGET IS SHOWN.** BL-19 decided to measure a baseline before any
// target is set, so both measures read "Baseline period" and the CR-17 90%
// no longer colours or annotates them on these pages.
// ─────────────────────────────────────────────────────────────────────────────

import { DELIVERY_GRACE_DAYS, MATCH_WINDOW_DAYS } from '../delivery/fulfillment';
import { EARLY_DELIVERY_WINDOW_DAYS } from './kpiWindow';

/** BL-19 — the baseline is measured for this many months before a target is set. */
export const BASELINE_MONTHS = 3;

/** The questions BL-19 said every definition must answer, in its order. */
export const KPI_QUESTIONS = /** @type {const} */ ([
  'window',
  'early',
  'grain',
  'dateChange',
  'inFull'
]);
/** @typedef {(typeof KPI_QUESTIONS)[number]} KpiQuestion */

/**
 * `nameKey`:  The measure's name on the page (the `perf.*` key the KPI card already uses).
 * `answers`:  One answer per BL-19 question — an i18n key and the numbers it states.
 *
 * @typedef {{
 *   readonly id: 'otif' | 'cfot';
 *   readonly nameKey: string;
 *   readonly answers: Readonly<Record<KpiQuestion, { readonly key: string; readonly values?: Readonly<Record<string, number>> }>>;
 * }} KpiDefinition
 */

/** @type {readonly KpiDefinition[]} */
export const KPI_DEFINITIONS = Object.freeze(
  /** @type {KpiDefinition[]} */ ([
    {
      id: 'otif',
      nameKey: 'perf.otif',
      answers: {
        // CR-06 / CR-07: a receipt counts toward a delivery when it arrives no
        // more than EARLY_DELIVERY_WINDOW_DAYS before the approved date and no
        // more than MATCH_WINDOW_DAYS after it; on time = on or before that
        // date; nothing received DELIVERY_GRACE_DAYS after it = missed, even when
        // dispatched (BL-66 (5)).
        window: {
          key: 'perf.kpi.otif.window',
          values: {
            early: EARLY_DELIVERY_WINDOW_DAYS,
            match: MATCH_WINDOW_DAYS,
            grace: DELIVERY_GRACE_DAYS
          }
        },
        // BL-66 (4): early counts as on time only inside the ONE shared window —
        // the same value CFOT reads (KPI-2; confirmed early dates: BL-234).
        early: { key: 'perf.kpi.otif.early', values: { early: EARLY_DELIVERY_WINDOW_DAYS } },
        // BR-02 / BR-06: per call-off; % of the call-offs due in the period whose
        // result is decided; one still pending is left out.
        grain: { key: 'perf.kpi.otif.grain' },
        // `approvedDeliveries` (BL-66 (2)): the accepted confirmation's dates,
        // else what both sides last agreed, else the released need date.
        dateChange: { key: 'perf.kpi.otif.dateChange' },
        // CR-08 (BL-66 (3)): the SUM of the receipts matched to the delivery.
        inFull: { key: 'perf.kpi.otif.inFull' }
      }
    },
    {
      id: 'cfot',
      nameKey: 'perf.cfot',
      answers: {
        // `poCfot` (BL-66 (4)): on or before the confirmed date, and no more
        // than EARLY_DELIVERY_WINDOW_DAYS before it — OTIF's early rule.
        window: { key: 'perf.kpi.cfot.window', values: { early: EARLY_DELIVERY_WINDOW_DAYS } },
        early: { key: 'perf.kpi.cfot.early', values: { early: EARLY_DELIVERY_WINDOW_DAYS } },
        // BR-01 / BR-05: per PO, by quantity; a period takes the POs whose
        // confirmed date falls in it.
        grain: { key: 'perf.kpi.cfot.grain' },
        // `confirmedLine` (BL-66 (1)): a counter-offer's line date and quantity
        // apply only once the planner ACCEPTED it.
        dateChange: { key: 'perf.kpi.cfot.dateChange' },
        inFull: { key: 'perf.kpi.cfot.inFull' }
      }
    }
  ])
);
