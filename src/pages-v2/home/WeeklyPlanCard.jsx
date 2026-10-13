/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Button from '@components/ui-v2/Button';
import { FORECAST_PAGES, forecastTitle } from '@components/forecast/forecastPages';
import { CYCLE_STEPS, failingChecks } from '@components/forecast/cycleCounts';
import { useDataHealth } from '@services/query/hooks';

// ─────────────────────────────────────────────────────────────────────────────
// The planner's way into the weekly cycle on My tasks (MP, and the ALL demo
// view). It replaced a 14 px text link that gave the weekly routine the lowest weight on the page,
// so planners worked the task cards before This week.
//
// One 64 px row: the step ("step 1 of 5", from `CYCLE_STEPS`), the Data health
// verdict counted by the same function This week's input check uses
// (`failingChecks`), and an outline button to This week. Read-only; nothing
// is stored.
// ─────────────────────────────────────────────────────────────────────────────

const STEP = 'thisWeek';

/** @type {React.FC} */
const WeeklyPlanCard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const health = useDataHealth();
  const page = forecastTitle(t, STEP);
  const failing = health.data ? failingChecks(health.data) : null;
  const status =
    failing === null
      ? t('hub.home.weeklyPlan.unknown')
      : failing > 0
        ? t('hub.home.weeklyPlan.failing', { count: failing })
        : t('hub.home.weeklyPlan.pass');

  return (
    <section
      aria-labelledby="home-weekly-plan-title"
      className="mb-4 flex h-16 items-center gap-4 rounded-lg border border-border-subtle bg-bg-surface px-4"
      data-testid="home-weekly-plan"
    >
      <div className="min-w-0 flex-1">
        <h2
          id="home-weekly-plan-title"
          className="truncate text-sm font-semibold text-text-primary"
          data-testid="home-weekly-plan-title"
        >
          {t('hub.home.weeklyPlan.title', {
            step: CYCLE_STEPS.indexOf(STEP) + 1,
            total: CYCLE_STEPS.length,
            page
          })}
        </h2>
        <p
          className={`truncate text-xs ${failing ? 'text-warning-hover' : 'text-text-secondary'}`}
          data-testid="home-weekly-plan-status"
        >
          {status}
        </p>
      </div>
      <Button
        variant="outline"
        className="shrink-0"
        onClick={() => navigate(FORECAST_PAGES[STEP].path)}
        data-testid="home-weekly-plan-open"
      >
        {t('fux.thisWeek.open', { page })}
      </Button>
    </section>
  );
};

export default WeeklyPlanCard;
