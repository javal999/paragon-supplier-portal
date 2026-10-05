import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ChevronRight } from 'lucide-react';
import Data from '@components/ui-v2/Data';
import type { FlagSeverity } from '@components/ui-v2/ExpandableWidget';

// ─────────────────────────────────────────────────────────────────────────────
// The Home task list (SC-01): what needs the user's action, most urgent first.
// Each task opens the page where the action is taken. Counts come from the
// same derivations the old dashboard used, so the two cannot disagree.
// ─────────────────────────────────────────────────────────────────────────────

export interface HomeTask {
  readonly id: string;
  readonly label: string;
  readonly count: number;
  readonly severity: FlagSeverity;
  readonly to: string;
}

const RANK: Record<FlagSeverity, number> = { critical: 0, warning: 1, info: 2, none: 3 };

const STRIPE: Record<FlagSeverity, string> = {
  critical: 'bg-danger',
  warning: 'bg-warning',
  info: 'bg-text-tertiary',
  none: 'bg-text-tertiary',
};

const CHIP: Record<FlagSeverity, string> = {
  critical: 'bg-danger-soft text-danger',
  warning: 'bg-warning-soft text-warning-hover',
  info: 'bg-bg-hover text-text-secondary',
  none: 'bg-bg-hover text-text-secondary',
};

export function sortTasks(tasks: readonly HomeTask[]): HomeTask[] {
  return tasks
    .filter((task) => task.count > 0)
    .sort((a, b) => RANK[a.severity] - RANK[b.severity] || b.count - a.count);
}

const TaskList: React.FC<{ tasks: readonly HomeTask[] }> = ({ tasks }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const sorted = sortTasks(tasks);

  if (sorted.length === 0) {
    return (
      <div
        data-testid="home-empty"
        className="flex items-start gap-3 rounded-lg border border-success/30 bg-success-soft px-5 py-4"
      >
        <CheckCircle2 size={18} className="text-success shrink-0 mt-0.5" />
        <div>
          <div className="text-sm font-semibold text-text-primary">{t('hub.home.empty.title')}</div>
          <div className="text-sm text-text-secondary">{t('hub.home.empty.body')}</div>
        </div>
      </div>
    );
  }

  return (
    <ul className="space-y-2" data-testid="home-tasks">
      {sorted.map((task) => {
        const severity = task.severity === 'none' ? 'info' : task.severity;
        return (
          <li key={task.id}>
            <button
              type="button"
              onClick={() => navigate(task.to)}
              data-testid={`home-task-${task.id}`}
              className="relative w-full flex items-center gap-4 rounded-lg border border-border-subtle bg-bg-surface pl-5 pr-4 py-3 text-left hover:bg-bg-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-action"
            >
              <span aria-hidden="true" className={`absolute left-0 top-2 bottom-2 w-1 rounded-r ${STRIPE[severity]}`} />
              <Data className="text-section w-10 text-right">{task.count}</Data>
              <span className="flex-1 min-w-0 text-sm text-text-primary">{task.label}</span>
              <span className={`text-label uppercase px-2 py-0.5 rounded ${CHIP[severity]}`}>
                {t(`hub.home.severity.${severity}`)}
              </span>
              <span className="inline-flex items-center gap-1 text-sm text-action">
                {t('hub.home.open')}
                <ChevronRight size={14} />
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
};

export default TaskList;
