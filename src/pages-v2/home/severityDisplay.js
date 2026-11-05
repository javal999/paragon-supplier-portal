/** @import { TFunction } from 'i18next' */
import { formatDate } from '@lib/format';
import { taskSeverities } from './taskSeverity';
/** @import { HomeTask } from './TaskList' */
/** @import { SeverityInput, TaskSeverity } from './taskSeverity' */
/** @import { FlagSeverity } from '@components/ui-v2/ExpandableWidget' */

// ─────────────────────────────────────────────────────────────────────────────
// Home task rows with their computed severity (SC-01) — shared by Buyer Home and
// Supplier Home so both say the same thing the same way: the stripe and chip from
// `taskSeverities`, and one line under the label saying why (the passed deadline,
// cover against lead time, or the due date).
// ─────────────────────────────────────────────────────────────────────────────

/** @type {Record<TaskSeverity, FlagSeverity>} */
const FLAG = { urgent: 'critical', dueSoonAmber: 'warning', dueSoonGrey: 'info' };

/**
 * A task before its severity is known: what it counts, and the dates that decide it.
 * `preferDue`:  BL-242 (U-06) — the detail line names the due date, not the cover,
 *   whenever the task has a deadline (a commitment task: the supplier expects its
 *   deadline). The cover still counts toward the severity; only the line changes.
 * @typedef {Omit<HomeTask, 'severity'> & SeverityInput & { readonly preferDue?: boolean }} UnratedTask
 */

/**
 * Rate the tasks the list will show (count above zero) against today.
 * @param {readonly UnratedTask[]} tasks
 * @param {string} nowIso
 * @param {TFunction} t
 * @returns {HomeTask[]}
 */
export function withSeverity(tasks, nowIso, t) {
  const shown = tasks.filter((task) => task.count > 0);
  const severities = taskSeverities(shown, nowIso);
  return shown.map((task, i) => {
    const s = severities[i];
    const due = s.deadline === null ? null : t('hub.home.due', { date: formatDate(s.deadline) });
    const detail =
      s.reason === 'deadline'
        ? `${due} · ${t('hub.home.overdueBy', { count: s.overdueDays })}`
        : s.reason === 'stockOut' && s.cover && !(task.preferDue && due !== null)
          ? `${t('inv.basis.cover', { count: Math.floor(s.cover.daysOfCover) })} · ${t('inv.basis.leadTime', { count: s.cover.leadTimeDays })}`
          : (due ?? t('hub.home.noDeadline'));
    return {
      id: task.id,
      label: task.label,
      count: task.count,
      to: task.to,
      // X-02 — the lane a grouped list (Supplier Home) files the row under, and
      // the oldest deadline the lane orders by. Absent lane: a flat list.
      ...(task.lane === undefined ? {} : { lane: task.lane }),
      deadline: s.deadline,
      severity: FLAG[s.severity],
      // A grey row is still "Due soon", not "To review".
      chipLabel: s.severity === 'dueSoonGrey' ? t('hub.home.severity.warning') : undefined,
      // Red and amber rows list in urgency order, most urgent first.
      rank: s.rank ?? undefined,
      detail
    };
  });
}
