import { describe, it, expect } from 'vitest';
import { sortTasks } from './TaskList';

// The Home list order: severity first; within a severity, the urgency rank
// where the page ranked its tasks (Buyer Home), else the count (Supplier Home).

/**
 * @param {string} id
 * @param {'critical' | 'warning' | 'info'} severity
 * @param {number} count
 * @param {number} [rank]
 */
const task = (id, severity, count, rank) => ({
  id,
  label: id,
  count,
  severity,
  to: '/',
  ...(rank === undefined ? {} : { rank })
});

describe('sortTasks', () => {
  it('orders red rows by urgency rank, not by count', () => {
    // The sample data's red rows: count order would be alerts, chase, drift.
    const sorted = sortTasks([
      task('inventory-high-alerts', 'critical', 17, 3),
      task('chase', 'critical', 7, 1),
      task('calloffs-drift', 'critical', 2, 2)
    ]);
    expect(sorted.map((t) => t.id)).toEqual(['chase', 'calloffs-drift', 'inventory-high-alerts']);
  });

  it('keeps severity first: a lower-ranked red row still sits above any amber row', () => {
    const sorted = sortTasks([
      task('amber', 'warning', 50, 4),
      task('red', 'critical', 1, 3),
      task('grey', 'info', 99)
    ]);
    expect(sorted.map((t) => t.id)).toEqual(['red', 'amber', 'grey']);
  });

  it('without a rank (Supplier Home, grey rows) the count still decides', () => {
    const sorted = sortTasks([
      task('few', 'warning', 2),
      task('many', 'warning', 9),
      task('none', 'warning', 0)
    ]);
    expect(sorted.map((t) => t.id)).toEqual(['many', 'few']);
  });
});
