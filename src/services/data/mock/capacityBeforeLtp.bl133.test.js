// ─────────────────────────────────────────────────────────────────────────────
// BL-133 (ENG-D18, ENG-D19) — capacity before the LTP, at the COMMAND layer.
//
// The submission of a commitment (`t_requirementresponse_promote`) is refused
// by name until the supplier has confirmed capacity for every horizon week the
// period touches (CAPACITY_NOT_CONFIRMED), and a period whose group LTP is
// above BE (capacity + additional capacity) needs a reason
// (ABOVE_BE_NEEDS_REASON). Every guard is probed both ways, and the amber / red
// boundaries are pinned at exactly capacity and exactly BE.
// ─────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService } from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import { requirementResponseStore } from './stores/requirementResponseStore';
import { forecastVersionStore, forecastViewStore } from './stores/forecastHubStores';
import { capacityStore, inventoryAlertLedger } from './stores/inventoryHubStores';
import {
  SEEDED_PACKAGING_WEEKS as W,
  SEEDED_RAW_MATERIAL_MONTHS as M
} from './fixtures/forecastHub';
/** @import { ForecastCommitmentLine, QueryScope } from '../types' */
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { getTransition } from '../../transitions';
import {
  beOf,
  commitmentCapacityRefusal,
  groupWeekLtp,
  ltpCapacityLevel,
  ltpCapacityWeeks,
  periodCapacityCheck
} from '../../transitions/capacityRules';
import { sdcClock } from '../../sdc';
import { NO_PERSON } from '@context/noPerson';

const svc = new MockCommandService();
const reads = new MockProcurementService();
/**
 * @param {string} supplierId
 * @returns {QueryScope}
 */
const supplier = (supplierId) => ({
  personaType: 'supplier',
  supplierId,
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON
});
const sup007 = supplier('sup-007');
const sup002 = supplier('sup-002');
/** @type {QueryScope} */
const buyer = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer,
  actor: NO_PERSON
};

beforeEach(() => {
  requirementResponseStore.reset();
  forecastVersionStore.reset();
  forecastViewStore.reset();
  inventoryAlertLedger.reset();
  capacityStore.reset();
  sdcClock.reset();
});

/**
 * @param {QueryScope} scope
 * @param {string} materialCode
 * @param {string} period
 */
const lineOf = async (scope, materialCode, period) =>
  /** @type {ForecastCommitmentLine} */ (
    (await reads.getForecastCommitments(scope)).items.find(
      (l) => l.materialCode === materialCode && l.periodBucket === period
    )
  );
/**
 * @param {QueryScope} scope
 * @param {ForecastCommitmentLine} l
 * @param {number} qty
 * @param {Record<string, unknown>} [extra]
 */
const draft = async (scope, l, qty, extra = {}) => {
  const res = await svc.dispatch(scope, {
    transitionId: 't_requirementresponse_submit',
    entity: 'requirementResponse',
    payload: {
      publicationId: l.publicationId,
      planVersion: l.planVersion,
      supplierId: l.supplierId,
      materialCode: l.materialCode,
      periodBucket: l.periodBucket,
      confirmedQty: qty,
      confirmedQtyRaw: String(qty),
      committedDate: l.periodStart,
      ...extra
    }
  });
  expect(res.status).toBe('done');
  return /** @type {NonNullable<typeof res.entityId>} */ (res.entityId);
};
/**
 * @param {QueryScope} scope
 * @param {string} id
 */
const promote = (scope, id) =>
  svc.dispatch(scope, {
    transitionId: 't_requirementresponse_promote',
    entity: 'requirementResponse',
    entityId: id,
    payload: {}
  });
/**
 * @param {QueryScope} scope
 * @param {string} group
 */
const plan = async (scope, group) =>
  /** @type {import('../types').CapacityPlan} */ (
    (await reads.getCapacityPlans(scope)).items.find(
      (p) => p.supplierId === scope.supplierId && p.planningGroupId === `pg-${group}`
    )
  );
/**
 * @param {QueryScope} scope
 * @param {string} group
 * @param {unknown[]} weeks
 */
const confirmCapacity = (scope, group, weeks) =>
  svc.dispatch(scope, {
    transitionId: 't_capacity_submit',
    entity: 'capacitySubmission',
    payload: { supplierId: scope.supplierId, planningGroupId: `pg-${group}`, weeks }
  });

/**
 * sup-002 MG-10 capacity where each week's allocation is the week's LTP + `delta`, with `upside`.
 * @param {number} delta
 * @param {number} upside
 */
async function stearCapacity(delta, upside) {
  const mg10 = await plan(sup002, 'MG-10');
  const lines = (await reads.getForecastCommitments(sup002)).items;
  const weeks = mg10.weeks.map((w) => {
    const allocated = groupWeekLtp(lines, 'sup-002', mg10.materials, w.week) + delta;
    return {
      week: w.week,
      allocated,
      upside,
      ...(allocated < w.demand ? { reason: 'capacity' } : {})
    };
  });
  const res = await confirmCapacity(sup002, 'MG-10', weeks);
  expect(res.status).toBe('done');
}

describe('BL-133 rules — ENG-D18 levels, pinned at the boundaries', () => {
  it('exactly at capacity is within; one above is amber; exactly at BE is amber; one above BE is red', () => {
    const e = { allocated: 100, upside: 20 };
    expect(beOf(e)).toBe(120);
    expect(ltpCapacityLevel(99, e)).toBe('within');
    expect(ltpCapacityLevel(100, e)).toBe('within');
    expect(ltpCapacityLevel(101, e)).toBe('needsAdditional');
    expect(ltpCapacityLevel(120, e)).toBe('needsAdditional');
    expect(ltpCapacityLevel(121, e)).toBe('cannotSupply');
    // No additional capacity: BE is capacity, so one above it is already red.
    expect(ltpCapacityLevel(101, { allocated: 100 })).toBe('cannotSupply');
    expect(ltpCapacityLevel(0, null)).toBe('unconfirmed');
  });

  it('group LTP = the sum of the group’s lines; a weekly line lands whole, a monthly line by its days in the week', () => {
    // Material C5 — a line joins a group by its material (the group's materials: A and B).
    const lines = [
      {
        supplierId: 's',
        materialCode: 'A',
        periodStart: '2026-09-07',
        periodEnd: '2026-09-13',
        forecastQty: 700
      },
      {
        supplierId: 's',
        materialCode: 'B',
        periodStart: '2026-09-07',
        periodEnd: '2026-09-13',
        forecastQty: 300
      },
      {
        supplierId: 's',
        materialCode: 'OTHER',
        periodStart: '2026-09-07',
        periodEnd: '2026-09-13',
        forecastQty: 9999
      },
      {
        supplierId: 'x',
        materialCode: 'A',
        periodStart: '2026-09-07',
        periodEnd: '2026-09-13',
        forecastQty: 9999
      }
    ];
    expect(groupWeekLtp(lines, 's', ['A', 'B'], '2026-09-07')).toBe(1000);
    const month = [
      {
        supplierId: 's',
        materialCode: 'A',
        periodStart: '2026-09-01',
        periodEnd: '2026-09-30',
        forecastQty: 3000
      }
    ];
    // Week of 31 Aug holds 6 September days (1–6 Sep): 3000 × 6 / 30.
    expect(groupWeekLtp(month, 's', ['A'], '2026-08-31')).toBe(600);
    expect(groupWeekLtp(month, 's', ['A'], '2026-09-07')).toBe(700);
  });

  it('the period check: unconfirmed first, then red needs a reason, `other` a note; outside the horizon is not gated', () => {
    const lines = [
      {
        supplierId: 's',
        materialCode: 'A',
        periodStart: '2026-09-07',
        periodEnd: '2026-09-13',
        forecastQty: 150
      }
    ];
    const horizon = ['2026-08-31', '2026-09-07'];
    /** @param {{ allocated: number; upside?: number } | null} entry */
    const planWith = (entry) => ({
      supplierId: 's',
      supplierName: 'S',
      planningGroupId: 'G',
      materials: ['A'],
      uom: 'PCS',
      latest: null,
      weeks: horizon.map((week) => ({ week, demand: 0, entry: entry ? { week, ...entry } : null }))
    });
    /** @param {{ allocated: number; upside?: number } | null} entry */
    const check = (entry) =>
      periodCapacityCheck(planWith(entry), lines, 's', ['A'], '2026-09-07', '2026-09-13', horizon);
    expect(commitmentCapacityRefusal(check(null), undefined)).toEqual({
      refusal: 'capacityNotConfirmed',
      week: '2026-09-07'
    });
    expect(
      periodCapacityCheck(null, lines, 's', ['A'], '2026-09-07', '2026-09-13', horizon)
        .unconfirmedWeek
    ).toBe('2026-09-07');
    expect(commitmentCapacityRefusal(check({ allocated: 150 }), undefined)).toBeNull();
    expect(commitmentCapacityRefusal(check({ allocated: 100, upside: 50 }), undefined)).toBeNull();
    expect(commitmentCapacityRefusal(check({ allocated: 100, upside: 49 }), undefined)).toEqual({
      refusal: 'aboveBeNeedsReason',
      week: '2026-09-07'
    });
    expect(
      commitmentCapacityRefusal(check({ allocated: 100, upside: 49 }), { level1: 'material' })
    ).toBeNull();
    expect(
      commitmentCapacityRefusal(check({ allocated: 100, upside: 49 }), { level1: 'other' })
    ).toEqual({ refusal: 'aboveBeNoteRequired', week: '2026-09-07' });
    expect(
      commitmentCapacityRefusal(check({ allocated: 100, upside: 49 }), {
        level1: 'other',
        note: 'second shift'
      })
    ).toBeNull();
    expect(
      commitmentCapacityRefusal(check({ allocated: 100, upside: 49 }), { level1: 'not-a-code' })
    ).toEqual({ refusal: 'aboveBeNeedsReason', week: '2026-09-07' });
    const beyond = periodCapacityCheck(
      null,
      lines,
      's',
      ['A'],
      '2026-12-01',
      '2026-12-31',
      horizon
    );
    expect(beyond.level).toBeNull();
    expect(commitmentCapacityRefusal(beyond, undefined)).toBeNull();
  });
});

describe('BL-133 — the pokayoke on the submit verb (ENG-D19)', () => {
  it('the submission verb carries the hook; the draft verb does not', () => {
    expect(
      /** @type {import('../../transitions/schema').TransitionDef} */ (
        getTransition('t_requirementresponse_promote')
      ).policyHooks
    ).toContain('rr_promote_capacity_confirmed');
    expect(
      /** @type {import('../../transitions/schema').TransitionDef} */ (
        getTransition('t_requirementresponse_submit')
      ).policyHooks
    ).not.toContain('rr_promote_capacity_confirmed');
  });

  // PEX-D22 — the commitment probes run on sup-002's Zone Liability month
  // (stearic acid, October: inside its 45-day lead time). They used November,
  // a Trade-off month that now takes an acknowledgement only.
  it('refused without capacity, by name — the draft stays a draft — and accepted once capacity is confirmed', async () => {
    const l = await lineOf(sup002, 'RM-STEAR-7300', M[1]);
    expect(l.zone).toBe('firm');
    expect((await plan(sup002, 'MG-10')).latest).toBeNull();
    const id = await draft(sup002, l, l.forecastQty);
    const refused = await promote(sup002, id);
    expect(refused.status).toBe('failed');
    expect(refused.reason).toMatch(/CAPACITY_NOT_CONFIRMED/);
    expect(refused.reason).toMatch(/MG-10/);
    expect(
      /** @type {import('../../sdc/types').RequirementResponse} */ (
        requirementResponseStore.get(id)
      ).status
    ).toBe('Draft');

    await stearCapacity(0, 0);
    const ok = await promote(sup002, id);
    expect(ok.status).toBe('done');
    expect(
      /** @type {import('../../sdc/types').RequirementResponse} */ (
        requirementResponseStore.get(id)
      ).status
    ).toBe('Submitted');
  });

  it('exactly at BE (amber) needs no reason; one above BE (red) is refused without one and accepted with one', async () => {
    const l = await lineOf(sup002, 'RM-STEAR-7300', M[1]);
    // Allocation 1 below the LTP, additional capacity 1: LTP exactly at BE.
    await stearCapacity(-1, 1);
    const amber = await plan(sup002, 'MG-10');
    expect(
      /** @type {import('../../transitions/capacityRules').LtpCapacityWeek} */ (
        ltpCapacityWeeks(amber).find((w) => w.week === '2026-10-05')
      ).level
    ).toBe('needsAdditional');
    expect((await promote(sup002, await draft(sup002, l, l.forecastQty))).status).toBe('done');

    // Now no additional capacity: the LTP is one above BE.
    await stearCapacity(-1, 0);
    const red = await promote(sup002, await draft(sup002, l, l.forecastQty));
    expect(red.status).toBe('failed');
    expect(red.reason).toMatch(/ABOVE_BE_NEEDS_REASON/);
    const other = await promote(
      sup002,
      await draft(sup002, l, l.forecastQty, { rootCause: { level1: 'other' } })
    );
    expect(other.reason).toMatch(/OTHER_REASON_NEEDS_NOTE/);
    const withReason = await promote(
      sup002,
      await draft(sup002, l, l.forecastQty, { rootCause: { level1: 'capacity' } })
    );
    expect(withReason.status).toBe('done');
  });

  // PEX-D22 moved the sample's red week from 14 Sep (W[2], now Trade-off) to
  // 7 Sep (W[1], Zone Liability for sup-007's 14-day lead time).
  it('on the sample data: sup-007 rigid plastics is red in the week of 7 Sep (LTP 72,800 against BE 60,000), a Zone Liability week', async () => {
    const mg20 = await plan(sup007, 'MG-20');
    const red = ltpCapacityWeeks(mg20).filter((w) => w.level === 'cannotSupply');
    expect(red).toEqual([
      {
        week: W[1],
        ltp: 72800,
        capacity: 60000,
        be: 60000,
        level: 'cannotSupply',
        upsideConfirmed: false
      }
    ]);
    const l = await lineOf(sup007, 'PK-PETB-8801', W[1]);
    expect(l.zone).toBe('firm');
    expect((await promote(sup007, await draft(sup007, l, l.forecastQty))).reason).toMatch(
      /ABOVE_BE_NEEDS_REASON/
    );
    // A within Zone Liability week of the same group goes through with nothing added.
    const ok = await lineOf(sup007, 'PK-PETB-8801', W[0]);
    expect(ok.zone).toBe('firm');
    expect((await promote(sup007, await draft(sup007, ok, ok.forecastQty))).status).toBe('done');
  });

  it('an acknowledgement (Forecast zone) is not a commitment and is not gated', async () => {
    const l = await lineOf(sup002, 'RM-STEAR-7300', M[4]);
    expect(l.zone).toBe('forecast');
    const res = await svc.dispatch(sup002, {
      transitionId: 't_requirementresponse_acknowledge',
      entity: 'requirementResponse',
      payload: {
        publicationId: l.publicationId,
        planVersion: l.planVersion,
        supplierId: 'sup-002',
        materialCode: l.materialCode,
        periodBucket: l.periodBucket
      }
    });
    expect(res.status).toBe('done');
  });
});

describe('BL-133 — supplier scoping', () => {
  it('a supplier reads only its own capacity plans and LTP lines; PTI reads every one, including the groups an LTP adds', async () => {
    const mine = (await reads.getCapacityPlans(sup002)).items;
    expect(new Set(mine.map((p) => p.supplierId))).toEqual(new Set(['sup-002']));
    expect(mine.some((p) => p.planningGroupId === 'pg-MG-20')).toBe(false);
    const all = (await reads.getCapacityPlans(buyer)).items.map(
      (p) => `${p.supplierId}-${p.planningGroupId}`
    );
    expect(all).toEqual(
      expect.arrayContaining(['sup-012-pg-MG-20', 'sup-005-pg-MG-02', 'sup-007-pg-MG-20'])
    );
    expect(
      new Set((await reads.getForecastCommitments(sup002)).items.map((l) => l.supplierId))
    ).toEqual(new Set(['sup-002']));
  });

  it('another supplier cannot submit (or confirm capacity for) a supplier’s commitment', async () => {
    const l = await lineOf(sup002, 'RM-STEAR-7300', M[1]);
    const id = await draft(sup002, l, l.forecastQty);
    await expect(promote(sup007, id)).rejects.toMatchObject({ code: 'SCOPE_DENIED' });
    const mg10 = await plan(sup002, 'MG-10');
    await expect(
      svc.dispatch(sup007, {
        transitionId: 't_capacity_submit',
        entity: 'capacitySubmission',
        payload: {
          supplierId: 'sup-002',
          planningGroupId: 'pg-MG-10',
          weeks: mg10.weeks.map((w) => ({ week: w.week, allocated: w.demand }))
        }
      })
    ).rejects.toMatchObject({ code: 'SCOPE_DENIED' });
    expect(
      /** @type {import('../../sdc/types').RequirementResponse} */ (
        requirementResponseStore.get(id)
      ).status
    ).toBe('Draft');
  });
});
