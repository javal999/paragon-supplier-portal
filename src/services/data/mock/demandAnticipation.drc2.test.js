// ────────────────────────────────────────────────────────────────────────────
// DRC-2 (BL-188) and DRC-4 (BL-190) — `t_demandanticipation_publish`
// dispatched through the REAL MockCommandService against the real store, and
// read back through the REAL service: the seeded publication (stamped,
// DRC-D16), the horizon as the lead time (DRC-6), "would be" after a new LTP,
// re-publishing a week (append-only), the week rolling forward (the OSPO chain
// and the carries read from the previous publication), the supplier's
// agreement to carry outside the horizon [Owner A8], the surplus alert
// (DRC-4 BR-02), who may publish, and the refusals.
//
// Replaces the CAP-10 service suite (`demandAnticipation.cap10.test.js`),
// whose fixed 4-week horizons (CAP-D17) DRC-2 BR-01 supersedes.
// ────────────────────────────────────────────────────────────────────────────

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService, commandAuditSink } from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import { demandAnticipationStore } from './stores/demandAnticipationStore';
import { forecastVersionStore } from './stores/forecastHubStores';
import { currentVersion } from './forecastReadModel';
import { demandAnticipationToPublish, leadTimeWeeksOf } from './demandAnticipationReadModel';
import { osipSafetyInputs } from './osipSafetyReadModel';
import { consumptionStore } from './stores/consumptionStore';
import { pairKey, rollingDaFigure } from '../../transitions/demandAnticipationRules';
import { osipSafety } from '../../transitions/osipSafetyRules';
import { addDays } from '../../transitions/inventoryRules';
/** @import { QueryScope } from '../types' */
import { DataError } from '../types';
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { POLICY_HOOKS } from '../../transitions/policyHooks';
import { refusedByPolicy } from '../../transitions/refusalMessage';
import { OSIP_RULES, RULES_VERSION } from '../../transitions/osipRules';
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

// The hub's present: Monday 31 August 2026 (W36). Weeks from it.
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
const EMUL = 'sup-002|RM-EMUL-9410';

/**
 * @param {QueryScope} scope
 * @param {string} planningWeek
 * @param {readonly string[]} [agreedFirstOutside]
 */
const publish = (scope, planningWeek, agreedFirstOutside = []) =>
  cmd.dispatch(scope, {
    transitionId: 't_demandanticipation_publish',
    entity: 'demandAnticipation',
    payload: { planningWeek, agreedFirstOutside }
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
 */
const raiseWeek2 = () => {
  const current = /** @type {import('../../sdc/types').ForecastPublication} */ (
    currentVersion('packaging')
  );
  forecastVersionStore.add({
    ...current,
    publicationId: 'FC-PK-DRC2-PROBE',
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
  // The seed is computed at the first read: take it before a test moves the LTP.
  demandAnticipationStore.all();
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
      requiredFields: ['planningWeek']
    });
    expect(t.policyHooks).toEqual([POLICY_HOOKS.DEMAND_ANTICIPATION_PUBLISH_VALID]);
  });
});

describe('the seeded publication (the page opens published)', () => {
  it('is ONE publication of planning week W36, the sample seed, attributed to no person', () => {
    const all = demandAnticipationStore.all();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({
      id: 'dap-0001',
      source: 'sampleSeed',
      publishedAt: sdcClock.now(),
      actor: { kind: 'UNATTRIBUTED', reason: 'NO_PERSON_IN_SESSION' },
      planningWeek: W[0],
      agreedFirstOutside: []
    });
  });

  it('DRC-D16 — every entry is stamped with its inputs and RULES_VERSION', () => {
    const [seed] = demandAnticipationStore.all();
    expect(seed.entries.length).toBeGreaterThan(0);
    for (const e of seed.entries) {
      expect(e.figure.rulesVersion).toBe(RULES_VERSION);
      expect(/** @type {{ weeks: string[] }} */ (e.figure.inputs).weeks[0]).toBe(W[0]);
    }
    // Named member, reached through a value: RM-EMUL-9410 is shared 70/30 by
    // sup-002 and sup-005 at PTI SOH 1,800. The share is read from the lines'
    // own quantities, which BL-282 made weekly (each line rounds to its order
    // multiple), so sup-002's SOH share is 1,281 (1,260 on the monthly lines).
    const emul = seed.entries.find(
      (e) => e.supplierId === 'sup-002' && e.materialCode === 'RM-EMUL-9410'
    );
    expect(emul?.figure.inputs.soh).toBe(1281);
    expect(emul?.figure.value.soh).toBe(1281);
  });

  it('DRC-2 BR-01 — the horizon is each pair’s lead time in weeks (DRC-6)', async () => {
    const stear = await rowOf('sup-002', 'RM-STEAR-7300');
    const petb = await rowOf('sup-007', 'PK-PETB-8802');
    expect(stear.plan.horizonWeeks).toHaveLength(
      /** @type {number} */ (leadTimeWeeksOf('sup-002', 'RM-STEAR-7300'))
    );
    expect(petb.plan.horizonWeeks).toHaveLength(
      /** @type {number} */ (leadTimeWeeksOf('sup-007', 'PK-PETB-8802'))
    );
    // Named values of the sample sources: 45 days → 7 weeks, 14 days → 2 weeks.
    expect([stear.plan.leadTimeWeeks, petb.plan.leadTimeWeeks]).toEqual([7, 2]);
    expect(petb.weeks.filter((w) => w.inHorizon).map((w) => w.week)).toEqual(W.slice(0, 2));
    expect(petb.weeks[2]).toMatchObject({ inHorizon: false, qty: null });
  });

  it('the read shows the published figures, unchanged today, with the publication', async () => {
    const row = await rowOf('sup-007', 'PK-PETB-8802');
    expect(row).toMatchObject({ planSource: 'published', changed: false });
    expect(row.weeks[0].publishedBy).toMatchObject({
      publicationId: 'dap-0001',
      source: 'sampleSeed'
    });
    expect(row.weeks[0].published).toBe(row.weeks[0].qty);
    expect(row.weeks[0].delta).toBe(0);
  });
});

describe('a new LTP that raises week 2 by 10,000', () => {
  it('leaves the published figure, shows would be +10,000, and marks the row changed', async () => {
    const before = (await rowOf('sup-007', 'PK-PETB-8802')).weeks[1];
    raiseWeek2();
    const row = await rowOf('sup-007', 'PK-PETB-8802');
    const after = row.weeks[1];
    expect(after.published).toBe(before.published);
    expect(after.qty).toBe(before.qty);
    expect(after.wouldBe).toBe(/** @type {number} */ (before.published) + 10_000);
    expect(after.delta).toBe(10_000);
    expect(row.changed).toBe(true);
  });

  it('publishing again appends a newer record in force; the seed stays byte for byte', async () => {
    const seed = demandAnticipationStore.all()[0];
    const snapshot = JSON.stringify(seed);
    raiseWeek2();
    const res = await publish(planning, W[0]);
    expect(res.status, res.reason).toBe('done');
    const all = demandAnticipationStore.all();
    expect(all).toHaveLength(2);
    expect(all[0]).toBe(seed);
    expect(JSON.stringify(all[0])).toBe(snapshot);
    expect(all[1]).toMatchObject({ id: res.entityId, source: 'publish', planningWeek: W[0] });
    const row = await rowOf('sup-007', 'PK-PETB-8802');
    expect(row.weeks[1].publishedBy?.publicationId).toBe(res.entityId);
    expect(row.changed).toBe(false);
    expect(
      commandAuditSink.byEvent('t_demandanticipation_publish').filter((e) => e.outcome === 'done')
    ).toHaveLength(1);
  });
});

describe('the week rolls forward (DRC-2 BR-03, BR-05; Default A9)', () => {
  it('at W37 OSPO chains from the W36 publication and the W36 remainder is carried in', async () => {
    const seedEmul = (await rowOf('sup-002', 'RM-EMUL-9410')).plan;
    expect(seedEmul.flags).toContain('OSPO_FROM_STORE');
    const carry = /** @type {NonNullable<typeof seedEmul.carry>} */ (seedEmul.carry);
    expect(carry).toMatchObject({ fromWeek: W[0] });
    sdcClock.set('2026-09-08T03:00:00.000Z'); // Tuesday of W37.
    const row = await rowOf('sup-002', 'RM-EMUL-9410');
    expect(row.planningWeek).toBe(W[1]);
    expect(row.planSource).toBe('today');
    expect(row.plan.flags).not.toContain('OSPO_FROM_STORE');
    const into = row.weeks.find((w) => w.week === carry.week);
    expect(into?.inputs.carriedIn).toEqual([{ qty: carry.qty, fromWeek: W[0] }]);
    // The new planning week is published on its own.
    const res = await publish(planning, W[1]);
    expect(res.status, res.reason).toBe('done');
    expect(demandAnticipationStore.all()[1].planningWeek).toBe(W[1]);
  });
});

describe('the supplier’s agreement to carry outside the horizon [Owner A8]', () => {
  it('without it the remainder goes to the last week; with it, to the first week outside', async () => {
    const before = (await rowOf('sup-002', 'RM-EMUL-9410')).plan;
    const last = before.horizonWeeks[before.horizonWeeks.length - 1];
    expect(before.carry?.week).toBe(last);
    expect(before.carryTarget).toBe('lastWeek');
    const res = await publish(planning, W[0], [EMUL]);
    expect(res.status, res.reason).toBe('done');
    expect(demandAnticipationStore.all()[1].agreedFirstOutside).toEqual([EMUL]);
    const row = await rowOf('sup-002', 'RM-EMUL-9410');
    expect(row.agreedFirstOutside).toBe(true);
    expect(row.plan.carryTarget).toBe('firstOutside');
    expect(row.plan.carry?.week).toBe(before.firstOutsideWeek);
    // Another pair is untouched by it.
    expect((await rowOf('sup-005', 'RM-EMUL-9410')).plan.carryTarget).toBe('lastWeek');
  });

  it('BAD_AGREEMENT for a pair with nothing to carry; nothing is stored', async () => {
    // PK-PETB-8802 × sup-007: W36 call-offs exceed its demand anticipation.
    // (8801 has a remainder since the 13-week SD raised its week-1 safety, B2.)
    expect((await rowOf('sup-007', 'PK-PETB-8802')).today.remainder).toBeLessThanOrEqual(0);
    const res = await publish(planning, W[0], ['sup-007|PK-PETB-8802']);
    expect(res.status).toBe('failed');
    expect(refusedByPolicy(res.reason, POLICY_HOOKS.DEMAND_ANTICIPATION_PUBLISH_VALID)).toBe(true);
    expect(res.reason).toMatch(/BAD_AGREEMENT/);
    expect(demandAnticipationStore.all()).toHaveLength(1);
  });
});

describe('the refusals, through the policy hook (each fires once and passes once)', () => {
  it('NOTHING_CHANGED at the present: the seed already holds today’s figures', async () => {
    const res = await publish(planning, W[0]);
    expect(res.status).toBe('failed');
    expect(refusedByPolicy(res.reason, POLICY_HOOKS.DEMAND_ANTICIPATION_PUBLISH_VALID)).toBe(true);
    expect(res.reason).toMatch(/NOTHING_CHANGED/);
    expect(demandAnticipationStore.all()).toHaveLength(1);
  });

  it('STALE_WEEK: at W37 a confirm naming W36 is refused; W37 goes through', async () => {
    sdcClock.set('2026-09-08T03:00:00.000Z');
    const stale = await publish(planning, W[0]);
    expect(stale.status).toBe('failed');
    expect(stale.reason).toMatch(/STALE_WEEK/);
    expect(demandAnticipationStore.all()).toHaveLength(1);
    expect((await publish(planning, W[1])).status).toBe('done');
  });
});

describe('the surplus alert (DRC-4 BR-02 / DRC-B7)', () => {
  it('a surplus the last week cannot take raises a PTI-only alert with what is left', async () => {
    const row = await rowOf('sup-007', 'PK-PETB-8801');
    expect(row.plan.gap).toBeLessThan(0);
    expect(row.plan.unabsorbed).toBeGreaterThan(0);
    const last = row.plan.horizonWeeks[row.plan.horizonWeeks.length - 1];
    expect(row.weeks.find((w) => w.week === last)?.absorbed).toBe(row.plan.absorbedLastWeek);
    const alerts = (await svc.getInventoryAlerts(planning)).items.filter(
      (a) => a.rule === 'demandAnticipationUnabsorbed'
    );
    expect(
      alerts.find((a) => a.key === 'demandAnticipationUnabsorbed|PK-PETB-8801|sup-007')
    ).toMatchObject({
      supplierId: 'sup-007',
      subject: 'PK-PETB-8801',
      riskClass: 'medium',
      unabsorbed: {
        qty: row.plan.unabsorbed,
        fromWeeks: row.plan.horizonWeeks,
        intoWeeks: [last]
      }
    });
    // A pair whose check balances raises none.
    expect(alerts.some((a) => a.key === 'demandAnticipationUnabsorbed|RM-STEAR-7300|sup-002')).toBe(
      false
    );
    const theirs = await svc.getInventoryAlerts(supplier);
    expect(theirs.items.some((a) => a.rule === 'demandAnticipationUnabsorbed')).toBe(false);
  });
});

describe('who may publish and read (probed both ways)', () => {
  it('known-good: the planning seat publishes; known-bad: procurement is refused at the ROLE gate', async () => {
    raiseWeek2();
    const refused = await publish(procurement, W[0]);
    expect(refused.status).toBe('failed');
    expect(refused.reason).toMatch(/^ROLE_NOT_PERMITTED/);
    expect(refused.reason).toMatch(/forecast:publish/);
    expect(demandAnticipationStore.all()).toHaveLength(1);
    const ok = await publish(planning, W[0]);
    expect(ok.status, ok.reason).toBe('done');
  });

  it('a supplier is refused at SCOPE and reads an empty page; PTI reads every row', async () => {
    raiseWeek2();
    await expect(publish(supplier, W[0])).rejects.toBeInstanceOf(DataError);
    expect(demandAnticipationStore.all()).toHaveLength(1);
    expect((await svc.getDemandAnticipation(supplier)).items).toEqual([]);
    expect((await svc.getDemandAnticipation(planning)).items.length).toBe(
      demandAnticipationStore.all()[0].entries.length
    );
  });
});

describe('BL-210 — DA’s week-1 safety order is ROP Order’s under every switch', () => {
  afterEach(() => consumptionStore.reset());

  it('the pair’s inputs carry ROP Order’s consumption, MOQ and koli; both functions agree', () => {
    // 13 recorded weeks of RM-EMUL-9410 ending at the hub week, varied so the
    // consumption SD is not 0.
    for (let i = 0; i < 13; i += 1)
      consumptionStore.add({
        materialCode: 'RM-EMUL-9410',
        week: addDays(W[0], -7 * i),
        qty: 400 + (i % 3) * 150,
        unit: 'KG',
        source: 'manual',
        recordedAt: sdcClock.now(),
        actor: NO_PERSON
      });
    const { figures } = demandAnticipationToPublish([]);
    const osip = osipSafetyInputs();
    const sourced = figures.filter((f) =>
      osip.get(f.materialCode)?.suppliers.some((s) => s.supplierId === f.supplierId)
    );
    // Named member, reached through a value: sup-002 × RM-EMUL-9410 has 13 weeks.
    const emul = sourced.find((f) => pairKey(f.supplierId, f.materialCode) === EMUL);
    expect(emul?.inputs.consumption).toHaveLength(13);
    expect(sourced.length).toBeGreaterThan(1);
    for (const sdSource of /** @type {const} */ (['ltp', 'consumption12w']))
      for (const safetyRounding of /** @type {const} */ (['mpq', 'koli', 'moq'])) {
        const rules = { ...OSIP_RULES, sdSource, safetyRounding };
        for (const f of sourced) {
          const s = /** @type {import('../../transitions/osipSafetyRules').OsipSupplierInput} */ (
            osip.get(f.materialCode)?.suppliers.find((x) => x.supplierId === f.supplierId)
          );
          expect(f.inputs.consumption).toEqual(s.consumption);
          expect([f.inputs.moq, f.inputs.koli]).toEqual([s.moq, s.koli]);
          const rop = osipSafety(s, rules).safetyOrder.value;
          if (rop === null) continue;
          expect(
            rollingDaFigure(f.inputs, rules).safetyOrder,
            `${f.supplierId}|${f.materialCode}`
          ).toBe(rop);
        }
      }
  });
});
