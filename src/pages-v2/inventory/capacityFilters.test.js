// BL-63 (REQ-E08-04 BR-07, AC-04) — the planner's capacity filters, pure half.
import { describe, expect, it } from 'vitest';
/** @import { CapacityPlan } from '@services/data/types' */
import {
  anyCapacityFilter,
  planMatches,
  readCapacityFilters,
  weekMatches,
  withCapacityFilter,
  withoutCapacityFilters
} from './capacityFilters';

/**
 * @param {string} w
 * @param {number} demand
 * @param {number | null} allocated
 */
const week = (w, demand, allocated) => ({
  week: w,
  demand,
  entry: allocated === null ? null : { week: w, allocated }
});
/**
 * @param {Partial<CapacityPlan>} over
 * @returns {CapacityPlan}
 */
const plan = (over) =>
  /** @type {CapacityPlan} */ ({
    supplierId: 'sup-007',
    supplierName: 'S',
    planningGroupId: 'pg-MG-20',
    materials: ['PK-PETB-8801'],
    uom: 'PCS',
    weeks: [week('2026-09-14', 100, 100)],
    latest: null,
    ...over
  });

describe('capacity filters in the address', () => {
  it('reads the four filters, and nothing when the address carries none', () => {
    const none = readCapacityFilters(new URLSearchParams(''));
    expect(anyCapacityFilter(none)).toBe(false);
    const f = readCapacityFilters(
      new URLSearchParams(
        'supplier=sup-002&planningGroup=pg-MG-02&materialCode=RM-EMUL-9410&gapsOnly=1'
      )
    );
    expect(f).toMatchObject({
      supplierId: 'sup-002',
      planningGroupId: 'pg-MG-02',
      materialCode: 'RM-EMUL-9410',
      gapsOnly: true,
      ignoredMalformed: false
    });
  });

  it('a value that is not id-shaped is ignored and reported, never guessed at', () => {
    const f = readCapacityFilters(new URLSearchParams('supplier=%3Cscript%3E&gapsOnly=yes'));
    expect(f).toMatchObject({ supplierId: null, gapsOnly: false, ignoredMalformed: true });
  });

  it('writing and clearing keep the PO drill parameters', () => {
    const drill = new URLSearchParams('po=po-007&groups=MG-20&weeks=2026-09-14&from=order-summary');
    const on = withCapacityFilter(
      withCapacityFilter(drill, 'gapsOnly', true),
      'material',
      'PK-PETB-8801'
    );
    expect(on.get('gapsOnly')).toBe('1');
    expect(on.get('materialCode')).toBe('PK-PETB-8801');
    expect(on.get('po')).toBe('po-007');
    expect(withCapacityFilter(on, 'gapsOnly', false).has('gapsOnly')).toBe(false);
    const cleared = withoutCapacityFilters(on);
    expect([...cleared.keys()].sort()).toEqual(['from', 'groups', 'po', 'weeks']);
  });

  it('planMatches narrows by each filter, both ways', () => {
    /** @param {string} q */
    const f = (q) => readCapacityFilters(new URLSearchParams(q));
    const p = plan({});
    expect(planMatches(p, f('supplier=sup-007'))).toBe(true);
    expect(planMatches(p, f('supplier=sup-002'))).toBe(false);
    expect(planMatches(p, f('planningGroup=pg-MG-21'))).toBe(false);
    expect(planMatches(p, f('planningGroup=pg-MG-20'))).toBe(true);
    expect(planMatches(p, f('materialCode=PK-PETB-8801'))).toBe(true);
    expect(planMatches(p, f('materialCode=PK-CAPF-8820'))).toBe(false);
    expect(planMatches(p, f('gapsOnly=1'))).toBe(false);
    const gap = plan({ weeks: [week('2026-09-14', 100, 100), week('2026-09-21', 100, 60)] });
    expect(planMatches(gap, f('gapsOnly=1'))).toBe(true);
    expect(gap.weeks.filter((w) => weekMatches(w, f('gapsOnly=1'))).map((w) => w.week)).toEqual([
      '2026-09-21'
    ]);
    expect(gap.weeks.filter((w) => weekMatches(w, f('')))).toHaveLength(2);
  });
});
