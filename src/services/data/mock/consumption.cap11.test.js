// ────────────────────────────────────────────────────────────────────────────
// CAP-11 (BL-180) — `t_consumption_record` dispatched through the REAL
// MockCommandService against the real stores, and read back through the REAL
// service: the figure in force on the next horizon, the split across two
// suppliers, a later record superseding an earlier one (both kept), the
// publication of the next horizon freezing WITH its absorption (and not taking
// it twice), the unabsorbed alert (PTI only), the refusals, who may record,
// and the audit event.
// ────────────────────────────────────────────────────────────────────────────

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService, commandAuditSink } from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import { consumptionStore } from './stores/consumptionStore';
import { demandAnticipationStore } from './stores/demandAnticipationStore';
import { forecastVersionStore } from './stores/forecastHubStores';
/** @import { QueryScope } from '../types' */
import { DataError } from '../types';
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { POLICY_HOOKS } from '../../transitions/policyHooks';
import { refusedByPolicy } from '../../transitions/refusalMessage';
import { consumptionFlow } from '../../transitions/flows/consumption.flow';
import { sdcClock } from '../../sdc';
import { NO_PERSON } from '@context/noPerson';

const cmd = new MockCommandService();
const svc = new MockProcurementService();
/** @type {QueryScope} */
const planning = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['planning'],
  actor: NO_PERSON
};
/** @type {QueryScope} */
const procurement = { ...planning, businessRoles: ['procurement'] };
/** @type {QueryScope} */
const supplier = {
  personaType: 'supplier',
  supplierId: 'sup-002',
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON
};

// The hub's present: Monday 31 August 2026 (W36). W36–W39 frozen by the seed.
const H1 = ['2026-08-31', '2026-09-07', '2026-09-14', '2026-09-21'];
const H2 = ['2026-09-28', '2026-10-05', '2026-10-12', '2026-10-19'];

/**
 * @param {QueryScope} scope
 * @param {Partial<{ materialCode: string; week: string; qty: unknown; unit: string; source: string }>} p
 */
const record = (scope, p) =>
  cmd.dispatch(scope, {
    transitionId: 't_consumption_record',
    entity: 'consumption',
    payload: {
      materialCode: 'RM-STEAR-7300',
      week: H1[0],
      qty: 1_000,
      unit: 'KG',
      source: 'manual',
      ...p
    }
  });

/** @param {string} supplierId @param {string} materialCode */
const rowOf = async (supplierId, materialCode) => {
  const row = (await svc.getDemandAnticipation(planning)).items.find(
    (r) => r.supplierId === supplierId && r.materialCode === materialCode
  );
  if (!row) throw new Error(`no row ${supplierId}|${materialCode}`);
  return row;
};
/** @param {Awaited<ReturnType<typeof rowOf>>} row @param {string} week */
const weekOf = (row, week) => {
  const w = row.weeks.find((x) => x.week === week);
  if (!w) throw new Error(`no week ${week}`);
  return w;
};

beforeEach(() => {
  sdcClock.reset();
  demandAnticipationStore.reset();
  forecastVersionStore.reset();
  consumptionStore.reset();
  commandAuditSink.clear();
});
afterEach(() => sdcClock.reset());

describe('the verb', () => {
  it('is a creation onto one terminal state, on the reused forecast:publish atom', () => {
    const [t] = consumptionFlow.transitions;
    expect(t).toMatchObject({
      id: 't_consumption_record',
      from: [],
      to: 'Recorded',
      trigger: 'creation',
      requiredRole: 'forecast:publish',
      requiredFields: ['materialCode', 'week', 'qty', 'unit', 'source']
    });
    expect(t.policyHooks).toEqual([POLICY_HOOKS.CONSUMPTION_RECORD_VALID]);
  });
});

describe('recording consumption in the frozen horizon', () => {
  it('stores the record with the hub clock and the actor, and records one DR-10 event', async () => {
    const res = await record(planning, { qty: 1_000 });
    expect(res.status, res.reason).toBe('done');
    expect(consumptionStore.all()).toEqual([
      {
        id: res.entityId,
        materialCode: 'RM-STEAR-7300',
        week: H1[0],
        qty: 1_000,
        unit: 'KG',
        source: 'manual',
        recordedAt: sdcClock.now(),
        actor: NO_PERSON
      }
    ]);
    expect(
      commandAuditSink.byEvent('t_consumption_record').filter((e) => e.outcome === 'done')
    ).toHaveLength(1);
  });

  it('lowers the next horizon’s figure in force by the excess, spread evenly; frozen weeks keep theirs', async () => {
    const before = await rowOf('sup-002', 'RM-STEAR-7300');
    const frozenW36 = /** @type {number} */ (weekOf(before, H1[0]).published);
    // RM-STEAR-7300 has one supplier, so the excess is the frozen figure − 1,000.
    const excess = frozenW36 - 1_000;
    expect(excess).toBeGreaterThan(0);
    expect((await record(planning, { qty: 1_000 })).status).toBe('done');
    const after = await rowOf('sup-002', 'RM-STEAR-7300');
    for (const w of H1) {
      expect(weekOf(after, w).qty).toBe(weekOf(before, w).qty);
      expect(weekOf(after, w).frozen).toBe(true);
    }
    expect(weekOf(after, H1[0]).consumption).toBe(1_000);
    expect(weekOf(after, H1[0]).consumptionRecord).toMatchObject({
      materialQty: 1_000,
      share: 1,
      source: 'manual'
    });
    const absorbed = H2.map((w) => weekOf(after, w).absorbed?.qty ?? 0);
    expect(absorbed.reduce((a, b) => a + b, 0)).toBe(excess);
    expect(Math.max(...absorbed) - Math.min(...absorbed)).toBeLessThanOrEqual(1);
    for (const w of H2) {
      expect(weekOf(after, w).qty).toBe(
        /** @type {number} */ (weekOf(before, w).qty) - (weekOf(after, w).absorbed?.qty ?? 0)
      );
      expect(weekOf(after, w).absorbed?.fromWeeks).toEqual(H1);
    }
    // Weeks after the next horizon are untouched.
    expect(weekOf(after, '2026-10-26').qty).toBe(weekOf(before, '2026-10-26').qty);
  });

  it('splits a material shared by two suppliers by their demand anticipation share (CAP-D14)', async () => {
    const a = weekOf(await rowOf('sup-002', 'RM-EMUL-9410'), H1[0]);
    const b = weekOf(await rowOf('sup-005', 'RM-EMUL-9410'), H1[0]);
    const total = /** @type {number} */ (a.published) + /** @type {number} */ (b.published);
    expect((await record(planning, { materialCode: 'RM-EMUL-9410', qty: 600 })).status).toBe(
      'done'
    );
    const a2 = weekOf(await rowOf('sup-002', 'RM-EMUL-9410'), H1[0]);
    const b2 = weekOf(await rowOf('sup-005', 'RM-EMUL-9410'), H1[0]);
    expect(a2.consumption).toBe(Math.round((600 * /** @type {number} */ (a.published)) / total));
    expect(b2.consumption).toBe(Math.round((600 * /** @type {number} */ (b.published)) / total));
    expect(a2.consumptionRecord?.share).toBeCloseTo(/** @type {number} */ (a.published) / total);
  });

  it('a later record for the same material × week supersedes the earlier one; both stay stored', async () => {
    await record(planning, { qty: 1_000 });
    await record(planning, { qty: 2_500, source: 'upload' });
    expect(consumptionStore.all().map((r) => r.qty)).toEqual([1_000, 2_500]);
    const w = weekOf(await rowOf('sup-002', 'RM-STEAR-7300'), H1[0]);
    expect(w.consumption).toBe(2_500);
    expect(w.consumptionRecord?.source).toBe('upload');
  });
});

describe('a week with no use (consumption 0)', () => {
  it('is accepted, and the excess is the full frozen figure', async () => {
    const before = await rowOf('sup-002', 'RM-STEAR-7300');
    const frozenW36 = /** @type {number} */ (weekOf(before, H1[0]).published);
    const res = await record(planning, { qty: 0 });
    expect(res.status, res.reason).toBe('done');
    expect(consumptionStore.all().map((r) => r.qty)).toEqual([0]);
    const after = await rowOf('sup-002', 'RM-STEAR-7300');
    expect(weekOf(after, H1[0]).consumption).toBe(0);
    const absorbed = H2.reduce((n, w) => n + (weekOf(after, w).absorbed?.qty ?? 0), 0);
    expect(absorbed).toBe(frozenW36);
  });
});

describe('publishing the next horizon freezes it WITH the absorption, once', () => {
  it('at W40 the frozen figures carry the absorption and nothing is absorbed twice', async () => {
    await record(planning, { qty: 1_000 });
    // At W40 week 1 restores the reorder point (CAP-D12), so the figure in force
    // is read at the publish instant, not at W36.
    sdcClock.set('2026-09-28T03:00:00.000Z');
    const open = await rowOf('sup-002', 'RM-STEAR-7300');
    const inForce = H2.map((w) => weekOf(open, w).qty);
    expect(H2.every((w) => (weekOf(open, w).absorbed?.qty ?? 0) > 0)).toBe(true);
    const res = await cmd.dispatch(planning, {
      transitionId: 't_demandanticipation_publish',
      entity: 'demandAnticipation',
      payload: { horizonStart: H2[0] }
    });
    expect(res.status, res.reason).toBe('done');
    const frozen = await rowOf('sup-002', 'RM-STEAR-7300');
    expect(H2.map((w) => weekOf(frozen, w).qty)).toEqual(inForce);
    expect(H2.every((w) => weekOf(frozen, w).frozen)).toBe(true);
    expect(H2.map((w) => weekOf(frozen, w).absorbed?.qty)).toEqual(
      H2.map((w) => weekOf(open, w).absorbed?.qty)
    );
    // Nothing spills into W44–W47 and no alert: the excess is fully absorbed.
    expect(weekOf(frozen, '2026-10-26').absorbed).toBeNull();
    const alerts = await svc.getInventoryAlerts(planning);
    expect(alerts.items.filter((a) => a.rule === 'demandAnticipationUnabsorbed')).toEqual([]);
  });
});

describe('BR-04 — the unabsorbed excess raises a PTI-only alert', () => {
  it('records 100 a week in W36–W39 for RM-STEAR-7300 and alerts with the amount left', async () => {
    sdcClock.set('2026-09-21T03:00:00.000Z'); // W39: all four frozen weeks can be recorded.
    const before = await rowOf('sup-002', 'RM-STEAR-7300');
    // The read starts at the current week now, so the frozen W36–W38 come from the seed.
    const frozenTotal = demandAnticipationStore
      .all()[0]
      .entries.filter((e) => e.supplierId === 'sup-002' && e.materialCode === 'RM-STEAR-7300')
      .reduce((n, e) => n + e.qty, 0);
    const nextTotal = H2.reduce((n, w) => n + /** @type {number} */ (weekOf(before, w).qty), 0);
    // Named values: the seeded W36–W39 and today's W40–W43 of the sample data.
    expect([frozenTotal, nextTotal]).toEqual([12_940, 11_742]);
    for (const w of H1) expect((await record(planning, { week: w, qty: 100 })).status).toBe('done');
    const after = await rowOf('sup-002', 'RM-STEAR-7300');
    expect(H2.map((w) => weekOf(after, w).qty)).toEqual([0, 0, 0, 0]);
    const remaining = frozenTotal - 400 - nextTotal;
    const alerts = (await svc.getInventoryAlerts(planning)).items.filter(
      (a) => a.rule === 'demandAnticipationUnabsorbed'
    );
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      key: 'demandAnticipationUnabsorbed|RM-STEAR-7300|sup-002',
      supplierId: 'sup-002',
      subject: 'RM-STEAR-7300',
      riskClass: 'medium',
      status: 'open',
      unabsorbed: { qty: remaining, uom: 'KG', fromWeeks: H1, intoWeeks: H2 }
    });
    // PTI only: the supplier never reads it.
    const theirs = await svc.getInventoryAlerts(supplier);
    expect(theirs.items.some((a) => a.rule === 'demandAnticipationUnabsorbed')).toBe(false);
  });

  it('control — an excess the next horizon can take raises no alert', async () => {
    expect((await record(planning, { qty: 1_000 })).status).toBe('done');
    const alerts = (await svc.getInventoryAlerts(planning)).items;
    expect(alerts.some((a) => a.rule === 'demandAnticipationUnabsorbed')).toBe(false);
  });
});

describe('the refusals, through the policy hook (each refused, nothing stored)', () => {
  it.each([
    [{ qty: -1 }, 'NOT_A_QUANTITY'],
    [{ qty: -10 }, 'NOT_A_QUANTITY'],
    [{ qty: Number.NaN }, 'NOT_A_QUANTITY'],
    [{ week: H1[1] }, 'FUTURE_WEEK'],
    [{ week: '2026-09-02' }, 'NOT_A_WEEK'],
    [{ materialCode: 'RM-NOPE-0000' }, 'UNKNOWN_MATERIAL'],
    [{ unit: 'PCS' }, 'UNIT_MISMATCH'],
    [{ source: 'sap' }, 'BAD_SOURCE']
  ])('%o is refused as %s', async (patch, code) => {
    const res = await record(planning, patch);
    expect(res.status).toBe('failed');
    expect(refusedByPolicy(res.reason, POLICY_HOOKS.CONSUMPTION_RECORD_VALID)).toBe(true);
    expect(res.reason).toMatch(new RegExp(code));
    expect(consumptionStore.all()).toEqual([]);
  });

  it('control — the same payload with a valid quantity and week goes through', async () => {
    expect((await record(planning, {})).status).toBe('done');
  });
});

describe('who may record (probed both ways)', () => {
  it('known-good: the planning seat records; known-bad: procurement is refused at the ROLE gate', async () => {
    const refused = await record(procurement, {});
    expect(refused.status).toBe('failed');
    expect(refused.reason).toMatch(/^ROLE_NOT_PERMITTED/);
    expect(refused.reason).toMatch(/forecast:publish/);
    expect(consumptionStore.all()).toEqual([]);
    expect((await record(planning, {})).status).toBe('done');
  });

  it('a supplier is refused at SCOPE', async () => {
    await expect(record(supplier, {})).rejects.toBeInstanceOf(DataError);
    expect(consumptionStore.all()).toEqual([]);
  });
});
