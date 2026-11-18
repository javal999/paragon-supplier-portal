/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ChevronRight } from 'lucide-react';
import Data from '@components/ui-v2/Data';
/** @import { FlagSeverity } from '@components/ui-v2/ExpandableWidget' */

// ─────────────────────────────────────────────────────────────────────────────
// The Home task list (SC-01): what needs the user's action, most urgent first.
// Each task opens the page where the action is taken. Counts come from the
// same derivations the old dashboard used, so the two cannot disagree.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `detail`:  One line under the label saying why the task has its severity (a
 *            passed deadline, cover against lead time, or the due date).
 * `chipLabel`:  The chip's text when it is not the severity's own label.
 * `rank`:  Urgency rank (1 = most urgent) where the page ranks its tasks; it
 *          orders rows within a severity ahead of the count.
 * `lane`:  RFx UX X-02 — the lane (section) a grouped list files the row under.
 * `deadline`:  The oldest deadline the row counts (`YYYY-MM-DD`), or null; a
 *              lane orders its rows by it.
 *
 * @typedef {{
 *     readonly id: string;
 *     readonly label: string;
 *     readonly count: number;
 *     readonly severity: FlagSeverity;
 *     readonly to: string;
 *     readonly detail?: string;
 *     readonly chipLabel?: string;
 *     readonly rank?: number;
 *     readonly lane?: string;
 *     readonly deadline?: string | null;
 *   }} HomeTask
 */

/**
 * A lane of a grouped To do: its id (matched against `HomeTask.lane`) and header.
 * @typedef {{ readonly id: string; readonly label: string }} TaskLane
 */

/** @type {Record<FlagSeverity, number>} */
const RANK = { critical: 0, warning: 1, info: 2, none: 3 };

/** @type {Record<FlagSeverity, string>} */
const STRIPE = {
  critical: 'bg-danger',
  warning: 'bg-warning',
  info: 'bg-text-tertiary',
  none: 'bg-text-tertiary'
};

/** @type {Record<FlagSeverity, string>} */
const CHIP = {
  critical: 'bg-danger-soft text-danger',
  warning: 'bg-warning-soft text-warning-hover',
  info: 'bg-bg-hover text-text-secondary',
  none: 'bg-bg-hover text-text-secondary'
};

/**
 * @param {readonly HomeTask[]} tasks
 * @returns {HomeTask[]}
 */
export function sortTasks(tasks) {
  return tasks
    .filter((task) => task.count > 0)
    .sort((a, b) => RANK[a.severity] - RANK[b.severity] || byRank(a, b) || b.count - a.count);
}

/**
 * Ranked rows first, in rank order; unranked rows after them (an amber row with
 * no deadline on record carries no rank). Zero when neither is ranked.
 * @param {HomeTask} a
 * @param {HomeTask} b
 * @returns {number}
 */
function byRank(a, b) {
  if (a.rank === undefined) return b.rank === undefined ? 0 : 1;
  return b.rank === undefined ? -1 : a.rank - b.rank;
}

/**
 * RFx UX X-02 (owner ruling Q5, 2026-10-19) — the supplier To do GROUPED BY
 * LANE, in the order `lanes` gives, each lane ordered by deadline: the oldest
 * deadline first, a row with no deadline after every dated one, and a row
 * outside the urgency ranking (`none`: money PTI owes) last. Within one
 * deadline the severity and then the count decide, as in `sortTasks`. Empty
 * lanes and zero-count rows are dropped; a row naming no listed lane is kept
 * in a trailing lane rather than hidden.
 * @param {readonly HomeTask[]} tasks
 * @param {readonly TaskLane[]} lanes
 * @returns {{ lane: TaskLane; tasks: HomeTask[] }[]}
 */
export function groupTasksByLane(tasks, lanes) {
  const known = new Set(lanes.map((l) => l.id));
  const shown = tasks.filter((task) => task.count > 0);
  const strays = shown.filter((task) => !known.has(task.lane ?? ''));
  const all = strays.length > 0 ? [...lanes, { id: '', label: '' }] : lanes;
  return all
    .map((lane) => ({
      lane,
      tasks: shown
        .filter((task) => (lane.id === '' ? !known.has(task.lane ?? '') : task.lane === lane.id))
        .sort(byDeadline)
    }))
    .filter((group) => group.tasks.length > 0);
}

/**
 * PSC-2 BR-09 / AC-07 (owner 2026-11-18) — the supplier To do's order: due date
 * first (the oldest deadline wins, an undated row after every dated one), then
 * risk class (critical before warning; "money PTI owes" after both), then TYPE
 * — the row's lane — and only then the count. The lane is the task's type: the
 * sections (`lanes`) group by it, and within one section this orders a job and
 * an alert that fall due the same day.
 * @param {HomeTask} a
 * @param {HomeTask} b
 * @returns {number}
 */
function byDeadline(a, b) {
  const none = Number(a.severity === 'none') - Number(b.severity === 'none');
  if (none !== 0) return none;
  const da = a.deadline ?? '9999-12-31';
  const db = b.deadline ?? '9999-12-31';
  return (
    da.localeCompare(db) ||
    RANK[a.severity] - RANK[b.severity] ||
    (a.lane ?? '').localeCompare(b.lane ?? '') ||
    b.count - a.count
  );
}

/**
 * The To do list. Flat and ranked (`sortTasks`) by default; grouped into lane
 * sections (`groupTasksByLane`) when `lanes` is given.
 * @type {React.FC<{ tasks: readonly HomeTask[]; lanes?: readonly TaskLane[] }>}
 */
const TaskList = ({ tasks, lanes }) => {
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

  /** @param {HomeTask} task */
  const row = (task) => {
    const severity = task.severity === 'none' ? 'info' : task.severity;
    return (
      <li key={task.id}>
        <button
          type="button"
          onClick={() => navigate(task.to)}
          data-testid={`home-task-${task.id}`}
          className="relative w-full flex items-center gap-4 rounded-lg border border-border-subtle bg-bg-surface pl-5 pr-4 py-3 text-left hover:bg-bg-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-action"
        >
          <span
            aria-hidden="true"
            className={`absolute left-0 top-2 bottom-2 w-1 rounded-r ${STRIPE[severity]}`}
          />
          <Data className="text-section w-10 text-right">{task.count}</Data>
          <span className="flex-1 min-w-0 text-sm text-text-primary">
            {task.label}
            {task.detail ? (
              <span
                className="block text-xs text-text-secondary"
                data-testid={`home-task-detail-${task.id}`}
              >
                {task.detail}
              </span>
            ) : null}
          </span>
          <span className={`text-label uppercase px-2 py-0.5 rounded ${CHIP[severity]}`}>
            {task.chipLabel ?? t(`hub.home.severity.${severity}`)}
          </span>
          <span className="inline-flex items-center gap-1 text-sm text-action">
            {t('hub.home.open')}
            <ChevronRight size={14} />
          </span>
        </button>
      </li>
    );
  };

  if (lanes) {
    return (
      <div className="space-y-5" data-testid="home-tasks">
        {groupTasksByLane(tasks, lanes).map(({ lane, tasks: laneTasks }) => (
          <section key={lane.id || 'other'} data-testid={`home-lane-${lane.id || 'other'}`}>
            {lane.label ? (
              <h2 className="text-label uppercase text-text-tertiary mb-2">{lane.label}</h2>
            ) : null}
            <ul className="space-y-2">{laneTasks.map(row)}</ul>
          </section>
        ))}
      </div>
    );
  }

  return (
    <ul className="space-y-2" data-testid="home-tasks">
      {sorted.map(row)}
    </ul>
  );
};

export default TaskList;
