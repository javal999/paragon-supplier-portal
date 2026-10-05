import React from 'react';
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
import {
  CYCLE_STEPS,
  STEP_HEALTH,
  currentVersions,
  failingChecks,
  recommendedOrders,
  openExceptions,
  publishWithheld,
  weeksOverCapacity,
  type CycleStepId
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
// `cycleCounts.ts` that the pages themselves apply.
// ─────────────────────────────────────────────────────────────────────────────

interface CycleStepsProps {
  readonly current: CycleStepId;
}

interface StepFigure {
  readonly text: string | null;
  readonly blocked: boolean;
  readonly checks: number;
}

const CycleSteps: React.FC<CycleStepsProps> = ({ current }) => {
  const { t } = useTranslation();
  const health = useDataHealth();
  const orderPlan = useOrderPlan();
  const reschedule = useReschedule();
  const versions = useForecastVersions();
  const lines = useForecastCommitments();
  const report = health.data ?? null;
  const withheld = publishWithheld();

  const checksFor = (id: CycleStepId): number => {
    if (!report) return 0;
    if (id === 'thisWeek') return failingChecks(report);
    const step = STEP_HEALTH[id];
    return step ? failingChecks(report, step) : 0;
  };

  const textFor = (id: CycleStepId): string | null => {
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
        const latest = currentVersions(versions.data.items).reduce<string | null>(
          (max, v) => (max === null || v.publishedAt > max ? v.publishedAt : max),
          null
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

  const figures: Record<CycleStepId, StepFigure> = Object.fromEntries(
    CYCLE_STEPS.map((id) => [
      id,
      { text: textFor(id), blocked: id === 'publish' && withheld, checks: checksFor(id) }
    ])
  ) as Record<CycleStepId, StepFigure>;

  return (
    <nav
      aria-label={t('fux.steps.label')}
      className="mb-4"
      data-testid="cycle-steps"
      data-current={current}
    >
      <ol className="grid grid-cols-1 gap-2 sm:grid-cols-5">
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
                className={`block h-full rounded border px-3 py-2 text-sm hover:border-action ${
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
