/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import Data from '@components/ui-v2/Data';
import { formatDate } from '@lib/format';
import { sdcClock } from '@services/sdc/clock';
import {
  useDataHealth,
  useForecastCommitments,
  useForecastVersions,
  useOrderPlan,
  useReschedule
} from '@services/query/hooks';
import { FORECAST_PAGES } from './forecastPages';
import { FOCUS_RING } from './focusRing';
/** @import { CycleStepId } from './cycleCounts' */
import {
  CYCLE_STEPS,
  currentVersions,
  failingChecks,
  recommendedOrders,
  openExceptions,
  publishWithheld,
  weeksOverCapacity
} from './cycleCounts';

// ─────────────────────────────────────────────────────────────────────────────
// CYCLE STEPS — Forecast UX phase 2, task B1 (F-03, F-05; evaluation §5).
//
// A 5-step bar under the title of This week and the 4 Weekly plan pages. It
// answers "where am I in the cycle": the current page is marked, and every
// step links to its page and shows one number.
//
// FUX2-R3 — no invented state. A step reads "Blocked" only when the data says
// so (Publish, while publishing is withheld), and a step whose page carries a
// failing Data health check shows the count. Nothing is stored, so no step is
// ever "done"; where no status can be derived the bar shows the number.
//
// Read-only (FUX-R1): the existing query hooks, and the counting rules in
// `cycleCounts.js` that the pages themselves apply.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {{
 *     readonly current: CycleStepId;
 *   }} CycleStepsProps
 */

/**
 * @typedef {{
 *     readonly text: string | null;
 *     readonly blocked: boolean;
 *     readonly checks: number;
 *   }} StepFigure
 */

/** @type {React.FC<CycleStepsProps>} */
const CycleSteps = ({ current }) => {
  const { t } = useTranslation();
  const health = useDataHealth();
  const orderPlan = useOrderPlan();
  const reschedule = useReschedule();
  const versions = useForecastVersions();
  const lines = useForecastCommitments();
  const report = health.data ?? null;
  const withheld = publishWithheld();

  // The input check is one fact about the week's data, so the bar states it
  // once, on This week, where the input check lives. Each result page still
  // carries its own Data health chip under its title.
  /**
   * @param {CycleStepId} id
   * @returns {number}
   */
  const checksFor = (id) => (report && id === 'thisWeek' ? failingChecks(report) : 0);

  /**
   * @param {CycleStepId} id
   * @returns {string | null}
   */
  const textFor = (id) => {
    switch (id) {
      case 'thisWeek':
        return report && failingChecks(report) === 0 ? t('fux.steps.pass') : null;
      case 'whatToOrder':
        return orderPlan.data
          ? t('fux.count.toOrder', { count: recommendedOrders(orderPlan.data) })
          : null;
      case 'makeRoom':
        return reschedule.data
          ? t('fux.count.overCapacity', { count: weeksOverCapacity(reschedule.data) })
          : null;
      case 'publish': {
        if (withheld) return t('fux.steps.blocked');
        if (!versions.data) return null;
        const latest = currentVersions(versions.data.items).reduce(
          (max, v) => (max === null || v.publishedAt > max ? v.publishedAt : max),
          /** @type {string | null} */ (null)
        );
        return latest
          ? t('fux.steps.lastPublished', { date: formatDate(latest) })
          : t('fux.steps.noneYet');
      }
      case 'responses':
        // The page reads the forecast lane's clock (`forecastNow()` = `sdcClock.now()`).
        return lines.data
          ? t('fux.count.exceptions', { count: openExceptions(lines.data.items, sdcClock.now()) })
          : null;
    }
  };

  /** @type {Record<CycleStepId, StepFigure>} */
  const figures = /** @type {Record<CycleStepId, StepFigure>} */ (
    Object.fromEntries(
      CYCLE_STEPS.map((id) => [
        id,
        { text: textFor(id), blocked: id === 'publish' && withheld, checks: checksFor(id) }
      ])
    )
  );

  return (
    <nav
      aria-label={t('fux.steps.label')}
      className="mb-4"
      data-testid="cycle-steps"
      data-current={current}
    >
      {/* C2 (WCAG 1.4.10): 5 columns only from xl. At 768 px the menu leaves
          about 460 px, and 5 columns of 84 px pushed the step names out of
          their boxes; 2 then 3 columns let them wrap inside. */}
      <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {CYCLE_STEPS.map((id, i) => {
          const page = FORECAST_PAGES[id];
          const f = figures[id];
          const isCurrent = id === current;
          return (
            <li key={id}>
              <Link
                to={page.path}
                aria-current={isCurrent ? 'step' : undefined}
                data-testid={`cycle-step-${id}`}
                data-current={isCurrent ? 'true' : 'false'}
                data-blocked={f.blocked ? 'true' : 'false'}
                className={`block h-full min-w-0 break-words rounded border px-3 py-2 text-sm hover:border-action ${FOCUS_RING} ${
                  isCurrent ? 'border-action bg-action-soft' : 'border-border-subtle bg-bg-surface'
                }`}
              >
                <span className="flex items-baseline gap-1.5">
                  <Data className="text-xs text-text-tertiary">{i + 1}</Data>
                  <span
                    className={isCurrent ? 'font-semibold text-action-hover' : 'text-text-primary'}
                  >
                    {t(page.titleKey)}
                  </span>
                </span>
                {f.text !== null && (
                  <span
                    className={`mt-0.5 block text-xs ${f.blocked ? 'text-warning-hover' : 'text-text-secondary'}`}
                    data-testid={`cycle-step-${id}-figure`}
                  >
                    {f.text}
                  </span>
                )}
                {f.checks > 0 && (
                  <span
                    className="mt-0.5 block text-xs text-warning-hover"
                    data-testid={`cycle-step-${id}-checks`}
                  >
                    {t('fux.steps.checks', { count: f.checks })}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default CycleSteps;
