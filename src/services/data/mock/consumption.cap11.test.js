// ────────────────────────────────────────────────────────────────────────────
// CAP-11 (BL-180) — `t_consumption_record` dispatched through the REAL
// MockCommandService against the real stores, and read back through the REAL
// service: the record, the split across two suppliers, a later record
// superseding an earlier one (both kept), the refusals, who may record, and
// the audit event.
//
// RETIRED with CAP-11 BR-02/03/04 (superseded by DRC-4 BR-02, BL-190):
// "lowers the next horizon's figure in force by the excess", "publishing the
// next horizon freezes it WITH the absorption, once", and "BR-04 — the
// unabsorbed excess raises a PTI-only alert". Recorded consumption no longer
// moves the demand anticipation; the surplus alert now reads DRC-4's check
// (`demandAnticipation.drc2.test.js`, "the surplus alert").
// ────────────────────────────────────────────────────────────────────────────

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService, commandAuditSink } from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import { consumptionStore } from './stores/consumptionStore';
import { osipSafetyInputs } from './osipSafetyReadModel';
import { whatIfLiveInputs } from './whatIfSandboxReadModel';
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

// The hub's present: Monday 31 August 2026 (W36), published by the seed.
const H1 = ['2026-08-31', '2026-09-07', '2026-09-14', '2026-09-21'];

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

describe('recording consumption', () => {
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

  it('BL-211 — one split, by LTP share, on the grid, the safety figures, DRC-18 and the sandbox', async () => {
    const a = weekOf(await rowOf('sup-002', 'RM-EMUL-9410'), H1[0]);
    const shareA = /** @type {number} */ ((await rowOf('sup-002', 'RM-EMUL-9410')).share);
    const shareB = /** @type {number} */ ((await rowOf('sup-005', 'RM-EMUL-9410')).share);
    // The two suppliers' LTP shares over the share window add up to the whole.
    expect(shareA + shareB).toBeCloseTo(1, 12);
    expect(shareA).toBeGreaterThan(0);
    expect(shareB).toBeGreaterThan(0);
    expect((await record(planning, { materialCode: 'RM-EMUL-9410', qty: 600 })).status).toBe(
      'done'
    );
    const rowA = await rowOf('sup-002', 'RM-EMUL-9410');
    const rowB = await rowOf('sup-005', 'RM-EMUL-9410');
    const a2 = weekOf(rowA, H1[0]);
    const b2 = weekOf(rowB, H1[0]);
    // The grid: 600 × the LTP share, whole units (CAP-D11).
    expect(a2.consumption).toBe(Math.round(600 * shareA));
    expect(b2.consumption).toBe(Math.round(600 * shareB));
    expect(a2.consumptionRecord?.share).toBeCloseTo(shareA, 12);
    // DRC-18: one record, so the average is 600, × the same share.
    // (The read adds DRC-18's fields at runtime; the service's week type does not name them.)
    const drc18 = /** @type {{ consumptionAverage?: number | null }} */ (
      /** @type {unknown} */ (a2)
    );
    expect(drc18.consumptionAverage).toBe(Math.round(600 * shareA));
    // The OSIP safety figures and the sandbox read the same share of the same week.
    const osip = osipSafetyInputs().get('RM-EMUL-9410');
    expect(osip?.suppliers.find((s) => s.supplierId === 'sup-002')?.consumption).toEqual([
      600 * shareA
    ]);
    expect(osip?.suppliers.find((s) => s.supplierId === 'sup-005')?.consumption).toEqual([
      600 * shareB
    ]);
    expect(whatIfLiveInputs('sup-002', 'RM-EMUL-9410')?.consumption).toEqual([600 * shareA]);
    // Recorded consumption does not move the demand anticipation (CAP-11 BR-02 retired).
    expect(a2.qty).toBe(a.qty);
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
  it('is accepted and shows 0; the demand anticipation in force is unchanged', async () => {
    const before = weekOf(await rowOf('sup-002', 'RM-STEAR-7300'), H1[0]);
    const res = await record(planning, { qty: 0 });
    expect(res.status, res.reason).toBe('done');
    expect(consumptionStore.all().map((r) => r.qty)).toEqual([0]);
    const after = weekOf(await rowOf('sup-002', 'RM-STEAR-7300'), H1[0]);
    expect(after.consumption).toBe(0);
    expect(after.qty).toBe(before.qty);
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
