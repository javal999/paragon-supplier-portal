import { describe, it, expect } from 'vitest';
import { taskSeverities, URGENT_CAP } from './taskSeverity';

// Buyer Home task severity: computed from each task's own deadline and stock
// cover, never from its type, with URGENT capped at the 3 most urgent.

const TODAY = '2026-08-31T12:00:00.000Z';

/** @param {ReturnType<typeof taskSeverities>} results */
const byId = (results) => Object.fromEntries(results.map((r) => [r.id, r]));

describe('taskSeverities', () => {
  it('a passed deadline is urgent-eligible; the score is the days it has passed', () => {
    const [r] = taskSeverities([{ id: 'a', deadlines: ['2026-08-25', '2026-08-28'] }], TODAY);
    expect(r).toMatchObject({
      eligible: true,
      reason: 'deadline',
      deadline: '2026-08-25',
      overdueDays: 6,
      score: 6,
      rank: 1,
      severity: 'urgent'
    });
  });

  it('a deadline today or later is not eligible and shows grey with its date', () => {
    const results = byId(
      taskSeverities(
        [
          { id: 'today', deadlines: ['2026-08-31'] },
          { id: 'later', deadlines: ['2026-09-10'] }
        ],
        TODAY
      )
    );
    expect(results.today).toMatchObject({ eligible: false, severity: 'dueSoonGrey', rank: null });
    expect(results.later).toMatchObject({ deadline: '2026-09-10', severity: 'dueSoonGrey' });
  });

  it('reads an instant as its Asia/Jakarta day', () => {
    // 30 Aug 17:00 UTC is 31 Aug 00:00 WIB: today, so not passed.
    const [r] = taskSeverities([{ id: 'a', deadlines: ['2026-08-30T17:00:00.000Z'] }], TODAY);
    expect(r).toMatchObject({ deadline: '2026-08-31', eligible: false });
  });

  it('a stock-out before the reorder could arrive is eligible; the score is the gap', () => {
    const [r] = taskSeverities(
      [{ id: 'a', deadlines: ['2026-09-04'], stock: [{ daysOfCover: 4.6, leadTimeDays: 14 }] }],
      TODAY
    );
    expect(r).toMatchObject({
      eligible: true,
      reason: 'stockOut',
      stockOutGapDays: 10,
      score: 10,
      cover: { daysOfCover: 4.6, leadTimeDays: 14 },
      severity: 'urgent'
    });
  });

  it('cover at or beyond the lead time, or no lead time, is not a stock-out', () => {
    const [r] = taskSeverities(
      [
        {
          id: 'a',
          deadlines: [],
          stock: [
            { daysOfCover: 14, leadTimeDays: 14 },
            { daysOfCover: 2, leadTimeDays: 0 }
          ]
        }
      ],
      TODAY
    );
    expect(r).toMatchObject({ eligible: false, cover: null, deadline: null });
  });

  it('when both conditions hold, the score is the larger count and the deadline is named', () => {
    const [r] = taskSeverities(
      [{ id: 'a', deadlines: ['2026-08-29'], stock: [{ daysOfCover: 1, leadTimeDays: 21 }] }],
      TODAY
    );
    expect(r).toMatchObject({ overdueDays: 2, stockOutGapDays: 20, score: 20, reason: 'deadline' });
  });

  it('caps URGENT at 3; eligible tasks below the cap are amber, the rest grey', () => {
    expect(URGENT_CAP).toBe(3);
    const results = byId(
      taskSeverities(
        [
          { id: 'p1', deadlines: ['2026-08-30'] },
          { id: 'p5', deadlines: ['2026-08-26'] },
          { id: 'p3', deadlines: ['2026-08-28'] },
          { id: 'p4', deadlines: ['2026-08-27'] },
          { id: 'p2', deadlines: ['2026-08-29'] },
          { id: 'none', deadlines: ['2026-09-30'] }
        ],
        TODAY
      )
    );
    expect(['p5', 'p4', 'p3'].map((id) => results[id].severity)).toEqual([
      'urgent',
      'urgent',
      'urgent'
    ]);
    expect(results.p2).toMatchObject({ rank: 4, severity: 'dueSoonAmber' });
    expect(results.p1).toMatchObject({ rank: 5, severity: 'dueSoonAmber' });
    expect(results.none.severity).toBe('dueSoonGrey');
  });

  it('breaks a score tie by the earliest deadline, then the id', () => {
    const results = byId(
      taskSeverities(
        [
          // stock gap 3 with a later deadline vs a passed deadline of 3 days
          { id: 'b', deadlines: ['2026-08-28'] },
          { id: 'a', deadlines: ['2026-08-28'] },
          { id: 'c', deadlines: ['2026-09-05'], stock: [{ daysOfCover: 4, leadTimeDays: 7 }] }
        ],
        TODAY
      )
    );
    expect([results.a.rank, results.b.rank, results.c.rank]).toEqual([1, 2, 3]);
  });

  it('never pads the red count to the cap', () => {
    const results = taskSeverities(
      [
        { id: 'late', deadlines: ['2026-08-20'] },
        { id: 'fine', deadlines: ['2026-09-20'] },
        { id: 'blank', deadlines: [] }
      ],
      TODAY
    );
    expect(results.filter((r) => r.severity === 'urgent').map((r) => r.id)).toEqual(['late']);
  });

  it('returns results in input order and is stable across runs', () => {
    const input = [
      { id: 'x', deadlines: ['2026-08-30'] },
      { id: 'y', deadlines: ['2026-08-30'] }
    ];
    const first = taskSeverities(input, TODAY);
    expect(first.map((r) => r.id)).toEqual(['x', 'y']);
    expect(taskSeverities(input, TODAY)).toEqual(first);
  });
});
