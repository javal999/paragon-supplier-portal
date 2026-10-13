// ────────────────────────────────────────────────────────────────────────────
// CAP-10 (BL-179) — `t_demandanticipation_publish` dispatched through the REAL
// MockCommandService against the real store, and read back through the REAL
// service: the seeded publication, AC-01 (a new LTP leaves a frozen week and
// shows "would be"), AC-02 under fixed 4-week horizons (CAP-D17: at W37 the
// frozen current horizon is refused; at W40 W40–W43 freezes and W36–W39 stays
// exactly as it was), the append-only store, who may publish, and the refusals.
// ────────────────────────────────────────────────────────────────────────────

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService, commandAuditSink } from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import { demandAnticipationStore } from './stores/demandAnticipationStore';
import { forecastVersionStore } from './stores/forecastHubStores';
import { currentVersion } from './forecastReadModel';
import { todaysDemandAnticipation } from './demandAnticipationReadModel';
/** @import { QueryScope } from '../types' */
import { DataError } from '../types';
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { POLICY_HOOKS } from '../../transitions/policyHooks';
import { refusedByPolicy } from '../../transitions/refusalMessage';
import { demandAnticipationFlow } from '../../transitions/flows/demandAnticipation.flow';
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
  supplierId: 'sup-007',
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON
};

// The hub's present: Monday 31 August 2026 (W36). Weeks 1 to 8 from it.
const W = [
  '2026-08-31',
  '2026-09-07',
  '2026-09-14',
  '2026-09-21',
  '2026-09-28',
  '2026-10-05',
  '2026-10-12',
  '2026-10-19'
];

/**
 * @param {QueryScope} scope
 * @param {string} horizonStart
 */
const publish = (scope, horizonStart) =>
  cmd.dispatch(scope, {
    transitionId: 't_demandanticipation_publish',
    entity: 'demandAnticipation',
    payload: { horizonStart }
  });

/** @param {string} supplierId @param {string} materialCode */
const rowOf = async (supplierId, materialCode) => {
  const page = await svc.getDemandAnticipation(planning);
  const row = page.items.find(
    (r) => r.supplierId === supplierId && r.materialCode === materialCode
  );
  if (!row) throw new Error(`no row ${supplierId}|${materialCode}`);
  return row;
};

/**
 * A new packaging version whose week-2 LTP for sup-007 × PK-PETB-8802 is 10,000 higher.
 * PK-PETB-8802 has one supplier, so its share of the stock stays 100%.
 */
const raiseWeek2 = () => {
  const current = /** @type {import('../../sdc/types').ForecastPublication} */ (
    currentVersion('packaging')
  );
  forecastVersionStore.add({
    ...current,
    publicationId: 'FC-PK-CAP10-PROBE',
    version: (current.version ?? 0) + 1,
    publishedAt: '2026-08-31T10:00:00.000Z',
    lines: current.lines.map((l) =>
      l.supplierId === 'sup-007' && l.materialCode === 'PK-PETB-8802' && l.periodBucket === W[1]
        ? { ...l, forecastQty: l.forecastQty + 10_000 }
        : l
    )
  });
};

beforeEach(() => {
  sdcClock.reset();
  demandAnticipationStore.reset();
  forecastVersionStore.reset();
  commandAuditSink.clear();
});
afterEach(() => sdcClock.reset());

describe('the verb', () => {
  it('is a creation onto one terminal state, on the reused forecast:publish atom', () => {
    const [t] = demandAnticipationFlow.transitions;
    expect(t).toMatchObject({
      id: 't_demandanticipation_publish',
      from: [],
      to: 'Published',
      trigger: 'creation',
      requiredRole: 'forecast:publish',
      requiredFields: ['horizonStart']
    });
    expect(t.policyHooks).toEqual([POLICY_HOOKS.DEMAND_ANTICIPATION_PUBLISH_VALID]);
  });
});

describe('the seeded publication (the page opens frozen)', () => {
  it('is ONE publication at the hub present, marked as the sample seed and attributed to no person', () => {
    const all = demandAnticipationStore.all();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({
      id: 'dap-0001',
      source: 'sampleSeed',
      publishedAt: sdcClock.now(),
      actor: { kind: 'UNATTRIBUTED', reason: 'NO_PERSON_IN_SESSION' },
      horizonStart: W[0],
      horizonWeeks: W.slice(0, 4)
    });
  });

  it('its figures are the function’s at seed time, 4 weeks per supplier × material', () => {
    const today = todaysDemandAnticipation();
    const expected = today.flatMap((s) =>
      s.weeks.slice(0, 4).map((w) => [s.supplierId, s.materialCode, w.week, w.qty])
    );
    expect(
      demandAnticipationStore
        .all()[0]
        .entries.map((e) => [e.supplierId, e.materialCode, e.week, e.qty])
    ).toEqual(expected);
    // Named member, reached through a value: RM-EMUL-9410 is shared 70/30 by
    // sup-002 and sup-005 at SOH 1,800 and ROP 1,500.
    expect(
      today.find((s) => s.supplierId === 'sup-002' && s.materialCode === 'RM-EMUL-9410')?.weeks[0]
        .inputs
    ).toEqual({
      ltp: 840,
      stockShare: 1260,
      ropShare: 1050
    });
  });

  it('the read shows weeks 1 to 4 frozen and week 5 on today’s figure', async () => {
    const row = await rowOf('sup-007', 'PK-PETB-8802');
    expect(row.weeks.slice(0, 4).map((w) => w.frozen)).toEqual([true, true, true, true]);
    expect(row.weeks[4]).toMatchObject({ frozen: false, published: null, delta: null });
    expect(row.weeks[0].frozenBy).toMatchObject({
      publicationId: 'dap-0001',
      source: 'sampleSeed'
    });
  });
});

describe('AC-01 — a new LTP that raises week 2 by 10,000', () => {
  it('leaves week 2’s published figure unchanged and shows would be +10,000', async () => {
    const before = (await rowOf('sup-007', 'PK-PETB-8802')).weeks[1];
    raiseWeek2();
    const after = (await rowOf('sup-007', 'PK-PETB-8802')).weeks[1];
    // Control: the LTP really moved by 10,000.
    expect((after.inputs?.ltp ?? 0) - (before.inputs?.ltp ?? 0)).toBe(10_000);
    expect(after.frozen).toBe(true);
    expect(after.published).toBe(before.published);
    expect(after.qty).toBe(before.qty);
    expect(after.delta).toBe(10_000);
    expect(after.wouldBe).toBe(/** @type {number} */ (before.published) + 10_000);
  });
});

describe('AC-02 — fixed 4-week horizons (CAP-D17)', () => {
  it('at W37 publish is refused: the current horizon W36–W39 is already frozen, and nothing changes', async () => {
    const before = JSON.stringify(demandAnticipationStore.all());
    sdcClock.set('2026-09-08T03:00:00.000Z'); // Tuesday of W37.
    for (const start of [W[0], W[4]]) {
      const res = await publish(planning, start);
      expect(res.status).toBe('failed');
      expect(refusedByPolicy(res.reason, POLICY_HOOKS.DEMAND_ANTICIPATION_PUBLISH_VALID)).toBe(
        true
      );
      expect(res.reason).toMatch(/NOTHING_TO_FREEZE/);
    }
    expect(JSON.stringify(demandAnticipationStore.all())).toBe(before);
    // The next horizon is never frozen ahead of its time: W40 stays adjustable.
    const row = await rowOf('sup-002', 'RM-STEAR-7300');
    expect(row.weeks.find((w) => w.week === W[4])).toMatchObject({
      frozen: false,
      horizonFrozen: false
    });
  });

  it('at W40 publish freezes W40–W43 and leaves W36–W39 exactly as they were; the store only grows', async () => {
    const seed = demandAnticipationStore.all()[0];
    const seedSnapshot = JSON.stringify(seed);
    sdcClock.set('2026-09-28T03:00:00.000Z'); // Monday of W40.
    const res = await publish(planning, W[4]);
    expect(res.status, res.reason).toBe('done');
    const all = demandAnticipationStore.all();
    expect(all).toHaveLength(2);
    // Append-only: the seed is the same object, byte for byte.
    expect(all[0]).toBe(seed);
    expect(JSON.stringify(all[0])).toBe(seedSnapshot);
    expect(all[1]).toMatchObject({
      id: res.entityId,
      source: 'publish',
      horizonStart: W[4],
      horizonWeeks: W.slice(4, 8),
      publishedAt: '2026-09-28T03:00:00.000Z',
      actor: NO_PERSON
    });
    expect([...new Set(all[1].entries.map((e) => e.week))]).toEqual(W.slice(4, 8));
    const row = await rowOf('sup-002', 'RM-STEAR-7300');
    expect(row.weeks[0].week).toBe(W[4]);
    expect(row.weeks.slice(0, 4).map((w) => w.frozenBy?.publicationId)).toEqual(
      Array(4).fill(res.entityId)
    );
    // W44 is the next horizon: open.
    expect(row.weeks[4]).toMatchObject({ frozen: false, horizonStart: '2026-10-26' });
    // Publishing again in W40–W43 is refused: once per horizon.
    const again = await publish(planning, W[4]);
    expect(again.reason).toMatch(/NOTHING_TO_FREEZE/);
    expect(demandAnticipationStore.all()).toHaveLength(2);
  });

  it('records one DR-10 event for the act', async () => {
    sdcClock.set('2026-09-28T03:00:00.000Z');
    const res = await publish(planning, W[4]);
    expect(res.status, res.reason).toBe('done');
    const done = commandAuditSink
      .byEvent('t_demandanticipation_publish')
      .filter((e) => e.outcome === 'done');
    expect(done).toHaveLength(1);
  });
});

describe('the refusals, through the policy hook (each fires once and passes once)', () => {
  it('NOTHING_TO_FREEZE at the present: the seed froze the current horizon', async () => {
    const res = await publish(planning, W[0]);
    expect(res.status).toBe('failed');
    expect(refusedByPolicy(res.reason, POLICY_HOOKS.DEMAND_ANTICIPATION_PUBLISH_VALID)).toBe(true);
    expect(res.reason).toMatch(/NOTHING_TO_FREEZE/);
    expect(demandAnticipationStore.all()).toHaveLength(1);
  });

  it('STALE_HORIZON: at W40 a confirm naming W36 is refused; the current horizon goes through', async () => {
    sdcClock.set('2026-09-28T03:00:00.000Z');
    const stale = await publish(planning, W[0]);
    expect(stale.status).toBe('failed');
    expect(refusedByPolicy(stale.reason, POLICY_HOOKS.DEMAND_ANTICIPATION_PUBLISH_VALID)).toBe(
      true
    );
    expect(stale.reason).toMatch(/STALE_HORIZON/);
    expect(demandAnticipationStore.all()).toHaveLength(1);
    expect((await publish(planning, W[4])).status).toBe('done');
  });

  it('a skipped horizon stays unfrozen: at W44 publish freezes W44–W47 only', async () => {
    sdcClock.set('2026-10-26T03:00:00.000Z');
    const res = await publish(planning, '2026-10-26');
    expect(res.status, res.reason).toBe('done');
    expect(demandAnticipationStore.all()[1].horizonWeeks[0]).toBe('2026-10-26');
    expect(
      demandAnticipationStore
        .all()
        .flatMap((p) => p.entries)
        .some((e) => e.week === W[4])
    ).toBe(false);
  });
});

describe('who may publish and read (probed both ways)', () => {
  it('known-good: the planning seat publishes; known-bad: procurement is refused at the ROLE gate', async () => {
    sdcClock.set('2026-09-28T03:00:00.000Z');
    const refused = await publish(procurement, W[4]);
    expect(refused.status).toBe('failed');
    expect(refused.reason).toMatch(/^ROLE_NOT_PERMITTED/);
    expect(refused.reason).toMatch(/forecast:publish/);
    expect(demandAnticipationStore.all()).toHaveLength(1);
    expect((await publish(planning, W[4])).status).toBe('done');
  });

  it('a supplier is refused at SCOPE and reads an empty page; PTI reads every row', async () => {
    sdcClock.set('2026-09-28T03:00:00.000Z');
    await expect(publish(supplier, W[4])).rejects.toBeInstanceOf(DataError);
    expect(demandAnticipationStore.all()).toHaveLength(1);
    expect((await svc.getDemandAnticipation(supplier)).items).toEqual([]);
    expect((await svc.getDemandAnticipation(planning)).items.length).toBe(
      todaysDemandAnticipation().length
    );
  });
});
